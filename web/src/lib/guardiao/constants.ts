// Constants for the Sistema Operacional do Guardião de IA.
// Option arrays, per-phase metadata, default prompts and seed task templates.
// Copied verbatim from IA-Guardian-Hub/src/lib/store.ts.

import type {
  Fase,
  ImpactoTarefa,
  FrequenciaRepetitiva,
  TipoItemIA,
  PromptsMetodologia,
  TipoProjeto,
  TipoRotina,
  OrigemTarefa,
  Recorrencia,
  StatusVitoria,
  StatusFeedbackLider,
  ProjetoTarefa,
} from "./types";

export const IMPACTOS_TAREFA: ImpactoTarefa[] = [
  "Perda de tempo", "Retrabalho", "Risco de erro", "Falta de visibilidade",
  "Lentidão na entrega", "Falta de padrão", "Dificuldade de decisão",
  "Custo operacional", "Perda de receita", "Experiência ruim do cliente",
];

export const FREQ_REPETITIVA: FrequenciaRepetitiva[] = ["Todo dia", "Toda semana", "A cada 15 dias", "Todo mês", "Sob demanda"];

export const TIPOS_ITEM_IA: TipoItemIA[] = [
  "Dashboard", "Relatório automático", "Copiloto", "Agente",
  "Sistema", "Rotina", "Prompt", "Automação",
];

export const FASES: Array<{ num: Fase; titulo: string; objetivo: string; resumo: string }> = [
  { num: 1, titulo: "Guardião de IA", objetivo: "Definir o Guardião e preparar a base de execução.",
    resumo: "Remove a barreira tecnológica e cria o primeiro pilar tático." },
  { num: 2, titulo: "Inteligência Empresarial", objetivo: "Transformar dados brutos em dashboard, análise, estratégia e rotina.",
    resumo: "Dados → Dashboard → Análise → Estratégia → Rotina." },
  { num: 3, titulo: "Mapeador de Gargalos", objetivo: "Identificar processos que travam receita, entrega, caixa e experiência.",
    resumo: "Foco em processos ligados a receita e entrega." },
  { num: 4, titulo: "Engenharia de Eficiência Operacional", objetivo: "Transformar gargalos em soluções validadas de baixo custo.",
    resumo: "Valida antes de escalar: prompts, fluxos, automações, protótipos." },
  { num: 5, titulo: "Construção de Copilotos e Rotinas", objetivo: "Criar copilotos, agentes, prompts e rotinas recorrentes.",
    resumo: "Transforma solução validada em rotina." },
  { num: 6, titulo: "Implementação de Sistemas Inteligentes", objetivo: "Transformar processos validados em sistemas internos.",
    resumo: "Eu tenho um problema. Eu crio um sistema para resolver." },
  { num: 7, titulo: "Arsenal do Lucro", objetivo: "Solicitar apoio estratégico para ações que aceleram receita.",
    resumo: "Paralela: marketing, comercial, CRM, posicionamento, campanhas." },
];

export const PROMPT_PADRAO = `Você é um consultor especialista em implementação de IA dentro de empresas, seguindo a metodologia do Guardião de IA.

Sua missão é ajudar o Guardião a transformar gargalos operacionais em rotinas, automações, dashboards, agentes, prompts e sistemas simples.

Contexto:
Setor analisado: [preencher setor]
Líder responsável: [preencher líder]
Processo analisado: [preencher processo]
Gargalo identificado: [preencher gargalo]
Frequência do problema: [diário, semanal, quinzenal, mensal]
Ferramentas usadas hoje: [preencher ferramentas]
Existe planilha envolvida? [sim/não]
Tempo gasto atualmente: [preencher tempo]
Impacto principal: [tempo, custo, receita, qualidade, atendimento, decisão do dono]

Com base nessas informações, faça:

1. Diagnóstico do gargalo
2. Sugestão de melhoria com IA
3. Tipo de solução recomendada (prompt, dashboard, automação, agente, sistema, integração)
4. Sistema sugerido (nome + descrição)
5. Primeiro passo prático
6. Perguntas para o líder
7. Plano de implementação
8. Indicadores de sucesso
9. Relatório executivo para o CEO
10. Próximos passos em ordem de prioridade`;

