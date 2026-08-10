// No sistema original estes eram tipos literais com os nomes fixos do time.
// Aqui o time vem da tabela `mentores`, então são strings resolvidas em runtime
// (ver equipe.ts). Isso é o que permite entrar/sair gente sem mexer em código.
export type CSName = string;
export type ProfileName = string;

export type Role = "admin" | "strategic" | "cs";

export type ClienteStatus = "Ativo" | "Cancelado" | "Em Risco";
export type Temperatura = "Quente" | "Morno" | "Frio" | "Em Risco" | "Não definido";
export type Engajamento =
  | "Engajado"
  | "Desengajado"
  | "Saudável"
  | "Em Atenção"
  | "Crítico";

export type AtividadeTipo =
  | "Contato"
  | "Follow-up"
  | "Reunião"
  | "Handoff"
  | "Outro";
export type AtividadeStatus =
  | "Pendente"
  | "Em andamento"
  | "Aguardando cliente"
  | "Aguardando time interno"
  | "Concluída"
  | "Impedida"
  | "Atrasada";
export type Prioridade = "Urgente" | "Médio" | "Normal";

export const PRIORIDADE_ORDER: Record<Prioridade, number> = {
  Urgente: 0,
  Médio: 1,
  Normal: 2,
};

export interface NotaCliente {
  id: string;
  texto: string;
  autor: ProfileName;
  criado_em: string;
}

/**
 * Anotação interna do cliente (não visível para o aluno).
 * Fluxo proposto pelo Giovano: texto + imagens (base64) + toggle
 * "problema pessoal" que congela/pausa o cliente e o exclui dos
 * indicadores de saúde da carteira.
 */
export interface AnotacaoInterna {
  id: string;
  texto: string;
  autor: ProfileName;
  criado_em: string;
  atualizado_em?: string;
  imagens?: string[]; // data URLs (image/*;base64,...)
  fixada?: boolean;
}

export interface TempHist {
  temp: Temperatura;
  data: string;
  autor?: ProfileName;
  motivo?: string;
  observacao?: string;
}

/** Status de implementação do Black CRM. "Recusado" = escolha válida do cliente (não gera alerta). */
export type BcrmStatusImpl =
  | "Não iniciado"
  | "Em implementação"
  | "Implementado"
  | "Ativo"
  | "Recusado";

export const BCRM_STATUS_IMPL_LIST: BcrmStatusImpl[] = [
  "Não iniciado",
  "Em implementação",
  "Ativo",
  "Recusado",
];

/** Etapa do Guardião de IA. */
export type GuardiaoEtapa = "Não definido" | "Em definição" | "Definido" | "Atuando";

export const GUARDIAO_ETAPA_LIST: GuardiaoEtapa[] = [
  "Não definido",
  "Em definição",
  "Definido",
  "Atuando",
];


/** Situação do cliente no programa (independente do status comercial). */
export type SituacaoCliente = "Não iniciou o programa" | "Ativo" | "Cancelado";

export const SITUACAO_LIST: SituacaoCliente[] = [
  "Não iniciou o programa",
  "Ativo",
  "Cancelado",
];

