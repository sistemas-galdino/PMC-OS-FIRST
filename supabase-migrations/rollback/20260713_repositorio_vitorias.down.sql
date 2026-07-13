-- Rollback: remove a tabela e a policy do bucket (o bucket é mantido; remova manualmente se necessário).
DROP POLICY IF EXISTS "repositorio_vitorias_admin_rw" ON storage.objects;
DROP TABLE IF EXISTS repositorio_vitorias;
