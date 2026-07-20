-- SEGURANÇA: a política de INSERT de comentários só validava id_autor,
-- permitindo que um cliente inserisse comentário com is_admin=true (selo
-- "EQUIPE" forjado). Agora is_admin no registro só pode ser true se o
-- autor for realmente admin.
DROP POLICY IF EXISTS novidades_comentarios_insert ON comunidade_novidades_comentarios;
CREATE POLICY novidades_comentarios_insert ON comunidade_novidades_comentarios
  FOR INSERT TO authenticated
  WITH CHECK (id_autor = auth.uid() AND (is_admin = false OR is_admin()));
