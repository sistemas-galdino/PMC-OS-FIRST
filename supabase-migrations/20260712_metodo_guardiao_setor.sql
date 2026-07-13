-- Setor da empresa a que o guardião pertence (Fase 1 do Método MC).
-- Complementa o "cargo": enquanto cargo é a função (ex.: Analista, Coordenador),
-- setor indica o departamento (Comercial, Marketing, Operações, Financeiro...).
ALTER TABLE metodo_guardioes ADD COLUMN IF NOT EXISTS setor text;
