-- Onda 2 · Fase C — Fecha o ciclo: o fechamento do dia passa a valer ponto,
-- vira badge e o digest aponta para o cockpit.
--
-- ATENÇÃO — DÍVIDA CONHECIDA: a fórmula dos Pontos MC vive em TRÊS lugares:
--   1) web/src/lib/nivel-pmc.ts  (FONTES_PONTOS)   — o que o cliente vê
--   2) public.pontos_mc(uuid)                      — alimenta as badges
--   3) public.ranking_guardioes(text)              — o ranking e a lista de clientes
-- Elas PRECISAM andar juntas. A pontos_mc já tinha ficado para trás (estava sem
-- as fontes do Guardião), o que atrasava as badges de nível. Ao mexer em uma,
-- mexa nas três — e rode a checagem de consistência do fim deste arquivo.

-- ---------------------------------------------------------------------------
-- 1) Métricas do ritual — funções reutilizadas pelas três implementações
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.dias_fechados(p uuid)
RETURNS int LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT count(*)::int FROM metodo_dia_fechamentos
   WHERE id_cliente = p AND fechado_em IS NOT NULL;
$$;

-- Semana perfeita = os 5 dias úteis daquela semana ISO fechados.
CREATE OR REPLACE FUNCTION public.semanas_perfeitas(p uuid)
RETURNS int LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT count(*)::int FROM (
    SELECT to_char(data, 'IYYY-IW')
      FROM metodo_dia_fechamentos
     WHERE id_cliente = p AND fechado_em IS NOT NULL
       AND extract(isodow FROM data) <= 5
     GROUP BY 1
    HAVING count(*) = 5
  ) s;
$$;

-- Aceitam id de terceiro: fora do alcance do papel `authenticated` (senão dá
-- para medir a constância de outra empresa). Quem chama são as SECURITY DEFINER
-- do postgres; o front conta pela tabela, já escopada pela RLS.
REVOKE ALL ON FUNCTION public.dias_fechados(uuid) FROM public, anon, authenticated;
REVOKE ALL ON FUNCTION public.semanas_perfeitas(uuid) FROM public, anon, authenticated;

-- ---------------------------------------------------------------------------
-- 2) pontos_mc — a fonte que alimenta as badges. Reposta em dia.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.pontos_mc(p uuid)
RETURNS integer LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
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
      -- Guardião de IA (estavam faltando aqui)
      (SELECT count(*) FROM guardiao_invites t WHERE t.id_cliente=p)::int AS conv,
      (SELECT count(*) FROM guardiao_invites t WHERE t.id_cliente=p AND t.status='concluido')::int AS cand,
      (SELECT count(*) FROM guardiao_invites t WHERE t.id_cliente=p AND t.stage='contratado_guardiao')::int AS contr,
      (SELECT count(*) FROM metodo_tarefas t WHERE t.id_cliente=p AND t.status='concluido')::int AS taref,
      -- Ritual diário (novo na Fase C)
      dias_fechados(p) AS dias,
      semanas_perfeitas(p) AS semp,
      COALESCE((SELECT array_agg(etapa) FROM cliente_etapas_metodo e WHERE e.id_cliente=p AND e.concluida), ARRAY[]::int[]) AS man
  )
  SELECT (
    ( ((1=ANY(man)) OR g)::int + ((2=ANY(man)) OR a)::int + ((3=ANY(man)) OR ga)::int
      + ((4=ANY(man)) OR ec)::int + ((5=ANY(man)) OR cp)::int + ((6=ANY(man)) OR si)::int
      + ((7=ANY(man)) OR (reu>0))::int ) * 100
    + (g::int+a::int+ga::int+cp::int+si::int+ec::int) * 40
    + (mm::int+mp::int+mca::int+mo::int) * 25
    + vit * 30 + reu * 15
    + conv * 20 + cand * 35 + contr * 200 + taref * 10
    + dias * 15 + semp * 50
  ) FROM s;
$$;

