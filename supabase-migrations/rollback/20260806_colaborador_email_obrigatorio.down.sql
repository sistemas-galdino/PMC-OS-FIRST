-- Rollback de 20260806_colaborador_email_obrigatorio.sql
-- Volta o e-mail do colaborador a ser opcional no banco.
ALTER TABLE cliente_colaboradores
  DROP CONSTRAINT IF EXISTS cliente_colaboradores_email_obrigatorio;
