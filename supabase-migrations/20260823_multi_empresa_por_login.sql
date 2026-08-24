-- 20260823_multi_empresa_por_login.sql
-- Um login passa a poder alcançar MAIS DE UMA empresa — mas só para e-mails de
-- uma lista de exceção explícita.
--
-- Por quê: sócios de grupos com duas empresas no PMC (ex.: XRM Construção e XRM
-- Pré-moldados) usam o mesmo e-mail nas duas. Não dá para criar um segundo login
-- com o mesmo e-mail (auth.users.email é único no GoTrue), então o caminho é o
-- MESMO login alcançar as duas empresas e escolher qual está vendo.
--
-- Decisão de projeto: meu_id_cliente() CONTINUA devolvendo um único uuid — a
-- "empresa ativa". Assim as ~61 policies de RLS penduradas nela seguem valendo
-- sem serem reescritas. O que muda é COMO esse uuid é resolvido.
--
-- Quem não está na lista de exceção continua com o bloqueio de hoje, intacto.

-- ---------------------------------------------------------------------------
-- 1) A lista de exceção
-- ---------------------------------------------------------------------------
create table if not exists public.emails_multi_empresa (
  email      text primary key,            -- sempre lower(btrim(...))
  motivo     text,
  criado_por uuid,
  criado_em  timestamptz not null default now()
);
comment on table public.emails_multi_empresa is
  'E-mails autorizados a ter UM login vinculado a VÁRIAS empresas. Sem estar aqui, o vínculo cross-tenant segue bloqueado por tg_empresa_usuarios_guard().';

alter table public.emails_multi_empresa enable row level security;
drop policy if exists emails_multi_empresa_admin on public.emails_multi_empresa;
create policy emails_multi_empresa_admin on public.emails_multi_empresa
  for all to authenticated
  using (is_admin() and pode_secao('acessos'))
  with check (is_admin() and pode_secao('acessos'));

-- ---------------------------------------------------------------------------
-- 2) empresa_usuarios: N empresas por login
-- ---------------------------------------------------------------------------
-- A PK era só auth_user_id ("1 login pertence a 1 empresa"). Vira composta.
-- Nenhuma FK aponta para esta tabela, então a troca é segura.
alter table public.empresa_usuarios drop constraint if exists empresa_usuarios_pkey;
alter table public.empresa_usuarios add constraint empresa_usuarios_pkey
  primary key (auth_user_id, id_cliente);

-- O guard cross-tenant continua valendo — com a exceção da lista.
-- A mensagem passa a dizer QUAL empresa já usa o login (antes só dizia "outra").
create or replace function public.tg_empresa_usuarios_guard()
returns trigger
language plpgsql
security definer
set search_path to 'public'
as $$
declare
  v_email    text;
  v_liberado boolean;
  v_outra    text;
begin
  select u.email into v_email from auth.users u where u.id = new.auth_user_id;

  select exists (
    select 1 from emails_multi_empresa m
     where m.email = lower(btrim(coalesce(v_email, '')))
  ) into v_liberado;

  if v_liberado then
    return new;
  end if;

  select coalesce(nullif(btrim(c.nome_empresa_formatado), ''), c.nome_empresa, e.id_cliente::text)
    into v_outra
    from empresa_usuarios e
    left join clientes_entrada_new c on c.id_cliente = e.id_cliente
   where e.auth_user_id = new.auth_user_id
     and e.id_cliente <> new.id_cliente
   limit 1;

  if v_outra is not null then
    raise exception 'Este login já está vinculado à empresa "%". Para que o mesmo e-mail acesse mais de uma empresa, adicione-o em emails_multi_empresa.', v_outra;
  end if;

  return new;
end;
$$;

-- ---------------------------------------------------------------------------
-- 3) Empresa ativa + resolvedor
-- ---------------------------------------------------------------------------
create table if not exists public.empresa_ativa (
  auth_user_id  uuid primary key,
  id_cliente    uuid not null,
  atualizado_em timestamptz not null default now()
);
comment on table public.empresa_ativa is
  'Qual empresa o login está vendo agora. Escrita SÓ via trocar_empresa_ativa() (SECURITY DEFINER), que valida o vínculo.';

alter table public.empresa_ativa enable row level security;
-- Só leitura para o próprio usuário. Sem policy de escrita para authenticated:
-- gravar exige passar por trocar_empresa_ativa(), que valida o vínculo.
drop policy if exists empresa_ativa_self_read on public.empresa_ativa;
create policy empresa_ativa_self_read on public.empresa_ativa
  for select to authenticated
  using (auth_user_id = auth.uid() or is_admin());

-- Resolve a empresa do login. Assinatura e tipo de retorno INALTERADOS.
-- Ordem importa: o fallback legado fica por último, e a empresa ativa só vale
-- se ainda existir vínculo (vínculo revogado não pode continuar dando acesso).
create or replace function public.meu_id_cliente()
returns uuid language sql stable security definer set search_path = public as $$
  select coalesce(
    (select ea.id_cliente
       from empresa_ativa ea
       join empresa_usuarios eu
         on eu.auth_user_id = ea.auth_user_id
        and eu.id_cliente   = ea.id_cliente
      where ea.auth_user_id = auth.uid()),
    (select eu.id_cliente
       from empresa_usuarios eu
      where eu.auth_user_id = auth.uid()
      order by eu.criado_em, eu.id_cliente
      limit 1),
    (select e.id_cliente from clientes_entrada_new e where e.id_cliente = auth.uid())
  );
