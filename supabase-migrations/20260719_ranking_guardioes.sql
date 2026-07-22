-- Ranking dos Guardiões (Pontos MC) — RPC agregada, SECURITY DEFINER.
-- Calcula server-side os Pontos MC de TODAS as empresas ativas (mesma fórmula
-- do lib/nivel-pmc: etapas×100 + fases×40 + vitórias×30 + reuniões×15) e
-- devolve APENAS dados de engajamento (guardião, empresa, pontos, contagens).
-- Nada sensível (faturamento, telefones, conteúdo) sai daqui. RLS das tabelas
-- é contornada de propósito, mas o retorno é restrito às colunas abaixo.
CREATE OR REPLACE FUNCTION ranking_guardioes()
RETURNS TABLE (
  posicao int,
  guardiao_nome text,
  empresa text,
  pontos int,
  etapas int,
  fases int,
  vitorias int,
  reunioes int,
  is_me boolean
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  WITH base AS (
    SELECT
      c.id_cliente,
      COALESCE(NULLIF(btrim(c.guardiao_ia_nome), ''), gc.nome) AS guardiao_nome,
      NULLIF(btrim(c.nome_empresa_formatado), '') AS empresa,
      EXISTS(SELECT 1 FROM metodo_guardioes t WHERE t.id_cliente = c.id_cliente) AS s_guardiao,
      EXISTS(SELECT 1 FROM metodo_areas t WHERE t.id_cliente = c.id_cliente) AS s_areas,
      EXISTS(SELECT 1 FROM metodo_gargalos t WHERE t.id_cliente = c.id_cliente) AS s_gargalos,
      EXISTS(SELECT 1 FROM metodo_copilotos t WHERE t.id_cliente = c.id_cliente) AS s_copilotos,
      EXISTS(SELECT 1 FROM metodo_sistemas t WHERE t.id_cliente = c.id_cliente) AS s_sistemas,
      EXISTS(SELECT 1 FROM metodo_economias t WHERE t.id_cliente = c.id_cliente) AS s_economias,
      (SELECT count(*) FROM cliente_vitorias t WHERE t.id_cliente = c.id_cliente)::int AS n_vitorias,
      (
        (SELECT count(*) FROM reunioes_galdino t WHERE t.id_cliente = c.id_cliente) +
        (SELECT count(*) FROM reunioes_mentoria_new t WHERE t.id_cliente = c.id_cliente) +
        (SELECT count(*) FROM reunioes_blackcrm t WHERE t.id_cliente = c.id_cliente::text)
      )::int AS n_reunioes,
      COALESCE(
        (SELECT array_agg(e.etapa) FROM cliente_etapas_metodo e WHERE e.id_cliente = c.id_cliente AND e.concluida),
        ARRAY[]::int[]
      ) AS etapas_manuais
    FROM clientes_entrada_new c
    LEFT JOIN LATERAL (
      SELECT cc.nome FROM cliente_colaboradores cc
      WHERE cc.id_cliente = c.id_cliente AND cc.guardiao_ia = true
      LIMIT 1
    ) gc ON true
    WHERE c.data_cancelamento IS NULL
  ),
  calc AS (
    SELECT
      id_cliente, guardiao_nome, empresa, n_vitorias, n_reunioes,
      (s_guardiao::int + s_areas::int + s_gargalos::int + s_copilotos::int + s_sistemas::int + s_economias::int) AS fases,
      (
        ((1 = ANY(etapas_manuais)) OR s_guardiao)::int +
        ((2 = ANY(etapas_manuais)) OR s_areas)::int +
        ((3 = ANY(etapas_manuais)) OR s_gargalos)::int +
        ((4 = ANY(etapas_manuais)) OR s_economias)::int +
        ((5 = ANY(etapas_manuais)) OR s_copilotos)::int +
        ((6 = ANY(etapas_manuais)) OR s_sistemas)::int +
        ((7 = ANY(etapas_manuais)) OR (n_reunioes > 0))::int
      ) AS etapas
    FROM base
  ),
  pts AS (
    SELECT
      id_cliente, guardiao_nome, empresa, etapas, fases, n_vitorias, n_reunioes,
      (etapas * 100 + fases * 40 + n_vitorias * 30 + n_reunioes * 15) AS pontos
    FROM calc
  )
  SELECT
    ROW_NUMBER() OVER (ORDER BY pontos DESC, empresa ASC NULLS LAST)::int AS posicao,
    guardiao_nome,
    empresa,
    pontos,
    etapas,
    fases,
    n_vitorias AS vitorias,
    n_reunioes AS reunioes,
    (id_cliente = auth.uid()) AS is_me
  FROM pts
  ORDER BY pontos DESC, empresa ASC NULLS LAST;
$$;

REVOKE ALL ON FUNCTION ranking_guardioes() FROM public;
GRANT EXECUTE ON FUNCTION ranking_guardioes() TO authenticated;
