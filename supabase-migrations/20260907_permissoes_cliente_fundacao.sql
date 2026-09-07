-- Time & Permissões no painel do CLIENTE — fundação (catálogos + backfill).
--
-- Espelha o RBAC do admin (20260720_rbac_time.sql): catálogo de seções +
-- template por papel + override por pessoa. Duas diferenças de propósito:
--
-- 1. Catálogo PRÓPRIO (secoes_cliente_catalogo), não reuso de secoes_catalogo.
--    As chaves colidem com significado diferente: 'reunioes-galdino' no admin é
--    "as reuniões de todas as empresas"; no cliente é "as minhas". Reusar a
--    mesma tabela tornaria pode_secao() e pode_secao_cliente() ambíguas.
-- 2. O override é por pessoa E POR EMPRESA — um login pode alcançar mais de uma
--    empresa (emails_multi_empresa) e ter permissões diferentes em cada uma.
--
-- Esta migration NÃO muda permissão de ninguém: só cria as tabelas e conserta o
-- dado de `papel`, que estava errado para quase todo dono real (ver backfill).

begin;

-- ─────────────────────────────────────────────────────────────────────────────
-- 1. Catálogo de papéis do cliente. Hoje `papel` é só um CHECK; vira tabela
--    para carregar is_full (o dono vê tudo) e pode_gerir (abre a aba nova).
-- ─────────────────────────────────────────────────────────────────────────────
create table if not exists public.papeis_empresa (
  chave      text primary key,
  nome       text not null,
  descricao  text,
  is_full    boolean not null default false,  -- vê todas as seções, sempre
  pode_gerir boolean not null default false,  -- abre /acessos-empresa
  ordem      int not null default 100
);

insert into public.papeis_empresa (chave, nome, descricao, is_full, pode_gerir, ordem) values
  ('dono',        'Dono',        'Acesso total à empresa e gestão dos acessos.',        true,  true,  1),
  ('guardiao',    'Guardião',    'Opera o dia a dia do método e do Guardião de IA.',    false, false, 10),
  ('colaborador', 'Colaborador', 'Execução; enxerga o que o dono liberar.',             false, false, 20)
on conflict (chave) do nothing;

