import "jsr:@supabase/functions-js/edge-runtime.d.ts"
import { createClient, type SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2"
import { corsHeaders, jsonResponse } from "../_shared/cors.ts"
import { atualizarEventoEm } from "../_shared/google-calendar.ts"
import { isAdminUser } from "../_shared/encontros-ao-vivo.ts"

type Origem = "galdino" | "mentoria" | "blackcrm"
type TabelaDestino = "reunioes_galdino" | "reunioes_mentoria_new" | "reunioes_blackcrm"

interface Body {
  origem: Origem
  id_unico: string
  data: string // YYYY-MM-DD
  horario: string // HH:MM
}

const TABELA_ORIGEM: Record<Origem, TabelaDestino> = {
  galdino: "reunioes_galdino",
  mentoria: "reunioes_mentoria_new",
  blackcrm: "reunioes_blackcrm",
}

const TZ = "America/Fortaleza"
const TZ_OFFSET = "-03:00"

const EMAILS_CALENDAR_VALIDOS = [
  "dono@rafaelgaldino.com.br",
  "consultor@rafaelgaldino.com.br",
  "consultores@rafaelgaldino.com.br",
  "especialistablackcrm@rafaelgaldino.com.br",
  "mentor@rafaelgaldino.com.br",
] as const

function addMinutos(h5: string, mins: number): string {
  const [hh, mm] = h5.split(":").map(Number)
  const total = hh * 60 + mm + mins
  const nh = Math.floor(total / 60) % 24
  const nm = total % 60
  return `${String(nh).padStart(2, "0")}:${String(nm).padStart(2, "0")}`
}

// Caixas-candidatas pra impersonar: organizador conhecido primeiro, depois fallback.
async function candidatosCalendario(supabase: SupabaseClient, id_unico: string): Promise<string[]> {
  let emailOrganizador: string | null = null
  const { data: agView } = await supabase
    .from("agendamentos_central")
    .select("consultor_nome")
    .eq("id_unico", id_unico)
    .maybeSingle<{ consultor_nome: string | null }>()
  if (agView?.consultor_nome) {
    const { data: cons } = await supabase
      .from("consultores_atendimento")
      .select("email_calendar")
      .eq("nome", agView.consultor_nome)
      .maybeSingle<{ email_calendar: string | null }>()
    emailOrganizador = cons?.email_calendar ?? null
  }
  const candidatos: string[] = []
  if (emailOrganizador) candidatos.push(emailOrganizador)
  for (const e of EMAILS_CALENDAR_VALIDOS) {
    if (!candidatos.includes(e)) candidatos.push(e)
  }
  return candidatos
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders })
  }
  if (req.method !== "POST") {
    return jsonResponse({ error: "Método não permitido" }, 405)
  }

  try {
    const body = (await req.json()) as Body
    const { origem, id_unico, data, horario } = body

    if (!origem || !TABELA_ORIGEM[origem] || !id_unico) {
      return jsonResponse({ error: "origem e id_unico obrigatórios" }, 400)
    }
    if (!/^\d{4}-\d{2}-\d{2}$/.test(data ?? "")) {
      return jsonResponse({ error: "Data inválida (use YYYY-MM-DD)" }, 400)
    }
    if (!/^\d{2}:\d{2}(:\d{2})?$/.test(horario ?? "")) {
      return jsonResponse({ error: "Horário inválido (use HH:MM)" }, 400)
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!
    const supabase = createClient(supabaseUrl, serviceKey, {
      auth: { persistSession: false },
    })

    // Operação administrativa (Central de Atendimentos): exige admin.
    const auth = req.headers.get("Authorization") ?? ""
    const jwt = auth.startsWith("Bearer ") ? auth.slice(7) : ""
    if (!jwt || !(await isAdminUser(supabase, supabaseUrl, anonKey, jwt))) {
      return jsonResponse({ error: "Apenas administradores podem reagendar agendamentos" }, 403)
    }

    const tabela = TABELA_ORIGEM[origem]
    const { data: row, error: selErr } = await supabase
      .from(tabela)
      .select("id_unico, id_reuniao, duracao_minutos")
      .eq("id_unico", id_unico)
      .maybeSingle<{ id_unico: string; id_reuniao: string | null; duracao_minutos: number | null }>()

    if (selErr) {
      console.error("[detalhe]", selErr.message); return jsonResponse({ error: "Erro ao consultar agendamento (detalhe registrado no servidor)" }, 500)
    }
    if (!row) {
      return jsonResponse({ error: "Agendamento não encontrado" }, 404)
    }

    const h5 = horario.slice(0, 5)
    const horarioStr = h5 + ":00"
    const dataDate = new Date(data + "T00:00:00")
    const ano = dataDate.getFullYear()
    const mes = dataDate.getMonth() + 1
    const duracao = row.duracao_minutos ?? 60

    // Move o evento no Google Calendar (PATCH start/end, notifica os convidados).
    let atualizado_gcal = false
    let gcal_erro: string | null = null
    if (row.id_reuniao) {
      const startISO = `${data}T${horarioStr}${TZ_OFFSET}`
      const endISO = `${data}T${addMinutos(h5, duracao)}:00${TZ_OFFSET}`
      const candidatos = await candidatosCalendario(supabase, id_unico)
      const erros: string[] = []
      for (const email of candidatos) {
        try {
          await atualizarEventoEm({
            subject: email,
            calendarId: email,
            eventId: row.id_reuniao,
            payload: {
              start: { dateTime: startISO, timeZone: TZ },
              end: { dateTime: endISO, timeZone: TZ },
            },
          })
          atualizado_gcal = true
          break
        } catch (err) {
          erros.push(`${email}: ${err instanceof Error ? err.message : String(err)}`)
        }
      }
      if (!atualizado_gcal && erros.length > 0) {
        gcal_erro = erros.join(" | ")
        console.error("[reagendar-agendamento] Falha em todas as caixas:", gcal_erro)
      }
    }

    const { error: updErr } = await supabase
      .from(tabela)
      .update({ data_reuniao: data, horario: horarioStr, ano, mes })
      .eq("id_unico", id_unico)

    if (updErr) {
      console.error("[detalhe]", updErr.message); return jsonResponse({ error: "Erro ao atualizar agendamento (detalhe registrado no servidor)" }, 500)
    }

    return jsonResponse({ ok: true, atualizado_gcal, gcal_erro })
  } catch (e) {
    console.error("[erro-interno]", e instanceof Error ? e.message : String(e))
    return jsonResponse({ error: "Erro interno (detalhe registrado no servidor)" }, 500)
  }
})
