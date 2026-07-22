// Exporta uma lista para CSV e dispara o download no navegador.
// Usa ';' como separador (padrão do Excel pt-BR) e BOM UTF-8 para acentos.
export interface ColunaCsv<T> {
  chave: keyof T | string
  titulo: string
  valor?: (linha: T) => string | number | null | undefined
}

function escapar(v: unknown): string {
  const s = v == null ? "" : String(v)
  return /[",;\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s
}

export function exportarCsv<T extends Record<string, any>>(
  nomeArquivo: string,
  colunas: ColunaCsv<T>[],
  linhas: T[],
): void {
  const header = colunas.map((c) => escapar(c.titulo)).join(";")
  const corpo = linhas
    .map((l) => colunas.map((c) => escapar(c.valor ? c.valor(l) : l[c.chave as string])).join(";"))
    .join("\r\n")
  const csv = "\uFEFF" + header + "\r\n" + corpo
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" })
  const url = URL.createObjectURL(blob)
  const a = document.createElement("a")
  a.href = url
  a.download = nomeArquivo.endsWith(".csv") ? nomeArquivo : `${nomeArquivo}.csv`
  document.body.appendChild(a)
  a.click()
  a.remove()
  URL.revokeObjectURL(url)
}
