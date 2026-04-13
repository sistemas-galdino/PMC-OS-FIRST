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

// NOTE: This is placeholder content derived from the reference image
// `evidencias/trilha.png`. Tweak copy freely — tarefa IDs are stable so
// evidence rows in the DB stay linked across edits. Do NOT rename IDs.
export const TRILHA_IA: Trilha = {
  id: "trilha-ia-pmc",
  titulo: "Trilha de Implementação de Inteligência Artificial da PMC",
  subtitulo: "Programa Multiplicador de Crescimento",
  passos: [
    {
      id: "passo-1-organizacao",
      numero: 1,
      titulo: "Organização e Definição da Estrutura de IA",
      descricao:
        "Ponto inicial da trilha: organize sua empresa e defina a estrutura em que a IA será aplicada.",
      tarefas: [
        {
          id: "p1-t1-definir-estrutura",
          titulo: "Definir estrutura e macro-áreas da empresa",
          descricao:
            "Mapeie as áreas onde IA terá maior impacto: vendas, marketing, operações, gestão.",
        },
        {
          id: "p1-t2-mapear-processos",
          titulo: "Mapear processos críticos atuais",
          descricao:
            "Liste os processos operacionais repetitivos candidatos a automação com IA.",
        },
      ],
    },
    {
      id: "passo-2-analise-ferramentas",
      numero: 2,
      titulo: "Análise de ferramentas com IA",
      descricao: "Avalie as ferramentas disponíveis no mercado e escolha a pilha base.",
      tarefas: [
        {
          id: "p2-t1-benchmark",
          titulo: "Fazer benchmark das principais ferramentas",
          descricao: "Compare ChatGPT, Claude, Gemini, NotebookLM e outras conforme o caso de uso.",
        },
        {
          id: "p2-t2-escolher-stack",
          titulo: "Escolher o stack principal",
          descricao: "Decida quais ferramentas serão utilizadas como base para sua operação.",
        },
        {
          id: "p2-t3-cadastrar-contas",
          titulo: "Cadastrar contas e licenças",
          descricao: "Crie contas corporativas e assine as licenças necessárias.",
        },
      ],
    },
    {
      id: "passo-3-notebooklm",
      numero: 3,
      titulo: "Criação de NotebookLM com IA",
      descricao: "Estruture sua base de conhecimento no NotebookLM como fonte para os agentes.",
      tarefas: [
        {
          id: "p3-t1-estruturar-base",
          titulo: "Estruturar a base de conhecimento",
          descricao: "Reúna materiais, SOPs, scripts e documentos de apoio.",
        },
        {
          id: "p3-t2-criar-notebook",
          titulo: "Criar NotebookLM da empresa",
          descricao: "Importe os materiais e configure fontes confiáveis.",
        },
      ],
    },
    {
      id: "passo-4-adaptacao-processos",
      numero: 4,
      titulo: "Preparação e Adaptação de processos com IA",
      descricao: "Adapte processos existentes para trabalharem com IA no fluxo.",
      tarefas: [
        {
          id: "p4-t1-redesenhar-vendas",
          titulo: "Redesenhar o processo de vendas com IA",
          descricao: "Insira IA no funil: prospecção, qualificação, follow-up.",
        },
        {
          id: "p4-t2-redesenhar-marketing",
          titulo: "Redesenhar o processo de marketing com IA",
          descricao: "Use IA para copy, segmentação e produção de conteúdo.",
        },
        {
          id: "p4-t3-redesenhar-operacao",
          titulo: "Redesenhar processos operacionais com IA",
          descricao: "Identifique etapas que IA pode executar ou acelerar.",
        },
        {
          id: "p4-t4-redesenhar-financeiro",
          titulo: "Redesenhar processos financeiros com IA",
          descricao: "Automatize análises e relatórios recorrentes.",
        },
      ],
    },
    {
      id: "passo-5-criar-agentes",
      numero: 5,
      titulo: "Criação de agentes com IA",
      descricao: "Crie agentes especializados para tarefas específicas da sua operação.",
      tarefas: [
        {
          id: "p5-t1-agente-vendas",
          titulo: "Criar agente de vendas",
          descricao: "Agente para qualificar leads e fazer follow-up.",
        },
        {
          id: "p5-t2-agente-suporte",
          titulo: "Criar agente de suporte ao cliente",
          descricao: "Agente para responder dúvidas frequentes.",
        },
        {
          id: "p5-t3-agente-conteudo",
          titulo: "Criar agente de conteúdo",
          descricao: "Agente para produção de copy, posts e roteiros.",
        },
      ],
    },
    {
      id: "passo-6-implementacao",
      numero: 6,
      titulo: "Implementação de sistemas com IA",
      descricao: "Rode a IA em produção com monitoramento e ajustes contínuos.",
      tarefas: [
        {
          id: "p6-t1-deploy",
          titulo: "Colocar agentes em produção",
          descricao: "Integre os agentes aos canais em uso (site, WhatsApp, CRM).",
        },
        {
          id: "p6-t2-metricas",
          titulo: "Definir métricas de acompanhamento",
          descricao: "Estabeleça KPIs para validar o impacto da IA.",
        },
        {
          id: "p6-t3-iterar",
          titulo: "Iterar e otimizar",
          descricao: "Ajuste prompts, fluxos e ferramentas com base nos resultados.",
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
