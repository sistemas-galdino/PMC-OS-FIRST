-- Guardião: o link e o convite pertencem à EMPRESA, não ao login que criou.
--
-- Sintoma (RM Mineração, 435, 09/09/2026): a empresa mandou o assessment, cinco
-- pessoas responderam, e o painel mostrava "nenhuma resposta". As respostas
-- estavam salvas — só penduradas no dono errado.
--
-- Causa: as RPCs gravam `id_cliente = auth.uid()`, mas a leitura (policies e
-- telas) migrou para `meu_id_cliente()` na fase multi-empresa. Enquanto quem
-- gera o link é o dono (auth.uid() == id_cliente) os dois batem; quando é um
-- usuário adicional criado em Acessos — o caso da RM, com gerencia@ e
-- producao@ — o link nasce sob o uid da pessoa e some do painel da empresa.
-- De quebra o trigger notificar_assessment_respondido grava a notificação com o
-- mesmo id errado, então nem o sino toca.
--
-- Levantado no PROD antes desta migration: 36 de 138 share_links e 7 de 23
-- convites estavam no id de um login (18 logins distintos). Convites afetados:
-- RM 435 (5), Phoenix Insurance 411 (1), Victor Damasio 403 (1, conta de teste).
--
-- Decisões do David: links já distribuídos continuam válidos (por isso o UNIQUE
-- sai em vez de o órfão ser apagado), e o backfill cobre todos os afetados.
--
-- Ambientes: aplicada no PROD. No DEV o módulo de contratação está numa fase
-- anterior (não tem guardiao_share_links), então lá só vale o trecho de
-- guardiao_criar_convite — o resto entra junto quando o share link for promovido.

BEGIN;

-- 1) Um cliente pode ter mais de um link por tipo. O UNIQUE existia porque a
-- RPC usava ON CONFLICT; com o backfill ele quebraria os 8 casos em que a
-- empresa já tem link do mesmo tipo do órfão — e apagar o órfão invalidaria um
-- link que já está na mão das pessoas.
ALTER TABLE public.guardiao_share_links
  DROP CONSTRAINT IF EXISTS guardiao_share_links_id_cliente_type_key;
CREATE INDEX IF NOT EXISTS guardiao_share_links_id_cliente_type_idx
  ON public.guardiao_share_links (id_cliente, type);

-- 2) As RPCs passam a gravar pela empresa. O coalesce preserva o comportamento
-- antigo para login que ainda não esteja em empresa_usuarios.
CREATE OR REPLACE FUNCTION public.guardiao_get_or_create_share_link(p_type text)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_id_cliente uuid;
  v_token text;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'nao autenticado';
  END IF;
  IF p_type NOT IN ('interno','externo') THEN
    RAISE EXCEPTION 'tipo de avaliacao invalido: %', p_type;
  END IF;

  -- A empresa, não o login: um usuário adicional (Acessos) tem auth.uid()
  -- diferente do id_cliente, e é isso que fazia a resposta sumir do painel.
  v_id_cliente := coalesce(public.meu_id_cliente(), auth.uid());

  -- O link estável da empresa é o mais antigo; os outros continuam válidos e
  -- resolvem normalmente por guardiao_resolve_share (que busca por token).
  SELECT token INTO v_token
    FROM public.guardiao_share_links
   WHERE id_cliente = v_id_cliente AND type = p_type
   ORDER BY created_at
   LIMIT 1;

  IF v_token IS NULL THEN
    INSERT INTO public.guardiao_share_links (id_cliente, type)
    VALUES (v_id_cliente, p_type)
    RETURNING token INTO v_token;
  END IF;

  RETURN v_token;
END;
$function$;

