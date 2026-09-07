-- Rollback de 20260907_permissoes_cliente_grandfather.sql
-- Remove só os overrides automáticos (atualizado_por is null), preservando
-- qualquer ajuste que um dono tenha feito pela tela depois (esses gravam o
-- auth.uid() de quem mexeu).
begin;
delete from public.empresa_usuario_secao where atualizado_por is null and permitir is true;
commit;
