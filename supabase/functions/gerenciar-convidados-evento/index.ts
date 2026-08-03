// gerenciar-convidados-evento — adiciona/remove convidados de um evento do
// Google Calendar, em qualquer agenda alcançável por DWD.
//
// Dois modos de endereçar o evento:
//   { id_unico }              -> encontro ao vivo (resolve o evento pela tabela
//                               encontros_ao_vivo, no calendário AO VIVO);
//   { calendario, event_id }  -> evento avulso numa caixa do Workspace.
//
// Convidados adicionados entram como responseStatus:"accepted" (mesmo padrão de
// criar-agendamento) pra já cair confirmado na agenda de quem foi convidado —
// único caminho possível pra e-mails fora do Workspace, já que a DWD só
// impersona contas do domínio. O Google pode rebaixar pra "needsAction"
// conforme as configurações do convidado; por isso a resposta devolve o
// responseStatus real gravado.
//
// Preserva os demais convidados (merge/filtro sobre a lista atual).
import "jsr:@supabase/functions-js/edge-runtime.d.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"
import { corsHeaders, jsonResponse } from "../_shared/cors.ts"
import { atualizarEventoEm, buscarEventoEm } from "../_shared/google-calendar.ts"
import {
  AO_VIVO_CALENDAR_ID,
  AO_VIVO_SUBJECT,
  isAdminUser,
} from "../_shared/encontros-ao-vivo.ts"

// Caixas do Workspace com DWD configurada (mesma whitelist de criar-agendamento).
const CAIXAS_WORKSPACE = [
  "dono@rafaelgaldino.com.br",
  "consultor@rafaelgaldino.com.br",
  "consultores@rafaelgaldino.com.br",
  "especialistablackcrm@rafaelgaldino.com.br",
  "mentor@rafaelgaldino.com.br",
]

interface Body {
  id_unico?: string
  calendario?: string
  event_id?: string
  adicionar?: string[]
  remover?: string[]
}

