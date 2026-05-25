import "jsr:@supabase/functions-js/edge-runtime.d.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"
import { corsHeaders, jsonResponse } from "../_shared/cors.ts"
import { listarEventosIncremental } from "../_shared/google-calendar.ts"

type Origem = "galdino" | "mentoria" | "blackcrm"
type TabelaDestino = "reunioes_galdino" | "reunioes_mentoria_new" | "reunioes_blackcrm"

const TABELA_ORIGEM: Record<Origem, TabelaDestino> = {
  galdino: "reunioes_galdino",
  mentoria: "reunioes_mentoria_new",
  blackcrm: "reunioes_blackcrm",
}

interface ChannelRow {
  calendar_email: string
  channel_id: string
  resource_id: string
  sync_token: string | null
}

// O webhook sempre responde 200 (mesmo em erro interno) pra Google não retentar.
function ok(): Response {
  return new Response("ok", { status: 200, headers: corsHeaders })
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders })
  }
  if (req.method !== "POST") {
    return jsonResponse({ error: "Método não permitido" }, 405)
  }

  const token = req.headers.get("x-goog-channel-token") ?? ""
  const expected = Deno.env.get("GCAL_WEBHOOK_TOKEN") ?? ""
  if (!expected || token !== expected) {
    return jsonResponse({ error: "Token inválido" }, 401)
  }

  const state = req.headers.get("x-goog-resource-state") ?? ""
  const channelId = req.headers.get("x-goog-channel-id") ?? ""

  if (state === "sync") {
    return ok()
  }

  if (state !== "exists" || !channelId) {
    // notificações irrelevantes (ex: 'not_exists', sem channelId) — só ack
    return ok()
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    const supabase = createClient(supabaseUrl, serviceKey, { auth: { persistSession: false } })

    const { data: channel } = await supabase
      .from("calendar_watch_channels")
      .select("calendar_email, channel_id, resource_id, sync_token")
      .eq("channel_id", channelId)
      .maybeSingle<ChannelRow>()

    if (!channel) {
      // canal desconhecido (provavelmente órfão de uma rotação anterior). Apenas ack.
      console.warn(`[webhook-gcal] channel_id desconhecido: ${channelId}`)
      return ok()
    }

    // Atualiza heartbeat antes mesmo de processar — Google considera ack pelo 200.
    await supabase
      .from("calendar_watch_channels")
      .update({ last_notification_at: new Date().toISOString() })
      .eq("calendar_email", channel.calendar_email)

    const incremental = await listarEventosIncremental(channel.calendar_email, channel.sync_token)

    if (incremental.expirado) {
      // syncToken vencido. Zera pra watchdog re-bootstrappar.
      await supabase
        .from("calendar_watch_channels")
        .update({ sync_token: null })
        .eq("calendar_email", channel.calendar_email)
      console.warn(`[webhook-gcal] sync_token expirado pra ${channel.calendar_email} — watchdog vai re-bootstrappar`)
      return ok()
    }

    const cancelados = incremental.items.filter(e => e.status === "cancelled")

    if (cancelados.length > 0) {
      // Busca quais id_reuniao temos no banco entre os cancelados
      const ids = cancelados.map(e => e.id)
      const { data: agendamentos } = await supabase
        .from("agendamentos_central")
        .select("origem, id_unico, id_reuniao, status_agendamento")
        .in("id_reuniao", ids)

      for (const ag of (agendamentos ?? []) as Array<{
        origem: Origem
        id_unico: string
        id_reuniao: string
        status_agendamento: string | null
      }>) {
        if (ag.status_agendamento === "cancelado") continue
        const tabela = TABELA_ORIGEM[ag.origem]
        if (!tabela) continue
        const { error: updErr } = await supabase
          .from(tabela)
          .update({ status_agendamento: "cancelado" })
          .eq("id_unico", ag.id_unico)
        if (updErr) {
          console.error(`[webhook-gcal] erro ao cancelar ${ag.id_unico}:`, updErr.message)
        }
      }
    }

    if (incremental.nextSyncToken) {
      await supabase
        .from("calendar_watch_channels")
        .update({ sync_token: incremental.nextSyncToken })
        .eq("calendar_email", channel.calendar_email)
    }

    return ok()
  } catch (e) {
    // Mesmo em erro, retorna 200 pra Google não retentar.
    const msg = e instanceof Error ? e.message : String(e)
    console.error("[webhook-gcal] erro interno:", msg)
    return ok()
  }
})
