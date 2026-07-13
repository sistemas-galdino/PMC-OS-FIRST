-- =====================================================================
-- PMC OS — Método MC + Empresa (IA) + Comunidade/Novidades
-- Script consolidado para PRODUÇÃO (projeto hqczwextifessaztyyyk).
--
-- Reúne, na ordem correta e de forma IDEMPOTENTE (pode rodar de novo
-- sem erro), as migrações abaixo já aplicadas no DEV:
--   1) 20260710_create_cliente_etapas_metodo
--   2) 20260711_create_metodo_mc
--   3) 20260711_metodo_guardiao_foto
--   4) 20260711_metodo_area_ciclo_documento
--   5) 20260711_empresa_analise_ia
--   6) 20260711_comunidade_novidades
--
-- Requisitos: função is_admin() já existente (usada pelas policies).
-- Depois de rodar, configurar o secret OPENAI_API_KEY (ou LOVABLE_API_KEY)
-- e fazer deploy das edge functions metodo-ia e empresa-enriquecer.
-- =====================================================================

BEGIN;

-- ---------------------------------------------------------------------
-- 1) cliente_etapas_metodo — progresso nas 7 etapas (tela Início)
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS cliente_etapas_metodo (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  id_cliente uuid NOT NULL,
  etapa integer NOT NULL CHECK (etapa BETWEEN 1 AND 7),
  concluida boolean NOT NULL DEFAULT false,
  concluida_em timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (id_cliente, etapa)
);
CREATE INDEX IF NOT EXISTS cliente_etapas_metodo_id_cliente_idx ON cliente_etapas_metodo(id_cliente);
ALTER TABLE cliente_etapas_metodo ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS cliente_etapas_metodo_select ON cliente_etapas_metodo;
CREATE POLICY cliente_etapas_metodo_select ON cliente_etapas_metodo
  FOR SELECT TO authenticated
  USING (auth.uid() = id_cliente OR is_admin());

DROP POLICY IF EXISTS cliente_etapas_metodo_insert ON cliente_etapas_metodo;
CREATE POLICY cliente_etapas_metodo_insert ON cliente_etapas_metodo
  FOR INSERT TO authenticated
  WITH CHECK (is_admin());

DROP POLICY IF EXISTS cliente_etapas_metodo_update ON cliente_etapas_metodo;
CREATE POLICY cliente_etapas_metodo_update ON cliente_etapas_metodo
  FOR UPDATE TO authenticated
  USING (is_admin())
  WITH CHECK (is_admin());

DROP POLICY IF EXISTS cliente_etapas_metodo_delete ON cliente_etapas_metodo;
CREATE POLICY cliente_etapas_metodo_delete ON cliente_etapas_metodo
  FOR DELETE TO authenticated
  USING (is_admin());

-- ---------------------------------------------------------------------
-- 2) Método MC — 8 tabelas (Fases 1 a 6)
-- ---------------------------------------------------------------------
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

CREATE TABLE IF NOT EXISTS metodo_areas (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  id_cliente uuid NOT NULL,
  nome text NOT NULL,
  descricao text,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS metodo_areas_id_cliente_idx ON metodo_areas(id_cliente);

CREATE TABLE IF NOT EXISTS metodo_area_ciclos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  id_area uuid NOT NULL REFERENCES metodo_areas(id) ON DELETE CASCADE,
  id_cliente uuid NOT NULL,
  mes integer NOT NULL CHECK (mes BETWEEN 1 AND 12),
  ano integer NOT NULL,
  documento_texto text,
  gerado_por_ia boolean NOT NULL DEFAULT false,
  dados_status text NOT NULL DEFAULT 'pendente' CHECK (dados_status IN ('pendente','em_andamento','concluida')),
  dados_conteudo text,
  informacao_status text NOT NULL DEFAULT 'pendente' CHECK (informacao_status IN ('pendente','em_andamento','concluida')),
  informacao_conteudo text,
  estrategia_status text NOT NULL DEFAULT 'pendente' CHECK (estrategia_status IN ('pendente','em_andamento','concluida')),
  estrategia_conteudo text,
  receita_status text NOT NULL DEFAULT 'pendente' CHECK (receita_status IN ('pendente','em_andamento','concluida')),
  receita_conteudo text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (id_area, mes, ano)
);
CREATE INDEX IF NOT EXISTS metodo_area_ciclos_id_cliente_idx ON metodo_area_ciclos(id_cliente);

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
  plano_ia jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS metodo_gargalos_id_cliente_idx ON metodo_gargalos(id_cliente);

