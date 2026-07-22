-- =============================================================================
-- BASELINE PMC SCHEMA  (00000001_baseline_pmc_schema.sql)
-- =============================================================================
-- Baseline capturado do ambiente PROD (Supabase project hqczwextifessaztyyyk)
-- em 2026-07. Documenta o DDL de tabelas PMC que existiam no banco FORA do
-- versionamento do repositorio, permitindo reconstruir o schema do zero.
--
-- Esta migracao usa o prefixo 00000001 justamente para rodar ANTES de todas as
-- demais migracoes do repositorio. E idempotente (IF NOT EXISTS / DROP POLICY IF
-- EXISTS / blocos DO com EXCEPTION), portanto pode ser aplicada com seguranca
-- tanto num banco vazio quanto no banco atual (ja povoado).
--
-- ATENCAO: este banco e COMPARTILHADO com outro aplicativo. As tabelas abaixo
-- NAO fazem parte do PMC e foram DELIBERADAMENTE EXCLUIDAS deste baseline:
--   anuncios_motos, fipe_cache, conversations, messages, survey_* , pages,
--   rate_limits, modelos_monitorados, alertas_enviados
--
-- Dependencias externas assumidas (fornecidas fora deste baseline): o schema
-- "auth" do Supabase (auth.users, auth.uid(), auth.jwt(), auth.email()) e a
-- funcao public.is_admin(). As politicas RLS abaixo referenciam esses objetos.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 1) SEQUENCES (referenciadas em DEFAULT nextval das tabelas-alvo)
-- -----------------------------------------------------------------------------
CREATE SEQUENCE IF NOT EXISTS public.clientes_entrada_new_id_entrada_seq AS bigint;
CREATE SEQUENCE IF NOT EXISTS public.configuracoes_links_id_seq AS integer;

-- -----------------------------------------------------------------------------
-- 2) TABLES
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.clientes_entrada_new (
    id_cliente uuid DEFAULT gen_random_uuid(),
    data date,
    canal_de_venda text,
    tempo_contrato integer,
    estado_uf text,
    unidade_treinamento text,
    produto text,
    nome_cliente text,
    nome_empresa text,
    status_atual text,
    telefone text,
    sc text,
    nicho text,
    subnicho text,
    motivo_cancelamento text,
    cnpj text,
    id_entrada bigint DEFAULT nextval('clientes_entrada_new_id_entrada_seq'::regclass) NOT NULL,
    nome_cliente_formatado text,
    nome_empresa_formatado text,
    codigo_cliente bigint,
    origem text,
    nivel_engajamento text,
    tem_crm boolean DEFAULT false,
    tem_sdr boolean DEFAULT false,
    observacoes_cs text,
    nivel_multiplicador text,
    created_at timestamp with time zone DEFAULT now(),
    ano_treinamento integer,
    mes_treinamento text,
    saude_cliente text,
    em_risco_cancelamento boolean DEFAULT false NOT NULL,
    temperatura_cliente text,
    tem_guardiao_ia text,
    presenca_treinamentos text,
    reuniao_consultores_status text,
    reuniao_galdino_status text,
    frequencia_grupo_whatsapp text,
    guardiao_ia_nome text,
    guardiao_ia_telefone text,
    guardiao_ia_cargo text,
    tem_conta_blackcrm text,
    quantas_contas_blackcrm integer DEFAULT 0 NOT NULL,
    tem_guardiao_crm text,
    guardiao_crm_nome text,
    guardiao_crm_telefone text,
    nomes_contas_blackcrm text,
    blackcrm_status_conta text,
    blackcrm_status_implementacao text,
    blackcrm_participa_tutoria text,
    blackcrm_tem_vitorias text,
    blackcrm_vitorias_descricao text,
    renovacao_data date,
    renovacao_valor numeric(12,2),
    renovacao_status text,
    renovacao_observacoes text,
    comunicacao_preferencia text,
    comunicacao_canal text,
    comunicacao_restricoes text,
    comunicacao_resumo text,
    moeda text DEFAULT 'BRL'::text NOT NULL,
    pais text DEFAULT 'BR'::text NOT NULL,
    avatar_url text,
    link_grupo_whatsapp text,
    data_cancelamento date
);

CREATE TABLE IF NOT EXISTS public.clientes_formulario (
    id_cliente uuid DEFAULT gen_random_uuid() NOT NULL,
    contrato_emitido_para text,
    created_at timestamp with time zone DEFAULT now(),
    canal_venda text,
    produto text,
    tempo_contrato_meses integer,
    mes_treinamento text,
    ano_treinamento integer,
    unidade text,
    empresa_nome text,
    nicho text,
    estado text,
    site text,
    instagram text[],
    descricao text,
    numero_funcionarios text,
    cargos_gestao text,
    faturamento_atual text,
    meta_faturamento_12_meses numeric,
    referencia_posicionamento text,
    cpf text,
    cnpj text,
    razao_social text,
    nome text,
    genero text,
    email text,
    telefone text,
    data_nascimento date,
    estado_civil text,
    faixa_etaria text,
    formacao_academica text,
    nacionalidade text,
    profissao text,
    endereco text,
    desafios text,
    motivo_impedimento text,
    como_conheceu text,
    motivo_entrada text,
    entregas_determinantes text,
    resultado_desejado text,
    ajuda_3_meses text,
    nome_empresa_formatado text,
    nome_cliente_formatado text,
    codigo_cliente integer NOT NULL
);

CREATE TABLE IF NOT EXISTS public.mentores (
    id bigint GENERATED BY DEFAULT AS IDENTITY NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    nome text,
    foco text,
    email text
);

