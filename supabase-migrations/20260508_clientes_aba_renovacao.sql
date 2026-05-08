-- Adiciona campos da aba "Renovação" da Visão Admin do cliente.

ALTER TABLE clientes_entrada_new
  ADD COLUMN IF NOT EXISTS renovacao_data date,
  ADD COLUMN IF NOT EXISTS renovacao_valor numeric(12,2),
  ADD COLUMN IF NOT EXISTS renovacao_status text
    CHECK (renovacao_status IN ('ainda_distante','em_negociacao','confirmada','recusada','em_risco')),
  ADD COLUMN IF NOT EXISTS renovacao_observacoes text;
