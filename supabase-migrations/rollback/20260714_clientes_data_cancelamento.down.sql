-- Rollback: remove a data de cancelamento do cliente (usada na Dash 2 de saídas).
ALTER TABLE clientes_entrada_new DROP COLUMN IF EXISTS data_cancelamento;
