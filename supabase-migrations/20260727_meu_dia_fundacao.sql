-- Onda 2 · Fase A — Fundação do "Meu Dia" (nenhuma tela ainda).
-- Três coisas, nesta ordem de dependência:
--   1) responsavel vira PESSOA de verdade  -> destrava atribuição e notificação
--   2) metodo_dia_fechamentos               -> onde o ritual "Fechar o dia" grava
--   3) streak com escudo semanal            -> calculado por query, nunca armazenado

-- ---------------------------------------------------------------------------
-- 1) responsavel: texto livre -> FK para o time da empresa
-- ---------------------------------------------------------------------------
-- Mantemos a coluna `responsavel` (text) de propósito: nem todo responsável é
-- colaborador cadastrado (terceiro, fornecedor). A FK é o caminho preferencial;
-- o texto é o fallback. A UI grava responsavel_id sempre que houver pessoa.
ALTER TABLE public.metodo_tarefas
  ADD COLUMN IF NOT EXISTS responsavel_id uuid;

-- FK COMPOSTA, não simples. A simples garante que a pessoa existe; a composta
-- garante que ela é DA MESMA EMPRESA — sem isso, uma tarefa da empresa B podia
-- apontar para alguém da empresa A e vazar o nome num join futuro.
-- E o SET NULL precisa nomear a coluna: em FK composta, o SET NULL sem lista
-- tenta anular também id_cliente (NOT NULL) e a exclusão do colaborador quebra.
ALTER TABLE public.cliente_colaboradores
  DROP CONSTRAINT IF EXISTS cliente_colaboradores_id_cliente_uk;
ALTER TABLE public.cliente_colaboradores
  ADD CONSTRAINT cliente_colaboradores_id_cliente_uk UNIQUE (id, id_cliente);

ALTER TABLE public.metodo_tarefas
  DROP CONSTRAINT IF EXISTS metodo_tarefas_responsavel_mesma_empresa;
ALTER TABLE public.metodo_tarefas
  ADD CONSTRAINT metodo_tarefas_responsavel_mesma_empresa
  FOREIGN KEY (responsavel_id, id_cliente)
  REFERENCES public.cliente_colaboradores(id, id_cliente)
  ON DELETE SET NULL (responsavel_id);

CREATE INDEX IF NOT EXISTS idx_metodo_tarefas_responsavel
  ON public.metodo_tarefas (responsavel_id) WHERE responsavel_id IS NOT NULL;

-- Backfill: casa o texto com o nome de um colaborador DA MESMA empresa.
-- Só casa quando há exatamente um match — nome ambíguo fica como texto.
UPDATE public.metodo_tarefas t
   SET responsavel_id = c.id
  FROM public.cliente_colaboradores c
 WHERE t.responsavel_id IS NULL
   AND coalesce(btrim(t.responsavel), '') <> ''
   AND c.id_cliente = t.id_cliente
   AND lower(btrim(c.nome)) = lower(btrim(t.responsavel))
   AND (SELECT count(*) FROM public.cliente_colaboradores c2
         WHERE c2.id_cliente = t.id_cliente
           AND lower(btrim(c2.nome)) = lower(btrim(t.responsavel))) = 1;

COMMENT ON COLUMN public.metodo_tarefas.responsavel_id IS
  'Pessoa do time responsável. NULL + responsavel(text) = alguém de fora do cadastro.';

