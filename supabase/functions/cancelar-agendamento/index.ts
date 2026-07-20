import "jsr:@supabase/functions-js/edge-runtime.d.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"
import { corsHeaders, jsonResponse } from "../_shared/cors.ts"
import { deletarEvento } from "../_shared/google-calendar.ts"
import { isAdminUser } from "../_shared/encontros-ao-vivo.ts"

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

const EMAILS_CALENDAR_VALIDOS = [
  "dono@rafaelgaldino.com.br",
  "consultor@rafaelgaldino.com.br",
  "consultores@rafaelgaldino.com.br",
  "especialistablackcrm@rafaelgaldino.com.br",
  "mentor@rafaelgaldino.com.br",
] as const

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
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!
    const supabase = createClient(supabaseUrl, serviceKey, {
      auth: { persistSession: false },
    })

    // Operação administrativa (Central de Atendimentos): exige admin.
    const auth = req.headers.get("Authorization") ?? ""
    const jwt = auth.startsWith("Bearer ") ? auth.slice(7) : ""
    if (!jwt || !(await isAdminUser(supabase, supabaseUrl, anonKey, jwt))) {
      return jsonResponse({ error: "Apenas administradores podem cancelar agendamentos" }, 403)
    }

    const tabela = TABELA_ORIGEM[origem]

    const { data: row, error: selErr } = await supabase
      .from(tabela)
      .select("id_unico, id_reuniao, status_agendamento")
      .eq("id_unico", id_unico)
      .maybeSingle<{ id_unico: string; id_reuniao: string | null; status_agendamento: string | null }>()

    if (selErr) {
      console.error("[detalhe]", selErr.message); return jsonResponse({ error: "Erro ao consultar agendamento (detalhe registrado no servidor)" }, 500)
    }
    if (!row) {
      return jsonResponse({ error: "Agendamento não encontrado" }, 404)
    }

    const { error: updErr } = await supabase
      .from(tabela)
      .update({ status_agendamento: "cancelado" })
      .eq("id_unico", id_unico)

    if (updErr) {
      console.error("[detalhe]", updErr.message); return jsonResponse({ error: "Erro ao cancelar no banco (detalhe registrado no servidor)" }, 500)
    }

    // Descobre o organizador via consultor (usa nome que vem em agendamentos_central).
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

    let deletado_gcal = false
    let gcal_erro: string | null = null
    let deletado_em: string | null = null

    if (row.id_reuniao) {
      // Ordem: organizador conhecido primeiro, depois fallback nas outras caixas.
      const candidatos: string[] = []
      if (emailOrganizador) candidatos.push(emailOrganizador)
      for (const e of EMAILS_CALENDAR_VALIDOS) {
        if (!candidatos.includes(e)) candidatos.push(e)
      }
      const erros: string[] = []
      for (const e of candidatos) {
        try {
          const deletou = await deletarEvento(e, row.id_reuniao)
          if (deletou) {
            deletado_gcal = true
            deletado_em = e
            break
          }
        } catch (err) {
          erros.push(`${e}: ${err instanceof Error ? err.message : String(err)}`)
        }
      }
      if (!deletado_gcal && erros.length > 0) {
        gcal_erro = erros.join(" | ")
        console.error("[cancelar-agendamento] Falha em todas as caixas:", gcal_erro)
      }
    }

    return jsonResponse({ ok: true, deletado_gcal, deletado_em, gcal_erro })
  } catch (e) {
    console.error("[erro-interno]", e instanceof Error ? e.message : String(e))
    return jsonResponse({ error: "Erro interno (detalhe registrado no servidor)" }, 500)
  }
})
