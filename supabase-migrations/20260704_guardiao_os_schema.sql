-- =====================================================================
-- Migration: guardiao_os_schema
-- Feature: Sistema Operacional do Guardião de IA (port into PMC OS)
-- Creates the normalized guardiao_* schema: 20 tables + 1 RPC.
-- Source of truth for columns: IA-Guardian-Hub/src/lib/store.ts (State type + entity interfaces).
--
-- Conventions:
--   * Entity tables: id uuid pk (client-provided on insert), id_cliente uuid not null,
--     snake_case entity columns, created_at/updated_at audit columns.
--   * id_cliente FK -> auth.users(id) on delete cascade (id_cliente == auth.uid()).
--   * Internal FKs (setor_id/projeto_id/gargalo_id) -> guardiao_<parent>(id) on delete set null,
--     nullable; EXCEPT guardiao_projeto_registros.projeto_id which is on delete cascade.
--   * Deeply-nested arrays/objects -> jsonb.
--   * RLS (id_cliente = auth.uid() or is_admin()), grants to authenticated, indexes per FK col.
--   * TS `criadoEm` -> created_at, `atualizadoEm`/`updatedAt` -> updated_at.
--
-- Fully idempotent (create ... if not exists, drop policy if exists / create policy).
-- =====================================================================

-- =====================================================================
-- ROOT / SINGLETONS
-- =====================================================================

-- guardiao_os: ONE row per client (PK = id_cliente == auth.uid()).
create table if not exists guardiao_os (
  id_cliente          uuid primary key references auth.users(id) on delete cascade,
  guardiao            jsonb not null default '{}'::jsonb,     -- GuardiaoPerfil
  resumo              jsonb not null default '{}'::jsonb,     -- ResumoSemana
  prompt_completo     text,
  prompts_metodologia jsonb not null default '{}'::jsonb,     -- PromptsMetodologia (Record<Fase,string>)
  modo                text not null default 'cliente',
  fase_atual          int  not null default 1,
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now()
);
alter table guardiao_os enable row level security;
drop policy if exists guardiao_os_rw on guardiao_os;
create policy guardiao_os_rw on guardiao_os for all
  using      (id_cliente = auth.uid() or is_admin())
  with check (id_cliente = auth.uid() or is_admin());
grant select, insert, update, delete on guardiao_os to authenticated;
-- id_cliente is PK -> already indexed.

-- guardiao_fases: 7 rows per client (fase 1..7). Jornada / FaseEstado.
create table if not exists guardiao_fases (
  id                  uuid primary key default gen_random_uuid(),
  id_cliente          uuid not null references auth.users(id) on delete cascade,
  fase                int not null,
  status              text,
  progresso           int not null default 0,
  observacoes         text,
  feedback_cs         text,
  checklist           jsonb not null default '{}'::jsonb,     -- Record<string,boolean>
  setores_envolvidos  jsonb not null default '[]'::jsonb,     -- string[]
  resultado_alcancado text,
  resumo_ceo          text,
  proxima_acao        text,
  data_inicio         date,
  prazo_previsto      date,
  concluida_em        timestamptz,
  unique (id_cliente, fase)
);
alter table guardiao_fases enable row level security;
drop policy if exists guardiao_fases_rw on guardiao_fases;
create policy guardiao_fases_rw on guardiao_fases for all
  using      (id_cliente = auth.uid() or is_admin())
  with check (id_cliente = auth.uid() or is_admin());
grant select, insert, update, delete on guardiao_fases to authenticated;
create index if not exists guardiao_fases_cliente_idx on guardiao_fases (id_cliente);

-- =====================================================================
-- ENTITY TABLES (18)
-- =====================================================================

-- guardiao_setores (Setor). No internal FK (this IS the setor).
create table if not exists guardiao_setores (
  id                  uuid primary key default gen_random_uuid(),
  id_cliente          uuid not null references auth.users(id) on delete cascade,
  nome                text,
  lider               text,
  guardiao            text,
  prioridade          text,
  status              text,
  frequencia          text,
  objetivo            text,
  observacoes         text,
  quantidade_pessoas  int,
  time                jsonb not null default '[]'::jsonb,     -- PessoaTime[]
  fase_atual          int,
  validacao_lider     jsonb not null default '{}'::jsonb,     -- ValidacaoLider
  validacao_ceo       jsonb not null default '{}'::jsonb,     -- ValidacaoCEO
  resumo_ceo          text,
  diagnostico         jsonb not null default '{}'::jsonb,     -- DiagnosticoSetor
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now()
);
alter table guardiao_setores enable row level security;
drop policy if exists guardiao_setores_rw on guardiao_setores;
create policy guardiao_setores_rw on guardiao_setores for all
  using      (id_cliente = auth.uid() or is_admin())
  with check (id_cliente = auth.uid() or is_admin());
