-- Onda 1 — As funções de digest. SQL puro: decidem O QUE dizer e enfileiram.
-- Não falam com provedor nenhum (quem envia é o worker enviar-mensagens).
--
-- REGRA DE CONTEÚDO (vale para todos os digests):
--   Só sai mensagem que carrega um NÚMERO ou uma DECISÃO. Um digest dizendo
--   "0 tarefas, 0 travas" treina o cliente a silenciar — e silenciamento não
--   volta atrás. Por isso todo digest tem uma cláusula de "vale a pena falar?".
--
-- Idempotência: garantida pela chave_idem em enfileirar_mensagem
--   diário  -> digest_diario:<cliente>:<AAAA-MM-DD>
--   semanal -> digest_semanal:<cliente>:<AAAA-Www>
-- Rodar duas vezes no mesmo dia não duplica.

-- ---------------------------------------------------------------------------
-- Digest diário do Guardião — seg a sex
-- ---------------------------------------------------------------------------
-- p_data: injetável. NULL = hoje (uso normal do cron). Passar uma data permite
-- reprocessar um dia específico se o agendador falhar — e torna a função testável.
CREATE OR REPLACE FUNCTION public.digest_diario_guardiao(p_data date DEFAULT NULL)
RETURNS int
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  r          record;
  v_hoje     date := coalesce(p_data, (now() AT TIME ZONE 'America/Sao_Paulo')::date);
  v_texto    text;
  v_fila     int := 0;
BEGIN
  -- Fim de semana não tem rotina diária.
  IF extract(isodow FROM v_hoje) > 5 THEN RETURN 0; END IF;

  FOR r IN
    SELECT e.id_cliente,
           count(*) FILTER (WHERE t.status <> 'concluido' AND t.prazo = v_hoje)                      AS hoje,
           count(*) FILTER (WHERE t.status <> 'concluido' AND t.prazo < v_hoje)                      AS atrasadas,
           count(*) FILTER (WHERE t.status <> 'concluido' AND coalesce(btrim(t.bloqueio),'') <> '')  AS travas,
           count(*) FILTER (WHERE t.origem = 'rotina_diaria'
                              AND (t.created_at AT TIME ZONE 'America/Sao_Paulo')::date = v_hoje)    AS rotina_aberta
      FROM clientes_entrada_new e
      LEFT JOIN metodo_tarefas t ON t.id_cliente = e.id_cliente
     WHERE e.data_cancelamento IS NULL
       AND e.status_atual IN ('Ativo no Programa', 'Ativo - 2º Ciclo')
     GROUP BY e.id_cliente
  LOOP
    -- Vale a pena falar? Só se há trabalho concreto ou a rotina do dia não foi aberta.
    CONTINUE WHEN r.hoje = 0 AND r.atrasadas = 0 AND r.travas = 0 AND r.rotina_aberta > 0;

    v_texto := concat_ws(' · ',
      CASE WHEN r.hoje      > 0 THEN r.hoje      || ' tarefa'  || CASE WHEN r.hoje      > 1 THEN 's' ELSE '' END || ' para hoje' END,
      CASE WHEN r.atrasadas > 0 THEN r.atrasadas || ' atrasada'|| CASE WHEN r.atrasadas > 1 THEN 's' ELSE '' END END,
      CASE WHEN r.travas    > 0 THEN r.travas    || ' trava'   || CASE WHEN r.travas    > 1 THEN 's' ELSE '' END END,
      CASE WHEN r.rotina_aberta = 0 THEN 'rotina diária ainda não aberta' END
    );

    IF enfileirar_mensagem(
         r.id_cliente, 'guardiao', 'digest_diario_guardiao',
         'digest_diario:' || r.id_cliente || ':' || to_char(v_hoje, 'YYYY-MM-DD'),
         jsonb_build_object('resumo', v_texto),
         'Seu dia no PMC OS — ' || v_texto,
         'digest_diario') IS NOT NULL
    THEN
      v_fila := v_fila + 1;
    END IF;
  END LOOP;

  RETURN v_fila;
END; $$;

