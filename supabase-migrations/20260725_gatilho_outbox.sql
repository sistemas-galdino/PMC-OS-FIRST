-- Onda 1 — O gatilho externo. Fundação: fila de saída (outbox) + consentimento.
--
-- Arquitetura: o pg_cron NÃO chama a API do provedor. Ele só decide o conteúdo e
-- escreve em mensagens_saida; um worker (edge function enviar-mensagens) drena a
-- fila. Isso separa "decidir o que dizer" de "conseguir entregar" — se o provedor
-- cair por 2h, nada se perde.
--
-- Segurança contra disparo acidental para a base real:
--   1) chave_idem UNIQUE no banco (não na aplicação) impede duplicar envio
--   2) o worker nasce em MODO SECO (provedor falso) — só registra o que enviaria
--   3) destinatário não normalizável NUNCA vira mensagem (vira relatório)

-- ---------------------------------------------------------------------------
-- 1) Normalizador E.164 (Brasil)
-- ---------------------------------------------------------------------------
-- Auditoria da base real (204 clientes ativos, 166 telefones preenchidos):
--   11 dígitos (DDD + 9 + 8) = 123  -> normalizável
--   13 dígitos (55 + 11)     =   7  -> já E.164
--   10 e 12 dígitos          =  36  -> número local de 8 dígitos
--
-- DECISÃO: número local de 8 dígitos retorna NULL. Não inserimos o nono dígito
-- por adivinhação — o risco de acertar o telefone de outra pessoa é inaceitável.
-- Quem cai aqui aparece na view cobertura_contato como "sem contato utilizável".
CREATE OR REPLACE FUNCTION public.normalizar_e164_br(bruto text)
RETURNS text
LANGUAGE plpgsql
IMMUTABLE
AS $$
DECLARE
  d    text;
  ddd  int;
  ddds int[] := ARRAY[
    11,12,13,14,15,16,17,18,19,
    21,22,24,27,28,
    31,32,33,34,35,37,38,
    41,42,43,44,45,46,47,48,49,
    51,53,54,55,
    61,62,63,64,65,66,67,68,69,
    71,73,74,75,77,79,
    81,82,83,84,85,86,87,88,89,
    91,92,93,94,95,96,97,98,99
  ];
BEGIN
  IF bruto IS NULL THEN RETURN NULL; END IF;
  d := regexp_replace(bruto, '[^0-9]', '', 'g');

  -- Tira o DDI se já veio com ele.
  IF length(d) = 13 AND left(d, 2) = '55' THEN
    d := substr(d, 3);
  ELSIF length(d) = 12 AND left(d, 2) = '55' THEN
    RETURN NULL;  -- 55 + DDD + 8 dígitos: local incompleto
  END IF;

  -- A partir daqui só aceitamos DDD(2) + 9 dígitos começando com 9.
  IF length(d) <> 11 THEN RETURN NULL; END IF;
  IF substr(d, 3, 1) <> '9' THEN RETURN NULL; END IF;

  ddd := substr(d, 1, 2)::int;
  IF NOT (ddd = ANY(ddds)) THEN RETURN NULL; END IF;

  RETURN '55' || d;
END; $$;

COMMENT ON FUNCTION public.normalizar_e164_br(text) IS
  'Normaliza telefone BR para E.164 (55DDD9XXXXXXXX). Retorna NULL quando não é celular válido — nunca adivinha o nono dígito.';

-- ---------------------------------------------------------------------------
-- 2) Consentimento por pessoa e canal (LGPD)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.preferencias_notificacao (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  id_cliente     uuid NOT NULL,
  pessoa_ref     text NOT NULL,                      -- 'guardiao' | 'dono' | colaborador:<uuid>
  canal          text NOT NULL DEFAULT 'whatsapp',   -- whatsapp | email | push
  digest_diario  boolean NOT NULL DEFAULT false,
  digest_semanal boolean NOT NULL DEFAULT false,
  eventos        boolean NOT NULL DEFAULT false,
  optin_em       timestamptz,                        -- prova de consentimento
  optout_em      timestamptz,
  created_at     timestamptz NOT NULL DEFAULT now(),
  updated_at     timestamptz NOT NULL DEFAULT now(),
  UNIQUE (id_cliente, pessoa_ref, canal)
);

