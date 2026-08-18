-- Rollback — áreas interligadas no Método.
ALTER TABLE public.metodo_economias DROP CONSTRAINT IF EXISTS metodo_economias_area_mesma_empresa;
ALTER TABLE public.metodo_sistemas  DROP CONSTRAINT IF EXISTS metodo_sistemas_area_mesma_empresa;
ALTER TABLE public.metodo_copilotos DROP CONSTRAINT IF EXISTS metodo_copilotos_area_mesma_empresa;
ALTER TABLE public.metodo_gargalos  DROP CONSTRAINT IF EXISTS metodo_gargalos_area_mesma_empresa;
ALTER TABLE public.metodo_economias DROP COLUMN IF EXISTS id_area;
ALTER TABLE public.metodo_sistemas  DROP COLUMN IF EXISTS id_area;
ALTER TABLE public.metodo_copilotos DROP COLUMN IF EXISTS id_area;
ALTER TABLE public.metodo_gargalos  DROP COLUMN IF EXISTS id_area;
ALTER TABLE public.metodo_areas DROP CONSTRAINT IF EXISTS metodo_areas_id_cliente_uk;
