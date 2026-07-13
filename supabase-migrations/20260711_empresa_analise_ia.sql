-- Análise do negócio gerada por IA a partir do site + Instagram (Informações da Empresa).
ALTER TABLE cliente_informacoes_empresa ADD COLUMN IF NOT EXISTS analise_ia jsonb;
ALTER TABLE cliente_informacoes_empresa ADD COLUMN IF NOT EXISTS analise_ia_em timestamptz;
