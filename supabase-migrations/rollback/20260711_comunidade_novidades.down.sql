-- Rollback: remove a tabela de Novidades da Comunidade (posts do admin em /novidades).
-- Ordem reversa: policies -> tabela (o DROP TABLE leva junto índice e RLS).
-- Atenção: reverta ANTES o 20260712_novidades_feed (curtidas/comentários têm FK
-- para comunidade_novidades); senão o DROP TABLE abaixo falha por dependência.
DROP POLICY IF EXISTS comunidade_novidades_admin_write ON comunidade_novidades;
DROP POLICY IF EXISTS comunidade_novidades_select ON comunidade_novidades;
DROP TABLE IF EXISTS comunidade_novidades;
