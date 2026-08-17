-- Rollback de 20260817_vitorias_clientes_vitrine.sql
--
-- ATENÇÃO: isto APAGA o acervo da vitrine (84 clientes, 143 cases e o conteúdo
-- editorial curado). A fonte original continua no backup em
-- cases-pmc/vitrine-cases-clientes-pmc/backups/ e o import é idempotente, então
-- dá pra reconstruir — mas edições feitas DEPOIS da importação (headline nova,
-- vínculo de cliente resolvido na mão, logo enviada pela CS) se perdem.
--
-- Os objetos do storage NÃO são removidos de propósito (as logos e os prints
-- ficam nos buckets). Se quiser limpar de vez, esvazie os buckets antes.
--
-- Ordem inversa da migration.

-- 9. RBAC
DELETE FROM public.papel_secoes WHERE secao_chave IN (
  'vitrine','vitrine-cases','vitrine-clientes','vitrine-evidencias','vitrine-oportunidades'
);
DELETE FROM public.secoes_catalogo WHERE chave IN (
  'vitrine','vitrine-cases','vitrine-clientes','vitrine-evidencias','vitrine-oportunidades'
);

-- 8. Buckets (policies + registro; objetos preservados)
DROP POLICY IF EXISTS "vitrine_evidencias_admin_rw" ON storage.objects;
DROP POLICY IF EXISTS "vitrine_logos_admin_rw" ON storage.objects;
-- DELETE FROM storage.buckets WHERE id IN ('vitrine-logos','vitrine-evidencias');
--   ^ descomente só depois de esvaziar os buckets (o delete falha com objetos dentro)

-- 7. View
DROP VIEW IF EXISTS public.vitrine_showcase;

-- 6..1. Tabelas (o CASCADE das FKs cuida da ordem, mas explicitamos)
DROP TABLE IF EXISTS public.vitrine_oportunidades;
DROP TABLE IF EXISTS public.vitrine_capturas;
DROP TABLE IF EXISTS public.vitrine_evidencias;
DROP TABLE IF EXISTS public.vitrine_cases;
DROP TABLE IF EXISTS public.vitrine_clientes;

-- public.set_updated_at() NÃO é removida: é helper compartilhado por várias
-- features anteriores (central_atendimentos, roadmap_sistemas, etc).

NOTIFY pgrst, 'reload schema';
