-- Estudos de Caso → engajamento: contador de visualizações do vídeo, curtidas
-- e comentários por estudo — mesmo padrão do feed de Novidades (autor do
-- comentário denormalizado porque a RLS de clientes_entrada_new impede ler o
-- nome de outros clientes).

-- 1) Contador de visualizações (incrementa quando alguém abre o case pra assistir)
ALTER TABLE conhecimento_estudos_caso ADD COLUMN IF NOT EXISTS visualizacoes integer NOT NULL DEFAULT 0;

-- Clientes só têm SELECT na tabela; o incremento passa por RPC SECURITY DEFINER
-- pra não abrir UPDATE geral. Só conta estudo publicado.
CREATE OR REPLACE FUNCTION public.estudo_caso_registrar_view(p_estudo uuid)
RETURNS void
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  UPDATE conhecimento_estudos_caso
     SET visualizacoes = visualizacoes + 1
   WHERE id = p_estudo
     AND publicado = true;
$$;
REVOKE ALL ON FUNCTION public.estudo_caso_registrar_view(uuid) FROM public, anon;
GRANT EXECUTE ON FUNCTION public.estudo_caso_registrar_view(uuid) TO authenticated;

-- 2) Curtidas
CREATE TABLE IF NOT EXISTS conhecimento_estudos_caso_likes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  id_estudo uuid NOT NULL REFERENCES conhecimento_estudos_caso(id) ON DELETE CASCADE,
  id_cliente uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (id_estudo, id_cliente)
);
CREATE INDEX IF NOT EXISTS estudos_caso_likes_estudo_idx ON conhecimento_estudos_caso_likes(id_estudo);

ALTER TABLE conhecimento_estudos_caso_likes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS estudos_caso_likes_select ON conhecimento_estudos_caso_likes;
CREATE POLICY estudos_caso_likes_select ON conhecimento_estudos_caso_likes
  FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM conhecimento_estudos_caso e WHERE e.id = id_estudo AND (e.publicado OR is_admin())));

DROP POLICY IF EXISTS estudos_caso_likes_insert ON conhecimento_estudos_caso_likes;
CREATE POLICY estudos_caso_likes_insert ON conhecimento_estudos_caso_likes
  FOR INSERT TO authenticated
  WITH CHECK (id_cliente = auth.uid());

DROP POLICY IF EXISTS estudos_caso_likes_delete ON conhecimento_estudos_caso_likes;
CREATE POLICY estudos_caso_likes_delete ON conhecimento_estudos_caso_likes
  FOR DELETE TO authenticated
  USING (id_cliente = auth.uid() OR is_admin());

-- 3) Comentários
CREATE TABLE IF NOT EXISTS conhecimento_estudos_caso_comentarios (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  id_estudo uuid NOT NULL REFERENCES conhecimento_estudos_caso(id) ON DELETE CASCADE,
  id_autor uuid NOT NULL,
  autor_nome text,
  autor_avatar_url text,
  is_admin boolean NOT NULL DEFAULT false,
  texto text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS estudos_caso_comentarios_estudo_idx ON conhecimento_estudos_caso_comentarios(id_estudo);

ALTER TABLE conhecimento_estudos_caso_comentarios ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS estudos_caso_comentarios_select ON conhecimento_estudos_caso_comentarios;
CREATE POLICY estudos_caso_comentarios_select ON conhecimento_estudos_caso_comentarios
  FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM conhecimento_estudos_caso e WHERE e.id = id_estudo AND (e.publicado OR is_admin())));

DROP POLICY IF EXISTS estudos_caso_comentarios_insert ON conhecimento_estudos_caso_comentarios;
CREATE POLICY estudos_caso_comentarios_insert ON conhecimento_estudos_caso_comentarios
  FOR INSERT TO authenticated
  WITH CHECK (id_autor = auth.uid());

DROP POLICY IF EXISTS estudos_caso_comentarios_delete ON conhecimento_estudos_caso_comentarios;
CREATE POLICY estudos_caso_comentarios_delete ON conhecimento_estudos_caso_comentarios
  FOR DELETE TO authenticated
  USING (id_autor = auth.uid() OR is_admin());
