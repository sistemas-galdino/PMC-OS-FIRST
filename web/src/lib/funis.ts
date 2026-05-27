export interface SocialSellingRecord {
  id: string
  record_date: string
  approaches: number
  conversations: number
  call_invites: number
  meetings_scheduled: number
  notes: string | null
  created_at: string
  updated_at: string
}

export interface AplicacaoRecord {
  id: string
  record_date: string
  period_end: string | null
  applications: number
  form_yes: number
  form_no: number
  calls_made: number
  sales_made: number
  revenue: number
  ad_spend: number
  notes: string | null
  created_at: string
  updated_at: string
}

export interface EventoRecord {
  id: string
  event_date: string
  city: string
  class_name: string
  partner_name: string | null
  participants: number
  qualified: number
  bought_pitch: number
  followup_7d: number
  notes: string | null
  created_at: string
  updated_at: string
}

export type PeriodPreset =
  | "today"
  | "this_week"
  | "this_month"
  | "last_7"
  | "last_30"
  | "all"

export const PERIOD_LABELS: Record<PeriodPreset, string> = {
  today: "Hoje",
  this_week: "Esta semana",
  this_month: "Este mês",
  last_7: "Últimos 7 dias",
  last_30: "Últimos 30 dias",
  all: "Todo o período",
}

export function getPeriodRange(preset: PeriodPreset): { from: Date | null; to: Date | null } {
  const now = new Date()
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  switch (preset) {
    case "today":
      return { from: today, to: today }
    case "this_week": {
      const day = today.getDay()
      const diff = day === 0 ? 6 : day - 1
      const monday = new Date(today)
      monday.setDate(today.getDate() - diff)
      return { from: monday, to: today }
    }
    case "this_month":
      return { from: new Date(today.getFullYear(), today.getMonth(), 1), to: today }
    case "last_7": {
      const f = new Date(today)
      f.setDate(today.getDate() - 6)
      return { from: f, to: today }
    }
    case "last_30": {
      const f = new Date(today)
      f.setDate(today.getDate() - 29)
      return { from: f, to: today }
    }
    case "all":
      return { from: null, to: null }
  }
}

export function toISODate(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`
}

export function fmtDateBR(iso: string): string {
  const [y, m, d] = iso.split("-")
  return `${d}/${m}/${y}`
}

export function pct(num: number, den: number): number {
  if (!den) return 0
  return (num / den) * 100
}

export function fmtPct(num: number, den: number): string {
  if (!den) return "—"
  return `${pct(num, den).toFixed(1)}%`
}

export function fmtBRL(n: number): string {
  return `R$ ${Number(n || 0).toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}
