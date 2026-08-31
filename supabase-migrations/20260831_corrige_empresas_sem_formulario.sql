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
--     quem está fora dessa tabela não é contado: os cadastros de 31/08
--     reaproveitaram 432, 434 e 435. A cada cliente novo nasce mais uma
--     colisão — Paulinho Sorvetes (435) surgiu no meio desta investigação.
--
-- As policies NÃO são o problema: conferido em pg_policies, as 5 tabelas já
-- estão em `meu_id_cliente() = id_cliente OR is_admin()`, e simulando o JWT da
-- cliente o WITH CHECK passa. Provado por teste (insert abortado por exceção):
-- com o id_cliente certo o erro é 23503 (FK), não RLS. A mensagem de RLS que ela
-- viu vem do fallback `?? session.user.id` do front, que grava com o uuid da
-- PESSOA em vez do da EMPRESA — ver a seção 5.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1. Códigos duplicados
--    Vem ANTES do backfill de propósito: clientes_formulario tem UNIQUE em
--    codigo_cliente, então inserir a RM com o 435 — que no PROD já era do
--    Paulinho Sorvetes — estoura 23505. (Foi exatamente assim que a primeira
--    tentativa de aplicar esta migration falhou, sem alterar nada.)
--
--    Decisão do David: quem usa o código há mais tempo fica com ele; a empresa
--    cadastrada depois é renumerada. Aqui isso significa que as 4 de 25/08
--    mantêm 432/434/435/436 e as de 31/08 (Centrão Telecom, Febracis BH,
--    Paulinho Sorvetes) recebem códigos novos.
--
--    A disputa é avaliada sobre a UNIÃO das duas tabelas — uma empresa pode
--    reivindicar um código estando só em clientes_entrada_new, que é justamente
--    o caso das 4. Reexecutável: depois de rodar, nenhum código tem 2 donos e o
--    laço não entra.
-- ----------------------------------------------------------------------------
DO $$
DECLARE
  r      record;
  v_novo bigint;
BEGIN
  FOR r IN
    WITH claim AS (
      SELECT e.id_cliente, e.codigo_cliente, e.created_at
        FROM public.clientes_entrada_new e WHERE e.codigo_cliente IS NOT NULL
      UNION ALL
      SELECT f.id_cliente, f.codigo_cliente, f.created_at
        FROM public.clientes_formulario f WHERE f.codigo_cliente IS NOT NULL
    ), emp AS (
      SELECT id_cliente, min(codigo_cliente) AS codigo, min(created_at) AS nasceu
        FROM claim GROUP BY id_cliente
    ), ranked AS (
      SELECT id_cliente, codigo, nasceu,
             row_number() OVER (PARTITION BY codigo ORDER BY nasceu, id_cliente) AS pos
        FROM emp
    )
    SELECT id_cliente, codigo FROM ranked WHERE pos > 1 ORDER BY codigo
  LOOP
    SELECT GREATEST(
             COALESCE((SELECT MAX(codigo_cliente) FROM public.clientes_formulario), 0),
             COALESCE((SELECT MAX(codigo_cliente) FROM public.clientes_entrada_new), 0)
           ) + 1
      INTO v_novo;

    UPDATE public.clientes_formulario  SET codigo_cliente = v_novo WHERE id_cliente = r.id_cliente;
    UPDATE public.clientes_entrada_new SET codigo_cliente = v_novo WHERE id_cliente = r.id_cliente;
    RAISE NOTICE 'codigo_cliente % disputado -> % (empresa %)', r.codigo, v_novo, r.id_cliente;
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
-- 2. Backfill em clientes_formulario
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
-- 3. FK de cliente_informacoes_empresa: auth.users(id) -> clientes_formulario
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

-- ----------------------------------------------------------------------------
-- 5. meu_id_cliente(): quarto ramo para clientes_formulario
--
--    Motivo: 6 logins existem em clientes_formulario mas NÃO em
--    clientes_entrada_new (ex.: Lisiana Carraro 323, Puro Trato 401). Para eles
--    a função devolvia NULL, e quem salvava a situação era o fallback
--    `?? session.user.id` do auth-context — que por acaso acerta no cliente
--    legado (id_cliente == uid) e erra feio em empresa cadastrada fora do
--    padrão, gravando com o uuid da pessoa em vez do da empresa. É exatamente
--    esse fallback que produz a mensagem de RLS que a cliente da RM viu, em vez
--    do erro de FK.
--
--    O ramo novo entra por último no coalesce: não muda nenhuma resolução que
--    já funcionava, só preenche onde antes era NULL.
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.meu_id_cliente()
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(
    (SELECT ea.id_cliente
       FROM empresa_ativa ea
       JOIN empresa_usuarios eu
         ON eu.auth_user_id = ea.auth_user_id
        AND eu.id_cliente   = ea.id_cliente
      WHERE ea.auth_user_id = auth.uid()),
    (SELECT eu.id_cliente
       FROM empresa_usuarios eu
      WHERE eu.auth_user_id = auth.uid()
      ORDER BY eu.criado_em, eu.id_cliente
      LIMIT 1),
    (SELECT e.id_cliente FROM clientes_entrada_new e WHERE e.id_cliente = auth.uid()),
    (SELECT f.id_cliente FROM clientes_formulario f WHERE f.id_cliente = auth.uid())
  );
$$;

NOTIFY pgrst, 'reload schema';
