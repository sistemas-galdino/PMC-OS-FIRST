-- Rollback de 20260908d_crm_whatsapp_rls_carteira.sql
-- Volta às policies de 20260810_crm_atendimento.sql (todo membro do time vê tudo).
BEGIN;

DROP POLICY IF EXISTS crm_conversas_carteira ON public.crm_conversas;
CREATE POLICY crm_conversas_admin ON public.crm_conversas
  FOR ALL TO authenticated USING (is_admin()) WITH CHECK (is_admin());

DROP POLICY IF EXISTS crm_mensagens_carteira ON public.crm_mensagens;
CREATE POLICY crm_mensagens_admin ON public.crm_mensagens
  FOR ALL TO authenticated USING (is_admin()) WITH CHECK (is_admin());

COMMIT;
