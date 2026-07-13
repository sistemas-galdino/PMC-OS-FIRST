-- Link do co-piloto (Fase 4 — Co-Pilotos): URL para acessar o co-piloto (projeto no Claude, ferramenta etc.).
ALTER TABLE metodo_copilotos ADD COLUMN IF NOT EXISTS url text;
