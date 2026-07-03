-- =========================================================
-- Perfil do Guardiao (Fase 1 / Dados) — schema nativo no PMC OS
-- Porta 6 tabelas do sistema fonte (projeto nzbbimjlqkdzxwxckwfc)
-- para o PMC OS (hqczwextifessaztyyyk), escopadas por id_cliente.
-- NAO porta profiles/user_roles/companies/company_config.
--
-- Convencoes seguidas do PMC (observadas nas migrations existentes):
--  * SEM enums nativos: o PMC nao usa `CREATE TYPE` em lugar nenhum —
--    tudo e `text` + `CHECK (col IN (...))` (ver 20260508_clientes_moeda.sql,
--    20260508_cliente_atividades.sql). Seguimos o mesmo estilo. Bonus: o CHECK
--    de `type`/`pillar` inclui exatamente os valores presentes no seed vivo,
--    entao o seed nao quebra (a fonte usa type IN cenario/concordancia/texto_livre,
--    nao multipla_escolha).
--  * id_cliente SEM FK, apenas com indice (mesmo padrao de cliente_atividades /
--    cliente_cancelamento: clientes_entrada_new.id_cliente nao tem UNIQUE, PK e
--    id_entrada). id_cliente guarda o auth.uid() do dono/cliente.
--  * RLS via is_admin() + auth.uid() (ver 20260427_rls_lockdown.sql).
--  * RPC SECURITY DEFINER + SET search_path=public + GRANT EXECUTE TO authenticated
--    (ver 20260508_clientes_moeda.sql / update_minha_moeda).
--  * token: mesmo default da fonte — replace(gen_random_uuid()::text,'-','').
--
-- Leitura por token (formulario publico anonimo): NAO abrimos policy anon
-- USING(true) na tabela guardiao_invites (seria vazamento de todos os convites).
-- A leitura anonima por token e feita por:
--   (a) a Edge Function guardiao-submit (service role, bypassa RLS), e
--   (b) a RPC SECURITY DEFINER guardiao_get_invite_by_token(_token) (GRANT anon),
--       que so devolve UM convite pelo token e nunca expira/vazado.
-- =========================================================

-- ---------------------------------------------------------
-- 1) guardiao_assessments  (leitura publica)
-- ---------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.guardiao_assessments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  type text NOT NULL UNIQUE
    CHECK (type IN ('interno','externo')),
  title text NOT NULL,
  description text,
  version int NOT NULL DEFAULT 1,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.guardiao_assessments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS guardiao_assessments_public_read ON public.guardiao_assessments;
CREATE POLICY guardiao_assessments_public_read ON public.guardiao_assessments
  FOR SELECT TO anon, authenticated USING (true);

-- ---------------------------------------------------------
-- 2) guardiao_questions  (leitura publica)
-- ---------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.guardiao_questions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  assessment_id uuid NOT NULL
    REFERENCES public.guardiao_assessments(id) ON DELETE CASCADE,
  code text NOT NULL,
  pillar text NOT NULL
    CHECK (pillar IN (
      'curiosidade_implementacao',
      'conhecimento_ia',
      'visao_estrategica',
      'protagonismo_engajamento',
      'etica_governanca',
      'adaptabilidade_resiliencia'
    )),
  type text NOT NULL
    CHECK (type IN ('cenario','concordancia','texto_livre','multipla_escolha')),
  prompt text NOT NULL,
  scenario_label text,
  order_index int NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (assessment_id, code, order_index)
);

CREATE INDEX IF NOT EXISTS guardiao_questions_assessment_idx
  ON public.guardiao_questions(assessment_id);

ALTER TABLE public.guardiao_questions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS guardiao_questions_public_read ON public.guardiao_questions;
CREATE POLICY guardiao_questions_public_read ON public.guardiao_questions
  FOR SELECT TO anon, authenticated USING (true);

