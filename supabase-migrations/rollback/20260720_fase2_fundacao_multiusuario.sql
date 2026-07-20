-- ROLLBACK de 20260720_fase2_fundacao_multiusuario.sql
drop function if exists public.meu_id_cliente();
drop table if exists public.empresa_usuarios;
