-- Vídeo tutorial da aba Skills (painel do cliente).
-- Reusa a tabela genérica configuracoes_links (chave -> url) em vez de criar
-- coluna nova: label = título do card, descricao = aviso, url = link do Vimeo,
-- ativo = liga/desliga o card em /skills.
-- O admin edita esses campos em /skills-admin.
-- Nasce com url vazia e ativo = false: o card só aparece quando o link for colado.

INSERT INTO public.configuracoes_links (chave, label, descricao, url, ativo)
VALUES (
  'skills_video_tutorial',
  'Como usar as skills',
  'Assista ao vídeo antes de baixar sua primeira skill.',
  '',
  false
)
ON CONFLICT (chave) DO NOTHING;
