-- CRM / Atendimento — fundação da integração com a Evolution API (WhatsApp).
--
-- CONTEXTO
-- Cada cliente do PMC tem um grupo de WhatsApp chamado "<Empresa> - PMC <código>".
-- Um número de automação (558591883010, instância `automacao-black-eagle-3010`)
-- está em 237 desses grupos e hoje só serve a um fluxo de lembretes no n8n.
-- A aba /crm/atendimento já existe sobre crm_conversas/crm_mensagens, mas as
-- tabelas nunca foram alimentadas: faltava provedor.
--
-- DECISÃO
-- Cada CS conecta o PRÓPRIO número por QR code, o que cria uma instância
-- Baileys por CS na Evolution. É a instância dela que lê e responde os grupos
-- da carteira dela. A instância de automação vira apenas DIRETÓRIO: lemos
-- /group/fetchAllGroups nela e nada mais — nenhuma escrita, nenhum webhook,
-- para não derrubar o n8n que roda em cima do mesmo número.
--
-- RISCO
-- O QR (base64, ~12 KB) e o token do webhook são estado volátil e segredo.
-- Por isso instância NÃO entra em crm_cs_config (que é lida inteira em toda
-- carga do time por web/src/lib/crm/equipe.ts) e a tabela nova não tem grant
-- para `authenticated`: o frontend lê uma view que omite o token.
--
-- Esta migration NÃO mexe nas policies de crm_conversas/crm_mensagens. O aperto
-- de RLS por carteira está em 20260908b_crm_whatsapp_rls_carteira.sql e depende
-- de cs_responsavel já estar populado pelo sync de grupos.

BEGIN;

-- ============================================================
-- Helpers de identidade do membro do time
-- Irmãos de crm_meu_nome() (20260810_crm_clientes_colunas.sql) e de is_admin().
-- ============================================================

-- mentores.id do usuário logado. Vínculo com auth.users é por e-mail — não há
-- user_id em mentores.
CREATE OR REPLACE FUNCTION public.crm_meu_mentor_id()
RETURNS bigint
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT m.id FROM mentores m
  WHERE m.email = (SELECT u.email FROM auth.users u WHERE u.id = auth.uid())
  LIMIT 1;
$$;

-- Carteira do logado: a MESMA string de clientes_entrada_new.sc.
-- Espelha a regra do frontend em web/src/lib/crm/equipe.ts (carteira_sc || nome).
CREATE OR REPLACE FUNCTION public.crm_minha_carteira()
RETURNS text
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT coalesce(nullif(btrim(m.carteira_sc), ''), m.nome) FROM mentores m
  WHERE m.email = (SELECT u.email FROM auth.users u WHERE u.id = auth.uid())
  LIMIT 1;
$$;

-- Coordenação (papel com is_full: super_admin, admin) enxerga todas as carteiras.
CREATE OR REPLACE FUNCTION public.crm_ve_todas_carteiras()
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT EXISTS (
    SELECT 1 FROM mentores m
    JOIN papeis p ON p.chave = m.papel
    WHERE m.email = (SELECT u.email FROM auth.users u WHERE u.id = auth.uid())
      AND p.is_full
  );
$$;

REVOKE EXECUTE ON FUNCTION public.crm_meu_mentor_id()     FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.crm_minha_carteira()    FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.crm_ve_todas_carteiras() FROM anon, public;
GRANT  EXECUTE ON FUNCTION public.crm_meu_mentor_id()     TO authenticated;
GRANT  EXECUTE ON FUNCTION public.crm_minha_carteira()    TO authenticated;
GRANT  EXECUTE ON FUNCTION public.crm_ve_todas_carteiras() TO authenticated;

-- ============================================================
-- Instâncias Evolution (uma por CS + a de diretório)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.crm_whatsapp_instancias (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  mentor_id        bigint REFERENCES public.mentores(id) ON DELETE CASCADE,
  -- nome da instância na Evolution (ex.: 'pmc-cs-bruna'). Único no servidor.
  instancia        text NOT NULL UNIQUE,
  papel            text NOT NULL DEFAULT 'cs' CHECK (papel IN ('cs','diretorio')),
  numero           text,   -- 55..., vem do CONNECTION_UPDATE
  owner_jid        text,
  status           text NOT NULL DEFAULT 'criada'
                   CHECK (status IN ('criada','aguardando_qr','conectando','conectada','desconectada','erro')),
  ultimo_qr        text,   -- data:image/png;base64 — rotaciona a cada ~40s
  ultimo_qr_em     timestamptz,
  pairing_code     text,
  conectado_em     timestamptz,
  desconectado_em  timestamptz,
  ultimo_evento_em timestamptz,
  erro             text,
  backfill_status  text NOT NULL DEFAULT 'pendente'
                   CHECK (backfill_status IN ('pendente','rodando','concluido','falhou')),
  backfill_cursor  integer NOT NULL DEFAULT 0,  -- quantos grupos já processados
  backfill_em      timestamptz,
  -- Token por instância: revogar uma CS não rotaciona o das outras.
  -- md5(uuid||uuid) em vez de gen_random_bytes pra não depender de pgcrypto.
  webhook_token    text NOT NULL DEFAULT md5(gen_random_uuid()::text || gen_random_uuid()::text),
  created_at       timestamptz NOT NULL DEFAULT now(),
  updated_at       timestamptz NOT NULL DEFAULT now()
);

