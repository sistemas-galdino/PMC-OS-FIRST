// Canais de Vendas (dono/PMC): definições dos 4 canais e helpers de período.
export interface CanalVenda {
  slug: string
  label: string
  cor: string // classe de acento (texto)
  dot: string // classe de fundo (bolinha)
}

export const CANAIS: CanalVenda[] = [
  { slug: "pitch_evento", label: "Pitch de Evento ao Vivo", cor: "text-primary", dot: "bg-primary" },
  { slug: "pos_evento", label: "Pós-Evento", cor: "text-sky-400", dot: "bg-sky-400" },
  { slug: "indicacao", label: "Indicação", cor: "text-violet-400", dot: "bg-violet-400" },
  { slug: "social_seller", label: "Social Seller", cor: "text-amber-400", dot: "bg-amber-400" },
]

export interface Produto {
  slug: string
  label: string
}

// 2 produtos vendidos pelos mesmos 4 canais.
export const PRODUTOS: Produto[] = [
  { slug: "pmc", label: "PMC" },
  { slug: "conselho", label: "Conselho de Implementação" },
]

export const MESES = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"]
export const MESES_LONGOS = [
  "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
  "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro",
]

export type Visao = "mensal" | "trimestral" | "semestral"

// Retorna a lista de meses (1-12) de cada período conforme a visão.
export interface Periodo {
  label: string
  curto: string
  meses: number[]
}

export function periodosDaVisao(visao: Visao): Periodo[] {
  if (visao === "mensal") {
    return MESES.map((m, i) => ({ label: MESES_LONGOS[i], curto: m, meses: [i + 1] }))
  }
  if (visao === "trimestral") {
    return [1, 2, 3, 4].map((q) => ({
      label: `${q}º Trimestre`,
      curto: `T${q}`,
      meses: [(q - 1) * 3 + 1, (q - 1) * 3 + 2, (q - 1) * 3 + 3],
    }))
  }
  return [1, 2].map((s) => ({
    label: `${s}º Semestre`,
    curto: `S${s}`,
    meses: s === 1 ? [1, 2, 3, 4, 5, 6] : [7, 8, 9, 10, 11, 12],
  }))
}