-- ---------------------------------------------------------------------------
-- 2) O ritual: um fechamento por empresa por dia
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.metodo_dia_fechamentos (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  id_cliente     uuid NOT NULL,
  data           date NOT NULL,
  colaborador_id uuid,   -- FK composta declarada logo abaixo (mesma empresa)
  -- As 3 perguntas obrigatórias da Rotina Diária (data/lib/guardiao/tarefas.ts)
  resp_ontem     text,   -- O que a IA fez ontem?
  resp_hoje      text,   -- O que será aplicado hoje?
  resp_travou    text,   -- Onde travou?
  -- Quais itens do checklist da rotina foram marcados (índices ou chaves)
  checklist      jsonb NOT NULL DEFAULT '[]'::jsonb,
  -- NULL = rascunho do dia (checklist sendo marcado ao longo do expediente).
  -- Preenchido = ritual concluído. SÓ este conta no streak — senão marcar um
  -- checkbox às 8h já daria streak e o número perderia o significado.
  fechado_em     timestamptz,
  created_at     timestamptz NOT NULL DEFAULT now(),
  updated_at     timestamptz NOT NULL DEFAULT now(),
  UNIQUE (id_cliente, data)
);

ALTER TABLE public.metodo_dia_fechamentos
  DROP CONSTRAINT IF EXISTS metodo_dia_fech_colaborador_mesma_empresa;
ALTER TABLE public.metodo_dia_fechamentos
  ADD CONSTRAINT metodo_dia_fech_colaborador_mesma_empresa
  FOREIGN KEY (colaborador_id, id_cliente)
  REFERENCES public.cliente_colaboradores(id, id_cliente)
  ON DELETE SET NULL (colaborador_id);

CREATE INDEX IF NOT EXISTS idx_dia_fech_cliente_data
  ON public.metodo_dia_fechamentos (id_cliente, data DESC);

ALTER TABLE public.metodo_dia_fechamentos ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS dia_fechamentos_rw ON public.metodo_dia_fechamentos;
CREATE POLICY dia_fechamentos_rw ON public.metodo_dia_fechamentos
  FOR ALL
  USING ((meu_id_cliente() = id_cliente) OR is_admin())
  WITH CHECK ((meu_id_cliente() = id_cliente) OR is_admin());

COMMENT ON TABLE public.metodo_dia_fechamentos IS
  'Ritual diário do Guardião. Uma linha por empresa/dia. Fonte do streak e das evidências do Balanço.';

-- ---------------------------------------------------------------------------
-- 3) Streak — calculado, nunca armazenado
-- ---------------------------------------------------------------------------
-- Regras (decididas no plano da Onda 2):
--   · conta só dias úteis (seg-sex). Fim de semana não conta nem quebra.
--   · o dia de HOJE ainda em aberto não quebra o streak (a contagem começa em ontem).
--   · ESCUDO: 1 por semana ISO. Um dia útil não fechado consome o escudo daquela
--     semana em vez de zerar. Streak punitivo gera churn no primeiro tropeço —
--     é a lição mais cara do Duolingo.
--   · `recorde` é a maior sequência PURA (sem escudo): serve para a mensagem
--     "seu recorde é X" quando o streak quebra. Vergonha vira churn; recorde vira meta.
CREATE OR REPLACE FUNCTION public.streak_guardiao(p_cliente uuid, p_ref date DEFAULT NULL)
RETURNS TABLE(streak int, recorde int, escudo_disponivel boolean, semana jsonb)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_hoje    date := coalesce(p_ref, (now() AT TIME ZONE 'America/Sao_Paulo')::date);
  v_cursor  date;
  v_streak  int := 0;
  v_escudos text[] := ARRAY[]::text[];   -- semanas ISO que já gastaram o escudo
  v_sem     text;
  v_fechado boolean;
  v_i       int := 0;
  v_seg     date;
