-- Central de Atendimentos — pg_cron + pg_net pra sincronização pós-reunião (1h).
-- O token literal foi gerado via `openssl rand -hex 32` e setado tanto no
-- Vault (vault.create_secret) quanto nos secrets das edge functions
-- (`supabase secrets set CRON_INVOKE_TOKEN=...`). Aqui mantemos a estrutura
-- da migration — pra reaplicar em outro ambiente, gerar novo token e
-- substituir o placeholder.

CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;

-- Guarda token no Vault. Pra rerodar em outro ambiente, substitua o valor.
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM vault.secrets WHERE name = 'cron_invoke_token') THEN
    PERFORM vault.create_secret(
      '<CRON_INVOKE_TOKEN_HEX_64>',  -- mesmo valor do supabase secrets
      'cron_invoke_token'
    );
  END IF;
END $$;

-- Idempotência: desagenda jobs anteriores com mesmo nome
DO $$
DECLARE jid bigint;
BEGIN
  SELECT jobid INTO jid FROM cron.job WHERE jobname = 'sincronizar-reunioes-hourly';
  IF jid IS NOT NULL THEN
    PERFORM cron.unschedule(jid);
  END IF;
END $$;

-- Agenda: 1x por hora, dispara edge function sincronizar-reunioes
SELECT cron.schedule(
  'sincronizar-reunioes-hourly',
  '0 * * * *',
  $cron$
  SELECT net.http_post(
    url := 'https://hqczwextifessaztyyyk.supabase.co/functions/v1/sincronizar-reunioes',
    headers := jsonb_build_object(
      'Authorization', 'Bearer ' || (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'cron_invoke_token'),
      'Content-Type', 'application/json'
    ),
    body := '{}'::jsonb
  );
  $cron$
);
