-- Onda 1 · Eventos — cumpre o que a tela de Notificações já promete no toggle
-- "Avisos na hora". Até aqui só os dois digests enfileiravam; o interruptor de
-- eventos ligava algo que nunca disparava.
--
-- Cinco eventos, dois mecanismos:
--   IMEDIATOS (trigger): tarefa atribuída · candidato respondeu · vitória aprovada
--   TEMPORAIS (cron):    prazo vencendo · trava parada há 48h
--
-- Os dois últimos imediatos ESTENDEM triggers que já existiam (sino in-app),
-- em vez de duplicar a lógica.

-- ---------------------------------------------------------------------------
-- 1) Desde quando a trava está aberta
-- ---------------------------------------------------------------------------
-- "Trava parada há 48h" precisa de marca temporal. Usar updated_at seria chute:
-- qualquer edição na tarefa zeraria a contagem. Coluna própria, mantida por trigger.
ALTER TABLE public.metodo_tarefas ADD COLUMN IF NOT EXISTS bloqueio_em timestamptz;
COMMENT ON COLUMN public.metodo_tarefas.bloqueio_em IS
  'Quando o bloqueio atual começou. NULL = sem trava. Base do evento "trava parada".';

CREATE OR REPLACE FUNCTION public.marcar_bloqueio_em()
RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE
  tem_agora boolean := coalesce(btrim(NEW.bloqueio), '') <> '';
  tinha_antes boolean := TG_OP = 'UPDATE' AND coalesce(btrim(OLD.bloqueio), '') <> '';
BEGIN
  IF tem_agora AND NOT tinha_antes THEN
    NEW.bloqueio_em := now();          -- trava nasceu agora
  ELSIF NOT tem_agora THEN
    NEW.bloqueio_em := NULL;           -- trava foi resolvida
  END IF;
  RETURN NEW;
END; $$;

DROP TRIGGER IF EXISTS trg_marcar_bloqueio_em ON public.metodo_tarefas;
CREATE TRIGGER trg_marcar_bloqueio_em
  BEFORE INSERT OR UPDATE OF bloqueio ON public.metodo_tarefas
  FOR EACH ROW EXECUTE FUNCTION public.marcar_bloqueio_em();

-- Retroativo: travas que já existem passam a contar de agora (não inventamos passado).
UPDATE public.metodo_tarefas
   SET bloqueio_em = now()
 WHERE coalesce(btrim(bloqueio),'') <> '' AND bloqueio_em IS NULL;

-- ---------------------------------------------------------------------------
-- 2) enfileirar_evento — o único caminho para evento, COM TETO
-- ---------------------------------------------------------------------------
-- Um digest por dia é combinado. Evento é imprevisível: atribuir 10 tarefas de
-- uma vez viraria 10 mensagens e o cliente silencia o número para sempre.
-- Teto de 3 eventos por pessoa por dia; o excedente é descartado (o cliente vê
-- tudo no sino in-app de qualquer forma). O digest NÃO passa por aqui, então
-- nunca é barrado pelo teto de eventos.
CREATE OR REPLACE FUNCTION public.enfileirar_evento(
  p_cliente   uuid,
  p_persona   text,
  p_template  text,
  p_chave     text,
  p_variaveis jsonb DEFAULT '{}'::jsonb,
  p_previa    text  DEFAULT NULL
)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  TETO_DIA constant int := 3;
  v_hoje date := (now() AT TIME ZONE 'America/Sao_Paulo')::date;
  v_ja   int;
BEGIN
  SELECT count(*) INTO v_ja
    FROM mensagens_saida
   WHERE id_cliente = p_cliente
     AND persona = p_persona
     AND template NOT LIKE 'digest%'
     AND (created_at AT TIME ZONE 'America/Sao_Paulo')::date = v_hoje;

  IF v_ja >= TETO_DIA THEN RETURN NULL; END IF;

  RETURN enfileirar_mensagem(p_cliente, p_persona, p_template, p_chave,
                             p_variaveis, p_previa, 'eventos');
END; $$;

COMMENT ON FUNCTION public.enfileirar_evento(uuid, text, text, text, jsonb, text) IS
  'Enfileira um evento respeitando o teto de 3 por pessoa/dia. Fadiga de notificação gera mute, e mute não volta atrás.';

