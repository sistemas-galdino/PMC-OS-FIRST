-- 20260720_copiloto_rotina.sql
-- Método MC / Co-Pilotos: cada skill pode virar uma ROTINA com uma cadência
-- (diário, semanal, quinzenal, mensal). Coluna aditiva, nullable (sem rotina =
-- skill avulsa; com rotina = executa naquela frequência).
alter table public.metodo_copilotos add column if not exists rotina text;
comment on column public.metodo_copilotos.rotina is 'Cadência da rotina: diario | semanal | quinzenal | mensal (null = sem rotina)';