COMMENT ON TABLE public.preferencias_notificacao IS
  'Opt-in por pessoa/canal. Default é FALSE: ninguém recebe nada sem consentimento explícito.';

-- ---------------------------------------------------------------------------
-- 3) Fila de saída (outbox)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.mensagens_saida (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  id_cliente    uuid,                          -- NULL = mensagem interna/broadcast
  destinatario  text NOT NULL,                 -- E.164 já normalizado
  persona       text NOT NULL,                 -- guardiao | dono | colaborador
  canal         text NOT NULL DEFAULT 'whatsapp',
  template      text NOT NULL,                 -- nome do template aprovado no provedor
  variaveis     jsonb NOT NULL DEFAULT '{}'::jsonb,
  previa        text,                          -- texto legível p/ auditoria e modo seco
  chave_idem    text NOT NULL UNIQUE,          -- trava anti-duplicidade (no banco, não na app)
  status        text NOT NULL DEFAULT 'pendente',  -- pendente|enviado|falhou|cancelado
  tentativas    int  NOT NULL DEFAULT 0,
  erro          text,
  provedor      text,                          -- 'seco' enquanto não houver provedor real
  agendado_para timestamptz NOT NULL DEFAULT now(),
  enviado_em    timestamptz,
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now()
);

-- Índice do worker: pega só o que está pendente e vencido, na ordem certa.
CREATE INDEX IF NOT EXISTS idx_msg_saida_fila
  ON public.mensagens_saida (agendado_para)
  WHERE status = 'pendente';
CREATE INDEX IF NOT EXISTS idx_msg_saida_cliente ON public.mensagens_saida (id_cliente, created_at DESC);

-- ---------------------------------------------------------------------------
-- 4) RLS
-- ---------------------------------------------------------------------------
ALTER TABLE public.mensagens_saida          ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.preferencias_notificacao ENABLE ROW LEVEL SECURITY;

-- Outbox: o cliente PODE ver o que foi enviado para ele (transparência LGPD),
-- mas só o time escreve. O worker usa service_role, que ignora RLS.
DROP POLICY IF EXISTS mensagens_saida_select ON public.mensagens_saida;
CREATE POLICY mensagens_saida_select ON public.mensagens_saida
  FOR SELECT USING ((meu_id_cliente() = id_cliente) OR is_admin());

DROP POLICY IF EXISTS mensagens_saida_admin_write ON public.mensagens_saida;
CREATE POLICY mensagens_saida_admin_write ON public.mensagens_saida
  FOR ALL USING (is_admin()) WITH CHECK (is_admin());

-- Preferências: o cliente precisa poder DESLIGAR o que recebe. É direito, não favor.
DROP POLICY IF EXISTS pref_notif_rw ON public.preferencias_notificacao;
CREATE POLICY pref_notif_rw ON public.preferencias_notificacao
  FOR ALL
  USING ((meu_id_cliente() = id_cliente) OR is_admin())
  WITH CHECK ((meu_id_cliente() = id_cliente) OR is_admin());

