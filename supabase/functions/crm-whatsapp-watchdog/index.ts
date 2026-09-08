/**
 * CRM — vigia o estado das instâncias de WhatsApp das CS.
 *
 * A sessão Baileys cai sozinha (celular sem rede, WhatsApp pedindo novo
 * pareamento, restart do container) e nem sempre o CONNECTION_UPDATE chega.
 * Sem esta rotina a CS descobre que caiu ao tentar responder um cliente.
 *
 * Só sincroniza status. NUNCA deleta instância: a linha e o histórico têm de
 * sobreviver a uma queda.
 *
 * Molde de watchdog-gcal: verify_jwt=false + Bearer CRON_INVOKE_TOKEN.
 */
import "jsr:@supabase/functions-js/edge-runtime.d.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"
import { corsHeaders, jsonResponse } from "../_shared/cors.ts"
import { estadoInstancia, evolutionConfigurada, statusDoEstado } from "../_shared/evolution.ts"

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders })

  const esperado = Deno.env.get("CRON_INVOKE_TOKEN")
  if (!esperado || (req.headers.get("Authorization") ?? "") !== `Bearer ${esperado}`) {
    return jsonResponse({ error: "Não autorizado" }, 401)
  }
  if (!evolutionConfigurada()) return jsonResponse({ error: "Evolution não configurada" }, 500)

  const db = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    { auth: { persistSession: false } },
  )

  const { data: instancias, error } = await db
    .from("crm_whatsapp_instancias")
    .select("id, instancia, status")
    .eq("papel", "cs")
  if (error) return jsonResponse({ error: error.message }, 500)

  const mudancas: string[] = []
  for (const i of instancias ?? []) {
    // 'criada' ainda não existe na Evolution — perguntar por ela só gera 404.
    if (i.status === "criada") continue
    let novo: string
    try {
      novo = statusDoEstado(await estadoInstancia(i.instancia))
    } catch (e) {
      console.warn(`[watchdog] ${i.instancia}: ${(e as Error).message}`)
      continue
    }
    if (novo === i.status) continue
    await db
      .from("crm_whatsapp_instancias")
      .update({
        status: novo,
        ultimo_evento_em: new Date().toISOString(),
        ...(novo === "desconectada" ? { desconectado_em: new Date().toISOString() } : {}),
      })
      .eq("id", i.id)
    mudancas.push(`${i.instancia}: ${i.status} -> ${novo}`)
  }

  return jsonResponse({ ok: true, verificadas: instancias?.length ?? 0, mudancas })
})
