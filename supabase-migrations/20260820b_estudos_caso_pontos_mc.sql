-- Estudos de Caso valem Pontos MC: assistir (15), curtir (5) e comentar (10).
--
-- ATENÇÃO — a fórmula dos Pontos MC vive em TRÊS lugares que andam juntos:
--   1) web/src/lib/nivel-pmc.ts (FONTES_PONTOS)
--   2) public.pontos_mc(uuid)
--   3) public.ranking_guardioes(text)
-- Este arquivo atualiza as duas do banco A PARTIR DA VERSÃO VIVA em produção
-- (a versão do arquivo 20260728_fase_c_pontos_badges.sql NÃO está aplicada nos
-- bancos — não incorporamos aquela fórmula aqui de propósito).

-- ---------------------------------------------------------------------------
-- 1) Visualização por pessoa — pra pontuar 1x por estudo por cliente.
--    O contador global `visualizacoes` continua somando todas as aberturas.
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS conhecimento_estudos_caso_views (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  id_estudo uuid NOT NULL REFERENCES conhecimento_estudos_caso(id) ON DELETE CASCADE,
  id_cliente uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (id_estudo, id_cliente)
);
CREATE INDEX IF NOT EXISTS estudos_caso_views_cliente_idx ON conhecimento_estudos_caso_views(id_cliente);

ALTER TABLE conhecimento_estudos_caso_views ENABLE ROW LEVEL SECURITY;

-- Só leitura (quem grava é a RPC, SECURITY DEFINER): cada um vê as próprias.
DROP POLICY IF EXISTS estudos_caso_views_select ON conhecimento_estudos_caso_views;
CREATE POLICY estudos_caso_views_select ON conhecimento_estudos_caso_views
  FOR SELECT TO authenticated
  USING (id_cliente = auth.uid() OR is_admin());

-- ---------------------------------------------------------------------------
-- 2) A RPC de visualização passa a registrar também QUEM assistiu (1ª vez).
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.estudo_caso_registrar_view(p_estudo uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE conhecimento_estudos_caso
     SET visualizacoes = visualizacoes + 1
   WHERE id = p_estudo
     AND publicado = true;
  IF FOUND AND auth.uid() IS NOT NULL THEN
    INSERT INTO conhecimento_estudos_caso_views (id_estudo, id_cliente)
    VALUES (p_estudo, auth.uid())
    ON CONFLICT (id_estudo, id_cliente) DO NOTHING;
  END IF;
END;
$$;
REVOKE ALL ON FUNCTION public.estudo_caso_registrar_view(uuid) FROM public, anon;
GRANT EXECUTE ON FUNCTION public.estudo_caso_registrar_view(uuid) TO authenticated;

-- ---------------------------------------------------------------------------
-- 3) pontos_mc — versão viva + estudos de caso (assistiu 15 · curtiu 5 · comentou 10)
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.pontos_mc(p uuid)
RETURNS integer
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
  WITH s AS (
    SELECT
      EXISTS(SELECT 1 FROM metodo_guardioes t WHERE t.id_cliente=p) AS g,
      EXISTS(SELECT 1 FROM metodo_areas t WHERE t.id_cliente=p) AS a,
      EXISTS(SELECT 1 FROM metodo_gargalos t WHERE t.id_cliente=p) AS ga,
      EXISTS(SELECT 1 FROM metodo_copilotos t WHERE t.id_cliente=p) AS cp,
      EXISTS(SELECT 1 FROM metodo_sistemas t WHERE t.id_cliente=p) AS si,
      EXISTS(SELECT 1 FROM metodo_economias t WHERE t.id_cliente=p) AS ec,
      (SELECT count(*) FROM cliente_vitorias t WHERE t.id_cliente=p)::int AS vit,
      ((SELECT count(*) FROM reunioes_galdino t WHERE t.id_cliente=p)
       +(SELECT count(*) FROM reunioes_mentoria_new t WHERE t.id_cliente=p)
       +(SELECT count(*) FROM reunioes_blackcrm t WHERE t.id_cliente=p::text))::int AS reu,
      (SELECT count(*) FROM pulso_semanal t WHERE t.id_cliente=p)::int AS pul,
      -- Estudos de Caso (Conhecimento)
      (SELECT count(*) FROM conhecimento_estudos_caso_views t WHERE t.id_cliente=p)::int AS ecv,
      (SELECT count(*) FROM conhecimento_estudos_caso_likes t WHERE t.id_cliente=p)::int AS ecl,
      (SELECT count(*) FROM conhecimento_estudos_caso_comentarios t WHERE t.id_autor=p)::int AS ecc,
      COALESCE((SELECT array_agg(etapa) FROM cliente_etapas_metodo e WHERE e.id_cliente=p AND e.concluida), ARRAY[]::int[]) AS man
  )
  SELECT (
    ( ((1=ANY(man)) OR g)::int + ((2=ANY(man)) OR a)::int + ((3=ANY(man)) OR ga)::int
      + ((4=ANY(man)) OR ec)::int + ((5=ANY(man)) OR cp)::int + ((6=ANY(man)) OR si)::int
      + ((7=ANY(man)) OR (reu>0))::int ) * 100
    + (g::int+a::int+ga::int+cp::int+si::int+ec::int) * 40
    + vit * 30 + reu * 15 + pul * 20
    + ecv * 15 + ecl * 5 + ecc * 10
  ) FROM s;
$function$;

-- ---------------------------------------------------------------------------
-- 4) ranking_guardioes — versão viva + estudos de caso (mesmos pesos)
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.ranking_guardioes(periodo text DEFAULT 'total'::text)
 RETURNS TABLE(posicao integer, guardiao_nome text, empresa text, pontos integer, etapas integer, fases integer, vitorias integer, reunioes integer, is_me boolean, oculto boolean, total_participantes integer)
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
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
      (SELECT count(*) FROM pulso_semanal t WHERE t.id_cliente=c.id_cliente
         AND (NOT p.por_periodo OR (t.semana >= p.ini AND t.semana < p.fim)))::int AS n_pulsos,
      -- Estudos de Caso (Conhecimento)
      (SELECT count(*) FROM conhecimento_estudos_caso_views t WHERE t.id_cliente=c.id_cliente
         AND (NOT p.por_periodo OR (t.created_at >= p.ini AND t.created_at < p.fim)))::int AS n_ec_assist,
      (SELECT count(*) FROM conhecimento_estudos_caso_likes t WHERE t.id_cliente=c.id_cliente
         AND (NOT p.por_periodo OR (t.created_at >= p.ini AND t.created_at < p.fim)))::int AS n_ec_curt,
      (SELECT count(*) FROM conhecimento_estudos_caso_comentarios t WHERE t.id_autor=c.id_cliente
         AND (NOT p.por_periodo OR (t.created_at >= p.ini AND t.created_at < p.fim)))::int AS n_ec_coment,
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
      id_cliente, guardiao_nome, empresa, mostrar, n_vitorias, n_reunioes, n_pulsos,
      n_ec_assist, n_ec_curt, n_ec_coment,
      (s_guardiao::int + s_areas::int + s_gargalos::int + s_copilotos::int + s_sistemas::int + s_economias::int) AS fases,
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
      (etapas * 100 + fases * 40 + n_vitorias * 30 + n_reunioes * 15 + n_pulsos * 20
        + n_ec_assist * 15 + n_ec_curt * 5 + n_ec_coment * 10) AS pontos,
      (id_cliente = auth.uid()) AS is_me
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
