-- Rollback de 20260820_estudos_caso_engajamento.sql
DROP TABLE IF EXISTS conhecimento_estudos_caso_comentarios;
DROP TABLE IF EXISTS conhecimento_estudos_caso_likes;
DROP FUNCTION IF EXISTS public.estudo_caso_registrar_view(uuid);
ALTER TABLE conhecimento_estudos_caso DROP COLUMN IF EXISTS visualizacoes;
