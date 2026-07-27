// diagnosticar-eventos-dia — SOMENTE LEITURA. Lista os eventos de um dia em
// todas as agendas alcançáveis por DWD (as caixas do Workspace + o calendário
// secundário AO VIVO), com os campos que explicam comportamento de convidados:
// organizer, attendees + responseStatus, e guestsCanSeeOtherGuests.
//
// Serve pra responder perguntas do tipo "por que não vejo os convidados desse
// evento?" — normalmente é evento duplicado em outra agenda, ou lista de
// convidados oculta pelo organizador.
//
// Não escreve nada: só GET na Calendar API.
import "jsr:@supabase/functions-js/edge-runtime.d.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"
import { corsHeaders, jsonResponse } from "../_shared/cors.ts"
import { buscarEventoEm, listarEventosPeriodoEm } from "../_shared/google-calendar.ts"
import {
  AO_VIVO_CALENDAR_ID,
  AO_VIVO_SUBJECT,
  TZ_OFFSET,
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
  data?: string
  filtro?: string
  // Modo alternativo: inspecionar um evento específico (busca em todas as agendas).
  event_id?: string
}

interface Attendee {
  email?: string
  responseStatus?: string
  organizer?: boolean
  self?: boolean
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
      return jsonResponse({ error: "Apenas administradores" }, 403)
    }

    const body = (await req.json()) as Body

    const alvos: Array<{ nome: string; subject: string; calendarId: string }> = [
      { nome: "AO VIVO (secundário)", subject: AO_VIVO_SUBJECT, calendarId: AO_VIVO_CALENDAR_ID },
      ...CAIXAS_WORKSPACE.map((c) => ({ nome: c, subject: c, calendarId: c })),
    ]

    // Modo "inspecionar um evento": procura o id em cada agenda e devolve cru.
    const eventId = body.event_id?.trim()
    if (eventId) {
      const achados: Array<Record<string, unknown>> = []
      for (const alvo of alvos) {
        try {
          const ev = await buscarEventoEm({
            subject: alvo.subject,
            calendarId: alvo.calendarId,
            eventId,
          }) as Record<string, unknown>
          const start = ev.start as { dateTime?: string; date?: string } | undefined
          achados.push({
            calendario: alvo.nome,
            id: ev.id,
            summary: ev.summary ?? null,
            inicio: start?.dateTime ?? start?.date ?? null,
            status: ev.status ?? null,
            organizer: (ev.organizer as { email?: string } | undefined)?.email ?? null,
            hangoutLink: ev.hangoutLink ?? null,
            attendees: (Array.isArray(ev.attendees) ? ev.attendees : []) as Attendee[],
          })
        } catch {
          // não existe nessa agenda — segue
        }
      }
      return jsonResponse({ ok: true, event_id: eventId, achados })
    }

    const data = body.data?.trim()
    if (!data || !/^\d{4}-\d{2}-\d{2}$/.test(data)) {
      return jsonResponse({ error: "data (YYYY-MM-DD) ou event_id obrigatório" }, 400)
    }
    const filtro = body.filtro?.trim().toLowerCase() || null

    const timeMin = `${data}T00:00:00${TZ_OFFSET}`
    const timeMax = `${data}T23:59:59${TZ_OFFSET}`

    const resultados: Array<Record<string, unknown>> = []
    const erros: Array<{ calendario: string; erro: string }> = []

    for (const alvo of alvos) {
      try {
        const eventos = await listarEventosPeriodoEm({
          subject: alvo.subject,
          calendarId: alvo.calendarId,
          timeMin,
          timeMax,
        })
        for (const ev of eventos) {
          const summary = String(ev.summary ?? "")
          if (filtro && !summary.toLowerCase().includes(filtro)) continue
          const attendees = (Array.isArray(ev.attendees) ? ev.attendees : []) as Attendee[]
          const organizer = ev.organizer as { email?: string; displayName?: string } | undefined
          const creator = ev.creator as { email?: string } | undefined
          const start = ev.start as { dateTime?: string; date?: string } | undefined
          const end = ev.end as { dateTime?: string; date?: string } | undefined
          resultados.push({
            calendario: alvo.nome,
            calendar_id: alvo.calendarId,
            id: ev.id,
            summary,
            inicio: start?.dateTime ?? start?.date ?? null,
            fim: end?.dateTime ?? end?.date ?? null,
            description: ev.description ?? null,
            hangoutLink: ev.hangoutLink ?? null,
            organizer: organizer?.email ?? null,
            creator: creator?.email ?? null,
            status: ev.status ?? null,
            recurringEventId: ev.recurringEventId ?? null,
            guestsCanSeeOtherGuests: ev.guestsCanSeeOtherGuests ?? null,
            qtd_convidados: attendees.length,
            attendees: attendees.map((a) => ({
              email: a.email,
              responseStatus: a.responseStatus,
              organizer: a.organizer ?? false,
            })),
          })
        }
      } catch (e) {
        erros.push({ calendario: alvo.nome, erro: e instanceof Error ? e.message : String(e) })
      }
    }

    return jsonResponse({
      ok: true,
      data,
      filtro,
      total: resultados.length,
      eventos: resultados,
      erros,
    })
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e)
    return jsonResponse({ error: msg }, 500)
  }
})
