-- CRM — estende cliente_atividades para o modelo `Atividade` do CS Manager.
-- Mantém o vocabulário snake_case já gravado no banco; a tradução para os
-- rótulos da UI ("Concluída", "Em andamento"…) fica na camada de dados.

-- 1) Tarefas gerais (não vinculadas a cliente).
-- A Mayara pediu explicitamente: "tarefas vinculadas a clientes e tarefas gerais"
-- (ex.: o projeto de NPS que fica com a Francielly).
ALTER TABLE public.cliente_atividades
  ALTER COLUMN id_cliente DROP NOT NULL;

-- 2) Campos novos.
ALTER TABLE public.cliente_atividades
  ADD COLUMN IF NOT EXISTS hora time,
  ADD COLUMN IF NOT EXISTS acao text,
  ADD COLUMN IF NOT EXISTS acao_detalhe text,
  ADD COLUMN IF NOT EXISTS entrega_detalhe text,
  -- Origem: como a atividade nasceu (manual, rotina, alerta, checkpoint de ciclo…).
  ADD COLUMN IF NOT EXISTS origem text,
  ADD COLUMN IF NOT EXISTS origem_label text,
  -- Agrupa atividades criadas em lote (seleção em massa de clientes).
  ADD COLUMN IF NOT EXISTS batch_id uuid,
  -- Obrigatório quando status = 'impedido' (regra da Mayara: "tem um campo
  -- que deve colocar o motivo do travamento").
  ADD COLUMN IF NOT EXISTS motivo_impedimento text,
  -- Desde quando está no status atual — alimenta o "há N dias" da UI.
  ADD COLUMN IF NOT EXISTS status_desde timestamptz NOT NULL DEFAULT now(),
  -- Nome da pessoa interna aguardada (Galdino, consultor…).
  ADD COLUMN IF NOT EXISTS dependencia_nome text,
  ADD COLUMN IF NOT EXISTS responsavel_tipo text NOT NULL DEFAULT 'CS',
  ADD COLUMN IF NOT EXISTS responsavel_nome text,
  ADD COLUMN IF NOT EXISTS projeto_id uuid,
  ADD COLUMN IF NOT EXISTS pulou_proxima boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS data_conclusao timestamptz;

-- 3) Amplia o vocabulário de status com os dois estados de espera.
ALTER TABLE public.cliente_atividades
  DROP CONSTRAINT IF EXISTS cliente_atividades_status_check;
ALTER TABLE public.cliente_atividades
  ADD CONSTRAINT cliente_atividades_status_check
  CHECK (status IN (
    'pendente','em_andamento','impedido','realizado','atrasado','cancelado',
    'aguardando_cliente','aguardando_time'
  ));

ALTER TABLE public.cliente_atividades
  DROP CONSTRAINT IF EXISTS cliente_atividades_responsavel_tipo_check;
ALTER TABLE public.cliente_atividades
  ADD CONSTRAINT cliente_atividades_responsavel_tipo_check
  CHECK (responsavel_tipo IN ('CS','Cliente','Consultor','Interno'));

-- 4) Motivo obrigatório quando impedida.
ALTER TABLE public.cliente_atividades
  DROP CONSTRAINT IF EXISTS cliente_atividades_impedimento_check;
ALTER TABLE public.cliente_atividades
  ADD CONSTRAINT cliente_atividades_impedimento_check
  CHECK (status <> 'impedido' OR nullif(btrim(coalesce(motivo_impedimento,'')),'') IS NOT NULL);

-- 5) Índices dos recortes que a UI faz o tempo todo.
CREATE INDEX IF NOT EXISTS cliente_atividades_responsavel_prazo_idx
  ON public.cliente_atividades (responsavel_cs, prazo);
CREATE INDEX IF NOT EXISTS cliente_atividades_status_idx
  ON public.cliente_atividades (status);
CREATE INDEX IF NOT EXISTS cliente_atividades_projeto_idx
  ON public.cliente_atividades (projeto_id) WHERE projeto_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS cliente_atividades_batch_idx
  ON public.cliente_atividades (batch_id) WHERE batch_id IS NOT NULL;

-- 6) Mantém status_desde e updated_at coerentes sem depender do cliente.
CREATE OR REPLACE FUNCTION public.crm_atividades_touch()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at := now();
  IF NEW.status IS DISTINCT FROM OLD.status THEN
    NEW.status_desde := now();
    IF NEW.status = 'realizado' AND NEW.data_conclusao IS NULL THEN
      NEW.data_conclusao := now();
    END IF;
    IF NEW.status <> 'realizado' THEN
      NEW.data_conclusao := NULL;
    END IF;
    IF NEW.status <> 'impedido' THEN
      NEW.motivo_impedimento := NULL;
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS cliente_atividades_touch ON public.cliente_atividades;
CREATE TRIGGER cliente_atividades_touch
  BEFORE UPDATE ON public.cliente_atividades
  FOR EACH ROW EXECUTE FUNCTION public.crm_atividades_touch();
