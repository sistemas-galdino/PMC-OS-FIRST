-- Rollback do vínculo Vitória -> Case. As colunas guardam o texto gerado pela
-- IA e o vínculo com o repositório; derrubar isso é perda de dado real, não só
-- de schema. Os cases em si NÃO são apagados.
DROP FUNCTION IF EXISTS public.sincronizar_vitoria_vitrine(uuid);
DROP FUNCTION IF EXISTS public.proximo_case_id();
DROP INDEX IF EXISTS public.vitrine_cases_repositorio_vitoria_uidx;
ALTER TABLE public.vitrine_cases
  DROP CONSTRAINT IF EXISTS vitrine_cases_ia_status_check,
  DROP COLUMN IF EXISTS repositorio_vitoria_id,
  DROP COLUMN IF EXISTS gerado_por_ia,
  DROP COLUMN IF EXISTS ia_gerado_em,
  DROP COLUMN IF EXISTS ia_status,
  DROP COLUMN IF EXISTS ia_erro;
DROP SEQUENCE IF EXISTS public.vitrine_case_seq;

NOTIFY pgrst, 'reload schema';
