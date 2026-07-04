-- =====================================================================
-- Rollback (down) for: 20260704_guardiao_os_schema.sql
-- Drops the RPC + all 20 guardiao_* tables. FK-safe via CASCADE.
-- Idempotent (drop ... if exists).
-- =====================================================================

drop function if exists guardiao_ensure_os(uuid);

-- Children first (though CASCADE makes order moot).
drop table if exists guardiao_feedbacks           cascade;
drop table if exists guardiao_itens_ia            cascade;
drop table if exists guardiao_sugestoes_ia        cascade;
drop table if exists guardiao_inteligencia        cascade;
drop table if exists guardiao_arsenal             cascade;
drop table if exists guardiao_apoios              cascade;
drop table if exists guardiao_evidencias          cascade;
drop table if exists guardiao_vitorias            cascade;
drop table if exists guardiao_relatorios          cascade;
drop table if exists guardiao_exemplos_cs         cascade;
drop table if exists guardiao_rituais             cascade;
drop table if exists guardiao_tarefas             cascade;
drop table if exists guardiao_projeto_registros   cascade;
drop table if exists guardiao_projetos            cascade;
drop table if exists guardiao_gargalos            cascade;
drop table if exists guardiao_tarefas_repetitivas cascade;
drop table if exists guardiao_processos_setor     cascade;
drop table if exists guardiao_setores             cascade;

-- Singletons.
drop table if exists guardiao_fases               cascade;
drop table if exists guardiao_os                  cascade;
