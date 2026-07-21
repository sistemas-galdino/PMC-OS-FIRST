-- Rollback: tipos de reunião por consultor + assunto na reunião BlackCRM.
-- Reverta na ordem: view (remove a coluna 'assunto') → grant → colunas.
-- Tudo com IF EXISTS, seguro mesmo com a migration parcialmente aplicada.

-- ============================================
-- 1. View volta ao formato anterior (sem 'assunto').
--    Precisa DROP + CREATE: CREATE OR REPLACE não remove coluna do fim.
-- ============================================
DROP VIEW IF EXISTS public.agendamentos_central;
CREATE VIEW public.agendamentos_central
WITH (security_invoker = true) AS
SELECT
  rg.id_unico::text AS id_unico,
  'galdino'::text AS origem,
  rg.id_reuniao,
  rg.data_reuniao,
  rg.horario,
  'Galdino'::text AS consultor_nome,
  rg.cliente_email,
  rg.pessoa AS cliente_nome,
  rg.empresa,
  rg.status_agendamento,
  rg.duracao_minutos,
  rg.link_meet,
  rg.link_gravacao,
  rg.link_geminidoc,
  rg.cliente_telefone,
  rg.id_cliente::text AS id_cliente,
  rg.codigo_cliente,
  rg.observacoes,
  rg.cliente_compareceu,
  rg.created_at AS criado_em,
  rg.updated_at AS atualizado_em
FROM public.reunioes_galdino rg

UNION ALL

SELECT
  rm.id_unico::text AS id_unico,
  'mentoria'::text AS origem,
  rm.id_reuniao,
  rm.data_reuniao,
  rm.horario,
  rm.mentor AS consultor_nome,
  rm.cliente_email,
  rm.pessoa AS cliente_nome,
  rm.empresa,
  rm.status_agendamento,
  rm.duracao_minutos,
  rm.link_meet,
  rm.link_gravacao,
  rm.link_geminidoc,
  rm.cliente_telefone,
  rm.id_cliente::text AS id_cliente,
  rm.codigo_cliente,
  rm.observacoes,
  rm.cliente_compareceu,
  rm.created_at AS criado_em,
  rm.updated_at AS atualizado_em
FROM public.reunioes_mentoria_new rm

UNION ALL

SELECT
  rb.id_unico AS id_unico,
  'blackcrm'::text AS origem,
  rb.id_reuniao,
  CASE WHEN rb.data_reuniao ~ '^\d{4}-\d{2}-\d{2}' THEN rb.data_reuniao::date ELSE NULL END AS data_reuniao,
  CASE WHEN rb.horario ~ '^\d{1,2}:\d{2}(:\d{2})?$' THEN rb.horario::time ELSE NULL END AS horario,
  rb.responsavel AS consultor_nome,
  rb.cliente_email,
  rb.pessoa AS cliente_nome,
  rb.empresa,
  rb.status_agendamento,
  rb.duracao_minutos,
  rb.link_meet,
  rb.link_gravacao,
  rb.link_geminidoc,
  rb.cliente_telefone,
  rb.id_cliente,
  rb.codigo_cliente::int AS codigo_cliente,
  rb.observacoes,
  rb.cliente_compareceu,
  CASE WHEN rb.created_at ~ '^\d{4}' THEN rb.created_at::timestamptz ELSE NULL END AS criado_em,
  rb.updated_at AS atualizado_em
FROM public.reunioes_blackcrm rb;

GRANT SELECT ON public.agendamentos_central TO authenticated;

-- ============================================
-- 2. Remove grant e colunas (o seed do Léo some junto com a coluna).
-- ============================================
REVOKE SELECT (tipos_reuniao) ON public.consultores_atendimento FROM anon;
ALTER TABLE public.reunioes_blackcrm DROP COLUMN IF EXISTS assunto;
ALTER TABLE public.consultores_atendimento DROP COLUMN IF EXISTS tipos_reuniao;

NOTIFY pgrst, 'reload schema';
