-- 20260722b_logica_pontos_radar_multiusuario.sql
-- Correções de lógica (commit 745f3fe), achadas na auditoria:
--  2.1 Pontos MC passam a contar o Mapeamento (+25/área) no backend, batendo com o front
--      (decisão do David: "contar"). Afeta pontos_mc e ranking_guardioes.
--  2.2 Multiusuário: gamificação/ranking resolvem a empresa via meu_id_cliente() (não auth.uid()),
--      senão o 2º login vê conquistas vazias e não aparece no ranking.
--  2.3 Radar: inclui "Ativo - 2º Ciclo" e usa data_reuniao (não created_at) como recência,
--      com parse seguro do reunioes_blackcrm (evita ::timestamptz estourar o RPC).
-- (2.4 — critério da badge de "ações concluídas" — ADIADO: sem dados de status no DEV p/ validar.)

-- 2.1 — pontos_mc: + mapeamento (cliente_metas/produtos/canais/objetivos_programa) x 25
create or replace function public.pontos_mc(p uuid)
returns integer
language sql
stable
security definer
set search_path to 'public'
as $$
  WITH s AS (
    SELECT
      EXISTS(SELECT 1 FROM metodo_guardioes t WHERE t.id_cliente=p) AS g,
      EXISTS(SELECT 1 FROM metodo_areas t WHERE t.id_cliente=p) AS a,
      EXISTS(SELECT 1 FROM metodo_gargalos t WHERE t.id_cliente=p) AS ga,
      EXISTS(SELECT 1 FROM metodo_copilotos t WHERE t.id_cliente=p) AS cp,
      EXISTS(SELECT 1 FROM metodo_sistemas t WHERE t.id_cliente=p) AS si,
      EXISTS(SELECT 1 FROM metodo_economias t WHERE t.id_cliente=p) AS ec,
      EXISTS(SELECT 1 FROM cliente_metas t WHERE t.id_cliente=p) AS mm,
      EXISTS(SELECT 1 FROM cliente_produtos t WHERE t.id_cliente=p) AS mp,
      EXISTS(SELECT 1 FROM cliente_canais t WHERE t.id_cliente=p) AS mca,
      EXISTS(SELECT 1 FROM cliente_objetivos_programa t WHERE t.id_cliente=p) AS mo,
      (SELECT count(*) FROM cliente_vitorias t WHERE t.id_cliente=p)::int AS vit,
      ((SELECT count(*) FROM reunioes_galdino t WHERE t.id_cliente=p)
       +(SELECT count(*) FROM reunioes_mentoria_new t WHERE t.id_cliente=p)
       +(SELECT count(*) FROM reunioes_blackcrm t WHERE t.id_cliente=p::text))::int AS reu,
      COALESCE((SELECT array_agg(etapa) FROM cliente_etapas_metodo e WHERE e.id_cliente=p AND e.concluida), ARRAY[]::int[]) AS man
  )
  SELECT (
    ( ((1=ANY(man)) OR g)::int + ((2=ANY(man)) OR a)::int + ((3=ANY(man)) OR ga)::int
      + ((4=ANY(man)) OR ec)::int + ((5=ANY(man)) OR cp)::int + ((6=ANY(man)) OR si)::int
      + ((7=ANY(man)) OR (reu>0))::int ) * 100
    + (g::int+a::int+ga::int+cp::int+si::int+ec::int) * 40
    + (mm::int+mp::int+mca::int+mo::int) * 25
    + vit * 30 + reu * 15
  ) FROM s;
$$;
revoke execute on function public.pontos_mc(uuid) from anon, authenticated, public;

