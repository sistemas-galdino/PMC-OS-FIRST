-- Cor da agenda por consultor (link público de agendamento).
--
-- Eventos criados pela edge function criar-agendamento chegam BRANCOS na agenda
-- do organizador (dono@/mentor@/especialistablackcrm@). Como vários consultores
-- caem na mesma caixa, fica impossível distinguir. Esta coluna guarda o colorId
-- de evento do Google Calendar (paleta fixa 1..11) escolhido por consultor no
-- admin (Central de Atendimentos → Disponibilidade → Editar consultor).
--
-- null = sem cor (branco padrão). A função usa service_role (vê a coluna); o
-- admin (authenticated) já tem UPDATE de tabela (cobre coluna nova); anon NÃO
-- precisa dela (não entra no grant por coluna do hardening).

ALTER TABLE public.consultores_atendimento
  ADD COLUMN IF NOT EXISTS cor_agenda smallint
  CHECK (cor_agenda IS NULL OR cor_agenda BETWEEN 1 AND 11);

NOTIFY pgrst, 'reload schema';
