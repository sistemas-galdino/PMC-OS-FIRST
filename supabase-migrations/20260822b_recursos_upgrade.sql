-- Links Importantes v2 — a página deixa de ser lista e vira guia:
--   1) descrição + preço + etapas do Método recomendadas em cada recurso
--   2) favoritos por cliente ("Meus atalhos")
--   3) contador de cliques (via RPC, pra medir o que a base realmente usa)
--   4) seed das descrições das 19 ferramentas do catálogo 2026

-- 1) Colunas novas
ALTER TABLE recursos_programa ADD COLUMN IF NOT EXISTS descricao text;
ALTER TABLE recursos_programa ADD COLUMN IF NOT EXISTS preco text; -- 'gratis' | 'freemium' | 'pago'
ALTER TABLE recursos_programa ADD COLUMN IF NOT EXISTS etapas int[] NOT NULL DEFAULT '{}'; -- etapas do Método (1..7)

-- 2) Favoritos por cliente
CREATE TABLE IF NOT EXISTS recursos_favoritos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  id_recurso uuid NOT NULL REFERENCES recursos_programa(id) ON DELETE CASCADE,
  id_cliente uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (id_recurso, id_cliente)
);
CREATE INDEX IF NOT EXISTS recursos_favoritos_cliente_idx ON recursos_favoritos(id_cliente);

ALTER TABLE recursos_favoritos ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS recursos_favoritos_select ON recursos_favoritos;
CREATE POLICY recursos_favoritos_select ON recursos_favoritos
  FOR SELECT TO authenticated
  USING (id_cliente = auth.uid() OR is_admin());

DROP POLICY IF EXISTS recursos_favoritos_insert ON recursos_favoritos;
CREATE POLICY recursos_favoritos_insert ON recursos_favoritos
  FOR INSERT TO authenticated
  WITH CHECK (id_cliente = auth.uid());

DROP POLICY IF EXISTS recursos_favoritos_delete ON recursos_favoritos;
CREATE POLICY recursos_favoritos_delete ON recursos_favoritos
  FOR DELETE TO authenticated
  USING (id_cliente = auth.uid());

-- 3) Cliques (quem clicou em quê, quando) — leitura só do admin; escrita via RPC.
CREATE TABLE IF NOT EXISTS recursos_cliques (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  id_recurso uuid NOT NULL REFERENCES recursos_programa(id) ON DELETE CASCADE,
  id_cliente uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS recursos_cliques_recurso_idx ON recursos_cliques(id_recurso);

ALTER TABLE recursos_cliques ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS recursos_cliques_select ON recursos_cliques;
CREATE POLICY recursos_cliques_select ON recursos_cliques
  FOR SELECT TO authenticated
  USING (is_admin());

CREATE OR REPLACE FUNCTION public.recurso_registrar_clique(p_recurso uuid)
RETURNS void
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  INSERT INTO recursos_cliques (id_recurso, id_cliente)
  SELECT p_recurso, auth.uid()
   WHERE EXISTS (SELECT 1 FROM recursos_programa r WHERE r.id = p_recurso);
$$;
REVOKE ALL ON FUNCTION public.recurso_registrar_clique(uuid) FROM public, anon;
GRANT EXECUTE ON FUNCTION public.recurso_registrar_clique(uuid) TO authenticated;

-- 4) Seed: descrição, preço e etapas do Método das ferramentas do catálogo 2026.
--    Etapas: 1 Guardião · 2 Inteligência · 3 Gargalos · 4 Engenharia · 5 Co-Pilotos · 6 Sistemas · 7 Arsenal
UPDATE recursos_programa r SET descricao = v.descricao, preco = v.preco, etapas = v.etapas
FROM (VALUES
  ('Claude',        'IA da Anthropic: estratégia, análise profunda e textos longos.',        'freemium', '{2,5}'::int[]),
  ('ChatGPT',       'O generalista da OpenAI para o dia a dia da operação.',                 'freemium', '{2,5}'::int[]),
  ('Google Gemini', 'IA do Google integrada ao Gmail, Docs e Planilhas.',                    'freemium', '{2,5}'::int[]),
  ('Perplexity',    'Pesquisa com IA que responde citando as fontes.',                       'freemium', '{2}'::int[]),
  ('NotebookLM',    'Transforma seus documentos numa base de conhecimento com IA.',          'gratis',   '{2,3}'::int[]),
  ('n8n',           'Automação de fluxos que conecta seus sistemas — a stack do PMC.',       'freemium', '{4,6}'::int[]),
  ('Make',          'Automação visual arrasta-e-solta, sem código.',                         'freemium', '{4,6}'::int[]),
  ('Claude Code',   'Agente de IA no terminal que constrói e automatiza por você.',          'pago',     '{4,6}'::int[]),
  ('Canva',         'Design rápido para posts, documentos e apresentações.',                 'freemium', '{5}'::int[]),
  ('CapCut',        'Edição de vídeo para Reels e cortes, no celular ou desktop.',           'freemium', '{5}'::int[]),
  ('ElevenLabs',    'Vozes de IA em português para vídeos, áudios e atendimento.',           'freemium', '{5}'::int[]),
  ('HeyGen',        'Avatares de vídeo com IA para escalar conteúdo sem gravar.',            'pago',     '{5}'::int[]),
  ('Higgsfield',    'Vídeos cinematográficos gerados por IA.',                               'pago',     '{5}'::int[]),
  ('Freepik',       'Banco de imagens + geração de imagem com IA.',                          'freemium', '{5}'::int[]),
  ('Gamma',         'Apresentações prontas a partir de um prompt.',                          'freemium', '{2,5}'::int[]),
  ('Lovable',       'Crie apps e sistemas descrevendo em texto — sem programador.',          'freemium', '{6}'::int[]),
  ('Cursor',        'Editor de código com IA para quem já programa.',                        'freemium', '{6}'::int[]),
  ('Notion',        'Central de documentos, processos e wikis da empresa.',                  'freemium', '{1,3}'::int[]),
  ('tl;dv',         'Grava e transcreve reuniões com resumo por IA.',                        'freemium', '{3,5}'::int[])
) AS v(titulo, descricao, preco, etapas)
WHERE r.titulo = v.titulo AND r.descricao IS NULL;
