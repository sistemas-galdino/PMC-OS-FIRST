-- CRM / WhatsApp — rotinas agendadas.
--
-- 1) watchdog a cada 10 min: a sessão Baileys cai calada (celular sem rede,
--    WhatsApp pedindo novo pareamento, restart do container) e o
--    CONNECTION_UPDATE nem sempre chega. Sem isto a CS descobre que caiu ao
--    tentar responder um cliente.
-- 2) sync de grupos 1x por dia: grupo novo de cliente novo aparece sozinho.
-- 3) retenção de 14 dias em crm_whatsapp_eventos: é log cru com payload jsonb
--    de 237 grupos ativos. Sem poda vira a maior tabela do banco em semanas.
--
-- Reaproveita o cron_invoke_token já no vault (ver 20260518_cron_sincronizar.sql).
-- TROCAR A URL AO APLICAR NO DEV: o ref abaixo é o do PROD.

CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;

DO $$
DECLARE jid bigint; nome text;
BEGIN
  FOREACH nome IN ARRAY ARRAY['crm-whatsapp-watchdog-10min','crm-whatsapp-sync-grupos-diario','crm-whatsapp-eventos-retencao'] LOOP
    SELECT jobid INTO jid FROM cron.job WHERE jobname = nome;
    IF jid IS NOT NULL THEN PERFORM cron.unschedule(jid); END IF;
  END LOOP;
END $$;

SELECT cron.schedule(
  'crm-whatsapp-watchdog-10min',
  '*/10 * * * *',
  $cron$
  SELECT net.http_post(
    url := 'https://hqczwextifessaztyyyk.supabase.co/functions/v1/crm-whatsapp-watchdog',
    headers := jsonb_build_object(
      'Authorization', 'Bearer ' || (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'cron_invoke_token'),
      'Content-Type', 'application/json'
    ),
    body := '{}'::jsonb,
    timeout_milliseconds := 60000
  );
  $cron$
);

-- 06:00 BRT (09:00 UTC): antes do time começar o dia.
SELECT cron.schedule(
  'crm-whatsapp-sync-grupos-diario',
  '0 9 * * *',
  $cron$
  SELECT net.http_post(
    url := 'https://hqczwextifessaztyyyk.supabase.co/functions/v1/crm-whatsapp-sync-grupos',
    headers := jsonb_build_object(
      'Authorization', 'Bearer ' || (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'cron_invoke_token'),
      'Content-Type', 'application/json'
    ),
    body := '{}'::jsonb,
    -- pg_net corta em 5s por default; ler 237 grupos na Evolution passa disso.
    -- Sem isto o job "falha" toda vez, ainda que a função rode até o fim.
    timeout_milliseconds := 240000
  );
  $cron$
);

SELECT cron.schedule(
  'crm-whatsapp-eventos-retencao',
  '30 4 * * *',
  $cron$ DELETE FROM public.crm_whatsapp_eventos WHERE recebido_em < now() - interval '14 days'; $cron$
);