grant select, insert, update, delete on guardiao_setores to authenticated;
create index if not exists guardiao_setores_cliente_idx on guardiao_setores (id_cliente);

-- guardiao_processos_setor (ProcessoSetor). FK setor_id.
create table if not exists guardiao_processos_setor (
  id                  uuid primary key default gen_random_uuid(),
  id_cliente          uuid not null references auth.users(id) on delete cascade,
  setor_id            uuid references guardiao_setores(id) on delete set null,
  nome                text,
  descricao           text,
  quem_executa        text,
  ferramentas         text,
  tem_planilha        boolean,
  gera_indicador      boolean,
  impacto             text,
  fase                int,
  created_at          timestamptz not null default now(),   -- TS criadoEm
  updated_at          timestamptz not null default now()
);
alter table guardiao_processos_setor enable row level security;
drop policy if exists guardiao_processos_setor_rw on guardiao_processos_setor;
create policy guardiao_processos_setor_rw on guardiao_processos_setor for all
  using      (id_cliente = auth.uid() or is_admin())
  with check (id_cliente = auth.uid() or is_admin());
grant select, insert, update, delete on guardiao_processos_setor to authenticated;
create index if not exists guardiao_processos_setor_cliente_idx on guardiao_processos_setor (id_cliente);
create index if not exists guardiao_processos_setor_setor_idx on guardiao_processos_setor (setor_id);

-- guardiao_tarefas_repetitivas (TarefaRepetitiva). FK setor_id; jsonb impactos.
create table if not exists guardiao_tarefas_repetitivas (
  id                       uuid primary key default gen_random_uuid(),
  id_cliente               uuid not null references auth.users(id) on delete cascade,
  setor_id                 uuid references guardiao_setores(id) on delete set null,
  nome                     text,
  descricao                text,
  quem_executa             text,
  cargo                    text,
  qtd_pessoas              int,
  frequencia               text,
  tempo_por_execucao       numeric,   -- horas
  vezes_por_periodo        int,
  tempo_semana             numeric,
  tempo_mes                numeric,
  flag_planilha            boolean,
  flag_copia_cola          boolean,
  flag_busca_manual        boolean,
  flag_resposta_repetitiva boolean,
  flag_dados               boolean,
  flag_comunicacao         boolean,
  flag_decisao_lider       boolean,
  impactos                 jsonb not null default '[]'::jsonb,   -- ImpactoTarefa[]
  created_at               timestamptz not null default now(),   -- TS criadoEm
  updated_at               timestamptz not null default now()
);
alter table guardiao_tarefas_repetitivas enable row level security;
drop policy if exists guardiao_tarefas_repetitivas_rw on guardiao_tarefas_repetitivas;
create policy guardiao_tarefas_repetitivas_rw on guardiao_tarefas_repetitivas for all
  using      (id_cliente = auth.uid() or is_admin())
  with check (id_cliente = auth.uid() or is_admin());
grant select, insert, update, delete on guardiao_tarefas_repetitivas to authenticated;
create index if not exists guardiao_tarefas_repetitivas_cliente_idx on guardiao_tarefas_repetitivas (id_cliente);
create index if not exists guardiao_tarefas_repetitivas_setor_idx on guardiao_tarefas_repetitivas (setor_id);