-- ---------------------------------------------------------
-- 3) guardiao_question_options  (leitura publica)
-- ---------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.guardiao_question_options (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  question_id uuid NOT NULL
    REFERENCES public.guardiao_questions(id) ON DELETE CASCADE,
  letter text,
  label text NOT NULL,
  points int NOT NULL CHECK (points BETWEEN 0 AND 5),
  disc_tags text[] NOT NULL DEFAULT '{}',
  order_index int NOT NULL
);

CREATE INDEX IF NOT EXISTS guardiao_question_options_question_idx
  ON public.guardiao_question_options(question_id);

ALTER TABLE public.guardiao_question_options ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS guardiao_question_options_public_read ON public.guardiao_question_options;
CREATE POLICY guardiao_question_options_public_read ON public.guardiao_question_options
  FOR SELECT TO anon, authenticated USING (true);

-- ---------------------------------------------------------
-- 4) guardiao_invites  (por cliente / admin)
-- ---------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.guardiao_invites (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  id_cliente uuid NOT NULL,                       -- dono do convite = auth.uid() (sem FK, padrao cliente_*)
  assessment_id uuid NOT NULL
    REFERENCES public.guardiao_assessments(id),
  token text NOT NULL UNIQUE
    DEFAULT replace(gen_random_uuid()::text, '-', ''),
  candidate_name text,
  candidate_email text,
  candidate_whatsapp text,
  status text NOT NULL DEFAULT 'pendente'
    CHECK (status IN ('pendente','concluido')),
  stage text
    CHECK (stage IS NULL OR stage IN (
      'reprovado_teste','aprovado_teste','envio_case',
      'entrevista','negociacao','contratado_guardiao'
    )),
  expires_at timestamptz NOT NULL DEFAULT (now() + interval '30 days'),
  completed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS guardiao_invites_id_cliente_idx
  ON public.guardiao_invites(id_cliente);
CREATE INDEX IF NOT EXISTS guardiao_invites_token_idx
  ON public.guardiao_invites(token);
CREATE INDEX IF NOT EXISTS guardiao_invites_assessment_idx
  ON public.guardiao_invites(assessment_id);

ALTER TABLE public.guardiao_invites ENABLE ROW LEVEL SECURITY;

-- Dono (cliente) ou admin: SELECT / UPDATE / DELETE. INSERT so via RPC guardiao_criar_convite.
DROP POLICY IF EXISTS guardiao_invites_owner_select ON public.guardiao_invites;
CREATE POLICY guardiao_invites_owner_select ON public.guardiao_invites
  FOR SELECT TO authenticated
  USING (id_cliente = auth.uid() OR is_admin());

DROP POLICY IF EXISTS guardiao_invites_owner_update ON public.guardiao_invites;
CREATE POLICY guardiao_invites_owner_update ON public.guardiao_invites
  FOR UPDATE TO authenticated
  USING (id_cliente = auth.uid() OR is_admin())
  WITH CHECK (id_cliente = auth.uid() OR is_admin());

DROP POLICY IF EXISTS guardiao_invites_owner_delete ON public.guardiao_invites;
CREATE POLICY guardiao_invites_owner_delete ON public.guardiao_invites
  FOR DELETE TO authenticated
  USING (id_cliente = auth.uid() OR is_admin());
-- NOTA: sem policy de INSERT/anon. Criacao via RPC (SECURITY DEFINER) abaixo;
-- leitura anonima por token via Edge Function (service role) ou RPC get_invite_by_token.

-- ---------------------------------------------------------
-- 5) guardiao_candidate_responses  (leitura do dono; escrita so service role)
-- ---------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.guardiao_candidate_responses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  invite_id uuid NOT NULL
    REFERENCES public.guardiao_invites(id) ON DELETE CASCADE,
  question_id uuid NOT NULL
    REFERENCES public.guardiao_questions(id),
  option_id uuid
    REFERENCES public.guardiao_question_options(id),
  text_answer text,
  points int NOT NULL DEFAULT 0,
  disc_tags text[] NOT NULL DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (invite_id, question_id)
);

CREATE INDEX IF NOT EXISTS guardiao_candidate_responses_invite_idx
  ON public.guardiao_candidate_responses(invite_id);

