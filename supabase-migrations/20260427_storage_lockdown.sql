-- Migration: storage policies — fechar listagem cruzada nos buckets de evidência.
-- Data: 2026-04-27
-- Estado pré-existente:
--   * trilha_ev_owner_rw / vitorias_owner_rw → ALL gated por dono do prefix (OK)
--   * trilha_ev_public_read / vitorias_public_read → SELECT aberto pra TUDO (vaza listagem cruzada)
-- Buckets seguem `public` no Supabase, então URLs de getPublicUrl continuam funcionando
-- pra exibir inline. O que muda: list/upload/update/delete viram restritos ao
-- dono do prefix (clientId/...) ou admin.

DROP POLICY IF EXISTS "trilha_ev_public_read" ON storage.objects;
DROP POLICY IF EXISTS "vitorias_public_read" ON storage.objects;

DROP POLICY IF EXISTS "trilha_ev_owner_rw" ON storage.objects;
CREATE POLICY "trilha_ev_owner_or_admin_rw" ON storage.objects
  FOR ALL TO authenticated
  USING (
    bucket_id = 'trilha-evidencias'
    AND ((storage.foldername(name))[1] = auth.uid()::text OR is_admin())
  )
  WITH CHECK (
    bucket_id = 'trilha-evidencias'
    AND ((storage.foldername(name))[1] = auth.uid()::text OR is_admin())
  );

DROP POLICY IF EXISTS "vitorias_owner_rw" ON storage.objects;
CREATE POLICY "vitorias_owner_or_admin_rw" ON storage.objects
  FOR ALL TO authenticated
  USING (
    bucket_id = 'vitorias-evidencias'
    AND ((storage.foldername(name))[1] = auth.uid()::text OR is_admin())
  )
  WITH CHECK (
    bucket_id = 'vitorias-evidencias'
    AND ((storage.foldername(name))[1] = auth.uid()::text OR is_admin())
  );
