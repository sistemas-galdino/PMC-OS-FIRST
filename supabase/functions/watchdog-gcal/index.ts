import "jsr:@supabase/functions-js/edge-runtime.d.ts"
import { createClient, type SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2"
import { corsHeaders, jsonResponse } from "../_shared/cors.ts"
import {
  criarWatchChannel,
  pararWatchChannel,
  listarEventosIncremental,
} from "../_shared/google-calendar.ts"
import { getAccessTokenAs, SCOPES } from "../_shared/google-auth-sa.ts"

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
  expiration: string
  last_notification_at: string | null
  last_renewed_at: string
}

interface AcaoRelatorio {
  calendario: string
  renovado: boolean
  bootstrap_sync_token: boolean
  fallback_executado: boolean
  fallback_cancelados: number
  erros: string[]
}

const FALLBACK_THRESHOLD_MS = 2 * 60 * 60 * 1000 // 2 h
const RENEW_THRESHOLD_MS = 24 * 60 * 60 * 1000 // 24 h

function emailWebhookSupabaseUrl(): string {
  const url = Deno.env.get("WEBHOOK_GCAL_URL")
  if (url) return url
  // Default: deriva da SUPABASE_URL
  const base = Deno.env.get("SUPABASE_URL")!
  return `${base}/functions/v1/webhook-gcal`
}

async function processarCalendario(
  supabase: SupabaseClient,
  emailCalendar: string,
  webhookToken: string,
): Promise<AcaoRelatorio> {
  const relatorio: AcaoRelatorio = {
    calendario: emailCalendar,
    renovado: false,
    bootstrap_sync_token: false,
    fallback_executado: false,
    fallback_cancelados: 0,
    erros: [],
  }

  let { data: channel } = await supabase
    .from("calendar_watch_channels")
    .select("*")
    .eq("calendar_email", emailCalendar)
    .maybeSingle<ChannelRow>()

  const agora = Date.now()
  const expiracaoMs = channel ? new Date(channel.expiration).getTime() : 0
  const precisaRenovar = !channel || (expiracaoMs - agora) < RENEW_THRESHOLD_MS

  if (precisaRenovar) {
    if (channel) {
      // Tenta parar o canal antigo (best-effort)
      try {
        await pararWatchChannel({
          emailCalendar,
          channelId: channel.channel_id,
          resourceId: channel.resource_id,
        })
      } catch (e) {
        relatorio.erros.push(`pararWatchChannel: ${e instanceof Error ? e.message : String(e)}`)
      }
    }

    try {
      const novo = await criarWatchChannel({
        emailCalendar,
        channelId: crypto.randomUUID(),
        address: emailWebhookSupabaseUrl(),
        token: webhookToken,
      })
      const expiracao = new Date(Number(novo.expiration)).toISOString()

      await supabase.from("calendar_watch_channels").upsert({
        calendar_email: emailCalendar,
        channel_id: novo.id,
        resource_id: novo.resourceId,
        sync_token: null, // bootstrap em seguida
        expiration: expiracao,
        last_renewed_at: new Date().toISOString(),
        last_notification_at: null,
      }, { onConflict: "calendar_email" })

      relatorio.renovado = true

      // Recarrega
      const { data } = await supabase
        .from("calendar_watch_channels")
        .select("*")
        .eq("calendar_email", emailCalendar)
        .maybeSingle<ChannelRow>()
      channel = data
    } catch (e) {
      relatorio.erros.push(`criarWatchChannel: ${e instanceof Error ? e.message : String(e)}`)
      return relatorio
    }
  }

  if (!channel) return relatorio

  // Bootstrap do sync_token se necessário
  if (!channel.sync_token) {
    try {
      const lista = await listarEventosIncremental(emailCalendar, null)
      if (lista.nextSyncToken) {
        await supabase
          .from("calendar_watch_channels")
          .update({ sync_token: lista.nextSyncToken })
          .eq("calendar_email", emailCalendar)
        channel.sync_token = lista.nextSyncToken
        relatorio.bootstrap_sync_token = true
      }
    } catch (e) {
      relatorio.erros.push(`bootstrap syncToken: ${e instanceof Error ? e.message : String(e)}`)
    }
  }

  // Fallback: webhook silencioso há mais de 2h E não acabou de ser renovado
  const renovouAgora = relatorio.renovado
  const ultimaNotificacaoMs = channel.last_notification_at
    ? new Date(channel.last_notification_at).getTime()
    : 0
  const silencioMs = agora - ultimaNotificacaoMs
  const webhookSilencioso = !channel.last_notification_at || silencioMs > FALLBACK_THRESHOLD_MS

  if (webhookSilencioso && !renovouAgora) {
    try {
      const cancelados = await rodarFallback(supabase, emailCalendar)
      relatorio.fallback_executado = true
      relatorio.fallback_cancelados = cancelados
    } catch (e) {
      relatorio.erros.push(`fallback: ${e instanceof Error ? e.message : String(e)}`)
    }
  }

  return relatorio
}

