// provisionar-login — cria um login (auth user) + gera link de acesso, e vincula:
//   tipo 'membro'          -> equipe: insere em `mentores` com um papel (RBAC).
//                            Só Admin/Super Admin (papel is_full) podem.
//   tipo 'empresa_usuario' -> Fase 2: insere em `empresa_usuarios` (N logins/empresa).
//                            Quem tem a seção 'acessos' pode.
//
// Segurança: verify_jwt=true (só chamadas autenticadas). Autorização re-checada
// aqui com o token do chamador. A criação do auth user usa o service_role.
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

    // O chamador é do time? Qual papel?
    const { data: mentor } = await admin
      .from("mentores").select("papel, papeis(is_full, is_super)").eq("email", user.email).maybeSingle()
    if (!mentor) return jsonResponse({ error: "apenas o time pode provisionar acessos" }, 403)
    const papeisCaller = (mentor as { papeis?: { is_full?: boolean; is_super?: boolean } }).papeis
    const isFull = papeisCaller?.is_full ?? false
    const isSuper = papeisCaller?.is_super ?? false

    const body = await req.json().catch(() => ({}))
    const tipo = String(body.tipo ?? "")
    const email = String(body.email ?? "").trim().toLowerCase()
    const appUrl = String(body.app_url ?? "").replace(/\/$/, "")
    if (!email) return jsonResponse({ error: "email é obrigatório" }, 400)

    // Cria o auth user + link de convite (definição de senha).
    // Monta um link "bonito" no domínio do próprio app (appUrl) levando o token_hash
    // direto pra /ativar-conta (que chama verifyOtp). Sem isso, o action_link é uma URL
    // crua do Supabase (…supabase.co/auth/v1/verify?…) e a página não recebe token_hash,
    // deixando o botão "Ativar conta" travado. Fallback: action_link quando faltar appUrl/hash.
    async function criarLoginEGerarLink(): Promise<{ userId: string; link: string }> {
      const { data, error } = await admin.auth.admin.generateLink({
        type: "invite",
        email,
        options: appUrl ? { redirectTo: `${appUrl}/ativar-conta` } : undefined,
      })
      if (error) throw new Error(error.message)
      const hashed = data.properties?.hashed_token
      const link = appUrl && hashed
        ? `${appUrl}/ativar-conta?token_hash=${hashed}&type=invite`
        : (data.properties?.action_link ?? "")
      return { userId: data.user!.id, link }
    }

    if (tipo === "membro") {
      if (!isFull) return jsonResponse({ error: "só Admin ou Super Admin adicionam membros do time" }, 403)
      const nome = body.nome ? String(body.nome) : null
      const papel = body.papel ? String(body.papel) : "consultor"
      // Valida o papel e impede escalonamento: papel privilegiado (is_full/is_super) só por Super Admin.
      const { data: papelRow } = await admin
        .from("papeis").select("is_full, is_super").eq("chave", papel).maybeSingle()
      if (!papelRow) return jsonResponse({ error: `papel inválido: ${papel}` }, 400)
      const papelPrivilegiado = Boolean(papelRow.is_full || papelRow.is_super)
      if (papelPrivilegiado && !isSuper) {
        return jsonResponse({ error: "apenas Super Admin pode criar membro com papel privilegiado (Admin/Super Admin)" }, 403)
      }
      const { userId, link } = await criarLoginEGerarLink()
      const { error: insErr } = await admin.from("mentores").upsert({ email, nome, papel }, { onConflict: "email" })
      if (insErr) return jsonResponse({ error: `login criado mas falhou ao vincular: ${insErr.message}` }, 500)
      return jsonResponse({ message: "Membro do time provisionado.", user_id: userId, invite_link: link })
    }

    if (tipo === "empresa_usuario") {
      const { data: podeAcessos } = await caller.rpc("pode_secao", { p_chave: "acessos" })
      if (!podeAcessos) return jsonResponse({ error: "sem permissão para a seção Acessos" }, 403)
      const idCliente = body.id_cliente ? String(body.id_cliente) : ""
      if (!idCliente) return jsonResponse({ error: "id_cliente é obrigatório" }, 400)
      const { userId, link } = await criarLoginEGerarLink()
      const { error: insErr } = await admin.from("empresa_usuarios")
        .upsert({ auth_user_id: userId, id_cliente: idCliente, criado_por: user.id }, { onConflict: "auth_user_id" })
      if (insErr) return jsonResponse({ error: `login criado mas falhou ao vincular: ${insErr.message}` }, 500)
      return jsonResponse({ message: "Usuário da empresa provisionado.", user_id: userId, invite_link: link })
    }

    return jsonResponse({ error: "tipo inválido (use 'membro' ou 'empresa_usuario')" }, 400)
  } catch (e) {
    return jsonResponse({ error: String((e as Error)?.message ?? e) }, 500)
  }
})
