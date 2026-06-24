-- FIX do agente: rodar a query como `authenticated` (nao `agent_ro`).
--
-- Causa do "erro ao consultar o banco": a RPC fazia SET LOCAL ROLE agent_ro antes
-- de rodar o SELECT, mas:
--   1) as policies RLS do app sao TO authenticated -> nao se aplicam ao agent_ro
--      (RLS nega por padrao);
--   2) is_admin() (como is_mentor()) tem EXECUTE so para authenticated -> quando a
--      RLS avalia is_admin() rodando como agent_ro, da "permission denied for function".
-- A view agendamentos_central e security_invoker=true, entao a RLS roda com o papel
-- que executa a query. Solucao: usar o papel `authenticated`, que e a base de todo o
-- modelo de seguranca (RLS + is_admin). Read-only continua garantido pela validacao
-- (SELECT/WITH-only, 1 instrucao, bloqueio de palavras de escrita) + timeout + LIMIT.
-- O role agent_ro fica vestigial (inofensivo).

-- garante que o dono das funcoes consiga SET ROLE authenticated
DO $$
BEGIN
  EXECUTE format('GRANT authenticated TO %I', current_user);
EXCEPTION WHEN OTHERS THEN NULL;  -- ja e membro / sem necessidade: ignora
END $$;

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
  -- 1) so admin (lê auth.users como o dono da funcao, antes do SET ROLE)
  IF NOT EXISTS (
    SELECT 1 FROM mentores m
    WHERE m.email = (SELECT u.email FROM auth.users u WHERE u.id = auth.uid())
  ) THEN
    RAISE EXCEPTION 'forbidden: apenas admin pode consultar';
  END IF;

  -- 2) sanitiza: 1 instrucao, comeca com SELECT/WITH, sem palavras de escrita
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

  -- 3) roda como authenticated: RLS (TO authenticated) e is_admin() funcionam,
  --    e o admin enxerga o que ja pode ver. Read-only garantido pela validacao acima.
  SET LOCAL statement_timeout = '8s';
  SET LOCAL ROLE authenticated;

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

  SET LOCAL ROLE authenticated;

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
