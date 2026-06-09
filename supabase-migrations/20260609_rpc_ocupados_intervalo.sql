-- Versão por INTERVALO do horarios_ocupados_consultor.
-- O link público (anônimo) precisa saber a ocupação de TODA a janela pra:
--   (a) esconder horários já reservados no passo "Horário";
--   (b) esconder datas que não têm nenhum horário livre no passo "Data".
-- Devolve (data, horário) — sem nenhum dado do cliente. SECURITY DEFINER porque o
-- RLS bloqueia leitura anônima das reuniões. Casa por nome + aliases (nomes_match),
-- igual à versão single-date. Dinâmico (lê ao vivo; novo sync bloqueia sozinho).
-- A versão single-date (horarios_ocupados_consultor) continua existindo e é usada
-- pela edge function criar-agendamento — esta migração NÃO exige redeploy de função.
CREATE OR REPLACE FUNCTION public.horarios_ocupados_consultor_intervalo(
  p_slug text, p_from date, p_to date
)
RETURNS TABLE (data_reuniao date, horario time)
LANGUAGE sql STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT DISTINCT ac.data_reuniao, ac.horario
  FROM public.agendamentos_central ac
  WHERE ac.data_reuniao BETWEEN p_from AND p_to
    AND ac.status_agendamento IS DISTINCT FROM 'cancelado'  -- inclui NULL (sincronizadas)
    AND ac.horario IS NOT NULL
    AND ac.consultor_nome IN (
      SELECT c.nome FROM public.consultores_atendimento c WHERE c.slug = p_slug
      UNION
      SELECT unnest(c.nomes_match) FROM public.consultores_atendimento c WHERE c.slug = p_slug
    );
$$;

GRANT EXECUTE ON FUNCTION public.horarios_ocupados_consultor_intervalo(text, date, date) TO anon, authenticated;
