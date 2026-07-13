-- Método MC (Multiplicador de Crescimento) — tela /metodo.
-- 6 fases cíclicas: Guardião, Inteligência Empresarial, Gargalos,
-- Co-Pilotos (organograma híbrido), Torre de Comando, Engenharia Operacional.
-- id_cliente sem FK (clientes_entrada_new.id_cliente não tem UNIQUE) —
-- mesmo padrão de cliente_atividades/cliente_etapas_metodo.
-- RLS: o PRÓPRIO cliente escreve seus dados (diferente de cliente_etapas_metodo).

-- Fase 1 — Guardiões da IA da empresa (1 ou mais)
CREATE TABLE IF NOT EXISTS metodo_guardioes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  id_cliente uuid NOT NULL,
  nome text NOT NULL,
  cargo text,
  email text,
  whatsapp text,
  observacoes text,
  principal boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS metodo_guardioes_id_cliente_idx ON metodo_guardioes(id_cliente);

-- Fase 2 — Áreas da empresa (Inteligência Empresarial)
CREATE TABLE IF NOT EXISTS metodo_areas (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  id_cliente uuid NOT NULL,
  nome text NOT NULL,
  descricao text,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS metodo_areas_id_cliente_idx ON metodo_areas(id_cliente);

-- Fase 2 — Ciclo mensal de uma área: framework Dados → Informação → Estratégia → Receita
CREATE TABLE IF NOT EXISTS metodo_area_ciclos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  id_area uuid NOT NULL REFERENCES metodo_areas(id) ON DELETE CASCADE,
  id_cliente uuid NOT NULL,
  mes integer NOT NULL CHECK (mes BETWEEN 1 AND 12),
  ano integer NOT NULL,
  documento_texto text,             -- documento da área enviado p/ IA gerar os fluxos
  gerado_por_ia boolean NOT NULL DEFAULT false,
  -- Etapa 1: Dados → entregável Dashboard
  dados_status text NOT NULL DEFAULT 'pendente' CHECK (dados_status IN ('pendente','em_andamento','concluida')),
  dados_conteudo text,
  -- Etapa 2: Informação → entregável Análise
  informacao_status text NOT NULL DEFAULT 'pendente' CHECK (informacao_status IN ('pendente','em_andamento','concluida')),
  informacao_conteudo text,
  -- Etapa 3: Estratégia → entregável Plano de Ação
  estrategia_status text NOT NULL DEFAULT 'pendente' CHECK (estrategia_status IN ('pendente','em_andamento','concluida')),
  estrategia_conteudo text,
  -- Etapa 4: Receita → entregável Única Coisa / Rotina
  receita_status text NOT NULL DEFAULT 'pendente' CHECK (receita_status IN ('pendente','em_andamento','concluida')),
  receita_conteudo text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (id_area, mes, ano)
);
CREATE INDEX IF NOT EXISTS metodo_area_ciclos_id_cliente_idx ON metodo_area_ciclos(id_cliente);

-- Fase 3 — Mapeamento de gargalos (processos >10h) + plano de ação da IA
CREATE TABLE IF NOT EXISTS metodo_gargalos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  id_cliente uuid NOT NULL,
  area text,
  processo text NOT NULL,
  descricao text,
  quem_executa text,
  ferramentas text,
  horas_mes numeric,
  frequencia text,
  status text NOT NULL DEFAULT 'mapeado' CHECK (status IN ('mapeado','analisado','em_implementacao','resolvido')),
  plano_ia jsonb,                   -- {analise, causa_raiz, tipo_solucao, prioridade, tarefas[]}
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS metodo_gargalos_id_cliente_idx ON metodo_gargalos(id_cliente);

-- Fase 4 — Co-pilotos do organograma híbrido (orbitam colaboradores de cliente_colaboradores)
CREATE TABLE IF NOT EXISTS metodo_copilotos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  id_cliente uuid NOT NULL,
  colaborador_id uuid REFERENCES cliente_colaboradores(id) ON DELETE SET NULL,
  colaborador_nome text,            -- denormalizado (fallback se colaborador for removido)
  nome text NOT NULL,
  funcao text,                      -- função repetitiva que o copiloto executa
  skill_documento text,             -- documento de skill (gerado por IA ou manual)
  status text NOT NULL DEFAULT 'ideia' CHECK (status IN ('ideia','em_criacao','ativo')),
  origem text NOT NULL DEFAULT 'manual' CHECK (origem IN ('manual','ia')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS metodo_copilotos_id_cliente_idx ON metodo_copilotos(id_cliente);

-- Fase 5 — Torre de Comando: repositório de sistemas criados
CREATE TABLE IF NOT EXISTS metodo_sistemas (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  id_cliente uuid NOT NULL,
  nome text NOT NULL,
  descricao text,
  url text,
  plataforma text,                  -- claude | lovable | outro (texto livre)
  categoria text,
  integracoes text,
  status text NOT NULL DEFAULT 'ativo' CHECK (status IN ('ideia','em_construcao','ativo')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS metodo_sistemas_id_cliente_idx ON metodo_sistemas(id_cliente);

-- Fase 6 — Engenharia Operacional: ferramentas em uso
CREATE TABLE IF NOT EXISTS metodo_ferramentas (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  id_cliente uuid NOT NULL,
  nome text NOT NULL,
  url text,
  para_que_serve text,
  categoria text,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS metodo_ferramentas_id_cliente_idx ON metodo_ferramentas(id_cliente);

-- Fase 6 — Engenharia Operacional: economias geradas (horas e R$)
CREATE TABLE IF NOT EXISTS metodo_economias (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  id_cliente uuid NOT NULL,
  referencia text NOT NULL,         -- nome do sistema/copiloto/processo
  tipo text NOT NULL DEFAULT 'sistema' CHECK (tipo IN ('sistema','copiloto','processo')),
  horas_mes numeric NOT NULL DEFAULT 0,
  valor_mes numeric NOT NULL DEFAULT 0,
  observacao text,
  origem text NOT NULL DEFAULT 'manual' CHECK (origem IN ('manual','ia')),
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS metodo_economias_id_cliente_idx ON metodo_economias(id_cliente);

-- RLS: cliente gerencia os próprios dados; admin gerencia tudo.
DO $$
DECLARE t text;
BEGIN
  FOREACH t IN ARRAY ARRAY[
    'metodo_guardioes','metodo_areas','metodo_area_ciclos','metodo_gargalos',
    'metodo_copilotos','metodo_sistemas','metodo_ferramentas','metodo_economias'
  ] LOOP
    EXECUTE format('ALTER TABLE %I ENABLE ROW LEVEL SECURITY', t);
    EXECUTE format(
      'CREATE POLICY %I ON %I FOR ALL TO authenticated USING (auth.uid() = id_cliente OR is_admin()) WITH CHECK (auth.uid() = id_cliente OR is_admin())',
      t || '_rw', t
    );
  END LOOP;
END $$;
