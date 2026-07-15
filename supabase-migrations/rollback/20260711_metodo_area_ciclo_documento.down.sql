-- Rollback: remove o documento da área (Fase 2 do Método MC): colunas + bucket + policy.
-- Ordem reversa: policy do storage -> bucket -> colunas.
-- Atenção: o DELETE do bucket falha se ainda houver arquivos nele
-- (storage.objects referencia bucket_id); esvazie o bucket antes se necessário.
DROP POLICY IF EXISTS "metodo_docs_owner_or_admin_rw" ON storage.objects;
DELETE FROM storage.buckets WHERE id = 'metodo-documentos';
ALTER TABLE metodo_area_ciclos DROP COLUMN IF EXISTS documento_url;
ALTER TABLE metodo_area_ciclos DROP COLUMN IF EXISTS documento_nome;
