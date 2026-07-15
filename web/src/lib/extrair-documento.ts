// Extração de texto de documentos para alimentar a IA (Método MC, Fase 2).
// Suporta PDF (pdfjs), Excel (xlsx/SheetJS) e texto (txt/csv/tsv/md/json).
// pdfjs e xlsx entram por import dinâmico — não pesam no bundle principal.

const TEXT_EXTS = ["txt", "csv", "tsv", "md", "json", "log"]
const PDF_EXTS = ["pdf"]
const SHEET_EXTS = ["xlsx", "xls", "xlsm", "ods"]

export const ACCEPT_DOCUMENTO = ".pdf,.xlsx,.xls,.xlsm,.ods,.csv,.tsv,.txt,.md,.json"
export const MAX_DOC_BYTES = 15 * 1024 * 1024 // 15 MB

export function extensao(nome: string): string {
  const m = nome.toLowerCase().match(/\.([a-z0-9]+)$/)
  return m ? m[1] : ""
}

export function formatoSuportado(nome: string): boolean {
  const ext = extensao(nome)
  return [...TEXT_EXTS, ...PDF_EXTS, ...SHEET_EXTS].includes(ext)
}

async function extrairPdf(file: File): Promise<string> {
  const pdfjs = await import("pdfjs-dist")
  const workerUrl = (await import("pdfjs-dist/build/pdf.worker.min.mjs?url")).default
  pdfjs.GlobalWorkerOptions.workerSrc = workerUrl

  const buf = await file.arrayBuffer()
  const doc = await pdfjs.getDocument({ data: buf }).promise
  const partes: string[] = []
  for (let i = 1; i <= doc.numPages; i++) {
    const page = await doc.getPage(i)
    const content = await page.getTextContent()
    const texto = content.items.map((it: any) => ("str" in it ? it.str : "")).join(" ")
    partes.push(texto)
  }
  await doc.destroy()
  return partes.join("\n\n").trim()
}

async function extrairPlanilha(file: File): Promise<string> {
  const XLSX = await import("xlsx")
  const buf = await file.arrayBuffer()
  const wb = XLSX.read(buf, { type: "array" })
  const partes: string[] = []
  wb.SheetNames.forEach((nome) => {
    const csv = XLSX.utils.sheet_to_csv(wb.Sheets[nome])
    if (csv.trim()) partes.push(`# ${nome}\n${csv}`)
  })
  return partes.join("\n\n").trim()
}

function extrairTexto(file: File): Promise<string> {
  return file.text()
}

/**
 * Extrai o texto de um documento. Lança Error com mensagem amigável se o formato
 * não for suportado, o arquivo for grande demais, ou nada de texto for encontrado
 * (ex.: PDF escaneado só com imagem).
 */
export async function extrairTextoDocumento(file: File): Promise<string> {
  if (file.size > MAX_DOC_BYTES) {
    throw new Error("Arquivo grande demais (máx. 15 MB). Envie um arquivo menor ou cole o texto.")
  }
  const ext = extensao(file.name)
  let texto = ""
  if (PDF_EXTS.includes(ext)) texto = await extrairPdf(file)
  else if (SHEET_EXTS.includes(ext)) texto = await extrairPlanilha(file)
  else if (TEXT_EXTS.includes(ext)) texto = await extrairTexto(file)
  else throw new Error("Formato não suportado. Use PDF, Excel, CSV ou TXT — ou cole o texto direto.")

  texto = texto.trim()
  if (!texto) {
    throw new Error(
      "Não consegui ler texto deste arquivo (pode ser um PDF escaneado/imagem). Cole o texto manualmente."
    )
  }
  return texto
}