$$;
grant execute on function public.meu_id_cliente() to authenticated;

-- O papel define a HOME (guardiao -> /meu-dia). Com dois vínculos, o LIMIT 1 sem
-- filtro devolvia o papel de uma empresa aleatória.
create or replace function public.meu_papel_empresa()
returns text language sql stable security definer set search_path = public as $$
  select eu.papel
    from empresa_usuarios eu
   where eu.auth_user_id = auth.uid()
     and eu.id_cliente = public.meu_id_cliente()
   limit 1;
$$;
grant execute on function public.meu_papel_empresa() to authenticated;

-- ---------------------------------------------------------------------------
-- 4) RPCs do trocador
-- ---------------------------------------------------------------------------
drop function if exists public.minhas_empresas();
create or replace function public.minhas_empresas()
returns table (
  id_cliente     uuid,
  nome_empresa   text,
  nome_cliente   text,
  codigo_cliente integer,
  ativa          boolean
)
language sql stable security definer set search_path = public as $$
  -- `distinct` no id_cliente: o login legado aparece nos DOIS ramos (tem linha de
  -- vínculo pelo backfill E casa com o fallback), e sem isso a empresa vinha em
  -- duplicidade no trocador.
  with vinculos as (
    select distinct id_cliente from (
      select eu.id_cliente
        from empresa_usuarios eu
       where eu.auth_user_id = auth.uid()
      union all
      select e.id_cliente
        from clientes_entrada_new e
       where e.id_cliente = auth.uid()
    ) t
  )
  select c.id_cliente,
         coalesce(nullif(btrim(c.nome_empresa_formatado), ''), c.nome_empresa)::text,
         coalesce(nullif(btrim(c.nome_cliente_formatado), ''), c.nome_cliente)::text,
         c.codigo_cliente,
         (c.id_cliente = public.meu_id_cliente()) as ativa
    from vinculos v
    join clientes_entrada_new c on c.id_cliente = v.id_cliente
   order by 2;
$$;
grant execute on function public.minhas_empresas() to authenticated;
comment on function public.minhas_empresas() is
  'Empresas que o login logado alcança. Lê SÓ os vínculos do próprio auth.uid().';

create or replace function public.trocar_empresa_ativa(p_id_cliente uuid)
returns uuid language plpgsql security definer set search_path = public as $$
declare
  v_uid uuid := auth.uid();
begin
  if v_uid is null then
    raise exception 'não autenticado';
  end if;

  -- Sem esta validação seria escalonamento de privilégio: qualquer cliente
  -- escolheria qualquer empresa e a RLS obedeceria.
  if not exists (
    select 1 from empresa_usuarios eu
     where eu.auth_user_id = v_uid and eu.id_cliente = p_id_cliente
    union all
    select 1 from clientes_entrada_new e
     where e.id_cliente = v_uid and e.id_cliente = p_id_cliente
  ) then
    raise exception 'você não tem acesso a esta empresa';
  end if;

  insert into empresa_ativa (auth_user_id, id_cliente, atualizado_em)
  values (v_uid, p_id_cliente, now())
  on conflict (auth_user_id)
    do update set id_cliente = excluded.id_cliente, atualizado_em = now();

  return p_id_cliente;
end;
$$;
grant execute on function public.trocar_empresa_ativa(uuid) to authenticated;

-- ---------------------------------------------------------------------------
-- 5) Lookup de login por e-mail (usado pela edge function provisionar-login)
-- ---------------------------------------------------------------------------
-- Evita paginar admin.listUsers() só pra descobrir se o e-mail já tem login.
create or replace function public.auth_user_id_por_email(p_email text)
returns uuid language plpgsql stable security definer set search_path = public as $$
declare
  v_id uuid;
begin
  if not (public.is_admin() and public.pode_secao('acessos')) then
    raise exception 'sem permissão para a seção Acessos';
  end if;
  select u.id into v_id from auth.users u
   where lower(u.email) = lower(btrim(p_email)) limit 1;
  return v_id;
end;
$$;
grant execute on function public.auth_user_id_por_email(text) to authenticated;

-- ---------------------------------------------------------------------------
-- 6) Policy que ainda usava auth.uid() direto
-- ---------------------------------------------------------------------------
-- pulso_semanal: para um login LEGADO (auth.uid() = id_cliente da 1ª empresa),
-- estar "dentro" da 2ª empresa continuaria lendo o pulso da 1ª — e um INSERT
-- seria gravado com o id da 1ª. Passa a seguir a empresa ativa.
alter policy pulso_own on public.pulso_semanal
  using ((id_cliente = public.meu_id_cliente()) or is_admin())
  with check ((id_cliente = public.meu_id_cliente()) or is_admin());
