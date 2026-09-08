/**
 * CRM — envia mensagem de um grupo pela aba /crm/atendimento.
 *
 * A mensagem sai pela instância da PRÓPRIA CS, então chega no grupo como ela,
 * não como um número genérico do sistema. É o motivo de existir uma instância
 * por CS em vez de uma só compartilhada.
 *
 * MODO SECO por padrão. Só envia de verdade com WHATSAPP_ENVIO_REAL=true —
 * mesma trava de enviar-mensagens/index.ts. No seco a linha é gravada com
 * status 'pendente' e provedor seco, para dar para testar a tela inteira sem
 * mandar mensagem para cliente nenhum.
 *
 * ECO DO WEBHOOK
 * O que sai daqui volta pelo webhook como MESSAGES_UPSERT com fromMe=true.
 * Gravamos primeiro com externo_id='local:<uuid>' e trocamos pelo key.id de
 * verdade quando a Evolution responde. Se essa troca bater na unique, é porque
 * o webhook chegou primeiro: a linha certa já está lá e a local é descartada.
 * Filtrar fromMe seria mais simples e estaria errado — mensagem que a CS digita
 * no próprio celular chega assim, e capturá-la é metade do ponto do projeto.
 */
import "jsr:@supabase/functions-js/edge-runtime.d.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"
import { corsHeaders, jsonResponse } from "../_shared/cors.ts"
import { evoFetch, evolutionConfigurada } from "../_shared/evolution.ts"

const LIMITE_TEXTO = 4096

interface ConversaRow {
  id: string
  grupo_id: string
  grupo_nome: string
  cs_responsavel: string | null
  interno: boolean
  instancia_envio: string | null
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders })
  if (req.method !== "POST") return jsonResponse({ error: "Método não permitido" }, 405)

  const url = Deno.env.get("SUPABASE_URL")!
  const anon = Deno.env.get("SUPABASE_ANON_KEY")!
  const service = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  const authHeader = req.headers.get("Authorization") ?? ""

  const caller = createClient(url, anon, {
    global: { headers: { Authorization: authHeader } },
    auth: { persistSession: false },
  })
  const db = createClient(url, service, { auth: { persistSession: false } })

  try {
    const { data: userData } = await caller.auth.getUser()
    if (!userData?.user?.id) return jsonResponse({ error: "não autenticado" }, 401)

    const { data: mentorId } = await caller.rpc("crm_meu_mentor_id")
    if (!mentorId) return jsonResponse({ error: "não é membro do time" }, 403)

    const body = await req.json().catch(() => ({}))
    const conversaId = String(body?.conversa_id ?? "")
    const texto = String(body?.texto ?? "").trim()
    if (!conversaId) return jsonResponse({ error: "conversa_id obrigatório" }, 400)
    if (!texto) return jsonResponse({ error: "texto vazio" }, 400)
    if (texto.length > LIMITE_TEXTO) {
      return jsonResponse({ error: `texto acima de ${LIMITE_TEXTO} caracteres` }, 400)
    }

    // Lê a conversa PELO CALLER, de propósito: assim a RLS por carteira decide
    // se ela pode escrever nesse grupo. O service role só entra depois.
    const { data: conversa, error: errConv } = await caller
      .from("crm_conversas")
      .select("id, grupo_id, grupo_nome, cs_responsavel, interno, instancia_envio")
      .eq("id", conversaId)
      .maybeSingle<ConversaRow>()
    if (errConv) throw errConv
    if (!conversa) return jsonResponse({ error: "conversa não encontrada ou fora da carteira" }, 404)

    const { data: minha } = await db
      .from("crm_whatsapp_instancias")
      .select("instancia, status")
      .eq("mentor_id", mentorId)
      .eq("papel", "cs")
      .maybeSingle<{ instancia: string; status: string }>()

    if (!minha) {
      return jsonResponse(
        { error: "conecte seu WhatsApp em CRM › WhatsApp antes de responder", codigo: "sem_instancia" },
        409,
      )
    }
    if (minha.status !== "conectada") {
      return jsonResponse(
        { error: `seu WhatsApp está ${minha.status} — reconecte em CRM › WhatsApp`, codigo: "desconectada" },
        409,
      )
    }

    const { data: mentor } = await db
      .from("mentores")
      .select("nome")
      .eq("id", mentorId)
      .maybeSingle<{ nome: string | null }>()

    const localId = `local:${crypto.randomUUID()}`
    const { data: linha, error: errIns } = await db
      .from("crm_mensagens")
      .insert({
        conversa_id: conversa.id,
        externo_id: localId,
        autor: mentor?.nome ?? "Time PMC",
        da_cs: true,
        texto,
        em: new Date().toISOString(),
        status_envio: "pendente",
        instancia: minha.instancia,
        enviada_por_mentor_id: mentorId,
      })
      .select("id")
      .single<{ id: string }>()
    if (errIns) throw errIns

    const envioReal = Deno.env.get("WHATSAPP_ENVIO_REAL") === "true"
    if (!envioReal || !evolutionConfigurada()) {
      return jsonResponse({
        ok: true,
        seco: true,
        mensagem_id: linha.id,
        previa: { para: conversa.grupo_nome, texto },
      })
    }

    try {
      const resp = await evoFetch<{ key?: { id?: string } }>(
        `/message/sendText/${encodeURIComponent(minha.instancia)}`,
        { method: "POST", body: JSON.stringify({ number: conversa.grupo_id, text: texto }) },
      )
      const externoId = resp?.key?.id
      const { error: errUp } = await db
        .from("crm_mensagens")
        .update({ externo_id: externoId ?? localId, status_envio: "enviada" })
        .eq("id", linha.id)

      if (errUp) {
        // Colisão na unique = o eco do webhook já gravou esta mensagem.
        await db.from("crm_mensagens").delete().eq("id", linha.id)
        return jsonResponse({ ok: true, mensagem_id: null, deduplicada: true })
      }

      await db
        .from("crm_conversas")
        .update({ instancia_envio: minha.instancia })
        .eq("id", conversa.id)

      return jsonResponse({ ok: true, mensagem_id: linha.id, externo_id: externoId ?? null })
    } catch (e) {
      await db
        .from("crm_mensagens")
        .update({ status_envio: "falhou" })
        .eq("id", linha.id)
      throw e
    }
  } catch (e) {
    console.error("[crm-whatsapp-enviar]", e)
    return jsonResponse({ error: String((e as Error)?.message ?? e) }, 500)
  }
})
