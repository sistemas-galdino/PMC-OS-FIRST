-- Migration: add_fk_entrada_cliente
-- Date: 2026-03-20
-- Description: Adiciona FK formal entre clientes_entrada_new e clientes_formulario.
--
-- Contexto:
--   clientes_entrada_new.id_cliente já referenciava clientes_formulario.id_cliente
--   pelos UUIDs coincidindo, mas sem constraint formal no banco.
--   Verificado previamente: sem linhas órfãs, tipos compatíveis (uuid).
--
-- ON DELETE RESTRICT: impede deletar um cliente de clientes_formulario
--   enquanto ele tiver entradas em clientes_entrada_new.

ALTER TABLE clientes_entrada_new
ADD CONSTRAINT fk_entrada_cliente
  FOREIGN KEY (id_cliente)
  REFERENCES clientes_formulario(id_cliente)
  ON DELETE RESTRICT;
