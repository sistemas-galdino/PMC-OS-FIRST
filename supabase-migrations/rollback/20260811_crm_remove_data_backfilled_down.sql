-- Desfaz 20260811_crm_remove_data_backfilled.sql: recria a coluna como estava
-- em 20260810_crm_clientes_colunas.sql.
--
-- Volta com todas as linhas em `false`. Não havia nenhuma marcada como `true`
-- quando a coluna foi removida — o backfill nunca chegou a rodar em lugar
-- nenhum, nem no DEV.

ALTER TABLE public.clientes_entrada_new
  ADD COLUMN IF NOT EXISTS data_backfilled boolean NOT NULL DEFAULT false;

COMMENT ON COLUMN public.clientes_entrada_new.data_backfilled IS
  'true quando clientes_entrada_new.data foi inferida pelo backfill, não informada na entrada.';