-- Uma instância de CS por mentor. A de diretório fica fora da regra.
CREATE UNIQUE INDEX IF NOT EXISTS crm_whatsapp_instancias_mentor_uk
  ON public.crm_whatsapp_instancias (mentor_id) WHERE papel = 'cs';
CREATE INDEX IF NOT EXISTS crm_whatsapp_instancias_status_idx
  ON public.crm_whatsapp_instancias (status);
CREATE INDEX IF NOT EXISTS crm_whatsapp_instancias_token_idx
  ON public.crm_whatsapp_instancias (webhook_token);

ALTER TABLE public.crm_whatsapp_instancias ENABLE ROW LEVEL SECURITY;

-- RLS não filtra COLUNA, mas GRANT filtra. A view abaixo é security_invoker,
-- então o `authenticated` PRECISA de privilégio na tabela base — um REVOKE ALL
-- aqui quebraria a view inteira. A saída é grant coluna a coluna, omitindo
-- webhook_token: o segredo nunca sai do service_role, e a RLS continua valendo.
REVOKE ALL ON public.crm_whatsapp_instancias FROM anon, authenticated;
GRANT SELECT (
  id, mentor_id, instancia, papel, numero, owner_jid, status,
  ultimo_qr, ultimo_qr_em, pairing_code, conectado_em, desconectado_em,
  ultimo_evento_em, erro, backfill_status, backfill_cursor, backfill_em,
  created_at, updated_at
) ON public.crm_whatsapp_instancias TO authenticated;

-- A policy vale para a view (security_invoker) e para service_role bypassa.
DROP POLICY IF EXISTS crm_whatsapp_instancias_leitura ON public.crm_whatsapp_instancias;
CREATE POLICY crm_whatsapp_instancias_leitura ON public.crm_whatsapp_instancias
  FOR SELECT TO authenticated
  USING (public.crm_ve_todas_carteiras() OR mentor_id = public.crm_meu_mentor_id());
-- Escrita: só service_role (edge functions). Nenhuma policy de INSERT/UPDATE/DELETE.

DROP VIEW IF EXISTS public.crm_whatsapp_instancias_v;
CREATE VIEW public.crm_whatsapp_instancias_v
WITH (security_invoker = true) AS
  SELECT id, mentor_id, instancia, papel, numero, owner_jid, status,
         ultimo_qr, ultimo_qr_em, pairing_code, conectado_em, desconectado_em,
         ultimo_evento_em, erro, backfill_status, backfill_cursor, backfill_em,
         created_at, updated_at
    FROM public.crm_whatsapp_instancias;

GRANT SELECT ON public.crm_whatsapp_instancias_v TO authenticated;

-- ============================================================
-- Diretório de grupos do WhatsApp
-- Separa "o que existe no WhatsApp" (237) de "o que virou conversa".
-- Deixa o sync idempotente e auditável, e permite corrigir à mão os nomes
-- fora do padrão sem mexer no parser (vinculo_origem='manual' trava o sync).
-- ============================================================
CREATE TABLE IF NOT EXISTS public.crm_whatsapp_grupos (
  grupo_id         text PRIMARY KEY,          -- 1203...@g.us
  subject          text NOT NULL,
  tamanho          integer,
  codigo_detectado bigint,
  regra            text CHECK (regra IN ('fim','apos_pmc','manual','nenhuma')),
  interno          boolean NOT NULL DEFAULT false,
  ignorar          boolean NOT NULL DEFAULT false,
  id_cliente       uuid REFERENCES public.clientes_formulario(id_cliente) ON DELETE SET NULL,
  vinculo_origem   text NOT NULL DEFAULT 'nenhum'
                   CHECK (vinculo_origem IN ('codigo','manual','interno','nenhum')),
  visto_em         timestamptz NOT NULL DEFAULT now(),
  created_at       timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS crm_whatsapp_grupos_codigo_idx
  ON public.crm_whatsapp_grupos (codigo_detectado);

ALTER TABLE public.crm_whatsapp_grupos ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS crm_whatsapp_grupos_admin ON public.crm_whatsapp_grupos;
CREATE POLICY crm_whatsapp_grupos_admin ON public.crm_whatsapp_grupos
  FOR ALL TO authenticated USING (is_admin()) WITH CHECK (is_admin());

-- ============================================================
-- Log cru de eventos do webhook (diagnóstico)
-- Com 237 grupos ativos isso cresce rápido — a retenção de 14 dias é
-- obrigatória, não opcional (cron em 20260908c_crm_whatsapp_cron.sql).
-- ============================================================
CREATE TABLE IF NOT EXISTS public.crm_whatsapp_eventos (
  id          bigserial PRIMARY KEY,
  instancia   text,
  evento      text,
  chave       text,        -- key.id quando existir
  recebido_em timestamptz NOT NULL DEFAULT now(),
  payload     jsonb
);

CREATE INDEX IF NOT EXISTS crm_whatsapp_eventos_recente_idx
  ON public.crm_whatsapp_eventos (recebido_em DESC);

ALTER TABLE public.crm_whatsapp_eventos ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.crm_whatsapp_eventos FROM anon;
DROP POLICY IF EXISTS crm_whatsapp_eventos_coord ON public.crm_whatsapp_eventos;
CREATE POLICY crm_whatsapp_eventos_coord ON public.crm_whatsapp_eventos
  FOR SELECT TO authenticated USING (public.crm_ve_todas_carteiras());

-- ============================================================
-- crm_conversas: colunas do provedor
-- ============================================================
ALTER TABLE public.crm_conversas
  ADD COLUMN IF NOT EXISTS interno          boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS tipo             text    NOT NULL DEFAULT 'grupo',
  ADD COLUMN IF NOT EXISTS instancia_origem text,
  ADD COLUMN IF NOT EXISTS instancia_envio  text,
  ADD COLUMN IF NOT EXISTS codigo_cliente   bigint,
  ADD COLUMN IF NOT EXISTS participantes    integer,
  ADD COLUMN IF NOT EXISTS sincronizado_em  timestamptz;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'crm_conversas_tipo_check'
  ) THEN
    ALTER TABLE public.crm_conversas
      ADD CONSTRAINT crm_conversas_tipo_check CHECK (tipo IN ('grupo','direto'));
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS crm_conversas_cs_idx
  ON public.crm_conversas (cs_responsavel) WHERE NOT arquivada;
