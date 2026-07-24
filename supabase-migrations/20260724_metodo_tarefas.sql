-- Método MC — camada de operação do Guardião: Tarefas + Rotinas/Rituais.
-- Tabela única de tarefas por cliente. As 4 cadências (diária/semanal/quinzenal/
-- mensal) são constantes no front; aqui só guardamos as tarefas que elas geram
-- (via coluna `origem`) além das avulsas. RLS espelha o padrão das tabelas metodo_*:
--   (meu_id_cliente() = id_cliente) OR is_admin()
-- Multi-usuário por empresa (Fase 2) já contemplado por meu_id_cliente().

create table if not exists public.metodo_tarefas (
  id            uuid primary key default gen_random_uuid(),
  id_cliente    uuid not null,
  titulo        text not null,
  setor         text,
  projeto       text,
  responsavel   text,
  prazo         date,
  prioridade    text not null default 'media',   -- baixa | media | alta
  status        text not null default 'a_fazer',  -- a_fazer | em_andamento | concluido
  tipo          text,                             -- acompanhamento | projeto | melhoria | correcao | outro
  origem        text not null default 'avulsa',   -- rotina_diaria|rotina_semanal|rotina_quinzenal|rotina_mensal|projeto|reuniao|avulsa
  tipo_rotina   text not null default 'nao_se_aplica', -- nao_se_aplica|diaria|semanal|quinzenal|mensal
  bloqueio      text,
  ref_nome      text,   -- Referência no PMCOS (nome/item)
  ref_link      text,   -- Referência no PMCOS (link)
  observacoes   text,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

create index if not exists idx_metodo_tarefas_cliente  on public.metodo_tarefas (id_cliente);
create index if not exists idx_metodo_tarefas_origem   on public.metodo_tarefas (id_cliente, origem);
create index if not exists idx_metodo_tarefas_status   on public.metodo_tarefas (id_cliente, status);

alter table public.metodo_tarefas enable row level security;

drop policy if exists metodo_tarefas_rw on public.metodo_tarefas;
create policy metodo_tarefas_rw on public.metodo_tarefas
  for all
  using ((meu_id_cliente() = id_cliente) or is_admin())
  with check ((meu_id_cliente() = id_cliente) or is_admin());
