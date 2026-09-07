-- Rollback de 20260907_atividades_nao_se_aplica.sql.
--
-- O CHECK antigo rejeita 'nao_se_aplica', então as linhas já marcadas voltam
-- para 'pendente' antes de restaurar a constraint. É a escolha menos
-- destrutiva: a tarefa reaparece na fila em vez de ser dada como realizada.

UPDATE public.cliente_atividades
   SET status = 'pendente'
 WHERE status = 'nao_se_aplica';

ALTER TABLE public.cliente_atividades
  DROP CONSTRAINT IF EXISTS cliente_atividades_status_check;
ALTER TABLE public.cliente_atividades
  ADD CONSTRAINT cliente_atividades_status_check
  CHECK (status IN (
    'pendente','em_andamento','impedido','realizado','atrasado','cancelado',
    'aguardando_cliente','aguardando_time'
  ));
