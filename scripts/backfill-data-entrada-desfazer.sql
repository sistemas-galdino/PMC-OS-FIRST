-- Desfaz scripts/backfill-data-entrada.sql.
--
-- Devolve ao estado anterior: data volta a NULL nas linhas que o backfill
-- escreveu. A marca data_backfilled é o que torna isso possível — datas
-- informadas por gente têm data_backfilled = false e não são tocadas.

BEGIN;

SELECT count(*) AS vao_voltar_para_nulo
  FROM public.clientes_entrada_new WHERE data_backfilled;

UPDATE public.clientes_entrada_new
   SET data = NULL,
       data_backfilled = false
 WHERE data_backfilled;

SELECT count(*) AS ainda_marcados
  FROM public.clientes_entrada_new WHERE data_backfilled;  -- esperado: 0

COMMIT;