-- ---------------------------------------------------------------------------
-- 3) Evento imediato: tarefa atribuída -> Guardião
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.evento_tarefa_atribuida()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_nome text; v_prazo text;
BEGIN
  -- Só quando o responsável MUDA para alguém (transição, não estado).
  IF NEW.responsavel_id IS NULL THEN RETURN NEW; END IF;
  IF TG_OP = 'UPDATE' AND OLD.responsavel_id IS NOT DISTINCT FROM NEW.responsavel_id THEN
    RETURN NEW;
  END IF;

  SELECT nome INTO v_nome FROM cliente_colaboradores WHERE id = NEW.responsavel_id;
  v_prazo := CASE WHEN NEW.prazo IS NOT NULL THEN ' · prazo ' || to_char(NEW.prazo,'DD/MM') ELSE '' END;

  PERFORM enfileirar_evento(
    NEW.id_cliente, 'guardiao', 'tarefa_atribuida',
    'ev_atrib:' || NEW.id || ':' || NEW.responsavel_id,
    jsonb_build_object('tarefa', NEW.titulo, 'pessoa', coalesce(v_nome,'alguém do time'), 'destino', '/meu-dia'),
    'Tarefa para ' || coalesce(v_nome,'o time') || ': ' || NEW.titulo || v_prazo);
  RETURN NEW;
END; $$;

DROP TRIGGER IF EXISTS trg_evento_tarefa_atribuida ON public.metodo_tarefas;
CREATE TRIGGER trg_evento_tarefa_atribuida
  AFTER INSERT OR UPDATE OF responsavel_id ON public.metodo_tarefas
  FOR EACH ROW EXECUTE FUNCTION public.evento_tarefa_atribuida();

-- ---------------------------------------------------------------------------
-- 4) Evento imediato: candidato respondeu o assessment -> Dono
--    (estende o trigger de sino in-app que já existia)
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.notificar_assessment_respondido()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_cliente uuid; v_nome text; v_pct text;
BEGIN
  SELECT id_cliente, candidate_name INTO v_cliente, v_nome
    FROM guardiao_invites WHERE id = NEW.invite_id;
  IF v_cliente IS NULL THEN RETURN NEW; END IF;
  v_pct := round(COALESCE(NEW.score_pct, 0))::text;

  INSERT INTO notificacoes (id_cliente, tipo, titulo, texto, link)
  VALUES (v_cliente, 'guardiao',
          COALESCE(NULLIF(btrim(v_nome), ''), 'Um candidato') || ' respondeu o assessment',
          'Aderência de ' || v_pct || '% — veja o resultado por pilar.',
          '/guardiao?tab=candidatos');

  PERFORM enfileirar_evento(
    v_cliente, 'dono', 'candidato_respondeu',
    'ev_cand:' || NEW.invite_id,
    jsonb_build_object('nome', coalesce(nullif(btrim(v_nome),''),'Um candidato'),
                       'aderencia', v_pct, 'destino', '/guardiao?tab=candidatos'),
    coalesce(nullif(btrim(v_nome),''),'Um candidato') || ' respondeu o assessment — ' || v_pct || '% de aderência');
  RETURN NEW;
END; $$;

-- ---------------------------------------------------------------------------
-- 5) Evento imediato: vitória aprovada / virou case -> Dono
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.notificar_vitoria_status()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NEW.id_cliente IS NULL OR OLD.status IS NOT DISTINCT FROM NEW.status THEN
    RETURN NEW;
  END IF;

  IF NEW.status = 'aprovada' THEN
    INSERT INTO notificacoes (id_cliente, tipo, titulo, texto, link)
    VALUES (NEW.id_cliente, 'aviso', '🎉 Sua vitória foi aprovada!',
            '"' || NEW.titulo || '" foi validada pelo time do PMC.', '/vitorias');
    PERFORM enfileirar_evento(
      NEW.id_cliente, 'dono', 'vitoria_aprovada', 'ev_vit:' || NEW.id || ':aprovada',
      jsonb_build_object('titulo', NEW.titulo, 'destino', '/vitorias'),
      'Sua vitória "' || NEW.titulo || '" foi aprovada pelo time do PMC');
  ELSIF NEW.status = 'case' THEN
    INSERT INTO notificacoes (id_cliente, tipo, titulo, texto, link)
    VALUES (NEW.id_cliente, 'aviso', '🏆 Sua vitória vai virar case!',
            '"' || NEW.titulo || '" foi selecionada — o time vai te chamar para gravar.', '/vitorias');
    PERFORM enfileirar_evento(
      NEW.id_cliente, 'dono', 'vitoria_aprovada', 'ev_vit:' || NEW.id || ':case',
      jsonb_build_object('titulo', NEW.titulo, 'destino', '/vitorias'),
      'Sua vitória "' || NEW.titulo || '" foi selecionada para virar case');
  END IF;
  RETURN NEW;
END; $$;

