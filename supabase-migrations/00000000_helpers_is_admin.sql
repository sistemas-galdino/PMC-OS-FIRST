-- ============================================================================
-- BASELINE: funções de autorização usadas por praticamente toda a RLS do
-- sistema. Capturadas do banco (antes viviam só no dashboard, fora do
-- versionamento). Nome com prefixo 00000000 para rodar ANTES de qualquer
-- migração que dependa delas ao reconstruir o schema do zero.
--
-- is_admin()  -> true se o usuário logado tem e-mail em public.mentores
-- is_mentor() -> idem (variante SQL STABLE; mantida por compatibilidade)
-- ============================================================================

CREATE OR REPLACE FUNCTION public.is_admin()
  RETURNS boolean
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path TO 'public'
AS $function$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.mentores
    WHERE email = (SELECT email FROM auth.users WHERE id = auth.uid())
  );
END;
$function$;

CREATE OR REPLACE FUNCTION public.is_mentor()
  RETURNS boolean
  LANGUAGE sql
  STABLE SECURITY DEFINER
  SET search_path TO 'public'
AS $function$
  SELECT EXISTS (
    SELECT 1
    FROM mentores m
    WHERE m.email = (SELECT u.email FROM auth.users u WHERE u.id = auth.uid())
  );
$function$;
