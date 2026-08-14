-- Vídeo do framework de 4 etapas (Fase 2 · Inteligência Empresarial).
-- Mesmo padrão do vídeo da página Skills: a URL mora em configuracoes_links
-- para o time trocar pelo painel de Configurações, sem deploy. Deixar a chave
-- inativa (ou a url vazia) esconde o player inteiro na fase.
insert into configuracoes_links (chave, label, descricao, url, ativo)
values (
  'video_framework_ie',
  'Vídeo: framework de 4 etapas (Fase 2)',
  'Aparece na Fase 2 do Método MC, ao lado das 4 etapas. Deixe vazio ou inativo para esconder o player.',
  'https://vimeo.com/1170663746',
  true
)
on conflict (chave) do update
  set label = excluded.label,
      descricao = excluded.descricao,
      url = excluded.url,
      ativo = excluded.ativo,
      updated_at = now();
