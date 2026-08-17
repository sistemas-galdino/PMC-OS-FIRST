-- Desfaz 20260817_crm_remove_cadencia_duplicada.sql.
--
-- Recria a coluna como estava em 20260810_crm_clientes_colunas.sql: sem valor
-- em nenhuma linha, que era o estado no momento da remoção (conferido no PROD
-- em 17/08/2026 — 305 linhas, todas NULL).
--
-- Restaurar a coluna NÃO devolve o comportamento antigo do frontend: o CRM
-- passou a ler cliente_informacoes_empresa.total_galdino. Para reverter de
-- verdade é preciso voltar o código também.

ALTER TABLE public.clientes_entrada_new
  ADD COLUMN IF NOT EXISTS ciclo_galdino_cadencia integer;
