// Listas fechadas do Mapeamento de Gargalos (Fase 3), trazidas do mapeador
// externo do PMC. São listas fechadas de propósito: texto livre em "impacto" e
// "ferramenta" impede contar quantos gargalos nascem de dado descentralizado,
// que é justamente o que o Método precisa enxergar entre clientes.

export const AREAS_GARGALO = [
  "Marketing", "Comercial", "Financeiro", "Operações", "Administrativo",
  "RH", "Atendimento", "Compras / Estoque", "Gestão", "Outro",
] as const

export const AREA_ICONE: Record<string, string> = {
  Marketing: "📣", Comercial: "💼", Financeiro: "💰", Operações: "⚙️",
  Administrativo: "📋", RH: "👥", Atendimento: "💬", "Compras / Estoque": "📦",
  Gestão: "📊", Outro: "➕",
}

export const IMPACTOS = [
  "Tempo", "Custo", "Retrabalho", "Produtividade", "Processo manual",
  "Dependência de pessoas", "Dados descentralizados", "Falta de integração",
  "Tomada de decisão", "Escalabilidade", "Atrasos", "Vendas / Conversão",
] as const

export const IMPACTO_ICONE: Record<string, string> = {
  Tempo: "⏱", Custo: "💰", Retrabalho: "🔁", Produtividade: "⚡",
  "Processo manual": "📋", "Dependência de pessoas": "🔒",
  "Dados descentralizados": "📂", "Falta de integração": "🔗",
  "Tomada de decisão": "📊", Escalabilidade: "🚀", Atrasos: "⏳",
  "Vendas / Conversão": "📈",
}

// A legenda existe porque "Escalabilidade" e "Produtividade" viram sinônimo na
// cabeça de quem preenche — sem explicar, o dado vira ruído.
export const IMPACTO_LEGENDA: Record<string, string> = {
  Tempo: "processo consome horas demais",
  Custo: "gera custo operacional elevado",
  Retrabalho: "tarefas precisam ser refeitas ou repetidas",
  Produtividade: "equipe produz menos do que poderia",
  "Processo manual": "atividade depende excessivamente de execução manual",
  "Dependência de pessoas": "conhecimento/processo fica concentrado em uma ou poucas pessoas",
  "Dados descentralizados": "informações espalhadas entre planilhas, WhatsApp, sistemas, documentos etc.",
  "Falta de integração": "ferramentas/sistemas não conversam entre si",
  "Tomada de decisão": "falta informação organizada para decidir com rapidez",
  Escalabilidade: "o processo atual não suporta o crescimento da empresa",
  Atrasos: "o gargalo aumenta o tempo de execução ou entrega",
  "Vendas / Conversão": "interfere na geração, avanço ou fechamento de oportunidades",
}

export const FERRAMENTAS = [
  "Excel", "Google Sheets", "WhatsApp", "ERP", "E-mail", "Word",
  "CRM", "ChatGPT", "Claude", "Sistema interno", "Outro",
] as const

export const FREQUENCIAS = [
  "Todos os dias", "Algumas vezes por semana", "Semanalmente",
  "Quinzenalmente", "Mensalmente", "Eventualmente",
] as const

// Especialidade só é pedida quando a rota é "Apoio PMC": é o que direciona o
// gargalo para o consultor certo.
export const ESPECIALIDADES = [
  "IA / Automação", "Sistemas", "Marketing", "Comercial", "Financeiro",
  "CRM", "Tomada de decisão", "Tráfego", "Posicionamento", "Ainda não sei",
] as const

export const ROTAS: { key: RotaGargalo; label: string; ajuda: string }[] = [
  { key: "interna", label: "Interna", ajuda: "A própria empresa resolve. Escolha o responsável." },
  { key: "pmc", label: "Apoio PMC", ajuda: "Precisa de apoio especializado. Escolha a especialidade." },
  { key: "avaliacao", label: "Em avaliação", ajuda: "Ainda decidindo por onde resolver." },
]

