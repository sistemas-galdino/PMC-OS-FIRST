// inteligencia-nicho — a IA que aprende os gargalos de cada nicho.
//
// Duas operações, ambas restritas ao time (nunca chamadas por cliente):
//
//   acao: "classificar"  Lê os gargalos ainda sem assinatura, manda o TEXTO para
//                        o modelo junto com o catálogo aprovado e recebe de volta
//                        a chave da assinatura. Quando nada encaixa, o modelo
//                        propõe uma assinatura nova — que entra como 'emergente'
//                        e NÃO aprovada, para curadoria humana.
//
//   acao: "semear"       Gera o catálogo de referência de um nicho (os gargalos
//                        típicos do setor), para resolver a partida a frio
//                        enquanto não há massa de dado real. Entra como
//                        'referencia' e NÃO aprovada.
//
// Por que nada entra aprovado: uma assinatura errada contamina a contagem de
// todo o nicho, e o erro só aparece depois, já publicado para os clientes.
//
// Fronteira de privacidade: o texto dos gargalos é lido aqui (service_role) só
// para produzir o RÓTULO. Nada do texto é gravado fora de metodo_gargalos, e a
// resposta desta função devolve apenas contagens — nunca o conteúdo de uma
// empresa. Os itens vão para o modelo sem id, sem nome de empresa e sem nicho.
import "jsr:@supabase/functions-js/edge-runtime.d.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"
import { corsHeaders, jsonResponse } from "../_shared/cors.ts"

const MAX_TOKENS = 4000
const LLM_TIMEOUT_MS = 110_000
// Lote pequeno de propósito: cabe no contexto com o catálogo inteiro junto e
// mantém a chamada bem abaixo do teto de wall-clock da edge function.
const LOTE_PADRAO = 25

function resolveLLM(): { key: string; base: string; model: string; lovable: boolean } | null {
  const lovable = Deno.env.get("LOVABLE_API_KEY")
  if (lovable) {
    return {
      key: lovable,
      base: Deno.env.get("LLM_BASE_URL") ?? "https://ai.gateway.lovable.dev/v1",
      model: Deno.env.get("LLM_MODEL") ?? "google/gemini-3-flash-preview",
      lovable: true,
    }
  }
  const openai = Deno.env.get("OPENAI_API_KEY") ?? Deno.env.get("LLM_API_KEY")
  if (openai) {
    return {
      key: openai,
      base: Deno.env.get("LLM_BASE_URL") ?? "https://api.openai.com/v1",
      model: Deno.env.get("LLM_MODEL") ?? "gpt-4o-mini",
      lovable: false,
    }
  }
  return null
}

