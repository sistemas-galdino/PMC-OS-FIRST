-- Novidades vira um FEED de comunidade: categoria no post + curtidas + comentários
-- (com respostas). Autor dos comentários é denormalizado (nome/avatar) porque a
-- RLS de clientes_entrada_new impede ler o nome de outros clientes.

-- 1) Post: categoria + avatar do autor
ALTER TABLE comunidade_novidades ADD COLUMN IF NOT EXISTS categoria text NOT NULL DEFAULT 'avisos';
ALTER TABLE comunidade_novidades ADD COLUMN IF NOT EXISTS autor_avatar_url text;

-- 2) Curtidas
CREATE TABLE IF NOT EXISTS comunidade_novidades_likes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  id_novidade uuid NOT NULL REFERENCES comunidade_novidades(id) ON DELETE CASCADE,
  id_cliente uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (id_novidade, id_cliente)
);
CREATE INDEX IF NOT EXISTS novidades_likes_novidade_idx ON comunidade_novidades_likes(id_novidade);

ALTER TABLE comunidade_novidades_likes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS novidades_likes_select ON comunidade_novidades_likes;
CREATE POLICY novidades_likes_select ON comunidade_novidades_likes
  FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM comunidade_novidades n WHERE n.id = id_novidade AND (n.publicado OR is_admin())));

DROP POLICY IF EXISTS novidades_likes_insert ON comunidade_novidades_likes;
CREATE POLICY novidades_likes_insert ON comunidade_novidades_likes
  FOR INSERT TO authenticated
  WITH CHECK (id_cliente = auth.uid());

DROP POLICY IF EXISTS novidades_likes_delete ON comunidade_novidades_likes;
CREATE POLICY novidades_likes_delete ON comunidade_novidades_likes
  FOR DELETE TO authenticated
  USING (id_cliente = auth.uid() OR is_admin());

-- 3) Comentários (com respostas via parent_id)
CREATE TABLE IF NOT EXISTS comunidade_novidades_comentarios (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  id_novidade uuid NOT NULL REFERENCES comunidade_novidades(id) ON DELETE CASCADE,
  parent_id uuid REFERENCES comunidade_novidades_comentarios(id) ON DELETE CASCADE,
  id_autor uuid NOT NULL,
  autor_nome text,
  autor_avatar_url text,
  is_admin boolean NOT NULL DEFAULT false,
  texto text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS novidades_comentarios_novidade_idx ON comunidade_novidades_comentarios(id_novidade);

ALTER TABLE comunidade_novidades_comentarios ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS novidades_comentarios_select ON comunidade_novidades_comentarios;
CREATE POLICY novidades_comentarios_select ON comunidade_novidades_comentarios
  FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM comunidade_novidades n WHERE n.id = id_novidade AND (n.publicado OR is_admin())));

DROP POLICY IF EXISTS novidades_comentarios_insert ON comunidade_novidades_comentarios;
CREATE POLICY novidades_comentarios_insert ON comunidade_novidades_comentarios
  FOR INSERT TO authenticated
  WITH CHECK (id_autor = auth.uid());

DROP POLICY IF EXISTS novidades_comentarios_delete ON comunidade_novidades_comentarios;
CREATE POLICY novidades_comentarios_delete ON comunidade_novidades_comentarios
  FOR DELETE TO authenticated
  USING (id_autor = auth.uid() OR is_admin());
