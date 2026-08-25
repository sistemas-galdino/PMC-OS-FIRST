-- Rollback de 20260822_seed_recursos_ferramentas_2026.sql
DELETE FROM recursos_programa
WHERE categoria IN ('Ferramentas de IA', 'Automação e Agentes', 'Criação de Conteúdo', 'Criar Apps com IA', 'Produtividade')
  AND titulo IN ('Claude','ChatGPT','Google Gemini','Perplexity','NotebookLM','n8n','Make','Claude Code',
                 'Canva','CapCut','ElevenLabs','HeyGen','Higgsfield','Freepik','Gamma','Lovable','Cursor','Notion','tl;dv');
