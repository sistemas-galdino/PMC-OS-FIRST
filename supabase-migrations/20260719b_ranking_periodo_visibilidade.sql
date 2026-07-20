-- Ranking dos Guardiões v2:
--  1) opt-out por empresa (clientes_entrada_new.mostrar_no_ranking)
--  2) empresa com 0 pontos NÃO aparece no ranking público — mas ela vê a
--     própria posição (linha is_me sempre retornada, marcada como oculta)
--  3) recorte por período: 'total' (acumulado, = Meu Nível), 'ano' e 'mes'
--     (Pontos MC ganhos por eventos datados dentro do período — justo para
--     quem entrou há pouco).
ALTER TABLE clientes_entrada_new
  ADD COLUMN IF NOT EXISTS mostrar_no_ranking boolean NOT NULL DEFAULT true;

DROP FUNCTION IF EXISTS ranking_guardioes();

CREATE OR REPLACE FUNCTION ranking_guardioes(periodo text DEFAULT 'total')
RETURNS TABLE (
  posicao int,
  guardiao_nome text,
  empresa text,
  pontos int,
  etapas int,
  fases int,
  vitorias int,
  reunioes int,
  is_me boolean,
  oculto boolean,
  total_participantes int
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  WITH per AS (
    SELECT
      CASE periodo
        WHEN 'mes' THEN date_trunc('month', CURRENT_DATE)::date
        WHEN 'ano' THEN date_trunc('year', CURRENT_DATE)::date
        ELSE '-infinity'::date
      END AS ini,
      CASE periodo
        WHEN 'mes' THEN (date_trunc('month', CURRENT_DATE) + interval '1 month')::date
        WHEN 'ano' THEN (date_trunc('year', CURRENT_DATE) + interval '1 year')::date
        ELSE 'infinity'::date
      END AS fim,
      (periodo IN ('mes', 'ano')) AS por_periodo
  ),
  base AS (
    SELECT
      c.id_cliente,
      COALESCE(NULLIF(btrim(c.guardiao_ia_nome), ''), gc.nome) AS guardiao_nome,
      NULLIF(btrim(c.nome_empresa_formatado), '') AS empresa,
      c.mostrar_no_ranking AS mostrar,
      p.por_periodo,
      -- sinais das 6 fases (com data no período, ou qualquer dado no total)
      EXISTS(SELECT 1 FROM metodo_guardioes t WHERE t.id_cliente=c.id_cliente AND (NOT p.por_periodo OR (t.created_at >= p.ini AND t.created_at < p.fim))) AS s_guardiao,
      EXISTS(SELECT 1 FROM metodo_areas t WHERE t.id_cliente=c.id_cliente AND (NOT p.por_periodo OR (t.created_at >= p.ini AND t.created_at < p.fim))) AS s_areas,
      EXISTS(SELECT 1 FROM metodo_gargalos t WHERE t.id_cliente=c.id_cliente AND (NOT p.por_periodo OR (t.created_at >= p.ini AND t.created_at < p.fim))) AS s_gargalos,
      EXISTS(SELECT 1 FROM metodo_copilotos t WHERE t.id_cliente=c.id_cliente AND (NOT p.por_periodo OR (t.created_at >= p.ini AND t.created_at < p.fim))) AS s_copilotos,
      EXISTS(SELECT 1 FROM metodo_sistemas t WHERE t.id_cliente=c.id_cliente AND (NOT p.por_periodo OR (t.created_at >= p.ini AND t.created_at < p.fim))) AS s_sistemas,
      EXISTS(SELECT 1 FROM metodo_economias t WHERE t.id_cliente=c.id_cliente AND (NOT p.por_periodo OR (t.created_at >= p.ini AND t.created_at < p.fim))) AS s_economias,
      -- vitórias (por data_vitoria, senão created_at)
      (SELECT count(*) FROM cliente_vitorias t WHERE t.id_cliente=c.id_cliente
         AND (NOT p.por_periodo OR (COALESCE(t.data_vitoria, t.created_at::date) >= p.ini AND COALESCE(t.data_vitoria, t.created_at::date) < p.fim)))::int AS n_vitorias,
      -- reuniões (galdino + consultores + blackcrm[text ISO])
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
      -- etapas manuais concluídas (total: quaisquer; período: com concluida_em no período)
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
      WHERE cc.id_cliente = c.id_cliente AND cc.guardiao_ia = true
      LIMIT 1
    ) gc ON true
    WHERE c.data_cancelamento IS NULL
  ),
  calc AS (
    SELECT
      id_cliente, guardiao_nome, empresa, mostrar, n_vitorias, n_reunioes,
      (s_guardiao::int + s_areas::int + s_gargalos::int + s_copilotos::int + s_sistemas::int + s_economias::int) AS fases,
      CASE WHEN por_periodo
        THEN cardinality(etapas_manuais)
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
    SELECT
      id_cliente, guardiao_nome, empresa, mostrar, etapas, fases, n_vitorias, n_reunioes,
      (etapas * 100 + fases * 40 + n_vitorias * 30 + n_reunioes * 15) AS pontos,
      (id_cliente = auth.uid()) AS is_me
    FROM calc
  ),
  pub AS (
    SELECT pontos FROM pts WHERE pontos > 0 AND mostrar
  )
  SELECT
    ((SELECT count(*) FROM pub WHERE pub.pontos > pts.pontos) + 1)::int AS posicao,
    guardiao_nome,
    empresa,
    pontos,
    etapas,
    fases,
    n_vitorias AS vitorias,
    n_reunioes AS reunioes,
    is_me,
    NOT (pontos > 0 AND mostrar) AS oculto,
    (SELECT count(*)::int FROM pub) AS total_participantes
  FROM pts
  WHERE (pontos > 0 AND mostrar) OR is_me
  ORDER BY (pontos > 0 AND mostrar) DESC, pontos DESC, empresa ASC NULLS LAST;
$$;

REVOKE ALL ON FUNCTION ranking_guardioes(text) FROM public;
GRANT EXECUTE ON FUNCTION ranking_guardioes(text) TO authenticated;
