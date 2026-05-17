import "jsr:@supabase/functions-js/edge-runtime.d.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"
import { corsHeaders, jsonResponse } from "../_shared/cors.ts"
import { freebusyQuery } from "../_shared/google-calendar.ts"

interface Body {
  email_calendar: string
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders })
  }
  if (req.method !== "POST") {
    return jsonResponse({ error: "Método não permitido" }, 405)
  }

  // Verifica admin via JWT
  const authHeader = req.headers.get("Authorization")
  if (!authHeader?.startsWith("Bearer ")) {
    return jsonResponse({ error: "Autorização ausente" }, 401)
  }
  const jwt = authHeader.slice(7)

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!

  const supabaseAsUser = createClient(supabaseUrl, anonKey, {
    global: { headers: { Authorization: `Bearer ${jwt}` } },
    auth: { persistSession: false },
  })

  const { data: { user }, error: uErr } = await supabaseAsUser.auth.getUser()
  if (uErr || !user?.email) {
    return jsonResponse({ error: "Usuário não autenticado" }, 401)
  }

  const supabaseAdmin = createClient(supabaseUrl, serviceKey, {
    auth: { persistSession: false },
  })
  const { data: mentor } = await supabaseAdmin
    .from("mentores")
    .select("id")
    .eq("email", user.email)
    .maybeSingle()

  if (!mentor) {
    return jsonResponse({ error: "Apenas administradores" }, 403)
  }

  try {
    const body = (await req.json()) as Body
    const { email_calendar } = body
    if (!email_calendar) {
      return jsonResponse({ error: "email_calendar obrigatório" }, 400)
    }

    const agora = new Date()
    const fim = new Date(agora.getTime() + 60 * 60 * 1000)
    const fb = await freebusyQuery(email_calendar, agora.toISOString(), fim.toISOString())

    return jsonResponse({
      ok: true,
      email_calendar,
      conta_acessivel: !fb?.calendars?.[email_calendar]?.errors,
      busy_intervals: fb?.calendars?.[email_calendar]?.busy?.length ?? 0,
      raw: fb,
      testado_em: new Date().toISOString(),
    })
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e)
    return jsonResponse({ ok: false, erro: msg }, 200)
  }
})
