-- Aba admin "Roadmap de Sistemas": planejamento e acompanhamento dos sistemas/IA do PMC.
-- roadmap_projeto: tabela singleton com a meta do projeto (1 linha).
-- roadmap_itens: itens/funcionalidades do roadmap.
-- Acesso somente admin (is_admin()), mesmo padrão de cliente_atividades.

CREATE TABLE IF NOT EXISTS roadmap_projeto (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  visao_geral text,
  objetivo_estrategico text,
  status_geral text NOT NULL DEFAULT 'em_andamento'
    CHECK (status_geral IN ('planejamento','em_andamento','pausado','concluido')),
  proxima_entrega_data date,
  proxima_entrega_descricao text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS roadmap_itens (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nome text NOT NULL,
  valor text NOT NULL DEFAULT 'medio'
    CHECK (valor IN ('alto','medio','baixo')),
  complexidade text NOT NULL DEFAULT 'media'
    CHECK (complexidade IN ('alta','media','baixa')),
  fase text NOT NULL DEFAULT 'ideacao'
    CHECK (fase IN ('ideacao','planejamento','desenvolvimento','testes','implantacao','concluido')),
  prazo text,
  responsavel text,
  observacoes text,
  marco_kickoff boolean NOT NULL DEFAULT false,
  marco_kickoff_data date,
  marco_mvp boolean NOT NULL DEFAULT false,
  marco_mvp_data date,
  marco_teste boolean NOT NULL DEFAULT false,
  marco_teste_data date,
  marco_feito boolean NOT NULL DEFAULT false,
  marco_feito_data date,
  links jsonb NOT NULL DEFAULT '[]'::jsonb,
  ordem integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS roadmap_itens_fase_idx ON roadmap_itens(fase);

-- Função de trigger compartilhada para manter updated_at.
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS roadmap_projeto_set_updated_at ON roadmap_projeto;
CREATE TRIGGER roadmap_projeto_set_updated_at
  BEFORE UPDATE ON roadmap_projeto
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS roadmap_itens_set_updated_at ON roadmap_itens;
CREATE TRIGGER roadmap_itens_set_updated_at
  BEFORE UPDATE ON roadmap_itens
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

ALTER TABLE roadmap_projeto ENABLE ROW LEVEL SECURITY;
CREATE POLICY roadmap_projeto_admin ON roadmap_projeto
  FOR ALL TO authenticated
  USING (is_admin())
  WITH CHECK (is_admin());

ALTER TABLE roadmap_itens ENABLE ROW LEVEL SECURITY;
CREATE POLICY roadmap_itens_admin ON roadmap_itens
  FOR ALL TO authenticated
  USING (is_admin())
  WITH CHECK (is_admin());

-- Seed da linha singleton do projeto.
INSERT INTO roadmap_projeto (visao_geral, objetivo_estrategico, status_geral)
SELECT
  'Desenvolvimento e implementação de sistemas inteligentes para otimização de processos, atendimento ao cliente e análise preditiva de dados, visando aumento de eficiência operacional e vantagem competitiva.',
  'Reduzir custos operacionais em 25% e aumentar a satisfação do cliente em 15 pontos de NPS até o final de 2026 através da implementação de soluções de IA.',
  'em_andamento'
WHERE NOT EXISTS (SELECT 1 FROM roadmap_projeto);
