-- Adiciona colunas pra Visão Admin do cliente: saúde e risco de cancelamento.
-- Ambas opt-in (nullable / default false), não quebra registros existentes.

ALTER TABLE clientes_entrada_new
  ADD COLUMN IF NOT EXISTS saude_cliente text
    CHECK (saude_cliente IN ('saudavel','atencao','critico')),
  ADD COLUMN IF NOT EXISTS em_risco_cancelamento boolean NOT NULL DEFAULT false;
