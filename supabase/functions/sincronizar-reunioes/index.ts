import "jsr:@supabase/functions-js/edge-runtime.d.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"
import { corsHeaders, jsonResponse } from "../_shared/cors.ts"
import { buscarEvento, extrairAttachments } from "../_shared/google-calendar.ts"
import { lerDocumento, parseGeminiDoc, extrairDocIdDaUrl } from "../_shared/google-docs.ts"
import { extrairGanhoAcoes } from "../_shared/llm-enrich.ts"

interface Consultor {
  id: string
  nome: string
  email_calendar: string
  tabela_destino: "reunioes_galdino" | "reunioes_mentoria_new" | "reunioes_blackcrm"
}

interface Reuniao {
  id_unico: string
  id_reuniao: string | null
  data_reuniao: string | null
  empresa: string | null
  transcricao: string | null
  link_geminidoc: string | null
  link_gravacao: string | null
  ganho: string | null
  consultor_nome: string | null
  mentor?: string | null
  responsavel?: string | null
  origem_tabela: "reunioes_galdino" | "reunioes_mentoria_new" | "reunioes_blackcrm"
}

const TABELAS: Reuniao["origem_tabela"][] = ["reunioes_galdino", "reunioes_mentoria_new", "reunioes_blackcrm"]

// Até quando vale re-checar o anexo de gravação numa reunião já transcrita. A
// gravação (mp4) costuma entrar no evento depois da transcrição/doc; sem isso o
// link_gravacao nunca era preenchido. Gravação não aparece meses depois, então
// limitamos a janela pra não re-buscar evento à toa pra sempre.
const JANELA_REGRAVACAO_DIAS = 120

function autorizado(req: Request): boolean {
  const expected = Deno.env.get("CRON_INVOKE_TOKEN")
  if (!expected) return false
  const auth = req.headers.get("Authorization") ?? ""
  return auth === `Bearer ${expected}`
}

async function isAdminUser(supabaseAdmin: any, supabaseUrl: string, anonKey: string, jwt: string): Promise<boolean> {
  const supabaseAsUser = createClient(supabaseUrl, anonKey, {
    global: { headers: { Authorization: `Bearer ${jwt}` } },
    auth: { persistSession: false },
  })
  const { data: { user } } = await supabaseAsUser.auth.getUser()
  if (!user?.email) return false
  const { data: mentor } = await supabaseAdmin
    .from("mentores")
    .select("id")
    .eq("email", user.email)
    .maybeSingle()
  return !!mentor
}

function nomeConsultorDaLinha(r: Reuniao): string | null {
  if (r.origem_tabela === "reunioes_galdino") return "Galdino"
  if (r.origem_tabela === "reunioes_mentoria_new") return r.mentor ?? null
  if (r.origem_tabela === "reunioes_blackcrm") return r.responsavel ?? null
  return null
}

async function buscarReunioesParaEnrich(supabase: any): Promise<Reuniao[]> {
  const hojeIso = new Date().toISOString().slice(0, 10)
  const cutoffRegravacao = new Date(Date.now() - JANELA_REGRAVACAO_DIAS * 24 * 60 * 60 * 1000)
    .toISOString()
    .slice(0, 10)
  const all: Reuniao[] = []

  const sel = "id_unico, id_reuniao, data_reuniao, empresa, transcricao, link_geminidoc, link_gravacao, ganho"
  for (const tabela of TABELAS) {
    const cols = tabela === "reunioes_galdino"
      ? sel
      : tabela === "reunioes_mentoria_new"
      ? `${sel}, mentor`
      : `${sel}, responsavel`

    const { data, error } = await supabase
      .from(tabela)
      .select(cols)
      .eq("criado_via", "agendamento_publico")
      .not("id_reuniao", "is", null)
      .lt("data_reuniao", hojeIso)
      // Falta transcrição/ganho (qualquer idade) OU falta gravação/doc numa reunião
      // recente (até JANELA_REGRAVACAO_DIAS): a gravação chega depois da transcrição.
      .or(
        `transcricao.is.null,ganho.is.null,and(data_reuniao.gte.${cutoffRegravacao},or(link_gravacao.is.null,link_geminidoc.is.null))`,
      )

    if (error) {
      console.error(`[sincronizar] erro select ${tabela}:`, error.message)
      continue
    }
    for (const row of (data ?? [])) {
      all.push({ ...row, origem_tabela: tabela } as Reuniao)
    }
  }
  return all
}

async function buscarMapaConsultores(supabase: any): Promise<Map<string, Consultor>> {
  const { data } = await supabase
    .from("consultores_atendimento")
    .select("id, nome, email_calendar, tabela_destino")
  const map = new Map<string, Consultor>()
  for (const c of (data as Consultor[] ?? [])) {
    map.set(`${c.tabela_destino}|${c.nome}`, c)
  }
  return map
}

