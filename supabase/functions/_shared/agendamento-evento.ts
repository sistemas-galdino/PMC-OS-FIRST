// Formato do evento de agendamento no Google Calendar (título + descrição).
// Fonte única usada por criar-agendamento e reatribuir-cliente-agendamento, pra
// não derivar o formato em dois lugares.

export type TabelaDestino = "reunioes_galdino" | "reunioes_mentoria_new" | "reunioes_blackcrm"

export type Equipe = "consultor" | "sucesso_cliente"

export function tituloEvento(opts: {
  tabela_destino: TabelaDestino
  nome: string // nome do consultor / profissional de CS
  tipo_reuniao: "implementacao" | "tutoria" | null
  cliente_nome: string
  empresa: string | null
  assunto?: string | null // assunto escolhido pelo cliente (ex.: "Vídeos com IA")
  equipe?: Equipe | null // 'sucesso_cliente' → o evento não é consultoria
}): string {
  const empresaTxt = opts.empresa ? ` — ${opts.empresa}` : ""
  if (opts.tabela_destino === "reunioes_galdino") {
    return `PMC - Reunião Individual - Rafael Galdino (${opts.cliente_nome})${empresaTxt}`
  }
  if (opts.tabela_destino === "reunioes_blackcrm") {
    // Quando o consultor tem mais de um tipo, o assunto escolhido manda no título;
    // senão, cai no rótulo fixo do tipo_reuniao (Implementação/Tutoria).
    const t = opts.assunto?.trim()
      ? opts.assunto.trim()
      : opts.tipo_reuniao === "implementacao" ? "Implementação" : "Tutoria"
    return `[PMC - ${opts.nome}] ${t}${empresaTxt}`
  }
  // Time de Sucesso do Cliente (onboarding/alinhamento) não é consultoria — o
  // título precisa dizer isso, senão a agenda inteira vira "Consultor Fulana".
  if (opts.equipe === "sucesso_cliente") {
    return `[PMC] Acompanhamento com Sucesso do Cliente ${opts.nome} (${opts.cliente_nome})${empresaTxt}`
  }
  return `[PMC] Acompanhamento com Consultor ${opts.nome} (${opts.cliente_nome})${empresaTxt}`
}

export function descricaoEvento(opts: {
  cliente_nome: string
  cliente_email: string
  cliente_telefone: string | null
  empresa: string | null
  observacoes: string | null
  codigo_cliente: number | null
  assunto?: string | null
  equipe?: Equipe | null
  nome?: string | null // quem atende (só usado na linha de Sucesso do Cliente)
}): string {
  const linhas = [
    `Cliente: ${opts.cliente_nome}`,
    `Email: ${opts.cliente_email}`,
  ]
  if (opts.equipe === "sucesso_cliente") {
    linhas.push(`Atendimento: Sucesso do Cliente${opts.nome ? ` — ${opts.nome}` : ""}`)
  }
  if (opts.cliente_telefone) linhas.push(`Telefone: ${opts.cliente_telefone}`)
  if (opts.empresa) linhas.push(`Empresa: ${opts.empresa}`)
  if (opts.assunto?.trim()) linhas.push(`Assunto: ${opts.assunto.trim()}`)
  if (opts.observacoes) linhas.push("", `Observações: ${opts.observacoes}`)
  if (opts.codigo_cliente) linhas.push("", `Código do cliente: ${opts.codigo_cliente}`)
  return linhas.join("\n")
}
