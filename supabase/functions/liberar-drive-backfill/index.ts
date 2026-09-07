// Backfill: libera "qualquer pessoa com o link" nos arquivos do Drive que já estão
// referenciados no banco (link_gravacao / link_geminidoc) mas nasceram privados.
//
// Feito como edge function e não como script Node porque a auth da service account
// (getAccessTokenAs, JWT RS256) só existe aqui no Deno.
//
// Operação de mão única: invocada manualmente, sem cron. Processa em lotes para não
// bater no timeout da edge function nem no rate limit da Drive API. Chame repetido,
// seguindo `proxima_chamada`, até `concluido: true`.
//
//   curl -X POST "$URL/functions/v1/liberar-drive-backfill?tabela=reunioes_galdino&offset=0&limite=40" \
//        -H "Authorization: Bearer $CRON_INVOKE_TOKEN"

import "jsr:@supabase/functions-js/edge-runtime.d.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"
import { corsHeaders, jsonResponse } from "../_shared/cors.ts"
import { extrairFileIdDaUrl } from "../_shared/google-drive.ts"
import { buscarContasCandidatas, garantirPublico } from "../_shared/drive-publico.ts"

// Ordem fixa: o cliente do backfill anda por ela em sequência.
const TABELAS = [
  "reunioes_galdino",
  "reunioes_mentoria_new",
  "reunioes_blackcrm",
  "encontros_ao_vivo",
] as const
type Tabela = typeof TABELAS[number]

// 40 linhas ≈ 80 arquivos ≈ 60s de execução (2 chamadas HTTP por arquivo + throttle),
// bem dentro do timeout da edge function. São ~3.300 arquivos no PROD, ou ~85 lotes.
const LIMITE_PADRAO = 40
const LIMITE_MAX = 120
// Espaço entre chamadas à Drive API. O limite prático é por usuário impersonado;
// 120ms segura o backfill bem abaixo dele sem arrastar demais o lote.
const THROTTLE_MS = 120

const sleep = (ms: number) => new Promise(r => setTimeout(r, ms))

function autorizadoPorCron(req: Request): boolean {
  const expected = Deno.env.get("CRON_INVOKE_TOKEN")
  if (!expected) return false
  return (req.headers.get("Authorization") ?? "") === `Bearer ${expected}`
}

async function isAdminUser(supabaseAdmin: any, supabaseUrl: string, anonKey: string, jwt: string): Promise<boolean> {
  const supabaseAsUser = createClient(supabaseUrl, anonKey, {
    global: { headers: { Authorization: `Bearer ${jwt}` } },
    auth: { persistSession: false },
  })
  const { data: { user } } = await supabaseAsUser.auth.getUser()
  if (!user?.email) return false
  const { data: mentor } = await supabaseAdmin
    .from("mentores")
    .select("id")
    .eq("email", user.email)
    .maybeSingle()
  return !!mentor
}

// email_calendar do consultor que conduziu a reunião — a conta mais provável de ser
// dona do arquivo, tentada antes do fallback pelas demais caixas do workspace.
async function buscarMapaConsultores(supabase: any): Promise<Map<string, string>> {
  const { data } = await supabase
    .from("consultores_atendimento")
    .select("nome, email_calendar, tabela_destino")
  const map = new Map<string, string>()
  for (const c of (data ?? [])) {
    if (c.email_calendar) map.set(`${c.tabela_destino}|${c.nome}`, c.email_calendar)
  }
  return map
}

function colunaConsultor(tabela: Tabela): string | null {
  if (tabela === "reunioes_mentoria_new") return "mentor"
  if (tabela === "reunioes_blackcrm") return "responsavel"
  return null // reunioes_galdino é sempre "Galdino"; encontros_ao_vivo não tem consultor
}

