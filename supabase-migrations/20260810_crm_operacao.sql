-- CRM — tabelas de operação do time de CS: rotinas, gargalos, projetos e materiais.
-- RLS: liberado para o time interno (is_admin() = existe linha em mentores).
-- O recorte "cada CS vê a sua carteira" é aplicado na camada de dados, não aqui,
-- porque a coordenação precisa enxergar tudo na mesma tela.

-- ===================== Rotinas (checkups da semana) =====================
-- "checkup da segunda, da quarta, da sexta, rotina quinzenal" — unificadas no CRM.
CREATE TABLE IF NOT EXISTS public.crm_rotinas (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  chave text NOT NULL UNIQUE,
  titulo text NOT NULL,
  descricao text,
  -- 0=domingo … 6=sábado; NULL para rotinas sem dia fixo.
  dia_semana smallint CHECK (dia_semana BETWEEN 0 AND 6),
  cadencia text NOT NULL DEFAULT 'semanal'
    CHECK (cadencia IN ('semanal','quinzenal','mensal','trimestral')),
  ordem integer NOT NULL DEFAULT 0,
  passos jsonb NOT NULL DEFAULT '[]'::jsonb,
  link_manual text,
  ativo boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Execução de uma rotina por uma CS numa data (o "já fiz o checkup de hoje").
CREATE TABLE IF NOT EXISTS public.crm_rotina_execucoes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  rotina_id uuid NOT NULL REFERENCES public.crm_rotinas(id) ON DELETE CASCADE,
  responsavel_cs text NOT NULL,
  data_referencia date NOT NULL,
  status text NOT NULL DEFAULT 'pendente'
    CHECK (status IN ('pendente','em_andamento','concluida','pulada')),
  observacoes text,
  concluida_em timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (rotina_id, responsavel_cs, data_referencia)
);
CREATE INDEX IF NOT EXISTS crm_rotina_execucoes_cs_data_idx
  ON public.crm_rotina_execucoes (responsavel_cs, data_referencia);

-- ===================== Gargalos =====================
-- "mapeamento de gargalo… o que tá rodando aqui dentro do setor e o que
-- precisa ser feito" — pedido da Mayara na reunião.
CREATE TABLE IF NOT EXISTS public.crm_gargalos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  area text NOT NULL,
  area_outro text,
  quem_trouxe text NOT NULL,
  quem_trouxe_outro text,
  registrado_por text NOT NULL,
  quem_vai_executar text NOT NULL,
  quem_vai_executar_outro text,
  data date NOT NULL DEFAULT current_date,
  status text NOT NULL DEFAULT 'Não iniciado'
    CHECK (status IN ('Não iniciado','Em andamento','Em teste','Realizado')),
  prioridade text NOT NULL DEFAULT 'Nenhuma'
    CHECK (prioridade IN ('Alta','Média','Baixa','Nenhuma')),
  problema text NOT NULL,
  detalhes_problema text,
  solucao text,
  detalhes_solucao text,
  pessoas_atribuidas text[] NOT NULL DEFAULT '{}',
  afeta_entrega_cliente boolean NOT NULL DEFAULT false,
  projeto_id uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS crm_gargalos_status_idx ON public.crm_gargalos (status);

-- ===================== Projetos CS =====================
CREATE TABLE IF NOT EXISTS public.crm_projetos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  titulo text NOT NULL,
  descricao text,
  gargalo_id uuid REFERENCES public.crm_gargalos(id) ON DELETE SET NULL,
  estagio text NOT NULL DEFAULT 'Backlog'
    CHECK (estagio IN ('Backlog','Em andamento','Concluído')),
  time_executor text NOT NULL,
  responsavel text,
  prazo date,
  concluido_em timestamptz,
  criado_em timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS crm_projetos_estagio_idx ON public.crm_projetos (estagio);

