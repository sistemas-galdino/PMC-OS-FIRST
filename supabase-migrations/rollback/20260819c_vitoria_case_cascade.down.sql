-- Rollback: volta a FK para ON DELETE SET NULL. Os cases apagados pela limpeza
-- retroativa NÃO voltam — eram órfãos publicados e a exclusão foi deliberada.
ALTER TABLE public.vitrine_cases
  DROP CONSTRAINT IF EXISTS vitrine_cases_repositorio_vitoria_id_fkey;
ALTER TABLE public.vitrine_cases
  ADD CONSTRAINT vitrine_cases_repositorio_vitoria_id_fkey
  FOREIGN KEY (repositorio_vitoria_id) REFERENCES public.repositorio_vitorias(id)
  ON DELETE SET NULL;

NOTIFY pgrst, 'reload schema';
