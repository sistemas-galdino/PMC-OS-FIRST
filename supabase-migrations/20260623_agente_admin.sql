-- Agente de IA (admin) — chat com acesso READ-ONLY ao banco.
-- 3 partes:
--   (a) historico de conversas (multi-thread tipo ChatGPT), privado por usuario.
--   (b) role read-only `agent_ro` + RPC agent_run_sql: o agente escreve um SELECT,
--       a RPC roda como agent_ro (sem GRANT de escrita, RLS aplicada com o JWT do
--       caller) -> mesma flexibilidade do MCP, sem o PAT god-mode.
--   (c) RPC agent_describe_schema: introspeccao de schema restrita a allowlist.
--
-- Seguranca em camadas:
--   1. is_admin() checado dentro de cada RPC (auth.users + mentores) -> 403 se nao for.
--   2. SELECT/WITH-only + 1 statement + blacklist de palavras de escrita (defesa extra).
--   3. SET LOCAL ROLE agent_ro antes de executar o SQL do agente -> RLS volta a valer
--      (agent_ro nao e dono nem BYPASSRLS) e nao ha privilegio de escrita.
--   4. statement_timeout 8s + LIMIT 200.

-- ============================================================
-- (a) Historico de conversas
-- ============================================================
CREATE TABLE IF NOT EXISTS public.agent_conversations (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    uuid NOT NULL,                 -- auth.uid() do admin dono da conversa
  titulo     text NOT NULL DEFAULT 'Nova conversa',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.agent_messages (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id uuid NOT NULL REFERENCES public.agent_conversations(id) ON DELETE CASCADE,
  role            text NOT NULL CHECK (role IN ('user','assistant')),
  content         text NOT NULL,
  created_at      timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS agent_conversations_user_idx ON public.agent_conversations (user_id, updated_at DESC);
CREATE INDEX IF NOT EXISTS agent_messages_conv_idx      ON public.agent_messages (conversation_id, created_at);

ALTER TABLE public.agent_conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.agent_messages      ENABLE ROW LEVEL SECURITY;

-- Conversas: dono ou admin (so admin usa o agente, mas mantemos dono p/ isolar entre admins)
DROP POLICY IF EXISTS agent_conversations_rw ON public.agent_conversations;
CREATE POLICY agent_conversations_rw ON public.agent_conversations
  FOR ALL TO authenticated
  USING (user_id = auth.uid() OR is_admin())
  WITH CHECK (user_id = auth.uid() OR is_admin());

-- Mensagens: herdam o acesso da conversa
DROP POLICY IF EXISTS agent_messages_rw ON public.agent_messages;
CREATE POLICY agent_messages_rw ON public.agent_messages
  FOR ALL TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.agent_conversations c
    WHERE c.id = conversation_id AND (c.user_id = auth.uid() OR is_admin())
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.agent_conversations c
    WHERE c.id = conversation_id AND (c.user_id = auth.uid() OR is_admin())
  ));

REVOKE ALL ON public.agent_conversations FROM anon;
REVOKE ALL ON public.agent_messages      FROM anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.agent_conversations TO authenticated;
GRANT SELECT, INSERT, DELETE          ON public.agent_messages      TO authenticated;

DROP TRIGGER IF EXISTS agent_conversations_set_updated_at ON public.agent_conversations;
CREATE TRIGGER agent_conversations_set_updated_at
  BEFORE UPDATE ON public.agent_conversations
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ============================================================
-- (b) Role read-only + allowlist
-- ============================================================
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'agent_ro') THEN
    CREATE ROLE agent_ro NOLOGIN;
  END IF;
END $$;

-- O dono das RPCs (postgres) precisa poder SET ROLE agent_ro.
GRANT agent_ro TO postgres;

GRANT USAGE ON SCHEMA public TO agent_ro;

-- GRANT SELECT so nas tabelas/views do programa (pula as que nao existirem).
DO $$
DECLARE
  t text;
  allow text[] := ARRAY[
    'agendamentos_central','reunioes_mentoria_new','reunioes_galdino','reunioes_blackcrm',
    'clientes_entrada_new','consultores_atendimento','consultores_disponibilidade',
    'consultores_excecoes','recursos_programa','cliente_atividades','cliente_cancelamento',
    'cliente_metas','cliente_objetivos_programa','cliente_produtos','cliente_canais','mentores'
  ];
