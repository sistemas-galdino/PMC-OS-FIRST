-- Tabela de ferramentas de IA exibidas na aba /ferramentas.
-- Cliente vê (RLS SELECT liberado para authenticated); admin cria/edita/remove
-- (RLS FOR ALL gated por existência em public.mentores via auth.jwt()->>'email').

CREATE TABLE IF NOT EXISTS public.ferramentas_ia (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nome text NOT NULL,
  subtitulo text,
  categoria text NOT NULL,
  preco text NOT NULL,
  descricao text NOT NULL,
  features text[] NOT NULL DEFAULT '{}',
  url text NOT NULL,
  ordem integer NOT NULL DEFAULT 0,
  ativo boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS ferramentas_ia_categoria_ordem_idx
  ON public.ferramentas_ia (categoria, ordem);

ALTER TABLE public.ferramentas_ia ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS ferramentas_ia_select ON public.ferramentas_ia;
CREATE POLICY ferramentas_ia_select
  ON public.ferramentas_ia FOR SELECT
  TO authenticated
  USING (true);

DROP POLICY IF EXISTS ferramentas_ia_admin_write ON public.ferramentas_ia;
CREATE POLICY ferramentas_ia_admin_write
  ON public.ferramentas_ia FOR ALL
  TO authenticated
  USING (EXISTS (SELECT 1 FROM public.mentores m WHERE m.email = (auth.jwt()->>'email')))
  WITH CHECK (EXISTS (SELECT 1 FROM public.mentores m WHERE m.email = (auth.jwt()->>'email')));

CREATE OR REPLACE FUNCTION public.ferramentas_ia_set_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at := now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS ferramentas_ia_updated_at ON public.ferramentas_ia;
CREATE TRIGGER ferramentas_ia_updated_at
  BEFORE UPDATE ON public.ferramentas_ia
  FOR EACH ROW EXECUTE FUNCTION public.ferramentas_ia_set_updated_at();
