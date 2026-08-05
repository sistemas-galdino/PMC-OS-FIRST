-- Onda 1 — RPCs de apoio ao worker (edge function enviar-mensagens).
--
-- Por que RPC e não PostgREST direto: precisamos de FOR UPDATE SKIP LOCKED para
-- reservar o lote atomicamente. Sem isso, dois workers concorrentes pegam a mesma
-- linha e o cliente recebe a mensagem duas vezes. A trava tem que ser do banco.

-- Estados: pendente -> enviando -> enviado | falhou
--          'enviando' preso há mais de 10 min volta para a fila (worker morreu).

-- ---------------------------------------------------------------------------
-- Reserva atômica de um lote
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.reservar_mensagens(p_lote int DEFAULT 50)
RETURNS SETOF public.mensagens_saida
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Devolve para a fila o que ficou presedo em 'enviando' (worker caiu no meio).
  UPDATE mensagens_saida
     SET status = 'pendente'
   WHERE status = 'enviando'
     AND updated_at < now() - interval '10 minutes';

  RETURN QUERY
  WITH lote AS (
    SELECT id FROM mensagens_saida
     WHERE status = 'pendente'
       AND agendado_para <= now()
     ORDER BY agendado_para
     LIMIT greatest(1, least(p_lote, 200))
     FOR UPDATE SKIP LOCKED
  )
  UPDATE mensagens_saida m
     SET status = 'enviando', tentativas = m.tentativas + 1, updated_at = now()
    FROM lote
   WHERE m.id = lote.id
  RETURNING m.*;
END; $$;

REVOKE ALL ON FUNCTION public.reservar_mensagens(int) FROM public, anon, authenticated;

-- ---------------------------------------------------------------------------
-- Conclusão de uma mensagem (sucesso ou falha com backoff)
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.concluir_mensagem(
  p_id       uuid,
  p_ok       boolean,
  p_provedor text DEFAULT NULL,
  p_erro     text DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_tent int;
BEGIN
  IF p_ok THEN
    UPDATE mensagens_saida
       SET status = 'enviado', enviado_em = now(), provedor = p_provedor,
           erro = NULL, updated_at = now()
     WHERE id = p_id;
    RETURN;
  END IF;

  SELECT tentativas INTO v_tent FROM mensagens_saida WHERE id = p_id;

  IF coalesce(v_tent, 0) >= 5 THEN
    -- Desiste: 5 tentativas é sinal de problema real, não de instabilidade.
    UPDATE mensagens_saida
       SET status = 'falhou', erro = p_erro, provedor = p_provedor, updated_at = now()
     WHERE id = p_id;
  ELSE
    -- Backoff exponencial: 2, 4, 8, 16, 32 minutos.
    UPDATE mensagens_saida
       SET status = 'pendente', erro = p_erro, provedor = p_provedor,
           agendado_para = now() + (power(2, coalesce(v_tent, 1)) * interval '1 minute'),
           updated_at = now()
     WHERE id = p_id;
  END IF;
END; $$;

REVOKE ALL ON FUNCTION public.concluir_mensagem(uuid, boolean, text, text) FROM public, anon, authenticated;

-- ---------------------------------------------------------------------------
-- Enfileirar — ponto único de entrada. Aplica TODAS as travas de segurança.
-- ---------------------------------------------------------------------------
-- Retorna o id da mensagem, ou NULL quando não deve enviar. Motivos de NULL:
--   - sem contato utilizável para a persona
--   - sem opt-in (ou com opt-out) para o canal/tipo
--   - chave_idem já existente (a mensagem já foi enfileirada antes)
CREATE OR REPLACE FUNCTION public.enfileirar_mensagem(
  p_cliente   uuid,
  p_persona   text,
  p_template  text,
  p_chave     text,
  p_variaveis jsonb DEFAULT '{}'::jsonb,
  p_previa    text  DEFAULT NULL,
  p_tipo      text  DEFAULT 'eventos'   -- digest_diario | digest_semanal | eventos
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_destino text;
  v_pode    boolean;
  v_id      uuid;
BEGIN
  v_destino := contato_persona(p_cliente, p_persona);
  IF v_destino IS NULL THEN RETURN NULL; END IF;

  -- Consentimento: default é NÃO. Ausência de linha = ausência de opt-in.
  SELECT CASE p_tipo
           WHEN 'digest_diario'  THEN pn.digest_diario
           WHEN 'digest_semanal' THEN pn.digest_semanal
           ELSE pn.eventos
         END
    INTO v_pode
    FROM preferencias_notificacao pn
   WHERE pn.id_cliente = p_cliente
     AND pn.pessoa_ref = p_persona
     AND pn.canal = 'whatsapp'
     AND pn.optout_em IS NULL
   LIMIT 1;

  IF coalesce(v_pode, false) = false THEN RETURN NULL; END IF;

  INSERT INTO mensagens_saida (id_cliente, destinatario, persona, canal, template, variaveis, previa, chave_idem)
  VALUES (p_cliente, v_destino, p_persona, 'whatsapp', p_template, coalesce(p_variaveis,'{}'::jsonb), p_previa, p_chave)
  ON CONFLICT (chave_idem) DO NOTHING
  RETURNING id INTO v_id;

  RETURN v_id;  -- NULL quando já existia (idempotência)
END; $$;

COMMENT ON FUNCTION public.enfileirar_mensagem(uuid, text, text, text, jsonb, text, text) IS
  'Unico caminho para enfileirar. Checa contato, opt-in e idempotencia. NULL = nao enviar.';
