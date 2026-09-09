-- Rollback de 20260908c_crm_whatsapp_cron.sql
DO $$
DECLARE jid bigint; nome text;
BEGIN
  FOREACH nome IN ARRAY ARRAY['crm-whatsapp-watchdog-10min','crm-whatsapp-sync-grupos-diario','crm-whatsapp-convites-20min','crm-whatsapp-eventos-retencao'] LOOP
    SELECT jobid INTO jid FROM cron.job WHERE jobname = nome;
    IF jid IS NOT NULL THEN PERFORM cron.unschedule(jid); END IF;
  END LOOP;
END $$;
