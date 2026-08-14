-- Estudos de Caso ganham nicho, para o cliente filtrar pelo setor dele.
--
-- Por que coluna nova e não reaproveitar `tags`: as tags existentes são
-- TEMÁTICAS (Automação, CRM, Dashboard, DRE...) — descrevem o que foi feito,
-- não em que setor. Misturar as duas coisas num campo só daria um filtro
-- confuso, com 70+ opções e nenhuma delas sendo o setor do cliente.
--
-- A taxonomia é a MESMA do onboarding (NICHO_OPTIONS em web/src/data/nichos.ts),
-- o que abre a porta para, depois, sugerir "cases do seu nicho" cruzando com
-- clientes_entrada_new.nicho.
--
-- NULL = ainda não classificado. O filtro só exibe nichos que têm case, então
-- os cases sem nicho continuam aparecendo em "Todos" e nunca geram um chip vazio.
ALTER TABLE public.conhecimento_estudos_caso ADD COLUMN IF NOT EXISTS nicho text;

COMMENT ON COLUMN public.conhecimento_estudos_caso.nicho IS
  'Nicho do case, na taxonomia de NICHO_OPTIONS (web/src/data/nichos.ts). NULL = não classificado.';

CREATE INDEX IF NOT EXISTS idx_estudos_caso_nicho
  ON public.conhecimento_estudos_caso (nicho) WHERE nicho IS NOT NULL;