CREATE TABLE IF NOT EXISTS public.configuracoes_links (
    id integer DEFAULT nextval('configuracoes_links_id_seq'::regclass) NOT NULL,
    chave text NOT NULL,
    label text NOT NULL,
    descricao text,
    url text DEFAULT ''::text NOT NULL,
    ativo boolean DEFAULT true,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.reunioes_galdino (
    id_unico uuid DEFAULT gen_random_uuid() NOT NULL,
    id_reuniao text,
    data_reuniao date,
    horario time without time zone,
    mes integer,
    semana integer,
    inicio_semana date,
    fim_semana date,
    ano integer,
    empresa text,
    pessoa text,
    nome_empresa_formatado text,
    nome_cliente_formatado text,
    codigo_cliente integer,
    id_cliente uuid,
    nps integer,
    cliente_compareceu boolean,
    transcricao text,
    resumo text,
    acoes_cliente jsonb,
    link_gravacao text,
    link_geminidoc text,
    metodo_match text,
    status_match text,
    created_at timestamp with time zone DEFAULT now(),
    detalhes_reuniao text,
    acoes_mentor jsonb,
    ganho text,
    cliente_email text,
    cliente_telefone text,
    link_meet text,
    duracao_minutos integer,
    status_agendamento text,
    criado_via text,
    updated_at timestamp with time zone,
    observacoes text
);

CREATE TABLE IF NOT EXISTS public.reunioes_mentoria (
    id_unico uuid DEFAULT gen_random_uuid() NOT NULL,
    mes integer,
    semana integer,
    mentor text,
    empresa text,
    pessoa text,
    data_reuniao date,
    cliente_compareceu boolean,
    nps integer,
    inicio_semana date,
    fim_semana date,
    transcricao text,
    resumo text,
    acoes_cliente jsonb,
    ganho text,
    cnpj text,
    id_reuniao text,
    created_at timestamp with time zone DEFAULT now(),
    ano numeric,
    horario time without time zone,
    acoes_mentor jsonb,
    id_cliente uuid,
    nome_empresa_formatado text,
    codigo_cliente integer,
    nome_cliente_formatado text
);

CREATE TABLE IF NOT EXISTS public.reunioes_mentoria_new (
    id_unico uuid DEFAULT gen_random_uuid() NOT NULL,
    mes integer,
    semana integer,
    mentor text,
    empresa text,
    pessoa text,
    data_reuniao date,
    cliente_compareceu boolean,
    nps integer,
    inicio_semana date,
    fim_semana date,
    transcricao text,
    resumo text,
    acoes_cliente jsonb,
    ganho text,
    cnpj text,
    id_reuniao text,
    created_at timestamp with time zone DEFAULT now(),
    ano numeric,
    horario time without time zone,
    acoes_mentor jsonb,
    id_cliente uuid,
    nome_empresa_formatado text,
    codigo_cliente integer,
    nome_cliente_formatado text,
    link_gravacao text,
    link_geminidoc text,
    gravada boolean,
    tem_transcricao boolean,
    cliente_email text,
    cliente_telefone text,
    link_meet text,
    duracao_minutos integer,
    status_agendamento text,
    criado_via text,
    updated_at timestamp with time zone,
    observacoes text
);

CREATE TABLE IF NOT EXISTS public.cliente_anexos (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    id_cliente uuid NOT NULL,
    titulo text,
    descricao text,
    tipo text,
    arquivo_url text,
    enviado_por text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE IF NOT EXISTS public.cliente_canais (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    id_cliente uuid,
    nome text NOT NULL,
    tipo text,
    investimento numeric(10,2) DEFAULT 0.00,
    leads_mes integer DEFAULT 0,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.cliente_colaboradores (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    id_cliente uuid NOT NULL,
    nome text NOT NULL,
    cargo text NOT NULL,
    whatsapp text,
    setor text NOT NULL,
    guardiao_ia boolean DEFAULT false NOT NULL,
    guardiao_crm boolean DEFAULT false NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    nivel text
);

CREATE TABLE IF NOT EXISTS public.cliente_diagnostico_inicial (
    id_cliente uuid NOT NULL,
    dor_1 text,
    dor_2 text,
    dor_3 text,
    objetivo_1 text,
    objetivo_2 text,
    objetivo_3 text,
    area_principal text,
    resumo_cenario_inicial text,
    fontes text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    validacao_status text DEFAULT 'Pendente'::text,
    validado_por text,
    validado_em timestamp with time zone
);

CREATE TABLE IF NOT EXISTS public.cliente_empresas (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    id_cliente uuid,
    nome_empresa text NOT NULL,
    nome_empresa_formatado text,
    cnpj text,
    nicho text,
    subnicho text,
    is_principal boolean DEFAULT false,
    created_at timestamp with time zone DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.cliente_evidencias_pendentes (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    id_cliente uuid NOT NULL,
    vitoria_id uuid,
    vitoria text,
    periodo text,
    onde_mencionada text,
    evidencia_necessaria text,
    quem_pode_coletar text,
    acao_recomendada text,
    prioridade text,
    status text DEFAULT 'Em aberto'::text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    evidencia_arquivo_url text
);

CREATE TABLE IF NOT EXISTS public.cliente_metas (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    id_cliente uuid,
    faturamento_anual_objetivo numeric(15,2),
    faturamento_mensal_objetivo numeric(15,2),
    meta_2026 numeric(15,2),
    colaboradores_total integer DEFAULT 0,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    numero_funcionarios integer DEFAULT 0,
    numero_gestores integer DEFAULT 0,
    principais_desafios text,
    como_ajudar text,
    resultados_esperados text,
    entregas_decisivas text,
    usa_crm boolean,
    crm_atual text,
    vai_usar_black_crm boolean
);

CREATE TABLE IF NOT EXISTS public.cliente_onboarding (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    id_cliente uuid NOT NULL,
    step_atual integer DEFAULT 1 NOT NULL,
    status text DEFAULT 'em_andamento'::text NOT NULL,
    nome_completo text,
    genero text,
    email text,
    data_nascimento text,
    endereco text,
    cep text,
    whatsapp text,
    estado_civil text,
    faixa_etaria text,
    formacao_academica text,
    uf text,
    empresa_nome text,
    nicho text,
    descricao_negocio text,
    site text,
    instagram text,
    faturamento_anual text,
    numero_funcionarios text,
    numero_gestores text,
    desafios text,
    motivo_nao_superou text,
    referencias_posicionamento text,
    meta_12_meses text,
    expectativas text,
    motivo_impedimento text,
    como_conheceu text,
    motivo_entrada text,
    tres_entregas text,
    resultado_final text,
    expectativa_galdino text,
    tipo_pessoa text,
    razao_social text,
    nacionalidade text,
    email_representante text,
    telefone_representante text,
    profissao text,
    cpf text,
    cnpj text,
    ia_kpis boolean,
    ia_dashboard boolean,
    ia_processos boolean,
    ia_agentes boolean,
    ia_sistema boolean,
    ia_interesses text[],
    ia_outro text,
    nivel_ia integer,
    enviado_em timestamp with time zone,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    senha_definida boolean DEFAULT false NOT NULL,
    pais text DEFAULT 'BR'::text NOT NULL
);

CREATE TABLE IF NOT EXISTS public.cliente_pilar_evidencias (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    id_cliente uuid NOT NULL,
    pilar_id text NOT NULL,
    campos jsonb DEFAULT '{}'::jsonb NOT NULL,
    arquivos jsonb DEFAULT '[]'::jsonb NOT NULL,
    comentario text,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.cliente_produtos (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    id_cliente uuid,
    nome text NOT NULL,
    preco numeric(10,2) DEFAULT 0.00,
    tipo text,
    vendas_mes integer DEFAULT 0,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    ticket_medio numeric,
    classificacao_ticket text
);

CREATE TABLE IF NOT EXISTS public.cliente_renovacao (
    id_cliente uuid NOT NULL,
    estado_atual text,
    mes_inicio text,
    data_renovacao date,
    probabilidade_renovacao text,
    observacao text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    status_renovacao text
);

CREATE TABLE IF NOT EXISTS public.cliente_trilha_evidencias (
    id_cliente uuid NOT NULL,
    tarefa_id text NOT NULL,
    comentario text,
    evidencia_link text,
    evidencia_url text,
    concluida boolean DEFAULT false NOT NULL,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.cliente_ultima_interacao (
    id_cliente uuid NOT NULL,
    data_interacao date,
    tipo_interacao text,
    responsavel text,
    participantes text,
    tema text,
    principais_pontos text,
    proximos_passos text,
    pendencias_cliente text,
    pendencias_time text,
    status_atual text,
    fonte text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    validacao_status text DEFAULT 'Pendente'::text,
    validado_por text,
    validado_em timestamp with time zone
);

CREATE TABLE IF NOT EXISTS public.cliente_visao_csc (
    id_cliente uuid NOT NULL,
    cs_responsavel text,
    visao_geral text,
    percepcao_relacionamento text,
    pontos_atencao text,
    nivel_engajamento text,
    sinais_positivos text,
    sinais_risco text,
    info_renovacao text,
    pendencias_percebidas text,
    proxima_acao_sugerida text,
    diagnostico_atual text,
    diagnostico_justificativa text,
    diagnostico_evidencias text,
    oportunidades_renovacao text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE IF NOT EXISTS public.cliente_vitorias (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    id_cliente uuid NOT NULL,
    titulo text NOT NULL,
    area text NOT NULL,
    origem text NOT NULL,
    gargalo_antes text NOT NULL,
    o_que_fez text NOT NULL,
    como_esta_agora text NOT NULL,
    valor_antes numeric,
    valor_depois numeric,
    qtd_antes numeric,
    qtd_depois numeric,
    data_vitoria date NOT NULL,
    evidencia_link text,
    evidencia_url text,
    created_at timestamp with time zone DEFAULT now(),
    relatada_para text,
    evidencia_status text,
    evidencia_tipo text,
    evidencia_local text,
    onde_citada text,
    uso_renovacao text,
    data_registro date,
    updated_at timestamp with time zone DEFAULT now(),
    validacao_status text DEFAULT 'Pendente'::text,
    validado_por text,
    validado_em timestamp with time zone,
    tem_evidencia boolean,
    evidencia_acao_recomendada text,
    evidencia_quem_coleta text,
    evidencia_prioridade text
);

CREATE TABLE IF NOT EXISTS public.cs_acompanhamento (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    id_entrada bigint,
    codigo_cliente bigint,
    nome_cliente text,
    nome_empresa text,
    cs_responsavel text,
    semana_inicio date NOT NULL,
    respondeu_whatsapp boolean DEFAULT false,
    implementou_acao boolean DEFAULT false,
    participou_encontro boolean DEFAULT false,
    semanas_sem_resposta integer DEFAULT 0,
    nivel_escalada text DEFAULT 'nenhuma'::text,
    observacao text,
    plano_acao_semana text,
    proximo_passo text,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.cs_evidencias (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    id_entrada bigint,
    codigo_cliente bigint,
    nome_cliente text,
    nome_empresa text,
    cs_responsavel text,
    semana_inicio date NOT NULL,
    descricao text,
    tipo text DEFAULT 'implementacao'::text,
    created_at timestamp with time zone DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.trilha_links (
    tarefa_id text NOT NULL,
    link_url text NOT NULL,
    updated_by uuid,
    updated_at timestamp with time zone DEFAULT now()
);

-- -----------------------------------------------------------------------------
-- 3) CONSTRAINTS (PK / UNIQUE / CHECK / FK) - idempotentes via DO-block
-- -----------------------------------------------------------------------------
DO $do$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'clientes_entrada_new_pkey' AND conrelid = 'public.clientes_entrada_new'::regclass) THEN
    ALTER TABLE public.clientes_entrada_new ADD CONSTRAINT clientes_entrada_new_pkey PRIMARY KEY (id_entrada);
  END IF;
END $do$;

DO $do$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'clientes_entrada_new_blackcrm_participa_tutoria_check' AND conrelid = 'public.clientes_entrada_new'::regclass) THEN
    ALTER TABLE public.clientes_entrada_new ADD CONSTRAINT clientes_entrada_new_blackcrm_participa_tutoria_check CHECK ((blackcrm_participa_tutoria = ANY (ARRAY['participa'::text, 'nao_participa'::text, 'participa_parcialmente'::text, 'pendente'::text])));
  END IF;
END $do$;

DO $do$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'clientes_entrada_new_blackcrm_status_conta_check' AND conrelid = 'public.clientes_entrada_new'::regclass) THEN
    ALTER TABLE public.clientes_entrada_new ADD CONSTRAINT clientes_entrada_new_blackcrm_status_conta_check CHECK ((blackcrm_status_conta = ANY (ARRAY['nao_se_aplica'::text, 'ativa'::text, 'implementada'::text, 'em_implementacao'::text, 'cancelada'::text, 'pausada'::text])));
  END IF;
END $do$;

DO $do$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'clientes_entrada_new_blackcrm_status_implementacao_check' AND conrelid = 'public.clientes_entrada_new'::regclass) THEN
    ALTER TABLE public.clientes_entrada_new ADD CONSTRAINT clientes_entrada_new_blackcrm_status_implementacao_check CHECK ((blackcrm_status_implementacao = ANY (ARRAY['nao_iniciado'::text, 'em_andamento'::text, 'implementado'::text, 'travado'::text, 'nao_se_aplica'::text, 'sem_informacao'::text])));
  END IF;
END $do$;

DO $do$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'clientes_entrada_new_blackcrm_tem_vitorias_check' AND conrelid = 'public.clientes_entrada_new'::regclass) THEN
    ALTER TABLE public.clientes_entrada_new ADD CONSTRAINT clientes_entrada_new_blackcrm_tem_vitorias_check CHECK ((blackcrm_tem_vitorias = ANY (ARRAY['sim'::text, 'nao'::text, 'pendente'::text])));
  END IF;
END $do$;

DO $do$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'clientes_entrada_new_comunicacao_canal_check' AND conrelid = 'public.clientes_entrada_new'::regclass) THEN
    ALTER TABLE public.clientes_entrada_new ADD CONSTRAINT clientes_entrada_new_comunicacao_canal_check CHECK ((comunicacao_canal = ANY (ARRAY['whatsapp'::text, 'ligacao'::text, 'audio_whatsapp'::text, 'mensagem_texto'::text, 'outro'::text])));
  END IF;
END $do$;

DO $do$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'clientes_entrada_new_comunicacao_preferencia_check' AND conrelid = 'public.clientes_entrada_new'::regclass) THEN
    ALTER TABLE public.clientes_entrada_new ADD CONSTRAINT clientes_entrada_new_comunicacao_preferencia_check CHECK ((comunicacao_preferencia = ANY (ARRAY['nao_definido'::text, 'privado'::text, 'grupo_individual'::text, 'grupo_geral'::text, 'misto'::text])));
  END IF;
END $do$;

DO $do$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'clientes_entrada_new_frequencia_grupo_whatsapp_check' AND conrelid = 'public.clientes_entrada_new'::regclass) THEN
    ALTER TABLE public.clientes_entrada_new ADD CONSTRAINT clientes_entrada_new_frequencia_grupo_whatsapp_check CHECK ((frequencia_grupo_whatsapp = ANY (ARRAY['alta'::text, 'media'::text, 'baixa'::text, 'nenhuma'::text, 'sem_informacao'::text])));
  END IF;
