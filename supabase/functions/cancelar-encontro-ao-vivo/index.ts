import "jsr:@supabase/functions-js/edge-runtime.d.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"
import { corsHeaders, jsonResponse } from "../_shared/cors.ts"
import { deletarEventoEm } from "../_shared/google-calendar.ts"
import {
  AO_VIVO_CALENDAR_ID,
  AO_VIVO_SUBJECT,
  isAdminUser,
  nowIsoText,
} from "../_shared/encontros-ao-vivo.ts"

interface Body {
  id_unico: string
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
      return jsonResponse({ error: "Apenas administradores podem cancelar encontros" }, 403)
    }

    const { id_unico } = (await req.json()) as Body
    if (!id_unico) {
      return jsonResponse({ error: "id_unico obrigatório" }, 400)
    }

    const { data: row } = await supabase
      .from("encontros_ao_vivo")
      .select("id_unico, id_evento_google")
      .eq("id_unico", id_unico)
      .maybeSingle<{ id_unico: string; id_evento_google: string | null }>()

    if (!row) {
      return jsonResponse({ error: "Encontro não encontrado" }, 404)
    }

    let deletado_gcal = false
    let gcal_erro: string | null = null
    if (row.id_evento_google) {
      try {
        deletado_gcal = await deletarEventoEm({
          subject: AO_VIVO_SUBJECT,
          calendarId: AO_VIVO_CALENDAR_ID,
          eventId: row.id_evento_google,
        })
      } catch (e) {
        gcal_erro = e instanceof Error ? e.message : String(e)
        console.error("[cancelar-encontro-ao-vivo] erro GCal:", gcal_erro)
      }
    }

    const { error: updErr } = await supabase
      .from("encontros_ao_vivo")
      .update({ status: "cancelado", updated_at: nowIsoText() })
      .eq("id_unico", id_unico)
    if (updErr) {
      return jsonResponse({ error: "Erro ao marcar como cancelado: " + updErr.message }, 500)
    }

    return jsonResponse({ ok: true, deletado_gcal, gcal_erro })
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e)
    return jsonResponse({ error: msg }, 500)
  }
})