-- 2.1 + 2.2 — ranking_guardioes: + mapeamento x 25 e is_me via meu_id_cliente()
create or replace function public.ranking_guardioes(periodo text DEFAULT 'total'::text)
returns TABLE(posicao integer, guardiao_nome text, empresa text, pontos integer, etapas integer, fases integer, vitorias integer, reunioes integer, is_me boolean, oculto boolean, total_participantes integer)
language sql
stable
security definer
set search_path to 'public'
as $$
  WITH per AS (
    SELECT
      CASE periodo WHEN 'mes' THEN date_trunc('month', CURRENT_DATE)::date
        WHEN 'ano' THEN date_trunc('year', CURRENT_DATE)::date ELSE '-infinity'::date END AS ini,
      CASE periodo WHEN 'mes' THEN (date_trunc('month', CURRENT_DATE) + interval '1 month')::date
        WHEN 'ano' THEN (date_trunc('year', CURRENT_DATE) + interval '1 year')::date ELSE 'infinity'::date END AS fim,
      (periodo IN ('mes', 'ano')) AS por_periodo
  ),
  base AS (
    SELECT
      c.id_cliente,
      COALESCE(NULLIF(btrim(c.guardiao_ia_nome), ''), gc.nome) AS guardiao_nome,
      NULLIF(btrim(c.nome_empresa_formatado), '') AS empresa,
      c.mostrar_no_ranking AS mostrar,
      p.por_periodo,
      EXISTS(SELECT 1 FROM metodo_guardioes t WHERE t.id_cliente=c.id_cliente AND (NOT p.por_periodo OR (t.created_at >= p.ini AND t.created_at < p.fim))) AS s_guardiao,
      EXISTS(SELECT 1 FROM metodo_areas t WHERE t.id_cliente=c.id_cliente AND (NOT p.por_periodo OR (t.created_at >= p.ini AND t.created_at < p.fim))) AS s_areas,
      EXISTS(SELECT 1 FROM metodo_gargalos t WHERE t.id_cliente=c.id_cliente AND (NOT p.por_periodo OR (t.created_at >= p.ini AND t.created_at < p.fim))) AS s_gargalos,
      EXISTS(SELECT 1 FROM metodo_copilotos t WHERE t.id_cliente=c.id_cliente AND (NOT p.por_periodo OR (t.created_at >= p.ini AND t.created_at < p.fim))) AS s_copilotos,
      EXISTS(SELECT 1 FROM metodo_sistemas t WHERE t.id_cliente=c.id_cliente AND (NOT p.por_periodo OR (t.created_at >= p.ini AND t.created_at < p.fim))) AS s_sistemas,
      EXISTS(SELECT 1 FROM metodo_economias t WHERE t.id_cliente=c.id_cliente AND (NOT p.por_periodo OR (t.created_at >= p.ini AND t.created_at < p.fim))) AS s_economias,
      EXISTS(SELECT 1 FROM cliente_metas t WHERE t.id_cliente=c.id_cliente AND (NOT p.por_periodo OR (t.created_at >= p.ini AND t.created_at < p.fim))) AS s_metas,
      EXISTS(SELECT 1 FROM cliente_produtos t WHERE t.id_cliente=c.id_cliente AND (NOT p.por_periodo OR (t.created_at >= p.ini AND t.created_at < p.fim))) AS s_produtos,
      EXISTS(SELECT 1 FROM cliente_canais t WHERE t.id_cliente=c.id_cliente AND (NOT p.por_periodo OR (t.created_at >= p.ini AND t.created_at < p.fim))) AS s_canais,
      EXISTS(SELECT 1 FROM cliente_objetivos_programa t WHERE t.id_cliente=c.id_cliente AND (NOT p.por_periodo OR (t.created_at >= p.ini AND t.created_at < p.fim))) AS s_objetivos,
      (SELECT count(*) FROM cliente_vitorias t WHERE t.id_cliente=c.id_cliente
         AND (NOT p.por_periodo OR (COALESCE(t.data_vitoria, t.created_at::date) >= p.ini AND COALESCE(t.data_vitoria, t.created_at::date) < p.fim)))::int AS n_vitorias,
      (
        (SELECT count(*) FROM reunioes_galdino t WHERE t.id_cliente=c.id_cliente
           AND (NOT p.por_periodo OR (t.data_reuniao >= p.ini AND t.data_reuniao < p.fim))) +
        (SELECT count(*) FROM reunioes_mentoria_new t WHERE t.id_cliente=c.id_cliente
           AND (NOT p.por_periodo OR (t.data_reuniao >= p.ini AND t.data_reuniao < p.fim))) +
        (SELECT count(*) FROM reunioes_blackcrm t WHERE t.id_cliente=c.id_cliente::text
           AND (NOT p.por_periodo OR (t.data_reuniao ~ '^\d{4}-\d{2}-\d{2}'
                AND substring(t.data_reuniao from 1 for 10)::date >= p.ini
                AND substring(t.data_reuniao from 1 for 10)::date < p.fim)))
      )::int AS n_reunioes,
      COALESCE(
        (SELECT array_agg(e.etapa) FROM cliente_etapas_metodo e
           WHERE e.id_cliente=c.id_cliente AND e.concluida
             AND (NOT p.por_periodo OR (e.concluida_em >= p.ini AND e.concluida_em < p.fim))),
        ARRAY[]::int[]
      ) AS etapas_manuais
    FROM clientes_entrada_new c
    CROSS JOIN per p
    LEFT JOIN LATERAL (
      SELECT cc.nome FROM cliente_colaboradores cc
      WHERE cc.id_cliente = c.id_cliente AND cc.guardiao_ia = true LIMIT 1
    ) gc ON true
    WHERE c.data_cancelamento IS NULL
  ),
  calc AS (
    SELECT
      id_cliente, guardiao_nome, empresa, mostrar, n_vitorias, n_reunioes,
      (s_guardiao::int + s_areas::int + s_gargalos::int + s_copilotos::int + s_sistemas::int + s_economias::int) AS fases,
      (s_metas::int + s_produtos::int + s_canais::int + s_objetivos::int) AS mapa,
      CASE WHEN por_periodo THEN cardinality(etapas_manuais)
        ELSE (
          ((1 = ANY(etapas_manuais)) OR s_guardiao)::int +
          ((2 = ANY(etapas_manuais)) OR s_areas)::int +
          ((3 = ANY(etapas_manuais)) OR s_gargalos)::int +
          ((4 = ANY(etapas_manuais)) OR s_economias)::int +
          ((5 = ANY(etapas_manuais)) OR s_copilotos)::int +
          ((6 = ANY(etapas_manuais)) OR s_sistemas)::int +
          ((7 = ANY(etapas_manuais)) OR (n_reunioes > 0))::int
        )
      END AS etapas
    FROM base
  ),
  pts AS (
    SELECT id_cliente, guardiao_nome, empresa, mostrar, etapas, fases, n_vitorias, n_reunioes,
      (etapas * 100 + fases * 40 + mapa * 25 + n_vitorias * 30 + n_reunioes * 15) AS pontos,
      (id_cliente = meu_id_cliente()) AS is_me
    FROM calc
  ),
  pub AS ( SELECT pontos FROM pts WHERE pontos > 0 AND mostrar )
  SELECT
    ((SELECT count(*) FROM pub WHERE pub.pontos > pts.pontos) + 1)::int AS posicao,
    guardiao_nome, empresa, pontos, etapas, fases,
    n_vitorias AS vitorias, n_reunioes AS reunioes, is_me,
    NOT (pontos > 0 AND mostrar) AS oculto,
    (SELECT count(*)::int FROM pub) AS total_participantes
  FROM pts
  WHERE (pontos > 0 AND mostrar) OR is_me
  ORDER BY (pontos > 0 AND mostrar) DESC, pontos DESC, empresa ASC NULLS LAST;
