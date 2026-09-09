/**
 * CRM — busca o link de convite de cada grupo de WhatsApp.
 *
 * É o que faz o ícone de WhatsApp na tela /clientes ter para onde apontar: o
 * JID que guardamos não abre por link, só o convite chat.whatsapp.com/<código>
 * abre. Ver conviteDoGrupo em _shared/evolution.ts.
 *
 * RITMO
 * O WhatsApp limita esses pedidos com força (rajada de 20 → 8 recusas). Então:
 * pausa entre grupos, uma tentativa extra quando bate no limite, e blocos de
 * poucos grupos por invocação com auto-reinvocação — mesmo padrão de
 * crm-whatsapp-backfill, que resolve o teto de wall clock da edge function.
 *
 * Idempotente: só busca quem está sem convite. Rodar de novo não repete
 * trabalho nem gasta cota à toa. Para renovar convites revogados, chamar com
 * {"reobter_apos_dias": 30}.
 *
 * Autorização: Bearer CRON_INVOKE_TOKEN ou JWT de admin (verify_jwt=false).
 */
import "jsr:@supabase/functions-js/edge-runtime.d.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"
import { corsHeaders, jsonResponse } from "../_shared/cors.ts"
import {
  INSTANCIA_DIRETORIO,
  conviteDoGrupo,
  dispararEmBackground,
  evolutionConfigurada,
} from "../_shared/evolution.ts"

/**
 * Grupos por invocação.
 *
 * Cada chamada de convite custa ~0,8s e ainda somamos a pausa contra o rate
 * limit. Com 25 por bloco a função passou do teto e o gateway devolveu 504 —
 * e um 504 mata a corrente, porque a auto-reinvocação nunca é alcançada.
 * 8 × ~2,8s ≈ 25s deixa margem larga. São ~30 rodadas para 238 grupos, o que
 * é lento e não importa: isto roda em segundo plano.
 */
const BLOCO = 8
const PAUSA_MS = 2000
/** Espera maior antes da segunda tentativa, quando o WhatsApp recusa por taxa. */
const PAUSA_RATE_LIMIT_MS = 6000

const dormir = (ms: number) => new Promise((r) => setTimeout(r, ms))

function autorizadoPorCron(req: Request): boolean {
  const esperado = Deno.env.get("CRON_INVOKE_TOKEN")
  if (!esperado) return false
  return (req.headers.get("Authorization") ?? "") === `Bearer ${esperado}`
}

async function autorizadoPorAdmin(req: Request, url: string, anon: string): Promise<boolean> {
  const auth = req.headers.get("Authorization") ?? ""
  if (!auth.startsWith("Bearer ")) return false
  const caller = createClient(url, anon, {
    global: { headers: { Authorization: auth } },
    auth: { persistSession: false },
  })
  const { data, error } = await caller.rpc("is_admin")
  return !error && data === true
}

interface GrupoRow {
  grupo_id: string
  id_cliente: string | null
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders })
  if (req.method !== "POST") return jsonResponse({ error: "Método não permitido" }, 405)

  const url = Deno.env.get("SUPABASE_URL")!
  const anon = Deno.env.get("SUPABASE_ANON_KEY")!
  const service = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!

  if (!autorizadoPorCron(req) && !(await autorizadoPorAdmin(req, url, anon))) {
    return jsonResponse({ error: "Não autorizado" }, 401)
  }
  if (!evolutionConfigurada() || !INSTANCIA_DIRETORIO) {
    return jsonResponse({ error: "Evolution não configurada" }, 500)
  }

  const body = await req.json().catch(() => ({}))
  const reobterAposDias = Number(body?.reobter_apos_dias ?? 0)

  const db = createClient(url, service, { auth: { persistSession: false } })

  try {
    // Só o número da automação está em todos os grupos e é admin deles, então é
    // por ele que o convite sai. É um GET, então passa pelo guard de
    // somente-leitura que protege essa instância.
    let q = db
      .from("crm_whatsapp_grupos")
      .select("grupo_id, id_cliente")
      .eq("ignorar", false)
      .limit(BLOCO)

    if (reobterAposDias > 0) {
      const limite = new Date(Date.now() - reobterAposDias * 86400_000).toISOString()
      q = q.or(`convite_url.is.null,convite_em.lt.${limite}`)
    } else {
      q = q.is("convite_url", null)
    }

    const { data: grupos, error: errG } = await q
    if (errG) throw errG

    const pendentes = (grupos ?? []) as GrupoRow[]
    let obtidos = 0
    let semConvite = 0
    let limitados = 0

    for (const [i, g] of pendentes.entries()) {
      if (i > 0) await dormir(PAUSA_MS)

      let r = await conviteDoGrupo(INSTANCIA_DIRETORIO, g.grupo_id)
      if (!r.url && r.rateLimit) {
        await dormir(PAUSA_RATE_LIMIT_MS)
        r = await conviteDoGrupo(INSTANCIA_DIRETORIO, g.grupo_id)
      }

      if (!r.url) {
        if (r.rateLimit) limitados++
        else semConvite++
        // Sem convite fica NULL de propósito: a próxima rodada tenta de novo,
        // e o ícone na tela some em vez de apontar para lugar nenhum.
        continue
      }

      const agora = new Date().toISOString()
      const { error: errU } = await db
        .from("crm_whatsapp_grupos")
        .update({ convite_url: r.url, convite_em: agora })
        .eq("grupo_id", g.grupo_id)
      if (errU) throw errU

      // Espelha no cliente: é a linha que a tela /clientes já carrega, e cuja
      // RLS a CS enxerga (crm_whatsapp_grupos é restrita à coordenação).
      if (g.id_cliente) {
        const { error: errC } = await db
          .from("clientes_entrada_new")
          .update({ whatsapp_grupo_convite: r.url })
          .eq("id_cliente", g.id_cliente)
        if (errC) throw errC
      }
      obtidos++
    }

    // Ainda falta gente? Continua sem segurar esta resposta.
    const continua = pendentes.length === BLOCO
    if (continua) dispararEmBackground(`${url}/functions/v1/crm-whatsapp-convites`, body)

    return jsonResponse({
      ok: true,
      processados: pendentes.length,
      obtidos,
      sem_convite: semConvite,
      recusados_por_taxa: limitados,
      continua,
    })
  } catch (e) {
    console.error("[crm-whatsapp-convites]", e)
    return jsonResponse({ error: String((e as Error)?.message ?? e) }, 500)
  }
})
