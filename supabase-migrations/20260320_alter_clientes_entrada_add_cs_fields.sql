ALTER TABLE clientes_entrada_new
  ADD COLUMN IF NOT EXISTS nivel_engajamento text
    CHECK (nivel_engajamento IN (
      'cliente_novo','ativo_alto','ativo_medio',
      'desengajado','sem_onboarding','cancelado','congelado'
    )),
  ADD COLUMN IF NOT EXISTS tem_crm boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS tem_sdr boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS observacoes_cs text;
