-- Rollback de 20260907_reuniao_anexos_tipos.sql: volta o bucket reunioes-anexos
-- ao estado anterior (sem limite de tamanho e sem lista de mime types).
UPDATE storage.buckets
SET file_size_limit = NULL,
    allowed_mime_types = NULL
WHERE id = 'reunioes-anexos';
