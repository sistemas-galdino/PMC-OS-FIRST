-- Adiciona campos da aba "Comunicação" da Visão Admin do cliente.

ALTER TABLE clientes_entrada_new
  ADD COLUMN IF NOT EXISTS comunicacao_preferencia text
    CHECK (comunicacao_preferencia IN ('nao_definido','privado','grupo_individual','grupo_geral','misto')),
  ADD COLUMN IF NOT EXISTS comunicacao_canal text
    CHECK (comunicacao_canal IN ('whatsapp','ligacao','audio_whatsapp','mensagem_texto','outro')),
  ADD COLUMN IF NOT EXISTS comunicacao_restricoes text,
  ADD COLUMN IF NOT EXISTS comunicacao_resumo text;
