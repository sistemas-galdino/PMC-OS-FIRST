-- Rollback de 20260816_central_sucesso_cliente.sql
--
-- ATENÇÃO: o DROP COLUMN leva junto a CLASSIFICAÇÃO das reuniões de CS (o
-- backfill). Se rodar isto, as reuniões do Sucesso do Cliente voltam a contar
-- como consultoria nas telas do cliente. Os aliases (nomes_match) de
-- geovana-onboarding / francielly-onboarding NÃO são revertidos de propósito:
-- eles só evitam agendamento duplo e não dependem desta feature.
--
-- Ordem inversa da migration.

-- 1. RBAC
DELETE FROM public.papel_secoes WHERE secao_chave = 'central-sucesso-cliente';
DELETE FROM public.secoes_catalogo WHERE chave = 'central-sucesso-cliente';

-- 2. View volta ao corpo de 20260721_consultor_tipos_reuniao.sql (sem 'equipe').
--    CREATE OR REPLACE não remove coluna → precisa de DROP + CREATE.
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
  rg.updated_at AS atualizado_em,
  NULL::text AS assunto
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
  rm.updated_at AS atualizado_em,
  NULL::text AS assunto
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
  rb.updated_at AS atualizado_em,
  rb.assunto
FROM public.reunioes_blackcrm rb;

GRANT SELECT ON public.agendamentos_central TO authenticated;

-- 3. Trigger de classificação
DROP TRIGGER IF EXISTS reunioes_mentoria_set_equipe ON public.reunioes_mentoria_new;
DROP FUNCTION IF EXISTS public.set_equipe_reuniao_mentoria();

-- 4. Grant column-scoped do anon
REVOKE SELECT (equipe) ON public.consultores_atendimento FROM anon;

-- 5. Colunas (levam índices, CHECKs e o backfill junto)
DROP INDEX IF EXISTS public.reunioes_mentoria_new_equipe_cs_idx;
ALTER TABLE public.reunioes_mentoria_new DROP COLUMN IF EXISTS equipe;

DROP INDEX IF EXISTS public.consultores_atendimento_equipe_idx;
ALTER TABLE public.consultores_atendimento DROP COLUMN IF EXISTS equipe;

NOTIFY pgrst, 'reload schema';
