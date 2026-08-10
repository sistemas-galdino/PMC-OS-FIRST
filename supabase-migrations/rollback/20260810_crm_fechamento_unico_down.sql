-- Rollback de 20260810_crm_fechamento_unico.sql
-- As duplicatas apagadas não voltam (nem deveriam).

DROP INDEX IF EXISTS public.crm_atividade_checkpoint_unica;
