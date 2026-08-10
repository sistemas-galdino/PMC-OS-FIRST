-- Semeia o ambiente DEV com dados sintéticos para validar o CRM (CS Manager).
--
-- NÃO RODAR EM PRODUÇÃO. Só faz sentido no DEV (jkwpxttxkksqiffodonb), onde os
-- 41 clientes existentes estão com praticamente todos os campos nulos — sem
-- data de entrada, CS, temperatura ou atividade não dá para validar ciclos,
-- alertas ou indicadores de carteira.
--
-- Os dados são GERADOS, não copiados do PROD: nenhum nome, telefone ou empresa
-- real de cliente atravessa para o ambiente de teste. O que se replica é a
-- DISTRIBUIÇÃO (quantos por trimestre, quantos frios, quantos sem guardião),
-- que é o que exercita os cálculos.
--
-- Para desfazer: scripts/seed-crm-dev-limpar.sql

BEGIN;

-- ───────── 1. Time de CS (não existe no DEV) ─────────
-- Emails @dev.local deixam explícito que são contas falsas e garantem que
-- nunca casem com um usuário real do Supabase Auth.
-- Só papel 'cs': o trigger tg_mentores_guard bloqueia criar membro com papel
-- privilegiado fora de uma sessão de super admin. Para testar a visão da
-- coordenação, use a conta dono@rafaelgaldino.com.br, que já é super_admin
-- no DEV e enxerga todas as carteiras.
INSERT INTO mentores (nome, email, papel)
SELECT * FROM (VALUES
  ('Danielly',   'danielly@dev.local',   'cs'),
  ('Geovana',    'geovana@dev.local',    'cs'),
  ('Gabriela',   'gabriela@dev.local',   'cs'),
  ('Francielly', 'francielly@dev.local', 'cs')
) AS v(nome, email, papel)
WHERE NOT EXISTS (SELECT 1 FROM mentores m WHERE m.email = v.email);

