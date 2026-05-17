-- Central de Atendimentos — schema (Fase 1)
-- Extende as 3 tabelas de reunião com campos de agendamento,
-- cria catálogo de consultores + disponibilidade, e view unificada.

CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- 1. reunioes_galdino — adiciona campos
-- ============================================
ALTER TABLE public.reunioes_galdino
  ADD COLUMN IF NOT EXISTS cliente_email text,
  ADD COLUMN IF NOT EXISTS cliente_telefone text,
  ADD COLUMN IF NOT EXISTS link_meet text,
  ADD COLUMN IF NOT EXISTS duracao_minutos int,
  ADD COLUMN IF NOT EXISTS status_agendamento text,
  ADD COLUMN IF NOT EXISTS criado_via text,
  ADD COLUMN IF NOT EXISTS updated_at timestamptz,
  ADD COLUMN IF NOT EXISTS observacoes text;

ALTER TABLE public.reunioes_galdino
  DROP CONSTRAINT IF EXISTS reunioes_galdino_status_agendamento_check;
ALTER TABLE public.reunioes_galdino
  ADD CONSTRAINT reunioes_galdino_status_agendamento_check
  CHECK (status_agendamento IS NULL OR status_agendamento IN ('pendente_sync','confirmado','cancelado','realizado'));

ALTER TABLE public.reunioes_galdino
  DROP CONSTRAINT IF EXISTS reunioes_galdino_criado_via_check;
ALTER TABLE public.reunioes_galdino
  ADD CONSTRAINT reunioes_galdino_criado_via_check
  CHECK (criado_via IS NULL OR criado_via IN ('agendamento_publico','sync_google'));

DROP TRIGGER IF EXISTS reunioes_galdino_updated_at ON public.reunioes_galdino;
CREATE TRIGGER reunioes_galdino_updated_at
  BEFORE UPDATE ON public.reunioes_galdino
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ============================================
-- 2. reunioes_mentoria_new — adiciona campos
-- ============================================
ALTER TABLE public.reunioes_mentoria_new
  ADD COLUMN IF NOT EXISTS cliente_email text,
  ADD COLUMN IF NOT EXISTS cliente_telefone text,
  ADD COLUMN IF NOT EXISTS link_meet text,
  ADD COLUMN IF NOT EXISTS duracao_minutos int,
  ADD COLUMN IF NOT EXISTS status_agendamento text,
  ADD COLUMN IF NOT EXISTS criado_via text,
  ADD COLUMN IF NOT EXISTS updated_at timestamptz,
  ADD COLUMN IF NOT EXISTS observacoes text;

ALTER TABLE public.reunioes_mentoria_new
  DROP CONSTRAINT IF EXISTS reunioes_mentoria_new_status_agendamento_check;
ALTER TABLE public.reunioes_mentoria_new
  ADD CONSTRAINT reunioes_mentoria_new_status_agendamento_check
  CHECK (status_agendamento IS NULL OR status_agendamento IN ('pendente_sync','confirmado','cancelado','realizado'));

ALTER TABLE public.reunioes_mentoria_new
  DROP CONSTRAINT IF EXISTS reunioes_mentoria_new_criado_via_check;
ALTER TABLE public.reunioes_mentoria_new
  ADD CONSTRAINT reunioes_mentoria_new_criado_via_check
  CHECK (criado_via IS NULL OR criado_via IN ('agendamento_publico','sync_google'));

DROP TRIGGER IF EXISTS reunioes_mentoria_new_updated_at ON public.reunioes_mentoria_new;
CREATE TRIGGER reunioes_mentoria_new_updated_at
  BEFORE UPDATE ON public.reunioes_mentoria_new
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ============================================
-- 3. reunioes_blackcrm — adiciona campos
-- ============================================
ALTER TABLE public.reunioes_blackcrm
  ADD COLUMN IF NOT EXISTS pessoa text,
  ADD COLUMN IF NOT EXISTS cliente_email text,
  ADD COLUMN IF NOT EXISTS cliente_telefone text,
  ADD COLUMN IF NOT EXISTS link_meet text,
  ADD COLUMN IF NOT EXISTS duracao_minutos int,
  ADD COLUMN IF NOT EXISTS status_agendamento text,
  ADD COLUMN IF NOT EXISTS criado_via text,
  ADD COLUMN IF NOT EXISTS updated_at timestamptz;