export const PROMPTS_FASE_PADRAO: PromptsMetodologia = {
  1: `Você é um consultor que ajuda a definir o Guardião de IA da empresa.
Considere o porte da empresa, a maturidade em IA e os setores existentes.
Recomende: quem deve ser o Guardião principal, perfil ideal, responsabilidades,
rotina inicial sugerida, sponsor (CEO/dono), e como estruturar Guardiões por setor
quando há mais de 100 colaboradores. Entregue como plano prático.`,
  2: `Você é um consultor de inteligência empresarial. Para o setor informado,
ajude o Guardião a sair de planilhas soltas e chegar a: dashboard, análise,
estratégia e rotina. Liste indicadores essenciais, fontes de dados, modelo de
dashboard, plano de ação e cadência de apresentação para o CEO.`,
  3: `Você é um especialista em mapeamento de gargalos. Para o processo informado,
identifique: onde trava, causa provável, impacto (receita, entrega, caixa, qualidade,
atendimento), prioridade, esforço, e sugira o melhor tipo de solução (prompt, fluxo,
checklist, dashboard, automação, copiloto, sistema, integração).`,
  4: `Você é um engenheiro de eficiência operacional. A partir do gargalo informado,
proponha uma solução de baixo custo para validar rapidamente: tipo de solução,
ferramenta, passo a passo do protótipo, dados de teste, critérios de validação
com líder e com CEO, e quando escalar para copiloto (Fase 5) ou sistema (Fase 6).`,
  5: `Você ajuda a construir copilotos, agentes e rotinas recorrentes. Para a solução
validada, gere: nome do copiloto, prompt base, entradas necessárias, saída esperada,
frequência (diária/semanal/quinzenal/mensal), responsável humano, quem valida,
treinamento da equipe e métricas de uso.`,
  6: `Você ajuda a transformar rotinas validadas em sistemas internos. A partir do
gargalo e da rotina, gere: análise de requisitos, usuários, dados, telas, MVP,
indicadores que o sistema deve mostrar, plano de implantação, treinamento e
medição de resultado.`,
  7: `Você é um consultor de Arsenal do Lucro. Categorize a demanda (marketing,
tráfego, comercial, CRM, GMN, posicionamento, oferta, rede social, campanhas,
narrativa, funil, vendas, retenção). Sugira o consultor PMC ideal, próximos
passos, entregáveis esperados e como medir o ROI.`,
};

export const SETORES_DISPONIVEIS = [
  "Marketing", "Financeiro", "Comercial", "CEO / Diretoria",
  "Administrativo", "Operações", "Compras", "Estoque",
  "RH", "CS / Atendimento", "Jurídico", "Outro",
];

export const STATUS_SETOR = [
  "Não iniciado", "Em diagnóstico", "Em execução",
  "Em validação", "Em acompanhamento", "Concluído",
];

export const STATUS_GARGALO = [
  "Mapeado", "Em análise", "Solução sugerida",
  "Virou projeto piloto", "Resolvido", "Arquivado",
];

export const STATUS_PROJETO = [
  "Ideia", "Diagnóstico", "Validado com líder",
  "Em construção", "Em teste", "Implementando",
  "Implementado", "Medindo resultados",
  "Apresentado ao CEO", "Apresentado ao time",
];

export const TIPOS_PROJETO: TipoProjeto[] = ["Piloto", "Projeto"];

export const STATUS_TAREFA = [
  "A fazer", "Em andamento", "Aguardando validação", "Concluído", "Travado",
];

export const TIPOS_ROTINA: TipoRotina[] = ["Diária", "Semanal", "Quinzenal", "Mensal", "Não se aplica"];

export const ORIGENS_TAREFA: OrigemTarefa[] = [
  "Criada manualmente", "Rotina diária", "Rotina semanal",
  "Rotina quinzenal", "Rotina mensal", "Disseminação da cultura",
  "Projeto piloto", "Gargalo",
];

export const RECORRENCIAS: Recorrencia[] = [
  "Sem recorrência", "Todos os dias", "Toda semana", "A cada 15 dias", "Todo mês",
];

export const TIPOS_TAREFA = [
  "Reunião", "Diagnóstico", "Construção", "Validação",
  "Treinamento", "Relatório", "Acompanhamento",
];

export const TIPOS_ENTREGA = [
  "Dashboard", "Sistema", "Automação", "Relatório",
  "Agente", "Prompt", "Rotina", "Integração",
];

export const TIPOS_APOIO = [
  "Estratégia de IA", "Dashboard", "Mapeamento de gargalo",
  "Automação", "Prompt", "Skill", "Copiloto", "Sistema",
  "Comercial", "Marketing", "CRM", "Tráfego", "Posicionamento", "Outro",
];

