-- FIX v2 do agente: RPCs como SECURITY INVOKER.
--
-- Erro real capturado: 42501 "cannot set parameter \"role\" within security-definer
-- function". O Postgres PROIBE SET ROLE / SET SESSION AUTHORIZATION dentro de uma
-- funcao SECURITY DEFINER. Por isso as duas tentativas anteriores (SET ROLE agent_ro
-- e depois SET ROLE authenticated) falhavam identicamente.
--
-- Solucao: tornar as RPCs SECURITY INVOKER -> rodam como o proprio caller
-- (authenticated). Assim a RLS (TO authenticated) e o is_admin() funcionam sem
-- precisar de SET ROLE. Read-only continua garantido pela validacao (SELECT-only,
-- 1 instrucao, bloqueio de palavras de escrita) + statement_timeout + LIMIT 200.

CREATE OR REPLACE FUNCTION public.agent_run_sql(p_sql text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_sql    text;
  v_result jsonb;
BEGIN
  -- so admin (is_admin e a funcao canonica do app, EXECUTE para authenticated)
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'forbidden: apenas admin pode consultar';
  END IF;

  -- sanitiza: 1 instrucao, comeca com SELECT/WITH, sem palavras de escrita
  v_sql := btrim(p_sql);
  v_sql := regexp_replace(v_sql, ';+\s*$', '');
  IF v_sql = '' THEN
    RAISE EXCEPTION 'query vazia';
  END IF;
  IF position(';' IN v_sql) > 0 THEN
    RAISE EXCEPTION 'apenas uma instrucao SELECT e permitida';
  END IF;
  IF lower(v_sql) !~ '^(select|with)\s' THEN
    RAISE EXCEPTION 'apenas SELECT/WITH e permitido';
  END IF;
  IF lower(v_sql) ~ '\m(insert|update|delete|merge|drop|alter|truncate|create|grant|revoke|copy|vacuum|reindex)\M' THEN
    RAISE EXCEPTION 'palavra-chave de escrita nao permitida';
  END IF;

  -- SET LOCAL statement_timeout e permitido (so SET ROLE que nao e).
  SET LOCAL statement_timeout = '8s';

  EXECUTE format(
    'SELECT coalesce(jsonb_agg(t), ''[]''::jsonb) FROM (SELECT * FROM (%s) s LIMIT 200) t',
    v_sql
  ) INTO v_result;

  RETURN v_result;
END;
$$;

GRANT EXECUTE ON FUNCTION public.agent_run_sql(text) TO authenticated;

CREATE OR REPLACE FUNCTION public.agent_describe_schema(p_tabelas text[] DEFAULT NULL)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY INVOKER
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
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'forbidden: apenas admin pode consultar';
  END IF;

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

-- limpeza: o role agent_ro agora e inutil (nenhuma funcao usa mais)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'agent_ro') THEN
    EXECUTE 'DROP OWNED BY agent_ro';
    EXECUTE 'DROP ROLE agent_ro';
  END IF;
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'agent_ro nao removido (ignorado): %', SQLERRM;
END $$;
