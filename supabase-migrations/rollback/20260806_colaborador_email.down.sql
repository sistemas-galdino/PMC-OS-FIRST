-- Rollback de 20260806_colaborador_email.sql
ALTER TABLE cliente_colaboradores DROP COLUMN IF EXISTS email;