function contaPreferidaDaLinha(
  tabela: Tabela,
  linha: Record<string, unknown>,
  mapa: Map<string, string>,
): string | null {
  if (tabela === "reunioes_galdino") return mapa.get("reunioes_galdino|Galdino") ?? null
  const col = colunaConsultor(tabela)
  if (!col) return null
  const nome = linha[col]
  if (typeof nome !== "string" || !nome) return null
  return mapa.get(`${tabela}|${nome}`) ?? null
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders })
  }
  if (req.method !== "POST") {
    return jsonResponse({ error: "Método não permitido" }, 405)
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!
  const supabase = createClient(supabaseUrl, serviceKey, { auth: { persistSession: false } })

  let viaCron = autorizadoPorCron(req)
  let viaAdmin = false
  if (!viaCron) {
    const auth = req.headers.get("Authorization") ?? ""
    if (auth.startsWith("Bearer ")) {
      viaAdmin = await isAdminUser(supabase, supabaseUrl, anonKey, auth.slice(7))
    }
  }
  if (!viaCron && !viaAdmin) {
    return jsonResponse({ error: "Não autorizado" }, 401)
  }

  const url = new URL(req.url)
  const tabelaParam = url.searchParams.get("tabela") as Tabela | null
  const tabela: Tabela = TABELAS.includes(tabelaParam as Tabela) ? (tabelaParam as Tabela) : TABELAS[0]
  const offset = Math.max(0, Number(url.searchParams.get("offset") ?? 0) || 0)
  const limite = Math.min(LIMITE_MAX, Math.max(1, Number(url.searchParams.get("limite") ?? LIMITE_PADRAO) || LIMITE_PADRAO))

  const col = colunaConsultor(tabela)
  const select = `id_unico, link_gravacao, link_geminidoc${col ? `, ${col}` : ""}`

  // Só linhas que têm algum link. `count: exact` dá o total pra calcular `restantes`.
  const { data, error, count } = await supabase
    .from(tabela)
    .select(select, { count: "exact" })
    .or("link_gravacao.not.is.null,link_geminidoc.not.is.null")
    .order("id_unico", { ascending: true })
    .range(offset, offset + limite - 1)

  if (error) {
    return jsonResponse({ error: `select ${tabela}: ${error.message}` }, 500)
  }

  // `select` é montado dinamicamente (coluna do consultor varia por tabela), então o
  // supabase-js não consegue inferir a forma da linha.
  const linhas = (data ?? []) as unknown as Array<Record<string, unknown>>
  const candidatas = await buscarContasCandidatas(supabase)
  const mapaConsultores = await buscarMapaConsultores(supabase)

  const stats = {
    tabela,
    offset,
    linhas: linhas.length,
    arquivos: 0,
    liberados: 0,
    ja_eram: 0,
    pulados: 0,
    falhas: 0,
    erros: [] as Array<{ file_id: string; erro: string }>,
  }

  for (const linha of linhas) {
    const preferida = contaPreferidaDaLinha(tabela, linha, mapaConsultores)
    const arquivos: Array<[string | null, "gravacao" | "geminidoc"]> = [
      [extrairFileIdDaUrl(linha.link_gravacao as string | null), "gravacao"],
      [extrairFileIdDaUrl(linha.link_geminidoc as string | null), "geminidoc"],
    ]
    for (const [fileId, origem] of arquivos) {
      if (!fileId) continue
      stats.arquivos++
      const res = await garantirPublico(supabase, fileId, origem, preferida, candidatas)
      if (res.pulado) {
        stats.pulados++
        continue // já liberado antes ou estourou MAX_TENTATIVAS: não gastou chamada
      }
      if (res.ok) {
        if (res.jaEra) stats.ja_eram++
        else stats.liberados++
      } else {
        stats.falhas++
        if (stats.erros.length < 10) stats.erros.push({ file_id: fileId, erro: (res.erro ?? "?").slice(0, 200) })
      }
      await sleep(THROTTLE_MS)
    }
  }

  const total = count ?? 0
  const proximoOffset = offset + linhas.length
  const acabouTabela = linhas.length === 0 || proximoOffset >= total
  const idxTabela = TABELAS.indexOf(tabela)
  const proximaTabela = acabouTabela ? TABELAS[idxTabela + 1] ?? null : tabela
  const concluido = acabouTabela && proximaTabela === null

  return jsonResponse({
    ok: true,
    ...stats,
    total_na_tabela: total,
    restantes_na_tabela: Math.max(0, total - proximoOffset),
    concluido,
    proxima_chamada: concluido
      ? null
      : `?tabela=${proximaTabela}&offset=${acabouTabela ? 0 : proximoOffset}&limite=${limite}`,
  })
})
