-- CRM — visão unificada de reuniões para a aba "Meu Dia" / "Reuniões dos seus clientes".
-- "tudo que a gente teria que integrar com a agenda da CS pra gente conseguir
--  entender o que é que tinha de reunião para essa pessoa hoje" (Mayara).
--
-- Não cria tabela: as reuniões já são sincronizadas do Google Calendar para
-- reunioes_mentoria_new / reunioes_galdino / reunioes_blackcrm / agendamentos_central.
-- Esta view só normaliza as quatro no formato que a UI do CS Manager espera.

-- Cast defensivo: reunioes_blackcrm.data_reuniao e agendamentos_central.id_cliente
-- são text e podem conter lixo. Retornam NULL em vez de estourar a view.
CREATE OR REPLACE FUNCTION public.crm_safe_date(p text)
RETURNS date LANGUAGE plpgsql IMMUTABLE AS $$
BEGIN RETURN p::date; EXCEPTION WHEN others THEN RETURN NULL; END;
$$;

CREATE OR REPLACE FUNCTION public.crm_safe_uuid(p text)
RETURNS uuid LANGUAGE plpgsql IMMUTABLE AS $$
BEGIN RETURN p::uuid; EXCEPTION WHEN others THEN RETURN NULL; END;
$$;

CREATE OR REPLACE FUNCTION public.crm_safe_time(p text)
RETURNS time LANGUAGE plpgsql IMMUTABLE AS $$
BEGIN RETURN p::time; EXCEPTION WHEN others THEN RETURN NULL; END;
$$;

DROP VIEW IF EXISTS public.crm_reunioes_v;
CREATE VIEW public.crm_reunioes_v
WITH (security_invoker = true) AS
  SELECT
    r.id_unico::text                       AS ref,
    'mentoria'::text                       AS origem,
    r.id_cliente,
    coalesce(r.nome_empresa_formatado, r.empresa) AS empresa,
    coalesce(r.mentor, 'Consultor')        AS responsavel_externo,
    'Cliente'::text                        AS tipo,
    'Consultoria'::text                    AS subtipo,
    r.data_reuniao                         AS data,
    r.horario                              AS hora_inicio,
    r.duracao_minutos,
    r.link_meet                            AS link_reuniao,
    r.status_agendamento,
    r.cliente_compareceu,
    r.resumo,
    r.link_gravacao,
    (r.transcricao IS NOT NULL)            AS tem_transcricao
  FROM public.reunioes_mentoria_new r

  UNION ALL
  SELECT
    g.id_unico::text,
    'galdino',
    g.id_cliente,
    coalesce(g.nome_empresa_formatado, g.empresa),
    'Galdino',
    'Cliente',
    'Galdino',
    g.data_reuniao,
    g.horario,
    g.duracao_minutos,
    g.link_meet,
    g.status_agendamento,
    g.cliente_compareceu,
    g.resumo,
    g.link_gravacao,
    (g.transcricao IS NOT NULL)
  FROM public.reunioes_galdino g

  UNION ALL
  SELECT
    b.id_unico,
    'blackcrm',
    public.crm_safe_uuid(b.id_cliente),
    coalesce(b.nome_empresa_formatado, b.empresa),
    coalesce(b.responsavel, 'Black CRM'),
    'Cliente',
    'Black CRM',
    public.crm_safe_date(b.data_reuniao),
    public.crm_safe_time(b.horario),
    b.duracao_minutos,
    b.link_meet,
    b.status_agendamento,
    b.cliente_compareceu,
    b.resumo,
    b.link_gravacao,
    (b.transcricao IS NOT NULL)
  FROM public.reunioes_blackcrm b

  UNION ALL
  SELECT
    a.id_unico,
    'central',
    public.crm_safe_uuid(a.id_cliente),
    a.empresa,
    a.consultor_nome,
    'Cliente',
    'Consultoria',
    a.data_reuniao,
    a.horario,
    a.duracao_minutos,
    a.link_meet,
    a.status_agendamento,
    a.cliente_compareceu,
    NULL,
    a.link_gravacao,
    false
  FROM public.agendamentos_central a
  -- A central é a origem do agendamento; quando a reunião acontece ela também
  -- vira linha em reunioes_*. Evita contar duas vezes.
  WHERE NOT EXISTS (
    SELECT 1 FROM public.reunioes_mentoria_new m WHERE m.id_reuniao = a.id_reuniao
    UNION ALL
    SELECT 1 FROM public.reunioes_galdino gg    WHERE gg.id_reuniao = a.id_reuniao
    UNION ALL
    SELECT 1 FROM public.reunioes_blackcrm bb   WHERE bb.id_reuniao = a.id_reuniao
  );

GRANT SELECT ON public.crm_reunioes_v TO authenticated;

COMMENT ON VIEW public.crm_reunioes_v IS
  'Reuniões de cliente normalizadas (mentoria/galdino/blackcrm/central) para o CRM. security_invoker: herda a RLS das tabelas de origem.';
