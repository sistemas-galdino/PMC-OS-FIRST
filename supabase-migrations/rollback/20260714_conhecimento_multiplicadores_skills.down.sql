-- =========================================================
-- ROLLBACK de 20260714_conhecimento_multiplicadores_skills.sql
-- Desfaz Multiplicadores + Skills (tabelas + RLS/policies + bucket + seeds).
-- O seed some junto no DROP TABLE (linhas semeadas com ON CONFLICT DO NOTHING).
-- Ordem reversa: policy do storage -> bucket -> policies das tabelas -> tabelas.
-- Atenção: o DELETE do bucket falha se ainda houver arquivos nele
-- (storage.objects referencia bucket_id); esvazie o bucket antes se necessário.
-- =========================================================

-- 1) Storage (arquivos das skills)
DROP POLICY IF EXISTS skills_arquivos_admin_rw ON storage.objects;
DELETE FROM storage.buckets WHERE id = 'skills-arquivos';

-- 2) Policies das tabelas
DROP POLICY IF EXISTS skills_admin_write ON conhecimento_skills;
DROP POLICY IF EXISTS skills_select ON conhecimento_skills;
DROP POLICY IF EXISTS multiplicadores_admin_write ON conhecimento_multiplicadores;
DROP POLICY IF EXISTS multiplicadores_select ON conhecimento_multiplicadores;

-- 3) Tabelas (o DROP leva junto índices, RLS e as linhas semeadas)
DROP TABLE IF EXISTS conhecimento_skills;
DROP TABLE IF EXISTS conhecimento_multiplicadores;
