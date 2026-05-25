import "jsr:@supabase/functions-js/edge-runtime.d.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"
import { corsHeaders, jsonResponse } from "../_shared/cors.ts"
import { atualizarEventoEm, type NovoEvento } from "../_shared/google-calendar.ts"
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
  id_unico: string
  tipo_encontro?: string
  titulo?: string
  descricao?: string | null
  data?: string
  hora_inicio?: string
  hora_fim?: string
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
      return jsonResponse({ error: "Apenas administradores podem atualizar encontros" }, 403)
    }

    const body = (await req.json()) as Body
    const { id_unico } = body
    if (!id_unico) {
      return jsonResponse({ error: "id_unico obrigatório" }, 400)
    }

    const { data: row, error: selErr } = await supabase
      .from("encontros_ao_vivo")
      .select("id_unico, id_evento_google, data_encontro, horario_inicio, horario_fim, titulo_formatado, descricao, tipo_encontro")
      .eq("id_unico", id_unico)
      .maybeSingle<{
        id_unico: string
        id_evento_google: string | null
        data_encontro: string | null
        horario_inicio: string | null
        horario_fim: string | null
        titulo_formatado: string | null
        descricao: string | null
        tipo_encontro: string | null
      }>()
    if (selErr) {
      return jsonResponse({ error: "Erro ao consultar encontro: " + selErr.message }, 500)
    }
    if (!row) {
      return jsonResponse({ error: "Encontro não encontrado" }, 404)
    }

    // Reconstrói os campos novos (com defaults vindos do row atual).
    const novoTipo = body.tipo_encontro?.trim() || row.tipo_encontro || null
    const novoTitulo = body.titulo?.trim() || row.titulo_formatado || ""
    const novaDescricao = body.descricao !== undefined ? (body.descricao?.trim() || null) : row.descricao
    const dataIso = body.data && /^\d{4}-\d{2}-\d{2}$/.test(body.data) ? body.data : null
    const horaInicio = body.hora_inicio && /^\d{2}:\d{2}$/.test(body.hora_inicio) ? body.hora_inicio : (row.horario_inicio?.slice(0, 5) ?? null)
    const horaFim = body.hora_fim && /^\d{2}:\d{2}$/.test(body.hora_fim) ? body.hora_fim : (row.horario_fim?.slice(0, 5) ?? null)

    if (horaInicio && horaFim && horaFim <= horaInicio) {
      return jsonResponse({ error: "hora_fim precisa ser maior que hora_inicio" }, 400)
    }

    // dataIsoFinal usado pra cálculo de start/end ISO. Se não veio data,
    // converte de DD/MM/YYYY (row.data_encontro) pra YYYY-MM-DD.
    let dataIsoFinal: string | null = dataIso
    if (!dataIsoFinal && row.data_encontro) {
      const [d, m, y] = row.data_encontro.split("/")
      if (d && m && y) dataIsoFinal = `${y}-${m}-${d}`
    }

    const startISO = dataIsoFinal && horaInicio ? dataHoraISO(dataIsoFinal, horaInicio) : null
    const endISO = dataIsoFinal && horaFim ? dataHoraISO(dataIsoFinal, horaFim) : null

    // Atualiza no Google Calendar se há id_evento_google.
    if (row.id_evento_google) {
      const gcalPatch: Partial<NovoEvento> = {}
      if (body.titulo !== undefined) gcalPatch.summary = novoTitulo
      if (body.descricao !== undefined) gcalPatch.description = novaDescricao ?? undefined
      if (startISO) gcalPatch.start = { dateTime: startISO, timeZone: TZ }
      if (endISO) gcalPatch.end = { dateTime: endISO, timeZone: TZ }

      if (Object.keys(gcalPatch).length > 0) {
        await atualizarEventoEm({
          subject: AO_VIVO_SUBJECT,
          calendarId: AO_VIVO_CALENDAR_ID,
          eventId: row.id_evento_google,
          payload: gcalPatch,
        })
      }
    }

    // Update na tabela.
    const patch: Record<string, unknown> = {
      updated_at: nowIsoText(),
    }
    if (novoTipo !== null) patch.tipo_encontro = novoTipo
    if (body.titulo !== undefined) {
      patch.titulo_original = novoTitulo
      patch.titulo_formatado = novoTitulo
    }
    if (body.descricao !== undefined) patch.descricao = novaDescricao
    if (dataIsoFinal) {
      const { mes, ano } = camposDerivados(dataIsoFinal)
      patch.data_encontro = formatDataEncontro(dataIsoFinal)
      patch.mes = mes
      patch.ano = ano
    }
    if (horaInicio) patch.horario_inicio = horaInicio
    if (horaFim) patch.horario_fim = horaFim
    if (horaInicio && horaFim) patch.duracao_minutos = calcularDuracaoMinutos(horaInicio, horaFim)
    if (startISO) patch.data_hora_inicio_iso = startISO
    if (endISO) patch.data_hora_fim_iso = endISO

    const { error: updErr } = await supabase
      .from("encontros_ao_vivo")
      .update(patch)
      .eq("id_unico", id_unico)
    if (updErr) {
      return jsonResponse({ error: "Erro ao atualizar encontro: " + updErr.message }, 500)
    }

    return jsonResponse({ ok: true, id_unico })
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e)
    return jsonResponse({ error: msg }, 500)
  }
})
