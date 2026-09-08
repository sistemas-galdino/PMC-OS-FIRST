-- CRM / Atendimento — RLS por carteira em crm_conversas e crm_mensagens.
--
-- POR QUE
-- A policy que existia era `FOR ALL TO authenticated USING (is_admin())`, e
-- is_admin() só verifica se a pessoa existe em `mentores`. Enquanto as tabelas
-- estavam vazias isso era inofensivo. Com conversa real de cliente dentro, é
-- vazamento: as quatro CS leriam a carteira umas das outras, e a segmentação
-- ficava só no cliente (atendimento.tsx), que qualquer um contorna pela API.
--
-- REGRA
--   coordenação (papel is_full) .... vê tudo
--   grupo interno do PMC ........... todo o time vê
--   grupo de cliente ............... só a CS dona da carteira
--   grupo sem cs_responsavel ....... só a coordenação (é a fila de "sem dono")
--
-- ORDEM DE APLICAÇÃO — IMPORTANTE
-- Esta migration EXIGE que crm_conversas.cs_responsavel já esteja populado
-- (é o que crm-whatsapp-sync-grupos faz). Aplicar antes do sync deixa toda CS
-- vendo zero conversas. Em PROD, aplique DEPOIS do sync de grupos e ANTES de
-- ligar o webhook de mensagens.

BEGIN;

DROP POLICY IF EXISTS crm_conversas_admin ON public.crm_conversas;
DROP POLICY IF EXISTS crm_conversas_carteira ON public.crm_conversas;
CREATE POLICY crm_conversas_carteira ON public.crm_conversas
  FOR ALL TO authenticated
  USING (
    (SELECT public.crm_ve_todas_carteiras())
    OR interno
    OR cs_responsavel = (SELECT public.crm_minha_carteira())
  )
  WITH CHECK (
    (SELECT public.crm_ve_todas_carteiras())
    OR interno
    OR cs_responsavel = (SELECT public.crm_minha_carteira())
  );

-- As chamadas ficam em subquery de propósito: viram InitPlan e são avaliadas
-- uma vez por statement, não uma vez por linha. Mesma convenção de
-- 20260907_permissoes_cliente_rls_sensiveis.sql.
DROP POLICY IF EXISTS crm_mensagens_admin ON public.crm_mensagens;
DROP POLICY IF EXISTS crm_mensagens_carteira ON public.crm_mensagens;
CREATE POLICY crm_mensagens_carteira ON public.crm_mensagens
  FOR ALL TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.crm_conversas c
     WHERE c.id = conversa_id
       AND ((SELECT public.crm_ve_todas_carteiras())
            OR c.interno
            OR c.cs_responsavel = (SELECT public.crm_minha_carteira()))
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.crm_conversas c
     WHERE c.id = conversa_id
       AND ((SELECT public.crm_ve_todas_carteiras())
            OR c.interno
            OR c.cs_responsavel = (SELECT public.crm_minha_carteira()))
  ));

COMMIT;
