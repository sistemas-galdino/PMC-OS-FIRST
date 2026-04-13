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

// Copy e links vindos de `evidencias/trilha.png` + `evidencias/links-etapas.txt`.
// Mantenha os IDs intactos — evidências salvas no banco são chaveadas por eles.
export const TRILHA_IA: Trilha = {
  id: "trilha-ia-pmc",
  titulo: "Trilha de Implementação de Inteligência Artificial da PMC",
  subtitulo: "Programa Multiplicador de Crescimento",
  passos: [
    {
      id: "passo-1-organizacao-estrutura-ia",
      numero: 1,
      titulo: "Organização e Definição da Estrutura de IA",
      tarefas: [
        {
          id: "p1-t1-organizacao-processo-guardiao",
          titulo: "Organização e Processo — O Guardião da IA",
          linkPadrao:
            "https://app.multiplicadordecrescimento.com.br/241789-programa-multiplicador-de-crescimento/5205146-organizacao-e-processo-o-guardiao-da-ia",
        },
        {
          id: "p1-t2-encontro-multiplica-time-28-11",
          titulo: "Encontro Multiplica Time Ao Vivo — dia 28/11",
          linkPadrao:
            "https://app.multiplicadordecrescimento.com.br/241789-programa-multiplicador-de-crescimento/5136623-encontro-multiplica-time-ao-vivo-dia-28-11",
        },
      ],
    },
    {
      id: "passo-2-analise-ferramentas-ia",
      numero: 2,
      titulo: "Análise de ferramentas com IA",
      tarefas: [
        {
          id: "p2-t1-diagnostico-ia-dashboards",
          titulo: "Diagnóstico de IA e Dashboards",
          linkPadrao:
            "https://app.multiplicadordecrescimento.com.br/241789-programa-multiplicador-de-crescimento/5289634-diagnostico-de-ia-e-dashboards",
        },
        {
          id: "p2-t2-decisao-com-dados-5-analises",
          titulo: "Decisão com Dados — 5 Análises Rotina 4h00",
          linkPadrao:
            "https://app.multiplicadordecrescimento.com.br/241789-programa-multiplicador-de-crescimento/5284709-decisao-com-dados-5-analises-rotina-4h00",
        },
        {
          id: "p2-t3-planejamento-2026-galdino",
          titulo: "Planejamento Estratégico 2026 e Instituto de Pesquisa Galdino",
          linkPadrao:
            "https://app.multiplicadordecrescimento.com.br/241789-programa-multiplicador-de-crescimento/5087331-planejamento-estrategico-2026-e-instituto-de-pesquisa-galdino",
        },
        {
          id: "p2-t4-planejamento-2026-manus-okr",
          titulo: "Planejamento Estratégico 2026 com IA, Manus.IM e OKR",
          linkPadrao:
            "https://app.multiplicadordecrescimento.com.br/241789-programa-multiplicador-de-crescimento/5087551-planejamento-estrategico-2026-com-ia-manus-im-e-okr",
        },
      ],
    },
    {
      id: "passo-3-criacao-notebooklm",
      numero: 3,
      titulo: "Criação de NotebookLM com IA",
      tarefas: [
        {
          id: "p3-t1-diagnostico-ia-dashboards",
          titulo: "Diagnóstico de IA e Dashboards",
          linkPadrao:
            "https://app.multiplicadordecrescimento.com.br/241789-programa-multiplicador-de-crescimento/5289634-diagnostico-de-ia-e-dashboards",
        },
        {
          id: "p3-t2-estrategia-plano-sistemas-ia",
          titulo: "Estratégia, Plano de Ação e Sistemas com IA",
          linkPadrao:
            "https://app.multiplicadordecrescimento.com.br/241789-programa-multiplicador-de-crescimento/5289639-estrategia-plano-de-acao-e-sistemas-com-ia",
        },
      ],
    },
    {
      id: "passo-4-adaptacao-processos-ia",
      numero: 4,
      titulo: "Preparação e Adaptação de processos com IA",
      tarefas: [
        {
          id: "p4-t1-estruturar-processos-pops-notebooklm",
          titulo: "Como estruturar processos com IA, POPs e organização no NotebookLM",
          linkPadrao:
            "https://app.multiplicadordecrescimento.com.br/241789-programa-multiplicador-de-crescimento/4969687-como-estruturar-processos-com-ia-pops-e-organizacao-no-notebook-lm",
        },
        {
          id: "p4-t2-diagnostico-caos-processos",
          titulo: "Diagnóstico do Caos — Processos que libertam",
          linkPadrao:
            "https://app.multiplicadordecrescimento.com.br/241789-programa-multiplicador-de-crescimento/5284704-diagnostico-do-caos-processos-que-libertam",
        },
        {
          id: "p4-t3-funis-processos-comerciais-ia",
          titulo: "Construindo funis e processos comerciais com IA na prática",
          linkPadrao:
            "https://app.multiplicadordecrescimento.com.br/241789-programa-multiplicador-de-crescimento/4944656-construindo-funis-e-processos-comerciais-com-ia-na-pratica",
        },
        {
          id: "p4-t4-criando-projetos-manus",
          titulo: "Criando projetos no Manus",
          linkPadrao:
            "https://app.multiplicadordecrescimento.com.br/241789-programa-multiplicador-de-crescimento/4801808-criando-projetos-no-manus",
        },
        {
          id: "p4-t5-desenvolvimento-projetos-manus",
          titulo: "Desenvolvimento de projetos com o Manus",
          linkPadrao:
            "https://app.multiplicadordecrescimento.com.br/241789-programa-multiplicador-de-crescimento/4901180-3-desenvolvimento-de-projetos-com-o-manus",
        },
        {
          id: "p4-t6-produtividade-plano-30-60-90",
          titulo: "Produtividade, Sistemas e Plano 30, 60 e 90 dias",
          linkPadrao:
            "https://app.multiplicadordecrescimento.com.br/241789-programa-multiplicador-de-crescimento/5205155-produtividade-sistemas-e-plano-30-60-e-90-dias",
        },
      ],
    },
    {
      id: "passo-5-criacao-agentes-ia",
      numero: 5,
      titulo: "Criação de agentes com IA",
      tarefas: [
        {
          id: "p5-t1-agentes-claude-automacao",
          titulo: "Agentes de IA com Claude e Automação de Processos",
          linkPadrao:
            "https://app.multiplicadordecrescimento.com.br/241789-programa-multiplicador-de-crescimento/5305739-agentes-de-ia-com-claude-e-automacao-de-processos",
        },
        {
          id: "p5-t2-arquiteto-campanhas-ia",
          titulo: "Arquiteto de Campanhas — Engenharia com IA",
          linkPadrao:
            "https://app.multiplicadordecrescimento.com.br/241789-programa-multiplicador-de-crescimento/5254084-arquiteto-de-campanhas-engenharia-com-ia",
        },
      ],
    },
    {
      id: "passo-6-implementacao-sistemas-ia",
      numero: 6,
      titulo: "Implementação de sistemas com IA",
      tarefas: [
        {
          id: "p6-t1-produtividade-plano-30-60-90",
          titulo: "Produtividade, Sistemas e Plano 30, 60 e 90 dias",
          linkPadrao:
            "https://app.multiplicadordecrescimento.com.br/241789-programa-multiplicador-de-crescimento/5205155-produtividade-sistemas-e-plano-30-60-e-90-dias",
        },
        {
          id: "p6-t2-estrategia-plano-sistemas-ia",
          titulo: "Estratégia, Plano de Ação e Sistemas com IA",
          linkPadrao:
            "https://app.multiplicadordecrescimento.com.br/241789-programa-multiplicador-de-crescimento/5289639-estrategia-plano-de-acao-e-sistemas-com-ia",
        },
        {
          id: "p6-t3-stitch-telas-apps-prototipos-ia",
          titulo: "Stitch — Telas, apps e protótipos com IA",
          linkPadrao:
            "https://app.multiplicadordecrescimento.com.br/241789-programa-multiplicador-de-crescimento/5253871-stitch-telas-apps-e-prototipos-com-ia",
        },
      ],
    },
  ],
}

export function getAllTarefas(trilha: Trilha = TRILHA_IA): Array<Tarefa & { passoNumero: number; passoTitulo: string }> {
  return trilha.passos.flatMap(p =>
    p.tarefas.map(t => ({ ...t, passoNumero: p.numero, passoTitulo: p.titulo }))
  )
}
