-- Time & Permissões no painel do CLIENTE — override por pessoa + RPCs.
-- Depende de 20260907_permissoes_cliente_fundacao.sql (catálogos + backfill).

begin;

-- ─────────────────────────────────────────────────────────────────────────────
-- 1. Override por pessoa, POR EMPRESA.
--
--    A FK composta para empresa_usuarios(auth_user_id, id_cliente) faz duas
--    coisas de graça: impede gravar permissão para quem não está na empresa, e
--    limpa as permissões junto quando o acesso é removido (gerenciar-acesso
--    apaga o vínculo daquela empresa).
-- ─────────────────────────────────────────────────────────────────────────────
create table if not exists public.empresa_usuario_secao (
  auth_user_id   uuid not null,
  id_cliente     uuid not null,
  secao_chave    text not null references public.secoes_cliente_catalogo(chave) on delete cascade,
  permitir       boolean not null,   -- true = adiciona ao template; false = remove
  atualizado_em  timestamptz not null default now(),
  atualizado_por uuid,
  primary key (auth_user_id, id_cliente, secao_chave),
  constraint empresa_usuario_secao_vinculo_fkey
    foreign key (auth_user_id, id_cliente)
    references public.empresa_usuarios (auth_user_id, id_cliente) on delete cascade
);

create index if not exists empresa_usuario_secao_empresa_idx
  on public.empresa_usuario_secao (id_cliente);

comment on table public.empresa_usuario_secao is
  'Ajuste fino de seções por pessoa dentro de uma empresa, como delta contra o template de papel_empresa_secoes. Escrito só pela RPC dono_definir_secao().';

-- ─────────────────────────────────────────────────────────────────────────────
-- 2. meu_papel_empresa() ganha o fallback de dono legado.
--
--    Por que é obrigatório: invite-client cria o cliente em clientes_entrada_new
--    /clientes_formulario/cliente_onboarding, mas NÃO cria linha em
--    empresa_usuarios. Sem o fallback, todo cliente novo entraria com papel nulo
--    e — agora que papel decide o que aparece — veria um menu vazio no primeiro
--    login. O backfill conserta o passado; o fallback conserta o futuro.
--
--    O fallback é 'dono', nunca 'colaborador': rebaixar um dono legado esconderia
--    dele o próprio Balanço e as próprias Informações da Empresa.
-- ─────────────────────────────────────────────────────────────────────────────
create or replace function public.meu_papel_empresa()
returns text
language plpgsql stable security definer set search_path = public as $$
declare
  v_cliente uuid;
  v_papel   text;
begin
  v_cliente := public.meu_id_cliente();
  if v_cliente is null then return null; end if;

  select eu.papel into v_papel
    from public.empresa_usuarios eu
   where eu.auth_user_id = auth.uid()
     and eu.id_cliente   = v_cliente
   limit 1;

  if v_papel is not null then return v_papel; end if;

  -- Login legado: o auth.uid() É a empresa. É o dono, por definição.
  if exists (select 1 from public.clientes_entrada_new e where e.id_cliente = auth.uid())
     or exists (select 1 from public.clientes_formulario f where f.id_cliente = auth.uid())
  then
    return 'dono';
  end if;

  return null;
end;
$$;

-- ─────────────────────────────────────────────────────────────────────────────
-- 3. Resolução das seções. Espelha minhas_secoes() do admin:
--    is_full -> catálogo inteiro; senão template menos os negativos, união os
--    positivos. Tudo relativo a meu_id_cliente() (a empresa ATIVA), porque um
--    login pode alcançar várias empresas com papéis diferentes em cada uma.
-- ─────────────────────────────────────────────────────────────────────────────
create or replace function public.minhas_secoes_cliente()
returns setof text
language plpgsql stable security definer set search_path = public as $$
declare
  v_cliente uuid;
  v_papel   text;
  v_full    boolean;
begin
  -- Membro do time usa minhas_secoes(); aqui não devolve nada.
  if public.is_admin() then return; end if;

  v_cliente := public.meu_id_cliente();
  if v_cliente is null then return; end if;

  v_papel := public.meu_papel_empresa();
  if v_papel is null then return; end if;

  select pe.is_full into v_full from public.papeis_empresa pe where pe.chave = v_papel;

  if coalesce(v_full, false) then
    return query select c.chave from public.secoes_cliente_catalogo c;
    return;
  end if;

  return query
    select ps.secao_chave
      from public.papel_empresa_secoes ps
     where ps.papel_chave = v_papel
       and not exists (
             select 1 from public.empresa_usuario_secao o
              where o.auth_user_id = auth.uid()
                and o.id_cliente   = v_cliente
                and o.secao_chave  = ps.secao_chave
                and o.permitir is false)
    union
    select o.secao_chave
      from public.empresa_usuario_secao o
     where o.auth_user_id = auth.uid()
       and o.id_cliente   = v_cliente
       and o.permitir is true;
