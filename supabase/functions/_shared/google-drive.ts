// Drive API v3: concede acesso público por link às gravações do Meet e aos docs
// do Gemini. Os arquivos nascem privados na pasta do organizador, então sem isto
// o cliente cai na tela de "solicitar acesso" ao clicar em "Assistir".

import { getAccessTokenAs, SCOPES } from "./google-auth-sa.ts"

const DRIVE_API = "https://www.googleapis.com/drive/v3/files"

export type MotivoFalha = "sem_permissao" | "politica_dominio" | "rate_limit" | "outro"

export interface ResultadoPublico {
  ok: boolean
  jaEra?: boolean
  motivo?: MotivoFalha
  erro?: string
}

// Extrai o fileId de qualquer URL do Drive/Docs. Cobre os formatos que o Meet e o
// Gemini colocam em event.attachments[].fileUrl.
export function extrairFileIdDaUrl(url: string | null | undefined): string | null {
  if (!url) return null
  const m =
    url.match(/\/file\/d\/([a-zA-Z0-9_-]+)/) ??
    url.match(/\/document\/d\/([a-zA-Z0-9_-]+)/) ??
    url.match(/\/(?:presentation|spreadsheets)\/d\/([a-zA-Z0-9_-]+)/) ??
    url.match(/[?&]id=([a-zA-Z0-9_-]+)/)
  return m ? m[1] : null
}

// Classifica o corpo de erro da Drive API para o chamador decidir entre trocar de
// conta (sem_permissao), desistir de vez (politica_dominio) ou tentar de novo.
function classificar(status: number, corpo: string): MotivoFalha {
  if (status === 404) return "sem_permissao"
  if (status === 429) return "rate_limit"
  if (status === 403) {
    if (/userRateLimitExceeded|rateLimitExceeded|sharingRateLimitExceeded/i.test(corpo)) return "rate_limit"
    if (/cannotShareWithLink|sharingNotAllowed|crossDomain|domainPolicy|abusiveContentRestriction/i.test(corpo)) {
      return "politica_dominio"
    }
    return "sem_permissao"
  }
  return "outro"
}

async function driveFetch(
  emailImpersonar: string,
  url: string,
  init: RequestInit = {},
): Promise<{ ok: true; data: any } | { ok: false; motivo: MotivoFalha; erro: string }> {
  const token = await getAccessTokenAs(emailImpersonar, [SCOPES.DRIVE])
  const res = await fetch(url, {
    ...init,
    headers: {
      ...(init.headers ?? {}),
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
  })
  if (!res.ok) {
    const corpo = await res.text()
    return { ok: false, motivo: classificar(res.status, corpo), erro: `Drive (${res.status}): ${corpo.slice(0, 300)}` }
  }
  return { ok: true, data: await res.json() }
}

// Devolve a primeira conta candidata que consegue compartilhar o arquivo. O dono é
// o organizador do evento — normalmente o email_calendar do consultor, mas não
// sempre (calendários secundários), daí o fallback pelas contas do workspace.
export async function resolverDono(fileId: string, candidatos: string[]): Promise<string | null> {
  const url = `${DRIVE_API}/${encodeURIComponent(fileId)}?fields=owners(emailAddress),capabilities(canShare)&supportsAllDrives=true`
  for (const email of candidatos) {
    if (!email) continue
    try {
      const r = await driveFetch(email, url)
      if (r.ok && r.data?.capabilities?.canShare === true) return email
    } catch (e) {
      console.warn(`[drive] resolverDono ${fileId} via ${email}:`, e instanceof Error ? e.message : String(e))
    }
  }
  return null
}

// Concede "qualquer pessoa com o link pode ver". Idempotente: checa antes se a
// permissão anyone já existe, para não gastar quota reescrevendo.
export async function tornarPublico(emailImpersonar: string, fileId: string): Promise<ResultadoPublico> {
  try {
    const listUrl = `${DRIVE_API}/${encodeURIComponent(fileId)}/permissions?fields=permissions(id,type,role)&supportsAllDrives=true`
    const atuais = await driveFetch(emailImpersonar, listUrl)
    if (!atuais.ok) return { ok: false, motivo: atuais.motivo, erro: atuais.erro }

    const jaPublico = (atuais.data?.permissions ?? []).some(
      (p: { type?: string; role?: string }) => p.type === "anyone" && (p.role === "reader" || p.role === "writer"),
    )
    if (jaPublico) return { ok: true, jaEra: true }

    const createUrl = `${DRIVE_API}/${encodeURIComponent(fileId)}/permissions?supportsAllDrives=true&sendNotificationEmail=false`
    const criado = await driveFetch(emailImpersonar, createUrl, {
      method: "POST",
      body: JSON.stringify({ role: "reader", type: "anyone" }),
    })
    if (!criado.ok) return { ok: false, motivo: criado.motivo, erro: criado.erro }
    return { ok: true, jaEra: false }
  } catch (e) {
    return { ok: false, motivo: "outro", erro: e instanceof Error ? e.message : String(e) }
  }
}

// Tenta liberar impersonando o candidato mais provável; se for questão de permissão,
// procura o dono real entre as outras contas e tenta de novo.
export async function tornarPublicoComFallback(
  fileId: string,
  candidatos: string[],
): Promise<ResultadoPublico & { conta?: string }> {
  const primeiro = candidatos.find(Boolean)
  if (!primeiro) return { ok: false, motivo: "outro", erro: "sem conta candidata" }

  const r = await tornarPublico(primeiro, fileId)
  if (r.ok || r.motivo !== "sem_permissao") return { ...r, conta: primeiro }

  const dono = await resolverDono(fileId, candidatos.filter(c => c && c !== primeiro))
  if (!dono) return { ...r, conta: primeiro }

  const r2 = await tornarPublico(dono, fileId)
  return { ...r2, conta: dono }
}
