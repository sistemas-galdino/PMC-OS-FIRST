-- Rollback de 20260908_crm_whatsapp_instancias.sql
--
-- Ordem: view -> tabelas novas -> colunas -> constraints -> funções.
-- A view crm_conversas_v é RECRIADA na forma anterior (20260810_crm_conversas_view.sql),
-- não apenas dropada: /crm/atendimento depende dela.

BEGIN;

DROP VIEW IF EXISTS public.crm_whatsapp_instancias_v;
DROP TABLE IF EXISTS public.crm_whatsapp_eventos;
DROP TABLE IF EXISTS public.crm_whatsapp_grupos;
DROP TABLE IF EXISTS public.crm_whatsapp_instancias;

-- crm_mensagens: volta ao CHECK original antes de dropar as colunas.
ALTER TABLE public.crm_mensagens DROP CONSTRAINT IF EXISTS crm_mensagens_status_envio_check;
UPDATE public.crm_mensagens SET status_envio = 'enviada'
 WHERE status_envio IN ('entregue','lida');
ALTER TABLE public.crm_mensagens ADD CONSTRAINT crm_mensagens_status_envio_check
  CHECK (status_envio IN ('recebida','pendente','enviada','falhou'));

ALTER TABLE public.crm_mensagens
  DROP COLUMN IF EXISTS instancia,
  DROP COLUMN IF EXISTS autor_jid,
  DROP COLUMN IF EXISTS autor_lid,
  DROP COLUMN IF EXISTS tipo,
  DROP COLUMN IF EXISTS enviada_por_mentor_id,
  DROP COLUMN IF EXISTS raw;

DROP INDEX IF EXISTS public.crm_conversas_cs_idx;
DROP INDEX IF EXISTS public.crm_conversas_interno_idx;
ALTER TABLE public.crm_conversas DROP CONSTRAINT IF EXISTS crm_conversas_tipo_check;
ALTER TABLE public.crm_conversas
  DROP COLUMN IF EXISTS interno,
  DROP COLUMN IF EXISTS tipo,
  DROP COLUMN IF EXISTS instancia_origem,
  DROP COLUMN IF EXISTS instancia_envio,
  DROP COLUMN IF EXISTS codigo_cliente,
  DROP COLUMN IF EXISTS participantes,
  DROP COLUMN IF EXISTS sincronizado_em;

-- View na forma anterior.
DROP VIEW IF EXISTS public.crm_conversas_v;
CREATE VIEW public.crm_conversas_v
WITH (security_invoker = true) AS
  SELECT
    c.id, c.grupo_id, c.grupo_nome, c.id_cliente, c.cs_responsavel,
    c.arquivada, c.ultima_mensagem_em,
    u.id AS ultima_id, u.autor AS ultima_autor, u.da_cs AS ultima_da_cs,
    u.texto AS ultima_texto, u.em AS ultima_em,
    u.anexo_nome AS ultima_anexo_nome, u.anexo_tipo AS ultima_anexo_tipo,
    coalesce(n.nao_lidas, 0) AS nao_lidas
  FROM public.crm_conversas c
  LEFT JOIN LATERAL (
    SELECT m.id, m.autor, m.da_cs, m.texto, m.em, m.anexo_nome, m.anexo_tipo
      FROM public.crm_mensagens m
     WHERE m.conversa_id = c.id
     ORDER BY m.em DESC, m.created_at DESC
     LIMIT 1
  ) u ON true
  LEFT JOIN LATERAL (
    SELECT count(*) AS nao_lidas
      FROM public.crm_mensagens m
     WHERE m.conversa_id = c.id AND NOT m.da_cs
       AND m.em > coalesce(
             (SELECT max(x.em) FROM public.crm_mensagens x
               WHERE x.conversa_id = c.id AND x.da_cs), '-infinity'::timestamptz)
  ) n ON true;
GRANT SELECT ON public.crm_conversas_v TO authenticated;

DROP FUNCTION IF EXISTS public.crm_ve_todas_carteiras();
DROP FUNCTION IF EXISTS public.crm_minha_carteira();
DROP FUNCTION IF EXISTS public.crm_meu_mentor_id();

COMMIT;
