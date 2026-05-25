import "jsr:@supabase/functions-js/edge-runtime.d.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"
import { corsHeaders, jsonResponse } from "../_shared/cors.ts"
import { getAccessTokenAs, SCOPES } from "../_shared/google-auth-sa.ts"

type Origem = "galdino" | "mentoria" | "blackcrm"
type TabelaDestino = "reunioes_galdino" | "reunioes_mentoria_new" | "reunioes_blackcrm"

const TABELA_ORIGEM: Record<Origem, TabelaDestino> = {
  galdino: "reunioes_galdino",
  mentoria: "reunioes_mentoria_new",
  blackcrm: "reunioes_blackcrm",
}

interface Linha {
  origem: Origem
  id_unico: string
  id_reuniao: string
}

async function buscarStatusEvento(emailCalendar: string, eventId: string): Promise<"cancelled" | "vivo" | "sumiu"> {
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

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders })
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    const supabase = createClient(supabaseUrl, serviceKey, {
      auth: { persistSession: false },
    })

    const hoje = new Date().toISOString().slice(0, 10)

    const { data: linhas, error: selErr } = await supabase
      .from("agendamentos_central")
      .select("origem, id_unico, id_reuniao")
      .in("status_agendamento", ["confirmado", "pendente_sync"])
      .gte("data_reuniao", hoje)
      .not("id_reuniao", "is", null)

    if (selErr) {
      return jsonResponse({ error: "Erro ao listar agendamentos: " + selErr.message }, 500)
    }

    const candidatos = ((linhas ?? []) as Linha[]).filter(l => !!l.id_reuniao)

    const EMAIL_ORG_BLACKCRM =
      Deno.env.get("CALENDAR_ORGANIZER_BLACKCRM") ?? "especialistablackcrm@rafaelgaldino.com.br"
    const EMAIL_ORG_CONSULTOR =
      Deno.env.get("CALENDAR_ORGANIZER_CONSULTOR") ?? "consultor@rafaelgaldino.com.br"

    let cancelados = 0
    const erros: { id_unico: string; erro: string }[] = []

    for (const linha of candidatos) {
      const tabela = TABELA_ORIGEM[linha.origem]
      const emailOrganizador = linha.origem === "blackcrm" ? EMAIL_ORG_BLACKCRM : EMAIL_ORG_CONSULTOR
      try {
        const status = await buscarStatusEvento(emailOrganizador, linha.id_reuniao)
        if (status === "vivo") continue
        const { error: updErr } = await supabase
          .from(tabela)
          .update({ status_agendamento: "cancelado" })
          .eq("id_unico", linha.id_unico)
        if (updErr) {
          erros.push({ id_unico: linha.id_unico, erro: updErr.message })
          continue
        }
        cancelados++
      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e)
        erros.push({ id_unico: linha.id_unico, erro: msg })
      }
    }

    return jsonResponse({
      ok: true,
      verificados: candidatos.length,
      cancelados,
      erros,
      processado_em: new Date().toISOString(),
    })
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e)
    return jsonResponse({ error: msg }, 500)
  }
})
