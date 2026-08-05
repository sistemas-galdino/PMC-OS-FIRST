-- Rollback — Onda 2, Fase A.
DROP FUNCTION IF EXISTS public.meu_streak(date);
DROP FUNCTION IF EXISTS public.streak_guardiao(uuid, date);
DROP TABLE IF EXISTS public.metodo_dia_fechamentos CASCADE;
DROP INDEX IF EXISTS public.idx_metodo_tarefas_responsavel;
ALTER TABLE public.metodo_tarefas DROP CONSTRAINT IF EXISTS metodo_tarefas_responsavel_mesma_empresa;
ALTER TABLE public.metodo_tarefas DROP COLUMN IF EXISTS responsavel_id;
ALTER TABLE public.cliente_colaboradores DROP CONSTRAINT IF EXISTS cliente_colaboradores_id_cliente_uk;