async function enrichReuniao(supabase: any, r: Reuniao, consultor: Consultor): Promise<{ ok: boolean; erro?: string }> {
  if (!r.id_reuniao) return { ok: false, erro: "sem id_reuniao" }
  try {
    const evt = await buscarEvento(consultor.email_calendar, r.id_reuniao)
    const att = extrairAttachments(evt)

    const patch: Record<string, unknown> = {}
    if (!r.link_gravacao && att.gravacao_url) patch.link_gravacao = att.gravacao_url
    if (!r.link_geminidoc && att.gemini_doc_url) patch.link_geminidoc = att.gemini_doc_url
    // Marca gravada quando a gravação aparece (inclusive tardia, sem reler o doc).
    if (r.origem_tabela === "reunioes_mentoria_new" && att.gravacao_url) patch.gravada = true

    if (att.gemini_doc_id && !r.transcricao) {
      try {
        const doc = await lerDocumento(consultor.email_calendar, att.gemini_doc_id)
        const parsed = parseGeminiDoc(doc)
        if (parsed.transcricao) patch.transcricao = parsed.transcricao
        if (parsed.resumo) patch.resumo = parsed.resumo
        if (parsed.detalhes) patch.detalhes_reuniao = parsed.detalhes
        if (r.origem_tabela === "reunioes_mentoria_new") {
          patch.tem_transcricao = !!parsed.transcricao
        }
      } catch (docErr) {
        // gemini doc pode falhar (ainda não pronto). Continua só com attachments.
        const msg = docErr instanceof Error ? docErr.message : String(docErr)
        console.warn(`[sincronizar] doc ${att.gemini_doc_id} (${r.id_unico}):`, msg)
      }
    }

    if (Object.keys(patch).length === 0) return { ok: true }

    const { error } = await supabase
      .from(r.origem_tabela)
      .update(patch)
      .eq("id_unico", r.id_unico)

    if (error) return { ok: false, erro: error.message }
    return { ok: true }
  } catch (e) {
    return { ok: false, erro: e instanceof Error ? e.message : String(e) }
  }
}

async function llmEnrichReuniao(supabase: any, r: Reuniao): Promise<{ ok: boolean; erro?: string }> {
  if (!r.transcricao || r.ganho) return { ok: true }
  try {
    const resultado = await extrairGanhoAcoes(r.transcricao, r.empresa)
    const patch: Record<string, unknown> = {
      cliente_compareceu: !!resultado.reuniao_realizada,
      ganho: resultado.ganho_reuniao || "",
      acoes_cliente: resultado.acoes_cliente || [],
      acoes_mentor: resultado.acoes_mentor || [],
    }
    if (resultado.reuniao_realizada) {
      patch.status_agendamento = "realizado"
    }
    const { error } = await supabase
      .from(r.origem_tabela)
      .update(patch)
      .eq("id_unico", r.id_unico)
    if (error) return { ok: false, erro: error.message }
    return { ok: true }
  } catch (e) {
    return { ok: false, erro: e instanceof Error ? e.message : String(e) }
  }
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders })
  }
  if (req.method !== "POST") {
    return jsonResponse({ error: "Método não permitido" }, 405)
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!
  const supabase = createClient(supabaseUrl, serviceKey, {
    auth: { persistSession: false },
  })

  // Autoriza: cron (CRON_INVOKE_TOKEN) OU admin via JWT
  let viaCron = autorizado(req)
  let viaAdmin = false
  if (!viaCron) {
    const auth = req.headers.get("Authorization") ?? ""
    if (auth.startsWith("Bearer ")) {
      const jwt = auth.slice(7)
      viaAdmin = await isAdminUser(supabase, supabaseUrl, anonKey, jwt)
    }
  }
  if (!viaCron && !viaAdmin) {
    return jsonResponse({ error: "Não autorizado" }, 401)
  }

  const consultoresMap = await buscarMapaConsultores(supabase)
  const reunioes = await buscarReunioesParaEnrich(supabase)

  const stats = {
    consideradas: reunioes.length,
    enrich_ok: 0,
    enrich_fail: 0,
    llm_ok: 0,
    llm_fail: 0,
    erros: [] as Array<{ id_unico: string; etapa: string; erro: string }>,
  }

  for (const r of reunioes) {
    const consultorNome = nomeConsultorDaLinha(r)
    if (!consultorNome) continue
    const consultor = consultoresMap.get(`${r.origem_tabela}|${consultorNome}`)
    if (!consultor) continue

    // Passada 1: enrich (Calendar + Docs). Roda também quando só falta a gravação/doc
    // (gravação tardia): enrichReuniao preenche os links sempre e só relê o doc se
    // a transcrição ainda estiver vazia.
    if (!r.transcricao || !r.link_gravacao || !r.link_geminidoc) {
      const res = await enrichReuniao(supabase, r, consultor)
      if (res.ok) {
        stats.enrich_ok++
        // Re-fetch a linha para pegar a transcricao recém-inserida (pra passada 2)
        const { data: updated } = await supabase
          .from(r.origem_tabela)
          .select("transcricao")
          .eq("id_unico", r.id_unico)
          .maybeSingle()
        if (updated?.transcricao) r.transcricao = updated.transcricao
      } else {
        stats.enrich_fail++
        stats.erros.push({ id_unico: r.id_unico, etapa: "enrich", erro: res.erro ?? "?" })
      }
    }

    // Passada 2: LLM (ganho/ações) — só se transcrição existe e ganho não
    if (r.transcricao && !r.ganho) {
      const res = await llmEnrichReuniao(supabase, r)
      if (res.ok) stats.llm_ok++
      else {
        stats.llm_fail++
        stats.erros.push({ id_unico: r.id_unico, etapa: "llm", erro: res.erro ?? "?" })
      }
    }
  }

  return jsonResponse({
    ok: true,
    invocado_via: viaCron ? "cron" : "admin",
    ...stats,
  })
})
