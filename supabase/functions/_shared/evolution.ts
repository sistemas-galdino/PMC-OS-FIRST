/**
 * Cliente compartilhado da Evolution API (WhatsApp) — v2.3.7.
 *
 * Duas naturezas de instância convivem aqui:
 *
 *   - DIRETÓRIO (`automacao-black-eagle-3010`): o número de automação, que está
 *     em todos os grupos de cliente. Serve só para LER a lista de grupos. Um
 *     n8n externo dispara lembretes por ele, e uma escrita nossa (webhook/set,
 *     logout, delete) derrubaria esse fluxo. Por isso `evoFetch` recusa
 *     qualquer método não-GET cujo caminho toque a instância de diretório —
 *     é um guard de código, não uma convenção.
 *
 *   - CS: uma instância Baileys por Sucesso do Cliente, criada quando ela
 *     escaneia o QR. É por ela que lemos e respondemos os grupos da carteira.
 */

const BASE = (Deno.env.get("EVOLUTION_URL") ?? "").replace(/\/+$/, "")
const APIKEY = Deno.env.get("EVOLUTION_APIKEY") ?? ""
export const INSTANCIA_DIRETORIO = Deno.env.get("EVOLUTION_INSTANCE_DIRETORIO") ?? ""

export function evolutionConfigurada(): boolean {
  return !!BASE && !!APIKEY
}

export class EvolutionError extends Error {
  constructor(readonly status: number, readonly corpo: string) {
    super(`Evolution ${status}: ${corpo.slice(0, 300)}`)
  }
}

export async function evoFetch<T>(caminho: string, init: RequestInit = {}): Promise<T> {
  if (!evolutionConfigurada()) {
    throw new Error("EVOLUTION_URL / EVOLUTION_APIKEY não configurados")
  }
  const metodo = (init.method ?? "GET").toUpperCase()
  if (metodo !== "GET" && INSTANCIA_DIRETORIO && caminho.includes(INSTANCIA_DIRETORIO)) {
    // Ver o cabeçalho: a instância de automação é somente-leitura para nós.
    throw new Error(
      `bloqueado: ${metodo} em ${INSTANCIA_DIRETORIO}. A instância de automação é somente leitura (n8n depende dela).`,
    )
  }
  const resp = await fetch(`${BASE}${caminho}`, {
    ...init,
    headers: { apikey: APIKEY, "Content-Type": "application/json", ...(init.headers ?? {}) },
  })
  const texto = await resp.text()
  if (!resp.ok) throw new EvolutionError(resp.status, texto)
  return (texto ? JSON.parse(texto) : null) as T
}

// ============================================================
// Grupos
// ============================================================

export interface GrupoEvolution {
  id: string // 1203...@g.us
  subject: string
  size?: number
}

export async function listarGrupos(instancia: string): Promise<GrupoEvolution[]> {
  const dados = await evoFetch<GrupoEvolution[]>(
    `/group/fetchAllGroups/${encodeURIComponent(instancia)}?getParticipants=false`,
  )
  return Array.isArray(dados) ? dados : []
}

// ============================================================
// Código do cliente a partir do nome do grupo
// ============================================================

/**
 * Os grupos seguem "<Empresa> - PMC <código>", mas com uma dúzia de variações
 * reais: "PMC - 443", "PMC/EUA - 356", "PMC EUA 360", "PMC 250 ✨", "PMC143",
 * "PMC - Clínica NV 115". Duas regras cobrem 222 dos 237 grupos sem um único
 * falso positivo (medido contra os 322 clientes do PROD em 07/09/2026):
 *
 *   1. `fim`       — número no final da string, ignorando emoji e pontuação.
 *   2. `apos_pmc`  — número logo depois de "PMC", quando não há número no fim.
 *
 * Exigir "PMC" no nome é o que impede pegar número de qualquer grupo. Descartar
 * "imersão"/"cortesia" é o que impede ler "Imersão IA para Empresários #13"
 * como o cliente 13 — a numeração ali é de turma, não de cliente.
 */
export type RegraCodigo = "fim" | "apos_pmc" | "antes_pmc" | "nenhuma"