export const CATEGORIAS_ARSENAL = [
  "Marketing", "Tráfego", "Comercial", "CRM", "Google Meu Negócio",
  "Posicionamento", "Oferta", "Rede social", "Campanhas",
  "Narrativa", "Funil", "Vendas", "Retenção",
];

export const TIPOS_EVIDENCIA = [
  "Guardião definido", "Dashboard criado", "Indicadores organizados",
  "Processo mapeado", "Gargalo cadastrado", "Prompt criado",
  "Agente / copiloto criado", "Rotina criada", "Sistema criado",
  "Organograma híbrido", "Relatório para CEO", "Resultado alcançado",
  "Print", "Link", "Arquivo", "Vídeo",
];

// Evidências obrigatórias por fase (chaves usadas para gating)
export const EVIDENCIAS_OBRIGATORIAS: Record<Fase, string[]> = {
  1: ["Guardião definido", "Setores cadastrados", "Rotina inicial cadastrada", "Responsável pela aprovação definido"],
  2: ["Link ou print do dashboard", "Relatório analítico", "Plano de ação", "Rotina do setor cadastrada"],
  3: ["Gargalo cadastrado", "Processo documentado", "Prioridade definida", "Pelo menos 1 solução sugerida", "Top 3 gargalos do setor"],
  4: ["Protótipo criado", "Teste realizado", "Validação do líder", "Resultado registrado"],
  5: ["Prompt criado", "Rotina cadastrada", "Responsável definido", "Teste registrado", "Evidência de uso", "Treinamento realizado"],
  6: ["Análise de requisitos", "Link do sistema", "Print ou vídeo do sistema", "Usuário responsável", "Resultado inicial", "Status de implantação"],
  7: [],
};

// Checklists por fase
export const CHECKLIST_FASE: Record<Fase, string[]> = {
  1: ["Definir Guardião principal", "Definir dono / sponsor", "Definir setores prioritários",
      "Preencher perfil do Guardião", "Avaliar habilidades do Guardião",
      "Criar rotina inicial", "Definir primeira reunião com líderes"],
  2: ["Coletar dados do setor", "Organizar os dados", "Criar dashboard",
      "Gerar análise", "Criar plano de ação", "Definir rotina de acompanhamento",
      "Apresentar para o CEO / dono"],
  3: ["Listar processos do setor", "Mapear top 3 gargalos", "Documentar passo a passo",
      "Classificar por receita/entrega", "Definir prioridade", "Gerar diagnóstico IA",
      "Definir próximo passo"],
  4: ["Escolher gargalo prioritário", "Definir tipo de solução", "Criar primeiro protótipo",
      "Testar com dados reais", "Validar com líder", "Registrar antes/depois",
      "Definir se vira rotina, copiloto ou sistema"],
  5: ["Identificar fluxo", "Criar prompt", "Criar skill ou agente",
      "Estabelecer rotina", "Testar execução", "Treinar usuário",
      "Monitorar resultado", "Ajustar com feedback"],
  6: ["Fazer análise de requisitos", "Definir usuários", "Definir dados",
      "Definir telas", "Criar MVP", "Testar com líder", "Ajustar",
      "Implantar", "Treinar equipe", "Medir resultado"],
  7: ["Definir categoria", "Descrever objetivo", "Solicitar apoio PMC",
      "Agendar com consultor", "Registrar entrega"],
};

