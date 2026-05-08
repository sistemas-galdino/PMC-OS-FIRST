-- Tabela de atividades do cliente (aba "Atividades" da Visão Admin).
-- id_cliente sem FK porque clientes_entrada_new.id_cliente não tem UNIQUE
-- (PK é id_entrada). Mesmo padrão de vitorias/reunioes_*.

CREATE TABLE IF NOT EXISTS cliente_atividades (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  id_cliente uuid NOT NULL,
  titulo text NOT NULL,
  descricao text,
  tipo text,
  tipo_outro text,
  entrega_relacionada text,
  entrega_outro text,
  prioridade text NOT NULL DEFAULT 'media'
    CHECK (prioridade IN ('baixa','media','alta')),
  prazo date,
  status text NOT NULL DEFAULT 'pendente'
    CHECK (status IN ('pendente','em_andamento','impedido','realizado','atrasado','cancelado')),
  responsavel_cs text,
  observacoes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS cliente_atividades_id_cliente_idx ON cliente_atividades(id_cliente);

ALTER TABLE cliente_atividades ENABLE ROW LEVEL SECURITY;
CREATE POLICY cliente_atividades_admin ON cliente_atividades
  FOR ALL TO authenticated
  USING (is_admin())
  WITH CHECK (is_admin());
