-- Remove o CHECK constraint de tipo_encontro pra permitir que o
-- admin nomeie livremente o tipo no momento do cadastro.
-- A UI segue mapeando os tipos conhecidos pra cores/labels e cai num
-- fallback neutro pra valores arbitrários.

ALTER TABLE public.encontros_ao_vivo
  DROP CONSTRAINT IF EXISTS encontros_ao_vivo_tipo_encontro_check;
