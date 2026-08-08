-- Rollback — reabre o acesso às métricas de constância para authenticated.
-- ATENÇÃO: reintroduz a possibilidade de medir a constância de outra empresa.
GRANT EXECUTE ON FUNCTION public.dias_fechados(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.semanas_perfeitas(uuid) TO authenticated;
