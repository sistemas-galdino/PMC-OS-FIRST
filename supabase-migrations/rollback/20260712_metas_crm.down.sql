-- Rollback: remove os campos de CRM do mapeamento.
ALTER TABLE cliente_metas DROP COLUMN IF EXISTS vai_usar_black_crm;
ALTER TABLE cliente_metas DROP COLUMN IF EXISTS crm_atual;
ALTER TABLE cliente_metas DROP COLUMN IF EXISTS usa_crm;