export function codigoDoGrupo(subject: string): { codigo: number | null; regra: RegraCodigo } {
  const s = (subject ?? "").trim()
  if (!/\bPMC/i.test(s)) return { codigo: null, regra: "nenhuma" }
  // Grupo interno nunca tem código de cliente, e "#2 PMC" pareceria o cliente 2.
  if (grupoInterno(s)) return { codigo: null, regra: "nenhuma" }

  const fim = s.match(/(\d{1,4})\s*[^\w\d]*$/)
  if (fim) return { codigo: Number(fim[1]), regra: "fim" }

  const aposPmc = s.match(/PMC[\s\-/A-Za-z]{0,12}?(\d{1,4})\b/i)
  if (aposPmc) return { codigo: Number(aposPmc[1]), regra: "apos_pmc" }

  // "Carvalho e Lopes Laboratório Ltda - 365 - PMC": o código vem antes do sufixo.
  const antesPmc = s.match(/\b(\d{1,4})\b[\s\-/]{0,5}PMC/i)
  if (antesPmc) return { codigo: Number(antesPmc[1]), regra: "antes_pmc" }

  return { codigo: null, regra: "nenhuma" }
}

/**
 * Grupos do próprio PMC que não pertencem a cliente nenhum. Entram no sistema
 * como conversa sem cliente (`interno`), visíveis a todo o time e fora das
 * métricas por cliente. Casado por trecho, minúsculo e sem acento, porque os
 * nomes carregam emoji e mudam de pontuação.
 */
// Nada de "febracis" aqui: Febracis Bahia/Florianópolis/Curitiba/Maringá/RJ são
// clientes reais, com código. Só as unidades sem código (Joinville, RS) caem na
// fila de vínculo manual, que é o lugar certo para elas.
const TRECHOS_INTERNOS = [
  "imersao ia para empresarios",
  "cortesia",
  "time cs",
  "[time] multiplicador",
  "pmc - avisos",
  "#1 pmc",
  "#2 pmc",
]

