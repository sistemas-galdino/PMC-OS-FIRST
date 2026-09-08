-- Rollback de 20260908b_crm_whatsapp_rbac_secao.sql
DELETE FROM public.papel_secoes    WHERE secao_chave = 'crm/whatsapp';
DELETE FROM public.mentor_secao_override WHERE secao_chave = 'crm/whatsapp';
DELETE FROM public.secoes_catalogo WHERE chave = 'crm/whatsapp';