// ---------- Metadados ricos por fase ----------
export const PROCESSO_FASE: Record<Fase, string[]> = {
  1: [
    "Definir Guardião principal",
    "Definir sponsor / CEO responsável",
    "Cadastrar setores da empresa",
    "Identificar modelo da empresa pelo número de colaboradores",
    "Avaliar habilidades do Guardião",
    "Criar primeiras tarefas de organização",
    "Definir primeira rotina de acompanhamento",
  ],
  2: [
    "Escolher setor prioritário",
    "Identificar quais indicadores o setor já acompanha",
    "Ver onde os dados estão hoje",
    "Organizar os dados",
    "Criar dashboard",
    "Gerar análise dos dados",
    "Criar plano de ação",
    "Definir rotina de acompanhamento",
    "Apresentar para o CEO",
  ],
  3: [
    "Escolher setor",
    "Entrevistar líder do setor",
    "Mapear processo passo a passo",
    "Identificar onde trava",
    "Classificar impacto do gargalo",
    "Definir prioridade",
    "Gerar sugestão de solução",
    "Escolher gargalos prioritários",
    "Transformar gargalo em projeto",
  ],
  4: [
    "Selecionar gargalo prioritário",
    "Definir tipo de solução",
    "Criar protótipo ou teste",
    "Testar com dados reais",
    "Validar com líder",
    "Medir resultado inicial",
    "Decidir se vira rotina, copiloto ou sistema",
  ],
  5: [
    "Escolher solução validada",
    "Criar prompt ou agente",
    "Definir rotina de uso",
    "Definir responsável humano",
    "Testar execução",
    "Treinar usuário",
    "Monitorar resultado",
    "Ajustar com feedback",
  ],
  6: [
    "Escolher gargalo, rotina ou processo validado",
    "Fazer análise de requisitos",
    "Definir usuários",
    "Definir dados necessários",
    "Definir telas e funcionalidades",
    "Criar MVP",
    "Testar com líder",
    "Ajustar",
    "Implantar",
    "Treinar equipe",
    "Medir resultado",
  ],
  7: [
    "Identificar demanda de crescimento",
    "Escolher categoria",
    "Descrever objetivo",
    "Solicitar apoio PMC",
    "Agendar com consultor",
    "Registrar entrega",
    "Vincular a projeto ou setor",
  ],
};

export const SETORES_SUGERIDOS_FASE: Record<Fase, string[]> = {
  1: ["CEO / Diretoria"],
  2: ["Marketing", "Financeiro", "Comercial", "Operações", "CS / Atendimento"],
  3: ["Marketing", "Comercial", "Operações", "CS / Atendimento", "Financeiro"],
  4: ["Operações", "Comercial", "Marketing"],
  5: ["Operações", "CS / Atendimento", "Comercial", "Marketing"],
  6: ["Operações", "Administrativo", "Financeiro"],
  7: ["Marketing", "Comercial", "CEO / Diretoria"],
};

export const TAREFAS_SUGERIDAS_FASE: Record<Fase, string[]> = {
  1: [
    "Cadastrar Guardião principal",
    "Cadastrar CEO / responsável pela aprovação",
    "Cadastrar setores da empresa",
    "Definir setor prioritário inicial",
    "Preencher habilidades do Guardião",
    "Criar primeira reunião com líderes",
    "Definir rotina inicial da jornada",
  ],
  2: [
    "Escolher setor para inteligência empresarial",
    "Mapear indicadores atuais do setor",
    "Identificar planilhas ou fontes de dados",
    "Criar dashboard inicial",
    "Criar análise dos indicadores",
    "Criar plano de ação de melhoria",
    "Definir rotina de apresentação dos indicadores",
    "Preparar apresentação para CEO",
  ],
  3: [
    "Realizar reunião com líder do setor",
    "Mapear processo atual",
    "Documentar passo a passo",
    "Identificar gargalo principal",
    "Classificar impacto",
    "Definir prioridade",
    "Gerar sugestão de melhoria",
    "Escolher top 3 gargalos do setor",
    "Transformar gargalo prioritário em projeto",
  ],
  4: [
    "Escolher gargalo prioritário",
    "Definir solução inicial",
    "Criar primeiro protótipo",
    "Testar solução",
    "Validar com líder",
    "Registrar antes e depois",
    "Definir próximo caminho: rotina, copiloto ou sistema",
  ],
  5: [
    "Criar prompt base",
    "Criar copiloto ou agente",
    "Definir frequência da rotina",
    "Definir responsável",
    "Testar execução",
    "Treinar líder ou usuário",
    "Cadastrar rotina vinculada ao setor",
    "Monitorar resultado",
  ],
  6: [
    "Escolher processo para virar sistema",
    "Fazer análise de requisitos",
    "Definir usuários do sistema",
    "Definir dados e indicadores",
    "Criar MVP",
    "Testar sistema",
    "Ajustar sistema",
    "Implantar com equipe",
    "Treinar usuários",
    "Medir resultado inicial",
    "Apresentar ao CEO",
  ],
  7: [
    "Descrever demanda de crescimento",
    "Escolher categoria",
    "Definir objetivo",
    "Solicitar apoio PMC",
    "Agendar com consultor",
    "Registrar entrega",
    "Vincular entrega a setor ou projeto",
  ],
};

