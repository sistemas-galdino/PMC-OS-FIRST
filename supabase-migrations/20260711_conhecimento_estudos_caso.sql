-- Conhecimento → Estudos de Caso: histórias reais de membros, cadastradas
-- pelo dono (admin) e exibidas aos clientes em /estudos-caso.
CREATE TABLE IF NOT EXISTS conhecimento_estudos_caso (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  titulo text NOT NULL,
  autor text,                    -- ex.: "Gabi"
  autor_papel text,              -- ex.: "Mentora e Empreendedora"
  resumo text,                   -- descrição curta (card da galeria)
  sobre text,                    -- markdown "Sobre este estudo de caso"
  video_url text,                -- YouTube, Vimeo ou .mp4
  thumbnail_url text,            -- capa; se vazio e YouTube, usa a thumb automática
  tags jsonb NOT NULL DEFAULT '[]',      -- ["Automação de Conteúdo", ...]
  metricas jsonb NOT NULL DEFAULT '[]',  -- [{"valor":"De R$800 para R$200","label":"Redução de Custo"}]
  destaque boolean NOT NULL DEFAULT false,
  publicado boolean NOT NULL DEFAULT true,
  data_publicacao date NOT NULL DEFAULT current_date,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS conhecimento_estudos_caso_data_idx ON conhecimento_estudos_caso(data_publicacao DESC);

ALTER TABLE conhecimento_estudos_caso ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS estudos_caso_select ON conhecimento_estudos_caso;
CREATE POLICY estudos_caso_select ON conhecimento_estudos_caso
  FOR SELECT TO authenticated
  USING (publicado = true OR is_admin());

DROP POLICY IF EXISTS estudos_caso_admin_write ON conhecimento_estudos_caso;
CREATE POLICY estudos_caso_admin_write ON conhecimento_estudos_caso
  FOR ALL TO authenticated
  USING (is_admin())
  WITH CHECK (is_admin());