END $do$;

DO $do$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'clientes_entrada_new_moeda_check' AND conrelid = 'public.clientes_entrada_new'::regclass) THEN
    ALTER TABLE public.clientes_entrada_new ADD CONSTRAINT clientes_entrada_new_moeda_check CHECK ((moeda = ANY (ARRAY['BRL'::text, 'USD'::text])));
  END IF;
END $do$;

DO $do$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'clientes_entrada_new_nivel_engajamento_check' AND conrelid = 'public.clientes_entrada_new'::regclass) THEN
    ALTER TABLE public.clientes_entrada_new ADD CONSTRAINT clientes_entrada_new_nivel_engajamento_check CHECK ((nivel_engajamento = ANY (ARRAY['cliente_novo'::text, 'ativo_alto'::text, 'ativo_medio'::text, 'desengajado'::text, 'sem_onboarding'::text, 'cancelado'::text, 'congelado'::text])));
  END IF;
END $do$;

DO $do$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'clientes_entrada_new_pais_check' AND conrelid = 'public.clientes_entrada_new'::regclass) THEN
    ALTER TABLE public.clientes_entrada_new ADD CONSTRAINT clientes_entrada_new_pais_check CHECK ((pais = ANY (ARRAY['BR'::text, 'US'::text])));
  END IF;
END $do$;

DO $do$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'clientes_entrada_new_presenca_treinamentos_check' AND conrelid = 'public.clientes_entrada_new'::regclass) THEN
    ALTER TABLE public.clientes_entrada_new ADD CONSTRAINT clientes_entrada_new_presenca_treinamentos_check CHECK ((presenca_treinamentos = ANY (ARRAY['alta'::text, 'media'::text, 'baixa'::text, 'nenhuma'::text])));
  END IF;
END $do$;

DO $do$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'clientes_entrada_new_renovacao_status_check' AND conrelid = 'public.clientes_entrada_new'::regclass) THEN
    ALTER TABLE public.clientes_entrada_new ADD CONSTRAINT clientes_entrada_new_renovacao_status_check CHECK ((renovacao_status = ANY (ARRAY['ainda_distante'::text, 'em_negociacao'::text, 'confirmada'::text, 'recusada'::text, 'em_risco'::text])));
  END IF;
END $do$;

