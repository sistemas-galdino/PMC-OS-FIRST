-- =========================================================
-- Perfil do Guardiao — LINK UNICO por tipo (padrao Typeform)
-- Troca o modelo "1 token por candidato" (guardiao_criar_convite) por
-- DOIS links FIXOS e reutilizaveis por cliente (um 'interno', um 'externo').
-- Qualquer pessoa abre o mesmo link, preenche, e CADA envio cria um
-- convite+resultado novo (a identidade vem do formulario).
--
-- Convencoes seguidas (iguais a 20260703_guardiao_schema.sql):
--  * id_cliente = auth.uid() do dono, SEM FK, so indice.
--  * token: mesmo default da fonte — replace(gen_random_uuid()::text,'-','').
--  * RLS via is_admin() + auth.uid(); SEM policy anon (resolucao anonima e
--    feita pela RPC SECURITY DEFINER guardiao_resolve_share).
--  * RPC SECURITY DEFINER + SET search_path=public + GRANT EXECUTE
--    (ver 20260508_clientes_moeda.sql / update_minha_moeda).
-- =========================================================

-- ---------------------------------------------------------
-- 1) guardiao_share_links  (por cliente / admin)
--    UNIQUE (id_cliente, type): no maximo um link fixo por tipo por cliente.
-- ---------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.guardiao_share_links (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  id_cliente uuid NOT NULL,                       -- dono do link = auth.uid() (sem FK, padrao guardiao_invites)
  type text NOT NULL
    CHECK (type IN ('interno','externo')),
  token text NOT NULL UNIQUE
    DEFAULT replace(gen_random_uuid()::text, '-', ''),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (id_cliente, type)
);

CREATE INDEX IF NOT EXISTS guardiao_share_links_token_idx
  ON public.guardiao_share_links(token);
CREATE INDEX IF NOT EXISTS guardiao_share_links_id_cliente_idx
  ON public.guardiao_share_links(id_cliente);

ALTER TABLE public.guardiao_share_links ENABLE ROW LEVEL SECURITY;

-- Dono (cliente) ou admin: SELECT / INSERT / UPDATE / DELETE.
-- SEM policy anon: a resolucao anonima do token e via RPC SECURITY DEFINER.
DROP POLICY IF EXISTS guardiao_share_links_owner_select ON public.guardiao_share_links;
CREATE POLICY guardiao_share_links_owner_select ON public.guardiao_share_links
  FOR SELECT TO authenticated
  USING (id_cliente = auth.uid() OR is_admin());

DROP POLICY IF EXISTS guardiao_share_links_owner_insert ON public.guardiao_share_links;
CREATE POLICY guardiao_share_links_owner_insert ON public.guardiao_share_links
  FOR INSERT TO authenticated
  WITH CHECK (id_cliente = auth.uid() OR is_admin());

DROP POLICY IF EXISTS guardiao_share_links_owner_update ON public.guardiao_share_links;
CREATE POLICY guardiao_share_links_owner_update ON public.guardiao_share_links
  FOR UPDATE TO authenticated
  USING (id_cliente = auth.uid() OR is_admin())
  WITH CHECK (id_cliente = auth.uid() OR is_admin());

DROP POLICY IF EXISTS guardiao_share_links_owner_delete ON public.guardiao_share_links;
CREATE POLICY guardiao_share_links_owner_delete ON public.guardiao_share_links
  FOR DELETE TO authenticated
  USING (id_cliente = auth.uid() OR is_admin());

-- =========================================================
-- RPC: pega (ou cria) o link fixo do (auth.uid(), p_type) e devolve o token.
-- Idempotente: o UNIQUE (id_cliente, type) garante 1 link por tipo por cliente.
-- Espelha update_minha_moeda (SECURITY DEFINER + search_path + GRANT).
-- =========================================================
CREATE OR REPLACE FUNCTION public.guardiao_get_or_create_share_link(p_type text)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_token text;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'nao autenticado';
  END IF;
  IF p_type NOT IN ('interno','externo') THEN
    RAISE EXCEPTION 'tipo de avaliacao invalido: %', p_type;
  END IF;

  -- Upsert idempotente: se ja existe (id_cliente, type) mantem o token atual.
  INSERT INTO public.guardiao_share_links (id_cliente, type)
  VALUES (auth.uid(), p_type)
  ON CONFLICT (id_cliente, type) DO NOTHING;

  SELECT token INTO v_token
  FROM public.guardiao_share_links
  WHERE id_cliente = auth.uid() AND type = p_type;

  RETURN v_token;
END;
$$;

GRANT EXECUTE ON FUNCTION public.guardiao_get_or_create_share_link(text) TO authenticated;

-- =========================================================
-- RPC: resolucao anonima do share token (para o formulario publico).
-- A partir do token, junta guardiao_share_links -> pega o assessment daquele
-- type (guardiao_assessments por type, maior version) e devolve os dados.
-- SEM expor a tabela ao anon (SECURITY DEFINER).
-- =========================================================
CREATE OR REPLACE FUNCTION public.guardiao_resolve_share(p_token text)
RETURNS TABLE (
  id_cliente uuid,
  type text,
  assessment_id uuid,
  title text,
  description text
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT s.id_cliente, s.type, a.id, a.title, a.description
  FROM public.guardiao_share_links s
  JOIN public.guardiao_assessments a ON a.type = s.type
  WHERE s.token = p_token
  ORDER BY a.version DESC
  LIMIT 1;
$$;

GRANT EXECUTE ON FUNCTION public.guardiao_resolve_share(text) TO anon, authenticated;
