-- ROLLBACK de 20260823_multi_empresa_por_login.sql
--
-- ATENÇÃO: se algum login já estiver vinculado a mais de uma empresa, a volta da
-- PK simples FALHA (é o que se espera — apagar vínculo em silêncio seria pior).
-- Nesse caso, remova primeiro os vínculos extras, decidindo qual empresa fica:
--   delete from empresa_usuarios eu using (
--     select auth_user_id, min(criado_em) as manter from empresa_usuarios
--      group by auth_user_id having count(*) > 1
--   ) d where eu.auth_user_id = d.auth_user_id and eu.criado_em <> d.manter;

-- 6) policy do pulso volta a auth.uid()
alter policy pulso_own on public.pulso_semanal
  using ((id_cliente = auth.uid()) or is_admin())
  with check ((id_cliente = auth.uid()) or is_admin());

-- 5) lookup por e-mail
drop function if exists public.auth_user_id_por_email(text);

-- 4) RPCs do trocador
drop function if exists public.trocar_empresa_ativa(uuid);
drop function if exists public.minhas_empresas();

-- 3) resolvedores voltam ao comportamento anterior
create or replace function public.meu_papel_empresa()
returns text language sql stable security definer set search_path = public as $$
  select papel from empresa_usuarios where auth_user_id = auth.uid() limit 1;
$$;

create or replace function public.meu_id_cliente()
returns uuid language sql stable security definer set search_path = public as $$
  select coalesce(
    (select eu.id_cliente from empresa_usuarios eu where eu.auth_user_id = auth.uid()),
    (select e.id_cliente from clientes_entrada_new e where e.id_cliente = auth.uid())
  );
$$;

drop policy if exists empresa_ativa_self_read on public.empresa_ativa;
drop table if exists public.empresa_ativa;

-- 2) guard e PK originais
create or replace function public.tg_empresa_usuarios_guard()
returns trigger
language plpgsql
security definer
set search_path to 'public'
as $$
begin
  if exists (select 1 from empresa_usuarios e
             where e.auth_user_id = new.auth_user_id and e.id_cliente <> new.id_cliente) then
    raise exception 'Este login já está vinculado a outra empresa.';
  end if;
  return new;
end;
$$;

alter table public.empresa_usuarios drop constraint if exists empresa_usuarios_pkey;
alter table public.empresa_usuarios add constraint empresa_usuarios_pkey
  primary key (auth_user_id);

-- 1) lista de exceção
drop policy if exists emails_multi_empresa_admin on public.emails_multi_empresa;
drop table if exists public.emails_multi_empresa;
