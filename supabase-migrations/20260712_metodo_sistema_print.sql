-- Print (screenshot) do sistema (Fase 5 — Torre de Comando): coluna + bucket público com RLS por dono.
-- Mesmo padrão de guardiao-fotos: getPublicUrl exibe inline; escrita restrita ao dono do prefixo (clientId/...) ou admin.
ALTER TABLE metodo_sistemas ADD COLUMN IF NOT EXISTS print_url text;

INSERT INTO storage.buckets (id, name, public)
VALUES ('sistema-prints', 'sistema-prints', true)
ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS "sistema_prints_owner_or_admin_rw" ON storage.objects;
CREATE POLICY "sistema_prints_owner_or_admin_rw" ON storage.objects
  FOR ALL TO authenticated
  USING (
    bucket_id = 'sistema-prints'
    AND ((storage.foldername(name))[1] = auth.uid()::text OR is_admin())
  )
  WITH CHECK (
    bucket_id = 'sistema-prints'
    AND ((storage.foldername(name))[1] = auth.uid()::text OR is_admin())
  );
