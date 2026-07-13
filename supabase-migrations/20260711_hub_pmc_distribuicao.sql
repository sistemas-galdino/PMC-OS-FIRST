-- HUB PMC: distribuição AGREGADA de clientes por estado (Brasil) e por país.
-- Retorna apenas CONTAGENS (sem PII), então é seguro expor a qualquer usuário
-- autenticado mesmo com a RLS de clientes_entrada_new bloqueando leitura direta.
CREATE OR REPLACE FUNCTION hub_pmc_distribuicao()
RETURNS jsonb
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT jsonb_build_object(
    'total', (SELECT count(*) FROM clientes_entrada_new),
    'estados', COALESCE((
      SELECT jsonb_agg(jsonb_build_object('uf', upper(trim(estado_uf)), 'total', c) ORDER BY c DESC)
      FROM (
        SELECT estado_uf, count(*) AS c
        FROM clientes_entrada_new
        WHERE estado_uf IS NOT NULL AND trim(estado_uf) <> ''
        GROUP BY estado_uf
      ) s
    ), '[]'::jsonb),
    'paises', COALESCE((
      SELECT jsonb_agg(jsonb_build_object('pais', trim(pais), 'total', c) ORDER BY c DESC)
      FROM (
        SELECT pais, count(*) AS c
        FROM clientes_entrada_new
        WHERE pais IS NOT NULL AND trim(pais) <> ''
        GROUP BY pais
      ) p
    ), '[]'::jsonb)
  );
$$;

GRANT EXECUTE ON FUNCTION hub_pmc_distribuicao() TO authenticated;
