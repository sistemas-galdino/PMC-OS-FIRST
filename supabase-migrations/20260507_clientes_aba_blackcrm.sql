-- Adiciona campos da aba "Black CRM" da Visão Admin do cliente.
-- Todos opt-in (nullable; quantas_contas default 0). CHECKs garantem só valores válidos.

ALTER TABLE clientes_entrada_new
  ADD COLUMN IF NOT EXISTS tem_conta_blackcrm text
    CHECK (tem_conta_blackcrm IN ('sim','nao','em_definicao','em_implantacao','sem_informacao')),
  ADD COLUMN IF NOT EXISTS quantas_contas_blackcrm integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS tem_guardiao_crm text
    CHECK (tem_guardiao_crm IN ('sim','nao','pendente')),
  ADD COLUMN IF NOT EXISTS guardiao_crm_nome text,
  ADD COLUMN IF NOT EXISTS guardiao_crm_telefone text,
  ADD COLUMN IF NOT EXISTS nomes_contas_blackcrm text,
  ADD COLUMN IF NOT EXISTS blackcrm_status_conta text
    CHECK (blackcrm_status_conta IN ('nao_se_aplica','ativa','implementada','em_implementacao','cancelada','pausada')),
  ADD COLUMN IF NOT EXISTS blackcrm_status_implementacao text
    CHECK (blackcrm_status_implementacao IN ('nao_iniciado','em_andamento','implementado','travado','nao_se_aplica','sem_informacao')),
  ADD COLUMN IF NOT EXISTS blackcrm_participa_tutoria text
    CHECK (blackcrm_participa_tutoria IN ('participa','nao_participa','participa_parcialmente','pendente')),
  ADD COLUMN IF NOT EXISTS blackcrm_tem_vitorias text
    CHECK (blackcrm_tem_vitorias IN ('sim','nao','pendente')),
  ADD COLUMN IF NOT EXISTS blackcrm_vitorias_descricao text;