CREATE INDEX IF NOT EXISTS crm_conversas_interno_idx
  ON public.crm_conversas (interno) WHERE NOT arquivada;

COMMENT ON COLUMN public.crm_conversas.interno IS
  'Grupo interno do PMC (Time CS, AVISOS, Imersão IA...): sem cliente, visível a todo o time, fora das métricas por cliente.';
COMMENT ON COLUMN public.crm_conversas.instancia_origem IS
  'Instância que trouxe a última mensagem — auditoria de quem estava ouvindo.';
COMMENT ON COLUMN public.crm_conversas.instancia_envio IS
  'Instância usada para responder. Normalmente a da CS dona da carteira.';

-- ============================================================
-- crm_mensagens: colunas do provedor
-- ============================================================
ALTER TABLE public.crm_mensagens
  ADD COLUMN IF NOT EXISTS instancia             text,
  ADD COLUMN IF NOT EXISTS autor_jid             text,   -- key.participantAlt (55...@s.whatsapp.net)
  ADD COLUMN IF NOT EXISTS autor_lid             text,   -- key.participant (...@lid)
  ADD COLUMN IF NOT EXISTS tipo                  text,   -- messageType da Evolution
  ADD COLUMN IF NOT EXISTS enviada_por_mentor_id bigint REFERENCES public.mentores(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS raw                   jsonb;

COMMENT ON COLUMN public.crm_mensagens.autor_lid IS
  'key.participant. A Evolution usa addressingMode "lid": este valor NÃO é telefone. O telefone vem em autor_jid.';

-- status_envio ganha os estados de recibo do WhatsApp.
ALTER TABLE public.crm_mensagens DROP CONSTRAINT IF EXISTS crm_mensagens_status_envio_check;
ALTER TABLE public.crm_mensagens ADD CONSTRAINT crm_mensagens_status_envio_check
  CHECK (status_envio IN ('recebida','pendente','enviada','entregue','lida','falhou'));

-- ============================================================
-- crm_conversas_v: expõe as colunas novas que a tela precisa.
-- security_invoker mantido — a view herda as policies de crm_conversas.
-- ============================================================
DROP VIEW IF EXISTS public.crm_conversas_v;
CREATE VIEW public.crm_conversas_v
WITH (security_invoker = true) AS
  SELECT
    c.id,
    c.grupo_id,
    c.grupo_nome,
    c.id_cliente,
    c.cs_responsavel,
    c.arquivada,
    c.ultima_mensagem_em,
    c.interno,
    c.tipo,
    c.codigo_cliente,
    c.instancia_envio,
    u.id           AS ultima_id,
    u.autor        AS ultima_autor,
    u.da_cs        AS ultima_da_cs,
    u.texto        AS ultima_texto,
    u.em           AS ultima_em,
    u.anexo_nome   AS ultima_anexo_nome,
    u.anexo_tipo   AS ultima_anexo_tipo,
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
     WHERE m.conversa_id = c.id
       AND NOT m.da_cs
       AND m.em > coalesce(
             (SELECT max(x.em) FROM public.crm_mensagens x
               WHERE x.conversa_id = c.id AND x.da_cs),
             '-infinity'::timestamptz)
  ) n ON true;

GRANT SELECT ON public.crm_conversas_v TO authenticated;

COMMIT;
