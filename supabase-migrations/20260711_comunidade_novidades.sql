-- Comunidade → Novidades: anúncios da comunidade publicados pelo dono (admin)
-- e exibidos para os clientes na página /novidades.
CREATE TABLE IF NOT EXISTS comunidade_novidades (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  titulo text NOT NULL,
  resumo text,
  conteudo text,                 -- markdown
  data_publicacao date NOT NULL DEFAULT current_date,
  destaque boolean NOT NULL DEFAULT false,
  publicado boolean NOT NULL DEFAULT true,
  autor text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS comunidade_novidades_data_idx ON comunidade_novidades(data_publicacao DESC);

ALTER TABLE comunidade_novidades ENABLE ROW LEVEL SECURITY;

-- Clientes veem só as publicadas; admin (mentores) vê e gerencia tudo.
CREATE POLICY comunidade_novidades_select ON comunidade_novidades
  FOR SELECT TO authenticated
  USING (publicado = true OR is_admin());

CREATE POLICY comunidade_novidades_admin_write ON comunidade_novidades
  FOR ALL TO authenticated
  USING (is_admin())
  WITH CHECK (is_admin());