end;
$$;

-- Usada DENTRO das policies de RLS. Sempre chamar como (select pode_secao_cliente('x')):
-- o wrapper vira InitPlan e o planner avalia uma vez por statement, não por linha.
create or replace function public.pode_secao_cliente(p_chave text)
returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.minhas_secoes_cliente() s where s = p_chave);
$$;

-- ─────────────────────────────────────────────────────────────────────────────
-- 4. RLS de empresa_usuario_secao e leitura de empresa_usuarios pelo dono.
--
--    Leitura por policy; ESCRITA só por RPC (item 5). RLS não filtra colunas nem
--    comandos de forma fina o bastante: uma policy de escrita para o dono lhe
--    daria INSERT e DELETE em empresa_usuarios, e convidar/remover login é
--    deliberadamente exclusivo da PMC pela aba /acessos.
-- ─────────────────────────────────────────────────────────────────────────────
alter table public.empresa_usuario_secao enable row level security;

drop policy if exists eus_self_read   on public.empresa_usuario_secao;
drop policy if exists eus_dono_read   on public.empresa_usuario_secao;
drop policy if exists eus_admin_write on public.empresa_usuario_secao;

create policy eus_self_read on public.empresa_usuario_secao for select to authenticated
  using (auth_user_id = auth.uid() or public.is_admin());

create policy eus_dono_read on public.empresa_usuario_secao for select to authenticated
  using (id_cliente = public.meu_id_cliente() and public.meu_papel_empresa() = 'dono');

create policy eus_admin_write on public.empresa_usuario_secao for all to authenticated
  using (public.is_admin() and public.pode_secao('acessos'))
  with check (public.is_admin() and public.pode_secao('acessos'));

-- O dono enxerga os vínculos da própria empresa (hoje empresa_usuarios_self_read
-- devolve só a própria linha, então ele não vê nem quem tem acesso).
drop policy if exists empresa_usuarios_dono_read on public.empresa_usuarios;
create policy empresa_usuarios_dono_read on public.empresa_usuarios for select to authenticated
  using (id_cliente = public.meu_id_cliente() and public.meu_papel_empresa() = 'dono');

-- ─────────────────────────────────────────────────────────────────────────────
-- 5. RPCs de escrita do dono. Escopo SEMPRE meu_id_cliente() — nunca um
--    id_cliente vindo do HTTP. Dois guards fecham a auto-promoção:
--    (a) quem não é dono nem entra; (b) ninguém mexe em si mesmo.
-- ─────────────────────────────────────────────────────────────────────────────
create or replace function public.dono_definir_papel(p_auth_user_id uuid, p_papel text)
returns void
language plpgsql security definer set search_path = public as $$
declare v_cliente uuid := public.meu_id_cliente();
begin
  if public.meu_papel_empresa() is distinct from 'dono' then
    raise exception 'Apenas o dono da empresa pode alterar papéis.' using errcode = '42501';
  end if;
  if p_auth_user_id = auth.uid() then
    raise exception 'Você não pode alterar o seu próprio papel.' using errcode = '42501';
  end if;
  if not exists (select 1 from public.papeis_empresa where chave = p_papel) then
    raise exception 'Papel inválido: %', p_papel;
  end if;

  update public.empresa_usuarios
     set papel = p_papel
   where auth_user_id = p_auth_user_id
     and id_cliente   = v_cliente;

  if not found then
    raise exception 'Esta pessoa não tem acesso a esta empresa.' using errcode = '42501';
  end if;
end;
$$;

create or replace function public.dono_definir_secao(
  p_auth_user_id uuid, p_secao text, p_permitir boolean)
returns void
language plpgsql security definer set search_path = public as $$
declare
  v_cliente uuid := public.meu_id_cliente();
  v_papel   text;
