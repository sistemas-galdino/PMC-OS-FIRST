-- Conhecimento → Multiplicadores (projetos completos p/ subir no Claude) e
-- Skills (arquivos p/ o cliente baixar). Cadastrados pelo dono (admin) e
-- exibidos aos clientes em /multiplicadores e /skills.

-- ============================ MULTIPLICADORES ============================
CREATE TABLE IF NOT EXISTS conhecimento_multiplicadores (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug text NOT NULL UNIQUE,
  nome text NOT NULL,
  descricao text,                        -- card da galeria
  detalhe text,                          -- texto longo (modal)
  inclui jsonb NOT NULL DEFAULT '[]',    -- ["Pipeline de vendas", ...]
  tipo text NOT NULL DEFAULT 'projeto',  -- projeto | skill | prompt | guia
  categoria text NOT NULL DEFAULT 'gestao-estrategia',
  tags jsonb NOT NULL DEFAULT '[]',      -- ["Maker", "Trilha"]
  tempo text,                            -- "Construção guiada por IA"
  plataforma text,                       -- "Claude Code"
  cor text NOT NULL DEFAULT 'lime',      -- lime|sky|violet|rose|amber|emerald
  icon text NOT NULL DEFAULT 'package',
  importar_url text,                     -- link do bundle; null = "em breve"
  destaque boolean NOT NULL DEFAULT false,
  publicado boolean NOT NULL DEFAULT true,
  ordem int NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS conhecimento_multiplicadores_ordem_idx ON conhecimento_multiplicadores(ordem, created_at);

ALTER TABLE conhecimento_multiplicadores ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS multiplicadores_select ON conhecimento_multiplicadores;
CREATE POLICY multiplicadores_select ON conhecimento_multiplicadores
  FOR SELECT TO authenticated
  USING (publicado = true OR is_admin());

DROP POLICY IF EXISTS multiplicadores_admin_write ON conhecimento_multiplicadores;
CREATE POLICY multiplicadores_admin_write ON conhecimento_multiplicadores
  FOR ALL TO authenticated
  USING (is_admin())
  WITH CHECK (is_admin());

-- ================================ SKILLS ================================
CREATE TABLE IF NOT EXISTS conhecimento_skills (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug text NOT NULL UNIQUE,
  nome text NOT NULL,
  descricao text,
  gatilho text,                          -- "quando usar"
  categoria text NOT NULL DEFAULT 'conteudo-marketing',
  tags jsonb NOT NULL DEFAULT '[]',
  formato text NOT NULL DEFAULT 'Skill Claude (.zip)',
  arquivo_url text,                      -- link do arquivo; null = "em breve"
  cor text NOT NULL DEFAULT 'lime',
  icon text NOT NULL DEFAULT 'sparkles',
  destaque boolean NOT NULL DEFAULT false,
  publicado boolean NOT NULL DEFAULT true,
  ordem int NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS conhecimento_skills_ordem_idx ON conhecimento_skills(ordem, created_at);

ALTER TABLE conhecimento_skills ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS skills_select ON conhecimento_skills;
CREATE POLICY skills_select ON conhecimento_skills
  FOR SELECT TO authenticated
  USING (publicado = true OR is_admin());

DROP POLICY IF EXISTS skills_admin_write ON conhecimento_skills;
CREATE POLICY skills_admin_write ON conhecimento_skills
  FOR ALL TO authenticated
  USING (is_admin())
  WITH CHECK (is_admin());

-- ============================ STORAGE (arquivos das skills) ============================
INSERT INTO storage.buckets (id, name, public)
VALUES ('skills-arquivos', 'skills-arquivos', true)
ON CONFLICT (id) DO UPDATE SET public = true;

DROP POLICY IF EXISTS skills_arquivos_admin_rw ON storage.objects;
CREATE POLICY skills_arquivos_admin_rw ON storage.objects
  FOR ALL TO authenticated
  USING (bucket_id = 'skills-arquivos' AND is_admin())
  WITH CHECK (bucket_id = 'skills-arquivos' AND is_admin());

-- ============================ SEED MULTIPLICADORES ============================
INSERT INTO conhecimento_multiplicadores (slug, nome, descricao, detalhe, inclui, tipo, categoria, tags, tempo, plataforma, cor, icon, destaque, ordem) VALUES
('torre-de-comando', 'Torre de Comando MC', 'O hub do dono: dashboard central com KPIs, sistemas e áreas da empresa numa tela só. Sobe no Claude, conecta seus dados e enxerga o negócio inteiro.', 'A Torre de Comando é o primeiro sistema da sua empresa de tecnologia. Um painel único onde todos os dashboards, indicadores e sistemas ficam organizados — com clareza das integrações entre eles. Você para de abrir dez abas e passa a comandar o negócio de um lugar só.', '["Estrutura de painel pronta","Blocos de KPI e gráficos","Organização por área","Guia de conexão dos dados"]', 'projeto', 'gestao-estrategia', '["Guiado por IA","Maker"]', 'Construção guiada por IA', 'Claude Code', 'lime', 'dashboard', true, 1),
('crm-multiplicador', 'CRM Multiplicador', 'CRM comercial AI-first: pipeline, inbox de WhatsApp e agente de IA que responde e qualifica lead 24/7. A máquina de vendas que trabalha enquanto você dorme.', 'Um CRM pensado para vender com IA no centro, não como enfeite. Pipeline visual, caixa de entrada de WhatsApp integrada e um agente que atende, qualifica e organiza o lead automaticamente. O comercial deixa de perder oportunidade por falta de resposta.', '["Pipeline de vendas","Inbox de WhatsApp","Agente de qualificação 24/7","Relatórios de conversão"]', 'projeto', 'vendas-crm', '["Builder","VIP"]', 'Construção guiada por IA', 'Claude Code', 'sky', 'target', true, 2),
('guardiao-da-ia', 'Guardião da IA', 'Sistema de governança e adoção de IA no time: convites, trilha de maturidade, ranking de uso e resultados. Coloca a empresa inteira usando IA de verdade.', 'Adotar IA não é assinar ferramenta — é fazer o time usar no dia a dia. O Guardião estrutura essa adoção: cada colaborador tem trilha, evidências e ranking, e você acompanha quem está multiplicando resultado com IA e quem precisa de empurrão.', '["Convites por colaborador","Trilha de maturidade em IA","Ranking e evidências","Painel de resultados"]', 'projeto', 'gestao-estrategia', '["Trilha","Maker"]', 'Construção guiada por IA', 'Claude Code', 'violet', 'shield', false, 3),
('maquina-de-conteudo', 'Máquina de Conteúdo MC', 'Esteira completa de conteúdo com IA: gera carrosséis, roteiros e legendas na sua voz e publica no Instagram e LinkedIn. Constância sem depender de agência.', 'Conteúdo trava porque depende de você todo dia. A Máquina de Conteúdo automatiza a esteira: ideias, carrosséis, roteiros e legendas na sua voz, prontos para publicar. Você aprova e a máquina posta. Presença constante sem virar refém do calendário.', '["Gerador de carrosséis","Roteiros e legendas","Fila de aprovação","Publicação nas redes"]', 'projeto', 'conteudo-marketing', '["Builder","Trilha"]', 'Construção guiada por IA', 'Claude Code', 'rose', 'megaphone', false, 4),
('prospector-mc', 'Prospector MC', 'Sua máquina de prospecção. Você descreve o cliente ideal, a IA encontra os leads, estuda cada um e entrega a abordagem pronta pra fechar.', 'Prospecção manual não escala. Você descreve o perfil de cliente ideal e o Prospector encontra os leads, pesquisa cada empresa, identifica o gancho e entrega a mensagem de abordagem personalizada. O time comercial acorda com a lista pronta.', '["Busca de leads por perfil","Enriquecimento automático","Gancho personalizado","Abordagem pronta pra enviar"]', 'projeto', 'vendas-crm', '["Maker"]', '~30 min', 'Claude Code', 'amber', 'userplus', false, 5),
('copiloto-financeiro', 'Copiloto Financeiro', 'Sobe seu DRE e a IA devolve dashboard, diagnóstico, plano de ação e rotina de gestão. O CFO de IA que traduz número em decisão.', 'A maioria dos donos não decide por número porque o número é confuso. O Copiloto Financeiro lê o seu DRE e devolve quatro entregáveis: dashboard visual, diagnóstico, plano de ação com metas e rotina de gestão financeira. Do caos da planilha à decisão clara.', '["Dashboard financeiro","Diagnóstico completo","Plano de ação com metas","Rotina de gestão"]', 'projeto', 'gestao-estrategia', '["Maker","VIP"]', '~20 min', 'Claude Code', 'emerald', 'banknote', false, 6),
('central-atendimento-ia', 'Central de Atendimento IA', 'Agente de atendimento no WhatsApp que responde, agenda e encaminha. Padroniza o atendimento e libera o time do operacional repetitivo.', 'Atendimento bom não pode depender do humor da equipe. A Central coloca um agente de IA no WhatsApp que responde as dúvidas frequentes, agenda, encaminha para o humano quando precisa e registra tudo. Padrão de atendimento 24/7, time livre para o que importa.', '["Agente de WhatsApp","Respostas padronizadas","Agendamento e triagem","Registro de conversas"]', 'projeto', 'atendimento', '["Builder"]', 'Construção guiada por IA', 'Claude Code + Integrações', 'sky', 'message', false, 7),
('organograma-hibrido', 'Organograma Híbrido', 'Mapeia cada colaborador e o co-piloto de IA que orbita a função dele. Enxerga onde a IA multiplica sua equipe — pessoa por pessoa.', 'O futuro do time é híbrido: cada pessoa com um co-piloto de IA na função. O Organograma Híbrido monta esse mapa — quem faz o quê e qual IA amplia cada cargo — para você planejar a empresa que faz o dobro com o mesmo time.', '["Mapa de colaboradores","Co-piloto por função","Skills sugeridas por cargo","Visão de níveis"]', 'projeto', 'gestao-estrategia', '["Trilha"]', 'Construção guiada por IA', 'Claude Code', 'violet', 'users', false, 8),
('auditor-de-processos', 'Auditor de Processos IA', 'A IA mapeia seus processos, encontra os gargalos que sugam tempo e propõe a automação de cada um. Onde está o vazamento de horas da empresa.', 'Você sente que o dia não rende, mas não sabe onde some o tempo. O Auditor mapeia os processos da empresa, aponta os gargalos que mais consomem horas e propõe a automação de cada um, priorizada por retorno. O raio-x operacional do negócio.', '["Mapa de processos","Diagnóstico de gargalos","Automação priorizada","Estimativa de horas economizadas"]', 'projeto', 'ferramentas', '["Maker"]', '~30 min', 'Claude Code', 'amber', 'compass', false, 9),
('editor-de-reels', 'Editor de Reels IA', 'Transforma vídeo cru em Reels profissional: corte seco, zoom, captions e gancho com IA. Presença em vídeo sem editor.', 'Gravar é fácil, editar é o gargalo. O Editor de Reels pega o vídeo cru e entrega o Reels pronto: corte seco, zoom no ponto certo, legendas karaokê e gancho de abertura escrito por IA. Vídeo constante sem depender de editor.', '["Corte automático","Legendas karaokê","Gancho com IA","Exportação pronta pra postar"]', 'projeto', 'conteudo-marketing', '["Builder"]', '~20 min', 'Claude Code', 'rose', 'video', false, 10),
('painel-de-metas', 'Painel de Metas MC', 'Define metas, acompanha indicadores e mostra o placar do mês pro time inteiro. Todo mundo puxando pro mesmo número.', 'Meta que ninguém vê não move ninguém. O Painel de Metas coloca o placar do mês na parede digital da empresa: objetivo, quanto já andou e o que falta. Ritmo, foco e o time inteiro remando na mesma direção.', '["Cadastro de metas","Acompanhamento de indicadores","Placar do mês","Visão por área"]', 'projeto', 'gestao-estrategia', '["Maker"]', 'Construção guiada por IA', 'Claude Code', 'emerald', 'flag', false, 11),
('maquina-de-ofertas', 'Máquina de Ofertas', 'Constrói ofertas irresistíveis no método de valor: bônus, garantias e ancoragem. Transforma o seu produto na escolha óbvia.', 'Preço não vende, oferta vende. A Máquina de Ofertas monta a sua proposta no método de valor: promessa, stack de bônus, garantia e ancoragem de preço. O mesmo produto, apresentado de um jeito que faz o não custar caro pro cliente.', '["Estrutura de oferta","Stack de bônus","Garantias e ancoragem","Copy da página de vendas"]', 'projeto', 'vendas-crm', '["Maker"]', '~15 min', 'Claude Code', 'sky', 'sparkles', false, 12)
ON CONFLICT (slug) DO NOTHING;

-- ================================ SEED SKILLS ================================
INSERT INTO conhecimento_skills (slug, nome, descricao, gatilho, categoria, tags, formato, cor, icon, destaque, ordem) VALUES
('analista-financeiro', 'Analista Financeiro Empresarial', 'Sobe um DRE ou planilha e recebe 4 entregáveis: dashboard interativo, relatório de diagnóstico, plano de ação e rotina de gestão financeira.', 'Quando você tem um arquivo financeiro (DRE, Excel, CSV) e quer diagnóstico, dashboard e plano de ação prontos.', 'financeiro', '["Financeiro","Gestão"]', 'Skill Claude (.zip)', 'emerald', 'banknote', true, 1),
('mente-mestra', 'MenteMestra', 'Um painel de 4 mentes geniais debate o seu problema empresarial e entrega a decisão, com a condução direta do Galdino.', 'Quando você trava numa decisão difícil e quer múltiplas perspectivas antes de escolher.', 'gestao-estrategia', '["Estratégia","Decisão"]', 'Skill Claude (.zip)', 'violet', 'bot', true, 2),
('dashboard-mc', 'Dashboard MC', 'Gera dashboards HTML profissionais no design system do PMC: KPIs, gráficos e métricas prontas pra apresentar pro time ou pro cliente.', 'Quando você quer transformar números soltos num painel visual na marca PMC.', 'gestao-estrategia', '["Dados","Visual"]', 'Skill Claude (.zip)', 'lime', 'dashboard', false, 3),
('carrossel-mc', 'Carrossel MC', 'Monta o carrossel diagramado no design system do PMC, formato 4:5, pronto pra exportar e postar no Instagram.', 'Quando você já tem o tema e quer o carrossel visual pronto, não só o texto.', 'conteudo-marketing', '["Instagram","Design"]', 'Skill Claude (.zip)', 'rose', 'megaphone', false, 4),
('carrossel-viral', 'Carrossel Viral', 'Carrosséis com engenharia de compartilhamento: feitos pra serem salvos, marcados e enviados pra outras pessoas.', 'Quando o objetivo é alcance — post que as pessoas compartilham e marcam alguém.', 'conteudo-marketing', '["Viral","Alcance"]', 'Skill Claude (.zip)', 'rose', 'trending', false, 5),
('reels-viral', 'Reels Viral', 'Roteiros de Reels de alto desempenho, com gancho, corpo, virada e CTA — feitos pra prender até o fim.', 'Quando você vai gravar um Reels e quer o roteiro que segura a atenção.', 'video', '["Reels","Roteiro"]', 'Skill Claude (.zip)', 'sky', 'video', false, 6),
('video-viral-galdino', 'Vídeo Viral (voz Galdino)', 'Roteiros de vídeo curto na voz do Galdino, com as metodologias mais avançadas de retenção, rewatch e viralização.', 'Quando você quer um vídeo com máximo de retenção e potencial de viralizar.', 'video', '["Vídeo","Retenção"]', 'Skill Claude (.zip)', 'sky', 'zap', false, 7),
('planejador-redes', 'Planejador de Redes Sociais', 'Calendário editorial completo do mês: tipo de post (Reel, Carrossel, Feed, Stories), copy e gancho de cada dia.', 'Quando você quer o mês de conteúdo planejado de uma vez, sem improviso diário.', 'conteudo-marketing', '["Calendário","Planejamento"]', 'Skill Claude (.zip)', 'amber', 'flag', false, 8),
('o-diretor', 'O Diretor — Vídeo com IA', 'Escreve prompts cinematográficos e gera vídeos com IA a partir das suas imagens: movimentos de câmera, cenas e transições.', 'Quando você quer animar uma foto ou criar uma cena em vídeo com qualidade de cinema.', 'video', '["IA","Cinema"]', 'Skill Claude (.zip)', 'violet', 'video', false, 9),
('capa-bestseller', 'Capa Bestseller', 'Cria capas de livro no padrão dos mais vendidos e gera o arquivo de imagem pronto pra publicar (Amazon KDP e afins).', 'Quando você vai lançar um ebook ou livro e precisa de uma capa que vende.', 'design', '["Livro","Capa"]', 'Skill Claude (.zip)', 'amber', 'book', false, 10),
('prospector-leads', 'Prospector de Leads', 'Você descreve o cliente ideal e a skill encontra, qualifica e entrega a abordagem personalizada pronta pra enviar.', 'Quando o comercial precisa de uma lista de leads quentes com abordagem pronta.', 'vendas', '["Prospecção","Leads"]', 'Skill Claude (.zip)', 'sky', 'userplus', false, 11),
('roteirista-vsl', 'Roteirista de VSL', 'Estrutura a sua Video Sales Letter do gancho ao fechamento, no método de copy que converte lead em cliente.', 'Quando você vai gravar uma VSL ou vídeo de vendas e precisa do roteiro que vende.', 'vendas', '["Copy","VSL"]', 'Skill Claude (.zip)', 'emerald', 'target', false, 12),
('gerador-de-ofertas', 'Gerador de Ofertas', 'Constrói a oferta irresistível: promessa, stack de valor, bônus, garantias e ancoragem de preço.', 'Quando você precisa transformar o seu produto na escolha óbvia do cliente.', 'vendas', '["Oferta","Valor"]', 'Skill Claude (.zip)', 'amber', 'sparkles', false, 13),
('copy-de-anuncios', 'Copy de Anúncios', 'Escreve variações de anúncios (Meta e Google) com ângulos diferentes pra você testar e achar o que converte.', 'Quando você vai subir campanha e quer vários criativos de texto pra testar.', 'conteudo-marketing', '["Anúncios","Copy"]', 'Skill Claude (.zip)', 'rose', 'megaphone', false, 14)
ON CONFLICT (slug) DO NOTHING;
