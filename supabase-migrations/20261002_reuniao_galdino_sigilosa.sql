-- Reunião do Galdino com conteúdo sigiloso: não guarda transcrição nem nada derivado dela.
--
-- Caso: Ergosaúde (261), 01/10/2026. Na própria call o Galdino avisou que a
-- transcrição não podia subir para o sistema (assunto de pessoas/salário).
--
-- Apagar os campos não basta: o cron sincronizar-reunioes (horário) pega toda
-- reunião do link público com transcricao/ganho/links NULL e preenche de novo a
-- partir do Gemini Doc, e o enrich-reunioes-semana.mjs (skill pmc-sync-reunioes)
-- sobrescreve a transcrição quando acha o doc. Por isso a trava fica no banco:
-- com conteudo_sigiloso = true, todo INSERT/UPDATE descarta o conteúdo, venha de
-- onde vier.
--
-- Os campos que o cron usa para decidir o que enriquecer (transcricao, ganho,
-- link_gravacao, link_geminidoc) ficam como '' (não NULL): assim a linha sai do
-- filtro do cron e ele não fica reprocessando a reunião toda hora. Na tela, ''
-- é falso e nada aparece.
--
-- Rollback: rollback/20261002_reuniao_galdino_sigilosa.down.sql

begin;

alter table public.reunioes_galdino
  add column if not exists conteudo_sigiloso boolean not null default false;

comment on column public.reunioes_galdino.conteudo_sigiloso is
  'true = reunião sigilosa: o trigger tg_reuniao_galdino_sigilosa descarta transcrição, resumo, detalhes, ações, ganho e links em todo INSERT/UPDATE.';

create or replace function public.tg_reuniao_galdino_sigilosa()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if new.conteudo_sigiloso then
    new.transcricao      := '';
    new.ganho            := '';
    new.link_gravacao    := '';
    new.link_geminidoc   := '';
    new.resumo           := null;
    new.detalhes_reuniao := null;
    new.acoes_cliente    := null;
    new.acoes_mentor     := null;
  end if;
  return new;
end;
$$;

drop trigger if exists tg_reuniao_galdino_sigilosa on public.reunioes_galdino;
create trigger tg_reuniao_galdino_sigilosa
  before insert or update on public.reunioes_galdino
  for each row execute function public.tg_reuniao_galdino_sigilosa();

-- Ergosaúde (261), 01/10/2026 — o UPDATE passa pelo trigger e já limpa tudo.
update public.reunioes_galdino
   set conteudo_sigiloso = true
 where id_unico = '496bd9dd-2b5b-47df-81ab-70207c766a35';

commit;
