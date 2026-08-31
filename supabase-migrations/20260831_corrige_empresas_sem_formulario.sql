-- ============================================================================
-- Empresas cadastradas fora do padrão não conseguiam salvar nada
--
-- Sintoma relatado (RM Mineração, código 435): "Informações de Cadastro" devolve
-- `new row violates row-level security policy for table
-- "cliente_informacoes_empresa"`, e as abas do Mapeamento (Cenários, Produtos,
-- Canais, Objetivos) salvam e o dado some ao recarregar.
--
-- Causa: 4 empresas criadas em 25/08/2026 nasceram direto em
-- clientes_entrada_new, com um uuid novo em id_cliente e SEM a linha
-- correspondente em clientes_formulario. A edge function invite-client faz as
-- duas coisas (e usa o uuid do próprio auth.user como id_cliente); essas 4 não
-- passaram por ela.
--
-- Consequências, todas confirmadas no PROD:
--   * cliente_metas / cliente_produtos / cliente_canais /
--     cliente_objetivos_programa têm FK para clientes_formulario(id_cliente) —
--     sem a linha-mãe, toda gravação falha com 23503 (e o front engolia o erro).
--   * cliente_informacoes_empresa.id_cliente tem FK para auth.users(id), e o
--     id_cliente dessas 4 não é um auth.users — nunca aceitaria uma linha.
--   * codigo_cliente_seq é semeada com max(codigo_cliente) de
--     clientes_formulario (ver 20260803_excluir_cliente_completo.sql), então
--     quem está fora dessa tabela não é contado: os códigos 432 e 434 saíram
--     duplicados nos cadastros de 31/08.
--
-- A parte de RLS (se as policies ainda estiverem em auth.uid() em vez de
-- meu_id_cliente()) fica em migration separada, depois de conferir pg_policies.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1. Backfill em clientes_formulario
--    Genérico de propósito (não lista as 4 por uuid): pega qualquer empresa de
--    clientes_entrada_new sem par em clientes_formulario, então serve também
--    para qualquer caso antigo que apareça. Reexecutável pelo NOT EXISTS.
-- ----------------------------------------------------------------------------
INSERT INTO public.clientes_formulario (
  id_cliente, codigo_cliente,
  nome, nome_cliente_formatado,
  empresa_nome, nome_empresa_formatado,
  nicho, produto, canal_venda,
  mes_treinamento, ano_treinamento, unidade,
  tempo_contrato_meses, cnpj, telefone, estado
)
SELECT
  e.id_cliente, e.codigo_cliente,
  NULLIF(btrim(COALESCE(e.nome_cliente, e.nome_cliente_formatado, '')), ''),
  NULLIF(btrim(COALESCE(e.nome_cliente_formatado, e.nome_cliente, '')), ''),
  NULLIF(btrim(COALESCE(e.nome_empresa, e.nome_empresa_formatado, '')), ''),
  NULLIF(btrim(COALESCE(e.nome_empresa_formatado, e.nome_empresa, '')), ''),
  e.nicho, e.produto, e.canal_de_venda,
  e.mes_treinamento, e.ano_treinamento, e.unidade_treinamento,
  e.tempo_contrato, e.cnpj, e.telefone, e.estado_uf
FROM public.clientes_entrada_new e
WHERE e.codigo_cliente IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM public.clientes_formulario f WHERE f.id_cliente = e.id_cliente
  );

-- ----------------------------------------------------------------------------
-- 2. FK de cliente_informacoes_empresa: auth.users(id) -> clientes_formulario
--    Alinha com as outras 4 tabelas do mapeamento e é o único jeito de uma
--    empresa cujo id_cliente não é um auth.user ter uma linha aqui.
--    Seguro: as 160 linhas existentes já têm id_cliente em clientes_formulario
--    (conferido no PROD, 0 órfãs). Roda DEPOIS do passo 1 de propósito.
-- ----------------------------------------------------------------------------
DO $$
DECLARE
  v_conname text;
BEGIN
  -- O nome da constraint é gerado pelo Postgres; buscar por conrelid/confrelid
  -- em vez de chutar 'cliente_informacoes_empresa_id_cliente_fkey'.
  SELECT conname INTO v_conname
    FROM pg_constraint
   WHERE conrelid = 'public.cliente_informacoes_empresa'::regclass
     AND contype = 'f'
     AND confrelid = 'auth.users'::regclass;

  IF v_conname IS NOT NULL THEN
    EXECUTE format('ALTER TABLE public.cliente_informacoes_empresa DROP CONSTRAINT %I', v_conname);
  END IF;
END $$;

DO $$
BEGIN
  ALTER TABLE public.cliente_informacoes_empresa
    ADD CONSTRAINT cliente_informacoes_empresa_id_cliente_fkey
    FOREIGN KEY (id_cliente) REFERENCES public.clientes_formulario(id_cliente)
    ON DELETE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- ----------------------------------------------------------------------------
