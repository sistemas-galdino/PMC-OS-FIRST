-- Hardening do link público de agendamento (/atendimento) — PARTE 1 (APLICADA)
--
-- Esta parte é backward-compatible com o frontend antigo, então pode ir pro ar
-- antes do deploy do novo frontend.
--
-- Anti-spam do criar-agendamento: cada agendamento cria um evento real no Google
-- Calendar, então a edge function limita flood por IP. Só service_role lê/escreve.
--
-- A PARTE 2 (grants por coluna pra anon, escondendo email/motivo) está em
-- 20260609_hardening_grants_anon_APLICAR_APOS_DEPLOY.sql e SÓ pode ser aplicada
-- DEPOIS que o novo frontend (com select de colunas explícitas) estiver no ar —
-- senão o select("*") do frontend antigo quebra com 42501 (permission denied).

CREATE TABLE IF NOT EXISTS public.agendamento_rate_limit (
  id        bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  ip        text NOT NULL,
  criado_em timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_arl_ip_tempo
  ON public.agendamento_rate_limit (ip, criado_em);

-- RLS ligada e SEM política: anon/authenticated não leem nem escrevem;
-- só service_role (que ignora RLS) toca a tabela.
ALTER TABLE public.agendamento_rate_limit ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.agendamento_rate_limit FROM anon, authenticated;
