// enviar-mensagens — worker que drena a fila `mensagens_saida`.
//
// NASCE EM MODO SECO. Sem as duas variáveis abaixo definidas, ele NUNCA chama
// provedor nenhum: apenas marca como enviado com provedor='seco' e devolve a
// prévia do que teria mandado. É essa a trava que permite construir e testar o
// pipeline inteiro sem risco de disparar para a base real.
//
//   ENVIO_REAL=true            -> libera o envio de verdade (padrão: desligado)
//   WHATSAPP_TOKEN / _PHONE_ID -> credenciais da Meta Cloud API
//
// Autorização (mesmo padrão de sincronizar-reunioes): Bearer CRON_INVOKE_TOKEN
// para o agendador, ou JWT de admin para disparo manual pelo painel.
// Requer verify_jwt = false no config.toml (validamos o caller aqui dentro).
import "jsr:@supabase/functions-js/edge-runtime.d.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"
import { corsHeaders, jsonResponse } from "../_shared/cors.ts"

const LOTE_PADRAO = 50
const META_VERSAO = "v21.0"

interface Mensagem {
  id: string
  destinatario: string
  template: string
  variaveis: Record<string, unknown>
  previa: string | null
  persona: string
  tentativas: number
}

/** Envia de verdade pela Meta Cloud API. Só é chamada quando ENVIO_REAL=true. */
async function enviarWhatsApp(m: Mensagem, token: string, phoneId: string): Promise<void> {
  // Mensagem iniciada pela empresa fora da janela de 24h exige TEMPLATE aprovado.
  // Não existe texto livre aqui — os parâmetros entram na ordem declarada no template.
  const params = Object.values(m.variaveis ?? {}).map((v) => ({ type: "text", text: String(v) }))
  const resp = await fetch(`https://graph.facebook.com/${META_VERSAO}/${phoneId}/messages`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      messaging_product: "whatsapp",
      to: m.destinatario,
      type: "template",
      template: {
        name: m.template,
        language: { code: "pt_BR" },
        ...(params.length ? { components: [{ type: "body", parameters: params }] } : {}),
      },
    }),
  })
  if (!resp.ok) {
    const corpo = await resp.text()
    throw new Error(`Meta ${resp.status}: ${corpo.slice(0, 300)}`)
  }
}

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

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders })

  try {
    const url = Deno.env.get("SUPABASE_URL")!
    const anon = Deno.env.get("SUPABASE_ANON_KEY")!
    const service = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!

    if (!autorizadoPorCron(req) && !(await autorizadoPorAdmin(req, url, anon))) {
      return jsonResponse({ error: "Não autorizado" }, 401)
    }

    const token = Deno.env.get("WHATSAPP_TOKEN")
    const phoneId = Deno.env.get("WHATSAPP_PHONE_ID")
    // Modo seco é o DEFAULT. Só sai do seco com as três coisas presentes.
    const envioReal = Deno.env.get("ENVIO_REAL") === "true" && !!token && !!phoneId
    const provedor = envioReal ? "meta" : "seco"

    const body = await req.json().catch(() => ({}))
    const lote = Math.min(Number(body?.lote) || LOTE_PADRAO, 200)

    const admin = createClient(url, service, { auth: { persistSession: false } })

    // Reserva atômica (FOR UPDATE SKIP LOCKED lá no banco).
    const { data: mensagens, error: erroReserva } = await admin.rpc("reservar_mensagens", { p_lote: lote })
    if (erroReserva) return jsonResponse({ error: erroReserva.message }, 500)

    const fila = (mensagens ?? []) as Mensagem[]
    let enviadas = 0
    let falhas = 0
    const previas: string[] = []

    for (const m of fila) {
      try {
        if (envioReal) {
          await enviarWhatsApp(m, token!, phoneId!)
        } else {
          // MODO SECO: nada sai daqui. Só registra o que teria sido enviado.
          previas.push(`[${m.persona}] ${m.destinatario} · ${m.template} · ${m.previa ?? ""}`)
        }
        await admin.rpc("concluir_mensagem", { p_id: m.id, p_ok: true, p_provedor: provedor })
        enviadas++
      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e)
        await admin.rpc("concluir_mensagem", { p_id: m.id, p_ok: false, p_provedor: provedor, p_erro: msg })
        falhas++
      }
    }

    return jsonResponse({
      modo: envioReal ? "real" : "seco",
      reservadas: fila.length,
      enviadas,
      falhas,
      ...(envioReal ? {} : { aviso: "MODO SECO — nada foi enviado de verdade.", previas }),
    })
  } catch (e) {
    return jsonResponse({ error: e instanceof Error ? e.message : String(e) }, 500)
  }
})