DO $do$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'clientes_entrada_new_reuniao_consultores_status_check' AND conrelid = 'public.clientes_entrada_new'::regclass) THEN
    ALTER TABLE public.clientes_entrada_new ADD CONSTRAINT clientes_entrada_new_reuniao_consultores_status_check CHECK ((reuniao_consultores_status = ANY (ARRAY['ja_fez'::text, 'pendente'::text, 'agendada'::text, 'nao_agendada'::text, 'sem_informacao'::text])));
  END IF;
END $do$;

DO $do$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'clientes_entrada_new_reuniao_galdino_status_check' AND conrelid = 'public.clientes_entrada_new'::regclass) THEN
    ALTER TABLE public.clientes_entrada_new ADD CONSTRAINT clientes_entrada_new_reuniao_galdino_status_check CHECK ((reuniao_galdino_status = ANY (ARRAY['ja_fez'::text, 'pendente'::text, 'agendada'::text, 'nao_agendada'::text, 'sem_informacao'::text])));
  END IF;
END $do$;

DO $do$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'clientes_entrada_new_saude_cliente_check' AND conrelid = 'public.clientes_entrada_new'::regclass) THEN
    ALTER TABLE public.clientes_entrada_new ADD CONSTRAINT clientes_entrada_new_saude_cliente_check CHECK ((saude_cliente = ANY (ARRAY['saudavel'::text, 'atencao'::text, 'critico'::text])));
  END IF;
END $do$;

DO $do$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'clientes_entrada_new_tem_conta_blackcrm_check' AND conrelid = 'public.clientes_entrada_new'::regclass) THEN
    ALTER TABLE public.clientes_entrada_new ADD CONSTRAINT clientes_entrada_new_tem_conta_blackcrm_check CHECK ((tem_conta_blackcrm = ANY (ARRAY['sim'::text, 'nao'::text, 'em_definicao'::text, 'em_implantacao'::text, 'sem_informacao'::text])));
  END IF;
END $do$;

DO $do$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'clientes_entrada_new_tem_guardiao_crm_check' AND conrelid = 'public.clientes_entrada_new'::regclass) THEN
    ALTER TABLE public.clientes_entrada_new ADD CONSTRAINT clientes_entrada_new_tem_guardiao_crm_check CHECK ((tem_guardiao_crm = ANY (ARRAY['sim'::text, 'nao'::text, 'pendente'::text])));
  END IF;
END $do$;

DO $do$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'clientes_entrada_new_tem_guardiao_ia_check' AND conrelid = 'public.clientes_entrada_new'::regclass) THEN
    ALTER TABLE public.clientes_entrada_new ADD CONSTRAINT clientes_entrada_new_tem_guardiao_ia_check CHECK ((tem_guardiao_ia = ANY (ARRAY['sim'::text, 'nao'::text, 'em_definicao'::text, 'em_implantacao'::text, 'sem_informacao'::text])));
  END IF;
END $do$;

DO $do$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'clientes_entrada_new_temperatura_cliente_check' AND conrelid = 'public.clientes_entrada_new'::regclass) THEN
    ALTER TABLE public.clientes_entrada_new ADD CONSTRAINT clientes_entrada_new_temperatura_cliente_check CHECK ((temperatura_cliente = ANY (ARRAY['quente'::text, 'morno'::text, 'frio'::text])));
  END IF;
END $do$;

DO $do$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'clientes_pkey' AND conrelid = 'public.clientes_formulario'::regclass) THEN
    ALTER TABLE public.clientes_formulario ADD CONSTRAINT clientes_pkey PRIMARY KEY (id_cliente);
  END IF;
END $do$;

DO $do$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'clientes_formulario_codigo_cliente_unique' AND conrelid = 'public.clientes_formulario'::regclass) THEN
    ALTER TABLE public.clientes_formulario ADD CONSTRAINT clientes_formulario_codigo_cliente_unique UNIQUE (codigo_cliente);
  END IF;
END $do$;

DO $do$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'mentores_pkey' AND conrelid = 'public.mentores'::regclass) THEN
    ALTER TABLE public.mentores ADD CONSTRAINT mentores_pkey PRIMARY KEY (id);
  END IF;
END $do$;

DO $do$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'mentores_email_key' AND conrelid = 'public.mentores'::regclass) THEN
    ALTER TABLE public.mentores ADD CONSTRAINT mentores_email_key UNIQUE (email);
  END IF;
END $do$;

DO $do$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'configuracoes_links_pkey' AND conrelid = 'public.configuracoes_links'::regclass) THEN
    ALTER TABLE public.configuracoes_links ADD CONSTRAINT configuracoes_links_pkey PRIMARY KEY (id);
  END IF;
END $do$;

DO $do$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'configuracoes_links_chave_key' AND conrelid = 'public.configuracoes_links'::regclass) THEN
    ALTER TABLE public.configuracoes_links ADD CONSTRAINT configuracoes_links_chave_key UNIQUE (chave);
  END IF;
END $do$;

DO $do$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'reunioes_galdino_pkey' AND conrelid = 'public.reunioes_galdino'::regclass) THEN
    ALTER TABLE public.reunioes_galdino ADD CONSTRAINT reunioes_galdino_pkey PRIMARY KEY (id_unico);
  END IF;
END $do$;

DO $do$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'reunioes_galdino_id_reuniao_unique' AND conrelid = 'public.reunioes_galdino'::regclass) THEN
    ALTER TABLE public.reunioes_galdino ADD CONSTRAINT reunioes_galdino_id_reuniao_unique UNIQUE (id_reuniao);
  END IF;
END $do$;

DO $do$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'reunioes_galdino_criado_via_check' AND conrelid = 'public.reunioes_galdino'::regclass) THEN
    ALTER TABLE public.reunioes_galdino ADD CONSTRAINT reunioes_galdino_criado_via_check CHECK (((criado_via IS NULL) OR (criado_via = ANY (ARRAY['agendamento_publico'::text, 'sync_google'::text]))));
  END IF;
END $do$;

DO $do$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'reunioes_galdino_status_agendamento_check' AND conrelid = 'public.reunioes_galdino'::regclass) THEN
    ALTER TABLE public.reunioes_galdino ADD CONSTRAINT reunioes_galdino_status_agendamento_check CHECK (((status_agendamento IS NULL) OR (status_agendamento = ANY (ARRAY['pendente_sync'::text, 'confirmado'::text, 'cancelado'::text, 'realizado'::text]))));
  END IF;
END $do$;

DO $do$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'reunioes_mentoria_pkey' AND conrelid = 'public.reunioes_mentoria'::regclass) THEN
    ALTER TABLE public.reunioes_mentoria ADD CONSTRAINT reunioes_mentoria_pkey PRIMARY KEY (id_unico);
  END IF;
END $do$;

DO $do$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'reunioes_mentoria_id_cliente_fkey' AND conrelid = 'public.reunioes_mentoria'::regclass) THEN
    ALTER TABLE public.reunioes_mentoria ADD CONSTRAINT reunioes_mentoria_id_cliente_fkey FOREIGN KEY (id_cliente) REFERENCES clientes_formulario(id_cliente);
  END IF;
END $do$;

DO $do$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'reunioes_mentoria_new_pkey' AND conrelid = 'public.reunioes_mentoria_new'::regclass) THEN
    ALTER TABLE public.reunioes_mentoria_new ADD CONSTRAINT reunioes_mentoria_new_pkey PRIMARY KEY (id_unico);
  END IF;
END $do$;

DO $do$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'reunioes_mentoria_new_criado_via_check' AND conrelid = 'public.reunioes_mentoria_new'::regclass) THEN
    ALTER TABLE public.reunioes_mentoria_new ADD CONSTRAINT reunioes_mentoria_new_criado_via_check CHECK (((criado_via IS NULL) OR (criado_via = ANY (ARRAY['agendamento_publico'::text, 'sync_google'::text]))));
  END IF;
END $do$;

