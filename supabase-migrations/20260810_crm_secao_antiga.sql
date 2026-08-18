-- CRM — aposenta a seção RBAC da aba antiga.
--
-- A rota `/crm` (web/src/pages/crm.tsx) saiu: quem faz o trabalho agora são as
-- 10 abas `crm/*` criadas em 20260810_crm_rbac_secoes.sql. A chave `crm`
-- continuava no catálogo, aparecendo na tela de permissões como um item que não
-- abre tela nenhuma.
--
-- Rodar DEPOIS do deploy do frontend sem a rota `/crm`. Se rodar antes, quem
-- estiver com a tela velha aberta perde o acesso a ela — o que é inofensivo,
-- mas confunde.
--
-- Rollback: rollback/20260810_crm_secao_antiga_down.sql

-- A FK de papel_secoes/mentor_secao_override não é ON DELETE CASCADE, então as
-- referências saem primeiro.
DELETE FROM public.mentor_secao_override WHERE secao_chave = 'crm';
DELETE FROM public.papel_secoes          WHERE secao_chave = 'crm';
DELETE FROM public.secoes_catalogo       WHERE chave = 'crm';
