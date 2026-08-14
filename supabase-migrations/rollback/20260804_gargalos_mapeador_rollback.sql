-- Rollback dos campos do mapeador na Fase 3.
-- ATENÇÃO: derruba os dados de impacto, prioridade, rota e resultado.
-- Antes de rodar, volte os status novos para os antigos, senão o CHECK original
-- não é aceito pela tabela.
update metodo_gargalos set status = 'analisado'
  where status in ('definindo', 'aguardando_pmc');
update metodo_gargalos set status = 'em_implementacao'
  where status = 'implementacao';

alter table metodo_gargalos drop constraint if exists metodo_gargalos_rota_check;
alter table metodo_gargalos drop constraint if exists metodo_gargalos_prioridade_check;
drop index if exists metodo_gargalos_prioridade_idx;

alter table metodo_gargalos
  drop column if exists impactos,
  drop column if exists ferramentas_lista,
  drop column if exists prioridade,
  drop column if exists prioridade_motivo,
  drop column if exists rota,
  drop column if exists responsavel,
  drop column if exists especialidade,
  drop column if exists prazo,
  drop column if exists resultado,
  drop column if exists resolvido_em;

alter table metodo_gargalos drop constraint if exists metodo_gargalos_status_check;
alter table metodo_gargalos add constraint metodo_gargalos_status_check
  check (status in ('mapeado', 'analisado', 'em_implementacao', 'resolvido'));
