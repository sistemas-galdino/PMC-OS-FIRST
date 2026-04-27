-- Migration: ligar RLS + policies em todas as tabelas restantes
-- Data: 2026-04-27
-- Padrão:
--   * id_cliente-scoped: cliente vê própria, mentor vê tudo
--   * globais: todo authenticated lê, mentor escreve
--   * admin-only: só mentor lê/escreve
-- Tabelas com RLS já correto (cliente_objetivos_programa) ficam intactas.
-- Tabelas com RLS incompleto (cenarios_mapeamento, cliente_informacoes_empresa,
-- cliente_indicadores_mensais) têm policies recriadas pra incluir is_mentor().

-- =============================================================
-- 1. id_cliente-scoped (uuid)
-- =============================================================

DO $$
DECLARE
  t text;
  tables_uuid text[] := ARRAY[
    'clientes_entrada_new',
    'clientes_formulario',
    'cliente_metas',
    'cliente_onboarding',
    'cliente_vitorias',
    'cliente_pilar_evidencias',
    'cliente_colaboradores',
    'cliente_produtos',
    'cliente_canais',
    'reunioes_mentoria_new',
    'reunioes_galdino'
  ];
BEGIN
  FOREACH t IN ARRAY tables_uuid LOOP
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', t);

    EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', t || '_select', t);
    EXECUTE format(
      'CREATE POLICY %I ON public.%I FOR SELECT TO authenticated USING (auth.uid() = id_cliente OR public.is_mentor())',
      t || '_select', t
    );

    EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', t || '_modify', t);
    EXECUTE format(
      'CREATE POLICY %I ON public.%I FOR ALL TO authenticated USING (auth.uid() = id_cliente OR public.is_mentor()) WITH CHECK (auth.uid() = id_cliente OR public.is_mentor())',
      t || '_modify', t
    );
  END LOOP;
END $$;

-- =============================================================
-- 2. reunioes_blackcrm (id_cliente é text, não uuid)
-- =============================================================

ALTER TABLE public.reunioes_blackcrm ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS reunioes_blackcrm_select ON public.reunioes_blackcrm;
CREATE POLICY reunioes_blackcrm_select ON public.reunioes_blackcrm
  FOR SELECT TO authenticated
  USING (auth.uid()::text = id_cliente OR public.is_mentor());

DROP POLICY IF EXISTS reunioes_blackcrm_modify ON public.reunioes_blackcrm;
CREATE POLICY reunioes_blackcrm_modify ON public.reunioes_blackcrm
  FOR ALL TO authenticated
  USING (auth.uid()::text = id_cliente OR public.is_mentor())
  WITH CHECK (auth.uid()::text = id_cliente OR public.is_mentor());

-- =============================================================
-- 3. Tabelas globais (todo authenticated lê, mentor escreve)
-- =============================================================

DO $$
DECLARE
  t text;
  tables_global text[] := ARRAY[
    'encontros_ao_vivo',
    'recursos_programa',
    'trilha_links'
  ];
BEGIN
  FOREACH t IN ARRAY tables_global LOOP
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', t);

    EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', t || '_select_all', t);
    EXECUTE format(
      'CREATE POLICY %I ON public.%I FOR SELECT TO authenticated USING (true)',
      t || '_select_all', t
    );

    EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', t || '_modify_admin', t);
    EXECUTE format(
      'CREATE POLICY %I ON public.%I FOR ALL TO authenticated USING (public.is_mentor()) WITH CHECK (public.is_mentor())',
      t || '_modify_admin', t
    );
  END LOOP;
END $$;

-- =============================================================
-- 4. Tabelas admin-only (só mentor)
-- =============================================================

DO $$
DECLARE
  t text;
  tables_admin text[] := ARRAY[
    'mentores',
    'configuracoes_links'
  ];
BEGIN
  FOREACH t IN ARRAY tables_admin LOOP
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', t);

    EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', t || '_admin_all', t);
    EXECUTE format(
      'CREATE POLICY %I ON public.%I FOR ALL TO authenticated USING (public.is_mentor()) WITH CHECK (public.is_mentor())',
      t || '_admin_all', t
    );
  END LOOP;
END $$;

-- =============================================================
-- 5. Recriar policies que hoje só permitem o cliente (estender pra mentor)
-- =============================================================

-- cenarios_mapeamento
DROP POLICY IF EXISTS cenarios_mapeamento_select ON public.cenarios_mapeamento;
DROP POLICY IF EXISTS cenarios_mapeamento_insert ON public.cenarios_mapeamento;
DROP POLICY IF EXISTS cenarios_mapeamento_update ON public.cenarios_mapeamento;
DROP POLICY IF EXISTS cenarios_mapeamento_delete ON public.cenarios_mapeamento;

CREATE POLICY cenarios_mapeamento_select ON public.cenarios_mapeamento
  FOR SELECT TO authenticated
  USING (auth.uid() = id_cliente OR public.is_mentor());

CREATE POLICY cenarios_mapeamento_modify ON public.cenarios_mapeamento
  FOR ALL TO authenticated
  USING (auth.uid() = id_cliente OR public.is_mentor())
  WITH CHECK (auth.uid() = id_cliente OR public.is_mentor());

-- cliente_informacoes_empresa
DROP POLICY IF EXISTS cliente_informacoes_empresa_select ON public.cliente_informacoes_empresa;
DROP POLICY IF EXISTS cliente_informacoes_empresa_insert ON public.cliente_informacoes_empresa;
DROP POLICY IF EXISTS cliente_informacoes_empresa_update ON public.cliente_informacoes_empresa;
DROP POLICY IF EXISTS cliente_informacoes_empresa_delete ON public.cliente_informacoes_empresa;

CREATE POLICY cliente_informacoes_empresa_select ON public.cliente_informacoes_empresa
  FOR SELECT TO authenticated
  USING (auth.uid() = id_cliente OR public.is_mentor());

CREATE POLICY cliente_informacoes_empresa_modify ON public.cliente_informacoes_empresa
  FOR ALL TO authenticated
  USING (auth.uid() = id_cliente OR public.is_mentor())
  WITH CHECK (auth.uid() = id_cliente OR public.is_mentor());

-- cliente_indicadores_mensais
DROP POLICY IF EXISTS cliente_indicadores_mensais_select ON public.cliente_indicadores_mensais;
DROP POLICY IF EXISTS cliente_indicadores_mensais_insert ON public.cliente_indicadores_mensais;
DROP POLICY IF EXISTS cliente_indicadores_mensais_update ON public.cliente_indicadores_mensais;
DROP POLICY IF EXISTS cliente_indicadores_mensais_delete ON public.cliente_indicadores_mensais;

CREATE POLICY cliente_indicadores_mensais_select ON public.cliente_indicadores_mensais
  FOR SELECT TO authenticated
  USING (auth.uid() = id_cliente OR public.is_mentor());

CREATE POLICY cliente_indicadores_mensais_modify ON public.cliente_indicadores_mensais
  FOR ALL TO authenticated
  USING (auth.uid() = id_cliente OR public.is_mentor())
  WITH CHECK (auth.uid() = id_cliente OR public.is_mentor());
