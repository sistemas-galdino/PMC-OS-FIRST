-- Rollback de 20260907_permissoes_cliente_fundacao.sql
--
-- ATENÇÃO: o backfill de `papel` NÃO é revertido, de propósito. Ele consertou
-- dado que estava errado (233 donos gravados como 'colaborador'); voltar atrás
-- reintroduziria o erro. Como papel só decide a home enquanto as RPCs de seção
-- não existirem, deixar 'dono' gravado é inofensivo após o rollback.
--
-- Se você REALMENTE precisar reverter o backfill (não recomendado), rode antes:
--   update public.empresa_usuarios set papel='colaborador'
--    where auth_user_id = id_cliente and papel='dono';
--   delete from public.empresa_usuarios
--    where auth_user_id = id_cliente and criado_por is null and criado_em > '2026-09-07';

begin;

-- Volta o CHECK antes de derrubar papeis_empresa (a FK depende dela).
alter table public.empresa_usuarios drop constraint if exists empresa_usuarios_papel_fkey;
alter table public.empresa_usuarios
  add constraint empresa_usuarios_papel_valido
  check (papel in ('dono','guardiao','colaborador'));

comment on column public.empresa_usuarios.papel is
  'Define a HOME do usuário: guardiao -> /meu-dia, demais -> /inicio. Não restringe acesso a dado.';

-- papel_empresa_secoes tem FK para as duas outras: cai primeiro.
drop table if exists public.papel_empresa_secoes;
drop table if exists public.secoes_cliente_catalogo;
drop table if exists public.papeis_empresa;

commit;