async function buscarStatusEvento(
  emailCalendar: string,
  eventId: string,
): Promise<"cancelled" | "vivo" | "sumiu"> {
  const token = await getAccessTokenAs(emailCalendar, [SCOPES.CALENDAR_EVENTS])
  const url = `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(emailCalendar)}/events/${encodeURIComponent(eventId)}`
  const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } })
  if (res.status === 404 || res.status === 410) return "sumiu"
  if (!res.ok) {
    const txt = await res.text()
    throw new Error(`Calendar buscarEvento (${res.status}): ${txt}`)
  }
  const evento = await res.json() as { status?: string }
  return evento.status === "cancelled" ? "cancelled" : "vivo"
}

async function rodarFallback(supabase: SupabaseClient, emailCalendar: string): Promise<number> {
  const hoje = new Date().toISOString().slice(0, 10)
  const EMAIL_ORG_BLACKCRM = Deno.env.get("CALENDAR_ORGANIZER_BLACKCRM") ?? "especialistablackcrm@rafaelgaldino.com.br"

  const origensDoCalendario: Origem[] = emailCalendar === EMAIL_ORG_BLACKCRM
    ? ["blackcrm"]
    : ["galdino", "mentoria"]

  const { data: linhas } = await supabase
    .from("agendamentos_central")
    .select("origem, id_unico, id_reuniao")
    .in("status_agendamento", ["confirmado", "pendente_sync"])
    .gte("data_reuniao", hoje)
    .in("origem", origensDoCalendario)
    .not("id_reuniao", "is", null)

  let cancelados = 0
  for (const linha of ((linhas ?? []) as Array<{ origem: Origem; id_unico: string; id_reuniao: string }>)) {
    const tabela = TABELA_ORIGEM[linha.origem]
    try {
      const status = await buscarStatusEvento(emailCalendar, linha.id_reuniao)
      if (status === "vivo") continue
      const { error: updErr } = await supabase
        .from(tabela)
        .update({ status_agendamento: "cancelado" })
        .eq("id_unico", linha.id_unico)
      if (!updErr) cancelados++
    } catch (e) {
      console.error(`[watchdog-gcal] fallback erro ${linha.id_unico}:`, e instanceof Error ? e.message : String(e))
    }
  }
  return cancelados
}

function autorizado(req: Request): boolean {
  const cronToken = Deno.env.get("CRON_INVOKE_TOKEN")
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")
  const auth = req.headers.get("Authorization") ?? ""
  const debugToken = req.headers.get("X-Debug-Token") ?? ""
  if (cronToken && auth === `Bearer ${cronToken}`) return true
  if (serviceKey && (auth === `Bearer ${serviceKey}` || debugToken === serviceKey)) return true
  return false
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders })
  }

  if (!autorizado(req)) {
    return jsonResponse({ error: "Não autorizado" }, 401)
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    const webhookToken = Deno.env.get("GCAL_WEBHOOK_TOKEN")
    if (!webhookToken) {
      return jsonResponse({ error: "GCAL_WEBHOOK_TOKEN não configurado" }, 500)
    }
    const supabase = createClient(supabaseUrl, serviceKey, { auth: { persistSession: false } })

    const EMAIL_ORG_BLACKCRM = Deno.env.get("CALENDAR_ORGANIZER_BLACKCRM") ?? "especialistablackcrm@rafaelgaldino.com.br"
    const EMAIL_ORG_CONSULTOR = Deno.env.get("CALENDAR_ORGANIZER_CONSULTOR") ?? "consultor@rafaelgaldino.com.br"

    const relatorios: AcaoRelatorio[] = []
    for (const email of [EMAIL_ORG_CONSULTOR, EMAIL_ORG_BLACKCRM]) {
      relatorios.push(await processarCalendario(supabase, email, webhookToken))
    }

    return jsonResponse({
      ok: true,
      executado_em: new Date().toISOString(),
      webhook_url: emailWebhookSupabaseUrl(),
      relatorios,
    })
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e)
    return jsonResponse({ error: msg }, 500)
  }
})
