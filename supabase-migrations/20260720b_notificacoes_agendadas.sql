-- Sino automático (Grupo B) — avisos AGENDADOS via pg_cron, todo dia 08:00 BRT
-- (11:00 UTC):
--  1) "Hoje tem encontro ao vivo" — broadcast agregado (1 aviso/dia no máximo)
--  2) "Você tem N ações vencendo hoje" — por cliente, prazos DD/MM/YYYY
-- Ambos idempotentes por dia (re-rodar não duplica).
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Prazos das ações são texto livre ("1 semana", "Terça"...) — só datas
-- DD/MM/YYYY contam; qualquer coisa inválida vira NULL em vez de quebrar o job.
CREATE OR REPLACE FUNCTION public.safe_ddmmyyyy(t text)
RETURNS date LANGUAGE plpgsql IMMUTABLE AS $$
BEGIN
  RETURN to_date(t, 'DD/MM/YYYY');
EXCEPTION WHEN OTHERS THEN
  RETURN NULL;
END; $$;

-- 1) Encontros do dia (broadcast agregado).
CREATE OR REPLACE FUNCTION public.notificar_encontros_do_dia()
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_lista text;
  v_n int;
BEGIN
  SELECT string_agg(
           COALESCE(titulo_formatado, 'Encontro PMC')
             || CASE WHEN horario_inicio IS NOT NULL THEN ' às ' || left(horario_inicio, 5) ELSE '' END,
           ' · ' ORDER BY horario_inicio),
         count(*)
    INTO v_lista, v_n
  FROM encontros_ao_vivo
  WHERE data_encontro = to_char(CURRENT_DATE, 'YYYY-MM-DD')
    AND COALESCE(status, '') <> 'cancelado';

  IF COALESCE(v_n, 0) = 0 THEN RETURN; END IF;
  IF EXISTS (
    SELECT 1 FROM notificacoes
    WHERE id_cliente IS NULL AND link = '/calendario'
      AND titulo LIKE '🔴 Hoje tem%' AND created_at::date = CURRENT_DATE
  ) THEN RETURN; END IF;

  INSERT INTO notificacoes (id_cliente, tipo, titulo, texto, link)
  VALUES (NULL, 'reuniao',
          CASE WHEN v_n = 1 THEN '🔴 Hoje tem encontro ao vivo'
               ELSE '🔴 Hoje tem ' || v_n || ' encontros ao vivo' END,
          v_lista, '/calendario');
END; $$;

-- 2) Ações com prazo vencendo hoje (por cliente).
CREATE OR REPLACE FUNCTION public.notificar_acoes_vencendo()
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO notificacoes (id_cliente, tipo, titulo, texto, link)
  SELECT t.id_cliente, 'reuniao',
         CASE WHEN t.n = 1 THEN '⏰ Você tem 1 ação vencendo hoje'
              ELSE '⏰ Você tem ' || t.n || ' ações vencendo hoje' END,
         'Prazo de hoje no seu plano de ação — conclua e marque no portal.',
         '/acoes'
  FROM (
    SELECT r.id_cliente, count(*) AS n
    FROM (
      SELECT id_cliente, jsonb_array_elements(acoes_cliente) AS it
        FROM reunioes_mentoria_new WHERE jsonb_typeof(acoes_cliente) = 'array'
      UNION ALL
      SELECT id_cliente, jsonb_array_elements(acoes_cliente)
        FROM reunioes_galdino WHERE jsonb_typeof(acoes_cliente) = 'array'
    ) r
    WHERE r.id_cliente IS NOT NULL
      AND safe_ddmmyyyy(r.it->>'prazo') = CURRENT_DATE
      AND lower(COALESCE(r.it->>'status', '')) NOT LIKE '%conclu%'
    GROUP BY r.id_cliente
  ) t
  WHERE NOT EXISTS (
    SELECT 1 FROM notificacoes n2
    WHERE n2.id_cliente = t.id_cliente AND n2.link = '/acoes'
      AND n2.titulo LIKE '⏰%' AND n2.created_at::date = CURRENT_DATE
  );
END; $$;

-- Agenda: 11:00 UTC = 08:00 BRT. Re-agendar é idempotente (unschedule antes).
DO $$ BEGIN PERFORM cron.unschedule('pmc-encontros-do-dia'); EXCEPTION WHEN OTHERS THEN NULL; END $$;
DO $$ BEGIN PERFORM cron.unschedule('pmc-acoes-vencendo'); EXCEPTION WHEN OTHERS THEN NULL; END $$;
SELECT cron.schedule('pmc-encontros-do-dia', '0 11 * * *', 'SELECT public.notificar_encontros_do_dia()');
SELECT cron.schedule('pmc-acoes-vencendo', '5 11 * * *', 'SELECT public.notificar_acoes_vencendo()');
