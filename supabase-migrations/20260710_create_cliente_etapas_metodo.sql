-- Progresso do cliente nas 7 etapas do Método PMC (tela Início).
-- id_cliente sem FK porque clientes_entrada_new.id_cliente não tem UNIQUE
-- (PK é id_entrada). Mesmo padrão de cliente_atividades/vitorias.

CREATE TABLE IF NOT EXISTS cliente_etapas_metodo (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  id_cliente uuid NOT NULL,
  etapa integer NOT NULL CHECK (etapa BETWEEN 1 AND 7),
  concluida boolean NOT NULL DEFAULT false,
  concluida_em timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (id_cliente, etapa)
);
CREATE INDEX IF NOT EXISTS cliente_etapas_metodo_id_cliente_idx ON cliente_etapas_metodo(id_cliente);

ALTER TABLE cliente_etapas_metodo ENABLE ROW LEVEL SECURITY;

-- Cliente vê o próprio progresso; só admin (mentores) marca/desmarca etapas.
CREATE POLICY cliente_etapas_metodo_select ON cliente_etapas_metodo
  FOR SELECT TO authenticated
  USING (auth.uid() = id_cliente OR is_admin());

CREATE POLICY cliente_etapas_metodo_insert ON cliente_etapas_metodo
  FOR INSERT TO authenticated
  WITH CHECK (is_admin());

CREATE POLICY cliente_etapas_metodo_update ON cliente_etapas_metodo
  FOR UPDATE TO authenticated
  USING (is_admin())
  WITH CHECK (is_admin());

CREATE POLICY cliente_etapas_metodo_delete ON cliente_etapas_metodo
  FOR DELETE TO authenticated
  USING (is_admin());
