CREATE OR REPLACE FUNCTION public.has_auth_user(p_id_cliente uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS(SELECT 1 FROM auth.users WHERE id = p_id_cliente);
$$;

GRANT EXECUTE ON FUNCTION public.has_auth_user(uuid) TO authenticated;