BEGIN
  FOREACH t IN ARRAY allow LOOP
    IF to_regclass('public.' || t) IS NOT NULL THEN
      EXECUTE format('GRANT SELECT ON public.%I TO agent_ro', t);
    END IF;
  END LOOP;
END $$;

-- ============================================================
-- (b) RPC: roda um SELECT do agente em modo read-only
-- ============================================================
CREATE OR REPLACE FUNCTION public.agent_run_sql(p_sql text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_sql    text;
  v_result jsonb;
BEGIN
  -- 1) so admin (lê auth.users como postgres, antes de baixar privilegio)
  IF NOT EXISTS (
    SELECT 1 FROM mentores m
    WHERE m.email = (SELECT u.email FROM auth.users u WHERE u.id = auth.uid())
  ) THEN
    RAISE EXCEPTION 'forbidden: apenas admin pode consultar';
  END IF;

  -- 2) sanitiza: 1 instrucao, comeca com SELECT/WITH, sem palavras de escrita
  v_sql := btrim(p_sql);
  v_sql := regexp_replace(v_sql, ';+\s*$', '');           -- remove ; finais
  IF v_sql = '' THEN
    RAISE EXCEPTION 'query vazia';
  END IF;
  IF position(';' IN v_sql) > 0 THEN
    RAISE EXCEPTION 'apenas uma instrucao SELECT e permitida';
  END IF;
  IF lower(v_sql) !~ '^(select|with)\s' THEN
    RAISE EXCEPTION 'apenas SELECT/WITH e permitido';
  END IF;
  IF lower(v_sql) ~ '\m(insert|update|delete|merge|drop|alter|create|truncate|grant|revoke|copy|call|do|vacuum|reindex|refresh|comment|set|reset)\M' THEN
    RAISE EXCEPTION 'palavra-chave de escrita/comando nao permitida';
  END IF;

  -- 3) baixa privilegio: a query roda como agent_ro (RLS aplicada, sem write)
  SET LOCAL statement_timeout = '8s';
  SET LOCAL ROLE agent_ro;

  EXECUTE format(
    'SELECT coalesce(jsonb_agg(t), ''[]''::jsonb) FROM (SELECT * FROM (%s) s LIMIT 200) t',
    v_sql
  ) INTO v_result;

  RETURN v_result;
END;
$$;

GRANT EXECUTE ON FUNCTION public.agent_run_sql(text) TO authenticated;

-- ============================================================
-- (c) RPC: introspeccao de schema (restrita a allowlist)
-- ============================================================
CREATE OR REPLACE FUNCTION public.agent_describe_schema(p_tabelas text[] DEFAULT NULL)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_result jsonb;
  allow text[] := ARRAY[
    'agendamentos_central','reunioes_mentoria_new','reunioes_galdino','reunioes_blackcrm',
    'clientes_entrada_new','consultores_atendimento','consultores_disponibilidade',
    'consultores_excecoes','recursos_programa','cliente_atividades','cliente_cancelamento',
    'cliente_metas','cliente_objetivos_programa','cliente_produtos','cliente_canais','mentores'
  ];
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM mentores m
    WHERE m.email = (SELECT u.email FROM auth.users u WHERE u.id = auth.uid())
  ) THEN
    RAISE EXCEPTION 'forbidden: apenas admin pode consultar';
  END IF;

  SET LOCAL ROLE agent_ro;

  SELECT coalesce(jsonb_agg(jsonb_build_object(
           'tabela', c.table_name,
           'coluna', c.column_name,
           'tipo',   c.data_type
         ) ORDER BY c.table_name, c.ordinal_position), '[]'::jsonb)
  INTO v_result
  FROM information_schema.columns c
  WHERE c.table_schema = 'public'
    AND c.table_name = ANY(allow)
    AND (p_tabelas IS NULL OR c.table_name = ANY(p_tabelas));

  RETURN v_result;
END;
$$;

GRANT EXECUTE ON FUNCTION public.agent_describe_schema(text[]) TO authenticated;
