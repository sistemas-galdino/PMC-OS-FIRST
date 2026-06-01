-- Nomes alternativos do consultor: as reuniões guardam o nome do mentor/responsável
-- e às vezes diferem do cadastro (ex.: Léo vs Leonardo). Guardamos aliases pra casar
-- a agenda do consultor com as reuniões dele em todas as telas e no bloqueio público.
ALTER TABLE public.consultores_atendimento
  ADD COLUMN IF NOT EXISTS nomes_match text[] NOT NULL DEFAULT '{}';

UPDATE public.consultores_atendimento SET nomes_match = ARRAY['Leonardo']       WHERE slug = 'leo';
UPDATE public.consultores_atendimento SET nomes_match = ARRAY['Maxsuell Lopes'] WHERE slug = 'maxwell';
UPDATE public.consultores_atendimento SET nomes_match = ARRAY['Ayslan']         WHERE slug = 'ayslan';

-- Horários já ocupados de um consultor numa data, pro link público (anônimo) marcar
-- como indisponível. SECURITY DEFINER pra ler as reuniões (RLS bloqueia anon), mas
-- devolve só o horário — nenhum dado do cliente vaza. Casa por nome + aliases.
-- Dinâmico: lê agendamentos_central ao vivo, então novas reuniões sincronizadas
-- passam a bloquear automaticamente.
CREATE OR REPLACE FUNCTION public.horarios_ocupados_consultor(p_slug text, p_data date)
RETURNS TABLE (horario time)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT DISTINCT ac.horario
  FROM public.agendamentos_central ac
  WHERE ac.data_reuniao = p_data
    AND ac.status_agendamento IS DISTINCT FROM 'cancelado'  -- inclui status NULL (sincronizadas)
    AND ac.horario IS NOT NULL
    AND ac.consultor_nome IN (
      SELECT c.nome FROM public.consultores_atendimento c WHERE c.slug = p_slug
      UNION
      SELECT unnest(c.nomes_match) FROM public.consultores_atendimento c WHERE c.slug = p_slug
    );
$$;

GRANT EXECUTE ON FUNCTION public.horarios_ocupados_consultor(text, date) TO anon, authenticated;
