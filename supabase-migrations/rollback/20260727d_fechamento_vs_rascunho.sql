-- Rollback — remove a separação rascunho/fechado.
-- ATENÇÃO: dropar fechado_em quebra o streak_guardiao (que passa a olhar essa
-- coluna). Reaplique 20260727_meu_dia_fundacao para restaurar a versão anterior
-- da função, ou reaplique este forward. Só use ciente do impacto.
DROP INDEX IF EXISTS public.idx_dia_fech_fechados;
ALTER TABLE public.metodo_dia_fechamentos DROP COLUMN IF EXISTS fechado_em;
