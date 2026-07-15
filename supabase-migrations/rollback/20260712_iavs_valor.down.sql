-- Rollback IAVS: volta os tipos originais e remove colunas/tabela.
DROP TABLE IF EXISTS metodo_perfis_custo;
ALTER TABLE metodo_economias DROP COLUMN IF EXISTS capacidade_nova;
ALTER TABLE metodo_economias DROP COLUMN IF EXISTS metodo_valoracao;
ALTER TABLE metodo_economias DROP COLUMN IF EXISTS recorrencia;
ALTER TABLE metodo_economias DROP COLUMN IF EXISTS natureza;
ALTER TABLE metodo_economias DROP CONSTRAINT IF EXISTS metodo_economias_tipo_check;
-- Atenção: se houver linhas com tipos novos, esta constraint falha — remova-as antes.
ALTER TABLE metodo_economias ADD CONSTRAINT metodo_economias_tipo_check
  CHECK (tipo IN ('sistema','copiloto','processo'));
