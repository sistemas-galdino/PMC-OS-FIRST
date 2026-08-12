-- Rollback de 20260812_skills_video_tutorial.sql
-- Remove a linha de configuração do vídeo tutorial da aba Skills.
-- (O card em /skills simplesmente deixa de renderizar quando a linha não existe.)

DELETE FROM public.configuracoes_links WHERE chave = 'skills_video_tutorial';
