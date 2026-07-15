-- Data de cancelamento do cliente — permite medir SAÍDAS por mês na Dash 2
-- (crescimento = entradas × saídas × saldo líquido). Preenchida quando o
-- cliente é marcado como cancelado.
ALTER TABLE clientes_entrada_new ADD COLUMN IF NOT EXISTS data_cancelamento date;
