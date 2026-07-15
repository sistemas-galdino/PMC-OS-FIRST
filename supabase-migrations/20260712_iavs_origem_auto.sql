-- IAVS: origem 'auto' para lançamentos calculados automaticamente pelo sistema
-- (a partir de sistemas criados, co-pilotos ativos, BI evitado e Black CRM).
ALTER TABLE metodo_economias DROP CONSTRAINT IF EXISTS metodo_economias_origem_check;
ALTER TABLE metodo_economias ADD CONSTRAINT metodo_economias_origem_check
  CHECK (origem IN ('manual','ia','auto'));
