-- Links Importantes → catálogo 2026 de ferramentas modernas de IA para os
-- clientes PMC, organizado por categoria. Aditivo: não mexe nos recursos já
-- cadastrados (agendas, agentes do Galdino, Black CRM). Guardado com NOT EXISTS
-- pra poder reaplicar sem duplicar.

INSERT INTO recursos_programa (titulo, url, icone, categoria, ordem, ativo)
SELECT v.titulo, v.url, v.icone, v.categoria, v.ordem, true
FROM (VALUES
  -- IAs Generalistas — o dia a dia do dono e do Guardião
  ('Claude',            'https://claude.ai',                '🧠', 'Ferramentas de IA', 1),
  ('ChatGPT',           'https://chatgpt.com',              '💬', 'Ferramentas de IA', 2),
  ('Google Gemini',     'https://gemini.google.com',        '✨', 'Ferramentas de IA', 3),
  ('Perplexity',        'https://www.perplexity.ai',        '🔎', 'Ferramentas de IA', 4),
  ('NotebookLM',        'https://notebooklm.google.com',    '📓', 'Ferramentas de IA', 5),

  -- Automação e agentes — a máquina rodando sem você
  ('n8n',               'https://n8n.io',                   '⚙️', 'Automação e Agentes', 1),
  ('Make',              'https://www.make.com',             '🔁', 'Automação e Agentes', 2),
  ('Claude Code',       'https://claude.com/claude-code',   '🤖', 'Automação e Agentes', 3),

  -- Criação de conteúdo — marketing na velocidade da IA
  ('Canva',             'https://www.canva.com',            '🎨', 'Criação de Conteúdo', 1),
  ('CapCut',            'https://www.capcut.com',           '✂️', 'Criação de Conteúdo', 2),
  ('ElevenLabs',        'https://elevenlabs.io',            '🎙️', 'Criação de Conteúdo', 3),
  ('HeyGen',            'https://www.heygen.com',           '🧑‍🎤', 'Criação de Conteúdo', 4),
  ('Higgsfield',        'https://higgsfield.ai',            '🎥', 'Criação de Conteúdo', 5),
  ('Freepik',           'https://www.freepik.com',          '🖼️', 'Criação de Conteúdo', 6),
  ('Gamma',             'https://gamma.app',                '📊', 'Criação de Conteúdo', 7),

  -- Apps sem programar — vibe coding
  ('Lovable',           'https://lovable.dev',              '💜', 'Criar Apps com IA', 1),
  ('Cursor',            'https://cursor.com',               '⌨️', 'Criar Apps com IA', 2),

  -- Produtividade e reuniões
  ('Notion',            'https://www.notion.so',            '🗂️', 'Produtividade', 1),
  ('tl;dv',             'https://tldv.io',                  '📝', 'Produtividade', 2)
) AS v(titulo, url, icone, categoria, ordem)
WHERE NOT EXISTS (
  SELECT 1 FROM recursos_programa r WHERE r.titulo = v.titulo AND r.categoria = v.categoria
);