export interface Cliente {
  id: string;
  nome: string;
  empresa?: string;
  responsavel_cs: CSName;
  status: ClienteStatus;
  situacao?: SituacaoCliente;
  temperatura: Temperatura;
  engajamento: Engajamento;
  data_inicio: string;
  observacoes: string;
  notas?: NotaCliente[];
  historico_temperatura?: TempHist[];
  // Entregas e adesão (legacy compat)
  black_crm?: boolean;
  black_sdr?: boolean;
  guardiao_ia?: boolean;
  area_membros?: MembrosFlag;
  treinamentos?: AtivoFlag;
  reunioes_consultores?: AtivoFlag;
  ultima_reuniao_consultor?: string;
  consultor_responsavel?: string;
  reuniao_galdino?: boolean;
  ultima_reuniao_galdino?: string;
  implementacao?: ImplementacaoStatus;
  plano_acao?: PlanoAcaoStatus;
  proximo_renovacao?: boolean;
  data_renovacao?: string;
  oportunidade_case?: boolean;
  vitoria_registrada?: boolean;
  vitoria?: VitoriaInfo;
  trava?: TravaInfo;
  // ===== Perfil (novo) =====
  nicho?: string;
  subnicho?: string;
  saude?: "Saudável" | "Em Atenção" | "Crítico";
  em_risco_cancelamento?: "Sim" | "Não";
  estado_atual_obs?: string;
  // ===== Programa =====
  presenca_treinamento?: "Nenhuma" | "Baixa" | "Média" | "Alta";
  frequencia_wpp?: "Baixa" | "Média" | "Alta";
  reuniao_consultores_status?: "Já fez" | "Nunca fez" | "Agendada";
  reuniao_galdino_status?: "Já fez" | "Nunca fez" | "Agendada";
  guardiao_ia_nome?: string;
  guardiao_ia_telefone?: string;
  guardiao_ia_cargo?: string;
  /** Etapa do Guardião de IA (registros antigos: "Não definido") */
  guardiao_ia_etapa?: GuardiaoEtapa;
  /** ISO — quando entrou na etapa atual */
  guardiao_ia_etapa_desde?: string;
  /** Acesso liberado à área de membros */
  area_membros_acesso_cliente?: boolean;
  area_membros_acesso_equipe?: boolean;
  /** ISO — último acesso registrado à área de membros */
  area_membros_ultimo_acesso?: string;
  // ===== Black CRM =====
  bcrm_tem_conta?: "Sim" | "Não";
  bcrm_qtd_contas?: number;
  bcrm_tem_guardiao?: "Sim" | "Não";
  bcrm_guardiao_nome?: string;
  bcrm_guardiao_telefone?: string;
  bcrm_nomes_contas?: string;
  bcrm_status_conta?: "Ativa" | "Inativa" | "Suspensa";
  bcrm_status_impl?: BcrmStatusImpl;
  /** ISO — data da última mudança de bcrm_status_impl */
  bcrm_status_impl_desde?: string;
  bcrm_tutoria?: "Participa" | "Não participa";
  bcrm_tem_vitorias?: "Sim" | "Não";
  bcrm_quais_vitorias?: string;
  // ===== Ciclo Galdino =====
  ciclo_galdino_cadencia?: 4 | 6 | 12;
  ciclo_galdino_reunioes?: CicloGaldinoReuniao[];
  // ===== Consultores =====
  consultor_reunioes?: ConsultorReuniao[];
  // ===== Renovação =====
  renovacao_valor?: number;
  renovacao_status?: "Ainda distante" | "Aproximando" | "Em negociação" | "Confirmada" | "Perdida";
  renovacao_obs?: string;
  // ===== Vitórias =====
  vitorias?: VitoriaItem[];
  // ===== Comunicação =====
  comunicacao_preferencia?: "Grupo geral" | "Grupo individual do cliente" | "Privado com CS" | "Direto com Galdino";
  comunicacao_canal?: "WhatsApp" | "Telefone" | "E-mail" | "Reunião";
  comunicacao_restricoes?: string;
  comunicacao_resumo?: string;
  /** Grupo de WhatsApp vinculado ao cliente (aba Atendimento) */
  whatsapp_grupo_id?: string;
  whatsapp_grupo_nome?: string;
  // ===== Cancelamento =====
  cancelamento_motivos?: string[];
  cancelamento_responsab?: "Cliente" | "Time PMC" | "Compartilhada" | "";
  cancelamento_tentativa_reversao?: "Sim" | "Não";
  cancelamento_resumo?: string;
  cancelamento_data?: string;
  // ===== Anotações internas / pausa =====
  anotacoes_internas?: AnotacaoInterna[];
  pausado?: boolean;
  pausado_motivo?: string;
  pausado_em?: string;
  pausado_por?: ProfileName;
}

