-- Seed dos 7 sistemas já cadastrados no roadmap antigo (prints roadap-sistemas-tela/).
-- INSERT único protegido contra duplicação.

INSERT INTO roadmap_itens
  (nome, valor, complexidade, fase, prazo, responsavel, observacoes,
   marco_kickoff, marco_mvp, ordem)
SELECT * FROM (VALUES
  ('Automação de Processos (RPA)', 'medio', 'baixa', 'testes',
   '3-4 semanas', 'Issao', 'Processos já mapeados pelo time de operações',
   false, false, 0),
  ('Simulador IA', 'alto', 'media', 'testes',
   NULL, 'Issao', NULL,
   true, true, 1),
  ('Chatbot Atendimento', 'alto', 'media', 'planejamento',
   '4-6 semanas', 'Issao', 'Integração com WhatsApp',
   false, false, 0),
  ('Motor de Recomendação IA', 'alto', 'alta', 'desenvolvimento',
   '8-10 semanas', 'Issao', 'Dependência da base de dados',
   false, false, 0),
  ('Dashboard Preditivo de Vendas', 'alto', 'alta', 'ideacao',
   'Q3 2026', 'Léo', 'Requer modelo de ML treinado',
   false, false, 0),
  ('Análise de Sentimento - NPS', 'medio', 'media', 'ideacao',
   'Em análise', 'David', 'Aguardando aprovação',
   false, false, 1),
  ('Gerador de Ofertas', 'medio', 'baixa', 'ideacao',
   NULL, 'Rodrigo', NULL,
   false, false, 2)
) AS seed(nome, valor, complexidade, fase, prazo, responsavel, observacoes,
          marco_kickoff, marco_mvp, ordem)
WHERE NOT EXISTS (SELECT 1 FROM roadmap_itens);
