-- Desfaz a correção de titularidade do Guardião (20260909): volta as RPCs para
-- auth.uid(), devolve o UNIQUE e reaponta as linhas do backfill.
--
-- Só funciona enquanto backup_guardiao_dono_20260909 existir. O UNIQUE só volta
-- se, depois do rollback dos dados, não sobrar par (id_cliente, type) repetido.

BEGIN;

UPDATE public.guardiao_share_links s SET id_cliente = b.valor_antigo
  FROM public.backup_guardiao_dono_20260909 b
 WHERE b.tabela = 'guardiao_share_links' AND s.id::text = b.pk AND s.id_cliente = b.valor_novo;

UPDATE public.guardiao_invites i SET id_cliente = b.valor_antigo
  FROM public.backup_guardiao_dono_20260909 b
 WHERE b.tabela = 'guardiao_invites' AND i.id::text = b.pk AND i.id_cliente = b.valor_novo;

UPDATE public.notificacoes n SET id_cliente = b.valor_antigo
  FROM public.backup_guardiao_dono_20260909 b
 WHERE b.tabela = 'notificacoes' AND n.id::text = b.pk AND n.id_cliente = b.valor_novo;

CREATE OR REPLACE FUNCTION public.guardiao_get_or_create_share_link(p_type text)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_token text;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'nao autenticado';
  END IF;
  IF p_type NOT IN ('interno','externo') THEN
    RAISE EXCEPTION 'tipo de avaliacao invalido: %', p_type;
  END IF;

  INSERT INTO public.guardiao_share_links (id_cliente, type)
  VALUES (auth.uid(), p_type)
  ON CONFLICT (id_cliente, type) DO NOTHING;

  SELECT token INTO v_token
  FROM public.guardiao_share_links
  WHERE id_cliente = auth.uid() AND type = p_type;

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
  VALUES (auth.uid(), v_assessment_id)
  RETURNING token INTO v_token;

  RETURN v_token;
END;
$function$;

DROP INDEX IF EXISTS public.guardiao_share_links_id_cliente_type_idx;
ALTER TABLE public.guardiao_share_links
  ADD CONSTRAINT guardiao_share_links_id_cliente_type_key UNIQUE (id_cliente, type);

COMMIT;

NOTIFY pgrst, 'reload schema';
