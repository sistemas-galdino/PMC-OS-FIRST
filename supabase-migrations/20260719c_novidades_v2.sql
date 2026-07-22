-- Novidades v2: imagem de capa nos posts + notificação de resposta a comentário.
-- 1) coluna imagem_url + bucket público novidades-imagens (leitura pública,
--    escrita só admin — mesmo padrão do skills-arquivos).
-- 2) trigger: quando alguém responde um comentário, o autor do comentário pai
--    recebe notificação in-app (o insert direto em notificacoes é admin-only
--    por RLS, então o trigger roda como SECURITY DEFINER).
ALTER TABLE comunidade_novidades ADD COLUMN IF NOT EXISTS imagem_url text;

INSERT INTO storage.buckets (id, name, public)
VALUES ('novidades-imagens', 'novidades-imagens', true)
ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS novidades_img_admin_write ON storage.objects;
CREATE POLICY novidades_img_admin_write ON storage.objects
  FOR ALL TO authenticated
  USING (bucket_id = 'novidades-imagens' AND is_admin())
  WITH CHECK (bucket_id = 'novidades-imagens' AND is_admin());

-- Notificação de resposta: dispara no INSERT de comentário com parent_id.
CREATE OR REPLACE FUNCTION public.notificar_resposta_comentario()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  pai RECORD;
  titulo_post text;
BEGIN
  IF NEW.parent_id IS NULL THEN
    RETURN NEW;
  END IF;
  SELECT id_autor, autor_nome INTO pai
    FROM comunidade_novidades_comentarios WHERE id = NEW.parent_id;
  -- não notifica resposta a si mesmo
  IF pai.id_autor IS NULL OR pai.id_autor = NEW.id_autor THEN
    RETURN NEW;
  END IF;
  SELECT titulo INTO titulo_post FROM comunidade_novidades WHERE id = NEW.id_novidade;
  INSERT INTO notificacoes (id_cliente, tipo, titulo, texto, link)
  VALUES (
    pai.id_autor,
    'novidade',
    COALESCE(NULLIF(btrim(NEW.autor_nome), ''), 'Alguém') || ' respondeu seu comentário',
    'Em "' || COALESCE(titulo_post, 'Novidades') || '": ' || left(NEW.texto, 120),
    '/novidades?post=' || NEW.id_novidade
  );
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_notificar_resposta_comentario ON comunidade_novidades_comentarios;
CREATE TRIGGER trg_notificar_resposta_comentario
  AFTER INSERT ON comunidade_novidades_comentarios
  FOR EACH ROW EXECUTE FUNCTION public.notificar_resposta_comentario();
