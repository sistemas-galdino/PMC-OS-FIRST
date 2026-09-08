/**
 * CRM — webhook de entrada da Evolution API.
 *
 * Recebe tudo que acontece nas instâncias das CS: QR novo, mudança de conexão
 * e, principalmente, mensagem de grupo. É o que enche crm_mensagens e faz a
 * aba /crm/atendimento virar um WhatsApp de verdade.
 *
 * AUTENTICAÇÃO (verify_jwt=false em config.toml)
 * Header `x-pmc-webhook-token`, conferido contra crm_whatsapp_instancias.
 * Token POR INSTÂNCIA: revogar uma CS não rotaciona o das outras três.
 * Aceitamos também `?t=` na querystring — custa três linhas e cobre o caso de
 * um proxy no caminho descartar header desconhecido.
 *
 * SEMPRE responde 200, mesmo em erro interno. Mesma disciplina de webhook-gcal:
 * um provedor que retenta em cima de um erro nosso é pior que um evento perdido
 * (o backfill e o watchdog recuperam o que faltar).
 *
 * DUPLICAÇÃO
 * Duas CS no mesmo grupo recebem o MESMO evento, com o mesmo `key.id`. Quem
 * arbitra é o UNIQUE (conversa_id, externo_id) de crm_mensagens, via
 * ON CONFLICT DO NOTHING — nunca um "select e depois insert", que dois webhooks
 * concorrentes atravessam juntos.
 */
