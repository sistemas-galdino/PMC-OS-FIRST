-- Rollback de 20260818_vitrine_papel_secoes.sql
-- Volta ao estado anterior: só papéis full (is_full) enxergam o segmento.
DELETE FROM public.papel_secoes
WHERE secao_chave LIKE 'vitrine%'
  AND papel_chave IN ('cs', 'consultor');

NOTIFY pgrst, 'reload schema';
