-- 20260719_radar_renovacao.sql
-- Health Score de renovação (Radar de Renovação) — visão admin/dono.
--
-- Calcula, por cliente ATIVO, um score de saúde 0–100 a partir de sinais que a
-- operação captura sozinha (recência de reunião via created_at, presença, NPS,
-- vitórias) reforçados pelos flags manuais do CS (em_risco, saude_cliente,
-- temperatura). A ideia é apontar risco ANTES de alguém marcar na mão.
--
-- Exposto como RPC security definer com trava is_admin(): só o time lê.
-- Frontend: supabase.rpc('radar_renovacao').
--
-- Observações de schema (conferidas no banco): as 3 tabelas de reunião têm tipos
-- divergentes de id_cliente (uuid/text) e created_at (timestamptz/text) — por isso
-- os casts ::text / ::timestamptz no union.

create or replace function public.radar_renovacao()
returns table (
  id_cliente        text,
  codigo_cliente    bigint,
  nome_cliente      text,
  nome_empresa      text,
  sc                text,
  score             int,
  faixa             text,
  dias_sem_reuniao  int,
  total_reunioes    int,
  nps_medio         numeric,
  vitorias          int,
  em_risco          boolean,
  saude_cliente     text,
  temperatura       text,
  dias_renovacao    int,
  renovacao_data    date,
  motivos           text[]
)
language plpgsql
security definer
set search_path = public
as $$
-- Os nomes das colunas de RETURNS TABLE (id_cliente, etc.) entram em escopo como
-- variáveis e colidem com as colunas homônimas das CTEs. use_column resolve o
-- conflito preferindo sempre a coluna.
#variable_conflict use_column
begin
  if not public.is_admin() then
    raise exception 'Acesso restrito ao time.';
  end if;

  return query
  with ativos as (
    select id_cliente::text as id_cliente, codigo_cliente, nome_cliente, nome_empresa, sc,
           coalesce(em_risco_cancelamento, false) as em_risco,
           saude_cliente, temperatura_cliente, renovacao_data
    from clientes_entrada_new
    where status_atual = 'Ativo no Programa' and id_cliente is not null
  ),
  reun as (
    select id_cliente::text as id_cliente, created_at::timestamptz as created_at, nps, cliente_compareceu as comp
      from reunioes_mentoria_new
    union all
    select id_cliente::text, created_at::timestamptz, nps, cliente_compareceu from reunioes_galdino
    union all
    select id_cliente::text, created_at::timestamptz, nps, cliente_compareceu from reunioes_blackcrm
  ),
  agg as (
    select a.id_cliente,
           max(r.created_at) as ultima,
           count(r.created_at)::int as total,
           count(*) filter (where r.comp is true)::int as presencas,
           count(*) filter (where r.comp is not null)::int as reg,
           avg(r.nps) filter (where r.nps is not null) as nps
    from ativos a
    left join reun r on r.id_cliente = a.id_cliente
    group by a.id_cliente
  ),
  vit as (
    select id_cliente::text as id_cliente, count(*)::int as n from cliente_vitorias group by id_cliente
  ),
  base as (
    select a.*,
           ag.ultima, coalesce(ag.total, 0) as total, coalesce(ag.presencas, 0) as presencas,
           coalesce(ag.reg, 0) as reg, ag.nps, coalesce(v.n, 0) as vitorias,
           case when ag.ultima is not null then extract(day from now() - ag.ultima)::int end as dias
    from ativos a
    left join agg ag on ag.id_cliente = a.id_cliente
    left join vit v on v.id_cliente = a.id_cliente
  ),
  scored as (
    select b.*,
      greatest(0, least(100, 100
        - case when b.dias is null then 25
               when b.dias > 60 then 40
               when b.dias > 30 then 20
               when b.dias > 14 then 8 else 0 end
        - case when b.reg >= 2 and b.presencas::numeric / nullif(b.reg, 0) < 0.5 then 15
               when b.reg >= 2 and b.presencas::numeric / nullif(b.reg, 0) < 0.75 then 7 else 0 end
        - case when b.nps is null then 0 when b.nps < 7 then 15 when b.nps < 9 then 5 else 0 end
        - case when b.vitorias = 0 then 8 else 0 end
        - case when b.em_risco then 30 else 0 end
        - case when b.saude_cliente = 'critico' then 25 when b.saude_cliente = 'atencao' then 10 else 0 end
        - case when b.temperatura_cliente = 'frio' then 10 when b.temperatura_cliente = 'morno' then 3 else 0 end
      ))::int as score
    from base b
  )
  select
    s.id_cliente, s.codigo_cliente, s.nome_cliente, s.nome_empresa, s.sc,
    s.score,
    case when s.score >= 70 then 'verde' when s.score >= 40 then 'amarelo' else 'vermelho' end as faixa,
    s.dias as dias_sem_reuniao,
    s.total as total_reunioes,
    round(s.nps, 1) as nps_medio,
    s.vitorias,
    s.em_risco,
    s.saude_cliente,
    s.temperatura_cliente as temperatura,
    case when s.renovacao_data is not null then (s.renovacao_data - current_date) end as dias_renovacao,
    s.renovacao_data,
    array_remove(array[
      case when s.dias is null then 'Nunca teve reunião registrada'
           when s.dias > 60 then 'Sem reunião há ' || s.dias || ' dias'
           when s.dias > 30 then 'Sem reunião há ' || s.dias || ' dias'
           when s.dias > 14 then 'Última reunião há ' || s.dias || ' dias' else null end,
      case when s.reg >= 2 and s.presencas::numeric / nullif(s.reg, 0) < 0.5
             then 'Presença baixa (' || round(100.0 * s.presencas / nullif(s.reg, 0)) || '%)'
           when s.reg >= 2 and s.presencas::numeric / nullif(s.reg, 0) < 0.75
             then 'Presença irregular' else null end,
      case when s.nps is not null and s.nps < 7 then 'NPS baixo (' || round(s.nps, 1) || ')'
           when s.nps is not null and s.nps < 9 then 'NPS médio (' || round(s.nps, 1) || ')' else null end,
      case when s.vitorias = 0 then 'Sem vitórias registradas' else null end,
      case when s.em_risco then 'Marcado em risco pelo CS' else null end,
      case when s.saude_cliente = 'critico' then 'Saúde crítica'
           when s.saude_cliente = 'atencao' then 'Saúde em atenção' else null end,
      case when s.temperatura_cliente = 'frio' then 'Temperatura fria' else null end,
      case when s.renovacao_data is not null and (s.renovacao_data - current_date) between 0 and 60
             then 'Renova em ' || (s.renovacao_data - current_date) || ' dias' else null end
    ], null) as motivos
  from scored s
  order by s.score asc, (s.renovacao_data - current_date) asc nulls last;
end;
$$;

revoke all on function public.radar_renovacao() from public, anon;
grant execute on function public.radar_renovacao() to authenticated;
