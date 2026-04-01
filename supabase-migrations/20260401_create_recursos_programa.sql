CREATE TABLE IF NOT EXISTS recursos_programa (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  titulo     text NOT NULL,
  url        text NOT NULL,
  icone      text NOT NULL DEFAULT '🔗',
  categoria  text NOT NULL DEFAULT 'Geral',
  ordem      integer NOT NULL DEFAULT 0,
  ativo      boolean NOT NULL DEFAULT true,
  criado_em  timestamptz NOT NULL DEFAULT now()
);