export const RESULTADO_ESPERADO_FASE: Record<Fase, string> = {
  1: "Empresa com Guardião definido, setores cadastrados e base pronta para iniciar a implementação.",
  2: "Setor com indicadores organizados, dashboard criado, análise gerada e rotina de acompanhamento definida.",
  3: "Gargalos principais identificados, priorizados e prontos para virar solução operacional.",
  4: "Solução inicial validada e pronta para ser transformada em rotina, copiloto ou sistema.",
  5: "Processo repetitivo transformado em rotina operacional com IA, com responsável, frequência e acompanhamento.",
  6: "Sistema interno criado, testado, implantado e vinculado a um processo real da empresa.",
  7: "Cliente com apoio direcionado para acelerar receita, lucro ou crescimento.",
};

export const APRESENTAR_CEO_FASE: Record<Fase, string[]> = {
  1: [
    "Quem será o Guardião",
    "Quais setores serão acompanhados",
    "Qual setor será priorizado primeiro",
    "Qual será a rotina inicial de acompanhamento",
    "Quais próximos passos da Fase 02",
  ],
  2: [
    "Quais indicadores foram organizados",
    "Qual dashboard foi criado",
    "Quais análises a IA trouxe",
    "Quais ações serão executadas",
    "Qual rotina será seguida pelo líder",
  ],
  3: [
    "Quais gargalos foram encontrados",
    "Qual setor foi analisado",
    "Onde a operação está travando",
    "Qual impacto no negócio",
    "Quais gargalos devem ser resolvidos primeiro",
    "Qual gargalo será transformado em projeto",
  ],
  4: [
    "Qual gargalo foi escolhido",
    "Qual solução foi testada",
    "Qual resultado inicial apareceu",
    "Qual ganho esperado",
    "Se a solução deve virar rotina, copiloto ou sistema",
  ],
  5: [
    "Qual rotina foi criada",
    "Qual processo foi automatizado ou facilitado",
    "Quem será responsável",
    "Qual frequência de uso",
    "Qual ganho esperado",
    "Quais próximos ajustes serão feitos",
  ],
  6: [
    "Qual problema o sistema resolve",
    "Qual setor será beneficiado",
    "Como era antes",
    "Como ficou depois",
    "Quem vai usar",
    "Qual resultado inicial",
    "Qual próxima evolução",
  ],
  7: [
    "Qual demanda foi solicitada",
    "Qual consultor apoiou",
    "Qual entrega foi realizada",
    "Qual impacto esperado",
    "Qual próximo passo comercial ou estratégico",
  ],
};

export const STATUS_FEEDBACK_LIDER: StatusFeedbackLider[] = [
  "Enviado", "Em andamento", "Aguardando retorno", "Concluído", "Travado",
];

// Como usar cada fase (didática)
export const INSTRUCAO_FASE: Record<Fase, { fazer: string; entregar: string; apresentar: string }> = {
  1: {
    fazer: "Definir o Guardião, cadastrar os setores, identificar os responsáveis e organizar a base de execução.",
    entregar: "Guardião definido, setores cadastrados, responsáveis definidos e rotina inicial criada.",
    apresentar: "Quem será o Guardião, quais setores serão acompanhados e qual será o primeiro setor prioritário.",
  },
  2: {
    fazer: "Organizar dados do setor, criar dashboard, gerar análise, plano de ação e rotina de acompanhamento.",
    entregar: "Indicadores cadastrados, dashboard criado, análise feita e plano de ação definido.",
    apresentar: "Quais dados foram organizados, qual dashboard foi criado, quais análises surgiram e qual plano de ação será seguido.",
  },
  3: {
    fazer: "Mapear processos, identificar tarefas repetitivas, entender onde trava e priorizar os principais gargalos.",
    entregar: "Processos documentados, gargalos cadastrados e top 3 gargalos priorizados.",
    apresentar: "Onde o setor está travando, qual impacto isso gera e qual gargalo será resolvido primeiro.",
  },
  4: {
    fazer: "Transformar gargalos em soluções testadas de baixo custo, como prompt, fluxo, dashboard, automação ou protótipo.",
    entregar: "Solução testada, validação com líder e resultado inicial registrado.",
    apresentar: "Qual solução foi testada, qual gargalo ela resolve e qual ganho esperado.",
  },
  5: {
    fazer: "Criar copilotos, agentes, prompts e rotinas recorrentes para processos repetitivos.",
    entregar: "Prompt criado, rotina cadastrada, responsável definido, teste realizado e treinamento feito.",
    apresentar: "Qual rotina foi criada, quem vai usar, qual frequência e qual ganho esperado.",
  },
  6: {
    fazer: "Transformar processos validados em sistemas internos, MVPs ou ferramentas de acompanhamento.",
    entregar: "Análise de requisitos, sistema criado, teste realizado, usuários definidos e resultado inicial registrado.",
    apresentar: "Qual problema o sistema resolve, como era antes, como ficou depois e qual resultado inicial foi alcançado.",
  },
  7: {
    fazer: "Registrar demandas de crescimento, marketing, comercial, CRM, posicionamento, tráfego, campanha ou receita.",
    entregar: "Demanda registrada, apoio solicitado, entrega realizada e próximo passo definido.",
    apresentar: "Qual ação foi solicitada, qual apoio foi recebido e qual impacto esperado em crescimento ou lucro.",
  },
};

