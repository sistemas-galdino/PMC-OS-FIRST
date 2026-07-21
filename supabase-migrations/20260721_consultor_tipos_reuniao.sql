-- Tipos de reunião por consultor (assunto escolhido no link público).
--
-- Contexto: o consultor Leonardo (cadastrado como "Léo", slug 'leo') passa a
-- oferecer DOIS assuntos na MESMA agenda de tutoria: "BlackCRM" e "Consultoria
-- de vídeos com IA". Ao abrir /atendimento/leo, o cliente escolhe o assunto ANTES
-- de ver os horários (que são os mesmos — assunto é ortogonal à disponibilidade).
--
-- Modelagem:
--  1. consultores_atendimento.tipos_reuniao (jsonb) = lista de {slug,label,descricao?}
--     configurável no admin. Consultor com <2 itens NÃO mostra o passo (fluxo atual).
--  2. reunioes_blackcrm.assunto (text) = o label escolhido pelo cliente, gravado por
--     agendamento (o CHECK de tipo_reuniao só aceita implementacao|tutoria, por isso
--     coluna nova).
--  3. View agendamentos_central expõe 'assunto' (blackcrm; NULL nos demais).
--
-- Ordem/segurança: só ADICIONA coluna + GRANT (aditivo, não revoga nada), então é
-- seguro aplicar a qualquer momento — não precisa esperar o deploy do frontend.

-- ============================================
-- 1. Config: lista de tipos de reunião por consultor
-- ============================================
ALTER TABLE public.consultores_atendimento
  ADD COLUMN IF NOT EXISTS tipos_reuniao jsonb NOT NULL DEFAULT '[]'::jsonb;

-- anon é column-scoped desde o hardening PARTE 2 (20260609). Sem este grant o
-- select() do link público quebra com 42501 ao pedir 'tipos_reuniao'.
-- (authenticated mantém SELECT de tabela cheio → já enxerga a coluna nova.)
GRANT SELECT (tipos_reuniao) ON public.consultores_atendimento TO anon;

-- ============================================
-- 2. Registro do assunto escolhido (reunião BlackCRM)
-- ============================================
ALTER TABLE public.reunioes_blackcrm
  ADD COLUMN IF NOT EXISTS assunto text;

-- ============================================
-- 3. View unificada: acrescenta 'assunto' ao fim (CREATE OR REPLACE só permite
--    adicionar coluna no FINAL — preserva grants e o security_invoker).
-- ============================================
CREATE OR REPLACE VIEW public.agendamentos_central
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

-- ============================================
-- 4. Seed: Leonardo (Léo) oferece BlackCRM + Vídeos com IA
-- ============================================
UPDATE public.consultores_atendimento
SET tipos_reuniao = '[
  {"slug":"blackcrm","label":"BlackCRM","descricao":"Tutoria do Black CRM."},
  {"slug":"videos-ia","label":"Consultoria de vídeos com IA","descricao":"Criação de vídeos com inteligência artificial."}
]'::jsonb
WHERE slug = 'leo';

NOTIFY pgrst, 'reload schema';
