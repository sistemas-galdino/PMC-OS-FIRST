export interface Tarefa {
  id: string
  titulo: string
  descricao?: string
  linkPadrao?: string
  /** Checklist read-only mostrada ao cliente no card de evidência (lado "O que você fará"). */
  subTarefas?: string[]
  /** Placeholder exemplo para a evidência — mostra o cliente como preencher. */
  exemploEvidencia?: string
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
          subTarefas: [
            "Assistir ao conteúdo completo da aula",
            "Definir o Guardião da IA da sua empresa",
            "Mapear as macro-áreas onde a IA será aplicada",
            "Criar a estrutura inicial de pastas/documentos da IA",
          ],
          exemploEvidencia:
            "Assisti à aula do Guardião da IA na Empresa Exemplo. Defini a [Nome] como guardiã e mapeamos 4 macro-áreas (Vendas, Marketing, Operações, Financeiro). Link do documento de estrutura:",
        },
        {
          id: "p1-t2-encontro-multiplica-time-28-11",
          titulo: "Encontro Multiplica Time Ao Vivo — dia 28/11",
          linkPadrao:
            "https://app.multiplicadordecrescimento.com.br/241789-programa-multiplicador-de-crescimento/5136623-encontro-multiplica-time-ao-vivo-dia-28-11",
          subTarefas: [
            "Participar do encontro ao vivo (ou assistir à gravação)",
            "Anotar os 3 principais aprendizados",
            "Aplicar 1 ação prática na Empresa Exemplo",
          ],
          exemploEvidencia:
            "Participei do encontro do dia 28/11 na Empresa Exemplo. Principais aprendizados anotados: [1] ..., [2] ..., [3] ... Ação aplicada:",
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
          subTarefas: [
            "Assistir à aula de Diagnóstico de IA e Dashboards",
            "Listar os dashboards atuais da Empresa Exemplo",
            "Identificar quais indicadores podem ser automatizados com IA",
            "Definir o dashboard prioritário a ser implementado",
          ],
          exemploEvidencia:
            "Mapeei na Empresa Exemplo 3 dashboards (Vendas, Financeiro, Operações). Prioritário: Dashboard de Vendas. Link do documento/planilha:",
        },
        {
          id: "p2-t2-decisao-com-dados-5-analises",
          titulo: "Decisão com Dados — 5 Análises Rotina 4h00",
          linkPadrao:
            "https://app.multiplicadordecrescimento.com.br/241789-programa-multiplicador-de-crescimento/5284709-decisao-com-dados-5-analises-rotina-4h00",
          subTarefas: [
            "Assistir à aula das 5 análises da rotina 4h00",
            "Definir quais das 5 análises fazem sentido na Empresa Exemplo",
            "Agendar o bloco de 4h de análise semanal",
            "Realizar a primeira rotina e anotar insights",
          ],
          exemploEvidencia:
            "Rodei a primeira rotina 4h00 na Empresa Exemplo. Análises aplicadas: 1) ..., 2) ..., 3) ... Insights principais:",
        },
        {
          id: "p2-t3-planejamento-2026-galdino",
          titulo: "Planejamento Estratégico 2026 e Instituto de Pesquisa Galdino",
          linkPadrao:
            "https://app.multiplicadordecrescimento.com.br/241789-programa-multiplicador-de-crescimento/5087331-planejamento-estrategico-2026-e-instituto-de-pesquisa-galdino",
          subTarefas: [
            "Assistir à aula de Planejamento Estratégico 2026",
            "Usar o Instituto de Pesquisa Galdino para coletar dados de mercado",
            "Definir objetivos macro do ano para a Empresa Exemplo",
            "Registrar as premissas estratégicas em documento",
          ],
          exemploEvidencia:
            "Concluí o planejamento macro 2026 da Empresa Exemplo. 3 objetivos principais e 5 premissas estratégicas. Link do documento:",
        },
        {
          id: "p2-t4-planejamento-2026-manus-okr",
          titulo: "Planejamento Estratégico 2026 com IA, Manus.IM e OKR",
          linkPadrao:
            "https://app.multiplicadordecrescimento.com.br/241789-programa-multiplicador-de-crescimento/5087551-planejamento-estrategico-2026-com-ia-manus-im-e-okr",
          subTarefas: [
            "Criar projeto no Manus.IM para o planejamento",
            "Definir OKRs trimestrais da Empresa Exemplo",
            "Validar OKRs com a equipe",
            "Publicar o plano no NotebookLM da empresa",
          ],
          exemploEvidencia:
            "Criei o projeto no Manus.IM com 4 OKRs trimestrais da Empresa Exemplo. Plano publicado no NotebookLM. Link do projeto:",
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
          subTarefas: [
            "Criar conta no NotebookLM da Empresa Exemplo",
            "Subir o documento de diagnóstico de IA",
            "Subir os dashboards e materiais de referência como fontes",
            "Fazer as primeiras perguntas ao NotebookLM para validar",
          ],
          exemploEvidencia:
            "NotebookLM da Empresa Exemplo criado com 6 fontes (diagnóstico, dashboards, SOPs). Link do NotebookLM:",
        },
        {
          id: "p3-t2-estrategia-plano-sistemas-ia",
          titulo: "Estratégia, Plano de Ação e Sistemas com IA",
          linkPadrao:
            "https://app.multiplicadordecrescimento.com.br/241789-programa-multiplicador-de-crescimento/5289639-estrategia-plano-de-acao-e-sistemas-com-ia",
          subTarefas: [
            "Subir o plano estratégico no NotebookLM",
            "Adicionar os sistemas e ferramentas atuais como fontes",
            "Gerar um resumo executivo com o NotebookLM",
            "Compartilhar o NotebookLM com o time da Empresa Exemplo",
          ],
          exemploEvidencia:
            "Plano estratégico + sistemas da Empresa Exemplo adicionados ao NotebookLM. Resumo executivo gerado. Link:",
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
          subTarefas: [
            "Assistir à aula completa",
            "Listar os 3 processos críticos da Empresa Exemplo",
            "Escrever um POP para cada processo crítico",
            "Organizar os POPs no NotebookLM",
          ],
          exemploEvidencia:
            "POPs dos 3 processos críticos da Empresa Exemplo criados e organizados no NotebookLM. Link dos POPs:",
        },
        {
          id: "p4-t2-diagnostico-caos-processos",
          titulo: "Diagnóstico do Caos — Processos que libertam",
          linkPadrao:
            "https://app.multiplicadordecrescimento.com.br/241789-programa-multiplicador-de-crescimento/5284704-diagnostico-do-caos-processos-que-libertam",
          subTarefas: [
            "Assistir à aula do Diagnóstico do Caos",
            "Identificar os 5 maiores gargalos da Empresa Exemplo",
            "Classificar cada gargalo (urgência x impacto)",
            "Definir os 2 primeiros processos a estruturar",
          ],
          exemploEvidencia:
            "Diagnóstico do caos feito na Empresa Exemplo. 5 gargalos identificados. 2 processos prioritários: [...]. Link do diagnóstico:",
        },
        {
          id: "p4-t3-funis-processos-comerciais-ia",
          titulo: "Construindo funis e processos comerciais com IA na prática",
          linkPadrao:
            "https://app.multiplicadordecrescimento.com.br/241789-programa-multiplicador-de-crescimento/4944656-construindo-funis-e-processos-comerciais-com-ia-na-pratica",
          subTarefas: [
            "Assistir à aula de funis comerciais com IA",
            "Desenhar o funil comercial atual da Empresa Exemplo",
            "Definir onde a IA entra em cada etapa do funil",
            "Implementar a IA na primeira etapa (topo de funil)",
          ],
          exemploEvidencia:
            "Funil comercial da Empresa Exemplo redesenhado com IA em 3 etapas. Implementei IA no topo de funil (qualificação). Link do funil:",
        },
        {
          id: "p4-t4-criando-projetos-manus",
          titulo: "Criando projetos no Manus",
          linkPadrao:
            "https://app.multiplicadordecrescimento.com.br/241789-programa-multiplicador-de-crescimento/4801808-criando-projetos-no-manus",
          subTarefas: [
            "Criar conta no Manus.IM",
            "Criar o primeiro projeto da Empresa Exemplo no Manus",
            "Configurar as fontes e contexto do projeto",
            "Rodar a primeira tarefa no Manus",
          ],
          exemploEvidencia:
            "Primeiro projeto criado no Manus.IM para a Empresa Exemplo. Rodei a primeira tarefa com sucesso. Link do projeto:",
        },
        {
          id: "p4-t5-desenvolvimento-projetos-manus",
          titulo: "Desenvolvimento de projetos com o Manus",
          linkPadrao:
            "https://app.multiplicadordecrescimento.com.br/241789-programa-multiplicador-de-crescimento/4901180-3-desenvolvimento-de-projetos-com-o-manus",
          subTarefas: [
            "Assistir à aula de desenvolvimento no Manus",
            "Estruturar o briefing completo do projeto",
            "Executar o projeto com o Manus do início ao fim",
            "Validar os outputs gerados pelo Manus",
          ],
          exemploEvidencia:
            "Projeto da Empresa Exemplo concluído no Manus. 3 entregáveis gerados e validados. Link do projeto:",
        },
        {
          id: "p4-t6-produtividade-plano-30-60-90",
          titulo: "Produtividade, Sistemas e Plano 30, 60 e 90 dias",
          linkPadrao:
            "https://app.multiplicadordecrescimento.com.br/241789-programa-multiplicador-de-crescimento/5205155-produtividade-sistemas-e-plano-30-60-e-90-dias",
          subTarefas: [
            "Assistir à aula de Produtividade e Plano 30-60-90",
            "Montar o plano de 30 dias da Empresa Exemplo",
            "Montar o plano de 60 e 90 dias",
            "Definir as métricas de acompanhamento de cada ciclo",
          ],
          exemploEvidencia:
            "Plano 30-60-90 da Empresa Exemplo pronto. Métricas definidas por ciclo. Link do plano:",
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
          subTarefas: [
            "Assistir à aula de Agentes com Claude",
            "Identificar 2 processos da Empresa Exemplo para automatizar",
            "Criar o primeiro agente no Claude",
            "Testar o agente em produção por 3 dias",
          ],
          exemploEvidencia:
            "Agente de IA da Empresa Exemplo criado no Claude para [processo]. Testado por 3 dias com [resultado]. Link do agente:",
        },
        {
          id: "p5-t2-arquiteto-campanhas-ia",
          titulo: "Arquiteto de Campanhas — Engenharia com IA",
          linkPadrao:
            "https://app.multiplicadordecrescimento.com.br/241789-programa-multiplicador-de-crescimento/5254084-arquiteto-de-campanhas-engenharia-com-ia",
          subTarefas: [
            "Assistir à aula de Arquiteto de Campanhas",
            "Planejar uma campanha da Empresa Exemplo com IA",
            "Gerar o roteiro / copy da campanha",
            "Executar a campanha e registrar os resultados",
          ],
          exemploEvidencia:
            "Campanha da Empresa Exemplo arquitetada com IA. Roteiro + copy gerados. Execução iniciada em [data]. Link da campanha:",
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
          subTarefas: [
            "Colocar em execução o plano de 30 dias",
            "Acompanhar as métricas semanalmente",
            "Ajustar o plano ao fim do primeiro ciclo",
            "Registrar aprendizados e resultados",
          ],
          exemploEvidencia:
            "Plano de 30 dias da Empresa Exemplo em execução. Métricas acompanhadas semanalmente. Resultado do primeiro ciclo:",
        },
        {
          id: "p6-t2-estrategia-plano-sistemas-ia",
          titulo: "Estratégia, Plano de Ação e Sistemas com IA",
          linkPadrao:
            "https://app.multiplicadordecrescimento.com.br/241789-programa-multiplicador-de-crescimento/5289639-estrategia-plano-de-acao-e-sistemas-com-ia",
          subTarefas: [
            "Integrar os sistemas atuais com IA",
            "Validar os fluxos end-to-end",
            "Treinar o time da Empresa Exemplo nos novos fluxos",
            "Publicar os fluxos no NotebookLM",
          ],
          exemploEvidencia:
            "Sistemas da Empresa Exemplo integrados com IA. Time treinado. Fluxos no NotebookLM. Link:",
        },
        {
          id: "p6-t3-stitch-telas-apps-prototipos-ia",
          titulo: "Stitch — Telas, apps e protótipos com IA",
          linkPadrao:
            "https://app.multiplicadordecrescimento.com.br/241789-programa-multiplicador-de-crescimento/5253871-stitch-telas-apps-e-prototipos-com-ia",
          subTarefas: [
            "Criar conta no Stitch",
            "Prototipar a primeira tela/app da Empresa Exemplo",
            "Validar o protótipo com o time/clientes",
            "Avançar para a segunda iteração",
          ],
          exemploEvidencia:
            "Protótipo da Empresa Exemplo criado no Stitch. Validação feita com [pessoas]. Link do protótipo:",
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
