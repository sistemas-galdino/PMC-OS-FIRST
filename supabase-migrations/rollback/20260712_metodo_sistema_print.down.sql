-- Rollback: remove a coluna print_url e a policy do bucket.
-- O bucket sistema-prints é mantido (pode conter arquivos); remova manualmente se necessário.
DROP POLICY IF EXISTS "sistema_prints_owner_or_admin_rw" ON storage.objects;
ALTER TABLE metodo_sistemas DROP COLUMN IF EXISTS print_url;
