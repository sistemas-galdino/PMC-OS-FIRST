-- Rollback: remove o link do co-piloto.
ALTER TABLE metodo_copilotos DROP COLUMN IF EXISTS url;
