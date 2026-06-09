-- Hardening do link público de agendamento (/atendimento) — PARTE 2
--
-- ⚠️ APLICAR SOMENTE DEPOIS QUE O NOVO FRONTEND ESTIVER NO AR (Vercel).
--
-- Tightening por coluna pra anon: esconde email/email_calendar/tabela_destino/
-- nomes_match (consultores_atendimento) e motivo (consultores_excecoes) do papel
-- anônimo. A proteção REAL é aqui (no banco) — mudar só o select() do front não
-- adianta, pois dá pra bater direto no PostgREST com a chave anon.
--
-- PRÉ-REQUISITO: o frontend de produção precisa estar usando select de colunas
-- explícitas (web/src/pages/atendimento-publico.tsx). Enquanto a produção rodar
-- select("*"), aplicar isto QUEBRA a página pública (42501 permission denied).
--
-- `authenticated` mantém o SELECT de tabela cheio (admin = is_admin() não quebra);
-- `service_role` ignora grants (edge function não quebra). As políticas RLS de
-- linha continuam valendo — coluna e linha são independentes.

-- consultores_atendimento: anon só enxerga colunas públicas
REVOKE SELECT ON public.consultores_atendimento FROM anon;
GRANT SELECT (
  id, nome, slug, especialidade, descricao, avatar_url, accent,
  duracao_padrao_minutos, ordem, ativo, tipo_reuniao
) ON public.consultores_atendimento TO anon;

-- consultores_excecoes: anon não enxerga 'motivo'
REVOKE SELECT ON public.consultores_excecoes FROM anon;
GRANT SELECT (
  id, consultor_id, data, tipo, hora_inicio, hora_fim
) ON public.consultores_excecoes TO anon;

NOTIFY pgrst, 'reload schema';
