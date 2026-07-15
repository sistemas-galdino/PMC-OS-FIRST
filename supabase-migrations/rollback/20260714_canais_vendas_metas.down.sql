-- Rollback: remove as metas de Canais de Vendas (dono/PMC).
-- Ordem reversa: policy -> tabela (o DROP TABLE leva junto índices e RLS).
DROP POLICY IF EXISTS canais_vendas_admin_all ON canais_vendas_metas;
DROP TABLE IF EXISTS canais_vendas_metas;
