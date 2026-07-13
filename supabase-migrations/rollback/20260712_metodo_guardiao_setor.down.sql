-- Rollback: remove a coluna setor do guardião.
ALTER TABLE metodo_guardioes DROP COLUMN IF EXISTS setor;
