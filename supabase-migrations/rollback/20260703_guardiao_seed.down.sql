-- =========================================================
-- ROLLBACK de 20260703_guardiao_seed.sql
-- Remove SOMENTE o conteudo semeado (banco de perguntas), mantendo o schema.
-- Ordem reversa das FKs: options -> questions -> assessments.
-- (options/questions tambem cairiam via ON DELETE CASCADE, mas explicitamos.)
--
-- ATENCAO: so rode isso se NAO houver respostas de candidatos apontando para
-- esses questions/options. guardiao_candidate_responses referencia question_id
-- (sem cascade) e option_id (sem cascade) -> o DELETE abaixo falhara se houver
-- respostas gravadas. Nesse caso, limpe primeiro os invites/respostas ou use o
-- rollback de schema completo.
-- =========================================================

BEGIN;

DELETE FROM public.guardiao_question_options
WHERE question_id IN (
  SELECT id FROM public.guardiao_questions
  WHERE assessment_id IN (
    SELECT id FROM public.guardiao_assessments
    WHERE type IN ('interno','externo')
  )
);

DELETE FROM public.guardiao_questions
WHERE assessment_id IN (
  SELECT id FROM public.guardiao_assessments
  WHERE type IN ('interno','externo')
);

DELETE FROM public.guardiao_assessments
WHERE type IN ('interno','externo');

COMMIT;
