-- 20260720_fase2_fundacao_multiusuario.sql
-- FASE 2 (fundação) — multi-usuário por empresa. ADITIVO E SEGURO: não altera
-- nenhuma policy existente. A RLS atual segue usando auth.uid()=id_cliente e
-- funcionando. Esta migration só cria a infra de vínculo e o resolvedor, que
-- serão usados na reescrita da RLS (etapa seguinte, à parte).
--
-- Modelo: hoje auth.uid() É o id_cliente (1 login por empresa). Passamos a ter
-- uma tabela de vínculo (N logins -> 1 empresa). O resolvedor meu_id_cliente()
-- devolve a empresa do usuário logado, com FALLBACK para o modelo legado (quando
-- não há vínculo, mas o auth.uid() coincide com um id_cliente existente) — assim
-- os clientes atuais continuam funcionando sem migração.

create table if not exists public.empresa_usuarios (
  auth_user_id uuid primary key,          -- 1 login pertence a 1 empresa
  id_cliente   uuid not null,             -- a empresa (clientes_entrada_new.id_cliente)
  papel        text not null default 'colaborador',  -- reservado (hoje todos veem tudo)
  criado_em    timestamptz not null default now(),
  criado_por   uuid
);
create index if not exists idx_empresa_usuarios_id_cliente on public.empresa_usuarios (id_cliente);

-- Resolve a empresa do usuário logado. Vínculo explícito OU fallback legado.
create or replace function public.meu_id_cliente()
returns uuid language sql stable security definer set search_path = public as $$
  select coalesce(
    (select eu.id_cliente from empresa_usuarios eu where eu.auth_user_id = auth.uid()),
    (select e.id_cliente from clientes_entrada_new e where e.id_cliente = auth.uid())
  );
$$;
grant execute on function public.meu_id_cliente() to authenticated;

-- Backfill: registra explicitamente cada login de cliente atual como usuário da
-- própria empresa (auth_user_id = id_cliente = a empresa). Idempotente.
insert into public.empresa_usuarios (auth_user_id, id_cliente)
select u.id, u.id
from auth.users u
where exists (select 1 from public.clientes_entrada_new e where e.id_cliente = u.id)
on conflict (auth_user_id) do nothing;

-- RLS: o usuário lê o próprio vínculo; só admin/time gerencia (um cliente NÃO
-- pode se auto-vincular a outra empresa). Escrita real de convites via service_role.
alter table public.empresa_usuarios enable row level security;
create policy empresa_usuarios_self_read on public.empresa_usuarios
  for select to authenticated using (auth_user_id = auth.uid() or is_admin());
create policy empresa_usuarios_admin_write on public.empresa_usuarios
  for all to authenticated using (is_admin()) with check (is_admin());
