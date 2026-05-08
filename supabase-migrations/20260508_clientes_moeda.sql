-- Adiciona moeda do cliente + RPC seguro pro próprio cliente trocar.
-- A coluna fica em clientes_entrada_new (não tabela separada) pra simplificar joins.
-- Default BRL: clientes existentes não veem diferença.

ALTER TABLE clientes_entrada_new
  ADD COLUMN IF NOT EXISTS moeda text NOT NULL DEFAULT 'BRL'
    CHECK (moeda IN ('BRL','USD'));

-- Função SECURITY DEFINER: cliente não tem permissão de UPDATE direto na tabela
-- (RLS bloqueia), mas pode chamar essa função, que altera só a coluna `moeda`
-- da própria row do cliente. Banco continua seguro.
CREATE OR REPLACE FUNCTION update_minha_moeda(nova_moeda text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF nova_moeda NOT IN ('BRL','USD') THEN
    RAISE EXCEPTION 'moeda inválida: %', nova_moeda;
  END IF;
  UPDATE clientes_entrada_new
    SET moeda = nova_moeda
    WHERE id_cliente = auth.uid();
END;
$$;

GRANT EXECUTE ON FUNCTION update_minha_moeda(text) TO authenticated;