interface Attendee {
  email?: string
  displayName?: string
  responseStatus?: string
  organizer?: boolean
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

function normalizarEmails(lista: unknown): string[] {
  return (Array.isArray(lista) ? lista : [])
    .map((e) => String(e ?? "").trim().toLowerCase())
    .filter((e) => e.length > 0)
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders })
  }
  if (req.method !== "POST") {
    return jsonResponse({ error: "Método não permitido" }, 405)
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!

    const auth = req.headers.get("Authorization") ?? ""
    const jwt = auth.startsWith("Bearer ") ? auth.slice(7) : ""
    if (!jwt) return jsonResponse({ error: "Token ausente" }, 401)

    const supabase = createClient(supabaseUrl, serviceKey, {
      auth: { persistSession: false },
    })
    const admin = await isAdminUser(supabase, supabaseUrl, anonKey, jwt)
    if (!admin) {
      return jsonResponse({ error: "Apenas administradores podem gerenciar convidados" }, 403)
    }

    const body = (await req.json()) as Body
    const adicionar = normalizarEmails(body.adicionar)
    const remover = normalizarEmails(body.remover)
    // adicionar/remover vazios = modo "listar": só resolve o evento e devolve
    // os convidados atuais (cai no branch "Nada a alterar" mais abaixo), sem
    // chamar o Google Calendar pra escrever nada.
    const invalidos = [...adicionar, ...remover].filter((e) => !EMAIL_RE.test(e))
    if (invalidos.length > 0) {
      return jsonResponse({ error: `e-mail inválido: ${invalidos.join(", ")}` }, 400)
    }

    // Resolve subject/calendarId/eventId.
    let subject: string
    let calendarId: string
    let eventId: string
    let contexto: Record<string, unknown> = {}

    if (body.id_unico?.trim()) {
      const { data: row, error: selErr } = await supabase
        .from("encontros_ao_vivo")
        .select("id_unico, id_evento_google, titulo_formatado, data_encontro, horario_inicio")
        .eq("id_unico", body.id_unico.trim())
        .maybeSingle<{
          id_unico: string
          id_evento_google: string | null
          titulo_formatado: string | null
          data_encontro: string | null
          horario_inicio: string | null
        }>()
      if (selErr) return jsonResponse({ error: "Erro ao consultar encontro: " + selErr.message }, 500)
      if (!row) return jsonResponse({ error: "Encontro não encontrado" }, 404)
      if (!row.id_evento_google) {
        return jsonResponse({ error: "Encontro não tem evento no Google Calendar" }, 400)
      }
      subject = AO_VIVO_SUBJECT
      calendarId = AO_VIVO_CALENDAR_ID
      eventId = row.id_evento_google
      contexto = {
        id_unico: row.id_unico,
        titulo: row.titulo_formatado,
        data: row.data_encontro,
        hora: row.horario_inicio,
      }
    } else {
      const cal = body.calendario?.trim().toLowerCase()
      eventId = body.event_id?.trim() ?? ""
      if (!cal || !eventId) {
        return jsonResponse({ error: "informe id_unico OU (calendario + event_id)" }, 400)
      }
      if (cal === AO_VIVO_CALENDAR_ID) {
        subject = AO_VIVO_SUBJECT
        calendarId = AO_VIVO_CALENDAR_ID
      } else if (CAIXAS_WORKSPACE.includes(cal)) {
        subject = cal
        calendarId = cal
      } else {
        return jsonResponse({ error: `calendário não permitido: ${cal}` }, 400)
      }
    }

    // Estado atual (não sobrescreve quem já está no evento).
    const evento = await buscarEventoEm({ subject, calendarId, eventId }) as {
      summary?: string
      status?: string
      start?: { dateTime?: string; date?: string }
      attendees?: Attendee[]
    }
    const atuais: Attendee[] = Array.isArray(evento.attendees) ? evento.attendees : []
    const jaTem = new Set(atuais.map((a) => (a.email ?? "").toLowerCase()))

    const novos = adicionar.filter((e) => !jaTem.has(e))
    const removerSet = new Set(remover)
    const adicionarSet = new Set(adicionar)
    const mantidos = atuais.filter((a) => !removerSet.has((a.email ?? "").toLowerCase()))
    const removidos = atuais
      .map((a) => (a.email ?? "").toLowerCase())
      .filter((e) => removerSet.has(e))

    // Quem já estava convidado mas ainda não confirmou: força "accepted" pra
    // cair confirmado na agenda sem depender de resposta. (O Google pode
    // recusar e manter "needsAction" — a resposta devolve o status real.)
    const confirmados = mantidos
      .filter((a) => adicionarSet.has((a.email ?? "").toLowerCase()) && a.responseStatus !== "accepted")
      .map((a) => (a.email ?? "").toLowerCase())
    for (const a of mantidos) {
      if (adicionarSet.has((a.email ?? "").toLowerCase())) a.responseStatus = "accepted"
    }

    if (novos.length === 0 && removidos.length === 0 && confirmados.length === 0) {
      return jsonResponse({
        ok: true,
        evento: { id: eventId, calendario: calendarId, summary: evento.summary, status: evento.status, ...contexto },
        message: "Nada a alterar (convidados já estavam no estado pedido).",
        adicionados: [],
        removidos: [],
        attendees: atuais.map((a) => ({ email: a.email, responseStatus: a.responseStatus })),
      })
    }

    const attendees: Attendee[] = [
      ...mantidos,
      ...novos.map((email) => ({ email, responseStatus: "accepted" })),
    ]

    const atualizado = await atualizarEventoEm({
      subject,
      calendarId,
      eventId,
      payload: { attendees },
    }) as unknown as { attendees?: Attendee[]; summary?: string; status?: string }

    const finais = Array.isArray(atualizado.attendees) ? atualizado.attendees : []
    return jsonResponse({
      ok: true,
      evento: {
        id: eventId,
        calendario: calendarId,
        summary: atualizado.summary ?? evento.summary,
        status: atualizado.status ?? evento.status,
        inicio: evento.start?.dateTime ?? evento.start?.date ?? null,
        ...contexto,
      },
      adicionados: novos,
      confirmados,
      removidos,
      attendees: finais.map((a) => ({ email: a.email, responseStatus: a.responseStatus })),
    })
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e)
    return jsonResponse({ error: msg }, 500)
  }
})
