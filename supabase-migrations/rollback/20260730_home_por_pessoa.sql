-- Rollback — home por pessoa. Os papéis gravados permanecem (inofensivos sem a rota).
DROP FUNCTION IF EXISTS public.meu_papel_empresa();
ALTER TABLE public.empresa_usuarios DROP CONSTRAINT IF EXISTS empresa_usuarios_papel_valido;
