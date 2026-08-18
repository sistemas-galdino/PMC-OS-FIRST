-- CRM — remove clientes_entrada_new.ciclo_galdino_cadencia.
--
-- A cadência do ciclo do Galdino (4, 6 ou 12 reuniões) já tinha dono antes de
-- eu criar essa coluna: `cliente_informacoes_empresa.total_galdino`, que o
-- perfil do cliente lê e grava na aba "Ciclo Galdino"
-- (components/client-profile/admin-tabs/tab-ciclo-galdino.tsx).
--
-- Duas colunas para o mesmo fato significa que mudar a cadência no perfil não
-- mudava os checkpoints no CRM, e vice-versa. O CRM agora lê `total_galdino`
-- (ver anexarInformacoesEmpresa em web/src/lib/crm/mappers.ts).
--
-- Nenhum dado se perde: a coluna está NULL nas 305 linhas do PROD — nunca foi
-- escrita, porque a UI que a preencheria não chegou a existir.
--
-- Rollback: rollback/20260817_crm_remove_cadencia_duplicada_down.sql

ALTER TABLE public.clientes_entrada_new
  DROP COLUMN IF EXISTS ciclo_galdino_cadencia;
