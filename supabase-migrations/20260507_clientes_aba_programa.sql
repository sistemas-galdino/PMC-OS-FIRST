-- Adiciona campos da aba "Programa" da Visão Admin do cliente.
-- Todos opt-in (nullable). CHECKs garantem que só valores válidos vão pro banco.

ALTER TABLE clientes_entrada_new
  ADD COLUMN IF NOT EXISTS tem_guardiao_ia text
    CHECK (tem_guardiao_ia IN ('sim','nao','em_definicao','em_implantacao','sem_informacao')),
  ADD COLUMN IF NOT EXISTS presenca_treinamentos text
    CHECK (presenca_treinamentos IN ('alta','media','baixa','nenhuma')),
  ADD COLUMN IF NOT EXISTS reuniao_consultores_status text
    CHECK (reuniao_consultores_status IN ('ja_fez','pendente','agendada','nao_agendada','sem_informacao')),
  ADD COLUMN IF NOT EXISTS reuniao_galdino_status text
    CHECK (reuniao_galdino_status IN ('ja_fez','pendente','agendada','nao_agendada','sem_informacao')),
  ADD COLUMN IF NOT EXISTS frequencia_grupo_whatsapp text
    CHECK (frequencia_grupo_whatsapp IN ('alta','media','baixa','nenhuma','sem_informacao')),
  ADD COLUMN IF NOT EXISTS guardiao_ia_nome text,
  ADD COLUMN IF NOT EXISTS guardiao_ia_telefone text,
  ADD COLUMN IF NOT EXISTS guardiao_ia_cargo text;
