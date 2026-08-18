-- Rollback de 20260810_crm_rbac_secoes.sql

DELETE FROM public.papel_secoes WHERE secao_chave LIKE 'crm/%';
DELETE FROM public.secoes_catalogo WHERE chave LIKE 'crm/%';

-- Desfaz o espaçamento da numeração.
UPDATE public.secoes_catalogo SET ordem = ordem / 10;
