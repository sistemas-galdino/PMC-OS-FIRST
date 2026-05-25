-- Agenda execução de 30 em 30 min da edge function watchdog-gcal.
-- A function renova watch channels do Google Calendar e roda fallback
-- de sync quando o webhook está silencioso. Reutiliza cron_invoke_token
-- já gravado em vault.secrets (mesma migration 20260518).

CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;

-- Idempotência
DO $$
DECLARE jid bigint;
BEGIN
  SELECT jobid INTO jid FROM cron.job WHERE jobname = 'watchdog-gcal-30min';
  IF jid IS NOT NULL THEN
    PERFORM cron.unschedule(jid);
  END IF;
END $$;

SELECT cron.schedule(
  'watchdog-gcal-30min',
  '*/30 * * * *',
  $cron$
  SELECT net.http_post(
    url := 'https://hqczwextifessaztyyyk.supabase.co/functions/v1/watchdog-gcal',
    headers := jsonb_build_object(
      'Authorization', 'Bearer ' || (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'cron_invoke_token'),
      'Content-Type', 'application/json'
    ),
    body := '{}'::jsonb
  );
  $cron$
);
