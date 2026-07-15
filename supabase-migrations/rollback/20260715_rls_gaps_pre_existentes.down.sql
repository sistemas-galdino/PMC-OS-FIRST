-- Rollback de 20260715_rls_gaps_pre_existentes.sql
-- ATENÇÃO: desligar a RLS reabre invite_resend_attempts/calendar_watch_channels para o anon.
-- Use só para voltar exatamente ao estado anterior; o correto é manter o fix aplicado.

ALTER TABLE public.invite_resend_attempts  DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.calendar_watch_channels DISABLE ROW LEVEL SECURITY;

ALTER FUNCTION public.is_admin() RESET search_path;
ALTER FUNCTION public.proxy_claude(text, jsonb, text, integer) RESET search_path;
