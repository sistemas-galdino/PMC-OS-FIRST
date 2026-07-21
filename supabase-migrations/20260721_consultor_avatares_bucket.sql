-- Bucket público pras fotos (avatar) dos consultores + policy de escrita só admin.
--
-- O bucket já existe no PROD/V2 (foi criado fora das migrations). Esta migration é
-- IDEMPOTENTE e serve pra registrar no repo e pro DEV. No PROD é no-op.
--
-- Bucket público: a leitura (getPublicUrl / /object/public/...) não passa por RLS,
-- então não precisa de policy de SELECT. A policy abaixo gateia só a escrita
-- (INSERT/UPDATE/DELETE) pra admin, igual ao padrão de skills-arquivos.

INSERT INTO storage.buckets (id, name, public)
VALUES ('consultor-avatares', 'consultor-avatares', true)
ON CONFLICT (id) DO UPDATE SET public = true;

DROP POLICY IF EXISTS consultor_avatares_admin_rw ON storage.objects;
CREATE POLICY consultor_avatares_admin_rw ON storage.objects
  FOR ALL TO authenticated
  USING (bucket_id = 'consultor-avatares' AND is_admin())
  WITH CHECK (bucket_id = 'consultor-avatares' AND is_admin());
