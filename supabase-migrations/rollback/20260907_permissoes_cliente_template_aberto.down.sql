-- Rollback de 20260907_permissoes_cliente_template_aberto.sql
-- Volta ao template original de 20260907_permissoes_cliente_fundacao.sql:
-- colaborador sem nenhuma seção sensível; guardião sem as 4 do dono.
begin;

delete from public.papel_empresa_secoes where papel_chave in ('colaborador','guardiao');

insert into public.papel_empresa_secoes (papel_chave, secao_chave)
select 'guardiao', chave from public.secoes_cliente_catalogo
 where chave not in ('acessos-empresa','indicadores','informacoes-empresa','balanco','mapeamento')
on conflict do nothing;

insert into public.papel_empresa_secoes (papel_chave, secao_chave)
select 'colaborador', chave from public.secoes_cliente_catalogo
 where sensivel = false
on conflict do nothing;

commit;