DO $do$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'reunioes_mentoria_new_status_agendamento_check' AND conrelid = 'public.reunioes_mentoria_new'::regclass) THEN
    ALTER TABLE public.reunioes_mentoria_new ADD CONSTRAINT reunioes_mentoria_new_status_agendamento_check CHECK (((status_agendamento IS NULL) OR (status_agendamento = ANY (ARRAY['pendente_sync'::text, 'confirmado'::text, 'cancelado'::text, 'realizado'::text]))));
  END IF;
END $do$;

DO $do$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'reunioes_mentoria_new_id_cliente_fkey' AND conrelid = 'public.reunioes_mentoria_new'::regclass) THEN
    ALTER TABLE public.reunioes_mentoria_new ADD CONSTRAINT reunioes_mentoria_new_id_cliente_fkey FOREIGN KEY (id_cliente) REFERENCES clientes_formulario(id_cliente);
  END IF;
END $do$;

DO $do$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'cliente_anexos_pkey' AND conrelid = 'public.cliente_anexos'::regclass) THEN
    ALTER TABLE public.cliente_anexos ADD CONSTRAINT cliente_anexos_pkey PRIMARY KEY (id);
  END IF;
END $do$;

DO $do$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'cliente_canais_pkey' AND conrelid = 'public.cliente_canais'::regclass) THEN
    ALTER TABLE public.cliente_canais ADD CONSTRAINT cliente_canais_pkey PRIMARY KEY (id);
  END IF;
END $do$;

DO $do$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'cliente_canais_tipo_check' AND conrelid = 'public.cliente_canais'::regclass) THEN
    ALTER TABLE public.cliente_canais ADD CONSTRAINT cliente_canais_tipo_check CHECK ((tipo = ANY (ARRAY['Pago'::text, 'Orgânico'::text])));
  END IF;
END $do$;

DO $do$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'cliente_canais_id_cliente_fkey' AND conrelid = 'public.cliente_canais'::regclass) THEN
    ALTER TABLE public.cliente_canais ADD CONSTRAINT cliente_canais_id_cliente_fkey FOREIGN KEY (id_cliente) REFERENCES clientes_formulario(id_cliente) ON DELETE CASCADE;
  END IF;
END $do$;

DO $do$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'cliente_colaboradores_pkey' AND conrelid = 'public.cliente_colaboradores'::regclass) THEN
    ALTER TABLE public.cliente_colaboradores ADD CONSTRAINT cliente_colaboradores_pkey PRIMARY KEY (id);
  END IF;
END $do$;

DO $do$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'cliente_colaboradores_id_cliente_fkey' AND conrelid = 'public.cliente_colaboradores'::regclass) THEN
    ALTER TABLE public.cliente_colaboradores ADD CONSTRAINT cliente_colaboradores_id_cliente_fkey FOREIGN KEY (id_cliente) REFERENCES auth.users(id) ON DELETE CASCADE;
  END IF;
END $do$;

DO $do$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'cliente_diagnostico_inicial_pkey' AND conrelid = 'public.cliente_diagnostico_inicial'::regclass) THEN
    ALTER TABLE public.cliente_diagnostico_inicial ADD CONSTRAINT cliente_diagnostico_inicial_pkey PRIMARY KEY (id_cliente);
  END IF;
END $do$;

DO $do$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'cliente_empresas_pkey' AND conrelid = 'public.cliente_empresas'::regclass) THEN
    ALTER TABLE public.cliente_empresas ADD CONSTRAINT cliente_empresas_pkey PRIMARY KEY (id);
  END IF;
END $do$;

DO $do$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'cliente_empresas_id_cliente_fkey' AND conrelid = 'public.cliente_empresas'::regclass) THEN
    ALTER TABLE public.cliente_empresas ADD CONSTRAINT cliente_empresas_id_cliente_fkey FOREIGN KEY (id_cliente) REFERENCES clientes_formulario(id_cliente) ON DELETE CASCADE;
  END IF;
END $do$;

DO $do$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'cliente_evidencias_pendentes_pkey' AND conrelid = 'public.cliente_evidencias_pendentes'::regclass) THEN
    ALTER TABLE public.cliente_evidencias_pendentes ADD CONSTRAINT cliente_evidencias_pendentes_pkey PRIMARY KEY (id);
  END IF;
END $do$;

DO $do$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'cliente_metas_pkey' AND conrelid = 'public.cliente_metas'::regclass) THEN
    ALTER TABLE public.cliente_metas ADD CONSTRAINT cliente_metas_pkey PRIMARY KEY (id);
  END IF;
END $do$;

DO $do$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'cliente_metas_id_cliente_key' AND conrelid = 'public.cliente_metas'::regclass) THEN
    ALTER TABLE public.cliente_metas ADD CONSTRAINT cliente_metas_id_cliente_key UNIQUE (id_cliente);
  END IF;
END $do$;

DO $do$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'cliente_metas_id_cliente_fkey' AND conrelid = 'public.cliente_metas'::regclass) THEN
    ALTER TABLE public.cliente_metas ADD CONSTRAINT cliente_metas_id_cliente_fkey FOREIGN KEY (id_cliente) REFERENCES clientes_formulario(id_cliente) ON DELETE CASCADE;
  END IF;
END $do$;

DO $do$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'cliente_onboarding_pkey' AND conrelid = 'public.cliente_onboarding'::regclass) THEN
    ALTER TABLE public.cliente_onboarding ADD CONSTRAINT cliente_onboarding_pkey PRIMARY KEY (id);
  END IF;
END $do$;

DO $do$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'cliente_onboarding_id_cliente_key' AND conrelid = 'public.cliente_onboarding'::regclass) THEN
    ALTER TABLE public.cliente_onboarding ADD CONSTRAINT cliente_onboarding_id_cliente_key UNIQUE (id_cliente);
  END IF;
END $do$;

DO $do$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'cliente_onboarding_pais_check' AND conrelid = 'public.cliente_onboarding'::regclass) THEN
    ALTER TABLE public.cliente_onboarding ADD CONSTRAINT cliente_onboarding_pais_check CHECK ((pais = ANY (ARRAY['BR'::text, 'US'::text])));
  END IF;
END $do$;

DO $do$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'cliente_onboarding_status_check' AND conrelid = 'public.cliente_onboarding'::regclass) THEN
    ALTER TABLE public.cliente_onboarding ADD CONSTRAINT cliente_onboarding_status_check CHECK ((status = ANY (ARRAY['em_andamento'::text, 'enviado'::text])));
  END IF;
END $do$;

DO $do$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'cliente_onboarding_tipo_pessoa_check' AND conrelid = 'public.cliente_onboarding'::regclass) THEN
    ALTER TABLE public.cliente_onboarding ADD CONSTRAINT cliente_onboarding_tipo_pessoa_check CHECK (((tipo_pessoa IS NULL) OR (tipo_pessoa = ANY (ARRAY['PF'::text, 'PJ'::text]))));
  END IF;
END $do$;

DO $do$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'cliente_onboarding_id_cliente_fkey' AND conrelid = 'public.cliente_onboarding'::regclass) THEN
    ALTER TABLE public.cliente_onboarding ADD CONSTRAINT cliente_onboarding_id_cliente_fkey FOREIGN KEY (id_cliente) REFERENCES clientes_formulario(id_cliente) ON DELETE CASCADE;
  END IF;
END $do$;

DO $do$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'cliente_pilar_evidencias_pkey' AND conrelid = 'public.cliente_pilar_evidencias'::regclass) THEN
    ALTER TABLE public.cliente_pilar_evidencias ADD CONSTRAINT cliente_pilar_evidencias_pkey PRIMARY KEY (id);
  END IF;
END $do$;

DO $do$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'cliente_produtos_pkey' AND conrelid = 'public.cliente_produtos'::regclass) THEN
    ALTER TABLE public.cliente_produtos ADD CONSTRAINT cliente_produtos_pkey PRIMARY KEY (id);
  END IF;
