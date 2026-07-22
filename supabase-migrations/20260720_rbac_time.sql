-- 20260720_rbac_time.sql
-- FASE 1 do sistema de permissões: RBAC do TIME (papéis-modelo + ajuste fino
-- por pessoa, granularidade por seção "ver / não ver").
--
-- Modelo (mantém `mentores` como fonte de "é time?" p/ backward-compat com is_admin()):
--   papeis              catálogo de papéis (super_admin, admin, e papéis limitados)
--   mentores.papel      papel de cada membro (default 'admin' => sem regressão)
--   secoes_catalogo     as seções admin (semeadas da sidebar), agrupadas por área
--   papel_secoes        template: quais seções cada papel-limitado vê
--   mentor_secao_override  ajuste fino por pessoa (+/-) sobre o template
--
-- Funções: is_super_admin(), minhas_secoes(), pode_secao(chave).
-- Papéis "full" (is_full=true: super_admin, admin) enxergam TODAS as seções.

-- ── 1. Catálogo de papéis ───────────────────────────────────────────────────
create table if not exists public.papeis (
  chave     text primary key,
  nome      text not null,
  descricao text,
  is_super  boolean not null default false,  -- gere papéis/permissões
  is_full   boolean not null default false,  -- enxerga todas as seções
  ordem     int not null default 100,
  created_at timestamptz not null default now()
);

insert into public.papeis (chave, nome, descricao, is_super, is_full, ordem) values
  ('super_admin', 'Super Admin', 'Controle total, incluindo papéis e permissões.', true,  true,  1),
  ('admin',       'Admin',       'Acesso total ao sistema (sem gerir papéis).',    false, true,  2),
  ('cs',          'Sucesso do Cliente', 'Clientes, CRM, onboarding e atendimento.', false, false, 10),
  ('consultor',   'Consultor',   'Reuniões e atendimento.',                         false, false, 11),
  ('conteudo',    'Conteúdo',    'Novidades, estudos de caso, skills e recursos.',  false, false, 12)
on conflict (chave) do nothing;

-- ── 2. Papel por membro do time ─────────────────────────────────────────────
alter table public.mentores add column if not exists papel text not null default 'admin'
  references public.papeis(chave);

-- Marca o(s) dono(s) como super_admin (idempotente; ignora e-mail inexistente).
update public.mentores set papel = 'super_admin'
  where lower(email) in ('dono@rafaelgaldino.com.br', 'rafagaldino@gmail.com');

-- ── 3. Catálogo de seções (semeado da sidebar admin) ────────────────────────
create table if not exists public.secoes_catalogo (
  chave  text primary key,
  label  text not null,
  grupo  text not null,          -- a "área" (label da sidebar)
  ordem  int not null default 100,
  sensivel boolean not null default false  -- se true, além da UI, reforçar no RLS
);

insert into public.secoes_catalogo (chave, label, grupo, ordem, sensivel) values
  ('agente',              'Agente',                 'Visão Geral',   10, false),
  ('clientes',            'Clientes',               'Clientes & CRM', 20, true),
  ('radar-renovacao',     'Radar de Renovação',     'Clientes & CRM', 21, true),
  ('crm',                 'CRM',                    'Clientes & CRM', 22, true),
  ('funis',               'Funis',                  'Clientes & CRM', 23, false),
  ('acessos',             'Acessos',                'Clientes & CRM', 24, true),
  ('canais-vendas',       'Canais de Vendas',       'Vendas',        30, true),
  ('onboarding',          'Pendentes Onboarding',   'Onboarding',    40, false),
  ('respostas-onboarding','Respostas de Onboarding','Onboarding',    41, true),
  ('central-atendimentos','Central de Atendimentos','Atendimento',   50, false),
  ('consultores',         'Consultores',            'Atendimento',   51, false),
  ('guardiao-admin',      'Guardião (Clientes)',    'Atendimento',   52, false),
  ('reunioes-galdino',    'Reuniões Galdino',       'Reuniões',      60, false),
  ('reunioes-blackcrm',   'Reuniões Black CRM',     'Reuniões',      61, false),
  ('calendario',          'Encontros ao Vivo',      'Reuniões',      62, false),
  ('roadmap-sistemas',    'Roadmap de Sistemas',    'Sistemas',      70, false),
  ('novidades-admin',     'Novidades',              'Conteúdo',      80, false),
  ('repositorio-vitorias','Repositório de Vitórias','Conteúdo',      81, false),
  ('estudos-caso-admin',  'Estudos de Caso',        'Conteúdo',      82, false),
  ('multiplicadores-admin','Multiplicadores',       'Conteúdo',      83, false),
  ('skills-admin',        'Skills',                 'Conteúdo',      84, false),
  ('recursos',            'Links Importantes',      'Recursos',      90, false),
  ('ferramentas',         'Ferramentas IA',         'Recursos',      91, false),
  ('logs-download',       'Registro de Downloads',  'Sistema',       95, true),
  ('configuracoes',       'Configurações',          'Sistema',       96, true),
  ('permissoes',          'Time & Permissões',      'Sistema',       97, true)
