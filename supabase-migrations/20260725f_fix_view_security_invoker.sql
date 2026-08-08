-- Capturada do estado já aplicado (DEV+PROD) para alinhar o repositório ao banco.
-- CORRECAO DE SEGURANCA: sem security_invoker a view roda como postgres e
-- contorna a RLS de clientes_entrada_new — vazando a base inteira para qualquer
-- usuario autenticado. Com security_invoker=true ela respeita a politica de quem
-- consulta: cliente ve so a propria linha, admin ve todas.
ALTER VIEW public.cobertura_contato SET (security_invoker = true);