import "jsr:@supabase/functions-js/edge-runtime.d.ts"
import { createClient, type SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2"
import { corsHeaders } from "../_shared/cors.ts"
import {
  type MensagemEvolution,
  anexoDaMensagem,
  instanteDaMensagem,
  telefoneDoJid,
  textoDaMensagem,
} from "../_shared/evolution.ts"

function ok(extra: Record<string, unknown> = {}): Response {
  return new Response(JSON.stringify({ ok: true, ...extra }), {
    status: 200,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  })
}

interface InstanciaRow {
  id: string
  mentor_id: number | null
  instancia: string
  backfill_status: string
}

/** Garante a conversa do grupo e devolve o id. Grupo desconhecido nasce órfão. */
async function conversaDoGrupo(
  db: SupabaseClient,
  grupoId: string,
  instancia: string,
): Promise<string | null> {
  const { data } = await db
    .from("crm_conversas")
    .select("id")
    .eq("grupo_id", grupoId)
    .maybeSingle<{ id: string }>()
  if (data?.id) return data.id

  // Grupo que o sync ainda não viu (criado agora, ou conversa direta).
  // Entra sem cliente: o rodapé de /crm/atendimento conta os órfãos e o
  // próximo sync de grupos resolve o vínculo.
  const { data: nova, error } = await db
    .from("crm_conversas")
    .insert({
      grupo_id: grupoId,
      grupo_nome: grupoId,
      tipo: grupoId.endsWith("@g.us") ? "grupo" : "direto",
      instancia_origem: instancia,
    })
    .select("id")
    .maybeSingle<{ id: string }>()
  if (error) {
    // Corrida com outro webhook do mesmo grupo: quem perdeu relê.
    const { data: existente } = await db
      .from("crm_conversas")
      .select("id")
      .eq("grupo_id", grupoId)
      .maybeSingle<{ id: string }>()
    return existente?.id ?? null
  }
  return nova?.id ?? null
}

async function gravarMensagem(
  db: SupabaseClient,
  inst: InstanciaRow,
  m: MensagemEvolution,
): Promise<boolean> {
  const grupoId = m?.key?.remoteJid
  const externoId = m?.key?.id
  if (!grupoId || !externoId) return false
  // Status do WhatsApp não é conversa.
  if (grupoId === "status@broadcast") return false

  const conversaId = await conversaDoGrupo(db, grupoId, inst.instancia)
  if (!conversaId) return false

  const anexo = anexoDaMensagem(m)
  const texto = textoDaMensagem(m)
  // Evento de sistema (chave de criptografia, aviso de histórico) não é mensagem.
  if (!texto && !anexo) return false

  const { error } = await db.from("crm_mensagens").upsert(
    {
      conversa_id: conversaId,
      externo_id: externoId,
      autor: m?.pushName ?? telefoneDoJid(m?.key?.participantAlt) ?? "desconhecido",
      da_cs: m?.key?.fromMe === true,
      texto,
      em: instanteDaMensagem(m),
      status_envio: m?.key?.fromMe === true ? "enviada" : "recebida",
      instancia: inst.instancia,
      autor_lid: m?.key?.participant ?? null,
      autor_jid: m?.key?.participantAlt ?? null,
      tipo: m?.messageType ?? null,
      anexo_nome: anexo?.nome ?? null,
      anexo_tipo: anexo?.tipo ?? null,
    },
    { onConflict: "conversa_id,externo_id", ignoreDuplicates: true },
  )
  if (error) {
    console.error("[crm-whatsapp-webhook] insert mensagem", error.message)
    return false
  }

  await db
    .from("crm_conversas")
    .update({ instancia_origem: inst.instancia })
    .eq("id", conversaId)
  return true
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders })
  if (req.method !== "POST") return ok({ ignorado: "método" })

  const token =
    req.headers.get("x-pmc-webhook-token") ?? new URL(req.url).searchParams.get("t") ?? ""
  if (!token) return new Response(JSON.stringify({ error: "sem token" }), { status: 401 })

  const url = Deno.env.get("SUPABASE_URL")!
  const service = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  const db = createClient(url, service, { auth: { persistSession: false } })

  const { data: inst } = await db
    .from("crm_whatsapp_instancias")
    .select("id, mentor_id, instancia, backfill_status")
    .eq("webhook_token", token)
    .maybeSingle<InstanciaRow>()
  if (!inst) return new Response(JSON.stringify({ error: "token inválido" }), { status: 401 })

  let corpo: Record<string, any>
  try {
    corpo = await req.json()
  } catch {
    return ok({ ignorado: "corpo" })
  }

  // A Evolution manda o nome da instância no payload. Se não bate com a linha
  // do token, é token reaproveitado — não processa.
  const instanciaPayload = corpo?.instance ?? corpo?.instanceName
  if (instanciaPayload && instanciaPayload !== inst.instancia) {
    return new Response(JSON.stringify({ error: "token não pertence à instância" }), { status: 401 })
  }

  const evento = String(corpo?.event ?? "").toUpperCase().replace(/\./g, "_")
  const dados = corpo?.data

  try {
    await db.from("crm_whatsapp_eventos").insert({
      instancia: inst.instancia,
      evento,
      chave: dados?.key?.id ?? null,
      payload: corpo,
    })

    const agora = new Date().toISOString()

    switch (evento) {
      case "QRCODE_UPDATED": {
        const base64 = dados?.qrcode?.base64 ?? dados?.base64
        await db
          .from("crm_whatsapp_instancias")
          .update({
            status: "aguardando_qr",
            ultimo_qr: base64
              ? base64.startsWith("data:")
                ? base64
                : `data:image/png;base64,${base64}`
              : null,
            ultimo_qr_em: agora,
            pairing_code: dados?.qrcode?.pairingCode ?? null,
            ultimo_evento_em: agora,
          })
          .eq("id", inst.id)
        return ok()
      }

      case "CONNECTION_UPDATE": {
        const estado = dados?.state ?? dados?.connection
        if (estado === "open") {
          const jid = dados?.wuid ?? dados?.ownerJid ?? null
          await db
            .from("crm_whatsapp_instancias")
            .update({
              status: "conectada",
              numero: telefoneDoJid(jid),
              owner_jid: jid,
              conectado_em: agora,
              ultimo_qr: null,
              pairing_code: null,
              erro: null,
              ultimo_evento_em: agora,
            })
            .eq("id", inst.id)

          // Espelha o número em crm_cs_config, que é de onde a aba Time lê.
          if (inst.mentor_id && telefoneDoJid(jid)) {
            await db
              .from("crm_cs_config")
              .upsert(
                { mentor_id: inst.mentor_id, whatsapp_numero: telefoneDoJid(jid) },
                { onConflict: "mentor_id" },
              )
          }

          // Primeira conexão: puxa o histórico recente sem travar o webhook.
          if (inst.backfill_status === "pendente") {
            const cron = Deno.env.get("CRON_INVOKE_TOKEN")
            if (cron) {
              fetch(`${url}/functions/v1/crm-whatsapp-backfill`, {
                method: "POST",
                headers: { Authorization: `Bearer ${cron}`, "Content-Type": "application/json" },
                body: JSON.stringify({ instancia: inst.instancia }),
              }).catch(() => {})
            }
          }
        } else if (estado === "close") {
          await db
            .from("crm_whatsapp_instancias")
            .update({
              status: "desconectada",
              desconectado_em: agora,
              ultimo_evento_em: agora,
            })
            .eq("id", inst.id)
        } else {
          await db
            .from("crm_whatsapp_instancias")
            .update({ status: "conectando", ultimo_evento_em: agora })
            .eq("id", inst.id)
        }
        return ok()
      }

      case "MESSAGES_UPSERT":
      case "SEND_MESSAGE": {
        // A Evolution manda ora um objeto, ora {messages:[...]}.
        const lista: MensagemEvolution[] = Array.isArray(dados)
          ? dados
          : Array.isArray(dados?.messages)
            ? dados.messages
            : dados
              ? [dados]
              : []
        let gravadas = 0
        for (const m of lista) {
          if (await gravarMensagem(db, inst, m)) gravadas++
        }
        await db
          .from("crm_whatsapp_instancias")
          .update({ ultimo_evento_em: agora })
          .eq("id", inst.id)
        return ok({ gravadas })
      }

      case "LOGOUT_INSTANCE":
      case "REMOVE_INSTANCE": {
        await db
          .from("crm_whatsapp_instancias")
          .update({ status: "desconectada", desconectado_em: agora, ultimo_evento_em: agora })
          .eq("id", inst.id)
        return ok()
      }

      default:
        return ok({ ignorado: evento })
    }
  } catch (e) {
    console.error("[crm-whatsapp-webhook]", evento, e)
    return ok({ erro: String((e as Error)?.message ?? e) })
  }
})