async function callLLM(prompt: string): Promise<string> {
  const p = resolveLLM()
  if (!p) throw new Error("Nenhuma chave de IA configurada nos secrets do Supabase.")
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), LLM_TIMEOUT_MS)
  try {
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${p.key}`,
    }
    if (p.lovable) {
      headers["Lovable-API-Key"] = p.key
      headers["X-Lovable-AIG-SDK"] = "pmc-edge"
    }
    const res = await fetch(`${p.base}/chat/completions`, {
      method: "POST",
      headers,
      body: JSON.stringify({
        model: p.model,
        messages: [{ role: "user", content: prompt }],
        // Classificação quer consistência, não criatividade.
        temperature: 0.1,
        max_tokens: MAX_TOKENS,
        response_format: { type: "json_object" },
      }),
      signal: controller.signal,
    })
    if (!res.ok) throw new Error(`${res.status} ${await res.text().catch(() => "")}`)
    const data = await res.json()
    return data?.choices?.[0]?.message?.content ?? ""
  } finally {
    clearTimeout(timeout)
  }
}

function extrairJson(texto: string): Record<string, unknown> {
  let limpo = texto.trim().replace(/^```(?:json)?\s*/i, "").replace(/```$/i, "").trim()
  const i = limpo.indexOf("{")
  const f = limpo.lastIndexOf("}")
  if (i >= 0 && f > i) limpo = limpo.slice(i, f + 1)
  try {
    return JSON.parse(limpo)
  } catch {
    return JSON.parse(limpo.replace(/,\s*}/g, "}").replace(/,\s*]/g, "]"))
  }
}

async function gerarJson(prompt: string, tentativas = 3): Promise<Record<string, unknown>> {
  let ultimo: unknown
  for (let i = 0; i < tentativas; i++) {
    const cru = await callLLM(prompt)
    try {
      return extrairJson(cru)
    } catch (e) { ultimo = e }
  }
  throw new Error(`A IA não devolveu JSON válido: ${ultimo}`)
}

/** Slug estável para a chave da assinatura. */
function slug(texto: string): string {
  return texto
    .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 60)
}

const AREAS = ["Marketing", "Comercial", "Financeiro", "Operações", "Administrativo", "RH", "Atendimento", "Compras / Estoque", "Gestão", "Outro"]
const IMPACTOS = ["Tempo", "Custo", "Retrabalho", "Produtividade", "Processo manual", "Dependência de pessoas", "Dados descentralizados", "Falta de integração", "Tomada de decisão", "Escalabilidade", "Atrasos", "Vendas / Conversão"]
const FERRAMENTAS = ["Excel", "Google Sheets", "WhatsApp", "ERP", "E-mail", "Word", "CRM", "ChatGPT", "Claude", "Sistema interno", "Outro"]

interface Assinatura { chave: string; titulo: string; descricao: string | null }

function promptClassificar(catalogo: Assinatura[], itens: { ref: number; texto: string }[]): string {
  return `Você classifica gargalos operacionais de empresas em um catálogo canônico.

CATÁLOGO ATUAL (use a chave EXATA):
${catalogo.length === 0 ? "(vazio — todo item vai gerar proposta nova)" : catalogo.map((a) => `- ${a.chave}: ${a.titulo}${a.descricao ? ` — ${a.descricao}` : ""}`).join("\n")}

ITENS PARA CLASSIFICAR:
${itens.map((i) => `[${i.ref}] ${i.texto}`).join("\n")}

REGRAS:
1. Para cada item, escolha a chave do catálogo que descreve O MESMO problema operacional.
   "Montagem manual de propostas" e "Fazer orçamento no Word" são o MESMO gargalo.
2. Só use uma chave se a correspondência for clara. Na dúvida, proponha uma nova.
3. Ao propor uma nova, descreva o PADRÃO GENÉRICO do problema (serve para qualquer
   empresa), nunca o caso específico. Sem nome de empresa, pessoa, produto ou cidade.
4. A nova chave deve ser um slug curto em minúsculas com hífens, ex.: conferencia-estoque-manual.
5. Itens diferentes que descrevem o mesmo problema novo devem receber a MESMA chave nova.

Responda SOMENTE com JSON:
{
  "classificacoes": [{"ref": 1, "chave": "slug-existente-ou-novo"}],
  "novas": [{
    "chave": "slug-novo",
    "titulo": "Nome curto do gargalo (padrão genérico)",
    "descricao": "1 frase explicando o padrão",
    "area_sugerida": "uma de: ${AREAS.join(" | ")}",
    "impactos_sugeridos": ["até 3 de: ${IMPACTOS.join(" | ")}"],
    "ferramentas_tipicas": ["até 3 de: ${FERRAMENTAS.join(" | ")}"],
    "horas_mes_tipicas": 10
  }]
}`
}

function promptSemear(nicho: string, quantidade: number, existentes: string[]): string {
  return `Você é analista de operações do Método MC e conhece a rotina real de empresas brasileiras.

NICHO: ${nicho}

Liste os ${quantidade} gargalos operacionais MAIS COMUNS em empresas deste nicho —
processos manuais e repetitivos que consomem horas do time todo mês e que a IA
consegue substituir ou reduzir.

PELO MENOS METADE da lista precisa ser ESPECÍFICA deste nicho: um processo que
existe por causa da natureza do negócio (em Saúde, "agendamento de consultas";
em Agronegócio, "apontamento de aplicação no talhão"). Gargalos que qualquer
empresa tem — pagamentos, folha, fornecedores — são permitidos, mas devem vir
marcados com "universal": true.

${existentes.length ? `JÁ EXISTEM no catálogo:
${existentes.map((e) => `- ${e}`).join("\n")}

Se um gargalo deste nicho for O MESMO que um da lista acima, REUSE a chave exata
dele em vez de criar outra — é assim que o catálogo reconhece que o gargalo vale
para os dois nichos. Só crie chave nova para um problema realmente diferente.` : ""}

REGRAS:
1. Fale do PADRÃO do setor, nunca de uma empresa específica. Sem nome, marca ou cidade.
2. Cada gargalo deve ser um processo concreto e reconhecível por quem trabalha no setor
   ("conferência manual de estoque"), não uma categoria vaga ("problemas de gestão").
3. horas_mes_tipicas: estime para uma empresa de PORTE MÉDIO (10 a 50 funcionários),
   somando o tempo de todas as pessoas envolvidas. Seja CONSERVADOR — este número
   vira a referência que o cliente vê na tela, e um valor inflado destrói a
   credibilidade no instante em que ele compara com a realidade dele. Um único
   processo raramente passa de 25h/mês; acima disso, só com motivo claro.
4. Ordene do mais comum para o menos comum.

Responda SOMENTE com JSON:
{
  "gargalos": [{
    "chave": "slug-curto-com-hifens",
    "titulo": "Nome do gargalo",
    "descricao": "1 frase: como o processo funciona hoje e por que trava",
    "area_sugerida": "uma de: ${AREAS.join(" | ")}",
    "impactos_sugeridos": ["até 3 de: ${IMPACTOS.join(" | ")}"],
    "ferramentas_tipicas": ["até 3 de: ${FERRAMENTAS.join(" | ")}"],
    "horas_mes_tipicas": 12,
    "universal": false
  }]
}`
}

/** Mantém só os valores das listas fechadas — o modelo às vezes inventa rótulo. */
function filtrar(valores: unknown, permitidos: string[], max: number): string[] {
  if (!Array.isArray(valores)) return []
  return valores.map(String).filter((v) => permitidos.includes(v)).slice(0, max)
}

function normalizarAssinatura(bruto: Record<string, unknown>, nichosAlvo: string[]) {
  const chave = slug(String(bruto.chave ?? bruto.titulo ?? ""))
  if (!chave) return null
  const titulo = String(bruto.titulo ?? "").trim()
  if (!titulo) return null
  const horas = Number(bruto.horas_mes_tipicas)
  return {
    chave,
    titulo: titulo.slice(0, 120),
    descricao: bruto.descricao ? String(bruto.descricao).slice(0, 400) : null,
    area_sugerida: AREAS.includes(String(bruto.area_sugerida)) ? String(bruto.area_sugerida) : null,
    impactos_sugeridos: filtrar(bruto.impactos_sugeridos, IMPACTOS, 3),
    ferramentas_tipicas: filtrar(bruto.ferramentas_tipicas, FERRAMENTAS, 3),
    horas_mes_tipicas: Number.isFinite(horas) && horas > 0 ? Math.min(horas, 400) : null,
    // Array vazio = vale para qualquer nicho. É o que impede o mesmo gargalo
    // genérico de ser recriado 25 vezes, um por nicho.
    nichos_alvo: bruto.universal === true ? [] : nichosAlvo,
  }
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

    // Autorização: esta função lê o texto de gargalos de TODAS as empresas com
    // service_role. Só o time entra — e a checagem é feita aqui, com o token do
    // chamador, não confiando em nada que venha no corpo.
    const { data: userData, error: uErr } = await caller.auth.getUser()
    const user = userData?.user
    if (uErr || !user?.email) return jsonResponse({ error: "não autenticado" }, 401)
    const { data: mentor } = await admin.from("mentores").select("email").eq("email", user.email).maybeSingle()
    if (!mentor) return jsonResponse({ error: "apenas o time pode operar a inteligência de nicho" }, 403)

    const body = await req.json().catch(() => ({}))
    const acao = String(body.acao ?? "")

    // Catálogo aprovado — o vocabulário que a IA pode usar.
    const { data: catalogoData } = await admin
      .from("gargalos_assinaturas")
      .select("chave, titulo, descricao")
      .eq("aprovado", true)
      .order("chave")
    const catalogo = (catalogoData ?? []) as Assinatura[]

    // ---------------------------------------------------------------------
    if (acao === "classificar") {
      const limite = Math.min(Number(body.limite) || LOTE_PADRAO, 50)
      const { data: pendentes } = await admin
        .from("metodo_gargalos")
        .select("id, processo, descricao")
        .is("assinatura_id", null)
        .order("created_at", { ascending: true })
        .limit(limite)

      const itens = (pendentes ?? []).map((g, i) => ({
        ref: i,
        id: g.id as string,
        // Só processo + descrição vão para o modelo. Sem id, sem empresa, sem nicho.
        texto: `${g.processo}${g.descricao ? ` — ${g.descricao}` : ""}`.slice(0, 400),
      }))
      if (itens.length === 0) return jsonResponse({ acao, pendentes: 0, classificados: 0, novas: 0 })

      const out = await gerarJson(promptClassificar(catalogo, itens.map(({ ref, texto }) => ({ ref, texto }))))

      // Assinaturas novas entram primeiro (não aprovadas), para que a
      // classificação possa apontar para elas.
      const novas = Array.isArray(out.novas) ? out.novas as Record<string, unknown>[] : []
      const paraInserir = novas
        .map((n) => normalizarAssinatura(n, []))
        .filter((n): n is NonNullable<typeof n> => n !== null)
      if (paraInserir.length > 0) {
        await admin.rpc("registrar_assinaturas", { itens: paraInserir, p_origem: "emergente" })
      }

      // Mapa chave -> id, agora incluindo as recém-criadas.
      const chaves = [...new Set([
        ...catalogo.map((c) => c.chave),
        ...paraInserir.map((n) => n.chave),
      ])]
      const { data: todas } = await admin
        .from("gargalos_assinaturas").select("id, chave").in("chave", chaves)
      const idPorChave = new Map((todas ?? []).map((a) => [a.chave as string, a.id as string]))

      const classificacoes = Array.isArray(out.classificacoes) ? out.classificacoes as Record<string, unknown>[] : []
      let ok = 0
      for (const c of classificacoes) {
        const item = itens.find((i) => i.ref === Number(c.ref))
        const assinaturaId = idPorChave.get(slug(String(c.chave ?? "")))
        if (!item || !assinaturaId) continue
        const { error } = await admin
          .from("metodo_gargalos")
          .update({ assinatura_id: assinaturaId })
          .eq("id", item.id)
        if (!error) ok++
      }

      // Só contagens na resposta: nenhum texto de empresa sai daqui.
      return jsonResponse({ acao, pendentes: itens.length, classificados: ok, novas: paraInserir.length })
    }

    // ---------------------------------------------------------------------
    if (acao === "semear") {
      const nicho = String(body.nicho ?? "").trim()
      if (!nicho) return jsonResponse({ error: "nicho é obrigatório" }, 400)
      const { data: nichoOk } = await admin.from("nichos_padrao").select("nicho").eq("nicho", nicho).maybeSingle()
      if (!nichoOk) return jsonResponse({ error: `nicho desconhecido: ${nicho}` }, 400)

      const quantidade = Math.min(Math.max(Number(body.quantidade) || 10, 3), 15)
      // Evita repetir o que já existe para o nicho (inclusive o que ainda não foi
      // aprovado). O filtro é feito aqui e não no PostgREST porque "array vazio"
      // não tem sintaxe confiável no `or` — e o catálogo é pequeno o bastante.
      const { data: jaTem } = await admin
        .from("gargalos_assinaturas")
        .select("chave, titulo")
      // Vai o catálogo INTEIRO (não só o do nicho): é o que permite a IA
      // reconhecer que "conferência de estoque" já existe em outro setor e
      // reusar a chave, em vez de criar uma segunda com outro nome.
      const existentes = (jaTem ?? []).map((a) => `${a.chave}: ${a.titulo}`)

      const out = await gerarJson(promptSemear(nicho, quantidade, existentes))
      const lista = Array.isArray(out.gargalos) ? out.gargalos as Record<string, unknown>[] : []
      const paraInserir = lista
        .map((g) => normalizarAssinatura(g, [nicho]))
        .filter((g): g is NonNullable<typeof g> => g !== null)

      if (paraInserir.length === 0) return jsonResponse({ acao, nicho, criadas: 0 })

      // registrar_assinaturas faz MERGE: chave que já existe tem o nicho novo
      // acrescentado ao alcance, sem sobrescrever a curadoria já feita no texto.
      const { error } = await admin.rpc("registrar_assinaturas", {
        itens: paraInserir, p_origem: "referencia",
      })
      if (error) return jsonResponse({ error: error.message }, 400)

      return jsonResponse({
        acao,
        nicho,
        criadas: paraInserir.length,
        // Devolve o que foi gerado para a tela de curadoria mostrar na hora.
        // É catálogo do Método, não dado de cliente.
        assinaturas: paraInserir.map((a) => ({ chave: a.chave, titulo: a.titulo, descricao: a.descricao, horas_mes_tipicas: a.horas_mes_tipicas })),
      })
    }

    return jsonResponse({ error: `ação inválida: "${acao}"` }, 400)
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    const status = /abort|timeout/i.test(msg) ? 504 : /429|rate.?limit/i.test(msg) ? 429 : 400
    return jsonResponse({ error: msg }, status)
  }
})
