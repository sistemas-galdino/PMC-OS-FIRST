-- Rollback: remove a foto do guardião (coluna + bucket público + policy).
-- Ordem reversa: policy do storage -> bucket -> coluna.
-- Atenção: o DELETE do bucket falha se ainda houver arquivos nele
-- (storage.objects referencia bucket_id); esvazie o bucket antes se necessário.
DROP POLICY IF EXISTS "guardiao_fotos_owner_or_admin_rw" ON storage.objects;
DELETE FROM storage.buckets WHERE id = 'guardiao-fotos';
ALTER TABLE metodo_guardioes DROP COLUMN IF EXISTS foto_url;
