-- CRM — histórico vivo do cliente: notas da CS, anotações internas, histórico de
-- temperatura, marcações de alerta e registro de fechamento de ciclo.
-- "esse resumo é fundamental para manter o histórico vivo e acessível para
--  qualquer pessoa que assuma o atendimento daquela carteira" (Mayara).

-- ===================== Notas / percepção da CS =====================
CREATE TABLE IF NOT EXISTS public.crm_cliente_notas (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  id_cliente uuid NOT NULL,
  texto text NOT NULL,
  autor text NOT NULL,
  criado_em timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS crm_cliente_notas_cliente_idx
  ON public.crm_cliente_notas (id_cliente, criado_em DESC);

-- ===================== Anotações internas (não visíveis ao cliente) =====================
CREATE TABLE IF NOT EXISTS public.crm_anotacoes_internas (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  id_cliente uuid NOT NULL,
  texto text NOT NULL,
  autor text NOT NULL,
  imagens text[] NOT NULL DEFAULT '{}',
  fixada boolean NOT NULL DEFAULT false,
  criado_em timestamptz NOT NULL DEFAULT now(),
  atualizado_em timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS crm_anotacoes_internas_cliente_idx
  ON public.crm_anotacoes_internas (id_cliente, criado_em DESC);

-- ===================== Histórico de temperatura =====================
CREATE TABLE IF NOT EXISTS public.crm_temperatura_historico (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  id_cliente uuid NOT NULL,
  temperatura text NOT NULL,
  motivo text,
  observacao text,
  autor text,
  data timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS crm_temperatura_historico_cliente_idx
  ON public.crm_temperatura_historico (id_cliente, data DESC);

-- ===================== Marcações de alerta =====================
-- "Acompanhando" / "Não se aplica" por cliente + alerta, para a CS silenciar
-- um alerta sem que ele suma do sistema.
CREATE TABLE IF NOT EXISTS public.crm_alerta_marcacoes (
  id_cliente uuid NOT NULL,
  alerta_id text NOT NULL,
  tipo text NOT NULL CHECK (tipo IN ('acompanhando','nao_se_aplica')),
  autor text,
  data timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (id_cliente, alerta_id)
);

-- ===================== Fechamento de ciclo =====================
-- Trava anti-duplicidade: uma atividade de fechamento por cliente + trimestre,
-- mesmo que a CS conclua ou apague a atividade depois.
CREATE TABLE IF NOT EXISTS public.crm_fechamento_ciclo (
  id_cliente uuid NOT NULL,
  trimestre smallint NOT NULL CHECK (trimestre BETWEEN 1 AND 4),
  atividade_id uuid REFERENCES public.cliente_atividades(id) ON DELETE SET NULL,
  criado_em timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (id_cliente, trimestre)
);

-- ===================== Preparação de reunião =====================
-- Checklist por reunião (relatório enviado, cliente confirmou presença…).
-- A reunião em si vive nas tabelas reunioes_* já sincronizadas do Google Calendar;
-- aqui só mora o que é do processo de CS.
CREATE TABLE IF NOT EXISTS public.crm_reuniao_preparacao (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  -- id_unico da reunião na tabela de origem (uuid ou text, por isso text aqui).
  reuniao_ref text NOT NULL,
  origem text NOT NULL CHECK (origem IN ('mentoria','galdino','blackcrm','central')),
  id_cliente uuid,
  cs_responsavel text,
  participacao_cs text NOT NULL DEFAULT 'Participa'
    CHECK (participacao_cs IN ('Participa','Nao participa')),
  responsavel_externo text,
  numero_reuniao integer,
  itens jsonb NOT NULL DEFAULT '[]'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (reuniao_ref, origem)
);
CREATE INDEX IF NOT EXISTS crm_reuniao_preparacao_cliente_idx
  ON public.crm_reuniao_preparacao (id_cliente);

-- ===================== RLS =====================
ALTER TABLE public.crm_cliente_notas         ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.crm_anotacoes_internas    ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.crm_temperatura_historico ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.crm_alerta_marcacoes      ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.crm_fechamento_ciclo      ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.crm_reuniao_preparacao    ENABLE ROW LEVEL SECURITY;

DO $$
DECLARE t text;
BEGIN
  FOREACH t IN ARRAY ARRAY[
    'crm_cliente_notas','crm_anotacoes_internas','crm_temperatura_historico',
    'crm_alerta_marcacoes','crm_fechamento_ciclo','crm_reuniao_preparacao'
  ] LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I_admin ON public.%I', t, t);
    EXECUTE format(
      'CREATE POLICY %I_admin ON public.%I FOR ALL TO authenticated
         USING (is_admin()) WITH CHECK (is_admin())', t, t);
  END LOOP;
END $$;
