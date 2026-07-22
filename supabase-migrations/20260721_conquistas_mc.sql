-- Conquistas MC (gamificação) — badges acumuláveis, data-driven.
--  badges_catalogo: conteúdo (nome, descrição, critério, raridade, ícone, meta).
--  cliente_badges:  o que cada cliente já conquistou (única por cliente+badge).
--  pontos_mc():     Pontos MC totais de um cliente (reusa a fórmula do nível).
--  sync_badges():   avalia o catálogo contra as métricas do cliente, concede as
--                   que faltam, notifica no sino e devolve earned+metrics+novas.
--  avaliar_top10(): cron diário — top 10 do ranking ganha a badge "Top 10".
-- Regra de ouro: as badges "auto" são concedidas por limiar de métrica; a lógica
-- de ganho é 100% genérica (não hardcoda badge) — nova badge = 1 INSERT no catálogo.

CREATE TABLE IF NOT EXISTS badges_catalogo (
  slug text PRIMARY KEY,
  nome text NOT NULL,
  descricao text NOT NULL,
  criterio text NOT NULL,          -- texto do critério (mostrado quando bloqueada)
  raridade text NOT NULL,          -- bronze | prata | ouro | lenda
  icone text NOT NULL,             -- chave de ícone (front mapeia); arq_* = arquétipo
  trilha text NOT NULL,            -- execucao | vitorias | metodo | nivel | constancia | comunidade
  ordem int NOT NULL DEFAULT 0,
  meta_metrica text NOT NULL,      -- chave em metrics; ganha quando metrics[meta_metrica] >= meta_valor
  meta_valor numeric NOT NULL DEFAULT 1,
  auto boolean NOT NULL DEFAULT true  -- false = concedida por processo externo (cron)
);
ALTER TABLE badges_catalogo ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS badges_catalogo_read ON badges_catalogo;
CREATE POLICY badges_catalogo_read ON badges_catalogo FOR SELECT TO authenticated USING (true);

CREATE TABLE IF NOT EXISTS cliente_badges (
  id_cliente uuid NOT NULL,
  badge_slug text NOT NULL REFERENCES badges_catalogo(slug) ON DELETE CASCADE,
  conquistada_em timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (id_cliente, badge_slug)
);
ALTER TABLE cliente_badges ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS cliente_badges_own ON cliente_badges;
CREATE POLICY cliente_badges_own ON cliente_badges FOR SELECT TO authenticated
  USING (id_cliente = auth.uid() OR is_admin());

-- Seed do catálogo (idempotente).
INSERT INTO badges_catalogo (slug, nome, descricao, criterio, raridade, icone, trilha, ordem, meta_metrica, meta_valor, auto) VALUES
  ('acao_1','Primeira Ação','Você concluiu sua primeira ação de reunião.','Conclua 1 ação','bronze','check','execucao',1,'acoes',1,true),
  ('acao_10','Executor','10 ações concluídas — o negócio anda com você.','Conclua 10 ações','prata','zap','execucao',2,'acoes',10,true),
  ('acao_25','Máquina de Execução','25 ações concluídas. Consistência de dono.','Conclua 25 ações','ouro','flame','execucao',3,'acoes',25,true),
  ('acao_50','Imparável','50 ações concluídas. Poucos chegam aqui.','Conclua 50 ações','lenda','rocket','execucao',4,'acoes',50,true),
  ('vit_1','Primeira Vitória','Você registrou sua primeira vitória.','Registre 1 vitória','bronze','star','vitorias',5,'vitorias',1,true),
  ('vit_5','Colecionador de Vitórias','5 vitórias registradas na Central.','Registre 5 vitórias','ouro','trophy','vitorias',6,'vitorias',5,true),
  ('vit_aprovada','Vitória Validada','Uma vitória sua foi aprovada pelo time.','Tenha 1 vitória aprovada','prata','medal','vitorias',7,'vitorias_aprovadas',1,true),
  ('vit_case','Virou Case','Uma vitória sua virou case oficial do PMC.','Tenha 1 vitória escolhida como case','lenda','crown','vitorias',8,'cases',1,true),
  ('m_guardiao','Guardião Definido','Você definiu o Guardião da IA (Fase 1).','Cadastre o Guardião da IA','prata','shield','metodo',9,'fase_guardiao',1,true),
  ('m_inteligencia','Inteligência Ativa','Você iniciou a Inteligência Empresarial (Fase 2).','Comece a Fase 2','prata','brain','metodo',10,'fase_areas',1,true),
  ('m_gargalos','Caçador de Gargalos','Você mapeou gargalos (Fase 3).','Mapeie 1 gargalo','prata','target','metodo',11,'fase_gargalos',1,true),
  ('m_copilotos','Time Híbrido','Você criou co-pilotos de IA (Fase 4).','Crie 1 co-piloto','prata','users','metodo',12,'fase_copilotos',1,true),
  ('m_sistemas','Torre Ativa','Você cadastrou sistemas (Fase 5).','Cadastre 1 sistema','prata','cpu','metodo',13,'fase_sistemas',1,true),
  ('m_economia','Primeira Economia','Você registrou economia gerada (Fase 6).','Registre 1 economia','ouro','coins','metodo',14,'fase_economias',1,true),
  ('n_construtor','Construtor','Você alcançou o nível Construtor.','Chegue ao nível Construtor','prata','arq_construtor','nivel',15,'nivel_indice',1,true),
  ('n_multiplicador','Multiplicador','Você alcançou o nível Multiplicador.','Chegue ao nível Multiplicador','ouro','arq_multiplicador','nivel',16,'nivel_indice',2,true),
  ('n_arquiteto','Arquiteto','Você alcançou o nível Arquiteto.','Chegue ao nível Arquiteto','ouro','arq_arquiteto','nivel',17,'nivel_indice',3,true),
  ('n_mestre','Mestre PMC','Você alcançou o topo: Mestre PMC.','Chegue ao nível Mestre PMC','lenda','arq_mestre','nivel',18,'nivel_indice',4,true),
  ('r_10','Presente','10 reuniões realizadas no programa.','Participe de 10 reuniões','bronze','calendar','constancia',19,'reunioes',10,true),
  ('r_25','Veterano','25 reuniões — constância de verdade.','Participe de 25 reuniões','prata','flame','constancia',20,'reunioes',25,true),
  ('r_50','Lenda do PMC','50 reuniões no programa. Respeito.','Participe de 50 reuniões','lenda','crown','constancia',21,'reunioes',50,true),
  ('c_comentario','Voz Ativa','Você comentou na comunidade.','Comente 1 vez na comunidade','bronze','message','comunidade',22,'comentarios',1,true),
  ('c_top10','Top 10 do PMC','Você está entre os 10 primeiros do ranking.','Fique no top 10 do ranking de Pontos MC','ouro','medal','comunidade',23,'podios',1,false)
