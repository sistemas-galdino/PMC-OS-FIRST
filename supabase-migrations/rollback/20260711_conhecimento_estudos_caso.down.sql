-- Rollback: remove a tabela de Estudos de Caso (Conhecimento → /estudos-caso).
-- Ordem reversa: policies -> tabela (o DROP TABLE leva junto índice e RLS).
DROP POLICY IF EXISTS estudos_caso_admin_write ON conhecimento_estudos_caso;
DROP POLICY IF EXISTS estudos_caso_select ON conhecimento_estudos_caso;
DROP TABLE IF EXISTS conhecimento_estudos_caso;
