-- 20260823_seed_emails_multi_empresa.sql
-- Os e-mails liberados a acessar mais de uma empresa (pedido do David, grupo XRM).
-- Separado do schema de propósito: adicionar/remover e-mail no futuro é só um
-- INSERT/DELETE aqui, sem mexer em estrutura.
insert into public.emails_multi_empresa (email, motivo) values
  ('brmoitinho@yahoo.com.br',            'Grupo XRM — XRM Construção e Incorporação (386) + XRM Pré-moldados'),
  ('adm@xrmpremoldados.com.br',          'Grupo XRM — administrativo das duas empresas'),
  ('financeiro@xrmpremoldados.com.br',   'Grupo XRM — financeiro das duas empresas'),
  ('joaovitor20062006@gmail.com',        'Grupo XRM — sócio, acesso às duas empresas')
on conflict (email) do nothing;
