/**
 * CRM — sincroniza os grupos de WhatsApp e vincula cada um à sua empresa.
 *
 * Lê a lista de grupos pela instância de DIRETÓRIO (o número de automação, que
 * está em todos os grupos) e, do nome de cada grupo, extrai o código do cliente.
 * O nome segue "<Empresa> - PMC <código>" com uma dúzia de variações; a regra
 * está em _shared/evolution.ts e foi medida contra os 322 clientes do PROD.
 *
 * Escreve em três lugares, nesta ordem:
 *   1. crm_whatsapp_grupos      — o diretório cru, com o código detectado.
 *   2. crm_conversas            — a conversa que a aba /crm/atendimento mostra.
 *   3. clientes_entrada_new     — whatsapp_grupo_id/_nome do cliente.
 *
 * Idempotente: rodar duas vezes não muda nada. Uma linha marcada
 * `vinculo_origem='manual'` nunca é sobrescrita — corrigir um grupo à mão é
 * decisão humana, e renomear o grupo no WhatsApp não pode desfazê-la.
 *
 * `{"simular": true}` devolve o diagnóstico sem escrever nada.
 *
 * Autorização: Bearer CRON_INVOKE_TOKEN ou JWT de admin. Mesmo padrão de
 * enviar-mensagens/index.ts — por isso verify_jwt=false em config.toml.
 */
import "jsr:@supabase/functions-js/edge-runtime.d.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"
import { corsHeaders, jsonResponse } from "../_shared/cors.ts"
import {
  INSTANCIA_DIRETORIO,
  codigoDoGrupo,
  evolutionConfigurada,
  grupoInterno,
  listarGrupos,
} from "../_shared/evolution.ts"

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

interface ClienteRow {
  codigo_cliente: number | null
  id_cliente: string | null
  nome_empresa: string | null
  sc: string | null
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
    return jsonResponse(
      { error: "EVOLUTION_URL / EVOLUTION_APIKEY / EVOLUTION_INSTANCE_DIRETORIO não configurados" },
      500,
    )
  }

  let simular = false
  try {
    const body = await req.json()
    simular = body?.simular === true
  } catch { /* corpo vazio é run real */ }

  const db = createClient(url, service, { auth: { persistSession: false } })

  try {
    const grupos = await listarGrupos(INSTANCIA_DIRETORIO)

    // Clientes por código. clientes_entrada_new é o registro operacional (traz
    // a CS em `sc`); codigo_cliente é único em clientes_formulario.
    const { data: clientes, error: errCli } = await db
      .from("clientes_entrada_new")
      .select("codigo_cliente, id_cliente, nome_empresa, sc")
    if (errCli) throw errCli

    const porCodigo = new Map<number, ClienteRow>()
    for (const c of (clientes ?? []) as ClienteRow[]) {
      if (c.codigo_cliente != null) porCodigo.set(Number(c.codigo_cliente), c)
    }

    // O que já está travado à mão não pode ser tocado.
    const { data: existentes, error: errEx } = await db
      .from("crm_whatsapp_grupos")
      .select("grupo_id, vinculo_origem, id_cliente")
    if (errEx) throw errEx
    const manuais = new Set(
      (existentes ?? []).filter((g) => g.vinculo_origem === "manual").map((g) => g.grupo_id),
    )
    const clientePorGrupo = new Map(
      (existentes ?? []).map((g) => [g.grupo_id as string, g.id_cliente as string | null]),
    )

    const linhasGrupo: Record<string, unknown>[] = []
    const linhasConversa: Record<string, unknown>[] = []
    const semVinculo: string[] = []
    const internos: string[] = []
    // Grupo que já tinha cliente e cujo código mudou (renome no WhatsApp).
    // Relatamos em vez de aplicar: trocar o dono de uma conversa em silêncio é
    // pior do que deixar o vínculo velho de pé até alguém olhar.
    const trocaDeCliente: string[] = []
    const agora = new Date().toISOString()

    for (const g of grupos) {
      if (manuais.has(g.id)) continue
      const subject = (g.subject ?? "").trim()
      const interno = grupoInterno(subject)
      const { codigo, regra } = codigoDoGrupo(subject)
      const cliente = codigo != null ? porCodigo.get(codigo) : undefined

      if (interno) internos.push(subject)
      else if (!cliente) semVinculo.push(subject)

      const anterior = clientePorGrupo.get(g.id)
      if (anterior && cliente?.id_cliente && anterior !== cliente.id_cliente) {
        trocaDeCliente.push(`${subject} (${anterior} -> ${cliente.id_cliente})`)
        continue
      }

      linhasGrupo.push({
        grupo_id: g.id,
        subject,
        tamanho: g.size ?? null,
        codigo_detectado: codigo,
        regra,
        interno,
        id_cliente: cliente?.id_cliente ?? null,
        vinculo_origem: cliente ? "codigo" : interno ? "interno" : "nenhum",
        visto_em: agora,
      })

      linhasConversa.push({
        grupo_id: g.id,
        grupo_nome: subject,
        id_cliente: cliente?.id_cliente ?? null,
        codigo_cliente: cliente?.codigo_cliente ?? null,
        cs_responsavel: cliente?.sc?.trim() ?? null,
        interno,
        tipo: "grupo",
        participantes: g.size ?? null,
        sincronizado_em: agora,
      })
    }

    const diagnostico = {
      instancia_diretorio: INSTANCIA_DIRETORIO,
      grupos: grupos.length,
      vinculados: linhasConversa.filter((l) => l.id_cliente).length,
      internos: internos.length,
      sem_vinculo: semVinculo.length,
      travados_manual: manuais.size,
      troca_de_cliente_ignorada: trocaDeCliente,
      grupos_sem_vinculo: semVinculo,
      grupos_internos: internos,
    }

    if (simular) return jsonResponse({ simulado: true, ...diagnostico })

    // Upserts em lote. `ignoreDuplicates: false` = atualiza a linha existente.
    const { error: errG } = await db
      .from("crm_whatsapp_grupos")
      .upsert(linhasGrupo, { onConflict: "grupo_id" })
    if (errG) throw errG

    const { error: errC } = await db
      .from("crm_conversas")
      .upsert(linhasConversa, { onConflict: "grupo_id" })
    if (errC) throw errC

    // Espelha o vínculo no cliente. Um update por cliente: são ~220 linhas e o
    // PostgREST não faz update em massa com valor diferente por linha.
    let clientesAtualizados = 0
    for (const l of linhasConversa) {
      if (!l.id_cliente) continue
      const { error } = await db
        .from("clientes_entrada_new")
        .update({ whatsapp_grupo_id: l.grupo_id, whatsapp_grupo_nome: l.grupo_nome })
        .eq("id_cliente", l.id_cliente as string)
      if (error) throw error
      clientesAtualizados++
    }

    return jsonResponse({ ok: true, ...diagnostico, clientes_atualizados: clientesAtualizados })
  } catch (e) {
    console.error("[crm-whatsapp-sync-grupos]", e)
    return jsonResponse({ error: String((e as Error)?.message ?? e) }, 500)
  }
})
