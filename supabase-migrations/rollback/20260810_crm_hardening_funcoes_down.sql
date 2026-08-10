-- Rollback de 20260810_crm_hardening_funcoes.sql
-- Só desfaz o hardening; as funções em si são removidas pelos rollbacks das
-- migrations que as criaram (crm_atividades_extensao, crm_atendimento,
-- crm_reunioes_view, crm_clientes_colunas).

GRANT EXECUTE ON FUNCTION public.crm_meu_nome() TO anon;
