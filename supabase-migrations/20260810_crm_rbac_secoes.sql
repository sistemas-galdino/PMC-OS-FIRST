-- CRM — seções RBAC das abas novas.
-- As chaves batem com a url sem a barra inicial (secaoDaUrl em app-sidebar.tsx
-- faz url.replace(/^\//,"")), então "/crm/meu-dia" -> "crm/meu-dia".

-- 1) Abre espaço na numeração: ordem é só ordenação de exibição na tela de
-- permissões, e os valores atuais (10,20,21,…) não deixam encaixar 10 abas
-- entre "crm" (22) e "funis" (23).
UPDATE public.secoes_catalogo SET ordem = ordem * 10;

-- 2) As abas do CRM, logo depois da seção "crm" (agora ordem 220).
INSERT INTO public.secoes_catalogo (chave, label, grupo, ordem, sensivel) VALUES
  ('crm/meu-dia',        'CRM · Meu Dia',                 'CRM', 221, true),
  ('crm/atividades',     'CRM · Atividades & Rotinas',    'CRM', 222, true),
  ('crm/clientes',       'CRM · Clientes',                'CRM', 223, true),
  ('crm/alertas',        'CRM · Alertas',                 'CRM', 224, true),
  ('crm/atendimento',    'CRM · Atendimento (WhatsApp)',  'CRM', 225, true),
  ('crm/projetos',       'CRM · Projetos & Gargalos',     'CRM', 226, true),
  ('crm/manual',         'CRM · Manual de CS',            'CRM', 227, false),
  ('crm/visao-geral',    'CRM · Visão Geral',             'CRM', 228, true),
  ('crm/time',           'CRM · Torre de Comando',        'CRM', 229, true),
  ('crm/acompanhamento', 'CRM · Acompanhamento do Time',  'CRM', 230, true)
ON CONFLICT (chave) DO UPDATE
  SET label = EXCLUDED.label, grupo = EXCLUDED.grupo,
      ordem = EXCLUDED.ordem, sensivel = EXCLUDED.sensivel;

-- 3) O papel `cs` recebe o dia a dia operacional.
-- As abas de coordenação (visão geral, torre de comando, acompanhamento do time)
-- ficam para quem tem papel com is_full — que é o caso da Maiara (super_admin).
INSERT INTO public.papel_secoes (papel_chave, secao_chave)
SELECT 'cs', s FROM unnest(ARRAY[
  'crm','crm/meu-dia','crm/atividades','crm/clientes',
  'crm/alertas','crm/atendimento','crm/projetos','crm/manual'
]) AS s
ON CONFLICT DO NOTHING;
