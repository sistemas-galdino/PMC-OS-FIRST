-- =========================================================
-- ROLLBACK de 20260706_guardiao_share_links.sql
-- Desfaz o modelo de LINK UNICO por tipo (padrao Typeform).
-- Ordem reversa: RPCs -> policies -> tabela. Tudo com IF EXISTS.
-- (O DROP TABLE leva junto policies/indices/constraints.)
-- =========================================================

-- 1) RPCs (functions)
DROP FUNCTION IF EXISTS public.guardiao_resolve_share(text);
DROP FUNCTION IF EXISTS public.guardiao_get_or_create_share_link(text);

-- 2) Policies (redundante com o DROP TABLE, mas explicito p/ ambientes parciais)
DROP POLICY IF EXISTS guardiao_share_links_owner_delete ON public.guardiao_share_links;
DROP POLICY IF EXISTS guardiao_share_links_owner_update ON public.guardiao_share_links;
DROP POLICY IF EXISTS guardiao_share_links_owner_insert ON public.guardiao_share_links;
DROP POLICY IF EXISTS guardiao_share_links_owner_select ON public.guardiao_share_links;

-- 3) Tabela
DROP TABLE IF EXISTS public.guardiao_share_links;
