-- ROLLBACK de 20260720_rbac_time.sql
drop function if exists public.pode_secao(text);
drop function if exists public.minhas_secoes();
drop function if exists public.is_super_admin();
drop table if exists public.mentor_secao_override;
drop table if exists public.papel_secoes;
alter table public.mentores drop column if exists papel;
drop table if exists public.secoes_catalogo;
drop table if exists public.papeis;
