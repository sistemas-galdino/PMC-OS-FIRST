-- Fase 3 · Mapeamento de Gargalos — traz para dentro do Método a estrutura do
-- mapeador externo (mapeador-gargalos.multiplicadordecrescimento.com.br):
-- impactos e ferramentas como listas fechadas, prioridade, rota de solução
-- (interna / apoio PMC / em avaliação) e o registro do resultado com evidência.
--
-- Nada é destrutivo: as colunas antigas continuam (ferramentas em texto livre
-- é o que os clientes já preencheram) e os status existentes seguem válidos.

alter table metodo_gargalos
  -- O que o gargalo prejudica. Lista fechada de 12 impactos (ver src/data/gargalos.ts).
  add column if not exists impactos text[] not null default '{}',
  -- Ferramentas usadas hoje. Lista fechada; a coluna `ferramentas` (texto livre)
  -- continua para não perder o que já foi digitado antes desta versão.
  add column if not exists ferramentas_lista text[] not null default '{}',
  add column if not exists prioridade boolean not null default false,
  add column if not exists prioridade_motivo text,
  -- Como o gargalo vai ser resolvido. Null = ainda não decidido.
  add column if not exists rota text,
  add column if not exists responsavel text,
  add column if not exists especialidade text,
  add column if not exists prazo date,
  -- Resultado medido depois de implementar: horas depois, custo/mês, conversão,
  -- tipos de ganho e evidência. jsonb porque o conjunto de campos varia com o
  -- tipo de ganho — o que importa consultar (horas recuperadas) é derivado.
  add column if not exists resultado jsonb,
  add column if not exists resolvido_em date;

-- Rota: as três do mapeador. Null enquanto o cliente não decidiu.
alter table metodo_gargalos drop constraint if exists metodo_gargalos_rota_check;
alter table metodo_gargalos add constraint metodo_gargalos_rota_check
  check (rota is null or rota in ('interna', 'pmc', 'avaliacao'));

-- Status ganha as duas etapas intermediárias do mapeador. 'em_implementacao'
-- (grafia do PMC OS) e 'implementacao' (grafia do mapeador) são ambos aceitos
-- para não quebrar os registros já gravados.
alter table metodo_gargalos drop constraint if exists metodo_gargalos_status_check;
alter table metodo_gargalos add constraint metodo_gargalos_status_check
  check (status in (
    'mapeado', 'analisado', 'definindo', 'aguardando_pmc',
    'em_implementacao', 'implementacao', 'resolvido'
  ));

-- Prioridade sem motivo é permitido (o campo é opcional no mapeador), mas
-- motivo sem prioridade não faz sentido: limpa junto.
alter table metodo_gargalos drop constraint if exists metodo_gargalos_prioridade_check;
alter table metodo_gargalos add constraint metodo_gargalos_prioridade_check
  check (prioridade or prioridade_motivo is null);

-- Filtro mais comum do painel: os gargalos prioritários de um cliente.
create index if not exists metodo_gargalos_prioridade_idx
  on metodo_gargalos (id_cliente) where prioridade;
