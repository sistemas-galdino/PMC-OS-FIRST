-- Rollback — reabre o acesso direto a contato_persona e remove o wrapper seguro.
-- ATENÇÃO: reintroduz a enumeração de telefone por authenticated. Só use se for
-- reverter toda a onda de segurança.
DROP FUNCTION IF EXISTS public.meu_status_contato();
GRANT EXECUTE ON FUNCTION public.contato_persona(uuid, text) TO authenticated;
