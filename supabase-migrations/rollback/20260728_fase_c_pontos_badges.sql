-- Rollback — Onda 2, Fase C.
-- ATENÇÃO: pontos_mc, ranking_guardioes e sync_badges são CREATE OR REPLACE de
-- funções pré-existentes. Este rollback remove as badges e as funções NOVAS;
-- para voltar as três funções ao estado anterior, reaplique a migration
-- imediatamente anterior a esta (20260725_gatilho_outbox / 20260724_pontos_guardiao).
DELETE FROM public.cliente_badges WHERE badge_slug IN ('dia_1','dia_10','dia_50','dia_100','sem_1','sem_4');
DELETE FROM public.badges_catalogo WHERE slug IN ('dia_1','dia_10','dia_50','dia_100','sem_1','sem_4');
DROP FUNCTION IF EXISTS public.semanas_perfeitas(uuid);
DROP FUNCTION IF EXISTS public.dias_fechados(uuid);