export const PROXIMA_ACAO_FASE: Record<Fase, string> = {
  1: "Cadastrar os líderes dos setores e definir setor prioritário.",
  2: "Criar dashboard inicial com os principais indicadores do setor.",
  3: "Mapear o processo mais repetitivo e identificar onde trava.",
  4: "Testar uma solução simples antes de transformar em sistema.",
  5: "Criar uma rotina recorrente para o processo repetitivo.",
  6: "Transformar a rotina validada em sistema interno.",
  7: "Solicitar apoio PMC para demanda de crescimento.",
};

export const TIPOS_VITORIA = [
  "Eficiência operacional", "Redução de horas", "Redução de custo",
  "Aumento de receita", "Melhoria de atendimento", "Melhoria na tomada de decisão",
  "Criação de dashboard", "Criação de sistema", "Criação de automação",
  "Criação de copiloto / agente", "Melhoria de processo", "Cultura de IA disseminada", "Outro",
];

export const APOIO_QUEM = [
  "Rafael Galdino", "David Abner", "Gustavo", "Issao Yokoi", "CS / Maiara",
  "Fran", "Outro consultor PMC", "Treinamento da área de membros",
  "Multiplica Time", "Multiplica Dono", "Multiplica Case",
  "Encontro Guardião de IA", "Implementation Day", "Reunião individual",
  "Grupo de WhatsApp", "Outro",
];

export const APOIO_DECISIVO = [
  "Direcionamento estratégico", "Construção de sistema", "Criação de dashboard",
  "Mapeamento de gargalo", "Criação de prompt", "Criação de automação",
  "Criação de rotina", "Treinamento do time", "Aula gravada",
  "Case apresentado", "Consultoria individual", "Outro",
];

export const STATUS_VITORIAS: StatusVitoria[] = [
  "Rascunho", "Registrada", "Em validação",
  "Validada pela CS / PMC", "Apresentada ao CEO", "Publicável como case",
];

export const TIPOS_EVIDENCIA_VITORIA = [
  "Link do sistema", "Link do dashboard", "Print", "Vídeo", "Arquivo",
  "Relatório", "Antes e depois", "Depoimento do líder", "Depoimento do CEO",
];

// Template de tarefas padrão de um projeto piloto.
export const TAREFAS_PADRAO: ProjetoTarefa[] = [
  { label: "Etapa 1 — Marcar reunião com o líder", done: false },
  { label: "Etapa 1 — Registrar nome do líder", done: false },
  { label: "Etapa 1 — Registrar data", done: false },
  { label: "Etapa 1 — Anotar principais gargalos", done: false },
  { label: "Etapa 2 — Descrever passo a passo", done: false },
  { label: "Etapa 2 — Identificar onde trava", done: false },
  { label: "Etapa 2 — Identificar planilhas envolvidas", done: false },
  { label: "Etapa 2 — Identificar ferramentas usadas", done: false },
  { label: "Etapa 3 — Escolher tipo de solução", done: false },
  { label: "Etapa 3 — Validar com líder", done: false },
  { label: "Etapa 3 — Validar com CEO se necessário", done: false },
  { label: "Etapa 4 — Criar prompt / dashboard / automação / sistema", done: false },
  { label: "Etapa 4 — Testar com dados reais", done: false },
  { label: "Etapa 5 — Treinar líder", done: false },
  { label: "Etapa 5 — Treinar equipe", done: false },
  { label: "Etapa 5 — Documentar uso", done: false },
  { label: "Etapa 6 — Medir tempo economizado", done: false },
  { label: "Etapa 6 — Medir impacto", done: false },
  { label: "Etapa 6 — Registrar evidência", done: false },
  { label: "Etapa 6 — Apresentar para o CEO", done: false },
];
