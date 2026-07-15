-- Canais de Vendas (dono/PMC): metas de nº de vendas por canal e por mês.
-- 4 canais: pitch_evento, pos_evento, indicacao, social_seller.
-- Planejado e realizado por (ano, mês, canal); trimestre/semestre = soma dos meses.
-- Dado do dono: leitura e escrita apenas admin.
-- 2 produtos: 'pmc' e 'conselho' (Conselho de Implementação).
CREATE TABLE IF NOT EXISTS canais_vendas_metas (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ano int NOT NULL,
  mes int NOT NULL CHECK (mes BETWEEN 1 AND 12),
  canal text NOT NULL,
  produto text NOT NULL DEFAULT 'pmc',
  planejado int NOT NULL DEFAULT 0,
  realizado int NOT NULL DEFAULT 0,
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS canais_vendas_metas_ano_idx ON canais_vendas_metas(ano);
CREATE UNIQUE INDEX IF NOT EXISTS canais_vendas_metas_uniq ON canais_vendas_metas(ano, mes, canal, produto);

ALTER TABLE canais_vendas_metas ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS canais_vendas_admin_all ON canais_vendas_metas;
CREATE POLICY canais_vendas_admin_all ON canais_vendas_metas
  FOR ALL TO authenticated
  USING (is_admin())
  WITH CHECK (is_admin());
