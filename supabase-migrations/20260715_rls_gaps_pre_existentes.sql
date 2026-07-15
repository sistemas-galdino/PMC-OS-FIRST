-- Fecha 2 gaps de segurança PRÉ-EXISTENTES (anteriores à branch galdino-workspace).
--
-- 1) invite_resend_attempts e calendar_watch_channels estavam com RLS DESLIGADA e a role anon
--    com SELECT/INSERT/UPDATE/DELETE. São bookkeeping server-side (escritas só por edge functions
--    com service_role, que ignoram RLS); o frontend nunca as acessa (grep: 0 refs no web/src;
--    calendar_watch_channels só em webhook-gcal/watchdog-gcal). Ligar RLS sem policy bloqueia
--    anon/authenticated e não quebra o service_role. É o mesmo estado que o DEV já tem.
--
-- 2) is_admin() e proxy_claude() são SECURITY DEFINER sem search_path pinado. Hoje NÃO são
--    exploráveis (todas as refs são schema-qualified e anon/authenticated não têm CREATE em public),
--    mas pinar o search_path é higiene padrão (igual ao is_mentor) e limpa o advisor.

ALTER TABLE public.invite_resend_attempts  ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.calendar_watch_channels ENABLE ROW LEVEL SECURITY;

ALTER FUNCTION public.is_admin() SET search_path = public;
ALTER FUNCTION public.proxy_claude(text, jsonb, text, integer) SET search_path = public, extensions;
