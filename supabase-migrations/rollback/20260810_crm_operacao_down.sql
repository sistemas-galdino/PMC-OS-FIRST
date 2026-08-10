-- Rollback de 20260810_crm_operacao.sql

ALTER TABLE public.cliente_atividades
  DROP CONSTRAINT IF EXISTS cliente_atividades_projeto_id_fkey;

DROP TABLE IF EXISTS public.crm_cs_config;
DROP TABLE IF EXISTS public.crm_manual;
DROP TABLE IF EXISTS public.crm_materiais;
DROP TABLE IF EXISTS public.crm_rotina_execucoes;
DROP TABLE IF EXISTS public.crm_rotinas;
-- gargalos referencia projetos e vice-versa: solta a FK antes de dropar.
ALTER TABLE IF EXISTS public.crm_gargalos
  DROP CONSTRAINT IF EXISTS crm_gargalos_projeto_id_fkey;
DROP TABLE IF EXISTS public.crm_projetos;
DROP TABLE IF EXISTS public.crm_gargalos;
