// convidar-encontro-ao-vivo — adiciona convidados a um encontro ao vivo já existente.
//
// Encontros ao vivo são criados SEM attendees (evento de calendário compartilhado).
// Esta function serve pra colocar o evento na agenda de alguém específico —
// inclusive e-mails fora do Workspace (Gmail pessoal), que é o único caminho
// possível: a Service Account só impersona (DWD) contas @rafaelgaldino.com.br,
// então não dá pra escrever direto na agenda de um externo.
//
// Marca cada convidado como responseStatus:"accepted" (mesmo padrão de
// criar-agendamento) pra tentar já entrar confirmado. O Google pode manter
// "needsAction" dependendo das configurações do convidado — por isso a resposta
// devolve o status real que o Google gravou.
//
// Preserva convidados já existentes (faz merge, dedupe por e-mail).
import "jsr:@supabase/functions-js/edge-runtime.d.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"
import { corsHeaders, jsonResponse } from "../_shared/cors.ts"
import { atualizarEventoEm, buscarEventoEm } from "../_shared/google-calendar.ts"
import {
  AO_VIVO_CALENDAR_ID,
  AO_VIVO_SUBJECT,
  isAdminUser,
} from "../_shared/encontros-ao-vivo.ts"

interface Body {
  id_unico: string
  emails: string[]
}

interface Attendee {
  email: string
  displayName?: string
  responseStatus?: string
  organizer?: boolean
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

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
    if (!jwt) {
      return jsonResponse({ error: "Token ausente" }, 401)
    }

    const supabase = createClient(supabaseUrl, serviceKey, {
      auth: { persistSession: false },
    })

    const admin = await isAdminUser(supabase, supabaseUrl, anonKey, jwt)
    if (!admin) {
      return jsonResponse({ error: "Apenas administradores podem convidar para encontros" }, 403)
    }

    const body = (await req.json()) as Body
    const id_unico = body.id_unico?.trim()
    if (!id_unico) {
      return jsonResponse({ error: "id_unico obrigatório" }, 400)
    }

    const novos = (Array.isArray(body.emails) ? body.emails : [])
      .map((e) => String(e ?? "").trim().toLowerCase())
      .filter((e) => e.length > 0)
    if (novos.length === 0) {
      return jsonResponse({ error: "emails obrigatório (lista não vazia)" }, 400)
    }
    const invalidos = novos.filter((e) => !EMAIL_RE.test(e))
    if (invalidos.length > 0) {
      return jsonResponse({ error: `e-mail inválido: ${invalidos.join(", ")}` }, 400)
    }

    const { data: row, error: selErr } = await supabase
      .from("encontros_ao_vivo")
      .select("id_unico, id_evento_google, titulo_formatado, data_encontro, horario_inicio")
      .eq("id_unico", id_unico)
      .maybeSingle<{
        id_unico: string
        id_evento_google: string | null
        titulo_formatado: string | null
        data_encontro: string | null
        horario_inicio: string | null
      }>()
    if (selErr) {
      return jsonResponse({ error: "Erro ao consultar encontro: " + selErr.message }, 500)
    }
    if (!row) {
      return jsonResponse({ error: "Encontro não encontrado" }, 404)
    }
    if (!row.id_evento_google) {
      return jsonResponse({ error: "Encontro não tem evento no Google Calendar" }, 400)
    }

    // Lê os convidados atuais pra não sobrescrever quem já está no evento.
    const evento = await buscarEventoEm({
      subject: AO_VIVO_SUBJECT,
      calendarId: AO_VIVO_CALENDAR_ID,
      eventId: row.id_evento_google,
    }) as { attendees?: Attendee[] }

    const atuais: Attendee[] = Array.isArray(evento.attendees) ? evento.attendees : []
    const jaTem = new Set(atuais.map((a) => (a.email ?? "").toLowerCase()))
    const adicionados = novos.filter((e) => !jaTem.has(e))

    if (adicionados.length === 0) {
      return jsonResponse({
        ok: true,
        id_unico,
        message: "Todos os e-mails já eram convidados do evento.",
        adicionados: [],
        attendees: atuais.map((a) => ({ email: a.email, responseStatus: a.responseStatus })),
      })
    }

    const attendees: Attendee[] = [
      ...atuais,
      ...adicionados.map((email) => ({ email, responseStatus: "accepted" })),
    ]

    const atualizado = await atualizarEventoEm({
      subject: AO_VIVO_SUBJECT,
      calendarId: AO_VIVO_CALENDAR_ID,
      eventId: row.id_evento_google,
      payload: { attendees },
    }) as unknown as { attendees?: Attendee[] }

    // Devolve o que o Google realmente gravou (fonte da verdade do responseStatus).
    const finais = Array.isArray(atualizado.attendees) ? atualizado.attendees : []
    return jsonResponse({
      ok: true,
      id_unico,
      evento: {
        titulo: row.titulo_formatado,
        data: row.data_encontro,
        hora: row.horario_inicio,
        id_evento_google: row.id_evento_google,
      },
      adicionados,
      attendees: finais.map((a) => ({ email: a.email, responseStatus: a.responseStatus })),
    })
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e)
    return jsonResponse({ error: msg }, 500)
  }
})
