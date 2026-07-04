// Entity types + State for the Sistema Operacional do Guardião de IA.
// Lifted verbatim from IA-Guardian-Hub/src/lib/store.ts — persistence-agnostic.
// Option arrays / seed defaults live in constants.ts; pure helpers in helpers.ts.

export type Prioridade = "Alta" | "Média" | "Baixa";

export type NivelEnvolvimento = "Baixo" | "Médio" | "Alto";
export type PessoaTime = {
  id: string;
  nome: string;
  cargo: string;
  funcao: string;
  contato: string;
  participaIA: boolean;
  envolvimento: NivelEnvolvimento;
};

export type ValidacaoLider = {
  validado: boolean;
  nome: string;
  data: string;
  observacoes: string;
};
export type StatusValidacaoCEO = "Não enviado" | "Enviado" | "Aguardando retorno" | "Aprovado" | "Solicitar ajuste";
export type ValidacaoCEO = {
  precisa: boolean;
  status: StatusValidacaoCEO;
  oQueValidar?: string;
  data?: string;
  observacoes?: string;
};

export type DiagnosticoSetor = {
  // Bloco 4 — Oportunidades com IA
  oportunidadeIA?: string;
  oQueAutomatizar?: string;
  oQueDashboard?: string;
  oQueSistema?: string;
  oQueAgente?: string;
  oQueEficiencia?: string;
  resultadosImportantes?: string[];
  // Bloco 5 — Indicadores e tempo
  horasSemanaRepetitivas?: number;
  horasMesRepetitivas?: number;
  metaReducao?: string;
  custoEnvolvido?: string;
  indicadorAtual?: string;
  indicadorApresentadoCEO?: boolean;
  // Bloco 6 — Prioridade do projeto piloto
  problemaPrimeiro?: string;
  porQuePrioridade?: string;
  primeiroPiloto?: string;
  quemValida?: string;
  prazoTestar?: string;
};

export type Setor = {
  id: string;
  nome: string;
  lider: string;
  guardiao: string;
  prioridade: Prioridade;
  status: string;
  frequencia: string;
  objetivo: string;
  observacoes: string;
  // novos campos estratégicos
  quantidadePessoas?: number;
  time?: PessoaTime[];
  faseAtual?: Fase;
  validacaoLider?: ValidacaoLider;
  validacaoCEO?: ValidacaoCEO;
  resumoCEO?: string;
  diagnostico?: DiagnosticoSetor;
};

export type ImpactoTarefa =
  | "Perda de tempo" | "Retrabalho" | "Risco de erro" | "Falta de visibilidade"
  | "Lentidão na entrega" | "Falta de padrão" | "Dificuldade de decisão"
  | "Custo operacional" | "Perda de receita" | "Experiência ruim do cliente";

export type ProcessoSetor = {
  id: string;
  setorId: string;
  nome: string;
  descricao: string;
  quemExecuta: string;
  ferramentas: string;
  temPlanilha: boolean;
  geraIndicador: boolean;
  impacto: string;
  fase: Fase;
  criadoEm: string;
};

export type FrequenciaRepetitiva = "Todo dia" | "Toda semana" | "A cada 15 dias" | "Todo mês" | "Sob demanda";

export type TarefaRepetitiva = {
  id: string;
  setorId: string;
  nome: string;
  descricao: string;
  quemExecuta: string;
  cargo: string;
  qtdPessoas: number;
  frequencia: FrequenciaRepetitiva;
  tempoPorExecucao: number; // em horas
  vezesPorPeriodo: number;
  tempoSemana: number;
  tempoMes: number;
  flagPlanilha: boolean;
  flagCopiaCola: boolean;
  flagBuscaManual: boolean;
  flagRespostaRepetitiva: boolean;
  flagDados: boolean;
  flagComunicacao: boolean;
  flagDecisaoLider: boolean;
  impactos: ImpactoTarefa[];
  criadoEm: string;
};

export type TipoSugestaoIA =
  | "Diagnóstico" | "Gargalo" | "Tarefa de maior impacto" | "Melhoria"
  | "Sistema" | "Agente" | "Automação" | "Próxima ação";

export type StatusSugestao =
  | "Aberta" | "Salva" | "Virou tarefa" | "Virou projeto"
  | "Virou sistema" | "Enviada para líder" | "No relatório CEO";

export type SugestaoIA = {
  id: string;
  setorId: string;
  tipo: TipoSugestaoIA;
  titulo: string;
  texto: string;
  prioridade: "Fazer agora" | "Planejar" | "Deixar para depois";
  faseSugerida: Fase;
  status: StatusSugestao;
  criadoEm: string;
};

export type TipoItemIA =
  | "Dashboard" | "Relatório automático" | "Copiloto" | "Agente"
  | "Sistema" | "Rotina" | "Prompt" | "Automação";

