-- Capturada do estado já aplicado (DEV+PROD) para alinhar o repositório ao banco.
-- Mesma disciplina das outras: funcao que aceita id de terceiro nao fica ao
-- alcance do papel authenticated (senao da para medir a constancia de outra
-- empresa). Quem chama sao as SECURITY DEFINER do postgres (pontos_mc,
-- sync_badges); o front conta pela tabela, ja escopada pela RLS.
REVOKE ALL ON FUNCTION public.dias_fechados(uuid) FROM public, anon, authenticated;
REVOKE ALL ON FUNCTION public.semanas_perfeitas(uuid) FROM public, anon, authenticated;
