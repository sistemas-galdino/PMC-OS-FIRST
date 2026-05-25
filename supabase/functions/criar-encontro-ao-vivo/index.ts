import "jsr:@supabase/functions-js/edge-runtime.d.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"
import { corsHeaders, jsonResponse } from "../_shared/cors.ts"
import { criarEventoEm, type NovoEvento } from "../_shared/google-calendar.ts"
import {
  AO_VIVO_CALENDAR_ID,
  AO_VIVO_SUBJECT,
  TZ,
  calcularDuracaoMinutos,
  camposDerivados,
  dataHoraISO,
  formatDataEncontro,
  isAdminUser,
  nowIsoText,
} from "../_shared/encontros-ao-vivo.ts"

interface Body {
  tipo_encontro: string
  titulo: string
  descricao?: string | null
  data: string
  hora_inicio: string
  hora_fim: string
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
    if (!jwt) {
      return jsonResponse({ error: "Token ausente" }, 401)
    }

    const supabase = createClient(supabaseUrl, serviceKey, {
      auth: { persistSession: false },
    })

    const admin = await isAdminUser(supabase, supabaseUrl, anonKey, jwt)
    if (!admin) {
      return jsonResponse({ error: "Apenas administradores podem cadastrar encontros" }, 403)
    }

    const body = (await req.json()) as Body
    const { tipo_encontro, titulo, descricao, data, hora_inicio, hora_fim } = body

    if (!tipo_encontro?.trim() || !titulo?.trim() || !data || !hora_inicio || !hora_fim) {
      return jsonResponse({ error: "tipo_encontro, titulo, data, hora_inicio e hora_fim são obrigatórios" }, 400)
    }
    if (!/^\d{4}-\d{2}-\d{2}$/.test(data)) {
      return jsonResponse({ error: "Data inválida (use YYYY-MM-DD)" }, 400)
    }
    if (!/^\d{2}:\d{2}$/.test(hora_inicio) || !/^\d{2}:\d{2}$/.test(hora_fim)) {
      return jsonResponse({ error: "Horários inválidos (use HH:MM)" }, 400)
    }
    if (hora_fim <= hora_inicio) {
      return jsonResponse({ error: "hora_fim precisa ser maior que hora_inicio" }, 400)
    }

    const duracao = calcularDuracaoMinutos(hora_inicio, hora_fim)
    const startISO = dataHoraISO(data, hora_inicio)
    const endISO = dataHoraISO(data, hora_fim)

    const payload: NovoEvento = {
      summary: titulo.trim(),
      description: descricao?.trim() || undefined,
      start: { dateTime: startISO, timeZone: TZ },
      end: { dateTime: endISO, timeZone: TZ },
      conferenceData: {
        createRequest: {
          requestId: crypto.randomUUID(),
          conferenceSolutionKey: { type: "hangoutsMeet" },
        },
      },
    }

    const evento = await criarEventoEm({
      subject: AO_VIVO_SUBJECT,
      calendarId: AO_VIVO_CALENDAR_ID,
      payload,
    })

    const linkMeet =
      evento.hangoutLink ??
      evento.conferenceData?.entryPoints?.find(p => p.entryPointType === "video")?.uri ??
      null

    const { mes, ano } = camposDerivados(data)
    const id_unico = crypto.randomUUID()
    const agora = nowIsoText()

    const row = {
      id_unico,
      id_evento_google: evento.id,
      tipo_encontro: tipo_encontro.trim(),
      titulo_original: titulo.trim(),
      titulo_formatado: titulo.trim(),
      descricao: descricao?.trim() || null,
      data_encontro: formatDataEncontro(data),
      horario_inicio: hora_inicio,
      horario_fim: hora_fim,
      duracao_minutos: duracao,
      mes,
      ano,
      timezone: TZ,
      data_hora_inicio_iso: startISO,
      data_hora_fim_iso: endISO,
      link_google_meet: linkMeet,
      status: "agendado",
      created_at: agora,
      updated_at: agora,
    }

    const { error: insErr } = await supabase.from("encontros_ao_vivo").insert(row)
    if (insErr) {
      // Best-effort: já criou no GCal. Não rollback porque o admin
      // pode reaplicar; só sinaliza o erro.
      return jsonResponse({
        error: "Evento criado no Google Calendar, mas falhou ao salvar no banco: " + insErr.message,
        evento_id: evento.id,
        link_google_meet: linkMeet,
      }, 500)
    }

    return jsonResponse({ ok: true, id_unico, evento_id: evento.id, link_google_meet: linkMeet })
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e)
    return jsonResponse({ error: msg }, 500)
  }
})