END $do$;

DO $do$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'cliente_produtos_classificacao_ticket_check' AND conrelid = 'public.cliente_produtos'::regclass) THEN
    ALTER TABLE public.cliente_produtos ADD CONSTRAINT cliente_produtos_classificacao_ticket_check CHECK ((classificacao_ticket = ANY (ARRAY['low'::text, 'middle'::text, 'high'::text])));
  END IF;
END $do$;

DO $do$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'cliente_produtos_tipo_check' AND conrelid = 'public.cliente_produtos'::regclass) THEN
    ALTER TABLE public.cliente_produtos ADD CONSTRAINT cliente_produtos_tipo_check CHECK ((tipo = ANY (ARRAY['Recorrente'::text, 'Avulso'::text])));
  END IF;
END $do$;

DO $do$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'cliente_produtos_id_cliente_fkey' AND conrelid = 'public.cliente_produtos'::regclass) THEN
    ALTER TABLE public.cliente_produtos ADD CONSTRAINT cliente_produtos_id_cliente_fkey FOREIGN KEY (id_cliente) REFERENCES clientes_formulario(id_cliente) ON DELETE CASCADE;
  END IF;
END $do$;

DO $do$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'cliente_renovacao_pkey' AND conrelid = 'public.cliente_renovacao'::regclass) THEN
    ALTER TABLE public.cliente_renovacao ADD CONSTRAINT cliente_renovacao_pkey PRIMARY KEY (id_cliente);
  END IF;
END $do$;

DO $do$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'cliente_trilha_evidencias_pkey' AND conrelid = 'public.cliente_trilha_evidencias'::regclass) THEN
    ALTER TABLE public.cliente_trilha_evidencias ADD CONSTRAINT cliente_trilha_evidencias_pkey PRIMARY KEY (id_cliente, tarefa_id);
  END IF;
END $do$;

DO $do$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'cliente_ultima_interacao_pkey' AND conrelid = 'public.cliente_ultima_interacao'::regclass) THEN
    ALTER TABLE public.cliente_ultima_interacao ADD CONSTRAINT cliente_ultima_interacao_pkey PRIMARY KEY (id_cliente);
  END IF;
END $do$;

DO $do$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'cliente_visao_csc_pkey' AND conrelid = 'public.cliente_visao_csc'::regclass) THEN
    ALTER TABLE public.cliente_visao_csc ADD CONSTRAINT cliente_visao_csc_pkey PRIMARY KEY (id_cliente);
  END IF;
END $do$;

DO $do$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'cliente_vitorias_pkey' AND conrelid = 'public.cliente_vitorias'::regclass) THEN
    ALTER TABLE public.cliente_vitorias ADD CONSTRAINT cliente_vitorias_pkey PRIMARY KEY (id);
  END IF;
END $do$;

DO $do$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'cs_acompanhamento_pkey' AND conrelid = 'public.cs_acompanhamento'::regclass) THEN
    ALTER TABLE public.cs_acompanhamento ADD CONSTRAINT cs_acompanhamento_pkey PRIMARY KEY (id);
  END IF;
END $do$;

DO $do$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'cs_acompanhamento_nivel_escalada_check' AND conrelid = 'public.cs_acompanhamento'::regclass) THEN
    ALTER TABLE public.cs_acompanhamento ADD CONSTRAINT cs_acompanhamento_nivel_escalada_check CHECK ((nivel_escalada = ANY (ARRAY['nenhuma'::text, 'formato_pergunta'::text, 'privado_decisor'::text, 'call_cs'::text, 'galdino'::text, 'pausa_formal'::text])));
  END IF;
END $do$;

DO $do$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'cs_acompanhamento_id_entrada_fkey' AND conrelid = 'public.cs_acompanhamento'::regclass) THEN
    ALTER TABLE public.cs_acompanhamento ADD CONSTRAINT cs_acompanhamento_id_entrada_fkey FOREIGN KEY (id_entrada) REFERENCES clientes_entrada_new(id_entrada) ON DELETE CASCADE;
  END IF;
END $do$;

DO $do$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'cs_evidencias_pkey' AND conrelid = 'public.cs_evidencias'::regclass) THEN
    ALTER TABLE public.cs_evidencias ADD CONSTRAINT cs_evidencias_pkey PRIMARY KEY (id);
  END IF;
END $do$;

DO $do$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'cs_evidencias_tipo_check' AND conrelid = 'public.cs_evidencias'::regclass) THEN
    ALTER TABLE public.cs_evidencias ADD CONSTRAINT cs_evidencias_tipo_check CHECK ((tipo = ANY (ARRAY['implementacao'::text, 'resultado'::text, 'ferramenta_ia'::text, 'processo'::text, 'outro'::text])));
  END IF;
END $do$;

DO $do$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'trilha_links_pkey' AND conrelid = 'public.trilha_links'::regclass) THEN
    ALTER TABLE public.trilha_links ADD CONSTRAINT trilha_links_pkey PRIMARY KEY (tarefa_id);
  END IF;
END $do$;

-- -----------------------------------------------------------------------------
-- 4) INDEXES (nao ligados a constraints)
-- -----------------------------------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_colaboradores_cliente ON public.cliente_colaboradores USING btree (id_cliente);
CREATE INDEX IF NOT EXISTS cliente_pilar_ev_cliente_pilar_idx ON public.cliente_pilar_evidencias USING btree (id_cliente, pilar_id);
CREATE INDEX IF NOT EXISTS cliente_trilha_ev_cliente_idx ON public.cliente_trilha_evidencias USING btree (id_cliente);
CREATE INDEX IF NOT EXISTS cliente_vitorias_id_cliente_data_idx ON public.cliente_vitorias USING btree (id_cliente, data_vitoria DESC);

-- -----------------------------------------------------------------------------
-- 5) ROW LEVEL SECURITY (enable)
-- -----------------------------------------------------------------------------
ALTER TABLE public.clientes_entrada_new ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.clientes_formulario ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.mentores ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.configuracoes_links ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reunioes_galdino ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reunioes_mentoria ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reunioes_mentoria_new ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cliente_anexos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cliente_canais ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cliente_colaboradores ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cliente_diagnostico_inicial ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cliente_empresas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cliente_evidencias_pendentes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cliente_metas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cliente_onboarding ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cliente_pilar_evidencias ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cliente_produtos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cliente_renovacao ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cliente_trilha_evidencias ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cliente_ultima_interacao ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cliente_visao_csc ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cliente_vitorias ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cs_acompanhamento ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cs_evidencias ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.trilha_links ENABLE ROW LEVEL SECURITY;

-- -----------------------------------------------------------------------------
-- 6) RLS POLICIES
-- -----------------------------------------------------------------------------
DROP POLICY IF EXISTS "Admin can delete entrada" ON public.clientes_entrada_new;
CREATE POLICY "Admin can delete entrada" ON public.clientes_entrada_new AS PERMISSIVE FOR DELETE TO public
  USING ((EXISTS ( SELECT 1
   FROM mentores
  WHERE (mentores.email = auth.email()))));

DROP POLICY IF EXISTS "Admin can insert entrada" ON public.clientes_entrada_new;
CREATE POLICY "Admin can insert entrada" ON public.clientes_entrada_new AS PERMISSIVE FOR INSERT TO authenticated
  WITH CHECK (is_admin());

DROP POLICY IF EXISTS "Admin can update entrada" ON public.clientes_entrada_new;
CREATE POLICY "Admin can update entrada" ON public.clientes_entrada_new AS PERMISSIVE FOR UPDATE TO authenticated
  USING (is_admin())
  WITH CHECK (is_admin());

