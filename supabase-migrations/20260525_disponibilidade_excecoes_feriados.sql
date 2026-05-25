-- ============================================================
-- Exceções por data (consultor) + Feriados globais
-- ============================================================
-- Estende o modelo de disponibilidade: hoje só temos janelas
-- semanais. Esta migration adiciona duas camadas adicionais:
--   1) consultores_excecoes  → override por consultor numa data
--      específica (bloqueio ou atendimento extra)
--   2) feriados              → bloqueio global para todos
-- ============================================================

-- ============================================
-- 1. consultores_excecoes
-- ============================================
CREATE TABLE IF NOT EXISTS public.consultores_excecoes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  consultor_id uuid NOT NULL
    REFERENCES public.consultores_atendimento(id) ON DELETE CASCADE,
  data date NOT NULL,
  tipo text NOT NULL CHECK (tipo IN ('bloqueio', 'extra')),
  hora_inicio time,
  hora_fim time,
  motivo text,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT consultores_excecoes_horario_valido CHECK (
    (
      tipo = 'bloqueio' AND (
        (hora_inicio IS NULL AND hora_fim IS NULL)
        OR (hora_inicio IS NOT NULL AND hora_fim IS NOT NULL AND hora_fim > hora_inicio)
      )
    )
    OR (
      tipo = 'extra'
        AND hora_inicio IS NOT NULL
        AND hora_fim IS NOT NULL
        AND hora_fim > hora_inicio
    )
  )
);

CREATE INDEX IF NOT EXISTS consultores_excecoes_consultor_data_idx
  ON public.consultores_excecoes(consultor_id, data);

ALTER TABLE public.consultores_excecoes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS consultores_excecoes_select_public ON public.consultores_excecoes;
CREATE POLICY consultores_excecoes_select_public ON public.consultores_excecoes
  FOR SELECT TO anon, authenticated USING (true);

DROP POLICY IF EXISTS consultores_excecoes_modify_admin ON public.consultores_excecoes;
CREATE POLICY consultores_excecoes_modify_admin ON public.consultores_excecoes
  FOR ALL TO authenticated
  USING (is_admin())
  WITH CHECK (is_admin());

-- ============================================
-- 2. feriados (globais)
-- ============================================
CREATE TABLE IF NOT EXISTS public.feriados (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  data date NOT NULL UNIQUE,
  nome text NOT NULL,
  tipo text NOT NULL DEFAULT 'customizado' CHECK (tipo IN ('nacional', 'customizado')),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS feriados_data_idx ON public.feriados(data);

ALTER TABLE public.feriados ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS feriados_select_public ON public.feriados;
CREATE POLICY feriados_select_public ON public.feriados
  FOR SELECT TO anon, authenticated USING (true);

DROP POLICY IF EXISTS feriados_modify_admin ON public.feriados;
CREATE POLICY feriados_modify_admin ON public.feriados
  FOR ALL TO authenticated
  USING (is_admin())
  WITH CHECK (is_admin());
