export type Moeda = "BRL" | "USD"

const FORMATTERS: Record<Moeda, Intl.NumberFormat> = {
  BRL: new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 }),
  USD: new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }),
}

export function formatCurrency(value: number | null | undefined, moeda: Moeda = "BRL"): string {
  return FORMATTERS[moeda].format(value || 0)
}

// Valor completo com separador de milhar e 2 casas (ex.: R$ 2.000.000,00).
const FORMATTERS_FULL: Record<Moeda, Intl.NumberFormat> = {
  BRL: new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL", minimumFractionDigits: 2, maximumFractionDigits: 2 }),
  USD: new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", minimumFractionDigits: 2, maximumFractionDigits: 2 }),
}

export function formatCurrencyFull(value: number | null | undefined, moeda: Moeda = "BRL"): string {
  return FORMATTERS_FULL[moeda].format(value || 0)
}

// Número inteiro com separador de milhar (ex.: 80.000) — para contagens.
const NUMBER_FORMATTERS: Record<Moeda, Intl.NumberFormat> = {
  BRL: new Intl.NumberFormat("pt-BR", { maximumFractionDigits: 0 }),
  USD: new Intl.NumberFormat("en-US", { maximumFractionDigits: 0 }),
}

export function formatNumber(value: number | null | undefined, moeda: Moeda = "BRL"): string {
  return NUMBER_FORMATTERS[moeda].format(value || 0)
}

export function currencySymbol(moeda: Moeda = "BRL"): string {
  return moeda === "USD" ? "$" : "R$"
}

export function formatCurrencyShort(value: number | null | undefined, moeda: Moeda = "BRL"): string {
  const n = value || 0
  const sym = currencySymbol(moeda)
  if (n >= 1_000_000) return `${sym} ${(n / 1_000_000).toFixed(1)}M`
  if (n >= 1_000) return `${sym} ${(n / 1_000).toFixed(0)}K`
  return `${sym} ${n}`
}