-- guardiao_gargalos (Gargalo). FK setor_id; jsonb impactos.
create table if not exists guardiao_gargalos (
  id                  uuid primary key default gen_random_uuid(),
  id_cliente          uuid not null references auth.users(id) on delete cascade,
  setor_id            uuid references guardiao_setores(id) on delete set null,
  processo            text,
  descricao           text,
  onde_trava          text,
  quem_executa        text,
  tempo               text,
  pessoas             text,
  ferramentas         text,
  planilha            boolean,
  retrabalho          boolean,
  dependencia         boolean,
  risco_erro          boolean,
  impactos            jsonb not null default '[]'::jsonb,   -- string[]
  frequencia          text,
  prioridade          text,
  status              text,
  analise_ia          text,
  ligado_receita      boolean,
  ligado_entrega      boolean,
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now()
);
alter table guardiao_gargalos enable row level security;
drop policy if exists guardiao_gargalos_rw on guardiao_gargalos;
create policy guardiao_gargalos_rw on guardiao_gargalos for all
  using      (id_cliente = auth.uid() or is_admin())
  with check (id_cliente = auth.uid() or is_admin());
grant select, insert, update, delete on guardiao_gargalos to authenticated;
create index if not exists guardiao_gargalos_cliente_idx on guardiao_gargalos (id_cliente);
create index if not exists guardiao_gargalos_setor_idx on guardiao_gargalos (setor_id);

-- guardiao_projetos (Projeto). FK setor_id, gargalo_id; jsonb tarefas_padrao.
create table if not exists guardiao_projetos (
  id                  uuid primary key default gen_random_uuid(),
  id_cliente          uuid not null references auth.users(id) on delete cascade,
  nome                text,
  tipo_projeto        text,
  setor_id            uuid references guardiao_setores(id) on delete set null,
  lider               text,
  guardiao            text,
  gargalo_id          uuid references guardiao_gargalos(id) on delete set null,
  problema            text,
  solucao             text,
  tipo_entrega        text,
  meta                text,
  prazo               text,   -- free text (e.g. "30 dias")
  status              text,
  resultado_esperado  text,
  resultado_alcancado text,
  horas_economizadas  numeric,
  evidencias          text,
  observacoes         text,
  precisa_apoio       boolean,
  tipo_apoio          text,
  consultor           text,
  tarefas_padrao      jsonb not null default '[]'::jsonb,   -- ProjetoTarefa[]
  fase_origem         int,
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now()    -- TS updatedAt
);
alter table guardiao_projetos enable row level security;
drop policy if exists guardiao_projetos_rw on guardiao_projetos;
create policy guardiao_projetos_rw on guardiao_projetos for all
  using      (id_cliente = auth.uid() or is_admin())
  with check (id_cliente = auth.uid() or is_admin());
grant select, insert, update, delete on guardiao_projetos to authenticated;
create index if not exists guardiao_projetos_cliente_idx on guardiao_projetos (id_cliente);
create index if not exists guardiao_projetos_setor_idx on guardiao_projetos (setor_id);
create index if not exists guardiao_projetos_gargalo_idx on guardiao_projetos (gargalo_id);

-- guardiao_projeto_registros (ProjetoRegistro). FK projeto_id ON DELETE CASCADE.
create table if not exists guardiao_projeto_registros (
  id                  uuid primary key default gen_random_uuid(),
  id_cliente          uuid not null references auth.users(id) on delete cascade,
  projeto_id          uuid references guardiao_projetos(id) on delete cascade,
  data                date,
  autor               text,
  tipo                text,
  texto               text,
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now()
);
alter table guardiao_projeto_registros enable row level security;
drop policy if exists guardiao_projeto_registros_rw on guardiao_projeto_registros;
create policy guardiao_projeto_registros_rw on guardiao_projeto_registros for all
  using      (id_cliente = auth.uid() or is_admin())
  with check (id_cliente = auth.uid() or is_admin());
grant select, insert, update, delete on guardiao_projeto_registros to authenticated;
create index if not exists guardiao_projeto_registros_cliente_idx on guardiao_projeto_registros (id_cliente);
create index if not exists guardiao_projeto_registros_projeto_idx on guardiao_projeto_registros (projeto_id);

