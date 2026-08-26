-- Rollback de 20260822b_recursos_upgrade.sql
DROP FUNCTION IF EXISTS public.recurso_registrar_clique(uuid);
DROP TABLE IF EXISTS recursos_cliques;
DROP TABLE IF EXISTS recursos_favoritos;
ALTER TABLE recursos_programa DROP COLUMN IF EXISTS etapas;
ALTER TABLE recursos_programa DROP COLUMN IF EXISTS preco;
ALTER TABLE recursos_programa DROP COLUMN IF EXISTS descricao;
