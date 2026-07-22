-- 20260720_rbac_rls_sensiveis.sql
-- Fecha o "híbrido" da Fase 1: reforça no RLS as seções sensíveis DEDICADAS,
-- para que um membro sem a seção não leia o dado (não só "não vê o menu").
--
-- Escopo (seguro, sem quebra): apenas superfícies dedicadas e admin-only —
-- canais_vendas_metas (sem id_cliente), download_logs (só leitura admin), e os
-- 2 RPCs dedicados radar_renovacao() e get_client_access_overview().
--
-- FORA deste escopo (de propósito): tabelas compartilhadas de cliente
-- (clientes_entrada_new, clientes_formulario, cliente_onboarding, cliente_vitorias,
-- cliente_atividades). Elas alimentam o dashboard sempre-visível e o acesso do
-- PRÓPRIO cliente (auth.uid()=id_cliente). Gateá-las por seção exige o modelo
-- "qualquer uma das seções que usam a tabela" + decisão sobre o dashboard — fica
-- para um follow-up. Enquanto isso, essas seções são protegidas por UI + is_admin().

-- 1. Canais de Vendas — tabela dedicada, sem path de cliente.
drop policy if exists canais_vendas_admin_all on public.canais_vendas_metas;
create policy canais_vendas_secao on public.canais_vendas_metas
  for all to authenticated
  using (is_admin() and pode_secao('canais-vendas'))
  with check (is_admin() and pode_secao('canais-vendas'));

-- 2. Registro de Downloads — só havia leitura admin; escrita é via service_role.
drop policy if exists download_logs_admin_read on public.download_logs;
create policy download_logs_secao on public.download_logs
  for select to authenticated
  using (is_admin() and pode_secao('logs-download'));