-- guardiao_tarefas (Tarefa). FK setor_id, projeto_id, gargalo_id.
create table if not exists guardiao_tarefas (
  id                    uuid primary key default gen_random_uuid(),
  id_cliente            uuid not null references auth.users(id) on delete cascade,
  titulo                text,
  descricao             text,
  setor_id              uuid references guardiao_setores(id) on delete set null,
  projeto_id            uuid references guardiao_projetos(id) on delete set null,
  gargalo_id            uuid references guardiao_gargalos(id) on delete set null,
  lider                 text,
  responsavel           text,
  prazo                 date,
  horario               text,
  prioridade            text,
  status                text,
  tipo                  text,
  origem                text,
  tipo_rotina           text,
  recorrencia           text,
  observacoes           text,
  resultado_esperado    text,
  resultado_alcancado   text,
  evidencia             text,
  fase                  int,
  processo              text,
  evidencia_necessaria  text,
  created_at            timestamptz not null default now(),
  updated_at            timestamptz not null default now()
);
alter table guardiao_tarefas enable row level security;
drop policy if exists guardiao_tarefas_rw on guardiao_tarefas;
create policy guardiao_tarefas_rw on guardiao_tarefas for all
  using      (id_cliente = auth.uid() or is_admin())
  with check (id_cliente = auth.uid() or is_admin());
grant select, insert, update, delete on guardiao_tarefas to authenticated;
create index if not exists guardiao_tarefas_cliente_idx on guardiao_tarefas (id_cliente);
create index if not exists guardiao_tarefas_setor_idx on guardiao_tarefas (setor_id);
create index if not exists guardiao_tarefas_projeto_idx on guardiao_tarefas (projeto_id);
create index if not exists guardiao_tarefas_gargalo_idx on guardiao_tarefas (gargalo_id);

-- guardiao_rituais (Ritual). FK setor_id.
create table if not exists guardiao_rituais (
  id                  uuid primary key default gen_random_uuid(),
  id_cliente          uuid not null references auth.users(id) on delete cascade,
  data                date,
  tipo                text,
  setor_id            uuid references guardiao_setores(id) on delete set null,
  lider               text,
  status              text,
  observacoes         text,
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now()
);
alter table guardiao_rituais enable row level security;
drop policy if exists guardiao_rituais_rw on guardiao_rituais;
create policy guardiao_rituais_rw on guardiao_rituais for all
  using      (id_cliente = auth.uid() or is_admin())
  with check (id_cliente = auth.uid() or is_admin());
grant select, insert, update, delete on guardiao_rituais to authenticated;
create index if not exists guardiao_rituais_cliente_idx on guardiao_rituais (id_cliente);
create index if not exists guardiao_rituais_setor_idx on guardiao_rituais (setor_id);

-- guardiao_exemplos_cs (ExemploCS). No internal FK.
create table if not exists guardiao_exemplos_cs (
  id                  uuid primary key default gen_random_uuid(),
  id_cliente          uuid not null references auth.users(id) on delete cascade,
  titulo              text,
  dor                 text,
  processo_antes      text,
  solucao_ia          text,
  ganho_lider         text,
  status              text,
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now()
);
alter table guardiao_exemplos_cs enable row level security;
drop policy if exists guardiao_exemplos_cs_rw on guardiao_exemplos_cs;
create policy guardiao_exemplos_cs_rw on guardiao_exemplos_cs for all
  using      (id_cliente = auth.uid() or is_admin())
  with check (id_cliente = auth.uid() or is_admin());
grant select, insert, update, delete on guardiao_exemplos_cs to authenticated;
create index if not exists guardiao_exemplos_cs_cliente_idx on guardiao_exemplos_cs (id_cliente);

-- guardiao_relatorios (Relatorio). No internal FK.
create table if not exists guardiao_relatorios (
  id                  uuid primary key default gen_random_uuid(),
  id_cliente          uuid not null references auth.users(id) on delete cascade,
  periodo             text,
  conteudo            text,
  created_at          timestamptz not null default now(),   -- TS criadoEm
  updated_at          timestamptz not null default now()
);
alter table guardiao_relatorios enable row level security;
drop policy if exists guardiao_relatorios_rw on guardiao_relatorios;
create policy guardiao_relatorios_rw on guardiao_relatorios for all
  using      (id_cliente = auth.uid() or is_admin())
  with check (id_cliente = auth.uid() or is_admin());
grant select, insert, update, delete on guardiao_relatorios to authenticated;
create index if not exists guardiao_relatorios_cliente_idx on guardiao_relatorios (id_cliente);

