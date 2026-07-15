-- Upload do documento da área (Fase 2 do Método MC): guarda o arquivo original
-- além do texto extraído (documento_texto), que é o que alimenta a IA.
ALTER TABLE metodo_area_ciclos ADD COLUMN IF NOT EXISTS documento_nome text;
ALTER TABLE metodo_area_ciclos ADD COLUMN IF NOT EXISTS documento_url text;

INSERT INTO storage.buckets (id, name, public)
VALUES ('metodo-documentos', 'metodo-documentos', true)
ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS "metodo_docs_owner_or_admin_rw" ON storage.objects;
CREATE POLICY "metodo_docs_owner_or_admin_rw" ON storage.objects
  FOR ALL TO authenticated
  USING (
    bucket_id = 'metodo-documentos'
    AND ((storage.foldername(name))[1] = auth.uid()::text OR is_admin())
  )
  WITH CHECK (
    bucket_id = 'metodo-documentos'
    AND ((storage.foldername(name))[1] = auth.uid()::text OR is_admin())
  );
