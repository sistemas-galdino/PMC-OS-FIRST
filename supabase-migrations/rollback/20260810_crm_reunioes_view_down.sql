-- Rollback de 20260810_crm_reunioes_view.sql

DROP VIEW IF EXISTS public.crm_reunioes_v;
DROP FUNCTION IF EXISTS public.crm_safe_time(text);
DROP FUNCTION IF EXISTS public.crm_safe_uuid(text);
DROP FUNCTION IF EXISTS public.crm_safe_date(text);
