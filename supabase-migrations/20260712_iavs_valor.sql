-- IA Value Score (IAVS) — Fase 6 (Engenharia Operacional).
-- Separa o valor em 3 naturezas (custo evitado / tempo liberado / valor de decisão),
-- distingue recorrência (mensal × único), registra o método de valoração e a flag
-- de honestidade "capacidade nova". Expande os tipos para as categorias do IAVS.

-- Tipos: de 3 para as categorias do IAVS
ALTER TABLE metodo_economias DROP CONSTRAINT IF EXISTS metodo_economias_tipo_check;
ALTER TABLE metodo_economias ADD CONSTRAINT metodo_economias_tipo_check
  CHECK (tipo IN ('sistema','copiloto','processo','workflow','dashboard','documento','analise','plano_acao','agente','prompt','decisao'));

-- Naturezas de valor (regra de ouro: decisão nunca se mistura com economia)
ALTER TABLE metodo_economias ADD COLUMN IF NOT EXISTS natureza text NOT NULL DEFAULT 'tempo_liberado'
  CHECK (natureza IN ('custo_evitado','tempo_liberado','valor_decisao'));

-- Recorrência: sistema criado é valor único; co-piloto rende todo mês
ALTER TABLE metodo_economias ADD COLUMN IF NOT EXISTS recorrencia text NOT NULL DEFAULT 'mensal'
  CHECK (recorrencia IN ('mensal','unico'));

-- Método de valoração usado (livro-razão auditável)
ALTER TABLE metodo_economias ADD COLUMN IF NOT EXISTS metodo_valoracao text
  CHECK (metodo_valoracao IS NULL OR metodo_valoracao IN ('custo_hora','preco_mercado','horas_dev','decisao'));

-- Flag de honestidade: capacidade nova (o cliente não gastaria de qualquer jeito)
ALTER TABLE metodo_economias ADD COLUMN IF NOT EXISTS capacidade_nova boolean NOT NULL DEFAULT false;

-- Perfis de custo-hora carregado da empresa (salário × 1,8 ÷ 160h produtivas)
CREATE TABLE IF NOT EXISTS metodo_perfis_custo (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  id_cliente uuid NOT NULL,
  nome text NOT NULL,
  salario_mensal numeric NOT NULL DEFAULT 0,
  custo_hora numeric GENERATED ALWAYS AS (round(salario_mensal * 1.8 / 160.0, 2)) STORED,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS metodo_perfis_custo_id_cliente_idx ON metodo_perfis_custo(id_cliente);
ALTER TABLE metodo_perfis_custo ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS metodo_perfis_custo_owner_or_admin ON metodo_perfis_custo;
CREATE POLICY metodo_perfis_custo_owner_or_admin ON metodo_perfis_custo
  FOR ALL TO authenticated
  USING (auth.uid() = id_cliente OR is_admin())
  WITH CHECK (auth.uid() = id_cliente OR is_admin());
