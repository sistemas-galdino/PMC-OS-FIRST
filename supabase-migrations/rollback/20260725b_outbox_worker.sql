-- Rollback — RPCs de apoio ao worker da Onda 1.
DROP FUNCTION IF EXISTS public.enfileirar_mensagem(uuid, text, text, text, jsonb, text, text);
DROP FUNCTION IF EXISTS public.concluir_mensagem(uuid, boolean, text, text);
DROP FUNCTION IF EXISTS public.reservar_mensagens(int);