-- ───────── 2. Clientes ─────────
-- Distribuição desenhada para cobrir todos os caminhos do código:
--   · os 4 trimestres + pós-programa + pré-jornada
--   · 3 clientes DE PROPÓSITO sem data de entrada, para exercitar o
--     "Sem data de entrada" (é o caso de 103 clientes ativos no PROD)
--   · clientes na janela de 30 dias antes do fechamento de ciclo, que é o
--     gatilho da criação automática da atividade de fechamento
WITH numerados AS (
  SELECT id_entrada, row_number() OVER (ORDER BY id_entrada) AS n
  FROM clientes_entrada_new
)
UPDATE clientes_entrada_new c SET
  nome_empresa = 'Empresa Teste ' || lpad(n::text, 2, '0'),
  nome_empresa_formatado = 'Empresa Teste ' || lpad(n::text, 2, '0'),
  nome_cliente = 'Contato ' || lpad(n::text, 2, '0'),
  sc = (ARRAY['Danielly','Geovana','Gabriela','Francielly'])[1 + (n % 4)],
  status_atual = CASE
    WHEN n % 13 = 0 THEN 'Cliente Cancelado'
    WHEN n % 11 = 0 THEN 'Pendente de Onboarding'
    WHEN n % 17 = 0 THEN 'Congelado'
    ELSE 'Ativo no Programa' END,
  -- n % 14 = 0 fica sem data: é o cenário "Sem data de entrada".
  data = CASE WHEN n % 14 = 0 THEN NULL ELSE
    (current_date - (
      CASE n % 7
        WHEN 0 THEN 15    -- cliente novo
        WHEN 1 THEN 85    -- 5 dias do fechamento do T1
        WHEN 2 THEN 120   -- meio do T2
        WHEN 3 THEN 175   -- 5 dias do fechamento do T2
        WHEN 4 THEN 250   -- T3
        WHEN 5 THEN 355   -- 5 dias do fim do programa
        ELSE 400          -- pós-programa
      END))::date END,
  temperatura_cliente = CASE n % 5
    WHEN 0 THEN NULL WHEN 1 THEN 'frio' WHEN 2 THEN 'morno' ELSE 'quente' END,
  nivel_engajamento = CASE n % 6
    WHEN 0 THEN 'desengajado' WHEN 1 THEN 'ativo_medio' WHEN 2 THEN 'cliente_novo'
    WHEN 3 THEN 'congelado' ELSE 'ativo_alto' END,
  saude_cliente = CASE n % 8
    WHEN 0 THEN 'critico' WHEN 1 THEN 'atencao' WHEN 2 THEN NULL ELSE 'saudavel' END,
  em_risco_cancelamento = (n % 9 = 0),
  tem_guardiao_ia = CASE n % 4
    WHEN 0 THEN 'nao' WHEN 1 THEN 'em_definicao' ELSE 'sim' END,
  guardiao_ia_nome = CASE WHEN n % 4 >= 2 THEN 'Guardião ' || lpad(n::text, 2, '0') END,
  reuniao_galdino_status = CASE n % 5
    WHEN 0 THEN 'nao_agendada' WHEN 1 THEN 'agendada' ELSE 'ja_fez' END,
  reuniao_consultores_status = CASE n % 3
    WHEN 0 THEN 'nao_agendada' WHEN 1 THEN 'agendada' ELSE 'ja_fez' END,
  presenca_treinamentos = (ARRAY['alta','media','baixa','nenhuma'])[1 + (n % 4)],
  frequencia_grupo_whatsapp = (ARRAY['alta','media','baixa','nenhuma','sem_informacao'])[1 + (n % 5)],
  tem_conta_blackcrm = CASE WHEN n % 3 = 0 THEN 'nao' ELSE 'sim' END,
  -- Estes valores vêm dos CHECK constraints da tabela, não do enum da UI:
  -- o banco grava snake_case e a tradução para "Em implementação" etc.
  -- acontece em web/src/lib/crm/mappers.ts.
  blackcrm_status_implementacao = (ARRAY['nao_iniciado','em_andamento','implementado','travado','nao_se_aplica'])[1 + (n % 5)],
  blackcrm_status_conta = (ARRAY['ativa','implementada','em_implementacao','pausada','nao_se_aplica'])[1 + (n % 5)],
  blackcrm_participa_tutoria = (ARRAY['participa','nao_participa','participa_parcialmente','pendente'])[1 + (n % 4)],
  blackcrm_tem_vitorias = (ARRAY['sim','nao','pendente'])[1 + (n % 3)],
  comunicacao_preferencia = (ARRAY['nao_definido','privado','grupo_individual','grupo_geral','misto'])[1 + (n % 5)],
  comunicacao_canal = (ARRAY['whatsapp','ligacao','audio_whatsapp','mensagem_texto','outro'])[1 + (n % 5)],
  renovacao_data = CASE WHEN n % 6 = 0 THEN (current_date + ((n % 45))::int) END,
  renovacao_status = CASE WHEN n % 6 = 0 THEN (ARRAY['ainda_distante','em_negociacao','confirmada','recusada','em_risco'])[1 + (n % 5)] END,
  observacoes_cs = CASE WHEN n % 5 = 0 THEN
    'Percepção da CS: cliente engajado, mas depende do sócio para decidir.' END,
  nicho = (ARRAY['Alimentação','Estética','Automotivo','Varejo','Serviços'])[1 + (n % 5)]
FROM numerados nu
WHERE nu.id_entrada = c.id_entrada;