begin
  if public.meu_papel_empresa() is distinct from 'dono' then
    raise exception 'Apenas o dono da empresa pode alterar permissões.' using errcode = '42501';
  end if;
  if p_auth_user_id = auth.uid() then
    raise exception 'Você não pode alterar as suas próprias permissões.' using errcode = '42501';
  end if;
  if not exists (select 1 from public.secoes_cliente_catalogo where chave = p_secao) then
    raise exception 'Seção inválida: %', p_secao;
  end if;

  select eu.papel into v_papel
    from public.empresa_usuarios eu
   where eu.auth_user_id = p_auth_user_id and eu.id_cliente = v_cliente;
  if v_papel is null then
    raise exception 'Esta pessoa não tem acesso a esta empresa.' using errcode = '42501';
  end if;

  -- A própria aba de gestão é exclusiva do papel dono. Liberá-la a um
  -- colaborador daria a ele o poder de editar as permissões dos outros.
  if p_secao = 'acessos-empresa' and p_permitir then
    raise exception 'A aba Time & Permissões é exclusiva do papel Dono.' using errcode = '42501';
  end if;

  insert into public.empresa_usuario_secao
    (auth_user_id, id_cliente, secao_chave, permitir, atualizado_em, atualizado_por)
  values (p_auth_user_id, v_cliente, p_secao, p_permitir, now(), auth.uid())
  on conflict (auth_user_id, id_cliente, secao_chave)
  do update set permitir = excluded.permitir, atualizado_em = now(), atualizado_por = auth.uid();
end;
$$;

-- Volta a seção ao padrão do papel (apaga o delta), igual ao toggle do admin.
create or replace function public.dono_limpar_secao(p_auth_user_id uuid, p_secao text)
returns void
language plpgsql security definer set search_path = public as $$
declare v_cliente uuid := public.meu_id_cliente();
begin
  if public.meu_papel_empresa() is distinct from 'dono' then
    raise exception 'Apenas o dono da empresa pode alterar permissões.' using errcode = '42501';
  end if;
  if p_auth_user_id = auth.uid() then
    raise exception 'Você não pode alterar as suas próprias permissões.' using errcode = '42501';
  end if;
  delete from public.empresa_usuario_secao
   where auth_user_id = p_auth_user_id and id_cliente = v_cliente and secao_chave = p_secao;
end;
$$;

-- ─────────────────────────────────────────────────────────────────────────────
-- 6. A lista que o dono vê. empresa_usuarios não guarda e-mail e auth.users é
--    inacessível ao papel `authenticated`; mesmo padrão de get_empresa_acessos().
-- ─────────────────────────────────────────────────────────────────────────────
create or replace function public.get_meus_acessos_empresa()
returns table (
  auth_user_id      uuid,
  email             text,
  nome              text,
  papel             text,
  sou_eu            boolean,
  last_sign_in_at   timestamptz,
  criado_em         timestamptz,
  secoes_ligadas    text[],
  secoes_desligadas text[]
)
language plpgsql stable security definer set search_path = public as $$
declare v_cliente uuid := public.meu_id_cliente();
begin
  if public.meu_papel_empresa() is distinct from 'dono' then
    raise exception 'Apenas o dono da empresa pode ver os acessos.' using errcode = '42501';
  end if;

  return query
  select eu.auth_user_id,
         u.email::text,
         coalesce(c.nome,
                  u.raw_user_meta_data ->> 'nome',
                  u.raw_user_meta_data ->> 'full_name')::text,
         eu.papel,
         (eu.auth_user_id = auth.uid()),
         u.last_sign_in_at,
         eu.criado_em,
         coalesce(array_agg(o.secao_chave) filter (where o.permitir is true), '{}'::text[]),
         coalesce(array_agg(o.secao_chave) filter (where o.permitir is false), '{}'::text[])
    from public.empresa_usuarios eu
    join auth.users u on u.id = eu.auth_user_id
    left join public.empresa_usuario_secao o
           on o.auth_user_id = eu.auth_user_id and o.id_cliente = eu.id_cliente
    left join lateral (
           select cc.nome from public.cliente_colaboradores cc
            where cc.id_cliente = eu.id_cliente
              and lower(cc.email) = lower(u.email)
            limit 1) c on true
   where eu.id_cliente = v_cliente
   group by eu.auth_user_id, u.email, c.nome, u.raw_user_meta_data,
            eu.papel, u.last_sign_in_at, eu.criado_em
   order by (eu.papel = 'dono') desc, u.email;
end;
$$;

grant execute on function public.minhas_secoes_cliente()                        to authenticated;
grant execute on function public.pode_secao_cliente(text)                       to authenticated;
grant execute on function public.dono_definir_papel(uuid, text)                 to authenticated;
grant execute on function public.dono_definir_secao(uuid, text, boolean)        to authenticated;
grant execute on function public.dono_limpar_secao(uuid, text)                  to authenticated;
grant execute on function public.get_meus_acessos_empresa()                     to authenticated;

commit;
