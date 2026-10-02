-- Rollback de 20261002_reuniao_galdino_sigilosa.sql: tira a trava.
-- O conteúdo apagado NÃO volta (de propósito); se a marca sair, o cron horário
-- pode voltar a preencher a reunião a partir do Gemini Doc.

begin;

drop trigger if exists tg_reuniao_galdino_sigilosa on public.reunioes_galdino;
drop function if exists public.tg_reuniao_galdino_sigilosa();
alter table public.reunioes_galdino drop column if exists conteudo_sigiloso;

commit;
