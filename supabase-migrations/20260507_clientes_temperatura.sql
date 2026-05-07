-- Adiciona temperatura_cliente (quente/morno/frio) pra Visão Admin → aba Perfil.
-- nivel_engajamento (antigo) permanece intacto pra não quebrar a listagem em /clientes.

ALTER TABLE clientes_entrada_new
  ADD COLUMN IF NOT EXISTS temperatura_cliente text
    CHECK (temperatura_cliente IN ('quente','morno','frio'));