DROP POLICY IF EXISTS "Client can update own entrada" ON public.clientes_entrada_new;
CREATE POLICY "Client can update own entrada" ON public.clientes_entrada_new AS PERMISSIVE FOR UPDATE TO authenticated
  USING ((auth.uid() = id_cliente))
  WITH CHECK ((auth.uid() = id_cliente));

DROP POLICY IF EXISTS clientes_entrada_select_self_or_admin ON public.clientes_entrada_new;
CREATE POLICY clientes_entrada_select_self_or_admin ON public.clientes_entrada_new AS PERMISSIVE FOR SELECT TO authenticated
  USING (((auth.uid() = id_cliente) OR is_admin()));

DROP POLICY IF EXISTS "Admin can insert clients" ON public.clientes_formulario;
CREATE POLICY "Admin can insert clients" ON public.clientes_formulario AS PERMISSIVE FOR INSERT TO authenticated
  WITH CHECK (is_admin());

DROP POLICY IF EXISTS "Admin can update clients" ON public.clientes_formulario;
CREATE POLICY "Admin can update clients" ON public.clientes_formulario AS PERMISSIVE FOR UPDATE TO authenticated
  USING (is_admin())
  WITH CHECK (is_admin());

DROP POLICY IF EXISTS "Clients can read their own form data" ON public.clientes_formulario;
CREATE POLICY "Clients can read their own form data" ON public.clientes_formulario AS PERMISSIVE FOR SELECT TO public
  USING (((auth.uid() = id_cliente) OR is_admin()));

DROP POLICY IF EXISTS clientes_formulario_delete_admin ON public.clientes_formulario;
CREATE POLICY clientes_formulario_delete_admin ON public.clientes_formulario AS PERMISSIVE FOR DELETE TO authenticated
  USING (is_admin());

DROP POLICY IF EXISTS mentores_admin_modify ON public.mentores;
CREATE POLICY mentores_admin_modify ON public.mentores AS PERMISSIVE FOR ALL TO authenticated
  USING (is_admin())
  WITH CHECK (is_admin());

DROP POLICY IF EXISTS mentores_admin_select ON public.mentores;
CREATE POLICY mentores_admin_select ON public.mentores AS PERMISSIVE FOR SELECT TO authenticated
  USING (is_admin());

DROP POLICY IF EXISTS "Admins can delete links" ON public.configuracoes_links;
CREATE POLICY "Admins can delete links" ON public.configuracoes_links AS PERMISSIVE FOR DELETE TO public
  USING ((EXISTS ( SELECT 1
   FROM mentores
  WHERE (mentores.email = (auth.jwt() ->> 'email'::text)))));

DROP POLICY IF EXISTS "Admins can insert links" ON public.configuracoes_links;
CREATE POLICY "Admins can insert links" ON public.configuracoes_links AS PERMISSIVE FOR INSERT TO public
  WITH CHECK ((EXISTS ( SELECT 1
   FROM mentores
  WHERE (mentores.email = (auth.jwt() ->> 'email'::text)))));

DROP POLICY IF EXISTS "Admins can update links" ON public.configuracoes_links;
CREATE POLICY "Admins can update links" ON public.configuracoes_links AS PERMISSIVE FOR UPDATE TO public
  USING ((EXISTS ( SELECT 1
   FROM mentores
  WHERE (mentores.email = (auth.jwt() ->> 'email'::text)))));

DROP POLICY IF EXISTS configuracoes_links_select_authenticated ON public.configuracoes_links;
CREATE POLICY configuracoes_links_select_authenticated ON public.configuracoes_links AS PERMISSIVE FOR SELECT TO authenticated
  USING (true);

DROP POLICY IF EXISTS reunioes_galdino_modify ON public.reunioes_galdino;
CREATE POLICY reunioes_galdino_modify ON public.reunioes_galdino AS PERMISSIVE FOR ALL TO authenticated
  USING (((auth.uid() = id_cliente) OR is_admin()))
  WITH CHECK (((auth.uid() = id_cliente) OR is_admin()));

DROP POLICY IF EXISTS reunioes_galdino_select ON public.reunioes_galdino;
CREATE POLICY reunioes_galdino_select ON public.reunioes_galdino AS PERMISSIVE FOR SELECT TO authenticated
  USING (((auth.uid() = id_cliente) OR is_admin()));

DROP POLICY IF EXISTS "Clients can read their own meetings" ON public.reunioes_mentoria;
CREATE POLICY "Clients can read their own meetings" ON public.reunioes_mentoria AS PERMISSIVE FOR SELECT TO public
  USING (((auth.uid() = id_cliente) OR is_admin()));

DROP POLICY IF EXISTS "Clients can read their own meetings" ON public.reunioes_mentoria_new;
CREATE POLICY "Clients can read their own meetings" ON public.reunioes_mentoria_new AS PERMISSIVE FOR SELECT TO public
  USING (((auth.uid() = id_cliente) OR is_admin()));

DROP POLICY IF EXISTS reunioes_mentoria_new_delete ON public.reunioes_mentoria_new;
CREATE POLICY reunioes_mentoria_new_delete ON public.reunioes_mentoria_new AS PERMISSIVE FOR DELETE TO authenticated
  USING (((auth.uid() = id_cliente) OR is_admin()));

DROP POLICY IF EXISTS reunioes_mentoria_new_insert ON public.reunioes_mentoria_new;
CREATE POLICY reunioes_mentoria_new_insert ON public.reunioes_mentoria_new AS PERMISSIVE FOR INSERT TO authenticated
  WITH CHECK (((auth.uid() = id_cliente) OR is_admin()));

DROP POLICY IF EXISTS reunioes_mentoria_new_update ON public.reunioes_mentoria_new;
CREATE POLICY reunioes_mentoria_new_update ON public.reunioes_mentoria_new AS PERMISSIVE FOR UPDATE TO authenticated
  USING (((auth.uid() = id_cliente) OR is_admin()))
  WITH CHECK (((auth.uid() = id_cliente) OR is_admin()));

DROP POLICY IF EXISTS equipe_all ON public.cliente_anexos;
CREATE POLICY equipe_all ON public.cliente_anexos AS PERMISSIVE FOR ALL TO public
  USING ((EXISTS ( SELECT 1
   FROM mentores
  WHERE (mentores.email = (auth.jwt() ->> 'email'::text)))))
  WITH CHECK ((EXISTS ( SELECT 1
   FROM mentores
  WHERE (mentores.email = (auth.jwt() ->> 'email'::text)))));

DROP POLICY IF EXISTS "Clients can CRUD their own channels" ON public.cliente_canais;
CREATE POLICY "Clients can CRUD their own channels" ON public.cliente_canais AS PERMISSIVE FOR ALL TO public
  USING (((auth.uid() = id_cliente) OR is_admin()));

DROP POLICY IF EXISTS admin_rw ON public.cliente_colaboradores;
CREATE POLICY admin_rw ON public.cliente_colaboradores AS PERMISSIVE FOR ALL TO public
  USING ((EXISTS ( SELECT 1
   FROM mentores
  WHERE (mentores.email = (auth.jwt() ->> 'email'::text)))))
  WITH CHECK ((EXISTS ( SELECT 1
   FROM mentores
  WHERE (mentores.email = (auth.jwt() ->> 'email'::text)))));

DROP POLICY IF EXISTS owner_rw ON public.cliente_colaboradores;
CREATE POLICY owner_rw ON public.cliente_colaboradores AS PERMISSIVE FOR ALL TO public
  USING ((id_cliente = auth.uid()))
  WITH CHECK ((id_cliente = auth.uid()));

DROP POLICY IF EXISTS equipe_all ON public.cliente_diagnostico_inicial;
CREATE POLICY equipe_all ON public.cliente_diagnostico_inicial AS PERMISSIVE FOR ALL TO public
  USING ((EXISTS ( SELECT 1
   FROM mentores
  WHERE (mentores.email = (auth.jwt() ->> 'email'::text)))))
  WITH CHECK ((EXISTS ( SELECT 1
   FROM mentores
  WHERE (mentores.email = (auth.jwt() ->> 'email'::text)))));

