-- Rollback de 20260907_permissoes_cliente_dono_legado_nao_dono.sql
-- Remove os overrides dados aos logins legados sem papel de acesso total.
-- ATENÇÃO: apaga também qualquer ajuste que o dono tenha feito depois para
-- essas mesmas pessoas, se houver — mas elas são donas legadas da empresa,
-- então na prática ninguém as edita pela tela.
begin;

delete from public.empresa_usuario_secao o
 using public.empresa_usuarios eu
  join public.papeis_empresa p on p.chave = eu.papel
 where o.auth_user_id = eu.auth_user_id
   and o.id_cliente   = eu.id_cliente
   and eu.auth_user_id = eu.id_cliente
   and p.is_full is false
   and o.permitir is true;

commit;