export interface CicloGaldinoReuniao {
  id: string;
  data_ideal?: string;
  data_reuniao?: string;
  status: "Não agendada" | "Agendada" | "Realizada" | "Cancelada";
  proximos_passos?: string;
}

export interface ConsultorReuniao {
  id: string;
  consultor: string;
  data: string;
  status: "Agendada" | "Realizada" | "Cancelada";
  observacao?: string;
}

export interface VitoriaItem {
  id: string;
  data: string;
  titulo: string;
  formato?: VitoriaFormato;
  descricao?: string;
}

export const MOTIVOS_CANCELAMENTO = [
  "Financeiro",
  "Falta de tempo",
  "Não viu valor",
  "Problemas internos",
  "Não se adaptou à mentoria",
  "Falta de implementação",
  "Problema com equipe",
  "Expectativa desalinhada",
  "Outro",
] as const;

export type ImplementacaoStatus =
  | "nao_iniciada"
  | "em_andamento"
  | "travada"
  | "concluida";
export type PlanoAcaoStatus = "atualizado" | "desatualizado" | "inexistente";
export type AtivoFlag = "ativo" | "nao_ativo";
export type MembrosFlag = "ativo" | "inativo";

export interface TravaInfo {
  motivo: string;
  proxima_acao: string;
  responsavel: string;
  prazo: string;
  observacao?: string;
}

export type VitoriaFormato =
  | "depoimento"
  | "print"
  | "video"
  | "apresentacao"
  | "estudo_de_caso";

export interface VitoriaInfo {
  data: string;
  contexto: string;
  entrega?: string;
  autor?: ProfileName;
  formato?: VitoriaFormato;
}

export const MOTIVOS_TRAVA = [
  "Falta de material do cliente",
  "Falta de responsável interno",
  "Falta de decisão do dono",
  "Falta de alinhamento com equipe",
  "Dificuldade técnica",
  "Baixa adesão da equipe",
  "Dependência do consultor",
  "Dependência do Galdino",
  "Inadimplência",
  "Outro",
] as const;

export const ACOES_DESTRAVA = [
  "Revisar plano de ação",
  "Agendar reunião com consultor",
  "Agendar reunião com Galdino",
  "Enviar material de apoio",
  "Enviar case de cliente parecido",
  "Fazer ligação de alinhamento",
  "Acionar especialista",
  "Destravar pendência técnica",
  "Criar plano de reativação",
] as const;

export const FORMATOS_CASE: { value: VitoriaFormato; label: string }[] = [
  { value: "depoimento", label: "Depoimento" },
  { value: "print", label: "Print" },
  { value: "video", label: "Vídeo" },
  { value: "apresentacao", label: "Apresentação" },
  { value: "estudo_de_caso", label: "Estudo de caso" },
];

export const ENTREGAS = [
  "Reunião com Galdino",
  "Reunião com Consultor",
  "Multiplica Time",
  "Multiplica Dono",
  "Multiplica Case",
  "Black CRM",
  "Black SDR",
  "Guardião de IA",
  "Trilha de IA",
  "Área de Membros",
  "WhatsApp",
  "Renovação",
  "Financeiro",
  "Reengajamento",
  "Implementação",
  "Outro",
] as const;

export const CONSULTORES = [
  "David",
  "Issao",
  "Rodrigo",
  "Diego",
  "Ayslan",
  "Matheus",
  "Maxsuell",
] as const;

export const ACOES = [
  "Cobrar material",
  "Agendar reunião",
  "Confirmar reunião",
  "Fazer follow-up no WhatsApp",
  "Atualizar cadastro",
  "Acompanhar implementação",
  "Validar entrega",
  "Aguardar resposta",
  "Engajar cliente",
  "Enviar mensagem de reengajamento",
  "Fazer ligação",
  "Enviar áudio personalizado",
  "Enviar case de cliente parecido",
  "Enviar material da área de membros",
  "Enviar aula específica",
  "Revisar plano de ação",
  "Checar uso do Black CRM",
  "Checar uso do Black SDR",
  "Checar Guardião",
  "Mapear gargalo atual",
  "Fazer contato de renovação",
  "Preparar histórico para renovação",
  "Tratar insatisfação",
  "Checar inadimplência",
  "Escalar para coordenação",
  "Atualizar saúde do cliente",
  "Atualizar risco do cliente",
  "Outro",
] as const;

