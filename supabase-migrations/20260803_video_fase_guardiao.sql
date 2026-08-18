-- Vídeo de abertura da Fase 1 (Guardião da IA) do Método MC.
-- Mesmo padrão dos outros players: a URL mora em configuracoes_links, então o
-- time troca pelo painel de Configurações sem deploy. Chave inativa (ou url
-- vazia) esconde o bloco inteiro na fase.
insert into configuracoes_links (chave, label, descricao, url, ativo)
values (
  'video_fase_guardiao',
  'Vídeo: o papel do Guardião da IA (Fase 1)',
  'Aparece no topo da Fase 1 do Método MC. Deixe vazio ou inativo para esconder o player.',
  'https://vimeo.com/1200857007',
  true
)
on conflict (chave) do update
  set label = excluded.label,
      descricao = excluded.descricao,
      url = excluded.url,
      ativo = excluded.ativo,
      updated_at = now();
