-- Notas do cliente por seção do Método (ex.: melhorias da rotina do Guardião).
-- Genérica: uma nota por (cliente, chave). chave identifica a seção.
CREATE TABLE IF NOT EXISTS metodo_notas (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  id_cliente uuid NOT NULL,
  chave text NOT NULL,
  notas text,
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (id_cliente, chave)
);

ALTER TABLE metodo_notas ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS metodo_notas_owner ON metodo_notas;
CREATE POLICY metodo_notas_owner ON metodo_notas
  FOR ALL TO authenticated
  USING (id_cliente = auth.uid() OR is_admin())
  WITH CHECK (id_cliente = auth.uid() OR is_admin());