export const MOTIVOS_TEMPERATURA = [
  "Cliente sem resposta",
  "Cliente faltou reunião",
  "Cliente não executou plano de ação",
  "Cliente não acessa a plataforma",
  "Cliente não participa dos encontros",
  "Cliente inadimplente",
  "Cliente reclamou",
  "Implementação travada",
  "Cliente relatou vitória",
  "Cliente avançou no plano de ação",
  "Cliente próximo da renovação",
  "Reunião realizada com bom avanço",
  "Cliente teve vitória importante",
  "Cliente com baixa adesão do time",
  "Cliente sem clareza do próximo passo",
  "Outro",
] as const;

export type AtividadeOrigem =
  | "manual_individual"
  | "manual_lote"
  | "rotina_semanal"
  | "rotina_quinzenal"
  | "micro_ciclo"
  | "ritual_trimestral"
  | "checkpoint_ciclo"
  | "alerta_automatico"
  | "proxima_acao_recomendada";

export const ORIGEM_LABELS: Record<AtividadeOrigem, string> = {
  manual_individual: "Manual individual",
  manual_lote: "Manual em lote",
  rotina_semanal: "Rotina semanal",
  rotina_quinzenal: "Rotina quinzenal",
  micro_ciclo: "Micro-ciclo mensal",
  ritual_trimestral: "Ritual trimestral",
  checkpoint_ciclo: "Checkpoint de ciclo",
  alerta_automatico: "Alerta automático",
  proxima_acao_recomendada: "Próxima ação recomendada",
};

export interface Atividade {
  id: string;
  cliente_id: string;
  cs_responsavel: CSName;
  titulo: string;
  tipo: AtividadeTipo;
  prioridade: Prioridade;
  descricao: string;
  entrega?: string;
  entrega_detalhe?: string;
  acao?: string;
  acao_detalhe?: string;
  data_prevista: string;
  hora?: string;
  status: AtividadeStatus;
  data_conclusao?: string;
  pulou_proxima?: boolean;
  batch_id?: string;
  origem?: AtividadeOrigem;
  origem_label?: string;
  motivo_impedimento?: string;
  /** ISO — data de entrada no status atual (para calcular "há N dias") */
  status_desde?: string;
  /** Nome concreto da pessoa interna aguardada (ex.: Galdino, nome do consultor) */
  dependencia_nome?: string;
  /** Tipo de responsável pela execução da atividade (default: CS) */
  responsavel_tipo?: ResponsavelAtividadeTipo;
  /** Nome do responsável quando não for o CS */
  responsavel_nome?: string;
  /** Vínculo com um Projeto CS (tarefas de projeto são atividades normais) */
  projeto_id?: string;
  /**
   * ISO — quando a atividade foi criada. Não existia no sistema original
   * (localStorage não guardava), e as telas de produtividade usavam
   * `status_desde` como proxy — o que conta uma tarefa antiga que só mudou de
   * status hoje como "criada hoje". A coluna existe no banco desde sempre.
   */
  criado_em?: string;
}

export type ResponsavelAtividadeTipo = "CS" | "Cliente" | "Consultor" | "Interno";

// ============= Projetos CS =============

export type AreaGargalo =
  | "Integração"
  | "Mentores / Reuniões"
  | "Conteúdos / Área de Membros"
  | "Multiplica Time & Dono"
  | "Sucesso do Cliente"
  | "CRM / Implementação"
  | "Outro";