CREATE OR REPLACE FUNCTION public.guardiao_criar_convite(p_type text)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_assessment_id uuid;
  v_token text;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'nao autenticado';
  END IF;
  IF p_type NOT IN ('interno','externo') THEN
    RAISE EXCEPTION 'tipo de avaliacao invalido: %', p_type;
  END IF;

  SELECT id INTO v_assessment_id
  FROM public.guardiao_assessments
  WHERE type = p_type
  ORDER BY version DESC
  LIMIT 1;

  IF v_assessment_id IS NULL THEN
    RAISE EXCEPTION 'assessment nao encontrado para o tipo: %', p_type;
  END IF;

  INSERT INTO public.guardiao_invites (id_cliente, assessment_id)
  VALUES (coalesce(public.meu_id_cliente(), auth.uid()), v_assessment_id)
  RETURNING token INTO v_token;

  RETURN v_token;
END;
$function$;

-- 3) Backfill do que já ficou órfão.
CREATE TABLE IF NOT EXISTS public.backup_guardiao_dono_20260909 (
  tabela       text NOT NULL,
  pk           text NOT NULL,
  valor_antigo uuid NOT NULL,
  valor_novo   uuid NOT NULL,
  criado_em    timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (tabela, pk)
);
ALTER TABLE public.backup_guardiao_dono_20260909 ENABLE ROW LEVEL SECURITY;
COMMENT ON TABLE public.backup_guardiao_dono_20260909 IS
  'Estado anterior ao backfill de titularidade do Guardião (20260909). Só para rollback.';

-- "Órfão" = id_cliente que não é empresa nenhuma (o dono tem auth.uid() ==
-- id_cliente, então a linha dele já está certa) e que é um auth_user_id com
-- vínculo em empresa_usuarios. Sem vínculo, fica como está — não há para onde
-- apontar sem chutar.
INSERT INTO public.backup_guardiao_dono_20260909 (tabela, pk, valor_antigo, valor_novo)
SELECT 'guardiao_share_links', s.id::text, s.id_cliente, eu.id_cliente
  FROM public.guardiao_share_links s
  JOIN public.empresa_usuarios eu ON eu.auth_user_id = s.id_cliente
 WHERE NOT EXISTS (SELECT 1 FROM public.clientes_formulario cf WHERE cf.id_cliente = s.id_cliente)
UNION ALL
SELECT 'guardiao_invites', i.id::text, i.id_cliente, eu.id_cliente
  FROM public.guardiao_invites i
  JOIN public.empresa_usuarios eu ON eu.auth_user_id = i.id_cliente
 WHERE NOT EXISTS (SELECT 1 FROM public.clientes_formulario cf WHERE cf.id_cliente = i.id_cliente)
UNION ALL
SELECT 'notificacoes', n.id::text, n.id_cliente, eu.id_cliente
  FROM public.notificacoes n
  JOIN public.empresa_usuarios eu ON eu.auth_user_id = n.id_cliente
 WHERE n.tipo = 'guardiao'
   AND NOT EXISTS (SELECT 1 FROM public.clientes_formulario cf WHERE cf.id_cliente = n.id_cliente)
ON CONFLICT (tabela, pk) DO NOTHING;

UPDATE public.guardiao_share_links s SET id_cliente = b.valor_novo
  FROM public.backup_guardiao_dono_20260909 b
 WHERE b.tabela = 'guardiao_share_links' AND s.id::text = b.pk AND s.id_cliente = b.valor_antigo;

UPDATE public.guardiao_invites i SET id_cliente = b.valor_novo
  FROM public.backup_guardiao_dono_20260909 b
 WHERE b.tabela = 'guardiao_invites' AND i.id::text = b.pk AND i.id_cliente = b.valor_antigo;

UPDATE public.notificacoes n SET id_cliente = b.valor_novo
  FROM public.backup_guardiao_dono_20260909 b
 WHERE b.tabela = 'notificacoes' AND n.id::text = b.pk AND n.id_cliente = b.valor_antigo;

COMMIT;

-- As RPCs mudaram de assinatura interna; sem isto a API pode responder
-- "Could not find the function in the schema cache" (gotcha de 2026-07-06).
NOTIFY pgrst, 'reload schema';
