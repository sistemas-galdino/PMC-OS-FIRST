-- Pulso Semanal do Dono — o loop semanal do PMC OS (padrão EOS Scorecard).
-- 1 linha por cliente por semana (semana = segunda-feira ISO): 3 números do
-- negócio + confiança 0-10 + destaque opcional. Alimenta streak, Pontos MC
-- (+20/pulso), badges de constância e o aviso de domingo às 19h (BRT).
CREATE TABLE IF NOT EXISTS pulso_semanal (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  id_cliente uuid NOT NULL,
  semana date NOT NULL,                 -- segunda-feira da semana referida
  faturamento numeric,
  vendas numeric,
  leads numeric,
  confianca int NOT NULL CHECK (confianca BETWEEN 0 AND 10),
  destaque text,                        -- "melhor coisa / maior trava da semana"
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (id_cliente, semana)
);
CREATE INDEX IF NOT EXISTS pulso_semanal_cliente_idx ON pulso_semanal(id_cliente, semana DESC);

ALTER TABLE pulso_semanal ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS pulso_own ON pulso_semanal;
CREATE POLICY pulso_own ON pulso_semanal
  FOR ALL TO authenticated
  USING (id_cliente = auth.uid() OR is_admin())
  WITH CHECK (id_cliente = auth.uid() OR is_admin());

-- Pontos MC: +20 por pulso respondido (espelhado no front em lib/nivel-pmc).
CREATE OR REPLACE FUNCTION public.pontos_mc(p uuid)
RETURNS int LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
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
      COALESCE((SELECT array_agg(etapa) FROM cliente_etapas_metodo e WHERE e.id_cliente=p AND e.concluida), ARRAY[]::int[]) AS man
  )
  SELECT (
    ( ((1=ANY(man)) OR g)::int + ((2=ANY(man)) OR a)::int + ((3=ANY(man)) OR ga)::int
      + ((4=ANY(man)) OR ec)::int + ((5=ANY(man)) OR cp)::int + ((6=ANY(man)) OR si)::int
      + ((7=ANY(man)) OR (reu>0))::int ) * 100
    + (g::int+a::int+ga::int+cp::int+si::int+ec::int) * 40
    + vit * 30 + reu * 15 + pul * 20
  ) FROM s;
$$;

-- Badges de constância do pulso + métrica no sync_badges.
INSERT INTO badges_catalogo (slug, nome, descricao, criterio, raridade, icone, trilha, ordem, meta_metrica, meta_valor, auto) VALUES
  ('p_4','Ritmo Criado','4 pulsos semanais respondidos — o hábito nasceu.','Responda 4 pulsos semanais','bronze','calendar','constancia',24,'pulsos',4,true),
  ('p_26','Meio Ano de Pulso','26 semanas medindo o negócio. Disciplina rara.','Responda 26 pulsos semanais','ouro','flame','constancia',25,'pulsos',26,true)
ON CONFLICT (slug) DO UPDATE SET
  nome=EXCLUDED.nome, descricao=EXCLUDED.descricao, criterio=EXCLUDED.criterio,
  raridade=EXCLUDED.raridade, icone=EXCLUDED.icone, trilha=EXCLUDED.trilha,
  ordem=EXCLUDED.ordem, meta_metrica=EXCLUDED.meta_metrica, meta_valor=EXCLUDED.meta_valor, auto=EXCLUDED.auto;

-- sync_badges: adiciona a métrica 'pulsos' (o restante permanece igual).
CREATE OR REPLACE FUNCTION public.sync_badges()
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  me uuid := auth.uid();
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
    'pulsos', (SELECT count(*) FROM pulso_semanal WHERE id_cliente=me),
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

-- Aviso de abertura do pulso: domingo 19h BRT (22:00 UTC), broadcast único.
CREATE OR REPLACE FUNCTION public.notificar_pulso_aberto()
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM notificacoes
    WHERE id_cliente IS NULL AND link = '/inicio'
      AND titulo LIKE '📊 Seu Pulso Semanal%' AND created_at::date = CURRENT_DATE
  ) THEN RETURN; END IF;
  INSERT INTO notificacoes (id_cliente, tipo, titulo, texto, link)
  VALUES (NULL, 'aviso', '📊 Seu Pulso Semanal está aberto',
          '60 segundos: 3 números da semana + como você está com o negócio. Mantenha sua sequência 🔥',
          '/inicio');
END; $$;
DO $$ BEGIN PERFORM cron.unschedule('pmc-pulso-domingo'); EXCEPTION WHEN OTHERS THEN NULL; END $$;
SELECT cron.schedule('pmc-pulso-domingo', '0 22 * * 0', 'SELECT public.notificar_pulso_aberto()');

-- Ranking dos Guardiões: pulsos entram nos Pontos MC (+20), com recorte por período.
CREATE OR REPLACE FUNCTION ranking_guardioes(periodo text DEFAULT 'total')
RETURNS TABLE (
  posicao int, guardiao_nome text, empresa text, pontos int,
  etapas int, fases int, vitorias int, reunioes int,
  is_me boolean, oculto boolean, total_participantes int
)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
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
      (etapas * 100 + fases * 40 + n_vitorias * 30 + n_reunioes * 15 + n_pulsos * 20) AS pontos,
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
$$;
