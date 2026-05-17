-- Central de Atendimentos — seed inicial (Fase 1)
-- 10 consultores + disponibilidade default seg-sex 09:00-12:00 + 14:00-18:00.
-- Protegido por WHERE NOT EXISTS para idempotência.

INSERT INTO public.consultores_atendimento
  (nome, slug, email, email_calendar, tabela_destino, tipo_reuniao, especialidade, descricao, accent, duracao_padrao_minutos, ordem)
SELECT * FROM (VALUES
  ('Galdino', 'galdino', 'dono@rafaelgaldino.com.br', 'dono@rafaelgaldino.com.br',
   'reunioes_galdino', NULL,
   'Mentoria 1:1',
   'Mentoria estratégica direto com o Rafael Galdino.',
   'primary', 60, 0),

  ('Rodrigo Nogueira', 'rodrigo', 'rodrigo@rafaelgaldino.com.br', 'mentor@rafaelgaldino.com.br',
   'reunioes_mentoria_new', NULL,
   'Campanha, Oferta & Marketing',
   'Construção de ofertas irresistíveis e campanhas de tráfego.',
   'primary', 60, 1),

  ('David Abner', 'david', 'david@rafaelgaldino.com.br', 'mentor@rafaelgaldino.com.br',
   'reunioes_mentoria_new', NULL,
   'Sistemas com IA',
   'Implementação de sistemas internos e automações com IA.',
   'primary', 60, 2),

  ('Issao Yokoi', 'issao', 'issao@rafaelgaldino.com.br', 'mentor@rafaelgaldino.com.br',
   'reunioes_mentoria_new', NULL,
   'Agentes de IA',
   'Construção de agentes autônomos e fluxos com LLMs.',
   'primary', 60, 3),

  ('Diego Silva', 'diego', 'diego@rafaelgaldino.com.br', 'mentor@rafaelgaldino.com.br',
   'reunioes_mentoria_new', NULL,
   'Tráfego Pago',
   'Estratégia e otimização de campanhas pagas.',
   'primary', 60, 4),

  ('Ayslan Leite', 'ayslan', 'ayslan@rafaelgaldino.com.br', 'mentor@rafaelgaldino.com.br',
   'reunioes_mentoria_new', NULL,
   'Comercial',
   'Estrutura de vendas, scripts e processos comerciais.',
   'primary', 60, 5),

  ('Matheus Moura', 'matheus', 'matheus@rafaelgaldino.com.br', 'mentor@rafaelgaldino.com.br',
   'reunioes_mentoria_new', NULL,
   'Google Meu Negócio',
   'Otimização de presença local e GMN.',
   'primary', 60, 6),

  ('Maxwell Lopes', 'maxwell', 'maxwell@rafaelgaldino.com.br', 'mentor@rafaelgaldino.com.br',
   'reunioes_mentoria_new', NULL,
   'Posicionamento',
   'Posicionamento de marca e diferenciação.',
   'primary', 60, 7),

  ('Thiago', 'thiago', 'thiago@rafaelgaldino.com.br', 'especialistablackcrm@rafaelgaldino.com.br',
   'reunioes_blackcrm', 'tutoria',
   'Tutoria Black CRM',
   'Implementação e tutoria do Black CRM.',
   'primary', 60, 8),

  ('Léo', 'leo', 'leo@rafaelgaldino.com.br', 'especialistablackcrm@rafaelgaldino.com.br',
   'reunioes_blackcrm', 'tutoria',
   'Tutoria Black CRM',
   'Implementação e tutoria do Black CRM.',
   'primary', 60, 9)
) AS seed(nome, slug, email, email_calendar, tabela_destino, tipo_reuniao, especialidade, descricao, accent, duracao_padrao_minutos, ordem)
WHERE NOT EXISTS (SELECT 1 FROM public.consultores_atendimento);

INSERT INTO public.consultores_disponibilidade (consultor_id, dia_semana, hora_inicio, hora_fim)
SELECT c.id, d.dia_semana, j.hora_inicio::time, j.hora_fim::time
FROM public.consultores_atendimento c
CROSS JOIN (VALUES (1), (2), (3), (4), (5)) AS d(dia_semana)
CROSS JOIN (VALUES ('09:00', '12:00'), ('14:00', '18:00')) AS j(hora_inicio, hora_fim)
WHERE NOT EXISTS (SELECT 1 FROM public.consultores_disponibilidade);