export const AREAS_GARGALO: AreaGargalo[] = [
  "Integração",
  "Mentores / Reuniões",
  "Conteúdos / Área de Membros",
  "Multiplica Time & Dono",
  "Sucesso do Cliente",
  "CRM / Implementação",
  "Outro",
];

export type QuemTrouxe =
  | "Time de CS"
  | "Time de Mentores"
  | "Galdino"
  | "Time de CRM"
  | "Outro";

export const QUEM_TROUXE_LIST: QuemTrouxe[] = [
  "Time de CS",
  "Time de Mentores",
  "Galdino",
  "Time de CRM",
  "Outro",
];

export type TimeExecutor =
  | "Time de CS"
  | "Galdino"
  | "Time de Mentores"
  | "Time de CRM"
  | "Time de Operações"
  | "Time Jurídico"
  | "Time Financeiro"
  | "Outro";

export const TIMES_EXECUTORES: TimeExecutor[] = [
  "Time de CS",
  "Galdino",
  "Time de Mentores",
  "Time de CRM",
  "Time de Operações",
  "Time Jurídico",
  "Time Financeiro",
  "Outro",
];

export type GargaloStatus = "Não iniciado" | "Em andamento" | "Em teste" | "Realizado";
export const GARGALO_STATUS_LIST: GargaloStatus[] = [
  "Não iniciado",
  "Em andamento",
  "Em teste",
  "Realizado",
];

export type GargaloPrioridade = "Alta" | "Média" | "Baixa" | "Nenhuma";
export const GARGALO_PRIORIDADE_LIST: GargaloPrioridade[] = [
  "Alta",
  "Média",
  "Baixa",
  "Nenhuma",
];

export type ProjetoEstagio = "Backlog" | "Em andamento" | "Concluído";

export interface Gargalo {
  id: string;
  area: AreaGargalo;
  quem_trouxe: QuemTrouxe;
  registrado_por: string;
  quem_vai_executar: TimeExecutor;
  data: string;
  status: GargaloStatus;
  prioridade: GargaloPrioridade;
  problema: string;
  detalhes_problema?: string;
  solucao: string;
  detalhes_solucao?: string;
  pessoas_atribuidas?: string[];
  /** true quando o gargalo afeta a entrega do cliente */
  afeta_entrega_cliente: boolean;
  /** especificação livre quando a opção escolhida for "Outro" */
  area_outro?: string;
  quem_trouxe_outro?: string;
  quem_vai_executar_outro?: string;
  projeto_id?: string;
}

export interface Projeto {
  id: string;
  titulo: string;
  descricao?: string;
  gargalo_id?: string;
  estagio: ProjetoEstagio;
  time_executor: TimeExecutor;
  /** pessoa — fica vazio até o time atribuir */
  responsavel?: string;
  prazo?: string;
  concluido_em?: string;
  criado_em: string;
}


// Live bindings: preenchidos por setEquipe() em equipe.ts a partir de `mentores`.
// Componentes leem no render, então a reatribuição aparece no próximo ciclo.
export let CS_LIST: CSName[] = [];
export let PROFILE_LIST: ProfileName[] = [];

/** Chamado só por equipe.ts quando a lista do time chega do banco. */
export function _setListasEquipe(cs: CSName[], perfis: ProfileName[]) {
  CS_LIST = cs;
  PROFILE_LIST = perfis;
}

export interface UsuarioMeta {
  profile: ProfileName;
  cargo: string;
  role: Role;
  ativo: boolean;
  ultima_entrada?: string;
  whatsapp_numero?: string;
  whatsapp_grupo_id?: string;
  whatsapp_automacao?: "ativa" | "pausada";
  whatsapp_horario_resumo?: string;
}

// Antes era uma lista fixa; agora o time vem de `mentores` + `crm_cs_config`.
// Live binding, mesmo racional de CS_LIST.
export let USUARIOS_DEFAULT: UsuarioMeta[] = [];