-- ---------------------------------------------------------------------------
-- 6) Evento temporal: prazo vencendo (hoje ou amanhã) -> Guardião
-- ---------------------------------------------------------------------------
-- Agregado: UMA mensagem com a contagem, nunca uma por tarefa.
CREATE OR REPLACE FUNCTION public.eventos_prazo_vencendo(p_data date DEFAULT NULL)
RETURNS int LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  r record; v_hoje date := coalesce(p_data, (now() AT TIME ZONE 'America/Sao_Paulo')::date);
  v_fila int := 0; v_txt text;
BEGIN
  IF extract(isodow FROM v_hoje) > 5 THEN RETURN 0; END IF;
  FOR r IN
    SELECT t.id_cliente,
           count(*) FILTER (WHERE t.prazo = v_hoje)     AS vence_hoje,
           count(*) FILTER (WHERE t.prazo = v_hoje + 1) AS vence_amanha,
           min(t.titulo) FILTER (WHERE t.prazo = v_hoje) AS exemplo
      FROM metodo_tarefas t
      JOIN clientes_entrada_new e ON e.id_cliente = t.id_cliente
     WHERE t.status <> 'concluido'
       AND t.prazo IN (v_hoje, v_hoje + 1)
       AND e.data_cancelamento IS NULL
       AND e.status_atual IN ('Ativo no Programa','Ativo - 2º Ciclo')
     GROUP BY t.id_cliente
  LOOP
    v_txt := concat_ws(' · ',
      CASE WHEN r.vence_hoje   > 0 THEN r.vence_hoje   || ' vence hoje' END,
      CASE WHEN r.vence_amanha > 0 THEN r.vence_amanha || ' vence amanhã' END);
    IF enfileirar_evento(r.id_cliente, 'guardiao', 'prazo_vencendo',
         'ev_prazo:' || r.id_cliente || ':' || to_char(v_hoje,'YYYY-MM-DD'),
         jsonb_build_object('resumo', v_txt, 'exemplo', coalesce(r.exemplo,''), 'destino','/meu-dia'),
         'Prazos apertando — ' || v_txt) IS NOT NULL
    THEN v_fila := v_fila + 1; END IF;
  END LOOP;
  RETURN v_fila;
END; $$;

-- ---------------------------------------------------------------------------
-- 7) Evento temporal: trava aberta há 48h+ -> Guardião
-- ---------------------------------------------------------------------------
-- Idempotente por SEMANA, não por dia: uma trava velha não pode cutucar todo dia.
CREATE OR REPLACE FUNCTION public.eventos_trava_parada(p_data date DEFAULT NULL)
RETURNS int LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  r record; v_hoje date := coalesce(p_data, (now() AT TIME ZONE 'America/Sao_Paulo')::date);
  v_fila int := 0;
BEGIN
  IF extract(isodow FROM v_hoje) > 5 THEN RETURN 0; END IF;
  FOR r IN
    SELECT t.id_cliente, t.id, t.bloqueio, t.titulo,
           extract(day FROM (now() - t.bloqueio_em))::int AS dias
      FROM metodo_tarefas t
      JOIN clientes_entrada_new e ON e.id_cliente = t.id_cliente
     WHERE t.status <> 'concluido'
       AND coalesce(btrim(t.bloqueio),'') <> ''
       AND t.bloqueio_em IS NOT NULL
       AND t.bloqueio_em < now() - interval '48 hours'
       AND e.data_cancelamento IS NULL
       AND e.status_atual IN ('Ativo no Programa','Ativo - 2º Ciclo')
     ORDER BY t.bloqueio_em
  LOOP
    IF enfileirar_evento(r.id_cliente, 'guardiao', 'bloqueio_parado',
         'ev_trava:' || r.id || ':' || to_char(v_hoje,'IYYY-"W"IW'),
         jsonb_build_object('bloqueio', r.bloqueio, 'dias', r.dias, 'destino','/meu-dia'),
         'Trava parada há ' || r.dias || ' dia(s): ' || r.bloqueio || ' (' || r.titulo || ')') IS NOT NULL
    THEN v_fila := v_fila + 1; END IF;
  END LOOP;
  RETURN v_fila;
END; $$;

-- Agendados DEPOIS dos digests, para o teto diário ser gasto primeiro pelo que
-- é combinado (o digest) e só depois pelo que é imprevisível (o evento).
SELECT cron.schedule('eventos-prazo-vencendo', '25 11 * * 1-5', 'SELECT public.eventos_prazo_vencendo()');
SELECT cron.schedule('eventos-trava-parada',   '30 11 * * 1-5', 'SELECT public.eventos_trava_parada()');