-- guardiao_vitorias (Vitoria). FK setor_id; jsonb tipos, apoio_quem, apoio_decisivo, evidencias.
create table if not exists guardiao_vitorias (
  id                       uuid primary key default gen_random_uuid(),
  id_cliente               uuid not null references auth.users(id) on delete cascade,
  titulo                   text,
  data                     date,
  setor_id                 uuid references guardiao_setores(id) on delete set null,
  setor_nome               text,   -- denormalized snapshot
  fase                     int,
  guardiao                 text,
  lider_setor              text,
  tipos                    jsonb not null default '[]'::jsonb,   -- string[]
  gargalo_descricao        text,
  onde_travava             text,
  como_era_antes           text,
  tempo_antes              text,
  impacto_antes            text,
  solucao_descricao        text,
  tipo_solucao             text,
  nome_solucao             text,
  link_solucao             text,
  fase_solucao             int,
  setor_beneficiado        text,
  quem_usa_hoje            text,
  reducao_horas            boolean,
  horas_dia                numeric,
  horas_semana             numeric,
  horas_mes                numeric,
  ganho_eficiencia         boolean,
  percentual_eficiencia    numeric,
  reducao_custo            boolean,
  valor_custo_economizado  numeric,
  aumento_receita          boolean,
  valor_receita            text,   -- TS valorReceita: string
  melhoria_decisao         boolean,
  resumo_vitoria           text,
  teve_apoio_pmc           boolean,
  apoio_quem               jsonb not null default '[]'::jsonb,   -- string[]
  apoio_decisivo           jsonb not null default '[]'::jsonb,   -- string[]
  apoio_descricao          text,
  apoio_link               text,
  evidencias               jsonb not null default '[]'::jsonb,   -- VitoriaEvidencia[]
  observacoes              text,
  status                   text,
  no_relatorio_ceo         boolean,
  resumo_ceo               text,
  created_at               timestamptz not null default now(),   -- TS criadoEm
  updated_at               timestamptz not null default now()
);
alter table guardiao_vitorias enable row level security;
drop policy if exists guardiao_vitorias_rw on guardiao_vitorias;
create policy guardiao_vitorias_rw on guardiao_vitorias for all
  using      (id_cliente = auth.uid() or is_admin())
  with check (id_cliente = auth.uid() or is_admin());
grant select, insert, update, delete on guardiao_vitorias to authenticated;
create index if not exists guardiao_vitorias_cliente_idx on guardiao_vitorias (id_cliente);
create index if not exists guardiao_vitorias_setor_idx on guardiao_vitorias (setor_id);

-- guardiao_evidencias (Evidencia). FK setor_id.
create table if not exists guardiao_evidencias (
  id                  uuid primary key default gen_random_uuid(),
  id_cliente          uuid not null references auth.users(id) on delete cascade,
  fase                int,
  setor_id            uuid references guardiao_setores(id) on delete set null,
  tipo                text,
  titulo              text,
  link                text,
  responsavel         text,
  data                date,
  status              text,
  observacao_cs       text,
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now()
);
alter table guardiao_evidencias enable row level security;
drop policy if exists guardiao_evidencias_rw on guardiao_evidencias;
create policy guardiao_evidencias_rw on guardiao_evidencias for all
  using      (id_cliente = auth.uid() or is_admin())
  with check (id_cliente = auth.uid() or is_admin());
grant select, insert, update, delete on guardiao_evidencias to authenticated;
create index if not exists guardiao_evidencias_cliente_idx on guardiao_evidencias (id_cliente);
create index if not exists guardiao_evidencias_setor_idx on guardiao_evidencias (setor_id);

-- guardiao_apoios (Apoio). FK setor_id.
create table if not exists guardiao_apoios (
  id                  uuid primary key default gen_random_uuid(),
  id_cliente          uuid not null references auth.users(id) on delete cascade,
  fase                int,
  setor_id            uuid references guardiao_setores(id) on delete set null,
  tipo                text,
  descricao           text,
  prioridade          text,
  consultor_sugerido  text,
  link_agenda         text,
  status              text,
  created_at          timestamptz not null default now(),   -- TS criadoEm
  updated_at          timestamptz not null default now()
);
alter table guardiao_apoios enable row level security;
drop policy if exists guardiao_apoios_rw on guardiao_apoios;
create policy guardiao_apoios_rw on guardiao_apoios for all
  using      (id_cliente = auth.uid() or is_admin())
  with check (id_cliente = auth.uid() or is_admin());
