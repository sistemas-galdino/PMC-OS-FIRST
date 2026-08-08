-- Rollback — remove as versões com parâmetro de data dos digests.
-- (O forward anterior, 20260725c_digests, recria as versões sem argumento.)
DROP FUNCTION IF EXISTS public.digest_diario_guardiao(date);
DROP FUNCTION IF EXISTS public.digest_semanal_dono(date);
