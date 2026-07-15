-- Rollback: remove a origem 'auto' (delete os lançamentos auto antes, senão a constraint falha).
DELETE FROM metodo_economias WHERE origem = 'auto';
ALTER TABLE metodo_economias DROP CONSTRAINT IF EXISTS metodo_economias_origem_check;
ALTER TABLE metodo_economias ADD CONSTRAINT metodo_economias_origem_check
  CHECK (origem IN ('manual','ia'));