grant select, insert, update, delete on guardiao_apoios to authenticated;
create index if not exists guardiao_apoios_cliente_idx on guardiao_apoios (id_cliente);
create index if not exists guardiao_apoios_setor_idx on guardiao_apoios (setor_id);

-- guardiao_arsenal (ItemArsenal). FK setor_id, projeto_id.
create table if not exists guardiao_arsenal (
  id                  uuid primary key default gen_random_uuid(),
  id_cliente          uuid not null references auth.users(id) on delete cascade,
  categoria           text,
  objetivo            text,
  setor_id            uuid references guardiao_setores(id) on delete set null,
  descricao           text,
  resultado_esperado  text,
  consultor_sugerido  text,
  link_agenda         text,
  status              text,
  evidencia           text,
  projeto_id          uuid references guardiao_projetos(id) on delete set null,
  created_at          timestamptz not null default now(),   -- TS criadoEm
  updated_at          timestamptz not null default now()
);
alter table guardiao_arsenal enable row level security;
drop policy if exists guardiao_arsenal_rw on guardiao_arsenal;
create policy guardiao_arsenal_rw on guardiao_arsenal for all
  using      (id_cliente = auth.uid() or is_admin())
  with check (id_cliente = auth.uid() or is_admin());
grant select, insert, update, delete on guardiao_arsenal to authenticated;
create index if not exists guardiao_arsenal_cliente_idx on guardiao_arsenal (id_cliente);
create index if not exists guardiao_arsenal_setor_idx on guardiao_arsenal (setor_id);
create index if not exists guardiao_arsenal_projeto_idx on guardiao_arsenal (projeto_id);

-- guardiao_inteligencia (InteligenciaSetor). FK setor_id; UNIQUE(id_cliente, setor_id).
create table if not exists guardiao_inteligencia (
  id                     uuid primary key default gen_random_uuid(),
  id_cliente             uuid not null references auth.users(id) on delete cascade,
  setor_id               uuid references guardiao_setores(id) on delete set null,
  indicadores            text,
  onde_estao_dados       text,
  existe_planilha        boolean,
  existe_dashboard       boolean,
  apresenta_indicadores  boolean,
  frequencia_analise     text,
  meta                   text,
  indicador_principal    text,
  dashboard_link         text,
  plano_acao             text,
  created_at             timestamptz not null default now(),
  updated_at             timestamptz not null default now(),
  unique (id_cliente, setor_id)
);
alter table guardiao_inteligencia enable row level security;
drop policy if exists guardiao_inteligencia_rw on guardiao_inteligencia;
create policy guardiao_inteligencia_rw on guardiao_inteligencia for all
  using      (id_cliente = auth.uid() or is_admin())
  with check (id_cliente = auth.uid() or is_admin());
grant select, insert, update, delete on guardiao_inteligencia to authenticated;
create index if not exists guardiao_inteligencia_cliente_idx on guardiao_inteligencia (id_cliente);
create index if not exists guardiao_inteligencia_setor_idx on guardiao_inteligencia (setor_id);

-- guardiao_sugestoes_ia (SugestaoIA). FK setor_id.
create table if not exists guardiao_sugestoes_ia (
  id                  uuid primary key default gen_random_uuid(),
  id_cliente          uuid not null references auth.users(id) on delete cascade,
  setor_id            uuid references guardiao_setores(id) on delete set null,
  tipo                text,
  titulo              text,
  texto               text,
  prioridade          text,
  fase_sugerida       int,
  status              text,
  created_at          timestamptz not null default now(),   -- TS criadoEm
  updated_at          timestamptz not null default now()
);
alter table guardiao_sugestoes_ia enable row level security;
drop policy if exists guardiao_sugestoes_ia_rw on guardiao_sugestoes_ia;
create policy guardiao_sugestoes_ia_rw on guardiao_sugestoes_ia for all
  using      (id_cliente = auth.uid() or is_admin())
  with check (id_cliente = auth.uid() or is_admin());
grant select, insert, update, delete on guardiao_sugestoes_ia to authenticated;
create index if not exists guardiao_sugestoes_ia_cliente_idx on guardiao_sugestoes_ia (id_cliente);
create index if not exists guardiao_sugestoes_ia_setor_idx on guardiao_sugestoes_ia (setor_id);