$$;
revoke execute on function public.ranking_guardioes(text) from anon;

-- 2.2 — sync_badges: resolve a empresa via meu_id_cliente() (suporta 2º usuário)
create or replace function public.sync_badges()
returns jsonb
language plpgsql
security definer
set search_path to 'public'
as $$
DECLARE
  me uuid := meu_id_cliente();
  p_pontos int;
  m jsonb;
  novas text[];
  r record;
BEGIN
  IF me IS NULL THEN RETURN '{}'::jsonb; END IF;
  p_pontos := pontos_mc(me);
  m := jsonb_build_object(
    'acoes', (
      SELECT count(*) FILTER (WHERE lower(coalesce(it->>'status','')) LIKE '%conclu%')
      FROM (
        SELECT jsonb_array_elements(acoes_cliente) it FROM reunioes_galdino WHERE id_cliente=me AND jsonb_typeof(acoes_cliente)='array'
        UNION ALL
        SELECT jsonb_array_elements(acoes_cliente) FROM reunioes_mentoria_new WHERE id_cliente=me AND jsonb_typeof(acoes_cliente)='array'
      ) x
    ),
    'vitorias', (SELECT count(*) FROM cliente_vitorias WHERE id_cliente=me),
    'vitorias_aprovadas', (SELECT count(*) FROM repositorio_vitorias WHERE id_cliente=me AND status IN ('aprovada','case')),
    'cases', (SELECT count(*) FROM repositorio_vitorias WHERE id_cliente=me AND status='case'),
    'fase_guardiao', (SELECT (count(*)>0)::int FROM metodo_guardioes WHERE id_cliente=me),
    'fase_areas', (SELECT (count(*)>0)::int FROM metodo_areas WHERE id_cliente=me),
    'fase_gargalos', (SELECT (count(*)>0)::int FROM metodo_gargalos WHERE id_cliente=me),
    'fase_copilotos', (SELECT (count(*)>0)::int FROM metodo_copilotos WHERE id_cliente=me),
    'fase_sistemas', (SELECT (count(*)>0)::int FROM metodo_sistemas WHERE id_cliente=me),
    'fase_economias', (SELECT (count(*)>0)::int FROM metodo_economias WHERE id_cliente=me),
    'reunioes', ((SELECT count(*) FROM reunioes_galdino WHERE id_cliente=me)
                 +(SELECT count(*) FROM reunioes_mentoria_new WHERE id_cliente=me)
                 +(SELECT count(*) FROM reunioes_blackcrm WHERE id_cliente=me::text)),
    'nivel_indice', ((p_pontos>=150)::int+(p_pontos>=400)::int+(p_pontos>=800)::int+(p_pontos>=1400)::int),
    'comentarios', (SELECT count(*) FROM comunidade_novidades_comentarios WHERE id_autor=me),
    'podios', 0
  );

  WITH ins AS (
    INSERT INTO cliente_badges (id_cliente, badge_slug)
    SELECT me, b.slug FROM badges_catalogo b
    WHERE b.auto AND (m->>b.meta_metrica)::numeric >= b.meta_valor
    ON CONFLICT (id_cliente, badge_slug) DO NOTHING
    RETURNING badge_slug
  )
  SELECT array_agg(badge_slug) INTO novas FROM ins;

  IF novas IS NOT NULL THEN
    FOR r IN SELECT b.nome, b.descricao FROM badges_catalogo b WHERE b.slug = ANY(novas) LOOP
      INSERT INTO notificacoes (id_cliente, tipo, titulo, texto, link)
      VALUES (me, 'aviso', '🏅 Nova conquista: ' || r.nome, r.descricao, '/niveis');
    END LOOP;
  END IF;

  RETURN jsonb_build_object(
    'metrics', m,
    'novas', COALESCE(to_jsonb(novas), '[]'::jsonb),
    'earned', COALESCE((SELECT jsonb_agg(jsonb_build_object('slug', badge_slug, 'em', conquistada_em) ORDER BY conquistada_em)
                        FROM cliente_badges WHERE id_cliente=me), '[]'::jsonb)
  );