CREATE TABLE IF NOT EXISTS metodo_copilotos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  id_cliente uuid NOT NULL,
  colaborador_id uuid REFERENCES cliente_colaboradores(id) ON DELETE SET NULL,
  colaborador_nome text,
  nome text NOT NULL,
  funcao text,
  skill_documento text,
  status text NOT NULL DEFAULT 'ideia' CHECK (status IN ('ideia','em_criacao','ativo')),
  origem text NOT NULL DEFAULT 'manual' CHECK (origem IN ('manual','ia')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS metodo_copilotos_id_cliente_idx ON metodo_copilotos(id_cliente);

CREATE TABLE IF NOT EXISTS metodo_sistemas (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  id_cliente uuid NOT NULL,
  nome text NOT NULL,
  descricao text,
  url text,
  plataforma text,
  categoria text,
  integracoes text,
  status text NOT NULL DEFAULT 'ativo' CHECK (status IN ('ideia','em_construcao','ativo')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS metodo_sistemas_id_cliente_idx ON metodo_sistemas(id_cliente);

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

CREATE TABLE IF NOT EXISTS metodo_economias (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  id_cliente uuid NOT NULL,
  referencia text NOT NULL,
  tipo text NOT NULL DEFAULT 'sistema' CHECK (tipo IN ('sistema','copiloto','processo')),
  horas_mes numeric NOT NULL DEFAULT 0,
  valor_mes numeric NOT NULL DEFAULT 0,
  observacao text,
  origem text NOT NULL DEFAULT 'manual' CHECK (origem IN ('manual','ia')),
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS metodo_economias_id_cliente_idx ON metodo_economias(id_cliente);

-- RLS das 8 tabelas: cliente gerencia os próprios dados; admin gerencia tudo.
DO $$
DECLARE t text;
BEGIN
  FOREACH t IN ARRAY ARRAY[
    'metodo_guardioes','metodo_areas','metodo_area_ciclos','metodo_gargalos',
    'metodo_copilotos','metodo_sistemas','metodo_ferramentas','metodo_economias'
  ] LOOP
    EXECUTE format('ALTER TABLE %I ENABLE ROW LEVEL SECURITY', t);
    EXECUTE format('DROP POLICY IF EXISTS %I ON %I', t || '_rw', t);
    EXECUTE format(
      'CREATE POLICY %I ON %I FOR ALL TO authenticated USING (auth.uid() = id_cliente OR is_admin()) WITH CHECK (auth.uid() = id_cliente OR is_admin())',
      t || '_rw', t
    );
  END LOOP;
END $$;

-- ---------------------------------------------------------------------
-- 3) Foto do guardião (Fase 1) — coluna + bucket público
-- ---------------------------------------------------------------------
ALTER TABLE metodo_guardioes ADD COLUMN IF NOT EXISTS foto_url text;

INSERT INTO storage.buckets (id, name, public)
VALUES ('guardiao-fotos', 'guardiao-fotos', true)
ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS "guardiao_fotos_owner_or_admin_rw" ON storage.objects;
CREATE POLICY "guardiao_fotos_owner_or_admin_rw" ON storage.objects
  FOR ALL TO authenticated
  USING (
    bucket_id = 'guardiao-fotos'
    AND ((storage.foldername(name))[1] = auth.uid()::text OR is_admin())
  )
  WITH CHECK (
    bucket_id = 'guardiao-fotos'
    AND ((storage.foldername(name))[1] = auth.uid()::text OR is_admin())
  );

-- ---------------------------------------------------------------------
-- 4) Documento da área (Fase 2) — colunas + bucket público
-- ---------------------------------------------------------------------
ALTER TABLE metodo_area_ciclos ADD COLUMN IF NOT EXISTS documento_nome text;
ALTER TABLE metodo_area_ciclos ADD COLUMN IF NOT EXISTS documento_url text;

INSERT INTO storage.buckets (id, name, public)
VALUES ('metodo-documentos', 'metodo-documentos', true)
ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS "metodo_docs_owner_or_admin_rw" ON storage.objects;
CREATE POLICY "metodo_docs_owner_or_admin_rw" ON storage.objects
  FOR ALL TO authenticated
  USING (
    bucket_id = 'metodo-documentos'
    AND ((storage.foldername(name))[1] = auth.uid()::text OR is_admin())
  )
  WITH CHECK (
    bucket_id = 'metodo-documentos'
    AND ((storage.foldername(name))[1] = auth.uid()::text OR is_admin())
  );

-- ---------------------------------------------------------------------
-- 5) Análise do negócio pela IA (Informações da Empresa)
-- ---------------------------------------------------------------------
ALTER TABLE cliente_informacoes_empresa ADD COLUMN IF NOT EXISTS analise_ia jsonb;
ALTER TABLE cliente_informacoes_empresa ADD COLUMN IF NOT EXISTS analise_ia_em timestamptz;

-- ---------------------------------------------------------------------
-- 6) Comunidade → Novidades
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS comunidade_novidades (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  titulo text NOT NULL,
  resumo text,
  conteudo text,
  data_publicacao date NOT NULL DEFAULT current_date,
  destaque boolean NOT NULL DEFAULT false,
  publicado boolean NOT NULL DEFAULT true,
  autor text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS comunidade_novidades_data_idx ON comunidade_novidades(data_publicacao DESC);
ALTER TABLE comunidade_novidades ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS comunidade_novidades_select ON comunidade_novidades;
CREATE POLICY comunidade_novidades_select ON comunidade_novidades
  FOR SELECT TO authenticated
  USING (publicado = true OR is_admin());

DROP POLICY IF EXISTS comunidade_novidades_admin_write ON comunidade_novidades;
CREATE POLICY comunidade_novidades_admin_write ON comunidade_novidades
  FOR ALL TO authenticated
  USING (is_admin())
  WITH CHECK (is_admin());

COMMIT;