COMMENT ON FUNCTION public.digest_diario_guardiao() IS
  'Enfileira o resumo diário do Guardião (seg-sex). Só fala quando há número ou decisão. Devolve quantas mensagens entraram na fila.';

-- ---------------------------------------------------------------------------
-- Digest semanal do dono — segunda-feira
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.digest_semanal_dono(p_data date DEFAULT NULL)
RETURNS int
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  r        record;
  v_hoje   date := coalesce(p_data, (now() AT TIME ZONE 'America/Sao_Paulo')::date);
  v_ini    timestamptz := (v_hoje - 7)::timestamptz;  -- janela dos últimos 7 dias
  v_texto  text;
  v_fila   int := 0;
BEGIN
  FOR r IN
    SELECT e.id_cliente,
           (SELECT count(*) FROM metodo_tarefas t
             WHERE t.id_cliente = e.id_cliente AND t.status = 'concluido' AND t.updated_at >= v_ini) AS concluidas,
           (SELECT count(*) FROM metodo_sistemas s
             WHERE s.id_cliente = e.id_cliente AND s.created_at >= v_ini)                            AS sistemas,
           (SELECT count(*) FROM metodo_copilotos c
             WHERE c.id_cliente = e.id_cliente AND c.created_at >= v_ini)                            AS copilotos,
           (SELECT count(*) FROM metodo_tarefas t
             WHERE t.id_cliente = e.id_cliente AND t.status <> 'concluido'
               AND coalesce(btrim(t.bloqueio),'') <> '')                                             AS travas,
           (SELECT coalesce(sum(ec.valor_mes), 0) FROM metodo_economias ec
             WHERE ec.id_cliente = e.id_cliente AND ec.created_at >= v_ini
               AND NOT coalesce(ec.capacidade_nova, false))                                          AS economia
      FROM clientes_entrada_new e
     WHERE e.data_cancelamento IS NULL
       AND e.status_atual IN ('Ativo no Programa', 'Ativo - 2º Ciclo')
  LOOP
    -- Semana sem nenhum movimento não vira mensagem.
    CONTINUE WHEN r.concluidas = 0 AND r.sistemas = 0 AND r.copilotos = 0
             AND r.travas = 0 AND coalesce(r.economia, 0) = 0;

    v_texto := concat_ws(' · ',
      CASE WHEN coalesce(r.economia,0) > 0
           THEN 'R$ ' || to_char(r.economia, 'FM999G999G990D00') || ' registrados' END,
      CASE WHEN r.concluidas > 0 THEN r.concluidas || ' tarefa'   || CASE WHEN r.concluidas > 1 THEN 's' ELSE '' END || ' concluída' || CASE WHEN r.concluidas > 1 THEN 's' ELSE '' END END,
      CASE WHEN r.sistemas   > 0 THEN r.sistemas   || ' sistema'  || CASE WHEN r.sistemas   > 1 THEN 's' ELSE '' END || ' novo'      || CASE WHEN r.sistemas   > 1 THEN 's' ELSE '' END END,
      CASE WHEN r.copilotos  > 0 THEN r.copilotos  || ' co-piloto'|| CASE WHEN r.copilotos  > 1 THEN 's' ELSE '' END END,
      CASE WHEN r.travas     > 0 THEN r.travas     || ' decisão'  || CASE WHEN r.travas     > 1 THEN 'ões' ELSE '' END || ' esperando você' END
    );

    IF enfileirar_mensagem(
         r.id_cliente, 'dono', 'digest_semanal_dono',
         'digest_semanal:' || r.id_cliente || ':' || to_char(v_hoje, 'IYYY-"W"IW'),
         jsonb_build_object('resumo', v_texto),
         'Sua semana no PMC — ' || v_texto,
         'digest_semanal') IS NOT NULL
    THEN
      v_fila := v_fila + 1;
    END IF;
  END LOOP;

  RETURN v_fila;
END; $$;

COMMENT ON FUNCTION public.digest_semanal_dono() IS
  'Enfileira o resumo semanal do dono (segunda). Só fala quando houve movimento. Devolve quantas mensagens entraram na fila.';