ON CONFLICT (slug) DO UPDATE SET
  nome=EXCLUDED.nome, descricao=EXCLUDED.descricao, criterio=EXCLUDED.criterio,
  raridade=EXCLUDED.raridade, icone=EXCLUDED.icone, trilha=EXCLUDED.trilha,
  ordem=EXCLUDED.ordem, meta_metrica=EXCLUDED.meta_metrica, meta_valor=EXCLUDED.meta_valor, auto=EXCLUDED.auto;

-- Pontos MC totais de um cliente (mesma fórmula do lib/nivel-pmc e do ranking).
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
      COALESCE((SELECT array_agg(etapa) FROM cliente_etapas_metodo e WHERE e.id_cliente=p AND e.concluida), ARRAY[]::int[]) AS man
  )
  SELECT (
    ( ((1=ANY(man)) OR g)::int + ((2=ANY(man)) OR a)::int + ((3=ANY(man)) OR ga)::int
      + ((4=ANY(man)) OR ec)::int + ((5=ANY(man)) OR cp)::int + ((6=ANY(man)) OR si)::int
      + ((7=ANY(man)) OR (reu>0))::int ) * 100
    + (g::int+a::int+ga::int+cp::int+si::int+ec::int) * 40
    + vit * 30 + reu * 15
  ) FROM s;
$$;

-- Avalia e concede badges do cliente logado. Retorna earned + metrics + novas.
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
REVOKE ALL ON FUNCTION public.sync_badges() FROM public;
GRANT EXECUTE ON FUNCTION public.sync_badges() TO authenticated;

-- Cron diário: top 10 do ranking (opt-in, pontos>0) ganha a badge Top 10.
CREATE OR REPLACE FUNCTION public.avaliar_top10()
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE r record;
BEGIN
  FOR r IN
    SELECT c.id_cliente FROM clientes_entrada_new c
    WHERE c.data_cancelamento IS NULL AND c.mostrar_no_ranking AND pontos_mc(c.id_cliente) > 0
    ORDER BY pontos_mc(c.id_cliente) DESC LIMIT 10
  LOOP
    INSERT INTO cliente_badges (id_cliente, badge_slug) VALUES (r.id_cliente, 'c_top10')
    ON CONFLICT DO NOTHING;
    IF FOUND THEN
      INSERT INTO notificacoes (id_cliente, tipo, titulo, texto, link)
      VALUES (r.id_cliente, 'aviso', '🏅 Nova conquista: Top 10 do PMC',
              'Você está entre os 10 primeiros do ranking de Pontos MC!', '/ranking-guardioes');
    END IF;
  END LOOP;
END; $$;
DO $$ BEGIN PERFORM cron.unschedule('pmc-top10-badge'); EXCEPTION WHEN OTHERS THEN NULL; END $$;
SELECT cron.schedule('pmc-top10-badge', '10 11 * * *', 'SELECT public.avaliar_top10()');