-- ---------------------------------------------------------------------------
-- 3) ranking_guardioes — mesma fórmula, agora com o ritual
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.ranking_guardioes(periodo text DEFAULT 'total'::text)
 RETURNS TABLE(posicao integer, guardiao_nome text, empresa text, pontos integer, etapas integer, fases integer, vitorias integer, reunioes integer, is_me boolean, oculto boolean, total_participantes integer)
 LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $function$
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
      (SELECT count(*) FROM guardiao_invites t WHERE t.id_cliente=c.id_cliente
         AND (NOT p.por_periodo OR (t.created_at >= p.ini AND t.created_at < p.fim)))::int AS n_convites,
      (SELECT count(*) FROM guardiao_invites t WHERE t.id_cliente=c.id_cliente AND t.status='concluido'
         AND (NOT p.por_periodo OR (t.completed_at >= p.ini AND t.completed_at < p.fim)))::int AS n_candidatos,
      (SELECT count(*) FROM guardiao_invites t WHERE t.id_cliente=c.id_cliente AND t.stage='contratado_guardiao'
         AND (NOT p.por_periodo OR (t.created_at >= p.ini AND t.created_at < p.fim)))::int AS n_contratado,
      (SELECT count(*) FROM metodo_tarefas t WHERE t.id_cliente=c.id_cliente AND t.status='concluido'
         AND (NOT p.por_periodo OR (t.updated_at >= p.ini AND t.updated_at < p.fim)))::int AS n_tarefas,
      -- Ritual diário
      (SELECT count(*) FROM metodo_dia_fechamentos t WHERE t.id_cliente=c.id_cliente AND t.fechado_em IS NOT NULL
         AND (NOT p.por_periodo OR (t.data >= p.ini AND t.data < p.fim)))::int AS n_dias,
      (SELECT count(*) FROM (
         SELECT to_char(t.data,'IYYY-IW') FROM metodo_dia_fechamentos t
          WHERE t.id_cliente=c.id_cliente AND t.fechado_em IS NOT NULL
            AND extract(isodow FROM t.data) <= 5
            AND (NOT p.por_periodo OR (t.data >= p.ini AND t.data < p.fim))
          GROUP BY 1 HAVING count(*) = 5) w)::int AS n_semperf,
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
      n_convites, n_candidatos, n_contratado, n_tarefas, n_dias, n_semperf,
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
      (etapas * 100 + fases * 40 + mapa * 25 + n_vitorias * 30 + n_reunioes * 15
        + n_convites * 20 + n_candidatos * 35 + n_contratado * 200 + n_tarefas * 10
        + n_dias * 15 + n_semperf * 50) AS pontos,
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
$function$;

-- ---------------------------------------------------------------------------
-- 4) Badges novas — trilha Constância
-- ---------------------------------------------------------------------------
INSERT INTO public.badges_catalogo (slug, nome, descricao, criterio, raridade, icone, trilha, ordem, meta_metrica, meta_valor, auto)
VALUES
  ('dia_1',   'Primeiro Dia Fechado', 'Você fechou o seu primeiro dia como Guardião.', 'Fechar 1 dia', 'bronze', 'check', 'constancia', 10, 'dias_fechados', 1, true),
  ('dia_10',  'Ritmo',                'Dez dias fechados. O hábito começou.',          'Fechar 10 dias','prata',  'check', 'constancia', 11, 'dias_fechados', 10, true),
  ('dia_50',  'Disciplina',           'Cinquenta dias fechados. Isso é operação.',     'Fechar 50 dias','ouro',   'trophy','constancia', 12, 'dias_fechados', 50, true),
  ('dia_100', 'Relógio Suíço',        'Cem dias fechados. O Método virou reflexo.',    'Fechar 100 dias','lenda', 'trophy','constancia', 13, 'dias_fechados', 100, true),
  ('sem_1',   'Semana Perfeita',      'Os cinco dias úteis de uma semana, fechados.',  'Semana 5/5',   'prata',  'star',  'constancia', 14, 'semanas_perfeitas', 1, true),
  ('sem_4',   'Mês Impecável',        'Quatro semanas perfeitas.',                     '4 semanas 5/5','ouro',   'star',  'constancia', 15, 'semanas_perfeitas', 4, true)
ON CONFLICT (slug) DO NOTHING;