ALTER TABLE public.reunioes_blackcrm
  DROP CONSTRAINT IF EXISTS reunioes_blackcrm_status_agendamento_check;
ALTER TABLE public.reunioes_blackcrm
  ADD CONSTRAINT reunioes_blackcrm_status_agendamento_check
  CHECK (status_agendamento IS NULL OR status_agendamento IN ('pendente_sync','confirmado','cancelado','realizado'));

ALTER TABLE public.reunioes_blackcrm
  DROP CONSTRAINT IF EXISTS reunioes_blackcrm_criado_via_check;
ALTER TABLE public.reunioes_blackcrm
  ADD CONSTRAINT reunioes_blackcrm_criado_via_check
  CHECK (criado_via IS NULL OR criado_via IN ('agendamento_publico','sync_google'));

DROP TRIGGER IF EXISTS reunioes_blackcrm_updated_at ON public.reunioes_blackcrm;
CREATE TRIGGER reunioes_blackcrm_updated_at
  BEFORE UPDATE ON public.reunioes_blackcrm
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ============================================
-- 4. Nova tabela: consultores_atendimento
-- ============================================
CREATE TABLE IF NOT EXISTS public.consultores_atendimento (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nome text NOT NULL,
  slug text UNIQUE NOT NULL,
  email text,
  email_calendar text NOT NULL,
  tabela_destino text NOT NULL CHECK (tabela_destino IN ('reunioes_galdino','reunioes_mentoria_new','reunioes_blackcrm')),
  tipo_reuniao text CHECK (tipo_reuniao IS NULL OR tipo_reuniao IN ('implementacao','tutoria')),
  especialidade text,
  descricao text,
  avatar_url text,
  accent text NOT NULL DEFAULT 'primary',
  duracao_padrao_minutos int NOT NULL DEFAULT 60,
  ativo boolean NOT NULL DEFAULT true,
  ordem int NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS consultores_atendimento_slug_idx ON public.consultores_atendimento(slug);
CREATE INDEX IF NOT EXISTS consultores_atendimento_ativo_idx ON public.consultores_atendimento(ativo) WHERE ativo;
CREATE INDEX IF NOT EXISTS consultores_atendimento_ordem_idx ON public.consultores_atendimento(ordem);

DROP TRIGGER IF EXISTS consultores_atendimento_updated_at ON public.consultores_atendimento;
CREATE TRIGGER consultores_atendimento_updated_at
  BEFORE UPDATE ON public.consultores_atendimento
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

ALTER TABLE public.consultores_atendimento ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS consultores_atendimento_select_public ON public.consultores_atendimento;
CREATE POLICY consultores_atendimento_select_public ON public.consultores_atendimento
  FOR SELECT TO anon, authenticated USING (ativo OR is_admin());

DROP POLICY IF EXISTS consultores_atendimento_modify_admin ON public.consultores_atendimento;
CREATE POLICY consultores_atendimento_modify_admin ON public.consultores_atendimento
  FOR ALL TO authenticated
  USING (is_admin())
  WITH CHECK (is_admin());

-- ============================================
-- 5. Nova tabela: consultores_disponibilidade
-- ============================================
CREATE TABLE IF NOT EXISTS public.consultores_disponibilidade (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  consultor_id uuid NOT NULL REFERENCES public.consultores_atendimento(id) ON DELETE CASCADE,
  dia_semana int NOT NULL CHECK (dia_semana BETWEEN 0 AND 6),
  hora_inicio time NOT NULL,
  hora_fim time NOT NULL CHECK (hora_fim > hora_inicio),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS consultores_disponibilidade_consultor_idx
  ON public.consultores_disponibilidade(consultor_id, dia_semana);

ALTER TABLE public.consultores_disponibilidade ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS consultores_disponibilidade_select_public ON public.consultores_disponibilidade;
CREATE POLICY consultores_disponibilidade_select_public ON public.consultores_disponibilidade
  FOR SELECT TO anon, authenticated USING (true);

DROP POLICY IF EXISTS consultores_disponibilidade_modify_admin ON public.consultores_disponibilidade;
CREATE POLICY consultores_disponibilidade_modify_admin ON public.consultores_disponibilidade
  FOR ALL TO authenticated
  USING (is_admin())
  WITH CHECK (is_admin());

-- ============================================
-- 6. View unificada: agendamentos_central
-- ============================================
DROP VIEW IF EXISTS public.agendamentos_central;
CREATE VIEW public.agendamentos_central AS
SELECT
  rg.id_unico::text AS id_unico,
  'galdino'::text AS origem,
  rg.id_reuniao,
  rg.data_reuniao,
  rg.horario,
  'Galdino'::text AS consultor_nome,
  rg.cliente_email,
  rg.pessoa AS cliente_nome,
  rg.empresa,
  rg.status_agendamento,
  rg.duracao_minutos,
  rg.link_meet,
  rg.link_gravacao,
  rg.link_geminidoc,
  rg.cliente_telefone,
  rg.id_cliente::text AS id_cliente,
  rg.codigo_cliente,
  rg.observacoes,
  rg.cliente_compareceu,
  rg.created_at AS criado_em,
  rg.updated_at AS atualizado_em
FROM public.reunioes_galdino rg
WHERE rg.criado_via = 'agendamento_publico'

UNION ALL

SELECT
  rm.id_unico::text AS id_unico,
  'mentoria'::text AS origem,
  rm.id_reuniao,
  rm.data_reuniao,
  rm.horario,
  rm.mentor AS consultor_nome,
  rm.cliente_email,
  rm.pessoa AS cliente_nome,
  rm.empresa,
  rm.status_agendamento,
  rm.duracao_minutos,
  rm.link_meet,
  rm.link_gravacao,
  rm.link_geminidoc,
  rm.cliente_telefone,
  rm.id_cliente::text AS id_cliente,
  rm.codigo_cliente,
  rm.observacoes,
  rm.cliente_compareceu,
  rm.created_at AS criado_em,
  rm.updated_at AS atualizado_em
FROM public.reunioes_mentoria_new rm
WHERE rm.criado_via = 'agendamento_publico'

UNION ALL

SELECT
  rb.id_unico AS id_unico,
  'blackcrm'::text AS origem,
  rb.id_reuniao,
  CASE WHEN rb.data_reuniao ~ '^\d{4}-\d{2}-\d{2}' THEN rb.data_reuniao::date ELSE NULL END AS data_reuniao,
  CASE WHEN rb.horario ~ '^\d{1,2}:\d{2}(:\d{2})?$' THEN rb.horario::time ELSE NULL END AS horario,
  rb.responsavel AS consultor_nome,
  rb.cliente_email,
  rb.pessoa AS cliente_nome,
  rb.empresa,
  rb.status_agendamento,
  rb.duracao_minutos,
  rb.link_meet,
  rb.link_gravacao,
  rb.link_geminidoc,
  rb.cliente_telefone,
  rb.id_cliente,
  rb.codigo_cliente::int AS codigo_cliente,
  rb.observacoes,
  rb.cliente_compareceu,
  CASE WHEN rb.created_at ~ '^\d{4}' THEN rb.created_at::timestamptz ELSE NULL END AS criado_em,
  rb.updated_at AS atualizado_em
FROM public.reunioes_blackcrm rb
WHERE rb.criado_via = 'agendamento_publico';

GRANT SELECT ON public.agendamentos_central TO authenticated;
