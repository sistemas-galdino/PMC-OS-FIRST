-- Rollback de 20260810_crm_atividades_extensao.sql

DROP TRIGGER IF EXISTS cliente_atividades_touch ON public.cliente_atividades;
DROP FUNCTION IF EXISTS public.crm_atividades_touch();

DROP INDEX IF EXISTS public.cliente_atividades_batch_idx;
DROP INDEX IF EXISTS public.cliente_atividades_projeto_idx;
DROP INDEX IF EXISTS public.cliente_atividades_status_idx;
DROP INDEX IF EXISTS public.cliente_atividades_responsavel_prazo_idx;

ALTER TABLE public.cliente_atividades
  DROP CONSTRAINT IF EXISTS cliente_atividades_impedimento_check,
  DROP CONSTRAINT IF EXISTS cliente_atividades_responsavel_tipo_check;

-- Volta o CHECK de status original.
ALTER TABLE public.cliente_atividades
  DROP CONSTRAINT IF EXISTS cliente_atividades_status_check;
UPDATE public.cliente_atividades
  SET status = 'pendente'
  WHERE status IN ('aguardando_cliente','aguardando_time');
ALTER TABLE public.cliente_atividades
  ADD CONSTRAINT cliente_atividades_status_check
  CHECK (status IN ('pendente','em_andamento','impedido','realizado','atrasado','cancelado'));

ALTER TABLE public.cliente_atividades
  DROP COLUMN IF EXISTS hora,
  DROP COLUMN IF EXISTS acao,
  DROP COLUMN IF EXISTS acao_detalhe,
  DROP COLUMN IF EXISTS entrega_detalhe,
  DROP COLUMN IF EXISTS origem,
  DROP COLUMN IF EXISTS origem_label,
  DROP COLUMN IF EXISTS batch_id,
  DROP COLUMN IF EXISTS motivo_impedimento,
  DROP COLUMN IF EXISTS status_desde,
  DROP COLUMN IF EXISTS dependencia_nome,
  DROP COLUMN IF EXISTS responsavel_tipo,
  DROP COLUMN IF EXISTS responsavel_nome,
  DROP COLUMN IF EXISTS projeto_id,
  DROP COLUMN IF EXISTS pulou_proxima,
  DROP COLUMN IF EXISTS data_conclusao;

-- Restaura NOT NULL (remove antes as tarefas gerais, que não existiam no modelo antigo).
DELETE FROM public.cliente_atividades WHERE id_cliente IS NULL;
ALTER TABLE public.cliente_atividades
  ALTER COLUMN id_cliente SET NOT NULL;
