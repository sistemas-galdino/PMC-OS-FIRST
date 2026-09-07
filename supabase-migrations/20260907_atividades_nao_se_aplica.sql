-- Status "Não se aplica" para as atividades do CRM.
--
-- Faltava um jeito de encerrar tarefa que simplesmente não cabe naquele
-- cliente. As duas saídas eram deixar pendente (envelhecendo como atrasada e
-- sujando o KPI da CS) ou marcar como realizada — mentira que infla o % de
-- conclusão. 'nao_se_aplica' é estado final que não conta como feito.
--
-- Sem timestamp próprio de propósito: o trigger crm_atividades_touch já grava
-- status_desde a cada troca de status e zera data_conclusao fora de
-- 'realizado', que é justamente o que se quer aqui (data_conclusao é a base do
-- KPI de concluídas e não pode contar N/A).

ALTER TABLE public.cliente_atividades
  DROP CONSTRAINT IF EXISTS cliente_atividades_status_check;
ALTER TABLE public.cliente_atividades
  ADD CONSTRAINT cliente_atividades_status_check
  CHECK (status IN (
    'pendente','em_andamento','impedido','realizado','atrasado','cancelado',
    'aguardando_cliente','aguardando_time','nao_se_aplica'
  ));