on conflict (chave) do update
  set label = excluded.label, grupo = excluded.grupo, ordem = excluded.ordem, sensivel = excluded.sensivel;

-- ── 4. Template papel → seções (só p/ papéis limitados; full vê tudo) ────────
create table if not exists public.papel_secoes (
  papel_chave text not null references public.papeis(chave) on delete cascade,
  secao_chave text not null references public.secoes_catalogo(chave) on delete cascade,
  primary key (papel_chave, secao_chave)
);

insert into public.papel_secoes (papel_chave, secao_chave) values
  -- CS
  ('cs','clientes'),('cs','radar-renovacao'),('cs','crm'),('cs','funis'),('cs','acessos'),
  ('cs','onboarding'),('cs','respostas-onboarding'),('cs','central-atendimentos'),('cs','guardiao-admin'),
  -- Consultor
  ('consultor','reunioes-galdino'),('consultor','reunioes-blackcrm'),('consultor','calendario'),
  ('consultor','central-atendimentos'),('consultor','consultores'),
  -- Conteúdo
  ('conteudo','novidades-admin'),('conteudo','repositorio-vitorias'),('conteudo','estudos-caso-admin'),
  ('conteudo','multiplicadores-admin'),('conteudo','skills-admin'),('conteudo','recursos'),('conteudo','ferramentas')
on conflict do nothing;

-- ── 5. Override por pessoa ──────────────────────────────────────────────────
create table if not exists public.mentor_secao_override (
  mentor_id   bigint not null references public.mentores(id) on delete cascade,
  secao_chave text not null references public.secoes_catalogo(chave) on delete cascade,
  permitir    boolean not null,   -- true = adiciona a seção; false = remove
  primary key (mentor_id, secao_chave)
);

-- ── 6. Funções ──────────────────────────────────────────────────────────────
create or replace function public.is_super_admin()
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from mentores m join papeis p on p.chave = m.papel
    where m.email = (select email from auth.users where id = auth.uid()) and p.is_super
  );
$$;

-- Seções efetivas do membro logado (chaves). Full => todas; limitado => template ± override.
create or replace function public.minhas_secoes()
returns setof text language plpgsql stable security definer set search_path = public as $$
declare v_email text; v_papel text; v_full boolean;
begin
  select email into v_email from auth.users where id = auth.uid();
  select m.papel, p.is_full into v_papel, v_full
    from mentores m join papeis p on p.chave = m.papel
    where m.email = v_email;
  if v_papel is null then return; end if;          -- não é time => nada
  if v_full then return query select chave from secoes_catalogo; return; end if;
  return query
    select ps.secao_chave from papel_secoes ps where ps.papel_chave = v_papel
      and not exists (select 1 from mentor_secao_override o
                      join mentores m on m.id = o.mentor_id
                      where m.email = v_email and o.secao_chave = ps.secao_chave and o.permitir = false)
    union
    select o.secao_chave from mentor_secao_override o
      join mentores m on m.id = o.mentor_id
      where m.email = v_email and o.permitir = true;
end;
$$;

create or replace function public.pode_secao(p_chave text)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from minhas_secoes() s where s = p_chave);
$$;

grant execute on function public.is_super_admin(), public.minhas_secoes(), public.pode_secao(text) to authenticated;

-- ── 7. RLS das tabelas novas ────────────────────────────────────────────────
alter table public.papeis enable row level security;
alter table public.secoes_catalogo enable row level security;
alter table public.papel_secoes enable row level security;
alter table public.mentor_secao_override enable row level security;

-- Todo membro do time (is_admin) lê o catálogo e templates (a UI precisa listar).
create policy papeis_read on public.papeis for select to authenticated using (is_admin());
create policy secoes_read on public.secoes_catalogo for select to authenticated using (is_admin());
create policy papel_secoes_read on public.papel_secoes for select to authenticated using (is_admin());
create policy override_read on public.mentor_secao_override for select to authenticated using (is_admin());

-- Só super_admin altera papéis, templates e overrides.
create policy papeis_write on public.papeis for all to authenticated using (is_super_admin()) with check (is_super_admin());
create policy secoes_write on public.secoes_catalogo for all to authenticated using (is_super_admin()) with check (is_super_admin());
create policy papel_secoes_write on public.papel_secoes for all to authenticated using (is_super_admin()) with check (is_super_admin());
create policy override_write on public.mentor_secao_override for all to authenticated using (is_super_admin()) with check (is_super_admin());
