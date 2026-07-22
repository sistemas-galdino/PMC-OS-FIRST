// remover-membro — exclui por completo um membro do time (Super Admin apenas):
//   1) apaga a linha em `mentores` (cascateia `mentor_secao_override`; o trigger
//      tg_mentores_guard impede remover o último super_admin);
//   2) apaga o login (auth.users) correspondente, localizado pelo e-mail.
//
// Segurança: verify_jwt=true (default do gateway → só chamadas autenticadas).
// O papel do chamador é re-checado aqui (precisa is_super). A exclusão usa o
// service_role (que ignora RLS). Espelha o padrão de provisionar-login.
import "jsr:@supabase/functions-js/edge-runtime.d.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"
import { corsHeaders, jsonResponse } from "../_shared/cors.ts"

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders })
  try {
    const url = Deno.env.get("SUPABASE_URL")!
    const anon = Deno.env.get("SUPABASE_ANON_KEY")!
    const service = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    const authHeader = req.headers.get("Authorization") ?? ""

    const caller = createClient(url, anon, { global: { headers: { Authorization: authHeader } } })
    const admin = createClient(url, service)

    const { data: userData, error: uErr } = await caller.auth.getUser()
    const user = userData?.user
    if (uErr || !user?.email) return jsonResponse({ error: "não autenticado" }, 401)

    // O chamador é Super Admin?
    const { data: mentor } = await admin
      .from("mentores").select("papel, papeis(is_super)").eq("email", user.email).maybeSingle()
    const isSuper = (mentor as { papeis?: { is_super?: boolean } } | null)?.papeis?.is_super ?? false
    if (!isSuper) return jsonResponse({ error: "apenas Super Admin pode excluir membros" }, 403)

    const body = await req.json().catch(() => ({}))
    const id = body.id != null ? Number(body.id) : NaN
    if (Number.isNaN(id)) return jsonResponse({ error: "id do membro é obrigatório" }, 400)

    // Carrega o alvo (email p/ apagar o login).
    const { data: alvo, error: aErr } = await admin
      .from("mentores").select("id, email").eq("id", id).maybeSingle()
    if (aErr) return jsonResponse({ error: aErr.message }, 500)
    if (!alvo) return jsonResponse({ error: "membro não encontrado" }, 404)

    const alvoEmail = String(alvo.email ?? "").trim().toLowerCase()
    if (alvoEmail && alvoEmail === user.email.toLowerCase()) {
      return jsonResponse({ error: "você não pode excluir a si mesmo" }, 400)
    }

    // 1) Apaga a linha em mentores. O trigger barra o último super_admin (mensagem própria).
    const { error: delErr } = await admin.from("mentores").delete().eq("id", id)
    if (delErr) return jsonResponse({ error: delErr.message }, 400)

    // 2) Apaga o login (auth.users) pelo e-mail. mentores não guarda o auth_user_id,
    //    então localiza paginando a lista de usuários (time pequeno).
    let authUserId: string | null = null
    if (alvoEmail) {
      for (let page = 1; page <= 50; page++) {
        const { data: list, error: lErr } = await admin.auth.admin.listUsers({ page, perPage: 200 })
        if (lErr) break
        const found = list.users.find((u) => (u.email ?? "").toLowerCase() === alvoEmail)
        if (found) { authUserId = found.id; break }
        if (list.users.length < 200) break
      }
      if (authUserId) await admin.auth.admin.deleteUser(authUserId)
    }

    return jsonResponse({ message: "Membro removido.", removed_auth: Boolean(authUserId) })
  } catch (e) {
    return jsonResponse({ error: String((e as Error)?.message ?? e) }, 500)
  }
})
