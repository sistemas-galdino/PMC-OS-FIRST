-- Método MC — as áreas cadastradas na Fase 2 passam a atravessar o método inteiro.
--
-- Até aqui elas morriam na Fase 2: a Fase 3 tinha um campo `area` em TEXTO LIVRE
-- (o cliente redigitava, e "Comercial" e "comercial" viravam coisas diferentes) e
-- as fases 4, 5 e 6 não tinham área nenhuma. Resultado: era impossível ler
-- "o que a IA fez no Comercial" ponta a ponta.
--
-- FK COMPOSTA (id_area, id_cliente), não simples: garante que a área é da MESMA
-- empresa. E o SET NULL nomeia a coluna — em FK composta, o SET NULL sem lista
-- tenta anular id_cliente também (NOT NULL) e excluir uma área quebraria.

ALTER TABLE public.metodo_areas DROP CONSTRAINT IF EXISTS metodo_areas_id_cliente_uk;
ALTER TABLE public.metodo_areas ADD CONSTRAINT metodo_areas_id_cliente_uk UNIQUE (id, id_cliente);

-- Fase 3 · Gargalos — mantém `area` (texto) como fallback do que não casar.
ALTER TABLE public.metodo_gargalos ADD COLUMN IF NOT EXISTS id_area uuid;
ALTER TABLE public.metodo_gargalos DROP CONSTRAINT IF EXISTS metodo_gargalos_area_mesma_empresa;
ALTER TABLE public.metodo_gargalos ADD CONSTRAINT metodo_gargalos_area_mesma_empresa
  FOREIGN KEY (id_area, id_cliente) REFERENCES public.metodo_areas(id, id_cliente)
  ON DELETE SET NULL (id_area);

-- Fase 4 · Co-Pilotos
ALTER TABLE public.metodo_copilotos ADD COLUMN IF NOT EXISTS id_area uuid;
ALTER TABLE public.metodo_copilotos DROP CONSTRAINT IF EXISTS metodo_copilotos_area_mesma_empresa;
ALTER TABLE public.metodo_copilotos ADD CONSTRAINT metodo_copilotos_area_mesma_empresa
  FOREIGN KEY (id_area, id_cliente) REFERENCES public.metodo_areas(id, id_cliente)
  ON DELETE SET NULL (id_area);

-- Fase 5 · Torre de Comando
ALTER TABLE public.metodo_sistemas ADD COLUMN IF NOT EXISTS id_area uuid;
ALTER TABLE public.metodo_sistemas DROP CONSTRAINT IF EXISTS metodo_sistemas_area_mesma_empresa;
ALTER TABLE public.metodo_sistemas ADD CONSTRAINT metodo_sistemas_area_mesma_empresa
  FOREIGN KEY (id_area, id_cliente) REFERENCES public.metodo_areas(id, id_cliente)
  ON DELETE SET NULL (id_area);

-- Fase 6 · Engenharia Operacional (economias)
ALTER TABLE public.metodo_economias ADD COLUMN IF NOT EXISTS id_area uuid;
ALTER TABLE public.metodo_economias DROP CONSTRAINT IF EXISTS metodo_economias_area_mesma_empresa;
ALTER TABLE public.metodo_economias ADD CONSTRAINT metodo_economias_area_mesma_empresa
  FOREIGN KEY (id_area, id_cliente) REFERENCES public.metodo_areas(id, id_cliente)
  ON DELETE SET NULL (id_area);

CREATE INDEX IF NOT EXISTS idx_gargalos_area   ON public.metodo_gargalos (id_area)  WHERE id_area IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_copilotos_area  ON public.metodo_copilotos (id_area) WHERE id_area IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_sistemas_area   ON public.metodo_sistemas (id_area)  WHERE id_area IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_economias_area  ON public.metodo_economias (id_area) WHERE id_area IS NOT NULL;

-- Backfill: casa o texto livre dos gargalos com a área cadastrada, por nome.
-- Só casa quando há EXATAMENTE uma área com aquele nome; nome ambíguo fica texto.
UPDATE public.metodo_gargalos g
   SET id_area = a.id
  FROM public.metodo_areas a
 WHERE g.id_area IS NULL
   AND coalesce(btrim(g.area), '') <> ''
   AND a.id_cliente = g.id_cliente
   AND lower(btrim(a.nome)) = lower(btrim(g.area))
   AND (SELECT count(*) FROM public.metodo_areas a2
         WHERE a2.id_cliente = g.id_cliente
           AND lower(btrim(a2.nome)) = lower(btrim(g.area))) = 1;

COMMENT ON COLUMN public.metodo_gargalos.id_area IS
  'Área do Método (Fase 2). NULL + area(text) = área digitada que não casou com nenhuma cadastrada.';
