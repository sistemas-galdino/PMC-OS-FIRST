// Liberação pública dos arquivos do Drive, com o ledger drive_arquivos_publicos
// por cima da Drive API. Usado pelo enrich (sincronizar-reunioes) e pelo backfill.

import { tornarPublicoComFallback } from "./google-drive.ts"

// Caixas do workspace que costumam organizar reuniões. Servem de fallback quando
// o email_calendar do consultor não é o dono do arquivo (calendário secundário).
const CONTAS_ANCORA = [
  "dono@rafaelgaldino.com.br",
  "mentor@rafaelgaldino.com.br",
  "especialistablackcrm@rafaelgaldino.com.br",
  "mentores@rafaelgaldino.com.br",
]

// Quantas vezes insistir num arquivo que falha antes de parar de tentar. Sem isto,
// arquivo apagado do Drive seria re-tentado a cada rodada do cron pra sempre.
export const MAX_TENTATIVAS = 5

let cacheCandidatas: string[] | null = null

export async function buscarContasCandidatas(supabase: any): Promise<string[]> {
  if (cacheCandidatas) return cacheCandidatas
  const { data } = await supabase.from("consultores_atendimento").select("email_calendar")
  const doBanco = (data ?? []).map((c: { email_calendar: string | null }) => c.email_calendar).filter(Boolean)
  cacheCandidatas = [...new Set([...doBanco, ...CONTAS_ANCORA])] as string[]
  return cacheCandidatas
}

export interface GarantirPublicoResultado {
  ok: boolean
  jaEra: boolean
  pulado: boolean
  erro?: string
}

// Garante que o arquivo esteja acessível por link. Nunca lança: quem chama segue
// o fluxo mesmo se a liberação falhar (o link continua sendo salvo no banco).
export async function garantirPublico(
  supabase: any,
  fileId: string,
  origem: "gravacao" | "geminidoc",
  contaPreferida: string | null,
  candidatas: string[],
): Promise<GarantirPublicoResultado> {
  try {
    const { data: ledger } = await supabase
      .from("drive_arquivos_publicos")
      .select("file_id, liberado_em, tentativas")
      .eq("file_id", fileId)
      .maybeSingle()

    if (ledger?.liberado_em) return { ok: true, jaEra: true, pulado: true }
    if ((ledger?.tentativas ?? 0) >= MAX_TENTATIVAS) return { ok: false, jaEra: false, pulado: true }

    const ordem = [contaPreferida, ...candidatas].filter(Boolean) as string[]
    const res = await tornarPublicoComFallback(fileId, ordem)

    await supabase.from("drive_arquivos_publicos").upsert(
      {
        file_id: fileId,
        origem,
        liberado_em: res.ok ? new Date().toISOString() : null,
        conta_impersonada: res.conta ?? null,
        tentativas: (ledger?.tentativas ?? 0) + 1,
        ultimo_erro: res.ok ? null : (res.erro ?? "?").slice(0, 500),
        atualizado_em: new Date().toISOString(),
      },
      { onConflict: "file_id" },
    )

    if (!res.ok) console.warn(`[drive] ${origem} ${fileId}: ${res.motivo} — ${res.erro}`)
    return { ok: res.ok, jaEra: !!res.jaEra, pulado: false, erro: res.erro }
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e)
    console.warn(`[drive] garantirPublico ${fileId}:`, msg)
    return { ok: false, jaEra: false, pulado: false, erro: msg }
  }
}
