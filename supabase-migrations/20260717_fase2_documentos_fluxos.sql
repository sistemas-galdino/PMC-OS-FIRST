-- Fase 2 v2: múltiplos documentos por ciclo + fluxos estruturados da IA.
-- metodo_ciclo_documentos: lista de arquivos (DRE, fluxo de caixa, extrato...)
-- analisados em conjunto. fluxos_json: saída estruturada da IA (KPIs, insights,
-- ações com prazo, única coisa) — as 4 colunas de texto continuam como
-- fallback/edição manual.
CREATE TABLE IF NOT EXISTS metodo_ciclo_documentos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  id_ciclo uuid NOT NULL REFERENCES metodo_area_ciclos(id) ON DELETE CASCADE,
  id_cliente uuid NOT NULL,
  nome text NOT NULL,
  url text,
  texto text,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS metodo_ciclo_documentos_ciclo_idx ON metodo_ciclo_documentos(id_ciclo);

ALTER TABLE metodo_ciclo_documentos ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS metodo_ciclo_docs_owner ON metodo_ciclo_documentos;
CREATE POLICY metodo_ciclo_docs_owner ON metodo_ciclo_documentos
  FOR ALL TO authenticated
  USING (id_cliente = auth.uid() OR is_admin())
  WITH CHECK (id_cliente = auth.uid() OR is_admin());

ALTER TABLE metodo_area_ciclos ADD COLUMN IF NOT EXISTS fluxos_json jsonb;
