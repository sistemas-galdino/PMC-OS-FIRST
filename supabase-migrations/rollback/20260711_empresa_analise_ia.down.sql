-- Rollback: remove a análise do negócio gerada por IA de cliente_informacoes_empresa.
ALTER TABLE cliente_informacoes_empresa DROP COLUMN IF EXISTS analise_ia_em;
ALTER TABLE cliente_informacoes_empresa DROP COLUMN IF EXISTS analise_ia;