export type ItemIANoSetor = {
  id: string;
  setorId: string;
  nome: string;
  tipo: TipoItemIA;
  fase: Fase;
  responsavel: string;
  status: string;
  resultadoEsperado: string;
  resultadoAlcancado: string;
  link: string;
  criadoEm: string;
};

export type Gargalo = {
  id: string;
  setorId: string;
  processo: string;
  descricao: string;
  ondeTrava: string;
  quemExecuta: string;
  tempo: string;
  pessoas: string;
  ferramentas: string;
  planilha: boolean;
  retrabalho: boolean;
  dependencia: boolean;
  riscoErro: boolean;
  impactos: string[];
  frequencia: string;
  prioridade: Prioridade;
  status: string;
  analiseIA: string;
  ligadoReceita?: boolean;
  ligadoEntrega?: boolean;
};

export type ProjetoTarefa = { label: string; done: boolean };

export type ProjetoRegistro = {
  id: string;
  data: string;
  autor: string;
  tipo: "Nota" | "Marco" | "Evidência" | "Decisão";
  texto: string;
};

export type TipoProjeto = "Piloto" | "Projeto";

export type Projeto = {
  id: string;
  nome: string;
  tipoProjeto: TipoProjeto;
  setorId: string;
  lider: string;
  guardiao: string;
  gargaloId?: string;
  problema: string;
  solucao: string;
  tipoEntrega: string;
  meta: string;
  prazo: string;
  status: string;
  resultadoEsperado: string;
  resultadoAlcancado: string;
  horasEconomizadas: number;
  evidencias: string;
  observacoes: string;
  precisaApoio: boolean;
  tipoApoio: string;
  consultor: string;
  tarefasPadrao: ProjetoTarefa[];
  registros?: ProjetoRegistro[];
  updatedAt?: string;
  faseOrigem?: 4 | 5 | 6;
};

export type TipoRotina = "Diária" | "Semanal" | "Quinzenal" | "Mensal" | "Não se aplica";
export type OrigemTarefa =
  | "Criada manualmente"
  | "Rotina diária"
  | "Rotina semanal"
  | "Rotina quinzenal"
  | "Rotina mensal"
  | "Disseminação da cultura"
  | "Projeto piloto"
  | "Gargalo"
  | "Recomendação da fase";
export type Recorrencia = "Sem recorrência" | "Todos os dias" | "Toda semana" | "A cada 15 dias" | "Todo mês";

export type Tarefa = {
  id: string;
  titulo: string;
  descricao?: string;
  setorId?: string;
  projetoId?: string;
  gargaloId?: string;
  lider?: string;
  responsavel: string;
  prazo: string;
  horario?: string;
  prioridade: Prioridade;
  status: string;
  tipo: string;
  origem?: OrigemTarefa;
  tipoRotina?: TipoRotina;
  recorrencia?: Recorrencia;
  observacoes: string;
  resultadoEsperado?: string;
  resultadoAlcancado?: string;
  evidencia?: string;
  fase?: Fase;
  processo?: string;
  evidenciaNecessaria?: string;
};

export type Ritual = {
  id: string;
  data: string;
  tipo: "Diário" | "Semanal" | "Quinzenal" | "Mensal";
  setorId?: string;
  lider: string;
  status: string;
  observacoes: string;
};

export type ExemploCS = {
  id: string;
  titulo: string;
  dor: string;
  processoAntes: string;
  solucaoIA: string;
  ganhoLider: string;
  status: string;
};

export type ResumoSemana = {
  setorPrioritario: string;
  principalGargalo: string;
  projetoAndamento: string;
  proximaAcao: string;
  apoioCEO: string;
  apoioPMC: string;
};

export type Relatorio = {
  id: string;
  periodo: string;
  conteudo: string;
  criadoEm: string;
};

// ---------- Jornada das 7 fases ----------
export type Fase = 1 | 2 | 3 | 4 | 5 | 6 | 7;
export type StatusFase =
  | "Bloqueada"
  | "Não iniciada"
  | "Em andamento"
  | "Aguardando validação"
  | "Validada"
  | "Concluída";

export type FaseEstado = {
  status: StatusFase;
  progresso: number;
  observacoes: string;
  feedbackCS: string;
  concluidaEm?: string;
  checklist: Record<string, boolean>;
  setoresEnvolvidos: string[];
  resultadoAlcancado: string;
  resumoCEO: string;
  proximaAcao: string;
  dataInicio?: string;
  prazoPrevisto?: string;
};

export type Jornada = {
  faseAtual: Fase;
  fases: Record<Fase, FaseEstado>;
};

export type GuardiaoPerfil = {
  nomePrincipal: string;
  cargo: string;
  setor: string;
  email: string;
  telefone: string;
  lider: string;
  ceo: string;
  reserva: string;
  modeloEmpresa: "Até 10 colaboradores" | "De 10 a 100 colaboradores" | "Acima de 100 colaboradores" | "Acima de 200 colaboradores" | "";
  colaboradores: string;
  maturidade: string;
  ferramentas: string;
  dificuldades: string;
  habilidades: {
    adocao: number;
    visao: number;
    comunicacao: number;
    responsabilidade: number;
    mudanca: number;
  };
};

