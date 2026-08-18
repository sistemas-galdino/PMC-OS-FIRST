-- CRM (port do "PMC · CS Manager" da Mayara) — colunas novas em clientes_entrada_new.
-- Cobrem campos do tipo `Cliente` do sistema dela que ainda não existiam aqui.
-- Referência: Gestão de Clientes - PMC/src/lib/crm/types.ts

ALTER TABLE public.clientes_entrada_new
  -- Situação no programa, independente do status comercial.
  -- "Não iniciou o programa" é a pré-jornada citada na reunião (cliente que
  -- comprou mas ainda não começou) — não gera alerta de ciclo.
  ADD COLUMN IF NOT EXISTS situacao text,

  -- Guardião de IA: etapa e desde quando está nela.
  ADD COLUMN IF NOT EXISTS guardiao_ia_etapa text,
  ADD COLUMN IF NOT EXISTS guardiao_ia_etapa_desde timestamptz,

  -- Black CRM: desde quando está no status de implementação atual.
  ADD COLUMN IF NOT EXISTS blackcrm_status_impl_desde timestamptz,

  -- Área de membros: acesso liberado e último acesso registrado.
  ADD COLUMN IF NOT EXISTS area_membros_acesso_cliente boolean,
  ADD COLUMN IF NOT EXISTS area_membros_acesso_equipe boolean,
  ADD COLUMN IF NOT EXISTS area_membros_ultimo_acesso timestamptz,

  -- Pausa ("problema pessoal"): exclui o cliente dos indicadores de saúde
  -- da carteira sem cancelá-lo.
  ADD COLUMN IF NOT EXISTS pausado boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS pausado_motivo text,
  ADD COLUMN IF NOT EXISTS pausado_em timestamptz,
  ADD COLUMN IF NOT EXISTS pausado_por text,

  -- Grupo de WhatsApp vinculado (aba Atendimento).
  ADD COLUMN IF NOT EXISTS whatsapp_grupo_id text,
  ADD COLUMN IF NOT EXISTS whatsapp_grupo_nome text,

  -- Cadência de reuniões com o Galdino no ciclo (4, 6 ou 12).
  ADD COLUMN IF NOT EXISTS ciclo_galdino_cadencia integer,

  -- Marca as linhas cuja data de entrada foi inferida pelo backfill
  -- (141 clientes em PROD não tinham `data`). Ver scripts/backfill-data-entrada.
  ADD COLUMN IF NOT EXISTS data_backfilled boolean NOT NULL DEFAULT false;

COMMENT ON COLUMN public.clientes_entrada_new.situacao IS
  'Situação no programa: Não iniciou o programa | Ativo | Cancelado. Só "Ativo" tem relógio de ciclo.';
COMMENT ON COLUMN public.clientes_entrada_new.pausado IS
  'Cliente pausado (ex.: problema pessoal). Fica fora dos indicadores de saúde da carteira.';
COMMENT ON COLUMN public.clientes_entrada_new.data_backfilled IS
  'true quando clientes_entrada_new.data foi inferida pelo backfill, não informada na entrada.';

-- Índice para os filtros de ciclo/carteira do CRM.
CREATE INDEX IF NOT EXISTS clientes_entrada_new_sc_status_idx
  ON public.clientes_entrada_new (sc, status_atual);
CREATE INDEX IF NOT EXISTS clientes_entrada_new_data_idx
  ON public.clientes_entrada_new (data);

-- Helper: nome do membro do time logado (mentores.nome).
-- Usado para escopo de carteira da CS (clientes_entrada_new.sc é texto livre).
CREATE OR REPLACE FUNCTION public.crm_meu_nome()
RETURNS text
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT m.nome FROM mentores m
  WHERE m.email = (SELECT u.email FROM auth.users u WHERE u.id = auth.uid())
  LIMIT 1;
$$;

GRANT EXECUTE ON FUNCTION public.crm_meu_nome() TO authenticated;
