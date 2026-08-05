-- Rollback — funções de digest da Onda 1 (+ agendamentos).
SELECT cron.unschedule('digest-diario-guardiao');
SELECT cron.unschedule('digest-semanal-dono');
DROP FUNCTION IF EXISTS public.digest_diario_guardiao(date);
DROP FUNCTION IF EXISTS public.digest_semanal_dono(date);
