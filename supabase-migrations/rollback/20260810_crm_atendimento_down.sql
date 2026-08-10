-- Rollback de 20260810_crm_atendimento.sql

DROP TRIGGER IF EXISTS crm_mensagens_touch_conversa ON public.crm_mensagens;
DROP FUNCTION IF EXISTS public.crm_mensagens_touch_conversa();
DROP TABLE IF EXISTS public.crm_mensagens;
DROP TABLE IF EXISTS public.crm_conversas;
