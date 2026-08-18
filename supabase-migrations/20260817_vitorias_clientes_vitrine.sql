-- ============================================================================
-- Vitórias dos Clientes / Vitrine de Cases — port do sistema externo
-- ============================================================================
-- A "Vitrine de Cases dos Clientes PMC" era um app Next.js separado, com banco
-- Supabase próprio (fssbornzbumzcpznezxj). Guardava o acervo comercial do
-- programa: 143 vitórias / 135 cases aprovados de 84 clientes, com conteúdo
-- editorial completo, headlines curadas e 59 logos.
--
-- Aqui esse acervo vira nativo do PMC OS. A decisão central: o case aponta para
-- o cliente REAL (clientes_entrada_new.id_cliente), não para uma base paralela
-- de clientes. Como o sistema antigo não guardava e-mail/CNPJ/código, o vínculo
-- é resolvido por script (código embutido no logo_path → codigo_cliente, depois
-- nome da empresa) e o que sobrar fica com vinculo_status='pendente' para ser
-- resolvido na tela — por isso id_cliente é NULLABLE.
--
-- vitrine_clientes existe (em vez de escrever em clientes_entrada_new) porque
-- guarda metadado que só a vitrine usa (logo, status da logo, instagram) e
-- porque precisa aceitar cliente ainda não vinculado.
--
-- Sem FK para clientes_entrada_new: convenção do projeto (id_cliente é coluna
-- solta, ver 20260713_repositorio_vitorias.sql).
-- ============================================================================

CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

-- ============================================
-- 1. vitrine_clientes — o cliente na ótica da vitrine
-- ============================================
CREATE TABLE IF NOT EXISTS public.vitrine_clientes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  id_cliente uuid,                       -- clientes_entrada_new.id_cliente (NULL = ainda não vinculado)
  codigo_cliente bigint,                 -- clientes_entrada_new.codigo_cliente (denormalizado)
  empresa_nome text NOT NULL,
  cliente_nome text,                     -- pessoa (dono/representante)
  nicho text,
  subnicho text,
  cs_responsavel text,
  consultor_responsavel text,
  site text,
  instagram text,
  logo_path text,                        -- caminho no bucket vitrine-logos
  logo_display_path text,                -- cópia normalizada p/ apresentação
  -- 'oficial' e 'oficial_verificado_site' vêm do legado e guardam a PROCEDÊNCIA
  -- da logo (veio no handoff oficial / foi conferida no site da empresa).
  -- Contam como validadas; o que importa na tela é o que ainda é 'pendente'.
  logo_status text NOT NULL DEFAULT 'pendente'
    CHECK (logo_status IN ('pendente','enviada_cs','validada','oficial','oficial_verificado_site')),
  logo_origem text,
  logo_validada_em timestamptz,
  logo_validada_por uuid,
  vinculo_status text NOT NULL DEFAULT 'pendente'
    CHECK (vinculo_status IN ('vinculado','pendente','ignorado')),
  vinculo_metodo text,                   -- como o match foi feito (codigo_logo/nome_empresa/nome_pessoa/manual)
  vinculo_candidatos text,               -- candidatos quando o match foi ambíguo
  status_cliente text,
  observacoes text,
  origem_legado_uuid text UNIQUE,        -- external_client_id do sistema antigo (idempotência da importação)
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS vitrine_clientes_id_cliente_idx ON public.vitrine_clientes(id_cliente);
CREATE INDEX IF NOT EXISTS vitrine_clientes_codigo_idx ON public.vitrine_clientes(codigo_cliente);
CREATE INDEX IF NOT EXISTS vitrine_clientes_vinculo_idx ON public.vitrine_clientes(vinculo_status);

