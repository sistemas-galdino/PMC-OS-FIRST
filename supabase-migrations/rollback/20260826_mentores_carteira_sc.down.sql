-- Rollback de 20260826_mentores_carteira_sc.sql.
--
-- Dropar a coluna leva junto os vínculos preenchidos na tela. Sem perda real:
-- o backfill é dedutível de `mentores.nome` e o front volta a não usar o campo.

ALTER TABLE public.mentores
  DROP COLUMN IF EXISTS carteira_sc;