-- ─────────────────────────────────────────────────────────────────────────────
-- 2. Catálogo de seções do cliente. `chave` = URL sem a barra (mesma convenção
--    do admin), para o filtro da sidebar continuar sendo url.replace(/^\//,'').
--    `sensivel` = tem bloqueio real de RLS, não só sumiço do menu.
--    Ordem com espaço de 10 em 10: o catálogo do admin já precisou de um
--    UPDATE ordem = ordem * 10 (20260810_crm_rbac_secoes.sql) por falta disso.
-- ─────────────────────────────────────────────────────────────────────────────
create table if not exists public.secoes_cliente_catalogo (
  chave    text primary key,
  label    text not null,
  grupo    text not null,          -- = label do bloco em clientSections
  ordem    int  not null default 100,
  sensivel boolean not null default false
);

insert into public.secoes_cliente_catalogo (chave, label, grupo, ordem, sensivel) values
  ('inicio',              'Minha Jornada',          'Visão Geral',    10,  false),
  ('informacoes-empresa', 'Informações da Empresa', 'Meu Negócio',    100, true),
  ('mapeamento',          'Mapeamento',             'Meu Negócio',    110, true),
  ('indicadores',         'Indicadores',            'Meu Negócio',    120, true),
  ('metodo',              'Método MC',              'Execução',       200, false),
  ('acoes',               'Ações',                  'Execução',       210, false),
  ('meu-time',            'Meu Time',               'Execução',       220, true),
  ('guardiao',            'Guardião',               'Guardião de IA', 300, false),
  ('meu-dia',             'Meu Dia',                'Guardião de IA', 310, false),
  ('rotinas',             'Rotinas e Rituais',      'Guardião de IA', 320, false),
  ('tarefas',             'Tarefas',                'Guardião de IA', 330, false),
  ('balanco',             'Balanço PMC',            'Acompanhamento', 400, true),
  ('niveis',              'Meu Nível',              'Acompanhamento', 410, false),
  ('vitorias',            'Central de Vitórias',    'Acompanhamento', 420, false),
  ('reunioes',            'Reuniões (Consultores)', 'Acompanhamento', 430, true),
  ('reunioes-galdino',    'Reuniões Galdino',       'Acompanhamento', 440, true),
  ('reunioes-blackcrm',   'Reuniões BlackCRM',      'Acompanhamento', 450, true),
  ('novidades',           'Novidades',              'Comunidade',     500, false),
  ('ranking-guardioes',   'Ranking dos Guardiões',  'Comunidade',     510, false),
  ('trilhas',             'Trilhas',                'Conhecimento',   600, false),
  ('estudos-caso',        'Estudos de Caso',        'Conhecimento',   610, false),
  ('multiplicadores',     'Multiplicadores',        'Conhecimento',   620, false),
  ('skills',              'Skills',                 'Conhecimento',   630, false),
  ('calendario',          'Encontros ao Vivo',      'Conhecimento',   640, false),
  ('recursos',            'Links Importantes',      'Ferramentas',    700, false),
  ('ferramentas',         'Ferramentas IA',         'Ferramentas',    710, false),
  ('prompt-supremo',      'Prompt Supremo',         'Ferramentas',    720, false),
  ('acessos-empresa',     'Time & Permissões',      'Configurações',  900, true)
on conflict (chave) do update set
  label = excluded.label, grupo = excluded.grupo,
  ordem = excluded.ordem, sensivel = excluded.sensivel;

-- ─────────────────────────────────────────────────────────────────────────────
-- 3. Template papel -> seções. O dono NÃO recebe linhas: is_full resolve, e é
--    isso que faz uma aba nova nascer visível para ele sem migration.
-- ─────────────────────────────────────────────────────────────────────────────
create table if not exists public.papel_empresa_secoes (
  papel_chave text not null references public.papeis_empresa(chave) on delete cascade,
  secao_chave text not null references public.secoes_cliente_catalogo(chave) on delete cascade,
  primary key (papel_chave, secao_chave)
);

-- Guardião: opera tudo, menos financeiro/cadastral/transcrição e a gestão.
insert into public.papel_empresa_secoes (papel_chave, secao_chave)
select 'guardiao', chave from public.secoes_cliente_catalogo
 where chave not in ('acessos-empresa','indicadores','informacoes-empresa','balanco','mapeamento')
on conflict do nothing;

-- Colaborador: execução + conhecimento; nada sensível.
insert into public.papel_empresa_secoes (papel_chave, secao_chave)
select 'colaborador', chave from public.secoes_cliente_catalogo
 where sensivel = false
on conflict do nothing;

-- ─────────────────────────────────────────────────────────────────────────────
-- 4. BACKFILL — o `papel` estava errado para quase todo dono real.
--
--    Enquanto papel só escolhia a home (/meu-dia vs /inicio), dono e colaborador
--    caíam na mesma tela e ninguém notou. Agora papel decide o que a pessoa vê,
--    então o dado precisa estar certo ANTES de qualquer policy passar a olhar
--    para ele. Medido no PROD em 2026-09-07:
--      - 235 logins são a própria empresa (auth_user_id = id_cliente). Desses,
--        233 estavam gravados como 'colaborador'.
--      - 314 das 322 empresas não tinham NENHUM dono.
-- ─────────────────────────────────────────────────────────────────────────────

-- O guard anti-vínculo-cruzado (tg_empresa_usuarios_guard) recusa inserir um
-- vínculo para quem já está em outra empresa — e é exatamente o caso de quem
-- foi convidado para uma segunda empresa antes de ganhar o self-link da sua.
-- Ele existe para impedir que alguém seja ADICIONADO a uma empresa alheia, não
-- para impedir que se registre que a pessoa é dona da própria. Desligado só
-- durante o backfill. (No PROD isto aparece em 1 caso, dois cadastros de teste
-- da mesma pessoa; sem o disable a migration aborta inteira.)
alter table public.empresa_usuarios disable trigger trg_empresa_usuarios_guard;

-- (a) O login que É a empresa é o dono dela. Preserva o único self-link marcado
--     'guardiao' de propósito, e os que já estavam corretos.
update public.empresa_usuarios
   set papel = 'dono'
 where auth_user_id = id_cliente
   and papel = 'colaborador';

-- (b) Empresas cujo login legado existe em auth.users mas nunca ganhou linha no
--     backfill de 20260720. Cria o vínculo de dono. Note que a condição olha o
--     SELF-LINK, não "a empresa não tem linha nenhuma": uma empresa que só tem
--     convidados também precisa do dono materializado.
insert into public.empresa_usuarios (auth_user_id, id_cliente, papel, criado_em, criado_por)
select e.id_cliente, e.id_cliente, 'dono', now(), null
  from public.clientes_entrada_new e
  join auth.users u on u.id = e.id_cliente
 where not exists (select 1 from public.empresa_usuarios eu
                    where eu.auth_user_id = e.id_cliente and eu.id_cliente = e.id_cliente)
on conflict (auth_user_id, id_cliente) do nothing;

-- (c) Idem para empresas que só existem em clientes_formulario (ver
--     20260831_corrige_empresas_sem_formulario.sql — as duas tabelas divergem).
insert into public.empresa_usuarios (auth_user_id, id_cliente, papel, criado_em, criado_por)
select f.id_cliente, f.id_cliente, 'dono', now(), null
  from public.clientes_formulario f
  join auth.users u on u.id = f.id_cliente
 where not exists (select 1 from public.empresa_usuarios eu
                    where eu.auth_user_id = f.id_cliente and eu.id_cliente = f.id_cliente)
on conflict (auth_user_id, id_cliente) do nothing;

-- NÃO promovemos "o vínculo mais antigo" a dono nas empresas que continuarem sem
-- nenhum: isso elegeria um funcionário qualquer por antiguidade. Para essas, o
-- fallback em minhas_secoes_cliente() (login que é a empresa => dono) cobre o
-- caso real, e a PMC ajusta pela aba /acessos.

alter table public.empresa_usuarios enable trigger trg_empresa_usuarios_guard;

-- ─────────────────────────────────────────────────────────────────────────────
-- 5. CHECK -> FK, agora que papeis_empresa existe e o dado está consistente.
--    O constraint chama-se empresa_usuarios_papel_valido (20260730_home_por_pessoa),
--    NÃO ..._papel_check: com o nome errado o `drop if exists` passa em silêncio
--    e o CHECK sobrevive, bloqueando qualquer papel novo no futuro.
-- ─────────────────────────────────────────────────────────────────────────────
alter table public.empresa_usuarios drop constraint if exists empresa_usuarios_papel_valido;
alter table public.empresa_usuarios
  add constraint empresa_usuarios_papel_fkey
  foreign key (papel) references public.papeis_empresa(chave);

comment on column public.empresa_usuarios.papel is
  'Papel na empresa (papeis_empresa). Decide a HOME e, desde 2026-09, o conjunto de seções visíveis (ver minhas_secoes_cliente).';

-- ─────────────────────────────────────────────────────────────────────────────
-- 6. RLS dos catálogos: qualquer autenticado lê (o front precisa montar a tela),
--    só super admin escreve. Mesmo padrão de secoes_catalogo.
-- ─────────────────────────────────────────────────────────────────────────────
alter table public.papeis_empresa          enable row level security;
alter table public.secoes_cliente_catalogo enable row level security;
alter table public.papel_empresa_secoes    enable row level security;

drop policy if exists papeis_empresa_read  on public.papeis_empresa;
drop policy if exists papeis_empresa_write on public.papeis_empresa;
create policy papeis_empresa_read  on public.papeis_empresa for select to authenticated using (true);
create policy papeis_empresa_write on public.papeis_empresa for all to authenticated
  using (public.is_super_admin()) with check (public.is_super_admin());

drop policy if exists secoes_cliente_read  on public.secoes_cliente_catalogo;
drop policy if exists secoes_cliente_write on public.secoes_cliente_catalogo;
create policy secoes_cliente_read  on public.secoes_cliente_catalogo for select to authenticated using (true);
create policy secoes_cliente_write on public.secoes_cliente_catalogo for all to authenticated
  using (public.is_super_admin()) with check (public.is_super_admin());

drop policy if exists papel_empresa_secoes_read  on public.papel_empresa_secoes;
drop policy if exists papel_empresa_secoes_write on public.papel_empresa_secoes;
create policy papel_empresa_secoes_read  on public.papel_empresa_secoes for select to authenticated using (true);
create policy papel_empresa_secoes_write on public.papel_empresa_secoes for all to authenticated
  using (public.is_super_admin()) with check (public.is_super_admin());

commit;
