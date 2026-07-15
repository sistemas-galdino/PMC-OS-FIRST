-- Rollback: remove a RPC de distribuição agregada de clientes do HUB PMC.
-- O DROP FUNCTION leva junto o GRANT EXECUTE concedido a authenticated.
DROP FUNCTION IF EXISTS public.hub_pmc_distribuicao();
