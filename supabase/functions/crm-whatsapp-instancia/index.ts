/**
 * CRM — ciclo de vida da instância de WhatsApp de cada Sucesso do Cliente.
 *
 * Cada CS conecta o PRÓPRIO número: escaneia o QR na tela /crm/whatsapp e a
 * gente cria, na Evolution, uma instância Baileys só dela. É por ela que o
 * sistema lê e responde os grupos da carteira — mensagem enviada sai do número
 * da CS, não de um número genérico.
 *
 * Uma CS só age sobre a própria instância. Papel "full" (coordenação) pode
 * passar `mentor_id` e operar a de outra pessoa — é quem destrava uma CS que
 * perdeu o acesso.
 *
 * `desconectar` faz logout, nunca delete: a linha e o histórico têm de
 * sobreviver a uma queda de sessão. `excluir` existe, é só para papel full.
 */
import "jsr:@supabase/functions-js/edge-runtime.d.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"
import { corsHeaders, jsonResponse } from "../_shared/cors.ts"
import {
  EvolutionError,
  conectarInstancia,
  criarInstancia,
  deletarInstancia,
  estadoInstancia,
  evolutionConfigurada,
  logoutInstancia,
  nomeInstanciaDeMentor,
  statusDoEstado,
} from "../_shared/evolution.ts"

type Acao = "criar_conectar" | "qr" | "estado" | "desconectar" | "excluir"

interface InstanciaRow {
  id: string
  mentor_id: number | null
  instancia: string
  status: string
  webhook_token: string
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders })
  if (req.method !== "POST") return jsonResponse({ error: "Método não permitido" }, 405)

  const url = Deno.env.get("SUPABASE_URL")!
  const anon = Deno.env.get("SUPABASE_ANON_KEY")!
  const service = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  const authHeader = req.headers.get("Authorization") ?? ""

  if (!evolutionConfigurada()) {
    return jsonResponse({ error: "EVOLUTION_URL / EVOLUTION_APIKEY não configurados" }, 500)
  }

  const caller = createClient(url, anon, {
    global: { headers: { Authorization: authHeader } },
    auth: { persistSession: false },
  })
  const db = createClient(url, service, { auth: { persistSession: false } })

  try {
    const { data: userData } = await caller.auth.getUser()
    if (!userData?.user?.id) return jsonResponse({ error: "não autenticado" }, 401)

    const [{ data: meuMentorId }, { data: eFull }] = await Promise.all([
      caller.rpc("crm_meu_mentor_id"),
      caller.rpc("crm_ve_todas_carteiras"),
    ])
    if (!meuMentorId) return jsonResponse({ error: "não é membro do time" }, 403)

    const body = await req.json().catch(() => ({}))
    const acao = (body?.acao ?? "estado") as Acao
    const alvoId = Number(body?.mentor_id ?? meuMentorId)

    if (alvoId !== Number(meuMentorId) && eFull !== true) {
      return jsonResponse({ error: "só a coordenação opera a instância de outra pessoa" }, 403)
    }
    if (acao === "excluir" && eFull !== true) {
      return jsonResponse({ error: "excluir instância é restrito à coordenação" }, 403)
    }

    const { data: mentor, error: errM } = await db
      .from("mentores")
      .select("id, nome")
      .eq("id", alvoId)
      .maybeSingle<{ id: number; nome: string | null }>()
    if (errM) throw errM
    if (!mentor) return jsonResponse({ error: "membro do time não encontrado" }, 404)

    // A linha é a fonte do nome da instância e do token do webhook. Criar aqui
    // (e não na Evolution primeiro) garante que o token existe antes de ser
    // usado na configuração do webhook.
    let { data: linha } = await db
      .from("crm_whatsapp_instancias")
      .select("id, mentor_id, instancia, status, webhook_token")
      .eq("mentor_id", alvoId)
      .eq("papel", "cs")
      .maybeSingle<InstanciaRow>()

    if (!linha) {
      if (acao !== "criar_conectar") return jsonResponse({ instancia: null })
      const nome = nomeInstanciaDeMentor(mentor.nome ?? "", alvoId)
      const { data: nova, error } = await db
        .from("crm_whatsapp_instancias")
        .insert({ mentor_id: alvoId, instancia: nome, papel: "cs", status: "criada" })
        .select("id, mentor_id, instancia, status, webhook_token")
        .single<InstanciaRow>()
      if (error) throw error
      linha = nova
    }

    const webhookUrl = `${url}/functions/v1/crm-whatsapp-webhook`
    const patch: Record<string, unknown> = { updated_at: new Date().toISOString() }

    switch (acao) {
      case "criar_conectar": {
        let conexao
        try {
          conexao = await criarInstancia(linha.instancia, webhookUrl, linha.webhook_token)
        } catch (e) {
          // 403 "already in use": a instância já existe na Evolution (a CS já
          // conectou antes, ou uma tentativa anterior morreu no meio).
          if (!(e instanceof EvolutionError) || e.status !== 403) throw e
          conexao = await conectarInstancia(linha.instancia)
        }
        Object.assign(patch, {
          status: conexao.qr ? "aguardando_qr" : "conectando",
          ultimo_qr: conexao.qr,
          ultimo_qr_em: conexao.qr ? new Date().toISOString() : null,
          pairing_code: conexao.pairingCode,
          erro: null,
        })
        break
      }
      case "qr": {
        // Já conectada não tem QR: perguntar de novo derrubaria a sessão.
        const estado = await estadoInstancia(linha.instancia)
        if (estado === "open") {
          Object.assign(patch, { status: "conectada", ultimo_qr: null, pairing_code: null })
          break
        }
        const conexao = await conectarInstancia(linha.instancia)
        Object.assign(patch, {
          status: conexao.qr ? "aguardando_qr" : "conectando",
          ultimo_qr: conexao.qr,
          ultimo_qr_em: conexao.qr ? new Date().toISOString() : null,
          pairing_code: conexao.pairingCode,
        })
        break
      }
      case "estado": {
        const estado = await estadoInstancia(linha.instancia)
        Object.assign(patch, { status: statusDoEstado(estado) })
        break
      }
      case "desconectar": {
        await logoutInstancia(linha.instancia).catch(() => {})
        Object.assign(patch, {
          status: "desconectada",
          desconectado_em: new Date().toISOString(),
          ultimo_qr: null,
          pairing_code: null,
        })
        break
      }
      case "excluir": {
        await deletarInstancia(linha.instancia).catch(() => {})
        await db.from("crm_whatsapp_instancias").delete().eq("id", linha.id)
        return jsonResponse({ ok: true, excluida: linha.instancia })
      }
      default:
        return jsonResponse({ error: `ação desconhecida: ${acao}` }, 400)
    }

    const { data: atualizada, error: errU } = await db
      .from("crm_whatsapp_instancias")
      .update(patch)
      .eq("id", linha.id)
      .select(
        "id, mentor_id, instancia, papel, numero, status, ultimo_qr, ultimo_qr_em, " +
          "pairing_code, conectado_em, desconectado_em, erro, backfill_status, backfill_cursor",
      )
      .single()
    if (errU) throw errU

    return jsonResponse({ ok: true, instancia: atualizada })
  } catch (e) {
    console.error("[crm-whatsapp-instancia]", e)
    return jsonResponse({ error: String((e as Error)?.message ?? e) }, 500)
  }
})
