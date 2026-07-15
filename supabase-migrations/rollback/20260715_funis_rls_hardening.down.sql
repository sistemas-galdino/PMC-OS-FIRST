-- Rollback de 20260715_funis_rls_hardening.sql
-- Restaura as policies permissivas ORIGINAIS (USING(true) sem TO) das 3 tabelas funis_*.
-- ATENÇÃO: isto REABRE o vazamento (anon lê/escreve). Use só para voltar ao estado exato
-- anterior ao hardening; o correto é manter o hardening aplicado.

-- ============================================================
-- 1) funis_social_selling
-- ============================================================
DROP POLICY IF EXISTS funis_social_selling_admin_all ON public.funis_social_selling;
CREATE POLICY "Anyone select funis_social_selling" ON public.funis_social_selling FOR SELECT USING (true);
CREATE POLICY "Anyone insert funis_social_selling" ON public.funis_social_selling FOR INSERT WITH CHECK (true);
CREATE POLICY "Anyone update funis_social_selling" ON public.funis_social_selling FOR UPDATE USING (true) WITH CHECK (true);
CREATE POLICY "Anyone delete funis_social_selling" ON public.funis_social_selling FOR DELETE USING (true);

-- ============================================================
-- 2) funis_aplicacao
-- ============================================================
DROP POLICY IF EXISTS funis_aplicacao_admin_all ON public.funis_aplicacao;
CREATE POLICY "Anyone select funis_aplicacao" ON public.funis_aplicacao FOR SELECT USING (true);
CREATE POLICY "Anyone insert funis_aplicacao" ON public.funis_aplicacao FOR INSERT WITH CHECK (true);
CREATE POLICY "Anyone update funis_aplicacao" ON public.funis_aplicacao FOR UPDATE USING (true) WITH CHECK (true);
CREATE POLICY "Anyone delete funis_aplicacao" ON public.funis_aplicacao FOR DELETE USING (true);

-- ============================================================
-- 3) funis_eventos
-- ============================================================
DROP POLICY IF EXISTS funis_eventos_admin_all ON public.funis_eventos;
CREATE POLICY "Anyone select funis_eventos" ON public.funis_eventos FOR SELECT USING (true);
CREATE POLICY "Anyone insert funis_eventos" ON public.funis_eventos FOR INSERT WITH CHECK (true);
CREATE POLICY "Anyone update funis_eventos" ON public.funis_eventos FOR UPDATE USING (true) WITH CHECK (true);
CREATE POLICY "Anyone delete funis_eventos" ON public.funis_eventos FOR DELETE USING (true);