-- ───────── 3. Atividades ─────────
-- 6 por cliente ativo, espalhadas entre passado e futuro, cobrindo todos os
-- status (inclusive impedidas COM motivo, que é obrigatório pelo CHECK).
INSERT INTO cliente_atividades (
  id_cliente, titulo, descricao, tipo, entrega_relacionada, acao,
  prioridade, prazo, hora, status, responsavel_cs, motivo_impedimento, origem
)
SELECT
  c.id_cliente,
  (ARRAY['Cobrar material','Agendar reunião','Fazer follow-up no WhatsApp',
         'Checar Guardião','Enviar case de cliente parecido','Revisar plano de ação'])[1 + (g % 6)],
  'Atividade gerada para teste do CRM no DEV.',
  (ARRAY['Contato','Follow-up','Reunião','Outro'])[1 + (g % 4)],
  (ARRAY['Reunião com Galdino','Reunião com Consultor','Guardião de IA','Black CRM'])[1 + (g % 4)],
  (ARRAY['Cobrar material','Agendar reunião','Fazer follow-up no WhatsApp','Checar Guardião'])[1 + (g % 4)],
  (ARRAY['baixa','media','alta'])[1 + (g % 3)],
  (current_date + (CASE g % 6 WHEN 0 THEN -9 WHEN 1 THEN -3 WHEN 2 THEN 0
                              WHEN 3 THEN 1 WHEN 4 THEN 4 ELSE 11 END))::date,
  (ARRAY['09:00','10:30','14:00','16:00'])[1 + (g % 4)]::time,
  (ARRAY['pendente','em_andamento','realizado','impedido','atrasado','aguardando_cliente'])[1 + (g % 6)],
  c.sc,
  CASE WHEN (ARRAY['pendente','em_andamento','realizado','impedido','atrasado','aguardando_cliente'])[1 + (g % 6)] = 'impedido'
       THEN 'Aguardando retorno do consultor sobre o relatorio.' END,
  'manual_individual'
FROM clientes_entrada_new c
CROSS JOIN generate_series(0, 5) AS g
WHERE c.status_atual = 'Ativo no Programa' AND c.sc IS NOT NULL;

-- Concluídas precisam de data_conclusao: o trigger só preenche no UPDATE.
UPDATE cliente_atividades
   SET data_conclusao = (prazo + time '17:00')::timestamptz
 WHERE status = 'realizado' AND data_conclusao IS NULL;

-- ───────── 4. Tarefas gerais (sem cliente) ─────────
INSERT INTO cliente_atividades (id_cliente, titulo, descricao, tipo, prioridade, prazo, status, responsavel_cs, origem)
VALUES
  (NULL, 'Tocar o projeto de NPS', 'Projeto do setor, sem cliente vinculado.', 'Outro', 'media', current_date + 3, 'em_andamento', 'Francielly', 'manual_individual'),
  (NULL, 'Revisar o manual de CS', 'Atualizar os POPs da rotina de quarta.', 'Outro', 'baixa', current_date + 7, 'pendente', 'Gabriela', 'manual_individual');

-- ───────── 5. Gargalos e projetos ─────────
INSERT INTO crm_gargalos (area, quem_trouxe, registrado_por, quem_vai_executar, status, prioridade, problema, solucao, afeta_entrega_cliente)
VALUES
  ('Sucesso do Cliente', 'Time de CS', 'Maiara', 'Time de CRM', 'Em andamento', 'Alta',
   'Histórico do cliente espalhado entre WhatsApp pessoal e planilhas.',
   'Centralizar as conversas no CRM.', true),
  ('Mentores / Reuniões', 'Time de CS', 'Francielly', 'Time de Operações', 'Não iniciado', 'Média',
   'Cliente chega na reunião com consultor sem ter enviado material.',
   'Checklist de preparação obrigatório antes da reunião.', true);

INSERT INTO crm_projetos (titulo, descricao, estagio, time_executor, responsavel, prazo)
VALUES
  ('WhatsApp dentro do CRM', 'Integrar as conversas ao histórico do cliente.', 'Em andamento', 'Time de CRM', 'David', current_date + 30),
  ('Pesquisa de NPS', 'Rodar o NPS trimestral da carteira.', 'Backlog', 'Time de CS', 'Francielly', current_date + 45);

-- ───────── 6. Manual ─────────
INSERT INTO crm_manual (nome, link, descricao, responsavel, ordem)
SELECT 'Manual de CS', 'https://exemplo.dev/manual', 'POPs da rotina do time de Customer Success.', 'Maiara', 1
WHERE NOT EXISTS (SELECT 1 FROM crm_manual);

COMMIT;
