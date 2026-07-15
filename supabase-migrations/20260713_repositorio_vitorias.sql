-- Repositório de Vitórias (admin/CS): vitórias curadas com evidência e workflow de
-- aprovação (kanban). As "case" ficam marcadas para o time gravar o vídeo do estudo de caso.
CREATE TABLE IF NOT EXISTS repositorio_vitorias (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  id_cliente uuid,                    -- cliente da vitória (clientes_entrada_new.id_cliente)
  cliente_nome text,                  -- denormalizado para exibição
  titulo text NOT NULL,
  descricao text,
  area text,
  origem text,
  evidencia_tipo text NOT NULL DEFAULT 'imagem'
    CHECK (evidencia_tipo IN ('imagem','whatsapp','sistema','link')),
  evidencia_url text,                 -- upload (bucket repositorio-vitorias)
  evidencia_link text,                -- link externo alternativo
  status text NOT NULL DEFAULT 'aguardando'
    CHECK (status IN ('aguardando','aprovada','reprovada','case')),
  motivo_reprovacao text,
  cadastrado_por uuid,                -- CS/admin que registrou
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS repositorio_vitorias_status_idx ON repositorio_vitorias(status);
CREATE INDEX IF NOT EXISTS repositorio_vitorias_id_cliente_idx ON repositorio_vitorias(id_cliente);

ALTER TABLE repositorio_vitorias ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS repositorio_vitorias_admin ON repositorio_vitorias;
CREATE POLICY repositorio_vitorias_admin ON repositorio_vitorias
  FOR ALL TO authenticated
  USING (is_admin())
  WITH CHECK (is_admin());

-- Bucket público das evidências; escrita restrita a admin (getPublicUrl exibe inline).
INSERT INTO storage.buckets (id, name, public)
VALUES ('repositorio-vitorias', 'repositorio-vitorias', true)
ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS "repositorio_vitorias_admin_rw" ON storage.objects;
CREATE POLICY "repositorio_vitorias_admin_rw" ON storage.objects
  FOR ALL TO authenticated
  USING (bucket_id = 'repositorio-vitorias' AND is_admin())
  WITH CHECK (bucket_id = 'repositorio-vitorias' AND is_admin());