DROP POLICY IF EXISTS equipe_all ON public.cliente_evidencias_pendentes;
CREATE POLICY equipe_all ON public.cliente_evidencias_pendentes AS PERMISSIVE FOR ALL TO public
  USING ((EXISTS ( SELECT 1
   FROM mentores
  WHERE (mentores.email = (auth.jwt() ->> 'email'::text)))))
  WITH CHECK ((EXISTS ( SELECT 1
   FROM mentores
  WHERE (mentores.email = (auth.jwt() ->> 'email'::text)))));

DROP POLICY IF EXISTS "Clients can CRUD their own goals" ON public.cliente_metas;
CREATE POLICY "Clients can CRUD their own goals" ON public.cliente_metas AS PERMISSIVE FOR ALL TO public
  USING (((auth.uid() = id_cliente) OR is_admin()));

DROP POLICY IF EXISTS "Onboarding insert own or admin" ON public.cliente_onboarding;
CREATE POLICY "Onboarding insert own or admin" ON public.cliente_onboarding AS PERMISSIVE FOR INSERT TO authenticated
  WITH CHECK (((auth.uid() = id_cliente) OR is_admin()));

DROP POLICY IF EXISTS "Onboarding select own or admin" ON public.cliente_onboarding;
CREATE POLICY "Onboarding select own or admin" ON public.cliente_onboarding AS PERMISSIVE FOR SELECT TO authenticated
  USING (((auth.uid() = id_cliente) OR is_admin()));

DROP POLICY IF EXISTS "Onboarding update own or admin" ON public.cliente_onboarding;
CREATE POLICY "Onboarding update own or admin" ON public.cliente_onboarding AS PERMISSIVE FOR UPDATE TO authenticated
  USING (((auth.uid() = id_cliente) OR is_admin()))
  WITH CHECK (((auth.uid() = id_cliente) OR is_admin()));

DROP POLICY IF EXISTS cliente_own_pilar_ev ON public.cliente_pilar_evidencias;
CREATE POLICY cliente_own_pilar_ev ON public.cliente_pilar_evidencias AS PERMISSIVE FOR ALL TO public
  USING ((auth.uid() = id_cliente))
  WITH CHECK ((auth.uid() = id_cliente));

DROP POLICY IF EXISTS mentores_read_pilar_ev ON public.cliente_pilar_evidencias;
CREATE POLICY mentores_read_pilar_ev ON public.cliente_pilar_evidencias AS PERMISSIVE FOR SELECT TO public
  USING ((EXISTS ( SELECT 1
   FROM mentores
  WHERE (mentores.email = (auth.jwt() ->> 'email'::text)))));

DROP POLICY IF EXISTS "Clients can CRUD their own products" ON public.cliente_produtos;
CREATE POLICY "Clients can CRUD their own products" ON public.cliente_produtos AS PERMISSIVE FOR ALL TO public
  USING (((auth.uid() = id_cliente) OR is_admin()));

DROP POLICY IF EXISTS equipe_all ON public.cliente_renovacao;
CREATE POLICY equipe_all ON public.cliente_renovacao AS PERMISSIVE FOR ALL TO public
  USING ((EXISTS ( SELECT 1
   FROM mentores
  WHERE (mentores.email = (auth.jwt() ->> 'email'::text)))))
  WITH CHECK ((EXISTS ( SELECT 1
   FROM mentores
  WHERE (mentores.email = (auth.jwt() ->> 'email'::text)))));

DROP POLICY IF EXISTS cliente_own_trilha_ev ON public.cliente_trilha_evidencias;
CREATE POLICY cliente_own_trilha_ev ON public.cliente_trilha_evidencias AS PERMISSIVE FOR ALL TO public
  USING ((auth.uid() = id_cliente))
  WITH CHECK ((auth.uid() = id_cliente));

DROP POLICY IF EXISTS mentores_read_trilha_ev ON public.cliente_trilha_evidencias;
CREATE POLICY mentores_read_trilha_ev ON public.cliente_trilha_evidencias AS PERMISSIVE FOR SELECT TO public
  USING ((EXISTS ( SELECT 1
   FROM mentores
  WHERE (mentores.email = (auth.jwt() ->> 'email'::text)))));

DROP POLICY IF EXISTS equipe_all ON public.cliente_ultima_interacao;
CREATE POLICY equipe_all ON public.cliente_ultima_interacao AS PERMISSIVE FOR ALL TO public
  USING ((EXISTS ( SELECT 1
   FROM mentores
  WHERE (mentores.email = (auth.jwt() ->> 'email'::text)))))
  WITH CHECK ((EXISTS ( SELECT 1
   FROM mentores
  WHERE (mentores.email = (auth.jwt() ->> 'email'::text)))));

DROP POLICY IF EXISTS equipe_all ON public.cliente_visao_csc;
CREATE POLICY equipe_all ON public.cliente_visao_csc AS PERMISSIVE FOR ALL TO public
  USING ((EXISTS ( SELECT 1
   FROM mentores
  WHERE (mentores.email = (auth.jwt() ->> 'email'::text)))))
  WITH CHECK ((EXISTS ( SELECT 1
   FROM mentores
  WHERE (mentores.email = (auth.jwt() ->> 'email'::text)))));

DROP POLICY IF EXISTS cliente_own_vitorias ON public.cliente_vitorias;
CREATE POLICY cliente_own_vitorias ON public.cliente_vitorias AS PERMISSIVE FOR ALL TO public
  USING ((auth.uid() = id_cliente))
  WITH CHECK ((auth.uid() = id_cliente));

DROP POLICY IF EXISTS equipe_all ON public.cliente_vitorias;
CREATE POLICY equipe_all ON public.cliente_vitorias AS PERMISSIVE FOR ALL TO public
  USING ((EXISTS ( SELECT 1
   FROM mentores
  WHERE (mentores.email = (auth.jwt() ->> 'email'::text)))))
  WITH CHECK ((EXISTS ( SELECT 1
   FROM mentores
  WHERE (mentores.email = (auth.jwt() ->> 'email'::text)))));

DROP POLICY IF EXISTS mentores_read_vitorias ON public.cliente_vitorias;
CREATE POLICY mentores_read_vitorias ON public.cliente_vitorias AS PERMISSIVE FOR SELECT TO public
  USING ((EXISTS ( SELECT 1
   FROM mentores
  WHERE (mentores.email = (auth.jwt() ->> 'email'::text)))));

DROP POLICY IF EXISTS allow_all_cs ON public.cs_acompanhamento;
CREATE POLICY allow_all_cs ON public.cs_acompanhamento AS PERMISSIVE FOR ALL TO public
  USING (true)
  WITH CHECK (true);

DROP POLICY IF EXISTS allow_all_evidencias ON public.cs_evidencias;
CREATE POLICY allow_all_evidencias ON public.cs_evidencias AS PERMISSIVE FOR ALL TO public
  USING (true)
  WITH CHECK (true);

DROP POLICY IF EXISTS trilha_links_read_all ON public.trilha_links;
CREATE POLICY trilha_links_read_all ON public.trilha_links AS PERMISSIVE FOR SELECT TO public
  USING (true);

DROP POLICY IF EXISTS trilha_links_write_mentores ON public.trilha_links;
CREATE POLICY trilha_links_write_mentores ON public.trilha_links AS PERMISSIVE FOR ALL TO public
  USING ((EXISTS ( SELECT 1
   FROM mentores
  WHERE (mentores.email = (auth.jwt() ->> 'email'::text)))))
  WITH CHECK ((EXISTS ( SELECT 1
   FROM mentores
  WHERE (mentores.email = (auth.jwt() ->> 'email'::text)))));
