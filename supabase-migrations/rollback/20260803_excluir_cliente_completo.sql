-- Rollback — remove as functions/sequence novas de exclusão completa de cliente.
-- Não reverte os setval() de sincronização de sequence (é estado, não schema).
drop function if exists public.admin_excluir_cliente(bigint);
drop function if exists public.proximo_codigo_cliente();
drop sequence if exists public.codigo_cliente_seq;
