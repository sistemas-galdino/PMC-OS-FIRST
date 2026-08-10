-- CRM — aba de Atendimento (WhatsApp).
-- Backend das conversas já pronto; o envio real fica atrás de flag até a
-- integração com o provedor existir (os chips ainda estavam sendo comprados
-- na reunião de 05/08/2026).

CREATE TABLE IF NOT EXISTS public.crm_conversas (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  -- id do grupo/contato no provedor de WhatsApp.
  grupo_id text NOT NULL UNIQUE,
  grupo_nome text NOT NULL,
  id_cliente uuid,
  cs_responsavel text,
  arquivada boolean NOT NULL DEFAULT false,
  ultima_mensagem_em timestamptz,
  lida_ate timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS crm_conversas_cliente_idx ON public.crm_conversas (id_cliente);
CREATE INDEX IF NOT EXISTS crm_conversas_recentes_idx
  ON public.crm_conversas (ultima_mensagem_em DESC NULLS LAST);

CREATE TABLE IF NOT EXISTS public.crm_mensagens (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  conversa_id uuid NOT NULL REFERENCES public.crm_conversas(id) ON DELETE CASCADE,
  -- id da mensagem no provedor, para deduplicar no webhook de entrada.
  externo_id text,
  autor text NOT NULL,
  -- true quando a mensagem partiu do time PMC.
  da_cs boolean NOT NULL DEFAULT false,
  texto text,
  anexo_nome text,
  anexo_tipo text CHECK (anexo_tipo IN ('documento','imagem','audio','video')),
  anexo_url text,
  -- 'pendente' enquanto não houver provedor conectado.
  status_envio text NOT NULL DEFAULT 'recebida'
    CHECK (status_envio IN ('recebida','pendente','enviada','falhou')),
  em timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (conversa_id, externo_id)
);
CREATE INDEX IF NOT EXISTS crm_mensagens_conversa_idx
  ON public.crm_mensagens (conversa_id, em DESC);

-- Mantém crm_conversas.ultima_mensagem_em coerente.
CREATE OR REPLACE FUNCTION public.crm_mensagens_touch_conversa()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  UPDATE public.crm_conversas
     SET ultima_mensagem_em = GREATEST(coalesce(ultima_mensagem_em, NEW.em), NEW.em),
         updated_at = now()
   WHERE id = NEW.conversa_id;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS crm_mensagens_touch_conversa ON public.crm_mensagens;
CREATE TRIGGER crm_mensagens_touch_conversa
  AFTER INSERT ON public.crm_mensagens
  FOR EACH ROW EXECUTE FUNCTION public.crm_mensagens_touch_conversa();

ALTER TABLE public.crm_conversas  ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.crm_mensagens  ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS crm_conversas_admin ON public.crm_conversas;
CREATE POLICY crm_conversas_admin ON public.crm_conversas
  FOR ALL TO authenticated USING (is_admin()) WITH CHECK (is_admin());

DROP POLICY IF EXISTS crm_mensagens_admin ON public.crm_mensagens;
CREATE POLICY crm_mensagens_admin ON public.crm_mensagens
  FOR ALL TO authenticated USING (is_admin()) WITH CHECK (is_admin());