DROP TRIGGER IF EXISTS vitrine_clientes_set_updated_at ON public.vitrine_clientes;
CREATE TRIGGER vitrine_clientes_set_updated_at
  BEFORE UPDATE ON public.vitrine_clientes
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ============================================
-- 2. vitrine_cases — a vitória/case com o conteúdo editorial
-- ============================================
CREATE TABLE IF NOT EXISTS public.vitrine_cases (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  case_id text NOT NULL UNIQUE,          -- identificador estável (VIT-089); não pode mudar
  vitrine_cliente_id uuid NOT NULL REFERENCES public.vitrine_clientes(id) ON DELETE CASCADE,
  id_cliente uuid,                       -- denormalizado p/ filtrar por cliente sem join
  codigo_cliente bigint,
  empresa_nome text,

  -- apresentação
  headline_impacto text,                 -- headline original (histórico)
  headline_vitrine text,                 -- headline curada, é a que aparece no card
  headline_curta text,
  categoria text,                        -- ÁREA IMPACTADA (área do negócio transformada)
  foco_ia boolean NOT NULL DEFAULT false,
  ferramenta_card text,
  ferramenta_ia text,

  -- blocos editoriais da página do case
  resumo_executivo text,
  como_era_antes text,
  principais_gargalos text[] NOT NULL DEFAULT '{}',
  como_ficou_depois text,
  o_que_pmc_transformou text,            -- bloco de maior destaque da narrativa comercial
  principais_ganhos text[] NOT NULL DEFAULT '{}',
  solucao_criada text,
  processo_atual text,
  resultado_principal text,

  -- workflow
  status_implementacao text,
  status_publicacao text NOT NULL DEFAULT 'nao_publicado',
  status_validacao text,
  nivel_evidencia text,
  aprovado_vitrine boolean NOT NULL DEFAULT true,
  destaque boolean NOT NULL DEFAULT false,
  ordem_vitrine integer,
  arquivado boolean NOT NULL DEFAULT false,
  arquivado_em timestamptz,

  capa_url text,
  palavras_chave text[] NOT NULL DEFAULT '{}',
  observacoes text,
  origem_legado_uuid text UNIQUE,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS vitrine_cases_cliente_idx ON public.vitrine_cases(vitrine_cliente_id);
CREATE INDEX IF NOT EXISTS vitrine_cases_id_cliente_idx ON public.vitrine_cases(id_cliente);
CREATE INDEX IF NOT EXISTS vitrine_cases_vitrine_idx ON public.vitrine_cases(aprovado_vitrine, arquivado);
CREATE INDEX IF NOT EXISTS vitrine_cases_categoria_idx ON public.vitrine_cases(categoria);

DROP TRIGGER IF EXISTS vitrine_cases_set_updated_at ON public.vitrine_cases;
CREATE TRIGGER vitrine_cases_set_updated_at
  BEFORE UPDATE ON public.vitrine_cases
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ============================================
-- 3. vitrine_evidencias — prints e links que comprovam o case
-- ============================================
CREATE TABLE IF NOT EXISTS public.vitrine_evidencias (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  vitrine_case_id uuid NOT NULL REFERENCES public.vitrine_cases(id) ON DELETE CASCADE,
  tipo text NOT NULL DEFAULT 'print' CHECK (tipo IN ('print','link','video','documento')),
  arquivo_path text,                     -- bucket vitrine-evidencias (privado, URL assinada)
  url_externa text,
  legenda text,
  principal boolean NOT NULL DEFAULT false,
  aprovada boolean NOT NULL DEFAULT false,
  dados_sensiveis_verificados boolean NOT NULL DEFAULT false,
  criado_por uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS vitrine_evidencias_case_idx ON public.vitrine_evidencias(vitrine_case_id);

DROP TRIGGER IF EXISTS vitrine_evidencias_set_updated_at ON public.vitrine_evidencias;
CREATE TRIGGER vitrine_evidencias_set_updated_at
  BEFORE UPDATE ON public.vitrine_evidencias
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ============================================
-- 4. vitrine_capturas — a tarefa: onde na gravação está a prova do case
-- ============================================
CREATE TABLE IF NOT EXISTS public.vitrine_capturas (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  vitrine_case_id uuid NOT NULL REFERENCES public.vitrine_cases(id) ON DELETE CASCADE,
  cs_responsavel text,
  reuniao_mencionada text,
  mentor_consultor text,
  gravacao_url text,
  o_que_capturar text,
  minuto_exato text,
  trecho_para_localizar text,
  dados_a_ocultar text,
  legenda_sugerida text,
  status text NOT NULL DEFAULT 'pendente'
    CHECK (status IN ('pendente','em_andamento','capturado','nao_aplicavel')),
  observacoes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS vitrine_capturas_case_idx ON public.vitrine_capturas(vitrine_case_id);

DROP TRIGGER IF EXISTS vitrine_capturas_set_updated_at ON public.vitrine_capturas;
CREATE TRIGGER vitrine_capturas_set_updated_at
  BEFORE UPDATE ON public.vitrine_capturas
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ============================================
-- 5. vitrine_oportunidades — possíveis vitórias futuras (ainda não são case)
-- ============================================
CREATE TABLE IF NOT EXISTS public.vitrine_oportunidades (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  vitrine_cliente_id uuid REFERENCES public.vitrine_clientes(id) ON DELETE CASCADE,
  id_cliente uuid,
  empresa_nome text,
  descricao_projeto text,
  status_atual text,
  resultado_esperado text,
  reuniao_nome text,
  reuniao_data date,
  gravacao_url text,
  proxima_validacao text,
  cs_responsavel text,
  observacoes text,
  origem_legado_uuid text UNIQUE,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS vitrine_oportunidades_cliente_idx ON public.vitrine_oportunidades(vitrine_cliente_id);

DROP TRIGGER IF EXISTS vitrine_oportunidades_set_updated_at ON public.vitrine_oportunidades;
CREATE TRIGGER vitrine_oportunidades_set_updated_at
  BEFORE UPDATE ON public.vitrine_oportunidades
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ============================================
-- 6. RLS — tudo admin-only (é acervo comercial interno)
-- ============================================
ALTER TABLE public.vitrine_clientes ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS vitrine_clientes_admin ON public.vitrine_clientes;
CREATE POLICY vitrine_clientes_admin ON public.vitrine_clientes
  FOR ALL TO authenticated USING (is_admin()) WITH CHECK (is_admin());

ALTER TABLE public.vitrine_cases ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS vitrine_cases_admin ON public.vitrine_cases;
CREATE POLICY vitrine_cases_admin ON public.vitrine_cases
  FOR ALL TO authenticated USING (is_admin()) WITH CHECK (is_admin());

ALTER TABLE public.vitrine_evidencias ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS vitrine_evidencias_admin ON public.vitrine_evidencias;
CREATE POLICY vitrine_evidencias_admin ON public.vitrine_evidencias
  FOR ALL TO authenticated USING (is_admin()) WITH CHECK (is_admin());

ALTER TABLE public.vitrine_capturas ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS vitrine_capturas_admin ON public.vitrine_capturas;
CREATE POLICY vitrine_capturas_admin ON public.vitrine_capturas
  FOR ALL TO authenticated USING (is_admin()) WITH CHECK (is_admin());

ALTER TABLE public.vitrine_oportunidades ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS vitrine_oportunidades_admin ON public.vitrine_oportunidades;
CREATE POLICY vitrine_oportunidades_admin ON public.vitrine_oportunidades
  FOR ALL TO authenticated USING (is_admin()) WITH CHECK (is_admin());

-- ============================================
-- 7. View da apresentação — só o que pode aparecer na tela de vitrine.
--    security_invoker: herda a RLS de quem consulta (não vaza para anon).
--    Fora daqui de propósito: observações, transcrição e evidência privada.
-- ============================================
DROP VIEW IF EXISTS public.vitrine_showcase;
CREATE VIEW public.vitrine_showcase
WITH (security_invoker = true) AS
SELECT
  c.case_id,
  c.id                       AS vitrine_case_id,
  cl.id                      AS vitrine_cliente_id,
  cl.id_cliente,
  cl.codigo_cliente,
  cl.empresa_nome,
  cl.cliente_nome,
  cl.nicho,                                    -- NICHO DO CLIENTE (setor da empresa)
  cl.subnicho,
  cl.cs_responsavel,
  cl.logo_path,
  cl.logo_display_path,
  c.categoria,                                 -- ÁREA IMPACTADA (não confundir com nicho)
  c.foco_ia,
  c.ferramenta_card,
  c.headline_impacto,
  COALESCE(NULLIF(c.headline_vitrine, ''), c.headline_impacto) AS headline_vitrine,
  c.resumo_executivo,
  c.como_era_antes,
  c.principais_gargalos,
  c.como_ficou_depois,
  c.o_que_pmc_transformou,
  c.principais_ganhos,
  c.solucao_criada,
  c.processo_atual,
  c.resultado_principal,
  c.capa_url,
  c.palavras_chave,
  c.destaque,
  c.ordem_vitrine
FROM public.vitrine_cases c
JOIN public.vitrine_clientes cl ON cl.id = c.vitrine_cliente_id
WHERE c.aprovado_vitrine = true
  AND c.arquivado = false;

GRANT SELECT ON public.vitrine_showcase TO authenticated;

-- ============================================
-- 8. Buckets
--    vitrine-logos: público. Logo de empresa não é dado sensível e o card
--    precisa carregar rápido (getPublicUrl, sem assinar 135 URLs por render).
--    vitrine-evidencias: PRIVADO. Print de case tem dashboard financeiro e
--    nome de participante de reunião — só URL assinada, só admin.
-- ============================================
INSERT INTO storage.buckets (id, name, public)
VALUES ('vitrine-logos', 'vitrine-logos', true)
ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS "vitrine_logos_admin_rw" ON storage.objects;
CREATE POLICY "vitrine_logos_admin_rw" ON storage.objects
  FOR ALL TO authenticated
  USING (bucket_id = 'vitrine-logos' AND is_admin())
  WITH CHECK (bucket_id = 'vitrine-logos' AND is_admin());

INSERT INTO storage.buckets (id, name, public)
VALUES ('vitrine-evidencias', 'vitrine-evidencias', false)
ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS "vitrine_evidencias_admin_rw" ON storage.objects;
CREATE POLICY "vitrine_evidencias_admin_rw" ON storage.objects
  FOR ALL TO authenticated
  USING (bucket_id = 'vitrine-evidencias' AND is_admin())
  WITH CHECK (bucket_id = 'vitrine-evidencias' AND is_admin());

-- ============================================
-- 9. RBAC — o segmento novo do menu.
--    'grupo' casa com o label da NavSection no app-sidebar.tsx.
--    Sem seed em papel_secoes: papéis full já enxergam tudo; a CS entra depois
--    se o David quiser que ela mande logo/print.
-- ============================================
INSERT INTO public.secoes_catalogo (chave, label, grupo, ordem, sensivel) VALUES
  ('vitrine',               'Vitrine',           'Vitórias dos Clientes', 850, false),
  ('vitrine-cases',         'Cases',             'Vitórias dos Clientes', 860, false),
  ('vitrine-clientes',      'Logos & Clientes',  'Vitórias dos Clientes', 870, false),
  ('vitrine-evidencias',    'Evidências',        'Vitórias dos Clientes', 880, false),
  ('vitrine-oportunidades', 'Oportunidades',     'Vitórias dos Clientes', 890, false)
ON CONFLICT (chave) DO UPDATE
  SET label = excluded.label, grupo = excluded.grupo, ordem = excluded.ordem;

NOTIFY pgrst, 'reload schema';