export type RotaGargalo = "interna" | "pmc" | "avaliacao"

export const ROTA_LABEL: Record<RotaGargalo, string> = {
  interna: "Interna", pmc: "Apoio PMC", avaliacao: "Em avaliação",
}

// Colunas do kanban. Uma coluna pode agrupar mais de um status: "Definindo
// solução" e "Aguardando apoio PMC" são a mesma etapa da esteira, só mudam de
// dono. 'implementacao' é a grafia do mapeador e 'em_implementacao' a do PMC OS
// — as duas caem na mesma coluna para não perder registro antigo.
export const COLUNAS_GARGALO: { id: string; label: string; statuses: string[] }[] = [
  { id: "mapeados", label: "Mapeados", statuses: ["mapeado"] },
  { id: "analisados", label: "Analisados", statuses: ["analisado"] },
  { id: "definindo", label: "Definindo solução", statuses: ["definindo", "aguardando_pmc"] },
  { id: "implementacao", label: "Em implementação", statuses: ["implementacao", "em_implementacao"] },
  { id: "resolvidos", label: "Resolvidos", statuses: ["resolvido"] },
]

export const STATUS_LABEL: Record<string, string> = {
  mapeado: "Mapeado",
  analisado: "Analisado",
  definindo: "Definindo solução",
  aguardando_pmc: "Aguardando apoio PMC",
  implementacao: "Em implementação",
  em_implementacao: "Em implementação",
  resolvido: "Resolvido",
}

// Tipos de ganho registrados no fechamento. Só os dois primeiros têm número
// próprio (horas e R$); o resto é qualitativo e entra como marcador.
export const GANHOS = [
  { key: "tempo", icon: "⏱", label: "Tempo economizado" },
  { key: "custo", icon: "💰", label: "Redução de custo" },
  { key: "vendas", icon: "📈", label: "Aumento de vendas / conversão" },
  { key: "produtividade", icon: "⚡", label: "Aumento de produtividade" },
  { key: "retrabalho", icon: "🔁", label: "Redução de retrabalho" },
  { key: "manual", icon: "📋", label: "Redução de processo manual" },
  { key: "dependencia", icon: "🔒", label: "Redução da dependência de pessoas" },
  { key: "dados", icon: "📂", label: "Centralização de dados" },
  { key: "integracao", icon: "🔗", label: "Integração de processos / sistemas" },
  { key: "decisao", icon: "📊", label: "Melhoria na tomada de decisão" },
  { key: "escalabilidade", icon: "🚀", label: "Ganho de escalabilidade" },
  { key: "prazo", icon: "⏳", label: "Redução de prazo / atraso" },
  { key: "outro", icon: "➕", label: "Outro ganho" },
] as const

export const GANHO_LABEL: Record<string, string> =
  Object.fromEntries(GANHOS.map((g) => [g.key, g.label]))
export const GANHO_ICONE: Record<string, string> =
  Object.fromEntries(GANHOS.map((g) => [g.key, g.icon]))

/** Resultado medido depois de resolver o gargalo. */
export interface ResultadoGargalo {
  horas_depois?: number | null      // horas/mês que o processo ainda consome
  custo_mes?: number | null         // R$/mês economizados
  conversao_antes?: number | null
  conversao_depois?: number | null
  ganhos?: string[]                 // chaves de GANHOS
  descricao?: string | null         // o que mudou na prática
  evidencia?: string | null         // como dá para comprovar
  evidencia_links?: string[]
}

/** Horas/mês recuperadas: o que consumia menos o que consome agora. */
export function horasRecuperadas(
  horasMes: number | null | undefined,
  resultado: ResultadoGargalo | null | undefined,
): number {
  const antes = Number(horasMes ?? 0)
  const depois = resultado?.horas_depois
  if (typeof depois !== "number") return 0
  return Math.max(0, Math.round((antes - depois) * 10) / 10)
}
