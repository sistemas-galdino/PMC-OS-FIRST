-- Rollback: remove o link do vídeo da Fase 1.
-- Sem a chave, o bloco do player simplesmente não aparece.
delete from configuracoes_links where chave = 'video_fase_guardiao';
