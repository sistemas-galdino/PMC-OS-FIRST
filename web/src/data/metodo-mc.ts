// Método MC (Multiplicador de Crescimento) — as 6 fases cíclicas da tela /metodo.
// Fonte: metodo-pmc.pdf + roda do método ("Método + IA + Sistemas = Crescimento Exponencial").
// O método é CÍCLICO: ao concluir a fase 6, a empresa volta à fase 2 com mais maturidade.

export interface FaseMetodo {
  numero: number
  slug: string
  titulo: string
  subtitulo: string
  descricao: string
  entregavel: string
  trilhaKey: string // chave em configuracoes_links (fallback: /trilhas)
}

export const FASES_METODO: FaseMetodo[] = [
  {
    numero: 1,
    slug: "guardiao",
    titulo: "Guardião da IA",
    subtitulo: "Quem executa a IA na sua empresa",
    descricao:
      "Todo negócio precisa de um ponto focal de execução tática da IA. O Guardião remove a barreira tecnológica e libera você para a estratégia: ele pesquisa, valida, implementa e mantém as soluções de IA funcionando.",
    entregavel: "Guardião definido, com dados registrados e assessment aplicado",
    trilhaKey: "trilha_metodo_fase_1",
  },
  {
    numero: 2,
    slug: "inteligencia",
    titulo: "Inteligência Empresarial",
    subtitulo: "Dados → Informação → Estratégia → Receita",
    descricao:
      "Todo mês, área por área, o caos dos dados vira bússola: dashboard, análise, plano de ação e a 'Única Coisa' que destrava o crescimento. Você faz sozinho ou o PMC OS gera os 4 fluxos a partir do documento da área.",
    entregavel: "Ciclo mensal com os 4 entregáveis por área (ex.: análise de DRE)",
    trilhaKey: "trilha_metodo_fase_2",
  },
  {
    numero: 3,
    slug: "gargalos",
    titulo: "Mapeamento de Gargalos",
    subtitulo: "Onde a operação sangra horas e caixa",
    descricao:
      "O Guardião escolhe uma área e mapeia os processos que consomem mais de 10 horas. Para cada gargalo mapeado, a IA devolve um plano de ação para substituir aquele processo usando IA.",
    entregavel: "Gargalos 100% documentados, cada um com plano de ação da IA",
    trilhaKey: "trilha_metodo_fase_3",
  },
  {
    numero: 4,
    slug: "copilotos",
    titulo: "Co-Pilotos & Rotinas",
    subtitulo: "O organograma híbrido: IA orbitando o time",
    descricao:
      "Funções repetitivas na frente do computador viram co-pilotos de IA. Você mapeia (ou o sistema sugere), a IA gera o documento de skill, e o organograma híbrido mostra cada copiloto orbitando o colaborador.",
    entregavel: "Organograma híbrido visual + skills de copiloto prontas para usar",
    trilhaKey: "trilha_metodo_fase_4",
  },
  {
    numero: 5,
    slug: "torre",
    titulo: "Torre de Comando",
    subtitulo: "Todos os sistemas em um só lugar",
    descricao:
      "O hub da empresa: visão geral de todos os dashboards, análises e sistemas criados (no Claude, no Lovable ou onde for) em um único repositório organizado, com clareza das integrações.",
    entregavel: "Repositório vivo de sistemas + visão única do negócio",
    trilhaKey: "trilha_metodo_fase_5",
  },
  {
    numero: 6,
    slug: "engenharia",
    titulo: "Engenharia Operacional",
    subtitulo: "Quanto você já economizou com IA",
    descricao:
      "A prova do método em números: horas e reais economizados com sistemas e co-pilotos, mais o inventário claro de todas as ferramentas em uso e para que cada uma serve.",
    entregavel: "Painel de economia (horas + R$) e inventário de ferramentas",
    trilhaKey: "trilha_metodo_fase_6",
  },
]