-- 3. Códigos duplicados
--    Decisão do David: quem já usa o código há mais tempo fica com ele; a
--    empresa cadastrada depois é renumerada. Escrito de forma genérica (mantém
--    o created_at mais antigo de cada código repetido) em vez de fixar os uuids
--    de Centrão Telecom e Febracis BH — assim é reexecutável e pega qualquer
--    outra duplicidade que apareça antes de aplicar.
-- ----------------------------------------------------------------------------
DO $$
DECLARE
  r      record;
  v_novo bigint;
BEGIN
  FOR r IN
    -- Para cada código repetido, todas as linhas MENOS a mais antiga.
    SELECT id_cliente, codigo_cliente
      FROM (
        SELECT e.id_cliente, e.codigo_cliente,
               row_number() OVER (PARTITION BY e.codigo_cliente
                                  ORDER BY e.created_at, e.id_entrada) AS pos
          FROM public.clientes_entrada_new e
         WHERE e.codigo_cliente IS NOT NULL
           AND e.codigo_cliente IN (
             SELECT codigo_cliente
               FROM public.clientes_entrada_new
              WHERE codigo_cliente IS NOT NULL
              GROUP BY codigo_cliente
             HAVING count(*) > 1
           )
      ) x
     WHERE x.pos > 1
     ORDER BY codigo_cliente
  LOOP
    SELECT GREATEST(
             COALESCE((SELECT MAX(codigo_cliente) FROM public.clientes_formulario), 0),
             COALESCE((SELECT MAX(codigo_cliente) FROM public.clientes_entrada_new), 0)
           ) + 1
      INTO v_novo;

    UPDATE public.clientes_formulario  SET codigo_cliente = v_novo WHERE id_cliente = r.id_cliente;
    UPDATE public.clientes_entrada_new SET codigo_cliente = v_novo WHERE id_cliente = r.id_cliente;
    RAISE NOTICE 'codigo_cliente % duplicado -> % (empresa %)', r.codigo_cliente, v_novo, r.id_cliente;
  END LOOP;
END $$;

-- Empurra a sequência para depois do novo máximo, senão o próximo cadastro
-- colide de novo. Só para frente, nunca para trás. E agora considera as DUAS
-- tabelas — considerar só clientes_formulario foi o que gerou a colisão.
DO $$
DECLARE
  v_max   bigint;
  v_atual bigint;
BEGIN
  IF to_regclass('public.codigo_cliente_seq') IS NULL THEN
    RAISE NOTICE 'sequence codigo_cliente_seq não encontrada — conferir proximo_codigo_cliente() à mão';
    RETURN;
  END IF;
  SELECT GREATEST(
           COALESCE((SELECT MAX(codigo_cliente) FROM public.clientes_formulario), 0),
           COALESCE((SELECT MAX(codigo_cliente) FROM public.clientes_entrada_new), 0)
         ) INTO v_max;
  SELECT last_value INTO v_atual FROM public.codigo_cliente_seq;
  IF v_max >= COALESCE(v_atual, 0) THEN
    PERFORM setval('public.codigo_cliente_seq', v_max, true);
  END IF;
END $$;

-- ----------------------------------------------------------------------------
-- 4. Rede de proteção: empresa nova sempre ganha a linha em clientes_formulario
--    invite-client já faz isso, mas essas 4 nasceram por fora (INSERT manual).
--    O trigger cobre qualquer caminho, inclusive SQL direto.
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.tg_garante_clientes_formulario()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.codigo_cliente IS NULL THEN
    RETURN NEW;
  END IF;

  INSERT INTO public.clientes_formulario (
    id_cliente, codigo_cliente,
    nome, nome_cliente_formatado,
    empresa_nome, nome_empresa_formatado,
    nicho, produto, canal_venda
  ) VALUES (
    NEW.id_cliente, NEW.codigo_cliente,
    NULLIF(btrim(COALESCE(NEW.nome_cliente, NEW.nome_cliente_formatado, '')), ''),
    NULLIF(btrim(COALESCE(NEW.nome_cliente_formatado, NEW.nome_cliente, '')), ''),
    NULLIF(btrim(COALESCE(NEW.nome_empresa, NEW.nome_empresa_formatado, '')), ''),
    NULLIF(btrim(COALESCE(NEW.nome_empresa_formatado, NEW.nome_empresa, '')), ''),
    NEW.nicho, NEW.produto, NEW.canal_de_venda
  )
  ON CONFLICT (id_cliente) DO NOTHING;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_garante_clientes_formulario ON public.clientes_entrada_new;
CREATE TRIGGER trg_garante_clientes_formulario
  AFTER INSERT ON public.clientes_entrada_new
  FOR EACH ROW EXECUTE FUNCTION public.tg_garante_clientes_formulario();

NOTIFY pgrst, 'reload schema';
