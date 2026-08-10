-- Rollback de 20260810_crm_clientes_colunas.sql

DROP FUNCTION IF EXISTS public.crm_meu_nome();

DROP INDEX IF EXISTS public.clientes_entrada_new_data_idx;
DROP INDEX IF EXISTS public.clientes_entrada_new_sc_status_idx;

ALTER TABLE public.clientes_entrada_new
  DROP COLUMN IF EXISTS situacao,
  DROP COLUMN IF EXISTS guardiao_ia_etapa,
  DROP COLUMN IF EXISTS guardiao_ia_etapa_desde,
  DROP COLUMN IF EXISTS blackcrm_status_impl_desde,
  DROP COLUMN IF EXISTS area_membros_acesso_cliente,
  DROP COLUMN IF EXISTS area_membros_acesso_equipe,
  DROP COLUMN IF EXISTS area_membros_ultimo_acesso,
  DROP COLUMN IF EXISTS pausado,
  DROP COLUMN IF EXISTS pausado_motivo,
  DROP COLUMN IF EXISTS pausado_em,
  DROP COLUMN IF EXISTS pausado_por,
  DROP COLUMN IF EXISTS whatsapp_grupo_id,
  DROP COLUMN IF EXISTS whatsapp_grupo_nome,
  DROP COLUMN IF EXISTS ciclo_galdino_cadencia,
  DROP COLUMN IF EXISTS data_backfilled;