function semAcento(t: string): string {
  return (t ?? "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase()
}

export function grupoInterno(subject: string): boolean {
  const s = semAcento(subject)
  return TRECHOS_INTERNOS.some((t) => s.includes(t))
}

// ============================================================
// JIDs
// ============================================================

/**
 * A Evolution v2.3 usa `addressingMode: "lid"`: `key.participant` vem como
 * "274199386058807@lid", que NÃO é telefone. O número real vem em
 * `key.participantAlt`. Nunca identificar pessoa pelo lid isolado.
 */
export function telefoneDoJid(jid: string | null | undefined): string | null {
  if (!jid) return null
  if (jid.endsWith("@lid")) return null
  const m = jid.match(/^(\d{8,15})@/)
  return m ? m[1] : null
}

// ============================================================
// Ciclo de vida de instância
// ============================================================

export interface RespostaConexao {
  /** data:image/png;base64,... quando a Evolution devolve o QR. */
  qr: string | null
  pairingCode: string | null
}

/** Normaliza o QR: a Evolution ora devolve `base64` cru, ora já com o prefixo. */
export function normalizarQr(base64: string | null | undefined): string | null {
  if (!base64) return null
  return base64.startsWith("data:") ? base64 : `data:image/png;base64,${base64}`
}

export const EVENTOS_WEBHOOK = [
  "QRCODE_UPDATED",
  "CONNECTION_UPDATE",
  "MESSAGES_UPSERT",
  "MESSAGES_UPDATE",
  "SEND_MESSAGE",
  "LOGOUT_INSTANCE",
  "REMOVE_INSTANCE",
]

/**
 * Cria a instância já com o webhook configurado na mesma chamada.
 *
 * `syncFullHistory: false` e a ausência de CHATS_SET/MESSAGES_SET na lista de
 * eventos são deliberados: com 237 grupos, ligar o histórico completo joga
 * dezenas de milhares de mensagens no webhook no primeiro minuto. O histórico
 * recente vem depois, controlado, pelo backfill.
 *
 * `byEvents: false` porque com `true` a Evolution monta `${url}/messages-upsert`
 * e o roteador de functions do Supabase não casa esse caminho.
 */
export async function criarInstancia(
  instancia: string,
  webhookUrl: string,
  webhookToken: string,
): Promise<RespostaConexao> {
  const r = await evoFetch<{ qrcode?: { base64?: string; pairingCode?: string } }>(
    "/instance/create",
    {
      method: "POST",
      body: JSON.stringify({
        instanceName: instancia,
        integration: "WHATSAPP-BAILEYS",
        qrcode: true,
        groupsIgnore: false,
        alwaysOnline: false,
        readMessages: false,
        readStatus: false,
        syncFullHistory: false,
        webhook: {
          enabled: true,
          url: webhookUrl,
          headers: { "x-pmc-webhook-token": webhookToken },
          byEvents: false,
          base64: true,
          events: EVENTOS_WEBHOOK,
        },
      }),
    },
  )
  return { qr: normalizarQr(r?.qrcode?.base64), pairingCode: r?.qrcode?.pairingCode ?? null }
}

/** Reconecta uma instância existente e devolve o QR novo (a Evolution rotaciona). */
export async function conectarInstancia(instancia: string): Promise<RespostaConexao> {
  const r = await evoFetch<{ base64?: string; pairingCode?: string; code?: string }>(
    `/instance/connect/${encodeURIComponent(instancia)}`,
  )
  return { qr: normalizarQr(r?.base64), pairingCode: r?.pairingCode ?? null }
}

export type EstadoEvolution = "open" | "close" | "connecting" | "desconhecido"

export async function estadoInstancia(instancia: string): Promise<EstadoEvolution> {
  try {
    const r = await evoFetch<{ instance?: { state?: string } }>(
      `/instance/connectionState/${encodeURIComponent(instancia)}`,
    )
    return (r?.instance?.state as EstadoEvolution) ?? "desconhecido"
  } catch (e) {
    if (e instanceof EvolutionError && e.status === 404) return "close"
    throw e
  }
}

export async function logoutInstancia(instancia: string): Promise<void> {
  await evoFetch(`/instance/logout/${encodeURIComponent(instancia)}`, { method: "DELETE" })
}

export async function deletarInstancia(instancia: string): Promise<void> {
  await evoFetch(`/instance/delete/${encodeURIComponent(instancia)}`, { method: "DELETE" })
}

/** Estado da Evolution -> status da nossa tabela. */
export function statusDoEstado(estado: EstadoEvolution): string {
  if (estado === "open") return "conectada"
  if (estado === "connecting") return "conectando"
  return "desconectada"
}

/**
 * Nome da instância a partir do nome do membro do time: 'Bruna' -> 'pmc-cs-bruna'.
 * Precisa ser estável — é a chave da instância no servidor da Evolution.
 */
export function nomeInstanciaDeMentor(nome: string, mentorId: number): string {
  const slug = (nome ?? "")
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
  return slug ? `pmc-cs-${slug}` : `pmc-cs-${mentorId}`
}

// ============================================================
// Mensagens
// ============================================================

export interface MensagemEvolution {
  key?: {
    id?: string
    fromMe?: boolean
    remoteJid?: string
    participant?: string
    participantAlt?: string
  }
  pushName?: string
  messageType?: string
  message?: Record<string, unknown>
  messageTimestamp?: number | { low?: number }
}

/** Texto legível de uma mensagem, cobrindo os formatos que a Baileys entrega. */
export function textoDaMensagem(m: MensagemEvolution): string {
  const msg = (m?.message ?? {}) as Record<string, any>
  return (
    msg.conversation ??
    msg.extendedTextMessage?.text ??
    msg.imageMessage?.caption ??
    msg.videoMessage?.caption ??
    msg.documentMessage?.caption ??
    msg.documentWithCaptionMessage?.message?.documentMessage?.caption ??
    msg.buttonsResponseMessage?.selectedDisplayText ??
    msg.listResponseMessage?.title ??
    ""
  )
}

/** `messageTimestamp` vem como número ou como Long serializado ({low, high}). */
export function instanteDaMensagem(m: MensagemEvolution): string {
  const t = m?.messageTimestamp
  const seg = typeof t === "number" ? t : t?.low
  if (!seg) return new Date().toISOString()
  return new Date(seg * 1000).toISOString()
}

const TIPOS_ANEXO: Record<string, "imagem" | "video" | "audio" | "documento"> = {
  imageMessage: "imagem",
  videoMessage: "video",
  audioMessage: "audio",
  documentMessage: "documento",
  documentWithCaptionMessage: "documento",
  stickerMessage: "imagem",
}

export function anexoDaMensagem(
  m: MensagemEvolution,
): { nome: string; tipo: string } | null {
  const msg = (m?.message ?? {}) as Record<string, any>
  for (const [chave, tipo] of Object.entries(TIPOS_ANEXO)) {
    if (!msg[chave]) continue
    const nome =
      msg[chave]?.fileName ??
      msg.documentWithCaptionMessage?.message?.documentMessage?.fileName ??
      tipo
    return { nome, tipo }
  }
  return null
}
