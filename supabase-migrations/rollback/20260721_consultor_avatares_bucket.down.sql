-- Rollback do bucket de avatares dos consultores.
DROP POLICY IF EXISTS consultor_avatares_admin_rw ON storage.objects;

-- O DELETE do bucket falha se ainda houver arquivos (storage.objects referencia
-- bucket_id). Esvazie o bucket antes e descomente pra um teardown total:
-- DELETE FROM storage.buckets WHERE id = 'consultor-avatares';
