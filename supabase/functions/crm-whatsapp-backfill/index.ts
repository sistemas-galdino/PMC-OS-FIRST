/**
 * CRM — backfill do histórico recente de cada grupo, na conexão da CS.
 *
 * Sem isso a aba /crm/atendimento nasce vazia no dia em que a CS conecta e só
 * enche conforme alguém escreve. Com isso ela abre já mostrando as últimas
 * conversas de cada grupo.
 *
 * Puxa ~50 mensagens por grupo pelo /chat/findMessages da instância da CS.
 * Deliberadamente NÃO ligamos syncFullHistory na instância: a Evolution já tem
 * 27 mil mensagens armazenadas e jogar tudo pelo webhook derruba a sessão.
 *
 * 237 grupos não cabem no wall clock de uma edge function, então a função
 * processa um bloco, grava `backfill_cursor` e se re-invoca. Idempotente pelo
 * mesmo UNIQUE (conversa_id, externo_id) do webhook.
 */
import "jsr:@supabase/functions-js/edge-runtime.d.ts"
import { createClient, type SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2"
import { corsHeaders, jsonResponse } from "../_shared/cors.ts"
import {
  type MensagemEvolution,
  anexoDaMensagem,
  dispararEmBackground,
  evoFetch,
  evolutionConfigurada,
  instanteDaMensagem,
  telefoneDoJid,
  textoDaMensagem,
} from "../_shared/evolution.ts"

/** Grupos por invocação. O resto continua na chamada seguinte. */
const BLOCO = 40
const POR_GRUPO = 50

function autorizadoPorCron(req: Request): boolean {
  const esperado = Deno.env.get("CRON_INVOKE_TOKEN")
  if (!esperado) return false
  return (req.headers.get("Authorization") ?? "") === `Bearer ${esperado}`
}

async function autorizadoPorAdmin(req: Request, url: string, anon: string): Promise<boolean> {
  const auth = req.headers.get("Authorization") ?? ""
  if (!auth.startsWith("Bearer ")) return false
  const caller = createClient(url, anon, {
    global: { headers: { Authorization: auth } },
    auth: { persistSession: false },
  })
  const { data, error } = await caller.rpc("is_admin")
  return !error && data === true
}

interface ConversaRow {
  id: string
  grupo_id: string
}

async function backfillGrupo(
  db: SupabaseClient,
  instancia: string,
  conversa: ConversaRow,
): Promise<number> {
  let resposta: { messages?: { records?: MensagemEvolution[] } }
  try {
    resposta = await evoFetch(`/chat/findMessages/${encodeURIComponent(instancia)}`, {
      method: "POST",
      body: JSON.stringify({
        where: { key: { remoteJid: conversa.grupo_id } },
        page: 1,
        offset: POR_GRUPO,
      }),
    })
  } catch (e) {
    // Grupo que esta instância não enxerga (a CS não está nele) não é erro.
    console.warn(`[backfill] ${conversa.grupo_id}: ${(e as Error).message}`)
    return 0
  }

  const registros = resposta?.messages?.records ?? []
  const linhas = registros
    .map((m) => {
      const externoId = m?.key?.id
      if (!externoId) return null
      const anexo = anexoDaMensagem(m)
      const texto = textoDaMensagem(m)
      if (!texto && !anexo) return null
      return {
        conversa_id: conversa.id,
        externo_id: externoId,
        autor: m?.pushName ?? telefoneDoJid(m?.key?.participantAlt) ?? "desconhecido",
        da_cs: m?.key?.fromMe === true,
        texto,
        em: instanteDaMensagem(m),
        status_envio: m?.key?.fromMe === true ? "enviada" : "recebida",
        instancia,
        autor_lid: m?.key?.participant ?? null,
        autor_jid: m?.key?.participantAlt ?? null,
        tipo: m?.messageType ?? null,
        anexo_nome: anexo?.nome ?? null,
        anexo_tipo: anexo?.tipo ?? null,
      }
    })
    .filter((l): l is NonNullable<typeof l> => l !== null)

  if (!linhas.length) return 0
  const { error } = await db
    .from("crm_mensagens")
    .upsert(linhas, { onConflict: "conversa_id,externo_id", ignoreDuplicates: true })
  if (error) {
    console.error("[backfill] insert", error.message)
    return 0
  }
  return linhas.length
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders })
  if (req.method !== "POST") return jsonResponse({ error: "Método não permitido" }, 405)

  const url = Deno.env.get("SUPABASE_URL")!
  const anon = Deno.env.get("SUPABASE_ANON_KEY")!
  const service = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!

  if (!autorizadoPorCron(req) && !(await autorizadoPorAdmin(req, url, anon))) {
    return jsonResponse({ error: "Não autorizado" }, 401)
  }
  if (!evolutionConfigurada()) {
    return jsonResponse({ error: "Evolution não configurada" }, 500)
  }

  const body = await req.json().catch(() => ({}))
  const instancia = String(body?.instancia ?? "")
  if (!instancia) return jsonResponse({ error: "instancia obrigatória" }, 400)

  const db = createClient(url, service, { auth: { persistSession: false } })

  try {
    const { data: inst, error: errI } = await db
      .from("crm_whatsapp_instancias")
      .select("id, instancia, backfill_cursor, status")
      .eq("instancia", instancia)
      .maybeSingle<{ id: string; instancia: string; backfill_cursor: number; status: string }>()
    if (errI) throw errI
    if (!inst) return jsonResponse({ error: "instância desconhecida" }, 404)
    if (inst.status !== "conectada") {
      return jsonResponse({ error: `instância ${inst.status}, backfill precisa dela conectada` }, 409)
    }

    const cursor = body?.reiniciar === true ? 0 : (inst.backfill_cursor ?? 0)

    await db
      .from("crm_whatsapp_instancias")
      .update({ backfill_status: "rodando", backfill_em: new Date().toISOString() })
      .eq("id", inst.id)

    const { data: conversas, error: errC } = await db
      .from("crm_conversas")
      .select("id, grupo_id")
      .eq("arquivada", false)
      .order("grupo_id", { ascending: true })
      .range(cursor, cursor + BLOCO - 1)
    if (errC) throw errC

    let inseridas = 0
    for (const c of (conversas ?? []) as ConversaRow[]) {
      inseridas += await backfillGrupo(db, inst.instancia, c)
    }

    const processados = conversas?.length ?? 0
    const proximo = cursor + processados
    const acabou = processados < BLOCO

    await db
      .from("crm_whatsapp_instancias")
      .update({
        backfill_cursor: acabou ? 0 : proximo,
        backfill_status: acabou ? "concluido" : "rodando",
        backfill_em: new Date().toISOString(),
      })
      .eq("id", inst.id)

    // Continua o próximo bloco sem esperar — a resposta desta invocação já saiu.
    if (!acabou) {
      dispararEmBackground(`${url}/functions/v1/crm-whatsapp-backfill`, { instancia: inst.instancia })
    }

    return jsonResponse({
      ok: true,
      instancia: inst.instancia,
      de: cursor,
      processados,
      inseridas,
      concluido: acabou,
    })
  } catch (e) {
    console.error("[crm-whatsapp-backfill]", e)
    await db
      .from("crm_whatsapp_instancias")
      .update({ backfill_status: "falhou" })
      .eq("instancia", instancia)
    return jsonResponse({ error: String((e as Error)?.message ?? e) }, 500)
  }
})
