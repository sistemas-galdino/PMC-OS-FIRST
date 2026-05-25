import "jsr:@supabase/functions-js/edge-runtime.d.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"
import { corsHeaders, jsonResponse } from "../_shared/cors.ts"
import { deletarEvento } from "../_shared/google-calendar.ts"

type Origem = "galdino" | "mentoria" | "blackcrm"
type TabelaDestino = "reunioes_galdino" | "reunioes_mentoria_new" | "reunioes_blackcrm"

interface Body {
  origem: Origem
  id_unico: string
}

const TABELA_ORIGEM: Record<Origem, TabelaDestino> = {
  galdino: "reunioes_galdino",
  mentoria: "reunioes_mentoria_new",
  blackcrm: "reunioes_blackcrm",
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
    const { origem, id_unico } = body

    if (!origem || !TABELA_ORIGEM[origem] || !id_unico) {
      return jsonResponse({ error: "origem e id_unico obrigatórios" }, 400)
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    const supabase = createClient(supabaseUrl, serviceKey, {
      auth: { persistSession: false },
    })

    const tabela = TABELA_ORIGEM[origem]

    const { data: row, error: selErr } = await supabase
      .from(tabela)
      .select("id_unico, id_reuniao, status_agendamento")
      .eq("id_unico", id_unico)
      .maybeSingle<{ id_unico: string; id_reuniao: string | null; status_agendamento: string | null }>()

    if (selErr) {
      return jsonResponse({ error: "Erro ao consultar agendamento: " + selErr.message }, 500)
    }
    if (!row) {
      return jsonResponse({ error: "Agendamento não encontrado" }, 404)
    }

    const { error: updErr } = await supabase
      .from(tabela)
      .update({ status_agendamento: "cancelado" })
      .eq("id_unico", id_unico)

    if (updErr) {
      return jsonResponse({ error: "Erro ao cancelar no banco: " + updErr.message }, 500)
    }

    const EMAIL_ORG_BLACKCRM =
      Deno.env.get("CALENDAR_ORGANIZER_BLACKCRM") ?? "especialistablackcrm@rafaelgaldino.com.br"
    const EMAIL_ORG_CONSULTOR =
      Deno.env.get("CALENDAR_ORGANIZER_CONSULTOR") ?? "consultor@rafaelgaldino.com.br"
    const EMAIL_ORG_GALDINO =
      Deno.env.get("CALENDAR_ORGANIZER_GALDINO") ?? "dono@rafaelgaldino.com.br"
    const emailOrganizador =
      origem === "blackcrm" ? EMAIL_ORG_BLACKCRM :
      origem === "galdino" ? EMAIL_ORG_GALDINO :
      EMAIL_ORG_CONSULTOR

    let deletado_gcal = false
    let gcal_erro: string | null = null
    if (row.id_reuniao) {
      try {
        await deletarEvento(emailOrganizador, row.id_reuniao)
        deletado_gcal = true
      } catch (e) {
        gcal_erro = e instanceof Error ? e.message : String(e)
        console.error("[cancelar-agendamento] Falha ao deletar evento GCal:", gcal_erro)
      }
    }

    return jsonResponse({ ok: true, deletado_gcal, gcal_erro })
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e)
    return jsonResponse({ error: msg }, 500)
  }
})
