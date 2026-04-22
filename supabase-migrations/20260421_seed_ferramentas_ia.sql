-- Seed inicial da aba /ferramentas. Baseado nas imagens de referência do usuário
-- (~15 ferramentas de IA agrupadas em 6 categorias).

INSERT INTO public.ferramentas_ia (nome, subtitulo, categoria, preco, descricao, features, url, ordem) VALUES
-- Plataformas de LLM
('ChatGPT', 'OpenAI', 'Plataformas de LLM', '$20+/mês',
  'O mais completo e versátil dos modelos de linguagem.',
  ARRAY['Melhor custo-benefício','Excelente para variedade de tarefas','Grande comunidade'],
  'https://chat.openai.com', 10),
('Claude', 'Anthropic', 'Plataformas de LLM', '$20+/mês',
  'Qualidade superior de texto e contextos longos.',
  ARRAY['Qualidade superior de texto','Processa documentos longos','Ótimo para análises'],
  'https://claude.ai', 20),
('Gemini', 'Google', 'Plataformas de LLM', 'Gratuito / $20+/mês',
  'Grande capacidade de contexto e reconhecimento de imagem.',
  ARRAY['Reconhecimento de imagem','Integração com Google','Multimodal'],
  'https://gemini.google.com', 30),

-- Comparação e Avaliação
('Llama', 'Meta', 'Comparação e Avaliação', 'Gratuito',
  'Modelo open-source para personalização e uso local.',
  ARRAY['Totalmente personalizável','Uso offline','Privacidade de dados'],
  'https://llama.meta.com', 10),
('Grok', 'xAI', 'Comparação e Avaliação', 'Incluso no X Premium',
  'Modelo da xAI, bom para informações atualizadas.',
  ARRAY['Informações atualizadas','Integração com X','Menos filtrado'],
  'https://grok.com', 20),
('ChatHub', NULL, 'Comparação e Avaliação', 'Freemium',
  'Compare respostas de diferentes LLMs simultaneamente.',
  ARRAY['Múltiplos LLMs lado a lado','Economiza tempo','Salva prompts'],
  'https://chathub.gg', 30),
('Chatbot Arena', NULL, 'Comparação e Avaliação', 'Gratuito',
  'Compare desempenho de modelos em diversas tarefas.',
  ARRAY['Rankings atualizados','Avaliações por categoria','Benchmarks públicos'],
  'https://lmarena.ai', 40),

-- Voz e Vídeo com IA
('ElevenLabs', NULL, 'Voz e Vídeo com IA', 'Gratuito / $5+/mês',
  'Geração de voz ultrarrealista e clonagem de voz.',
  ARRAY['Text-to-Speech de alta qualidade','Clonagem de voz','Múltiplos idiomas'],
  'https://elevenlabs.io', 10),
('HeyGen', NULL, 'Voz e Vídeo com IA', '$24+/mês',
  'Crie vídeos com avatares de IA que falam.',
  ARRAY['Avatares realistas','Tradução de vídeos','Personalização completa'],
  'https://heygen.com', 20),

-- Desenvolvimento com IA
('Lovable', NULL, 'Desenvolvimento com IA', 'Gratuito / $20+/mês',
  'Crie aplicações web completas conversando com IA.',
  ARRAY['Full-stack com IA','Deploy automático','Banco de dados integrado'],
  'https://lovable.dev', 10),
('Cursor', NULL, 'Desenvolvimento com IA', 'Gratuito / $20+/mês',
  'IDE com IA integrada para programadores.',
  ARRAY['Autocompletar inteligente','Chat com código','Refatoração com IA'],
  'https://cursor.com', 20),

-- Design e Imagens
('Freepik', NULL, 'Design e Imagens', 'Gratuito / €12+/mês',
  'Geração e edição de imagens com IA.',
  ARRAY['Gerador de imagens','Biblioteca de recursos','Ferramentas de edição'],
  'https://freepik.com/ai', 10),

-- Automação e Produtividade
('Manus', NULL, 'Automação e Produtividade', 'Por créditos',
  'IA que executa tarefas práticas além de texto.',
  ARRAY['Execução de tarefas completas','Automação avançada'],
  'https://manus.im', 10),
('Abacus.ai', NULL, 'Automação e Produtividade', '$10/mês',
  'Acesso a múltiplos LLMs por preço acessível.',
  ARRAY['GPT-4, Claude, Gemini','Geradores de imagem','Ferramentas de vídeo'],
  'https://abacus.ai', 20),
('GenSpark', NULL, 'Automação e Produtividade', 'Gratuito / Plano',
  'Super agentes autônomos para operações.',
  ARRAY['Autonomia avançada','Orquestração de agentes'],
  'https://genspark.ai', 30);
