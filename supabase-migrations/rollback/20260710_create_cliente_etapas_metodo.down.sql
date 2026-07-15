-- Rollback: remove a tabela de progresso do cliente nas 7 etapas do Método PMC.
-- Ordem reversa: policies -> tabela (o DROP TABLE leva junto índice e RLS).
DROP POLICY IF EXISTS cliente_etapas_metodo_delete ON cliente_etapas_metodo;
DROP POLICY IF EXISTS cliente_etapas_metodo_update ON cliente_etapas_metodo;
DROP POLICY IF EXISTS cliente_etapas_metodo_insert ON cliente_etapas_metodo;
DROP POLICY IF EXISTS cliente_etapas_metodo_select ON cliente_etapas_metodo;
DROP TABLE IF EXISTS cliente_etapas_metodo;
