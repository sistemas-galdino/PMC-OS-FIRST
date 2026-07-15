-- Foto do guardião (Fase 1 do Método MC): coluna + bucket público com RLS por dono.
ALTER TABLE metodo_guardioes ADD COLUMN IF NOT EXISTS foto_url text;

-- Bucket público (mesmo padrão de vitorias-evidencias/trilha-evidencias):
-- getPublicUrl exibe inline; escrita restrita ao dono do prefixo (clientId/...) ou admin.
INSERT INTO storage.buckets (id, name, public)
VALUES ('guardiao-fotos', 'guardiao-fotos', true)
ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS "guardiao_fotos_owner_or_admin_rw" ON storage.objects;
CREATE POLICY "guardiao_fotos_owner_or_admin_rw" ON storage.objects
  FOR ALL TO authenticated
  USING (
    bucket_id = 'guardiao-fotos'
    AND ((storage.foldername(name))[1] = auth.uid()::text OR is_admin())
  )
  WITH CHECK (
    bucket_id = 'guardiao-fotos'
    AND ((storage.foldername(name))[1] = auth.uid()::text OR is_admin())
  );
