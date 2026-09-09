-- Rollback de 20260909_whatsapp_grupo_convite.sql
DROP INDEX IF EXISTS public.crm_whatsapp_grupos_sem_convite_idx;
ALTER TABLE public.crm_whatsapp_grupos
  DROP COLUMN IF EXISTS convite_url,
  DROP COLUMN IF EXISTS convite_em;
ALTER TABLE public.clientes_entrada_new
  DROP COLUMN IF EXISTS whatsapp_grupo_convite;