ALTER TABLE public.guardiao_candidate_responses ENABLE ROW LEVEL SECURITY;

-- Dono do convite (ou admin) le. Escrita: apenas service role (Edge Function),
-- que bypassa RLS — por isso NAO ha policy de INSERT/UPDATE/DELETE.
DROP POLICY IF EXISTS guardiao_candidate_responses_owner_select ON public.guardiao_candidate_responses;
CREATE POLICY guardiao_candidate_responses_owner_select ON public.guardiao_candidate_responses
  FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.guardiao_invites i
    WHERE i.id = invite_id
      AND (i.id_cliente = auth.uid() OR is_admin())
  ));

-- ---------------------------------------------------------
-- 6) guardiao_assessment_results  (leitura do dono; escrita so service role)
-- ---------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.guardiao_assessment_results (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  invite_id uuid NOT NULL UNIQUE
    REFERENCES public.guardiao_invites(id) ON DELETE CASCADE,
  total_points int NOT NULL,
  max_points int NOT NULL,
  score_pct numeric(5,2) NOT NULL,
  classification text NOT NULL,
  disc_dominant text NOT NULL,
  disc_breakdown jsonb NOT NULL,
  pillar_scores jsonb NOT NULL,
  ai_tools_text text,
  computed_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS guardiao_assessment_results_invite_idx
  ON public.guardiao_assessment_results(invite_id);

ALTER TABLE public.guardiao_assessment_results ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS guardiao_assessment_results_owner_select ON public.guardiao_assessment_results;
CREATE POLICY guardiao_assessment_results_owner_select ON public.guardiao_assessment_results
  FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.guardiao_invites i
    WHERE i.id = invite_id
      AND (i.id_cliente = auth.uid() OR is_admin())
  ));

-- =========================================================
-- RPC: criar convite (dono = auth.uid()). Espelha update_minha_moeda.
-- =========================================================
CREATE OR REPLACE FUNCTION public.guardiao_criar_convite(p_type text)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_assessment_id uuid;
  v_token text;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'nao autenticado';
  END IF;
  IF p_type NOT IN ('interno','externo') THEN
    RAISE EXCEPTION 'tipo de avaliacao invalido: %', p_type;
  END IF;

  SELECT id INTO v_assessment_id
  FROM public.guardiao_assessments
  WHERE type = p_type
  ORDER BY version DESC
  LIMIT 1;

  IF v_assessment_id IS NULL THEN
    RAISE EXCEPTION 'assessment nao encontrado para o tipo: %', p_type;
  END IF;

  INSERT INTO public.guardiao_invites (id_cliente, assessment_id)
  VALUES (auth.uid(), v_assessment_id)
  RETURNING token INTO v_token;

  RETURN v_token;
END;
$$;

GRANT EXECUTE ON FUNCTION public.guardiao_criar_convite(text) TO authenticated;

-- =========================================================
-- RPC: leitura anonima do convite por token (para o formulario publico).
-- Espelha get_invite_by_token da fonte. Devolve so UM convite valido; sem
-- expor a tabela ao anon. So retorna se ainda nao expirou.
-- =========================================================
CREATE OR REPLACE FUNCTION public.guardiao_get_invite_by_token(_token text)
RETURNS TABLE (
  id uuid,
  assessment_id uuid,
  assessment_type text,
  candidate_name text,
  candidate_email text,
  candidate_whatsapp text,
  status text,
  expires_at timestamptz,
  completed_at timestamptz
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT i.id, i.assessment_id, a.type, i.candidate_name, i.candidate_email,
         i.candidate_whatsapp, i.status, i.expires_at, i.completed_at
  FROM public.guardiao_invites i
  JOIN public.guardiao_assessments a ON a.id = i.assessment_id
  WHERE i.token = _token
    AND i.expires_at > now();
$$;

GRANT EXECUTE ON FUNCTION public.guardiao_get_invite_by_token(text) TO anon, authenticated;