BEGIN
  IF p_cliente IS NULL THEN
    RETURN QUERY SELECT 0, 0, true, '[]'::jsonb; RETURN;
  END IF;

  -- Ponto de partida: hoje se já fechou; senão o dia útil anterior
  -- (o dia em curso não pode penalizar quem ainda vai trabalhar).
  v_cursor := v_hoje;
  IF extract(isodow FROM v_cursor) > 5
     OR NOT EXISTS (SELECT 1 FROM metodo_dia_fechamentos f
                     WHERE f.id_cliente = p_cliente AND f.data = v_cursor
                       AND f.fechado_em IS NOT NULL)
  THEN
    v_cursor := v_cursor - 1;
    WHILE extract(isodow FROM v_cursor) > 5 LOOP v_cursor := v_cursor - 1; END LOOP;
  END IF;

  -- Varre para trás enquanto a corrente se sustentar.
  LOOP
    v_i := v_i + 1;
    EXIT WHEN v_i > 400;   -- trava de segurança (~285 dias úteis)

    -- Fim de semana é apenas pulado: não conta nem quebra.
    IF extract(isodow FROM v_cursor) <= 5 THEN
      v_fechado := EXISTS (SELECT 1 FROM metodo_dia_fechamentos f
                            WHERE f.id_cliente = p_cliente AND f.data = v_cursor
                              AND f.fechado_em IS NOT NULL);
      IF v_fechado THEN
        v_streak := v_streak + 1;
      ELSE
        v_sem := to_char(v_cursor, 'IYYY-IW');
        IF v_sem = ANY(v_escudos) THEN
          EXIT;                        -- escudo daquela semana já gasto: quebrou
        ELSE
          v_escudos := array_append(v_escudos, v_sem);  -- consome e segue
        END IF;
      END IF;
    END IF;

    v_cursor := v_cursor - 1;
  END LOOP;

  -- Recorde: maior sequência pura de dias úteis consecutivos.
  -- Dois dias úteis são consecutivos se diferem 1 dia, ou 3 quando é sexta->segunda.
  recorde := coalesce((
    WITH dias AS (
      SELECT f.data, lag(f.data) OVER (ORDER BY f.data) AS ant
        FROM metodo_dia_fechamentos f
       WHERE f.id_cliente = p_cliente AND f.fechado_em IS NOT NULL
         AND extract(isodow FROM f.data) <= 5
    ),
    marcas AS (
      SELECT data,
             CASE WHEN ant IS NULL THEN 1
                  WHEN (data - ant) = 1
                    OR (extract(isodow FROM ant) = 5 AND (data - ant) = 3) THEN 0
                  ELSE 1 END AS nova
        FROM dias
    ),
    grupos AS (SELECT data, sum(nova) OVER (ORDER BY data) AS g FROM marcas)
    SELECT max(qtd) FROM (SELECT count(*) AS qtd FROM grupos GROUP BY g) s
  ), 0);

  -- Escudo da semana corrente ainda disponível?
  escudo_disponivel := NOT (to_char(v_hoje, 'IYYY-IW') = ANY(v_escudos));

  -- Os 5 quadrados: segunda a sexta da semana de referência.
  v_seg := v_hoje - ((extract(isodow FROM v_hoje)::int) - 1);
  semana := (
    SELECT jsonb_agg(jsonb_build_object(
             'data', d::date,
             'dow',  extract(isodow FROM d)::int,
             'fechado', EXISTS (SELECT 1 FROM metodo_dia_fechamentos f
                                 WHERE f.id_cliente = p_cliente AND f.data = d::date
                                   AND f.fechado_em IS NOT NULL),
             'futuro', d::date > v_hoje
           ) ORDER BY d)
      FROM generate_series(v_seg, v_seg + 4, interval '1 day') d
  );

  streak := v_streak;
  RETURN NEXT;
END; $$;

-- Mesma disciplina de segurança das outras: a versão que aceita id de terceiro
-- fica fora do alcance do papel `authenticated`.
REVOKE ALL ON FUNCTION public.streak_guardiao(uuid, date) FROM public, anon, authenticated;

-- Caminho seguro do próprio cliente: resolve sempre por meu_id_cliente().
CREATE OR REPLACE FUNCTION public.meu_streak(p_ref date DEFAULT NULL)
RETURNS TABLE(streak int, recorde int, escudo_disponivel boolean, semana jsonb)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT * FROM streak_guardiao(meu_id_cliente(), p_ref);
$$;

COMMENT ON FUNCTION public.meu_streak(date) IS
  'Streak do próprio cliente: dias úteis consecutivos com o dia fechado, com escudo de 1 por semana.';