-- 3. Radar de Renovação (RPC) — guard por seção.
create or replace function public.radar_renovacao()
returns table (
  id_cliente text, codigo_cliente bigint, nome_cliente text, nome_empresa text, sc text,
  score int, faixa text, dias_sem_reuniao int, total_reunioes int, nps_medio numeric,
  vitorias int, em_risco boolean, saude_cliente text, temperatura text,
  dias_renovacao int, renovacao_data date, motivos text[]
)
language plpgsql security definer set search_path = public
as $$
#variable_conflict use_column
begin
  if not public.pode_secao('radar-renovacao') then
    raise exception 'Acesso restrito: seção Radar de Renovação.';
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
    select id_cliente::text as id_cliente, created_at::timestamptz as created_at, nps, cliente_compareceu as comp from reunioes_mentoria_new
    union all select id_cliente::text, created_at::timestamptz, nps, cliente_compareceu from reunioes_galdino
    union all select id_cliente::text, created_at::timestamptz, nps, cliente_compareceu from reunioes_blackcrm
  ),
  agg as (
    select a.id_cliente, max(r.created_at) as ultima, count(r.created_at)::int as total,
           count(*) filter (where r.comp is true)::int as presencas,
           count(*) filter (where r.comp is not null)::int as reg,
           avg(r.nps) filter (where r.nps is not null) as nps
    from ativos a left join reun r on r.id_cliente = a.id_cliente group by a.id_cliente
  ),
  vit as (select id_cliente::text as id_cliente, count(*)::int as n from cliente_vitorias group by id_cliente),
  base as (
    select a.*, ag.ultima, coalesce(ag.total,0) as total, coalesce(ag.presencas,0) as presencas,
           coalesce(ag.reg,0) as reg, ag.nps, coalesce(v.n,0) as vitorias,
           case when ag.ultima is not null then extract(day from now()-ag.ultima)::int end as dias
    from ativos a left join agg ag on ag.id_cliente=a.id_cliente left join vit v on v.id_cliente=a.id_cliente
  ),
  scored as (
    select b.*, greatest(0, least(100, 100
        - case when b.dias is null then 25 when b.dias>60 then 40 when b.dias>30 then 20 when b.dias>14 then 8 else 0 end
        - case when b.reg>=2 and b.presencas::numeric/nullif(b.reg,0)<0.5 then 15 when b.reg>=2 and b.presencas::numeric/nullif(b.reg,0)<0.75 then 7 else 0 end
        - case when b.nps is null then 0 when b.nps<7 then 15 when b.nps<9 then 5 else 0 end
        - case when b.vitorias=0 then 8 else 0 end
        - case when b.em_risco then 30 else 0 end
        - case when b.saude_cliente='critico' then 25 when b.saude_cliente='atencao' then 10 else 0 end
        - case when b.temperatura_cliente='frio' then 10 when b.temperatura_cliente='morno' then 3 else 0 end
      ))::int as score
    from base b
  )
  select s.id_cliente, s.codigo_cliente, s.nome_cliente, s.nome_empresa, s.sc, s.score,
    case when s.score>=70 then 'verde' when s.score>=40 then 'amarelo' else 'vermelho' end as faixa,
    s.dias, s.total, round(s.nps,1), s.vitorias, s.em_risco, s.saude_cliente, s.temperatura_cliente,
    case when s.renovacao_data is not null then (s.renovacao_data-current_date) end,
    s.renovacao_data,
    array_remove(array[
      case when s.dias is null then 'Nunca teve reunião registrada'
           when s.dias>60 then 'Sem reunião há '||s.dias||' dias'
           when s.dias>30 then 'Sem reunião há '||s.dias||' dias'
           when s.dias>14 then 'Última reunião há '||s.dias||' dias' else null end,
      case when s.reg>=2 and s.presencas::numeric/nullif(s.reg,0)<0.5 then 'Presença baixa ('||round(100.0*s.presencas/nullif(s.reg,0))||'%)'
           when s.reg>=2 and s.presencas::numeric/nullif(s.reg,0)<0.75 then 'Presença irregular' else null end,
      case when s.nps is not null and s.nps<7 then 'NPS baixo ('||round(s.nps,1)||')'
           when s.nps is not null and s.nps<9 then 'NPS médio ('||round(s.nps,1)||')' else null end,
      case when s.vitorias=0 then 'Sem vitórias registradas' else null end,
      case when s.em_risco then 'Marcado em risco pelo CS' else null end,
      case when s.saude_cliente='critico' then 'Saúde crítica' when s.saude_cliente='atencao' then 'Saúde em atenção' else null end,
      case when s.temperatura_cliente='frio' then 'Temperatura fria' else null end,
      case when s.renovacao_data is not null and (s.renovacao_data-current_date) between 0 and 60 then 'Renova em '||(s.renovacao_data-current_date)||' dias' else null end
    ], null)
  from scored s
  order by s.score asc, (s.renovacao_data-current_date) asc nulls last;
end;
$$;
revoke all on function public.radar_renovacao() from public, anon;
grant execute on function public.radar_renovacao() to authenticated;

-- 4. Acessos (RPC) — guard por seção (pode_secao já exige ser time).
create or replace function public.get_client_access_overview()
returns table(id_entrada bigint, id_cliente uuid, nome_cliente text, nome_empresa text, email text, sc text, status_atual text, nivel_engajamento text, data_cadastro_formulario timestamptz, tem_auth_user boolean, last_sign_in_at timestamptz, data_criacao_auth timestamptz, email_confirmed_at timestamptz, senha_definida boolean, status_onboarding text, qtd_convites_reenviados integer)
language plpgsql security definer set search_path = public
as $$
begin
  if not public.pode_secao('acessos') then
    raise exception 'forbidden: only team with Acessos section can read access overview';
  end if;
  return query
  select e.id_entrada, e.id_cliente, e.nome_cliente_formatado, e.nome_empresa_formatado, f.email, e.sc,
    e.status_atual, e.nivel_engajamento, f.created_at::timestamptz, (u.id is not null), u.last_sign_in_at,
    u.created_at, u.email_confirmed_at, o.senha_definida, o.status, coalesce(ir.qtd, 0)::integer
  from clientes_entrada_new e
  left join clientes_formulario f on f.id_cliente = e.id_cliente
  left join auth.users u on u.id = e.id_cliente
  left join cliente_onboarding o on o.id_cliente = e.id_cliente
  left join (select ira.email, count(*)::integer as qtd from invite_resend_attempts ira group by ira.email) ir on ir.email = f.email;
end;
$$;