/** Chamado só por equipe.ts quando o time chega do banco. */
export function _setUsuarios(us: UsuarioMeta[]) {
  USUARIOS_DEFAULT = us;
}

/** Papel no CRM derivado do papel de RBAC do PMC OS (`mentores.papel`). */
export function roleDoPapel(papel: string | null | undefined): Role {
  if (papel === "cs") return "cs";
  if (papel === "consultor") return "strategic";
  return "admin"; // admin e super_admin coordenam
}

// ============= Manual de CS =============
export interface ManualCS {
  nome: string;
  link: string;
  descricao: string;
  atualizado_em: string;
  responsavel: ProfileName;
  status: "ativo" | "inativo";
}

// ============= Materiais / Uploads =============
export const MATERIAL_SETORES = [
  "RH",
  "Comercial",
  "Marketing",
  "Financeiro",
  "Contas a receber",
  "Contas a pagar",
  "Processos",
  "CRM",
  "Tráfego",
  "Documentos gerais",
  "Plano de ação",
  "Diagnóstico",
  "Relatórios",
] as const;

export type MaterialSetor = (typeof MATERIAL_SETORES)[number];
export type MaterialStatus = "Recebido" | "Em análise" | "Analisado" | "Pendente" | "Concluído";

export const MATERIAL_STATUS_LIST: MaterialStatus[] = [
  "Recebido",
  "Em análise",
  "Analisado",
  "Pendente",
  "Concluído",
];

export interface MaterialCliente {
  id: string;
  cliente_id: string;
  nome: string;
  setor: MaterialSetor;
  enviado_por: ProfileName;
  consultor?: string;
  data: string;
  status: MaterialStatus;
  observacao?: string;
}

// ============= Reuniões =============
export type ReuniaoTipo = "Cliente" | "Time PMC";
export type ReuniaoSubtipo =
  | "Mentoria"
  | "Black CRM"
  | "Galdino"
  | "Alinhamento"
  | "Consultoria"
  | "Outro";
export type ReuniaoStatus = "Agendada" | "Realizada" | "Cancelada";
export type ReuniaoOrigem = "Sistema" | "Google Calendar";

export type ParticipacaoCS = "Participa" | "Nao participa";
export type PreparacaoResponsavel = "Cliente" | "CS" | "Consultor" | "Interno";
export type PreparacaoStatus = "Pendente" | "Confirmado" | "Nao se aplica";

export interface ItemPreparacao {
  id: string;
  descricao: string;
  responsavel: PreparacaoResponsavel;
  status: PreparacaoStatus;
  confirmado_em?: string;
  /** texto do botão: "Cobrar", "Enviar", "Confirmar" */
  acao_label?: string;
}

export interface Reuniao {
  id: string;
  cliente_id?: string;
  cs_responsavel: CSName;
  titulo: string;
  tipo: ReuniaoTipo;
  subtipo?: ReuniaoSubtipo;
  /** ISO date — usar `data + hora_inicio` para posição temporal. */
  data: string;
  /** "HH:MM" */
  hora_inicio: string;
  duracao_minutos: number;
  link_reuniao?: string;
  pauta?: string;
  resumo?: string;
  materiais_pendentes?: boolean;
  /** Há transcrição registrada na tabela de origem? O texto vem sob demanda
   *  (fetchTranscricaoReuniao) — a view só expõe o booleano. */
  tem_transcricao?: boolean;
  link_gravacao?: string;
  origem: ReuniaoOrigem;
  google_event_id?: string;
  status: ReuniaoStatus;
  /** T1, T2, T3, T4 — apenas para reuniões de cliente */
  ciclo?: number;
  /** A CS participa da reunião? Registros antigos assumem "Participa". */
  participacao_cs?: ParticipacaoCS;
  /** Nome do consultor, "Galdino" ou "David" quando a CS não participa */
  responsavel_externo?: string;
  /** 1ª, 2ª, 3ª reunião do cliente com aquele responsável */
  numero_reuniao?: number;
  preparacao?: ItemPreparacao[];
}


