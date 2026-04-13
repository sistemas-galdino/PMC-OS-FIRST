export interface Tarefa {
  id: string
  titulo: string
  descricao?: string
  linkPadrao?: string
}

export interface Passo {
  id: string
  numero: number
  titulo: string
  descricao?: string
  tarefas: Tarefa[]
}

export interface Trilha {
  id: string
  titulo: string
  subtitulo?: string
  passos: Passo[]
}

export type CampoTipo = "text" | "url" | "textarea" | "file"

export interface Campo {
  key: string
  label: string
  tipo: CampoTipo
  obrigatorio?: boolean
  placeholder?: string
  opcional?: boolean
}

export interface Pilar {
  id: string
  titulo: string
  subtitulo: string
  oQueEnviar: string[]
  permiteMultiplas: boolean
  exemploComentario: string
  comentarioHelp?: string
  campos: Campo[]
}

// -------- Trilha (conteúdo / aulas) --------
// Copy e links vindos de `evidencias/trilha.png` + `evidencias/links-etapas.txt`.
// Mantenha os IDs intactos — são chaveados em vários lugares.
export const TRILHA_IA: Trilha = {
  id: "trilha-ia-pmc",
  titulo: "Trilha de Implementação de Inteligência Artificial da PMC",
  subtitulo: "Programa Multiplicador de Crescimento",
  passos: [
    {
      id: "passo-1-organizacao-estrutura-ia",
      numero: 1,
      titulo: "Organização e definição do Guardião da IA",
      descricao:
        "Definir dentro da empresa quem será o responsável por liderar a adoção da Inteligência Artificial e organizar a implementação da IA no negócio.",
      tarefas: [
        {
          id: "p1-t1-organizacao-processo-guardiao",
          titulo: "Organização e Processo: o Guardião da IA",
          descricao:
            "Aula sobre o papel do Guardião da IA na empresa e como estruturar processos e a adoção de inteligência artificial.",
          linkPadrao:
            "https://app.multiplicadordecrescimento.com.br/241789-programa-multiplicador-de-crescimento/5205146-organizacao-e-processo-o-guardiao-da-ia",
        },
        {
          id: "p1-t2-encontro-multiplica-time-28-11",
          titulo: "Encontro Multiplica Time – Aplicação estratégica da IA",
          descricao:
            "Conteúdo sobre a visão estratégica da inteligência artificial dentro das empresas e o papel do Guardião da IA.",
          linkPadrao:
            "https://app.multiplicadordecrescimento.com.br/241789-programa-multiplicador-de-crescimento/5136623-encontro-multiplica-time-ao-vivo-dia-28-11",
        },
      ],
    },
    {
      id: "passo-2-analise-ferramentas-ia",
      numero: 2,
      titulo: "Análise de indicadores com IA",
      descricao:
        "Utilizar Inteligência Artificial para interpretar dados do negócio e tomar decisões baseadas em indicadores.",
      tarefas: [
        {
          id: "p2-t1-diagnostico-ia-dashboards",
          titulo: "Diagnóstico de IA e Dashboards",
          descricao:
            "Apresenta um diagnóstico com seis pilares para entender o estágio de cada negócio, finalizando com demonstração prática de como transformar dados da empresa em dashboards estratégicos usando IA.",
          linkPadrao:
            "https://app.multiplicadordecrescimento.com.br/241789-programa-multiplicador-de-crescimento/5289634-diagnostico-de-ia-e-dashboards",
        },
        {
          id: "p2-t2-decisao-com-dados-5-analises",
          titulo: "Decisão com Dados + 5 análises + Rotina 4h00",
          descricao:
            "Pare de decidir no achismo e comece a usar dados para gerar lucro real. Aprenda as 5 análises de ouro e a estruturar uma rotina de alta performance com IA. Menos execução operacional, mais decisões estratégicas.",
          linkPadrao:
            "https://app.multiplicadordecrescimento.com.br/241789-programa-multiplicador-de-crescimento/5284709-decisao-com-dados-5-analises-rotina-4h00",
        },
        {
          id: "p2-t3-planejamento-2026-galdino",
          titulo: "Planejamento Estratégico 2026 com IA — Parte 01",
          descricao:
            "Apresenta o Instituto de Pesquisa Galdino para análise de mercado, com foco em aplicar IA para interpretar dados e tendências do negócio.",
          linkPadrao:
            "https://app.multiplicadordecrescimento.com.br/241789-programa-multiplicador-de-crescimento/5087331-planejamento-estrategico-2026-e-instituto-de-pesquisa-galdino",
        },
        {
          id: "p2-t4-planejamento-2026-manus-okr",
          titulo: "Planejamento Estratégico 2026 com IA (Manus.im e OKR) — Parte 02",
          descricao:
            "Galdino ensina a usar a IA Manus.im para construir o planejamento estratégico de 2026, analisar o DRE, criar OKRs e transformar metas em planos de ação concretos.",
          linkPadrao:
            "https://app.multiplicadordecrescimento.com.br/241789-programa-multiplicador-de-crescimento/5087551-planejamento-estrategico-2026-com-ia-manus-im-e-okr",
        },
      ],
    },
    {
      id: "passo-3-criacao-notebooklm",
      numero: 3,
      titulo: "Criação de dashboards com IA",
      descricao:
        "Criar dashboards e painéis para visualizar os indicadores da empresa em tempo real.",
      tarefas: [
        {
          id: "p3-t1-diagnostico-ia-dashboards",
          titulo: "Diagnóstico de IA e Dashboards",
          descricao:
            "Apresenta um diagnóstico com seis pilares para entender o estágio de cada negócio, finalizando com demonstração prática de como transformar dados da empresa em dashboards estratégicos usando IA.",
          linkPadrao:
            "https://app.multiplicadordecrescimento.com.br/241789-programa-multiplicador-de-crescimento/5289634-diagnostico-de-ia-e-dashboards",
        },
        {
          id: "p3-t2-estrategia-plano-sistemas-ia",
          titulo: "Estratégia, plano de ação e sistemas com IA",
          descricao:
            "A partir de dados e dashboards, mostra como gerar relatórios analíticos e planos de ação estratégicos de 90 dias com IA. Apresenta análises preditivas e como criar sistemas internos e automações usando IA e Lovable.",
          linkPadrao:
            "https://app.multiplicadordecrescimento.com.br/241789-programa-multiplicador-de-crescimento/5289639-estrategia-plano-de-acao-e-sistemas-com-ia",
        },
      ],
    },
    {
      id: "passo-4-adaptacao-processos-ia",
      numero: 4,
      titulo: "Mapeamento e otimização de processos com IA",
      descricao:
        "Utilizar inteligência artificial para agilizar processos internos e melhorar fluxo de trabalho.",
      tarefas: [
        {
          id: "p4-t1-estruturar-processos-pops-notebooklm",
          titulo: "Como estruturar processos com IA: POPs e organização no Notebook LM",
          descricao:
            "Aula sobre como criar POPs (Procedimentos Operacionais Padrão) e organizar o histórico de clientes dentro do Notebook LM para processos estratégicos.",
          linkPadrao:
            "https://app.multiplicadordecrescimento.com.br/241789-programa-multiplicador-de-crescimento/4969687-como-estruturar-processos-com-ia-pops-e-organizacao-no-notebook-lm",
        },
        {
          id: "p4-t2-diagnostico-caos-processos",
          titulo: "Diagnóstico do Caos + Processos que Libertam",
          descricao:
            "Aula sobre como identificar gargalos e desenhar processos que libertam a operação.",
          linkPadrao:
            "https://app.multiplicadordecrescimento.com.br/241789-programa-multiplicador-de-crescimento/5284704-diagnostico-do-caos-processos-que-libertam",
        },
        {
          id: "p4-t3-funis-processos-comerciais-ia",
          titulo: "Construindo Funis e Processos Comerciais com IA na Prática",
          descricao:
            "Como usar IA para construir funis e processos comerciais ponta a ponta (WhatsApp, SalesBot, automações e templates).",
          linkPadrao:
            "https://app.multiplicadordecrescimento.com.br/241789-programa-multiplicador-de-crescimento/4944656-construindo-funis-e-processos-comerciais-com-ia-na-pratica",
        },
        {
          id: "p4-t4-criando-projetos-manus",
          titulo: "Criando projetos no Manus – Parte 01",
          descricao:
            "Introdução à criação de projetos no Manus: briefing, estrutura e primeiros outputs.",
          linkPadrao:
            "https://app.multiplicadordecrescimento.com.br/241789-programa-multiplicador-de-crescimento/4801808-criando-projetos-no-manus",
        },
        {
          id: "p4-t5-desenvolvimento-projetos-manus",
          titulo: "Criando projetos no Manus – Parte 02",
          descricao:
            "Desenvolvimento de projetos no Manus: aprofundamento em dashboards, relatórios e análises.",
          linkPadrao:
            "https://app.multiplicadordecrescimento.com.br/241789-programa-multiplicador-de-crescimento/4901180-3-desenvolvimento-de-projetos-com-o-manus",
        },
        {
          id: "p4-t6-criando-projetos-manus-p3",
          titulo: "Criando projetos no Manus – Parte 03",
          descricao:
            "Continuação: organização do time, entregas e encerramento de projetos no Manus.",
          linkPadrao:
            "https://app.multiplicadordecrescimento.com.br/241789-programa-multiplicador-de-crescimento/4901180-3-desenvolvimento-de-projetos-com-o-manus",
        },
        {
          id: "p4-t7-produtividade-plano-30-60-90",
          titulo: "Produtividade, sistemas e plano 30, 60 e 90 dias",
          descricao:
            "Apresenta a IA aplicada na prática para aumentar produtividade e criar sistemas, com casos reais, ferramentas e automações, e um plano de ação estruturado para os próximos 30, 60 e 90 dias.",
          linkPadrao:
            "https://app.multiplicadordecrescimento.com.br/241789-programa-multiplicador-de-crescimento/5205155-produtividade-sistemas-e-plano-30-60-e-90-dias",
        },
      ],
    },
    {
      id: "passo-5-criacao-agentes-ia",
      numero: 5,
      titulo: "Criação de agentes com IA",
      descricao:
        "Criar agentes de Inteligência Artificial para automatizar tarefas e processos dentro da empresa.",
      tarefas: [
        {
          id: "p5-t1-agentes-claude-automacao",
          titulo: "Agentes de IA com Claude e Automação de Processos",
          descricao:
            "Visão prática sobre o uso de agentes autônomos para automatizar processos empresariais. Explica a diferença entre prompts, automações e agentes inteligentes, com aplicações reais em marketing, análise de dados e operações.",
          linkPadrao:
            "https://app.multiplicadordecrescimento.com.br/241789-programa-multiplicador-de-crescimento/5305739-agentes-de-ia-com-claude-e-automacao-de-processos",
        },
        {
          id: "p5-t2-arquiteto-campanhas-ia",
          titulo: "Arquiteto de Campanhas – Engenharia com IA",
          descricao:
            "Apresentação prática de um agente que constrói campanha completa (persona, dores, criativos, anúncios e estratégia de venda), com explicação dos 4 inputs obrigatórios e exercício ao vivo.",
          linkPadrao:
            "https://app.multiplicadordecrescimento.com.br/241789-programa-multiplicador-de-crescimento/5254084-arquiteto-de-campanhas-engenharia-com-ia",
        },
      ],
    },
    {
      id: "passo-6-implementacao-sistemas-ia",
      numero: 6,
      titulo: "Implementação de sistemas com IA",
      descricao:
        "Implementar sistemas estruturados com Inteligência Artificial dentro da empresa para apoiar gestão, execução e crescimento.",
      tarefas: [
        {
          id: "p6-t1-produtividade-plano-30-60-90",
          titulo: "Produtividade, sistemas e plano 30, 60 e 90 dias",
          descricao:
            "Apresenta a IA aplicada na prática para aumentar produtividade e criar sistemas, com casos reais, ferramentas e automações, e um plano de ação estruturado para os próximos 30, 60 e 90 dias.",
          linkPadrao:
            "https://app.multiplicadordecrescimento.com.br/241789-programa-multiplicador-de-crescimento/5205155-produtividade-sistemas-e-plano-30-60-e-90-dias",
        },
        {
          id: "p6-t2-estrategia-plano-sistemas-ia",
          titulo: "Estratégia, plano de ação e sistemas com IA",
          descricao:
            "A partir de dados e dashboards, mostra como gerar relatórios analíticos e planos de ação estratégicos de 90 dias com IA. Apresenta análises preditivas e como criar sistemas internos e automações usando IA e Lovable.",
          linkPadrao:
            "https://app.multiplicadordecrescimento.com.br/241789-programa-multiplicador-de-crescimento/5289639-estrategia-plano-de-acao-e-sistemas-com-ia",
        },
        {
          id: "p6-t3-stitch-telas-apps-prototipos-ia",
          titulo: "Stitch — Telas, Apps e Protótipos com IA",
          descricao:
            "Ensina como usar o Stitch (Gemini) para desenhar telas de aplicativos, landing pages e estruturas visuais, transformando ideias em protótipos prontos para validação e venda.",
          linkPadrao:
            "https://app.multiplicadordecrescimento.com.br/241789-programa-multiplicador-de-crescimento/5253871-stitch-telas-apps-e-prototipos-com-ia",
        },
      ],
    },
  ],
}

