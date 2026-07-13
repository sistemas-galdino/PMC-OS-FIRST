-- Rollback: remove o nível hierárquico do colaborador.
ALTER TABLE cliente_colaboradores DROP COLUMN IF EXISTS nivel;
