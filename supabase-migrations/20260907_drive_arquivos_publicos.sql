-- Ledger dos arquivos do Drive (gravações do Meet e docs do Gemini) já liberados
-- como "qualquer pessoa com o link". Evita repetir chamada à Drive API em arquivo
-- já público, dá retry limitado em quem falhou e permite auditar o que está aberto.
--
-- Sem policy de RLS: só service_role (edge functions) acessa.

create table if not exists public.drive_arquivos_publicos (
  file_id           text primary key,
  liberado_em       timestamptz,
  conta_impersonada text,
  origem            text,
  tentativas        integer not null default 0,
  ultimo_erro       text,
  atualizado_em     timestamptz not null default now()
);

comment on table public.drive_arquivos_publicos is
  'Controle de liberação pública (role=reader, type=anyone) dos arquivos do Drive vindos do Meet/Gemini.';
comment on column public.drive_arquivos_publicos.origem is
  'gravacao | geminidoc';
comment on column public.drive_arquivos_publicos.liberado_em is
  'Preenchido quando a permissão anyone existe no arquivo. Nulo = ainda falhando.';

-- Fila de retry do backfill: quem ainda não foi liberado.
create index if not exists idx_drive_arquivos_publicos_pendentes
  on public.drive_arquivos_publicos (atualizado_em)
  where liberado_em is null;

alter table public.drive_arquivos_publicos enable row level security;
