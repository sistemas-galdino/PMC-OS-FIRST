-- Nível hierárquico do colaborador (organograma da Fase 4 — Co-Pilotos):
-- estrategico | tatico | operacional. Nullable — quando vazio, a UI infere pelo cargo.
ALTER TABLE cliente_colaboradores ADD COLUMN IF NOT EXISTS nivel text;