-- ---------------------------------------------------------------------------
-- 5) Resolvedor de contato — cascata de fontes, da mais específica à mais geral
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.contato_persona(p_cliente uuid, p_persona text)
RETURNS text
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  -- A cascata é o próprio coalesce: a primeira fonte que normalizar vence.
  -- Fonte com número inválido devolve NULL e cai para a próxima automaticamente.
  SELECT coalesce(
    -- Guardião · 1) cadastro do Método (principal primeiro)
    normalizar_e164_br((
      SELECT g.whatsapp FROM metodo_guardioes g
       WHERE p_persona = 'guardiao' AND g.id_cliente = p_cliente
       ORDER BY g.principal DESC NULLS LAST, g.created_at LIMIT 1)),
    -- Guardião · 2) colaborador marcado como guardião de IA
    normalizar_e164_br((
      SELECT c.whatsapp FROM cliente_colaboradores c
       WHERE p_persona = 'guardiao' AND c.id_cliente = p_cliente AND c.guardiao_ia LIMIT 1)),
    -- Guardião · 3) campo do CRM
    normalizar_e164_br((
      SELECT e.guardiao_ia_telefone FROM clientes_entrada_new e
       WHERE p_persona = 'guardiao' AND e.id_cliente = p_cliente LIMIT 1)),
    -- Dono · telefone principal do CRM
    normalizar_e164_br((
      SELECT e.telefone FROM clientes_entrada_new e
       WHERE p_persona = 'dono' AND e.id_cliente = p_cliente LIMIT 1))
  );
$$;

COMMENT ON FUNCTION public.contato_persona(uuid, text) IS
  'Resolve o WhatsApp E.164 de uma persona do cliente por cascata de fontes. NULL = sem contato utilizável.';

-- SEGURANÇA: é SECURITY DEFINER e não checa autorização. Se ficasse exposta ao
-- papel `authenticated`, qualquer cliente logado enumeraria o telefone de outra
-- empresa passando o id dela. Só funções SECURITY DEFINER do postgres a chamam.
REVOKE ALL ON FUNCTION public.contato_persona(uuid, text) FROM public, anon, authenticated;

-- Caminho seguro para o próprio cliente consultar o SEU status (mascarado).
-- Nunca aceita id de terceiro: resolve sempre por meu_id_cliente().
CREATE OR REPLACE FUNCTION public.meu_status_contato()
RETURNS TABLE(persona text, tem_contato boolean, mascara text)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE v_cliente uuid := meu_id_cliente(); v_fone text;
BEGIN
  IF v_cliente IS NULL THEN RETURN; END IF;
  FOREACH persona IN ARRAY ARRAY['guardiao','dono'] LOOP
    v_fone := contato_persona(v_cliente, persona);
    tem_contato := v_fone IS NOT NULL;
    mascara := CASE WHEN v_fone IS NULL THEN NULL
                    ELSE '+55 (' || substr(v_fone,3,2) || ') ••••-' || right(v_fone,4) END;
    RETURN NEXT;
  END LOOP;
END; $$;

-- ---------------------------------------------------------------------------
-- 6) Cobertura de contato — torna o alcance real visível (nada de falha silenciosa)
-- ---------------------------------------------------------------------------
-- security_invoker=true é OBRIGATÓRIO aqui. Sem isso a view roda com os
-- privilégios do dono (postgres), contorna a RLS de clientes_entrada_new e
-- entrega a base inteira de clientes para qualquer usuário autenticado.
-- A lógica de telefone é embutida (e não via contato_persona) porque aquela
-- função é revogada do papel `authenticated` — inclusive para os admins.
CREATE OR REPLACE VIEW public.cobertura_contato
WITH (security_invoker = true) AS
SELECT
  e.id_cliente,
  e.nome_empresa_formatado AS empresa,
  e.status_atual,
  coalesce(
    normalizar_e164_br((SELECT g.whatsapp FROM metodo_guardioes g
                         WHERE g.id_cliente = e.id_cliente
                         ORDER BY g.principal DESC NULLS LAST, g.created_at LIMIT 1)),
    normalizar_e164_br((SELECT c.whatsapp FROM cliente_colaboradores c
                         WHERE c.id_cliente = e.id_cliente AND c.guardiao_ia LIMIT 1)),
    normalizar_e164_br(e.guardiao_ia_telefone)
  ) IS NOT NULL AS tem_guardiao,
  normalizar_e164_br(e.telefone) IS NOT NULL AS tem_dono
FROM clientes_entrada_new e
WHERE e.data_cancelamento IS NULL;

COMMENT ON VIEW public.cobertura_contato IS
  'Quem o gatilho consegue alcançar hoje. security_invoker: respeita a RLS de quem consulta.';
