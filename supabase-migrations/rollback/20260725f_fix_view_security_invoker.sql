-- Rollback — reverte a view para o modo definer.
-- ATENÇÃO: reintroduz o vazamento de RLS que a migration corrigiu. Só use se
-- for reverter toda a onda de segurança.
ALTER VIEW public.cobertura_contato SET (security_invoker = false);
