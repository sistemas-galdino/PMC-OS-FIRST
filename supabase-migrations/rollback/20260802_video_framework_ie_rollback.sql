-- Rollback: remove o link do vídeo do framework da Fase 2.
-- Sem a chave, o bloco do player simplesmente não aparece.
delete from configuracoes_links where chave = 'video_framework_ie';
