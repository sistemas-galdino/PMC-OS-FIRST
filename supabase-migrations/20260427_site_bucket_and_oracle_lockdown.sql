-- Migration: fechar 2 brechas encontradas no smoke test pelo Playwright
-- Data: 2026-04-27
--
-- 1. Bucket `site`: tinha policies "Allow public read/upload/update" — qualquer
--    pessoa (sem login!) podia subir arquivo no bucket. Como o bucket não é
--    referenciado por nenhum código do web/, viramos admin-only.
-- 2. has_auth_user(p_id_cliente): era oracle público — qualquer authenticated
--    podia probar UUIDs e descobrir quais tinham conta auth criada. Agora
--    retorna NULL pra IDs alheios (cliente só pode checar próprio uid).

DROP POLICY IF EXISTS "Allow public read" ON storage.objects;
DROP POLICY IF EXISTS "Allow anon upload" ON storage.objects;
DROP POLICY IF EXISTS "Allow anon update" ON storage.objects;

CREATE POLICY "site_admin_all" ON storage.objects
  FOR ALL TO authenticated
  USING (bucket_id = 'site' AND is_admin())
  WITH CHECK (bucket_id = 'site' AND is_admin());

CREATE OR REPLACE FUNCTION public.has_auth_user(p_id_cliente uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT CASE
    WHEN auth.uid() = p_id_cliente OR public.is_admin()
      THEN EXISTS(SELECT 1 FROM auth.users WHERE id = p_id_cliente)
    ELSE NULL
  END;
$$;

GRANT EXECUTE ON FUNCTION public.has_auth_user(uuid) TO authenticated;
