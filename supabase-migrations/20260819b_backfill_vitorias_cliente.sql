-- ============================================================================
-- Backfill: vitórias registradas pelos CLIENTES que nunca chegaram ao kanban.
--
-- O trigger trg_sync_vitoria_repositorio (20260719d) copia cada nova
-- cliente_vitorias para repositorio_vitorias, mas só vale do dia em que foi
-- criado (20/07) em diante. As 27 vitórias registradas antes disso ficaram
-- invisíveis para o time — é o que esta migration corrige.
--
-- Fica de fora o cliente demo (DemoStore Brasil, código 316), usado nas lives:
-- as vitórias dele são material de demonstração e só poluiriam a curadoria.
--
-- Idempotente: o NOT EXISTS por cliente_vitoria_id (e o índice único
-- repositorio_vitorias_cliente_vitoria_uidx atrás dele) tornam a reexecução
-- inofensiva. No DEV não há cliente_vitorias: roda e insere 0 linhas.
-- ============================================================================

INSERT INTO repositorio_vitorias (
  id_cliente, cliente_nome, titulo, descricao, area, origem,
  evidencia_tipo, evidencia_url, evidencia_link, status,
  cadastrado_por, cliente_vitoria_id, created_at
)
SELECT
  cv.id_cliente,
  (SELECT COALESCE(NULLIF(btrim(ce.nome_empresa_formatado), ''),
                   NULLIF(btrim(ce.nome_cliente_formatado), ''))
     FROM clientes_entrada_new ce WHERE ce.id_cliente = cv.id_cliente),
  cv.titulo,
  -- Mesma montagem do trigger, para o card ficar idêntico ao das vitórias novas.
  'Antes: ' || cv.gargalo_antes
    || E'\nO que fez: ' || cv.o_que_fez
    || E'\nAgora: ' || cv.como_esta_agora
    || CASE WHEN cv.valor_antes IS NOT NULL OR cv.valor_depois IS NOT NULL
            THEN E'\nValor: ' || COALESCE(cv.valor_antes::text, '—') || ' → ' || COALESCE(cv.valor_depois::text, '—')
            ELSE '' END
    || CASE WHEN cv.qtd_antes IS NOT NULL OR cv.qtd_depois IS NOT NULL
            THEN E'\nQuantidade: ' || COALESCE(cv.qtd_antes::text, '—') || ' → ' || COALESCE(cv.qtd_depois::text, '—')
            ELSE '' END,
  cv.area,
  COALESCE(NULLIF(btrim(cv.origem), ''), 'Sucesso do Cliente'),
  CASE WHEN cv.evidencia_url IS NOT NULL THEN 'imagem'
       WHEN cv.evidencia_link IS NOT NULL THEN 'link'
       ELSE 'imagem' END,
  cv.evidencia_url,
  cv.evidencia_link,
  'aguardando',
  NULL,                       -- cadastrado_por é usuário; quem registrou foi o cliente
  cv.id,
  cv.created_at               -- preserva a data original: o card é histórico, não novidade
FROM cliente_vitorias cv
WHERE NOT EXISTS (
        SELECT 1 FROM repositorio_vitorias r WHERE r.cliente_vitoria_id = cv.id
      )
  -- DemoStore Brasil (código 316), o cliente de demonstração das lives.
  AND cv.id_cliente IS DISTINCT FROM '3557444d-8deb-4b34-a02d-4c10f6a3986e'::uuid
ON CONFLICT (cliente_vitoria_id) DO NOTHING;

-- ----------------------------------------------------------------------------
-- Correção de rota no trigger: `cadastrado_por` guarda o USUÁRIO que registrou,
-- e estava recebendo NEW.id_cliente (um id de cliente). Ninguém lê a coluna
-- hoje, então dá para consertar sem migrar dado.
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.sync_vitoria_para_repositorio()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_nome text;
  v_desc text;
  v_ev_tipo text;
BEGIN
  SELECT COALESCE(NULLIF(btrim(nome_empresa_formatado), ''), NULLIF(btrim(nome_cliente_formatado), ''))
    INTO v_nome
    FROM clientes_entrada_new WHERE id_cliente = NEW.id_cliente;

  v_desc := 'Antes: ' || NEW.gargalo_antes
         || E'\nO que fez: ' || NEW.o_que_fez
         || E'\nAgora: ' || NEW.como_esta_agora;
  IF NEW.valor_antes IS NOT NULL OR NEW.valor_depois IS NOT NULL THEN
    v_desc := v_desc || E'\nValor: ' || COALESCE(NEW.valor_antes::text, '—') || ' → ' || COALESCE(NEW.valor_depois::text, '—');
  END IF;
  IF NEW.qtd_antes IS NOT NULL OR NEW.qtd_depois IS NOT NULL THEN
    v_desc := v_desc || E'\nQuantidade: ' || COALESCE(NEW.qtd_antes::text, '—') || ' → ' || COALESCE(NEW.qtd_depois::text, '—');
  END IF;

  v_ev_tipo := CASE
    WHEN NEW.evidencia_url IS NOT NULL THEN 'imagem'
    WHEN NEW.evidencia_link IS NOT NULL THEN 'link'
    ELSE 'imagem'
  END;

  INSERT INTO repositorio_vitorias (
    id_cliente, cliente_nome, titulo, descricao, area, origem,
    evidencia_tipo, evidencia_url, evidencia_link, status,
    cadastrado_por, cliente_vitoria_id
  )
  VALUES (
    NEW.id_cliente, v_nome, NEW.titulo, v_desc, NEW.area,
    COALESCE(NULLIF(btrim(NEW.origem), ''), 'Sucesso do Cliente'),
    v_ev_tipo, NEW.evidencia_url, NEW.evidencia_link, 'aguardando',
    NULL, NEW.id
  )
  ON CONFLICT (cliente_vitoria_id) DO NOTHING;

  RETURN NEW;
END;
$$;

NOTIFY pgrst, 'reload schema';