export type StatusEvidencia = "Pendente" | "Aprovada" | "Ajustar";

export type Evidencia = {
  id: string;
  fase: Fase;
  setorId?: string;
  tipo: string;
  titulo: string;
  link?: string;
  responsavel: string;
  data: string;
  status: StatusEvidencia;
  observacaoCS: string;
};

export type StatusApoio = "Solicitado" | "Em atendimento" | "Entregue" | "Cancelado";

export type Apoio = {
  id: string;
  fase?: Fase;
  setorId?: string;
  tipo: string;
  descricao: string;
  prioridade: Prioridade;
  consultorSugerido: string;
  linkAgenda?: string;
  status: StatusApoio;
  criadoEm: string;
};

export type ItemArsenal = {
  id: string;
  categoria: string;
  objetivo: string;
  setorId?: string;
  descricao: string;
  resultadoEsperado: string;
  consultorSugerido: string;
  linkAgenda?: string;
  status: StatusApoio;
  evidencia?: string;
  projetoId?: string;
  criadoEm: string;
};

export type InteligenciaSetor = {
  setorId: string;
  indicadores: string;
  ondeEstaoDados: string;
  existePlanilha: boolean;
  existeDashboard: boolean;
  apresentaIndicadores: boolean;
  frequenciaAnalise: string;
  meta: string;
  indicadorPrincipal: string;
  dashboardLink: string;
  planoAcao: string;
};

export type ModoVisualizacao = "cliente" | "cs";

export type PromptsMetodologia = Record<Fase, string>;

// ---------- Central de Vitórias ----------
export type StatusVitoria =
  | "Rascunho" | "Registrada" | "Em validação"
  | "Validada pela CS / PMC" | "Apresentada ao CEO" | "Publicável como case";

export type VitoriaEvidencia = { id: string; tipo: string; descricao: string; link: string };

export type Vitoria = {
  id: string;
  titulo: string;
  data: string;
  setorId?: string;
  setorNome?: string;
  fase: Fase;
  guardiao: string;
  liderSetor: string;
  tipos: string[];
  gargaloDescricao: string;
  ondeTravava: string;
  comoEraAntes: string;
  tempoAntes: string;
  impactoAntes: string;
  solucaoDescricao: string;
  tipoSolucao: string;
  nomeSolucao: string;
  linkSolucao: string;
  faseSolucao?: Fase;
  setorBeneficiado: string;
  quemUsaHoje: string;
  reducaoHoras: boolean;
  horasDia: number;
  horasSemana: number;
  horasMes: number;
  ganhoEficiencia: boolean;
  percentualEficiencia: number;
  reducaoCusto: boolean;
  valorCustoEconomizado: number;
  aumentoReceita: boolean;
  valorReceita: string;
  melhoriaDecisao: boolean;
  resumoVitoria: string;
  teveApoioPMC: boolean;
  apoioQuem: string[];
  apoioDecisivo: string[];
  apoioDescricao: string;
  apoioLink: string;
  evidencias: VitoriaEvidencia[];
  observacoes: string;
  status: StatusVitoria;
  noRelatorioCEO: boolean;
  resumoCEO: string;
  criadoEm: string;
};

// ---------- Feedback do Guardião para o Líder ----------
export type StatusFeedbackLider =
  | "Enviado" | "Em andamento" | "Aguardando retorno" | "Concluído" | "Travado";

export type FeedbackLider = {
  id: string;
  titulo: string;
  setorId: string;
  liderDestinatario: string;
  fase: Fase;
  projetoId?: string;
  gargaloId?: string;
  descricao: string;
  proximaAcao: string;
  prazo: string;
  prioridade: Prioridade;
  status: StatusFeedbackLider;
  guardiao: string;
  criadoEm: string;
  atualizadoEm?: string;
};

export type State = {
  setores: Setor[];
  gargalos: Gargalo[];
  projetos: Projeto[];
  tarefas: Tarefa[];
  rituais: Ritual[];
  exemplosCS: ExemploCS[];
  resumo: ResumoSemana;
  relatorios: Relatorio[];
  promptCompleto: string;
  jornada: Jornada;
  guardiao: GuardiaoPerfil;
  evidencias: Evidencia[];
  apoios: Apoio[];
  arsenal: ItemArsenal[];
  inteligencia: InteligenciaSetor[];
  modo: ModoVisualizacao;
  promptsMetodologia: PromptsMetodologia;
  vitorias: Vitoria[];
  processosSetor: ProcessoSetor[];
  tarefasRepetitivas: TarefaRepetitiva[];
  sugestoesIA: SugestaoIA[];
  itensIA: ItemIANoSetor[];
  feedbacks: FeedbackLider[];
};
