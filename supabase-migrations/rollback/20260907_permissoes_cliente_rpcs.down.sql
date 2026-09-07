-- Rollback de 20260907_permissoes_cliente_rpcs.sql
-- Rode DEPOIS de 20260907_permissoes_cliente_rls_sensiveis.down.sql: as policies
-- sensíveis chamam pode_secao_cliente(), e o drop falha enquanto elas existirem.

begin;

drop function if exists public.get_meus_acessos_empresa();
drop function if exists public.dono_limpar_secao(uuid, text);
drop function if exists public.dono_definir_secao(uuid, text, boolean);
drop function if exists public.dono_definir_papel(uuid, text);
drop function if exists public.pode_secao_cliente(text);
drop function if exists public.minhas_secoes_cliente();

drop policy if exists empresa_usuarios_dono_read on public.empresa_usuarios;
drop table if exists public.empresa_usuario_secao;

-- meu_papel_empresa() volta à versão de 20260823_multi_empresa_por_login.sql
-- (sem o fallback de dono legado).
create or replace function public.meu_papel_empresa()
returns text
language sql stable security definer set search_path = public as $$
  select eu.papel
    from public.empresa_usuarios eu
   where eu.auth_user_id = auth.uid()
     and eu.id_cliente   = public.meu_id_cliente()
   limit 1;
$$;

commit;
