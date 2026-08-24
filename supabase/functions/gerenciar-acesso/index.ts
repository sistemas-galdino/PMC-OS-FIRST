// gerenciar-acesso — gerencia um login VINCULADO de empresa (empresa_usuarios):
//   acao 'remover'  -> apaga o vínculo DESTA empresa; o login em auth.users só é
//                      apagado se aquele era o último vínculo dele (um mesmo login
//                      pode alcançar várias empresas via emails_multi_empresa).
//   acao 'reenviar' -> gera um novo link bonito de acesso (/ativar-conta) pro login.
//
// Só logins VINCULADOS (empresa_usuarios). O login PRINCIPAL/dono
// (auth_user_id == id_cliente) é recusado — apagá-lo tiraria o acesso da empresa
// inteira, é outra operação. Autorização: quem tem a seção 'acessos' (mesmo gate
// do provisionar-login tipo empresa_usuario). A exclusão/geração usa service_role.
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
    if (uErr || !user?.id) return jsonResponse({ error: "não autenticado" }, 401)

    // Autorização: precisa poder a seção 'acessos' (mesmo gate do provisionar-login).
    const { data: podeAcessos } = await caller.rpc("pode_secao", { p_chave: "acessos" })
    if (!podeAcessos) return jsonResponse({ error: "sem permissão para a seção Acessos" }, 403)

    const body = await req.json().catch(() => ({}))
    const acao = String(body.acao ?? "")
    const authUserId = String(body.auth_user_id ?? "").trim()
    const idCliente = String(body.id_cliente ?? "").trim()
    const appUrl = String(body.app_url ?? "").replace(/\/$/, "")
    if (!authUserId) return jsonResponse({ error: "auth_user_id é obrigatório" }, 400)

    // Guard: só logins VINCULADOS. O principal/dono tem auth_user_id == id_cliente.
    if (idCliente && authUserId === idCliente) {
      return jsonResponse({ error: "este é o login principal (dono) da empresa; não pode ser gerenciado por aqui" }, 400)
    }
    if (authUserId === user.id) {
      return jsonResponse({ error: "você não pode excluir a si mesmo" }, 400)
    }

    // Confirma que o alvo é mesmo um vínculo em empresa_usuarios (defesa extra).
    // Um login pode estar vinculado a VÁRIAS empresas (emails_multi_empresa), então
    // a busca é pelo par (login, empresa) — sem o filtro de empresa, .maybeSingle()
    // quebraria justamente nesses casos.
    const { data: vinculos } = await admin
      .from("empresa_usuarios").select("auth_user_id, id_cliente").eq("auth_user_id", authUserId)
    const vinculo = (vinculos ?? []).find((v) => !idCliente || v.id_cliente === idCliente)
    if (!vinculo) return jsonResponse({ error: "acesso vinculado não encontrado" }, 404)

    if (acao === "remover") {
      // Remove só o vínculo DESTA empresa. Apagar o auth user aqui tiraria o acesso
      // da pessoa nas outras empresas dela também.
      const { error: delErr } = await admin.from("empresa_usuarios").delete()
        .eq("auth_user_id", authUserId).eq("id_cliente", vinculo.id_cliente)
      if (delErr) return jsonResponse({ error: delErr.message }, 400)

      // Só quando não sobrou vínculo nenhum o login em si deixa de ter razão de existir.
      const { count: restantes } = await admin
        .from("empresa_usuarios").select("auth_user_id", { count: "exact", head: true })
        .eq("auth_user_id", authUserId)
      if ((restantes ?? 0) > 0) {
        return jsonResponse({
          message: `Acesso removido desta empresa. O login continua ativo em ${restantes} outra(s) empresa(s).`,
          removed_auth: false,
          vinculos_restantes: restantes,
        })
      }
      // Apaga o login. Temos o uuid direto (não precisa paginar listUsers).
      const { error: authErr } = await admin.auth.admin.deleteUser(authUserId)
      await admin.from("empresa_ativa").delete().eq("auth_user_id", authUserId)
      return jsonResponse({ message: "Acesso removido.", removed_auth: !authErr, vinculos_restantes: 0 })
    }

    if (acao === "reenviar") {
      const { data: alvo, error: gErr } = await admin.auth.admin.getUserById(authUserId)
      if (gErr || !alvo?.user?.email) return jsonResponse({ error: "não foi possível obter o e-mail do acesso" }, 404)
      const email = alvo.user.email
      // Mesmo link bonito do provisionar-login: token_hash -> /ativar-conta (destrava o botão).
      const { data, error } = await admin.auth.admin.generateLink({
        type: "invite",
        email,
        options: appUrl ? { redirectTo: `${appUrl}/ativar-conta` } : undefined,
      })
      if (error) return jsonResponse({ error: error.message }, 400)
      const hashed = data.properties?.hashed_token
      const link = appUrl && hashed
        ? `${appUrl}/ativar-conta?token_hash=${hashed}&type=invite`
        : (data.properties?.action_link ?? "")
      return jsonResponse({ message: "Link gerado.", invite_link: link, email })
    }

    return jsonResponse({ error: "acao inválida (use 'remover' ou 'reenviar')" }, 400)
  } catch (e) {
    return jsonResponse({ error: String((e as Error)?.message ?? e) }, 500)
  }
})
