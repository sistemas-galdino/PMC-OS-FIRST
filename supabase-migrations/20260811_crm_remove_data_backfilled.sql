-- CRM — remove a coluna data_backfilled.
--
-- Ela nasceu em 20260810_crm_clientes_colunas.sql para marcar as linhas cuja
-- data de entrada tivesse sido INFERIDA por um backfill automático (derivar a
-- data da primeira reunião registrada do cliente).
--
-- O backfill foi cancelado pelo David em 11/08/2026, e a razão é boa: a
-- primeira reunião prova que o cliente JÁ ESTAVA ativo naquela data, não que
-- entrou nela. Quem entrou em março e só teve a primeira reunião em maio
-- ficaria com o ciclo dois meses mais novo — número errado com cara de certo,
-- que ninguém revisaria. As datas serão preenchidas à mão, pelo campo
-- "Data de entrada" no drawer do cliente.
--
-- Sem backfill, a coluna nunca sai de `false` e o COMMENT dela descreve um
-- processo que não existe. Nada no frontend a lê.
--
-- Rollback: rollback/20260811_crm_remove_data_backfilled_down.sql

ALTER TABLE public.clientes_entrada_new
  DROP COLUMN IF EXISTS data_backfilled;