-- ---------------------------------------------------------------------------
-- 5) sync_badges — métricas novas + CORREÇÃO dos limiares de nível
-- ---------------------------------------------------------------------------
-- Os limiares estavam 150/400/800/1400 (valores antigos). O front já usa
-- 200/550/1100/2000 — a badge de nível estava sendo concedida antes da hora.
CREATE OR REPLACE FUNCTION public.sync_badges()
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
DECLARE
  me uuid := meu_id_cliente();
  p_pontos int; m jsonb; novas text[]; r record;
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
    -- Limiares alinhados com NIVEIS em web/src/lib/nivel-pmc.ts
    'nivel_indice', ((p_pontos>=200)::int+(p_pontos>=550)::int+(p_pontos>=1100)::int+(p_pontos>=2000)::int),
    'comentarios', (SELECT count(*) FROM comunidade_novidades_comentarios WHERE id_autor=me),
    'podios', 0,
    -- Ritual diário (Fase C)
    'dias_fechados', dias_fechados(me),
    'semanas_perfeitas', semanas_perfeitas(me)
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
END; $function$;

-- ---------------------------------------------------------------------------
-- 6) O digest diário passa a levar ao cockpit, não à home
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.digest_diario_guardiao(p_data date DEFAULT NULL)
RETURNS int LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  r record; v_hoje date := coalesce(p_data, (now() AT TIME ZONE 'America/Sao_Paulo')::date);
  v_texto text; v_fila int := 0;
BEGIN
  IF extract(isodow FROM v_hoje) > 5 THEN RETURN 0; END IF;
  FOR r IN
    SELECT e.id_cliente,
           count(*) FILTER (WHERE t.status <> 'concluido' AND t.prazo = v_hoje) AS hoje,
           count(*) FILTER (WHERE t.status <> 'concluido' AND t.prazo < v_hoje) AS atrasadas,
           count(*) FILTER (WHERE t.status <> 'concluido' AND coalesce(btrim(t.bloqueio),'') <> '') AS travas
      FROM clientes_entrada_new e
      LEFT JOIN metodo_tarefas t ON t.id_cliente = e.id_cliente
     WHERE e.data_cancelamento IS NULL
       AND e.status_atual IN ('Ativo no Programa', 'Ativo - 2º Ciclo')
     GROUP BY e.id_cliente
  LOOP
    -- O dia já fechado não precisa de cutucão.
    CONTINUE WHEN EXISTS (SELECT 1 FROM metodo_dia_fechamentos f
                           WHERE f.id_cliente = r.id_cliente AND f.data = v_hoje
                             AND f.fechado_em IS NOT NULL);
    CONTINUE WHEN r.hoje = 0 AND r.atrasadas = 0 AND r.travas = 0
             AND EXISTS (SELECT 1 FROM metodo_dia_fechamentos f
                          WHERE f.id_cliente = r.id_cliente AND f.data = v_hoje);

    v_texto := concat_ws(' · ',
      CASE WHEN r.hoje > 0 THEN r.hoje || ' tarefa' || CASE WHEN r.hoje > 1 THEN 's' ELSE '' END || ' para hoje' END,
      CASE WHEN r.atrasadas > 0 THEN r.atrasadas || ' atrasada' || CASE WHEN r.atrasadas > 1 THEN 's' ELSE '' END END,
      CASE WHEN r.travas > 0 THEN r.travas || ' trava' || CASE WHEN r.travas > 1 THEN 's' ELSE '' END END,
      CASE WHEN NOT EXISTS (SELECT 1 FROM metodo_dia_fechamentos f
                             WHERE f.id_cliente = r.id_cliente AND f.data = v_hoje)
           THEN 'rotina diária ainda não aberta' END);

    IF enfileirar_mensagem(r.id_cliente, 'guardiao', 'digest_diario_guardiao',
         'digest_diario:' || r.id_cliente || ':' || to_char(v_hoje, 'YYYY-MM-DD'),
         jsonb_build_object('resumo', v_texto, 'destino', '/meu-dia'),
         'Seu dia no PMC OS — ' || v_texto,
         'digest_diario') IS NOT NULL
    THEN v_fila := v_fila + 1; END IF;
  END LOOP;
  RETURN v_fila;
END; $$;
COMMENT ON FUNCTION public.digest_diario_guardiao(date) IS
  'Resumo diario do Guardiao (seg-sex), com link para /meu-dia. Nao cutuca quem ja fechou o dia.';
