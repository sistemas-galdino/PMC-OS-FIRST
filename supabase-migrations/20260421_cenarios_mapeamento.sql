-- Migration: adicionar campos de Cenários em cliente_metas + tabela cliente_objetivos_programa
-- Data: 2026-04-21

-- 1. Novas colunas em cliente_metas pros Cenários (Cenário Atual + Cenário Desejado)
ALTER TABLE public.cliente_metas
  ADD COLUMN IF NOT EXISTS numero_funcionarios int DEFAULT 0,
  ADD COLUMN IF NOT EXISTS numero_gestores int DEFAULT 0,
  ADD COLUMN IF NOT EXISTS principais_desafios text,
  ADD COLUMN IF NOT EXISTS como_ajudar text,
  ADD COLUMN IF NOT EXISTS resultados_esperados text,
  ADD COLUMN IF NOT EXISTS entregas_decisivas text;

-- 2. Tabela de Objetivos do Programa (um registro por (cliente, objetivo))
CREATE TABLE IF NOT EXISTS public.cliente_objetivos_programa (
  id_cliente uuid NOT NULL REFERENCES public.clientes_entrada_new(id_cliente) ON DELETE CASCADE,
  objetivo_key text NOT NULL,
  prioridade text NOT NULL DEFAULT 'nao_prioridade'
    CHECK (prioridade IN ('alta','media','baixa','nao_prioridade')),
  observacoes text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  PRIMARY KEY (id_cliente, objetivo_key)
);

ALTER TABLE public.cliente_objetivos_programa ENABLE ROW LEVEL SECURITY;

-- RLS: cliente vê/edita só os próprios registros; mentor vê todos
DROP POLICY IF EXISTS "cliente_objetivos_self_select" ON public.cliente_objetivos_programa;
CREATE POLICY "cliente_objetivos_self_select" ON public.cliente_objetivos_programa
  FOR SELECT
  USING (
    auth.uid() = id_cliente
    OR EXISTS (SELECT 1 FROM public.mentores WHERE email = auth.jwt()->>'email')
  );

DROP POLICY IF EXISTS "cliente_objetivos_self_write" ON public.cliente_objetivos_programa;
CREATE POLICY "cliente_objetivos_self_write" ON public.cliente_objetivos_programa
  FOR ALL
  USING (
    auth.uid() = id_cliente
    OR EXISTS (SELECT 1 FROM public.mentores WHERE email = auth.jwt()->>'email')
  )
  WITH CHECK (
    auth.uid() = id_cliente
    OR EXISTS (SELECT 1 FROM public.mentores WHERE email = auth.jwt()->>'email')
  );

-- Trigger pra manter updated_at
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_cliente_objetivos_updated_at ON public.cliente_objetivos_programa;
CREATE TRIGGER trg_cliente_objetivos_updated_at
  BEFORE UPDATE ON public.cliente_objetivos_programa
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();
