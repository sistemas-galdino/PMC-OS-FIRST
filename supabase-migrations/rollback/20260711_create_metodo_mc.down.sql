-- =========================================================
-- ROLLBACK de 20260711_create_metodo_mc.sql
-- Desfaz as 8 tabelas do Método MC (Multiplicador de Crescimento) + RLS/policies.
-- As policies (<tabela>_rw) foram criadas por um DO-loop na migration.
-- Ordem reversa: policies -> tabelas (filhas antes das pais).
--   metodo_area_ciclos referencia metodo_areas (FK CASCADE) -> cai antes de metodo_areas.
-- Tudo com IF EXISTS. Drops de tabela levam junto policies/índices/constraints.
-- =========================================================

-- 1) Policies (redundante com o DROP TABLE, mas explícito p/ ambientes parciais)
DROP POLICY IF EXISTS metodo_economias_rw ON metodo_economias;
DROP POLICY IF EXISTS metodo_ferramentas_rw ON metodo_ferramentas;
DROP POLICY IF EXISTS metodo_sistemas_rw ON metodo_sistemas;
DROP POLICY IF EXISTS metodo_copilotos_rw ON metodo_copilotos;
DROP POLICY IF EXISTS metodo_gargalos_rw ON metodo_gargalos;
DROP POLICY IF EXISTS metodo_area_ciclos_rw ON metodo_area_ciclos;
DROP POLICY IF EXISTS metodo_areas_rw ON metodo_areas;
DROP POLICY IF EXISTS metodo_guardioes_rw ON metodo_guardioes;

-- 2) Tabelas (ordem reversa de criação; filhas antes das pais)
DROP TABLE IF EXISTS metodo_economias;
DROP TABLE IF EXISTS metodo_ferramentas;
DROP TABLE IF EXISTS metodo_sistemas;
DROP TABLE IF EXISTS metodo_copilotos;
DROP TABLE IF EXISTS metodo_gargalos;
DROP TABLE IF EXISTS metodo_area_ciclos;
DROP TABLE IF EXISTS metodo_areas;
DROP TABLE IF EXISTS metodo_guardioes;
