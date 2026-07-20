-- Notificações in-app (sino no header do cliente).
-- notificacoes: id_cliente NULL = broadcast (todos os clientes); senão, alvo.
-- notificacao_leituras: estado de leitura por cliente.
CREATE TABLE IF NOT EXISTS notificacoes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  id_cliente uuid,                       -- NULL = para todos
  tipo text NOT NULL DEFAULT 'aviso',    -- novidade | reuniao | guardiao | aviso
  titulo text NOT NULL,
  texto text,
  link text,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS notificacoes_alvo_idx ON notificacoes(id_cliente, created_at DESC);

CREATE TABLE IF NOT EXISTS notificacao_leituras (
  id_notificacao uuid NOT NULL REFERENCES notificacoes(id) ON DELETE CASCADE,
  id_cliente uuid NOT NULL,
  lida_em timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (id_notificacao, id_cliente)
);
CREATE INDEX IF NOT EXISTS notificacao_leituras_cliente_idx ON notificacao_leituras(id_cliente);

ALTER TABLE notificacoes ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS notificacoes_select ON notificacoes;
CREATE POLICY notificacoes_select ON notificacoes
  FOR SELECT TO authenticated
  USING (id_cliente IS NULL OR id_cliente = auth.uid() OR is_admin());
DROP POLICY IF EXISTS notificacoes_admin_write ON notificacoes;
CREATE POLICY notificacoes_admin_write ON notificacoes
  FOR ALL TO authenticated
  USING (is_admin()) WITH CHECK (is_admin());

ALTER TABLE notificacao_leituras ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS notificacao_leituras_own ON notificacao_leituras;
CREATE POLICY notificacao_leituras_own ON notificacao_leituras
  FOR ALL TO authenticated
  USING (id_cliente = auth.uid()) WITH CHECK (id_cliente = auth.uid());

-- Trigger: novidade publicada -> notificação broadcast para todos os clientes.
CREATE OR REPLACE FUNCTION public.notificar_nova_novidade()
  RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $fn$
BEGIN
  IF NEW.publicado = true AND (TG_OP = 'INSERT' OR COALESCE(OLD.publicado, false) = false) THEN
    INSERT INTO public.notificacoes (id_cliente, tipo, titulo, texto, link)
    VALUES (NULL, 'novidade', NEW.titulo, left(COALESCE(NEW.resumo, NEW.conteudo, ''), 160), '/novidades?post=' || NEW.id);
  END IF;
  RETURN NEW;
END;
$fn$;

DROP TRIGGER IF EXISTS trg_notificar_novidade ON comunidade_novidades;
CREATE TRIGGER trg_notificar_novidade
  AFTER INSERT OR UPDATE ON comunidade_novidades
  FOR EACH ROW EXECUTE FUNCTION public.notificar_nova_novidade();
