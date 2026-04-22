-- Migration: cadastro de indicadores mensais (faturamento, investimento, ticket, freq)
-- Data: 2026-04-22

CREATE TABLE IF NOT EXISTS public.cliente_indicadores_mensais (
  id_cliente uuid NOT NULL REFERENCES public.clientes_formulario(id_cliente) ON DELETE CASCADE,
  ano int NOT NULL CHECK (ano BETWEEN 2020 AND 2100),
  mes int NOT NULL CHECK (mes BETWEEN 1 AND 12),
  investimento_trafego numeric NOT NULL DEFAULT 0,
  faturamento numeric NOT NULL DEFAULT 0,
  ticket_medio numeric NOT NULL DEFAULT 0,
  frequencia_compra numeric NOT NULL DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  PRIMARY KEY (id_cliente, ano, mes)
);

ALTER TABLE public.cliente_indicadores_mensais ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "indicadores_self_select" ON public.cliente_indicadores_mensais;
CREATE POLICY "indicadores_self_select" ON public.cliente_indicadores_mensais
  FOR SELECT USING (
    auth.uid() = id_cliente
    OR EXISTS (SELECT 1 FROM public.mentores WHERE email = auth.jwt()->>'email')
  );

DROP POLICY IF EXISTS "indicadores_self_write" ON public.cliente_indicadores_mensais;
CREATE POLICY "indicadores_self_write" ON public.cliente_indicadores_mensais
  FOR ALL USING (
    auth.uid() = id_cliente
    OR EXISTS (SELECT 1 FROM public.mentores WHERE email = auth.jwt()->>'email')
  ) WITH CHECK (
    auth.uid() = id_cliente
    OR EXISTS (SELECT 1 FROM public.mentores WHERE email = auth.jwt()->>'email')
  );

DROP TRIGGER IF EXISTS trg_indicadores_updated_at ON public.cliente_indicadores_mensais;
CREATE TRIGGER trg_indicadores_updated_at
  BEFORE UPDATE ON public.cliente_indicadores_mensais
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
