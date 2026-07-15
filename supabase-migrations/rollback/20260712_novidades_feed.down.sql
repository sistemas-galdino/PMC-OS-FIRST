-- =========================================================
-- ROLLBACK de 20260712_novidades_feed.sql
-- Desfaz o FEED de novidades: curtidas + comentários + colunas de categoria/avatar.
-- NÃO dropa comunidade_novidades (pertence a 20260711_comunidade_novidades).
-- Ordem reversa: policies -> tabelas novas -> colunas adicionadas no post.
-- Tudo com IF EXISTS. Drops de tabela levam junto policies/índices/constraints.
-- =========================================================

-- 1) Policies das tabelas novas
DROP POLICY IF EXISTS novidades_comentarios_delete ON comunidade_novidades_comentarios;
DROP POLICY IF EXISTS novidades_comentarios_insert ON comunidade_novidades_comentarios;
DROP POLICY IF EXISTS novidades_comentarios_select ON comunidade_novidades_comentarios;
DROP POLICY IF EXISTS novidades_likes_delete ON comunidade_novidades_likes;
DROP POLICY IF EXISTS novidades_likes_insert ON comunidade_novidades_likes;
DROP POLICY IF EXISTS novidades_likes_select ON comunidade_novidades_likes;

-- 2) Tabelas novas (comentários tem self-FK parent_id CASCADE; sai inteiro)
DROP TABLE IF EXISTS comunidade_novidades_comentarios;
DROP TABLE IF EXISTS comunidade_novidades_likes;

-- 3) Colunas adicionadas em comunidade_novidades (a tabela em si permanece)
ALTER TABLE comunidade_novidades DROP COLUMN IF EXISTS autor_avatar_url;
ALTER TABLE comunidade_novidades DROP COLUMN IF EXISTS categoria;