END; $$;
revoke execute on function public.sync_badges() from anon;

-- 2.3 — radar_renovacao: inclui "Ativo - 2º Ciclo" e usa data_reuniao (recência), com parse seguro do blackcrm
create or replace function public.radar_renovacao()
returns TABLE(id_cliente text, codigo_cliente bigint, nome_cliente text, nome_empresa text, sc text, score integer, faixa text, dias_sem_reuniao integer, total_reunioes integer, nps_medio numeric, vitorias integer, em_risco boolean, saude_cliente text, temperatura text, dias_renovacao integer, renovacao_data date, motivos text[])
language plpgsql
security definer
set search_path to 'public'
as $$
#variable_conflict use_column
begin
  if not public.pode_secao('radar-renovacao') then
    raise exception 'Acesso restrito: seção Radar de Renovação.';
  end if;
  return query
  with ativos as (
    select id_cliente::text as id_cliente, codigo_cliente, nome_cliente, nome_empresa, sc,
           coalesce(em_risco_cancelamento, false) as em_risco, saude_cliente, temperatura_cliente, renovacao_data
    from clientes_entrada_new
    where status_atual in ('Ativo no Programa', 'Ativo - 2º Ciclo') and id_cliente is not null
  ),
  reun as (
    select id_cliente::text as id_cliente, coalesce(data_reuniao::timestamptz, created_at) as quando, nps, cliente_compareceu as comp from reunioes_mentoria_new
    union all
    select id_cliente::text, coalesce(data_reuniao::timestamptz, created_at), nps, cliente_compareceu from reunioes_galdino
    union all
    select id_cliente::text,
           case when data_reuniao ~ '^\d{4}-\d{2}-\d{2}' then substring(data_reuniao from 1 for 10)::timestamptz
                when created_at   ~ '^\d{4}-\d{2}-\d{2}' then substring(created_at   from 1 for 10)::timestamptz
                else null end,
           nps, cliente_compareceu
    from reunioes_blackcrm
  ),
  agg as (
    select a.id_cliente, max(r.quando) as ultima, count(r.id_cliente)::int as total,
           count(*) filter (where r.comp is true)::int as presencas, count(*) filter (where r.comp is not null)::int as reg,
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
        - case when b.vitorias=0 then 8 else 0 end - case when b.em_risco then 30 else 0 end
        - case when b.saude_cliente='critico' then 25 when b.saude_cliente='atencao' then 10 else 0 end
        - case when b.temperatura_cliente='frio' then 10 when b.temperatura_cliente='morno' then 3 else 0 end
      ))::int as score
    from base b
  )
  select s.id_cliente, s.codigo_cliente, s.nome_cliente, s.nome_empresa, s.sc, s.score,
    case when s.score>=70 then 'verde' when s.score>=40 then 'amarelo' else 'vermelho' end as faixa,
    s.dias, s.total, round(s.nps,1), s.vitorias, s.em_risco, s.saude_cliente, s.temperatura_cliente,
    case when s.renovacao_data is not null then (s.renovacao_data-current_date) end, s.renovacao_data,
    array_remove(array[
      case when s.dias is null then 'Nunca teve reunião registrada' when s.dias>60 then 'Sem reunião há '||s.dias||' dias'
           when s.dias>30 then 'Sem reunião há '||s.dias||' dias' when s.dias>14 then 'Última reunião há '||s.dias||' dias' else null end,
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
  from scored s order by s.score asc, (s.renovacao_data-current_date) asc nulls last;
end;
$$;
