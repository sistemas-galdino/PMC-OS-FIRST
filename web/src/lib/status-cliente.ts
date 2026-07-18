// Valores gravados em clientes_entrada_new.status_atual (coluna text livre, sem CHECK).
export const STATUS_CLIENTE = [
  "Ativo no Programa",
  "Ativo - 2º Ciclo", // renovou e segue ativo (segundo ciclo do programa)
  "Aguardando Início",
  "Onboarding marcado",
  "Pendente de Onboarding",
  "Cliente Cancelado",
  "Desistência de Compra",
  "Ciclo encerrado", // completou o período do programa e não renovou
] as const

// Cliente novo não nasce com o ciclo encerrado — só os estados de entrada.
export const STATUS_CLIENTE_CADASTRO = [
  "Ativo no Programa",
  "Aguardando Início",
  "Pendente de Onboarding",
  "Cliente Cancelado",
  "Desistência de Compra",
] as const

// Status que contam como "cliente ativo" nas métricas/dashboards (1º e 2º ciclo).
export const STATUS_ATIVOS = ["Ativo no Programa", "Ativo - 2º Ciclo"] as const

export function isStatusAtivo(status?: string | null): boolean {
  return status === "Ativo no Programa" || status === "Ativo - 2º Ciclo"
}
