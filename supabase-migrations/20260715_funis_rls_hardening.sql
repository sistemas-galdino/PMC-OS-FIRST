-- Hardening RLS das tabelas funis_* (Social Selling, Aplicação, Eventos).
-- ANTES: policies "Anyone select/insert/update/delete ... USING(true)" SEM cláusula TO
--        => aplicavam a public (inclui anon) => qualquer um com a anon key lia/escrevia
--           métricas internas (revenue, ad_spend, sales_made, conversões de evento).
-- DEPOIS: acesso restrito a admin autenticado (is_admin()), como o resto do painel admin.
--         Mantém o comportamento "todos os admins compartilham os mesmos registros".
-- Não altera colunas, triggers, realtime nem dados — só troca as policies.

-- ============================================================
-- 1) funis_social_selling
-- ============================================================
DROP POLICY IF EXISTS "Anyone select funis_social_selling" ON public.funis_social_selling;
DROP POLICY IF EXISTS "Anyone insert funis_social_selling" ON public.funis_social_selling;
DROP POLICY IF EXISTS "Anyone update funis_social_selling" ON public.funis_social_selling;
DROP POLICY IF EXISTS "Anyone delete funis_social_selling" ON public.funis_social_selling;
DROP POLICY IF EXISTS funis_social_selling_admin_all ON public.funis_social_selling;
CREATE POLICY funis_social_selling_admin_all ON public.funis_social_selling
  FOR ALL TO authenticated
  USING (is_admin())
  WITH CHECK (is_admin());

-- ============================================================
-- 2) funis_aplicacao
-- ============================================================
DROP POLICY IF EXISTS "Anyone select funis_aplicacao" ON public.funis_aplicacao;
DROP POLICY IF EXISTS "Anyone insert funis_aplicacao" ON public.funis_aplicacao;
DROP POLICY IF EXISTS "Anyone update funis_aplicacao" ON public.funis_aplicacao;
DROP POLICY IF EXISTS "Anyone delete funis_aplicacao" ON public.funis_aplicacao;
DROP POLICY IF EXISTS funis_aplicacao_admin_all ON public.funis_aplicacao;
CREATE POLICY funis_aplicacao_admin_all ON public.funis_aplicacao
  FOR ALL TO authenticated
  USING (is_admin())
  WITH CHECK (is_admin());

-- ============================================================
-- 3) funis_eventos
-- ============================================================
DROP POLICY IF EXISTS "Anyone select funis_eventos" ON public.funis_eventos;
DROP POLICY IF EXISTS "Anyone insert funis_eventos" ON public.funis_eventos;
DROP POLICY IF EXISTS "Anyone update funis_eventos" ON public.funis_eventos;
DROP POLICY IF EXISTS "Anyone delete funis_eventos" ON public.funis_eventos;
DROP POLICY IF EXISTS funis_eventos_admin_all ON public.funis_eventos;
CREATE POLICY funis_eventos_admin_all ON public.funis_eventos
  FOR ALL TO authenticated
  USING (is_admin())
  WITH CHECK (is_admin());