// -------- Pilares de evidência (independentes da trilha) --------
// Copy extraída verbatim de `evidencias/image.png` a `image5.png`. Use "Empresa Exemplo"
// em vez do nome da empresa real. Não renomeie `id` dos pilares nem os `key` dos campos
// — são persistidos como JSONB em `cliente_pilar_evidencias`.
const COMENTARIO_HELP = "Cite o nome da empresa, os resultados obtidos e os ganhos mensuráveis."

export const PILARES: Pilar[] = [
  {
    id: "pilar-guardiao-ia",
    titulo: "Guardião da IA",
    subtitulo: "Identifique o responsável pela governança e estratégia de IA na empresa.",
    permiteMultiplas: false,
    oQueEnviar: [
      "Nome completo do Guardião da IA",
      "Cargo e função na empresa",
      "Foto do Guardião da IA (documento comprobatório)",
    ],
    exemploComentario:
      "A Empresa Exemplo designou João Silva, Diretor de Inovação, como Guardião da IA. Desde sua nomeação, a empresa reduziu em 40% o tempo de decisão sobre projetos de IA e garantiu governança em todas as iniciativas.",
    comentarioHelp: COMENTARIO_HELP,
    campos: [
      { key: "nome_guardiao", label: "Nome do Guardião", tipo: "text", obrigatorio: true, placeholder: "Ex: João Silva" },
      { key: "cargo_guardiao", label: "Cargo do Guardião", tipo: "text", obrigatorio: true, placeholder: "Ex: Diretor de Inovação" },
      { key: "foto_guardiao", label: "Foto do Guardião da IA", tipo: "file", obrigatorio: true },
    ],
  },
  {
    id: "pilar-dashboard-ia",
    titulo: "Dashboard com IA",
    subtitulo: "Comprove a existência de dashboards inteligentes. Após enviar o primeiro, você pode adicionar mais.",
    permiteMultiplas: true,
    oQueEnviar: [
      "Screenshot do dashboard em funcionamento",
      "Foto apresentando o dashboard ao time",
      "Evidência de uso recorrente pelo time",
    ],
    exemploComentario:
      "A Empresa Exemplo implementou um dashboard inteligente que consolidou 12 fontes de dados. O time comercial agora toma decisões 3x mais rápido com visibilidade em tempo real.",
    comentarioHelp: COMENTARIO_HELP,
    campos: [
      { key: "nome_dashboard", label: "Nome do Dashboard", tipo: "text", obrigatorio: true, placeholder: "Ex: Dashboard de Vendas IA" },
      { key: "url_dashboard", label: "URL do Dashboard", tipo: "url", opcional: true, placeholder: "https://..." },
      { key: "screenshot_dashboard", label: "Screenshot ou foto apresentando o dashboard", tipo: "file", obrigatorio: true },
    ],
  },
  {
    id: "pilar-processos-ia",
    titulo: "Processos com IA",
    subtitulo: "Documente cada processo otimizado com IA. Adicione um processo por vez — após enviar, aparece o campo para o próximo.",
    permiteMultiplas: true,
    oQueEnviar: [
      "Nome do processo otimizado",
      "Link do notebook/IA utilizada",
      "Descrição dos gargalos e soluções",
      "Screenshot do processo em funcionamento",
    ],
    exemploComentario:
      "A Empresa Exemplo mapeou o processo de onboarding de clientes com IA via notebook no Colab. O gargalo era um tempo médio de 15 dias; após automação, reduziu para 3 dias, gerando economia de R$50k/mês.",
    comentarioHelp: COMENTARIO_HELP,
    campos: [
      { key: "nome_processo", label: "Nome do Processo", tipo: "text", obrigatorio: true, placeholder: "Ex: Automação de Onboarding" },
      { key: "link_notebook", label: "Link do Notebook / IA utilizada", tipo: "url", obrigatorio: true, placeholder: "https://colab.research.google.com/..." },
      { key: "gargalos", label: "Quais eram os gargalos?", tipo: "textarea", obrigatorio: true, placeholder: "Descreva os principais gargalos identificados. Ex: tempo médio de 15 dias, retrabalho em 30% dos casos..." },
      { key: "solucoes", label: "Quais foram as soluções implementadas?", tipo: "textarea", obrigatorio: true, placeholder: "Descreva as soluções criadas com IA. Ex: automação do fluxo, classificação automática..." },
      { key: "screenshot_processo", label: "Screenshot do processo em funcionamento", tipo: "file", obrigatorio: true },
    ],
  },
  {
    id: "pilar-agentes-ia",
    titulo: "Agentes de IA",
    subtitulo: "Documente cada agente de IA criado. Pode ser no GPT, Claude, Gemini, etc. Adicione um por vez.",
    permiteMultiplas: true,
    oQueEnviar: [
      "Nome e plataforma do agente (GPT, Claude, Gemini...)",
      "URL do agente em funcionamento",
      "Screenshot ou evidência em JPG/PNG",
    ],
    exemploComentario:
      "A Empresa Exemplo criou 3 agentes de IA para atendimento ao cliente, reduzindo o tempo de resposta de 4h para 15min e aumentando o NPS de 62 para 84.",
    comentarioHelp: COMENTARIO_HELP,
    campos: [
      { key: "nome_agente", label: "Nome do Agente", tipo: "text", obrigatorio: true, placeholder: "Ex: Agente de Atendimento" },
      { key: "plataforma_agente", label: "Plataforma", tipo: "text", obrigatorio: true, placeholder: "Ex: GPT, Claude, Gemini, Custom..." },
      { key: "url_agente", label: "URL do Agente", tipo: "url", obrigatorio: true, placeholder: "https://..." },
      { key: "screenshot_agente", label: "Screenshot do agente (JPG ou PNG)", tipo: "file", obrigatorio: true },
    ],
  },
  {
    id: "pilar-sistema-ia",
    titulo: "Sistema com IA",
    subtitulo: "Documente cada sistema implementado com IA. Pode ter um ou vários — adicione um por vez.",
    permiteMultiplas: true,
    oQueEnviar: [
      "Nome e URL do sistema em funcionamento",
      "Descrição do problema que o sistema resolve",
      "Descrição da solução implementada",
      "Screenshot da tela do sistema",
    ],
    exemploComentario:
      "A Empresa Exemplo enfrentava perda de 20% em estoque por falta de previsão. O sistema com IA implementado prevê demanda com 92% de acurácia, eliminando o desperdício e gerando economia de R$200k/ano.",
    comentarioHelp: COMENTARIO_HELP,
    campos: [
      { key: "nome_sistema", label: "Nome do Sistema", tipo: "text", obrigatorio: true, placeholder: "Ex: Sistema Preditivo de Demanda" },
      { key: "url_sistema", label: "URL do Sistema", tipo: "url", obrigatorio: true, placeholder: "https://..." },
      { key: "problema", label: "Qual era o problema?", tipo: "textarea", obrigatorio: true, placeholder: "Descreva o problema que a empresa enfrentava..." },
      { key: "solucao", label: "Qual foi a solução criada?", tipo: "textarea", obrigatorio: true, placeholder: "Descreva a solução implementada com IA..." },
      { key: "screenshot_sistema", label: "Screenshot do sistema", tipo: "file", obrigatorio: true },
    ],
  },
]

export function getAllTarefas(trilha: Trilha = TRILHA_IA): Array<Tarefa & { passoNumero: number; passoTitulo: string }> {
  return trilha.passos.flatMap(p =>
    p.tarefas.map(t => ({ ...t, passoNumero: p.numero, passoTitulo: p.titulo }))
  )
}
