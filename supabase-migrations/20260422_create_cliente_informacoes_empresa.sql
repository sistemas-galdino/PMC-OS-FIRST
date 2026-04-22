-- Tabela dedicada pra "Informações da Empresa" do cliente.
-- Armazena: nome do negócio, data de entrada, data de boas-vindas, site, instagram.
-- 1 linha por cliente (PK = id_cliente). Cliente lê/escreve própria linha; mentores (admin) leem/escrevem todas.

CREATE TABLE IF NOT EXISTS public.cliente_informacoes_empresa (
  id_cliente uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  nome_negocio text,
  data_entrada date,
  data_boas_vindas date,
  site text,
  instagram text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.cliente_informacoes_empresa ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "self_or_admin_select" ON public.cliente_informacoes_empresa;
CREATE POLICY "self_or_admin_select"
  ON public.cliente_informacoes_empresa
  FOR SELECT
  USING (
    auth.uid() = id_cliente
    OR EXISTS (SELECT 1 FROM public.mentores m WHERE m.email = auth.jwt()->>'email')
  );

DROP POLICY IF EXISTS "self_or_admin_write" ON public.cliente_informacoes_empresa;
CREATE POLICY "self_or_admin_write"
  ON public.cliente_informacoes_empresa
  FOR ALL
  USING (
    auth.uid() = id_cliente
    OR EXISTS (SELECT 1 FROM public.mentores m WHERE m.email = auth.jwt()->>'email')
  )
  WITH CHECK (
    auth.uid() = id_cliente
    OR EXISTS (SELECT 1 FROM public.mentores m WHERE m.email = auth.jwt()->>'email')
  );

CREATE OR REPLACE FUNCTION public.set_cliente_informacoes_empresa_updated_at()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at := now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_cliente_informacoes_empresa_updated_at ON public.cliente_informacoes_empresa;
CREATE TRIGGER trg_cliente_informacoes_empresa_updated_at
  BEFORE UPDATE ON public.cliente_informacoes_empresa
  FOR EACH ROW EXECUTE FUNCTION public.set_cliente_informacoes_empresa_updated_at();
