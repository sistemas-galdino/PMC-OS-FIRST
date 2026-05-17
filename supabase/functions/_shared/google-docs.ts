import { getAccessTokenAs, SCOPES } from "./google-auth-sa.ts"

export interface GeminiDocParsed {
  resumo: string | null
  detalhes: string | null
  transcricao: string | null
  conteudo_completo: string | null
}

export async function lerDocumento(emailImpersonate: string, documentId: string) {
  const token = await getAccessTokenAs(emailImpersonate, [SCOPES.DOCUMENTS_READONLY])
  const url = `https://docs.googleapis.com/v1/documents/${encodeURIComponent(documentId)}?includeTabsContent=true`
  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${token}` },
  })
  if (!res.ok) {
    const text = await res.text()
    throw new Error(`Docs lerDocumento (${res.status}): ${text}`)
  }
  return await res.json()
}

interface DocTab {
  tabProperties?: { title?: string }
  documentTab?: { body?: { content?: Array<{ paragraph?: { elements?: Array<{ textRun?: { content?: string } }>; paragraphStyle?: { namedStyleType?: string } } }> } }
}

// Porta direta de scripts/enrich-reunioes-semana.mjs:106-150
export function parseGeminiDoc(doc: { tabs?: DocTab[] }): GeminiDocParsed {
  const tabs = doc.tabs ?? []
  const STOP = /^(Pr[oó]ximas etapas|Pr[oó]ximos passos|A[çc][oõ]es sugeridas|Next steps|Revise as anota[çc][oõ]es|Envie feedback)/i
  const SKIP = /^(Convidados|Anexos|Registros da reuni[aã]o|Participants|Attachments|Meeting notes)$/i
  const SECTION = /^(Resumo|Sum[aá]rio|Detalhes|Discuss[aã]o|T[oó]picos discutidos)$/i
  const DATE = /^\d{1,2} de \w+\.? de \d{4}$/i
  const FOOTER = /^(A transcri[çc][aã]o foi encerrada|Esta transcri[çc][aã]o edit[aá]vel)/i
  const text = (b: { paragraph?: { elements?: Array<{ textRun?: { content?: string } }> } }) =>
    (b.paragraph?.elements ?? []).map(e => e.textRun?.content ?? "").join("").replace(/[\n]+/g, " ").trim()

  let resumo = "", detalhes = "", transcricao = "", conteudo_completo = ""

  const tObs = tabs.find(t => /observa[çc][oõ]es/i.test(t.tabProperties?.title ?? ""))
  if (tObs) {
    let sec = ""
    const conteudoLines: string[] = []
    let hitStop = false
    for (const b of (tObs.documentTab?.body?.content ?? [])) {
      if (!b.paragraph) continue
      const t = text(b)
      if (!t) continue
      if (DATE.test(t) || SKIP.test(t)) continue
      const st = b.paragraph?.paragraphStyle?.namedStyleType ?? ""
      if (st === "HEADING_2") continue
      conteudoLines.push(t)
      if (STOP.test(t)) { hitStop = true; continue }
      if (hitStop) continue
      if (st.startsWith("HEADING") && SECTION.test(t)) {
        sec = t.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "")
        continue
      }
      if (sec.startsWith("resum") || sec.startsWith("sum")) resumo += (resumo ? "\n" : "") + t
      else if (sec.startsWith("detalhe") || sec.startsWith("discuss") || sec.startsWith("topic")) detalhes += (detalhes ? "\n" : "") + t
    }
    conteudo_completo = conteudoLines.join("\n").trim()
  }

  const tTr = tabs.find(t => /transcri[çc][aã]o/i.test(t.tabProperties?.title ?? ""))
  if (tTr) {
    const lines: string[] = []
    for (const b of (tTr.documentTab?.body?.content ?? [])) {
      if (!b.paragraph) continue
      const t = text(b)
      if (!t || DATE.test(t)) continue
      if (FOOTER.test(t)) break
      lines.push(t)
    }
    transcricao = lines.join("\n").trim()
  }

  return {
    resumo: resumo || null,
    detalhes: detalhes || null,
    transcricao: transcricao || null,
    conteudo_completo: conteudo_completo || null,
  }
}

// Extrai o fileId de uma URL do Drive/Docs (ex: https://docs.google.com/document/d/{ID}/edit)
export function extrairDocIdDaUrl(url: string | null): string | null {
  if (!url) return null
  const m = url.match(/\/document\/d\/([a-zA-Z0-9_-]+)/) ?? url.match(/[?&]id=([a-zA-Z0-9_-]+)/)
  return m ? m[1] : null
}
