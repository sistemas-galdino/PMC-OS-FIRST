-- Tabela com registro de cancelamento (1 por cliente, upsertable).

CREATE TABLE IF NOT EXISTS cliente_cancelamento (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  id_cliente uuid UNIQUE NOT NULL,
  motivos text[] NOT NULL DEFAULT '{}',
  responsabilidade text
    CHECK (responsabilidade IN ('cliente','programa','comunicacao','operacional','nao_identificado')),
  tentativa_reversao boolean NOT NULL DEFAULT false,
  resumo_ocorrido text,
  data_cancelamento date NOT NULL DEFAULT current_date,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE cliente_cancelamento ENABLE ROW LEVEL SECURITY;
CREATE POLICY cliente_cancelamento_admin ON cliente_cancelamento
  FOR ALL TO authenticated
  USING (is_admin())
  WITH CHECK (is_admin());
