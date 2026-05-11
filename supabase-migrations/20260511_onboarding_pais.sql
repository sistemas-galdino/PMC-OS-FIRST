-- Onboarding multi-país: BR (default) + US.
-- Reaproveita colunas cep/uf existentes:
--   - pais='BR': cep=CEP brasileiro (00000-000), uf=sigla UF (SP, RJ, ...)
--   - pais='US': cep=ZIP code (12345 ou 12345-6789), uf=state code (CA, NY, ...)
-- Qualquer query futura que dependa de formato precisa cruzar a coluna `pais`.

ALTER TABLE cliente_onboarding
  ADD COLUMN IF NOT EXISTS pais text NOT NULL DEFAULT 'BR'
    CHECK (pais IN ('BR','US'));

ALTER TABLE clientes_entrada_new
  ADD COLUMN IF NOT EXISTS pais text NOT NULL DEFAULT 'BR'
    CHECK (pais IN ('BR','US'));

COMMENT ON COLUMN cliente_onboarding.pais IS 'País do cliente. BR ou US. cep/uf são interpretados conforme este valor.';
COMMENT ON COLUMN clientes_entrada_new.pais IS 'País do cliente. BR ou US. cep/uf são interpretados conforme este valor.';
