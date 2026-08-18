-- Rollback — nicho nos Estudos de Caso.
DROP INDEX IF EXISTS public.idx_estudos_caso_nicho;
ALTER TABLE public.conhecimento_estudos_caso DROP COLUMN IF EXISTS nicho;
