-- ============================================================================
-- Vitória aprovada -> Case na Vitrine
--
-- Até aqui o Repositório de Vitórias (repositorio_vitorias) e a Vitrine
-- (vitrine_cases) não se falavam: os 143 cases vieram todos da importação do
-- sistema legado e o status 'case' do kanban era só um rótulo. Esta migration
-- cria o vínculo, a numeração de case_id para cases nascidos aqui dentro e a
-- RPC que o front chama a cada mudança de status no kanban.
--
-- A redação dos blocos editoriais (como_era_antes, principais_gargalos, ...)
-- fica a cargo da edge function vitrine-gerar-case; aqui só se marca
-- ia_status='gerando' para o card acender o selo animado.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1. Vínculo e proveniência
-- ----------------------------------------------------------------------------
ALTER TABLE public.vitrine_cases
  ADD COLUMN IF NOT EXISTS repositorio_vitoria_id uuid
    REFERENCES public.repositorio_vitorias(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS gerado_por_ia boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS ia_gerado_em timestamptz,
  -- 'gerando' é o que acende o selo animado no card do kanban. Fica no banco
  -- (e não só em estado do React) para sobreviver a reload e aparecer para quem
  -- abrir a tela em outra máquina; 'erro' deixa o retry visível.
  ADD COLUMN IF NOT EXISTS ia_status text,
  ADD COLUMN IF NOT EXISTS ia_erro text;

DO $$
BEGIN
  ALTER TABLE public.vitrine_cases
    ADD CONSTRAINT vitrine_cases_ia_status_check
    CHECK (ia_status IS NULL OR ia_status IN ('gerando','pronto','erro'));
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Índice único simples (não parcial) pelo mesmo motivo documentado em
-- 20260719d_vitoria_auto_repositorio.sql: NULLs são distintos, então os cases
-- legados convivem sem vínculo, e ON CONFLICT consegue inferir este índice.
CREATE UNIQUE INDEX IF NOT EXISTS vitrine_cases_repositorio_vitoria_uidx
  ON public.vitrine_cases(repositorio_vitoria_id);

-- Excluir a vitória NÃO apaga o case (ON DELETE SET NULL): o material já
-- revisado à mão vale mais que o registro de origem — o case vira um case
-- órfão, editável normalmente na aba Cases.

-- ----------------------------------------------------------------------------
-- 2. case_id dos cases nascidos no PMC OS
--    O formato VIT-089 veio do legado e não tinha sequência. Maior número em
--    uso na importação: 198 (143 cases, todos no padrão VIT-\d+).
-- ----------------------------------------------------------------------------
CREATE SEQUENCE IF NOT EXISTS public.vitrine_case_seq;

DO $$
DECLARE
  v_max  bigint;
  v_atual bigint;
BEGIN
  SELECT COALESCE(MAX(NULLIF(regexp_replace(case_id, '\D', '', 'g'), ''))::bigint, 0)
    INTO v_max FROM public.vitrine_cases;
  SELECT last_value INTO v_atual FROM public.vitrine_case_seq;
  -- Só empurra para frente; nunca reposiciona a sequência para trás (re-rodar a
  -- migration não pode fazer o próximo case_id colidir com um já emitido).
  IF v_max + 1 > COALESCE(v_atual, 0) THEN
    PERFORM setval('public.vitrine_case_seq', v_max + 1, false);
  END IF;
END $$;

CREATE OR REPLACE FUNCTION public.proximo_case_id()
RETURNS text
LANGUAGE plpgsql
AS $$
DECLARE
  v_id text;
  v_tentativas int := 0;
BEGIN
  LOOP
    v_id := 'VIT-' || lpad(nextval('public.vitrine_case_seq')::text, 3, '0');
    EXIT WHEN NOT EXISTS (SELECT 1 FROM public.vitrine_cases WHERE case_id = v_id);
    v_tentativas := v_tentativas + 1;
    IF v_tentativas > 1000 THEN
      RAISE EXCEPTION 'Não foi possível gerar um case_id livre após 1000 tentativas';
    END IF;
  END LOOP;
  RETURN v_id;
END;
$$;

-- ----------------------------------------------------------------------------
-- 3. RPC chamada pelo kanban a cada mudança de status
--    SECURITY INVOKER de propósito: repositorio_vitorias e vitrine_* já são
--    is_admin() na RLS, então a própria política protege as linhas — e evita o
--    gotcha de SET ROLE dentro de SECURITY DEFINER.
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.sincronizar_vitoria_vitrine(p_vitoria_id uuid)
RETURNS TABLE (vitrine_case_id uuid, criado boolean)
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  v          public.repositorio_vitorias%ROWTYPE;
  v_cli_id   uuid;
  v_case_id  uuid;
  v_existia  boolean := false;
  v_empresa  text;
  v_pessoa   text;
  v_codigo   bigint;
  v_nicho    text;
  v_subnicho text;
BEGIN
  IF NOT is_admin() THEN
    RAISE EXCEPTION 'Apenas o time pode sincronizar vitórias com a vitrine';
  END IF;

  SELECT * INTO v FROM public.repositorio_vitorias WHERE id = p_vitoria_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Vitória % não encontrada', p_vitoria_id;
  END IF;

  SELECT c.id INTO v_case_id
    FROM public.vitrine_cases c
   WHERE c.repositorio_vitoria_id = v.id;
  v_existia := v_case_id IS NOT NULL;

  -- Saiu da vitrine: tira do ar, mas preserva o case e o texto já revisado.
  IF v.status IN ('aguardando', 'reprovada') THEN
    IF v_existia THEN
      UPDATE public.vitrine_cases SET aprovado_vitrine = false WHERE id = v_case_id;
    END IF;
    RETURN QUERY SELECT v_case_id, false;
    RETURN;
  END IF;

  -- Daqui para baixo: status 'aprovada' ou 'case' -> entra na vitrine.
  IF v_existia THEN
    UPDATE public.vitrine_cases
       SET aprovado_vitrine = true, arquivado = false, arquivado_em = NULL
     WHERE id = v_case_id;
    RETURN QUERY SELECT v_case_id, false;
    RETURN;
  END IF;

  SELECT COALESCE(NULLIF(btrim(ce.nome_empresa_formatado), ''),
                  NULLIF(btrim(ce.nome_cliente_formatado), '')),
         NULLIF(btrim(ce.nome_cliente_formatado), ''),
         ce.codigo_cliente, ce.nicho, ce.subnicho
    INTO v_empresa, v_pessoa, v_codigo, v_nicho, v_subnicho
    FROM public.clientes_entrada_new ce
   WHERE ce.id_cliente = v.id_cliente;

  v_empresa := COALESCE(v_empresa, NULLIF(btrim(v.cliente_nome), ''), 'Cliente sem nome');

  -- Garante o cliente na ótica da vitrine (pode não existir: a base veio de um
  -- export antigo e clientes novos ainda não têm linha em vitrine_clientes).
  IF v.id_cliente IS NOT NULL THEN
    SELECT id INTO v_cli_id FROM public.vitrine_clientes
     WHERE id_cliente = v.id_cliente ORDER BY created_at LIMIT 1;
  END IF;

  IF v_cli_id IS NULL THEN
    INSERT INTO public.vitrine_clientes (
      id_cliente, codigo_cliente, empresa_nome, cliente_nome, nicho, subnicho,
      vinculo_status, vinculo_metodo
    ) VALUES (
      v.id_cliente, v_codigo, v_empresa, v_pessoa, v_nicho, v_subnicho,
      CASE WHEN v.id_cliente IS NULL THEN 'pendente' ELSE 'vinculado' END,
      'vitoria_aprovada'
    ) RETURNING id INTO v_cli_id;
  END IF;

  INSERT INTO public.vitrine_cases (
    case_id, vitrine_cliente_id, id_cliente, codigo_cliente, empresa_nome,
    headline_vitrine, resumo_executivo, categoria,
    aprovado_vitrine, arquivado, repositorio_vitoria_id, ia_status
  ) VALUES (
    public.proximo_case_id(), v_cli_id, v.id_cliente, v_codigo, v_empresa,
    v.titulo, NULLIF(btrim(COALESCE(v.descricao, '')), ''), NULLIF(btrim(COALESCE(v.area, '')), ''),
    true, false, v.id, 'gerando'
  )
  ON CONFLICT (repositorio_vitoria_id) DO UPDATE
    SET aprovado_vitrine = true, arquivado = false
  RETURNING id INTO v_case_id;

  RETURN QUERY SELECT v_case_id, true;
END;
$$;

GRANT EXECUTE ON FUNCTION public.sincronizar_vitoria_vitrine(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.proximo_case_id() TO authenticated;

NOTIFY pgrst, 'reload schema';
