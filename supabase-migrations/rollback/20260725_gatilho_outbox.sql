-- Rollback — Onda 1, fundação do gatilho externo.
DROP VIEW IF EXISTS public.cobertura_contato;
DROP FUNCTION IF EXISTS public.contato_persona(uuid, text);
DROP TABLE IF EXISTS public.mensagens_saida CASCADE;
DROP TABLE IF EXISTS public.preferencias_notificacao CASCADE;
DROP FUNCTION IF EXISTS public.normalizar_e164_br(text);
