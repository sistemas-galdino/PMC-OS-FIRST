import { useQuery } from "@tanstack/react-query"
import { supabase } from "@/lib/supabase"

/**
 * Conversas de WhatsApp da carteira (aba Atendimento).
 *
 * No sistema original este módulo era, além dos tipos, um gerador de conversas
 * fictícias: `seedConversas()` inventava 8 a 15 mensagens por cliente ativo em
 * localStorage. Aqui a fonte é o banco (`crm_conversas` / `crm_mensagens`) e o
 * seed não veio junto — inventar mensagem de cliente é pior que tela vazia.
 * Enquanto o provedor não estiver ligado, a aba mostra o que houver: no DEV,
 * o que `scripts/seed-crm-dev-conversas.sql` semeou; no PROD, nada ainda.
 *
 * Divisão em duas consultas, de propósito:
 *   - a LISTA vem de `crm_conversas_v`, que já traz a última mensagem e a
 *     contagem de sem-resposta calculadas no banco (uma linha por grupo);
 *   - as MENSAGENS de um grupo só são buscadas quando ele é aberto.
 * Com o provedor ligado, uma carteira de 300 clientes vira dezenas de milhares
 * de mensagens; carregar tudo para montar uma lista não sobreviveria a isso.
 */

/**
 * Envio real de mensagem. Fica desligado até existir provedor de WhatsApp
 * conectado — na reunião de 05/08/2026 os chips ainda estavam sendo comprados.
 * O compositor já está pronto e apenas mostra "conexão do WhatsApp pendente"
 * enquanto isto for `false`.
 */
export const ENVIO_HABILITADO = false

export type AnexoTipo = "documento" | "imagem" | "audio" | "video"

export interface AnexoConversa {
  nome: string
  tipo: AnexoTipo
  url?: string
}

export interface MensagemConversa {
  id: string
  autor: string
  /** true quando a mensagem partiu do time PMC. */
  daCS: boolean
  texto: string
  /** ISO */
  em: string
  anexo?: AnexoConversa
}

/** Uma linha da lista de conversas — sem as mensagens. */
export interface ConversaResumo {
  id: string
  grupo_id: string
  grupo_nome: string
  cliente_id: string | null
  cs_responsavel: string | null
  /** Última mensagem do grupo, quando existe. */
  ultima?: MensagemConversa
  /** Mensagens do cliente posteriores à última resposta do time. */
  naoLidas: number
}

interface ConversaRow {
  id: string
  grupo_id: string
  grupo_nome: string
  id_cliente: string | null
  cs_responsavel: string | null
  arquivada: boolean
  ultima_id: string | null
  ultima_autor: string | null
  ultima_da_cs: boolean | null
  ultima_texto: string | null
  ultima_em: string | null
  ultima_anexo_nome: string | null
  ultima_anexo_tipo: string | null
  nao_lidas: number
}

interface MensagemRow {
  id: string
  autor: string
  da_cs: boolean
  texto: string | null
  em: string
  anexo_nome: string | null
  anexo_tipo: string | null
  anexo_url: string | null
}

function anexoDe(
  nome: string | null,
  tipo: string | null,
  url?: string | null,
): AnexoConversa | undefined {
  if (!nome) return undefined
  // O CHECK do banco já restringe os valores; o cast só evita alargar o tipo.
  return { nome, tipo: (tipo as AnexoTipo) ?? "documento", ...(url ? { url } : {}) }
}

function rowToResumo(r: ConversaRow): ConversaResumo {
  return {
    id: r.id,
    grupo_id: r.grupo_id,
    grupo_nome: r.grupo_nome,
    cliente_id: r.id_cliente,
    cs_responsavel: r.cs_responsavel,
    naoLidas: Number(r.nao_lidas) || 0,
    ultima: r.ultima_id
      ? {
          id: r.ultima_id,
          autor: r.ultima_autor ?? "",
          daCS: !!r.ultima_da_cs,
          texto: r.ultima_texto ?? "",
          em: r.ultima_em ?? "",
          anexo: anexoDe(r.ultima_anexo_nome, r.ultima_anexo_tipo),
        }
      : undefined,
  }
}

const LIMITE = 2000

export const conversasQueryKey = ["crm", "conversas"] as const
export const mensagensQueryKey = (conversaId: string) =>
  ["crm", "mensagens", conversaId] as const

export async function fetchConversas(): Promise<ConversaResumo[]> {
  const { data, error } = await supabase
    .from("crm_conversas_v")
    .select("*")
    .eq("arquivada", false)
    .order("ultima_mensagem_em", { ascending: false, nullsFirst: false })
    .limit(LIMITE)
  if (error) throw error
  return ((data ?? []) as unknown as ConversaRow[]).map(rowToResumo)
}

export async function fetchMensagens(conversaId: string): Promise<MensagemConversa[]> {
  const { data, error } = await supabase
    .from("crm_mensagens")
    .select("id, autor, da_cs, texto, em, anexo_nome, anexo_tipo, anexo_url")
    .eq("conversa_id", conversaId)
    .order("em", { ascending: true })
    .limit(LIMITE)
  if (error) throw error
  return ((data ?? []) as unknown as MensagemRow[]).map((m) => ({
    id: m.id,
    autor: m.autor,
    daCS: m.da_cs,
    texto: m.texto ?? "",
    em: m.em,
    anexo: anexoDe(m.anexo_nome, m.anexo_tipo, m.anexo_url),
  }))
}

/**
 * Lista de conversas. `carregando` importa: a Torre precisa distinguir
 * "ninguém está sem resposta" de "ainda não sabemos".
 */
export function useConversas() {
  const q = useQuery({
    queryKey: conversasQueryKey,
    queryFn: fetchConversas,
    staleTime: 60_000,
  })
  return {
    conversas: q.data ?? [],
    carregando: q.isPending,
    erro: q.error as Error | null,
  }
}

/** Mensagens de um grupo. Só busca quando há grupo aberto. */
export function useMensagens(conversaId: string | null) {
  const q = useQuery({
    queryKey: mensagensQueryKey(conversaId ?? "—"),
    queryFn: () => fetchMensagens(conversaId as string),
    enabled: !!conversaId,
    staleTime: 30_000,
  })
  return { mensagens: q.data ?? [], carregando: q.isPending && !!conversaId }
}

/** Horas úteis (seg–sex, 08h–18h) entre uma data e agora. */
export function horasUteisDesde(iso: string, agora = new Date()): number {
  let ini = new Date(iso).getTime()
  const fim = agora.getTime()
  if (isNaN(ini) || fim <= ini) return 0
  let horas = 0
  const passo = 15 * 60_000
  while (ini < fim) {
    const d = new Date(ini)
    const dia = d.getDay()
    const h = d.getHours()
    if (dia >= 1 && dia <= 5 && h >= 8 && h < 18) horas += passo / 3600_000
    ini += passo
  }
  return horas
}

/**
 * Silêncio de um grupo, em horas úteis. Zero quando a última mensagem é do
 * time — quem está devendo resposta é o cliente, não a CS.
 */
export function silencioDe(c: ConversaResumo, agora = new Date()): number {
  if (!c.ultima || c.ultima.daCS) return 0
  return horasUteisDesde(c.ultima.em, agora)
}

/** Grupos em que a última palavra foi do cliente. */
export function semResposta(conversas: ConversaResumo[]): ConversaResumo[] {
  return conversas.filter((c) => !!c.ultima && !c.ultima.daCS)
}
