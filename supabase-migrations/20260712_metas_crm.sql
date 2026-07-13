-- Mapeamento (Cenário Atual): uso de CRM.
-- usa_crm / vai_usar_black_crm são nullable: null = ainda não respondeu.
-- vai_usar_black_crm alimenta a estimativa automática do IAVS (economia de CRM de mercado).
ALTER TABLE cliente_metas ADD COLUMN IF NOT EXISTS usa_crm boolean;
ALTER TABLE cliente_metas ADD COLUMN IF NOT EXISTS crm_atual text;
ALTER TABLE cliente_metas ADD COLUMN IF NOT EXISTS vai_usar_black_crm boolean;
