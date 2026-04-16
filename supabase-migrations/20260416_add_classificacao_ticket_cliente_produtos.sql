ALTER TABLE cliente_produtos
  ADD COLUMN IF NOT EXISTS classificacao_ticket text
  CHECK (classificacao_ticket IN ('low', 'middle', 'high'));
