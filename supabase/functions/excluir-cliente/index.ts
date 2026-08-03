// excluir-cliente — exclusão completa de um cliente pelo admin:
//   1) chama admin_excluir_cliente(id_entrada) (SECURITY DEFINER, service_role
//      only), que varre TODAS as tabelas com id_cliente e apaga tudo
//      (clientes_formulario cascateia cliente_metas/onboarding/canais/
//      empresas/produtos; clientes_entrada_new cascateia cs_acompanhamento).
//   2) apaga o login (auth.users) — sem isso o e-mail fica travado e um novo
//      cadastro com o mesmo e-mail falha com "usuário já existe".
//
// Autorização: precisa poder a seção 'clientes' (mesmo gate da aba Clientes).
// Espelha o padrão de gerenciar-acesso/remover-membro.
import "jsr:@supabase/functions-js/edge-runtime.d.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
}

function jsonResponse(payload: unknown, status = 200): Response {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  })
}

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

    const { data: podeClientes } = await caller.rpc("pode_secao", { p_chave: "clientes" })
    if (!podeClientes) return jsonResponse({ error: "sem permissão para a seção Clientes" }, 403)

    const body = await req.json().catch(() => ({}))
    const idEntrada = body.id_entrada != null ? Number(body.id_entrada) : NaN
    if (Number.isNaN(idEntrada)) return jsonResponse({ error: "id_entrada é obrigatório" }, 400)

    const { data: idCliente, error: rpcErr } = await admin.rpc("admin_excluir_cliente", { p_id_entrada: idEntrada })
    if (rpcErr) return jsonResponse({ error: rpcErr.message }, 400)

    let removedAuth = false
    if (idCliente) {
      const { error: authErr } = await admin.auth.admin.deleteUser(idCliente)
      removedAuth = !authErr
    }

    return jsonResponse({ message: "Cliente excluído.", removed_auth: removedAuth })
  } catch (e) {
    return jsonResponse({ error: String((e as Error)?.message ?? e) }, 500)
  }
})