-- Agora que crm_projetos existe, amarra as duas pontas.
ALTER TABLE public.crm_gargalos
  DROP CONSTRAINT IF EXISTS crm_gargalos_projeto_id_fkey;
ALTER TABLE public.crm_gargalos
  ADD CONSTRAINT crm_gargalos_projeto_id_fkey
  FOREIGN KEY (projeto_id) REFERENCES public.crm_projetos(id) ON DELETE SET NULL;

ALTER TABLE public.cliente_atividades
  DROP CONSTRAINT IF EXISTS cliente_atividades_projeto_id_fkey;
ALTER TABLE public.cliente_atividades
  ADD CONSTRAINT cliente_atividades_projeto_id_fkey
  FOREIGN KEY (projeto_id) REFERENCES public.crm_projetos(id) ON DELETE SET NULL;

-- ===================== Materiais do cliente =====================
CREATE TABLE IF NOT EXISTS public.crm_materiais (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  id_cliente uuid NOT NULL,
  nome text NOT NULL,
  setor text NOT NULL,
  enviado_por text NOT NULL,
  consultor text,
  data date NOT NULL DEFAULT current_date,
  status text NOT NULL DEFAULT 'Recebido'
    CHECK (status IN ('Recebido','Em análise','Analisado','Pendente','Concluído')),
  observacao text,
  arquivo_url text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS crm_materiais_cliente_idx ON public.crm_materiais (id_cliente);

-- ===================== Manual de CS =====================
CREATE TABLE IF NOT EXISTS public.crm_manual (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nome text NOT NULL,
  link text,
  descricao text,
  responsavel text,
  status text NOT NULL DEFAULT 'ativo' CHECK (status IN ('ativo','inativo')),
  ordem integer NOT NULL DEFAULT 0,
  atualizado_em timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now()
);

-- ===================== Config por CS =====================
CREATE TABLE IF NOT EXISTS public.crm_cs_config (
  mentor_id bigint PRIMARY KEY REFERENCES public.mentores(id) ON DELETE CASCADE,
  whatsapp_numero text,
  whatsapp_grupo_id text,
  whatsapp_automacao text NOT NULL DEFAULT 'pausada'
    CHECK (whatsapp_automacao IN ('ativa','pausada')),
  whatsapp_horario_resumo time NOT NULL DEFAULT '08:00',
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- ===================== RLS =====================
ALTER TABLE public.crm_rotinas           ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.crm_rotina_execucoes  ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.crm_gargalos          ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.crm_projetos          ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.crm_materiais         ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.crm_manual            ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.crm_cs_config         ENABLE ROW LEVEL SECURITY;

DO $$
DECLARE t text;
BEGIN
  FOREACH t IN ARRAY ARRAY[
    'crm_rotinas','crm_rotina_execucoes','crm_gargalos',
    'crm_projetos','crm_materiais','crm_manual','crm_cs_config'
  ] LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I_admin ON public.%I', t, t);
    EXECUTE format(
      'CREATE POLICY %I_admin ON public.%I FOR ALL TO authenticated
         USING (is_admin()) WITH CHECK (is_admin())', t, t);
  END LOOP;
END $$;

-- ===================== Seed das rotinas =====================
INSERT INTO public.crm_rotinas (chave, titulo, descricao, dia_semana, cadencia, ordem)
VALUES
  ('checkup_segunda',  'Checkup de segunda',  'Abertura da semana: revisar carteira, atrasadas e prioridades.', 1, 'semanal',   1),
  ('checkup_quarta',   'Checkup de quarta',   'Acompanhamento no meio da semana: clientes selecionados em lote.', 3, 'semanal',  2),
  ('checkup_sexta',    'Checkup de sexta',    'Fechamento da semana: concluídas, impedidas e o que passa para a próxima.', 5, 'semanal', 3),
  ('rotina_quinzenal', 'Rotina quinzenal',    'Revisão quinzenal de saúde da carteira e temperatura.', NULL, 'quinzenal', 4)
ON CONFLICT (chave) DO NOTHING;