-- guardiao_itens_ia (ItemIANoSetor). FK setor_id.
create table if not exists guardiao_itens_ia (
  id                  uuid primary key default gen_random_uuid(),
  id_cliente          uuid not null references auth.users(id) on delete cascade,
  setor_id            uuid references guardiao_setores(id) on delete set null,
  nome                text,
  tipo                text,
  fase                int,
  responsavel         text,
  status              text,
  resultado_esperado  text,
  resultado_alcancado text,
  link                text,
  created_at          timestamptz not null default now(),   -- TS criadoEm
  updated_at          timestamptz not null default now()
);
alter table guardiao_itens_ia enable row level security;
drop policy if exists guardiao_itens_ia_rw on guardiao_itens_ia;
create policy guardiao_itens_ia_rw on guardiao_itens_ia for all
  using      (id_cliente = auth.uid() or is_admin())
  with check (id_cliente = auth.uid() or is_admin());
grant select, insert, update, delete on guardiao_itens_ia to authenticated;
create index if not exists guardiao_itens_ia_cliente_idx on guardiao_itens_ia (id_cliente);
create index if not exists guardiao_itens_ia_setor_idx on guardiao_itens_ia (setor_id);

-- guardiao_feedbacks (FeedbackLider). FK setor_id, projeto_id, gargalo_id.
create table if not exists guardiao_feedbacks (
  id                  uuid primary key default gen_random_uuid(),
  id_cliente          uuid not null references auth.users(id) on delete cascade,
  titulo              text,
  setor_id            uuid references guardiao_setores(id) on delete set null,
  lider_destinatario  text,
  fase                int,
  projeto_id          uuid references guardiao_projetos(id) on delete set null,
  gargalo_id          uuid references guardiao_gargalos(id) on delete set null,
  descricao           text,
  proxima_acao        text,
  prazo               date,
  prioridade          text,
  status              text,
  guardiao            text,
  created_at          timestamptz not null default now(),   -- TS criadoEm
  updated_at          timestamptz not null default now()    -- TS atualizadoEm
);
alter table guardiao_feedbacks enable row level security;
drop policy if exists guardiao_feedbacks_rw on guardiao_feedbacks;
create policy guardiao_feedbacks_rw on guardiao_feedbacks for all
  using      (id_cliente = auth.uid() or is_admin())
  with check (id_cliente = auth.uid() or is_admin());
grant select, insert, update, delete on guardiao_feedbacks to authenticated;
create index if not exists guardiao_feedbacks_cliente_idx on guardiao_feedbacks (id_cliente);
create index if not exists guardiao_feedbacks_setor_idx on guardiao_feedbacks (setor_id);
create index if not exists guardiao_feedbacks_projeto_idx on guardiao_feedbacks (projeto_id);
create index if not exists guardiao_feedbacks_gargalo_idx on guardiao_feedbacks (gargalo_id);

-- =====================================================================
-- RPC: guardiao_ensure_os(p_id_cliente uuid)
-- Idempotent bootstrap of the OS row + 7 fases. Authz: caller must be the
-- client itself or an admin. Default prompt text is filled client-side (kept
-- out of SQL on purpose).
-- =====================================================================
create or replace function guardiao_ensure_os(p_id_cliente uuid)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if not (p_id_cliente = auth.uid() or is_admin()) then
    raise exception 'not authorized to bootstrap guardiao_os for %', p_id_cliente
      using errcode = '42501';
  end if;

  insert into guardiao_os (id_cliente, guardiao, resumo, prompt_completo, prompts_metodologia, modo, fase_atual)
  values (p_id_cliente, '{}'::jsonb, '{}'::jsonb, null, '{}'::jsonb, 'cliente', 1)
  on conflict (id_cliente) do nothing;

  insert into guardiao_fases (id_cliente, fase, status, progresso, checklist)
  select p_id_cliente,
         f.fase,
         case when f.fase in (1, 7) then 'Não iniciada' else 'Bloqueada' end,
         0,
         '{}'::jsonb
  from generate_series(1, 7) as f(fase)
  on conflict (id_cliente, fase) do nothing;
end;
$$;

grant execute on function guardiao_ensure_os(uuid) to authenticated;
