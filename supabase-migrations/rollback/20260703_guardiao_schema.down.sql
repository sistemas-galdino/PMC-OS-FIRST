-- =========================================================
-- ROLLBACK de 20260703_guardiao_schema.sql
-- Desfaz schema + RLS + RPCs do "Perfil do Guardiao".
-- Ordem reversa: RPCs -> policies -> tabelas (filhas antes das pais).
-- (Nao ha triggers nem enums nativos criados por essa migration.)
-- Tudo com IF EXISTS. Drops de tabela levam junto policies/indices/constraints.
-- =========================================================

-- 1) RPCs (functions)
DROP FUNCTION IF EXISTS public.guardiao_get_invite_by_token(text);
DROP FUNCTION IF EXISTS public.guardiao_criar_convite(text);

-- 2) Policies (redundante com o DROP TABLE, mas explicito p/ ambientes parciais)
DROP POLICY IF EXISTS guardiao_assessment_results_owner_select ON public.guardiao_assessment_results;
DROP POLICY IF EXISTS guardiao_candidate_responses_owner_select ON public.guardiao_candidate_responses;
DROP POLICY IF EXISTS guardiao_invites_owner_delete ON public.guardiao_invites;
DROP POLICY IF EXISTS guardiao_invites_owner_update ON public.guardiao_invites;
DROP POLICY IF EXISTS guardiao_invites_owner_select ON public.guardiao_invites;
DROP POLICY IF EXISTS guardiao_question_options_public_read ON public.guardiao_question_options;
DROP POLICY IF EXISTS guardiao_questions_public_read ON public.guardiao_questions;
DROP POLICY IF EXISTS guardiao_assessments_public_read ON public.guardiao_assessments;

-- 3) Tabelas (ordem reversa das FKs: filhas -> pais)
DROP TABLE IF EXISTS public.guardiao_assessment_results;
DROP TABLE IF EXISTS public.guardiao_candidate_responses;
DROP TABLE IF EXISTS public.guardiao_invites;
DROP TABLE IF EXISTS public.guardiao_question_options;
DROP TABLE IF EXISTS public.guardiao_questions;
DROP TABLE IF EXISTS public.guardiao_assessments;
