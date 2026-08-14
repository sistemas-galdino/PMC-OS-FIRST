-- Rollback — eventos de WhatsApp.
-- Os triggers notificar_assessment_respondido e notificar_vitoria_status são
-- CREATE OR REPLACE de funções pré-existentes: para voltá-las ao comportamento
-- só-sino, reaplique 20260720_notificacoes_automaticas.sql.
SELECT cron.unschedule('eventos-prazo-vencendo');
SELECT cron.unschedule('eventos-trava-parada');
DROP FUNCTION IF EXISTS public.eventos_trava_parada(date);
DROP FUNCTION IF EXISTS public.eventos_prazo_vencendo(date);
DROP TRIGGER IF EXISTS trg_evento_tarefa_atribuida ON public.metodo_tarefas;
DROP FUNCTION IF EXISTS public.evento_tarefa_atribuida();
DROP FUNCTION IF EXISTS public.enfileirar_evento(uuid, text, text, text, jsonb, text);
DROP TRIGGER IF EXISTS trg_marcar_bloqueio_em ON public.metodo_tarefas;
DROP FUNCTION IF EXISTS public.marcar_bloqueio_em();
ALTER TABLE public.metodo_tarefas DROP COLUMN IF EXISTS bloqueio_em;
