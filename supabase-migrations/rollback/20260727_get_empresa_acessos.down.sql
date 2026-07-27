-- Rollback de 20260727_get_empresa_acessos.sql
-- Remove a RPC de listagem de logins por empresa.
DROP FUNCTION IF EXISTS public.get_empresa_acessos();
