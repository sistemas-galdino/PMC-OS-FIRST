-- Capturada do estado já aplicado (DEV+PROD) para alinhar o repositório ao banco.
-- CORRECAO de projeto: a linha do dia nasce quando o Guardiao marca o PRIMEIRO
-- item do checklist (rascunho, ao longo do dia). Mas "dia fechado" e o ritual
-- COMPLETO. Sem separar os dois, marcar um checkbox as 8h ja daria streak — e o
-- streak perderia todo o significado.
--   fechado_em NULL          -> rascunho do dia, em andamento
--   fechado_em preenchido    -> ritual concluido, conta para o streak
ALTER TABLE public.metodo_dia_fechamentos
  ADD COLUMN IF NOT EXISTS fechado_em timestamptz;

COMMENT ON COLUMN public.metodo_dia_fechamentos.fechado_em IS
  'NULL = rascunho em andamento. Preenchido = ritual concluido; so este conta no streak.';

CREATE INDEX IF NOT EXISTS idx_dia_fech_fechados
  ON public.metodo_dia_fechamentos (id_cliente, data DESC) WHERE fechado_em IS NOT NULL;

-- O streak passa a olhar so o que foi realmente fechado.
CREATE OR REPLACE FUNCTION public.streak_guardiao(p_cliente uuid, p_ref date DEFAULT NULL)
RETURNS TABLE(streak int, recorde int, escudo_disponivel boolean, semana jsonb)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_hoje date := coalesce(p_ref, (now() AT TIME ZONE 'America/Sao_Paulo')::date);
  v_cursor date; v_streak int := 0; v_escudos text[] := ARRAY[]::text[];
  v_sem text; v_fechado boolean; v_i int := 0; v_seg date;
BEGIN
  IF p_cliente IS NULL THEN
    RETURN QUERY SELECT 0, 0, true, '[]'::jsonb; RETURN;
  END IF;

  v_cursor := v_hoje;
  IF extract(isodow FROM v_cursor) > 5
     OR NOT EXISTS (SELECT 1 FROM metodo_dia_fechamentos f
                     WHERE f.id_cliente = p_cliente AND f.data = v_cursor
                       AND f.fechado_em IS NOT NULL)
  THEN
    v_cursor := v_cursor - 1;
    WHILE extract(isodow FROM v_cursor) > 5 LOOP v_cursor := v_cursor - 1; END LOOP;
  END IF;

  LOOP
    v_i := v_i + 1;
    EXIT WHEN v_i > 400;
    IF extract(isodow FROM v_cursor) <= 5 THEN
      v_fechado := EXISTS (SELECT 1 FROM metodo_dia_fechamentos f
                            WHERE f.id_cliente = p_cliente AND f.data = v_cursor
                              AND f.fechado_em IS NOT NULL);
      IF v_fechado THEN
        v_streak := v_streak + 1;
      ELSE
        v_sem := to_char(v_cursor, 'IYYY-IW');
        IF v_sem = ANY(v_escudos) THEN EXIT;
        ELSE v_escudos := array_append(v_escudos, v_sem);
        END IF;
      END IF;
    END IF;
    v_cursor := v_cursor - 1;
  END LOOP;

  recorde := coalesce((
    WITH dias AS (
      SELECT f.data, lag(f.data) OVER (ORDER BY f.data) AS ant
        FROM metodo_dia_fechamentos f
       WHERE f.id_cliente = p_cliente AND f.fechado_em IS NOT NULL
         AND extract(isodow FROM f.data) <= 5
    ),
    marcas AS (
      SELECT data, CASE WHEN ant IS NULL THEN 1
                        WHEN (data - ant) = 1
                          OR (extract(isodow FROM ant) = 5 AND (data - ant) = 3) THEN 0
                        ELSE 1 END AS nova
        FROM dias
    ),
    grupos AS (SELECT data, sum(nova) OVER (ORDER BY data) AS g FROM marcas)
    SELECT max(qtd) FROM (SELECT count(*) AS qtd FROM grupos GROUP BY g) s
  ), 0);

  escudo_disponivel := NOT (to_char(v_hoje, 'IYYY-IW') = ANY(v_escudos));

  v_seg := v_hoje - ((extract(isodow FROM v_hoje)::int) - 1);
  semana := (
    SELECT jsonb_agg(jsonb_build_object(
             'data', d::date, 'dow', extract(isodow FROM d)::int,
             'fechado', EXISTS (SELECT 1 FROM metodo_dia_fechamentos f
                                 WHERE f.id_cliente = p_cliente AND f.data = d::date
                                   AND f.fechado_em IS NOT NULL),
             'futuro', d::date > v_hoje) ORDER BY d)
      FROM generate_series(v_seg, v_seg + 4, interval '1 day') d
  );

  streak := v_streak;
  RETURN NEXT;
END; $$;
