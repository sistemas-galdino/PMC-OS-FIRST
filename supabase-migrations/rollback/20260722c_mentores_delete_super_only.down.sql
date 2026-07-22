-- Rollback de 20260722c_mentores_delete_super_only.sql
-- Remove a policy restritiva; volta a permitir DELETE em mentores conforme
-- a policy FOR ALL mentores_admin_modify (is_admin()).
drop policy if exists mentores_no_client_delete on public.mentores;
