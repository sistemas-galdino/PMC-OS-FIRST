// vitrine-gerar-case — escreve os blocos editoriais de um case da Vitrine a
// partir do que a CS registrou no Repositório de Vitórias (título, descrição,
// área, origem) mais o contexto do cliente (empresa, nicho, subnicho).
//
// Por que existe: a vitória é registrada em 4 campos crus e a vitrine cobra 9
// blocos editoriais (como era antes, gargalos, como ficou depois, o que o PMC
// transformou, ganhos...). Escrever isso à mão para toda vitória aprovada não
// acontecia — então a IA faz o primeiro rascunho e o time revisa.
//
// Dois modos:
//   persistir=true  → veio do kanban, ninguém está com o formulário aberto:
//                     grava no case e fecha o ia_status ('pronto' ou 'erro').
//   persistir=false → veio do botão "Gerar com IA" do editor: só devolve o JSON,
//                     que vira rascunho no formulário. A IA nunca grava por cima
//                     do que um humano está editando.
//
// Segurança: verify_jwt=true + o chamador precisa existir em `mentores`
// (cliente logado também tem JWT válido).
import "jsr:@supabase/functions-js/edge-runtime.d.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"
import { corsHeaders, jsonResponse } from "../_shared/cors.ts"
import { chamarLLM, erroHttp, exigirMembroDoTime, extrairJson } from "../_shared/llm-chat.ts"

interface Corpo {
  vitrine_case_id?: string
  persistir?: boolean
}

interface Saida {
  headline_vitrine: string
  headline_curta: string
  resumo_executivo: string
  como_era_antes: string
  principais_gargalos: string[]
  como_ficou_depois: string
  o_que_pmc_transformou: string
  principais_ganhos: string[]
  solucao_criada: string
  processo_atual: string
  resultado_principal: string
  categoria: string
  foco_ia: boolean
  palavras_chave: string[]
}

const MAX_ITENS = 6

function texto(v: unknown): string {
  return typeof v === "string" ? v.trim() : ""
}

function lista(v: unknown): string[] {
  if (!Array.isArray(v)) return []
  const vistos = new Set<string>()
  const saida: string[] = []
  for (const item of v) {
    const t = texto(item)
    if (!t || vistos.has(t.toLowerCase())) continue
    vistos.add(t.toLowerCase())
    saida.push(t)
    if (saida.length >= MAX_ITENS) break
  }
  return saida
}

function admin() {
  return createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  )
}

const SYSTEM =
  `Você escreve o material comercial da Vitrine de Cases do PMC (mentoria e consultoria de negócios ` +
  `para pequenas e médias empresas brasileiras). O texto é lido AO VIVO em reunião de vendas, então ` +
  `precisa ser sóbrio, concreto e sem enfeite. Responda em português do Brasil.\n\n` +
  `Regras duras:\n` +
  `- NÃO invente número, percentual, prazo, valor, nome de ferramenta, de pessoa ou de empresa que não esteja no material recebido. ` +
  `Sem dado numérico no material, escreva qualitativo.\n` +
  `- Campo sem base no material: devolva string vazia ("") ou lista vazia ([]). NUNCA escreva "N/A", "PENDENTE_VALIDACAO", ` +
  `"não informado" ou qualquer placeholder — a tela esconde bloco vazio, e isso é o comportamento certo.\n` +
  `- NÃO DEDUZA o que não foi contado. Se o material não descreve como era antes, "como_era_antes" e "principais_gargalos" ficam vazios; ` +
  `se não descreve a solução, "solucao_criada" e "o_que_pmc_transformou" ficam vazios. Material curto gera case curto — ` +
  `um bloco vazio é sempre melhor que um bloco plausível e falso, porque isso vai ser lido na frente de um cliente real ` +
  `que sabe o que aconteceu na empresa dele.\n` +
  `- "categoria" é a ÁREA DO NEGÓCIO IMPACTADA pela transformação (ex.: Vendas, Financeiro, Operações, Marketing, Gestão, Pessoas). ` +
  `Nunca é o nicho/setor da empresa do cliente — são dois eixos diferentes na vitrine.\n` +
  `- "o_que_pmc_transformou" é o clímax da narrativa: o que mudou no negócio POR CAUSA da mentoria/consultoria do PMC. ` +
  `Sem superlativo vazio, sem "revolucionou", sem promessa de resultado futuro.\n` +
  `- "foco_ia" só é true se o material indicar uso de inteligência artificial, agente, automação com IA ou similar.\n` +
  `- Sem emoji, sem markdown, sem títulos dentro dos campos. Texto corrido nos campos de texto; frases curtas e independentes nas listas.\n\n` +
  `Tamanhos: headline_vitrine até 90 caracteres (afirmação de impacto, sem aspas); headline_curta até 40; ` +
  `resumo_executivo 2 a 3 linhas; como_era_antes, como_ficou_depois e o_que_pmc_transformou 2 a 4 linhas cada; ` +
  `listas com no máximo ${MAX_ITENS} itens.\n\n` +
  `Responda SOMENTE com um JSON válido, sem markdown ao redor, neste formato:\n` +
  `{"headline_vitrine": string, "headline_curta": string, "resumo_executivo": string, "como_era_antes": string, ` +
  `"principais_gargalos": [string], "como_ficou_depois": string, "o_que_pmc_transformou": string, ` +
  `"principais_ganhos": [string], "solucao_criada": string, "processo_atual": string, "resultado_principal": string, ` +
  `"categoria": string, "foco_ia": boolean, "palavras_chave": [string]}`

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders })

  const b = (await req.json().catch(() => ({}))) as Corpo
  const caseId = texto(b.vitrine_case_id)
  const persistir = b.persistir === true
  const db = admin()

  try {
    const quem = await exigirMembroDoTime(req)
    if (!quem) return jsonResponse({ error: "não autorizado" }, 403)
    if (!caseId) return jsonResponse({ error: "informe o vitrine_case_id" }, 400)

    const { data: caso, error: erroCase } = await db
      .from("vitrine_cases")
      .select(
        "id, case_id, empresa_nome, categoria, headline_vitrine, resumo_executivo, vitrine_cliente_id, repositorio_vitoria_id",
      )
      .eq("id", caseId)
      .maybeSingle()
    if (erroCase) throw new Error(erroCase.message)
    if (!caso) return jsonResponse({ error: "case não encontrado" }, 404)

    const [{ data: cliente }, { data: vitoria }] = await Promise.all([
      db
        .from("vitrine_clientes")
        .select("empresa_nome, cliente_nome, nicho, subnicho")
        .eq("id", caso.vitrine_cliente_id)
        .maybeSingle(),
      caso.repositorio_vitoria_id
        ? db
            .from("repositorio_vitorias")
            .select("titulo, descricao, area, origem")
            .eq("id", caso.repositorio_vitoria_id)
            .maybeSingle()
        : Promise.resolve({ data: null }),
    ])

    const titulo = texto(vitoria?.titulo) || texto(caso.headline_vitrine)
    const descricao = texto(vitoria?.descricao) || texto(caso.resumo_executivo)
    if (!titulo && !descricao) {
      return jsonResponse(
        { error: "a vitória não tem título nem descrição — sem material, a IA só inventaria." },
        400,
      )
    }

    const linhas = [
      `Empresa: ${texto(cliente?.empresa_nome) || texto(caso.empresa_nome) || "(não informada)"}`,
      texto(cliente?.cliente_nome) ? `Responsável na empresa: ${texto(cliente?.cliente_nome)}` : "",
      texto(cliente?.nicho) ? `Nicho da empresa: ${texto(cliente?.nicho)}` : "",
      texto(cliente?.subnicho) ? `Subnicho: ${texto(cliente?.subnicho)}` : "",
      "",
      `Título da vitória registrada: ${titulo || "(sem título)"}`,
      texto(vitoria?.area) || texto(caso.categoria)
        ? `Área impactada informada pelo time: ${texto(vitoria?.area) || texto(caso.categoria)}`
        : "",
      texto(vitoria?.origem) ? `Onde a vitória foi identificada: ${texto(vitoria?.origem)}` : "",
      "",
      "Descrição registrada:",
      `"""\n${descricao || "(sem descrição)"}\n"""`,
      "",
      // Vitórias vindas do painel do cliente chegam com a descrição já rotulada
      // pelo trigger sync_vitoria_para_repositorio.
      `Se a descrição usar os rótulos "Antes:", "O que fez:", "Agora:", "Valor:" ou "Quantidade:", respeite exatamente esse mapeamento: ` +
        `"Antes" alimenta como_era_antes e principais_gargalos; "O que fez" alimenta solucao_criada e o_que_pmc_transformou; ` +
        `"Agora" alimenta como_ficou_depois e processo_atual; os pares de valor/quantidade alimentam principais_ganhos e resultado_principal.`,
    ]

    const bruto = await chamarLLM({
      system: SYSTEM,
      user: linhas.filter((l) => l !== "").join("\n"),
      json: true,
      maxTokens: 2000,
      temperatura: 0.3,
      timeoutMs: 110_000,
    })

    const cru = extrairJson<Record<string, unknown>>(bruto)
    const saida: Saida = {
      headline_vitrine: texto(cru.headline_vitrine) || titulo,
      headline_curta: texto(cru.headline_curta),
      resumo_executivo: texto(cru.resumo_executivo),
      como_era_antes: texto(cru.como_era_antes),
      principais_gargalos: lista(cru.principais_gargalos),
      como_ficou_depois: texto(cru.como_ficou_depois),
      o_que_pmc_transformou: texto(cru.o_que_pmc_transformou),
      principais_ganhos: lista(cru.principais_ganhos),
      solucao_criada: texto(cru.solucao_criada),
      processo_atual: texto(cru.processo_atual),
      resultado_principal: texto(cru.resultado_principal),
      categoria: texto(cru.categoria) || texto(vitoria?.area) || texto(caso.categoria),
      foco_ia: cru.foco_ia === true,
      palavras_chave: lista(cru.palavras_chave),
    }

    if (persistir) {
      const { error: erroUpdate } = await db
        .from("vitrine_cases")
        .update({
          headline_vitrine: saida.headline_vitrine || null,
          headline_curta: saida.headline_curta || null,
          resumo_executivo: saida.resumo_executivo || null,
          como_era_antes: saida.como_era_antes || null,
          principais_gargalos: saida.principais_gargalos,
          como_ficou_depois: saida.como_ficou_depois || null,
          o_que_pmc_transformou: saida.o_que_pmc_transformou || null,
          principais_ganhos: saida.principais_ganhos,
          solucao_criada: saida.solucao_criada || null,
          processo_atual: saida.processo_atual || null,
          resultado_principal: saida.resultado_principal || null,
          categoria: saida.categoria || null,
          foco_ia: saida.foco_ia,
          palavras_chave: saida.palavras_chave,
          gerado_por_ia: true,
          ia_gerado_em: new Date().toISOString(),
          ia_status: "pronto",
          ia_erro: null,
        })
        .eq("id", caseId)
      if (erroUpdate) throw new Error(erroUpdate.message)
    }

    return jsonResponse({ case: saida, persistido: persistir })
  } catch (err) {
    const { status, message } = erroHttp(err)
    // Sem isto o selo "Gerando vitória…" do kanban gira para sempre.
    if (persistir && caseId) {
      try {
        await db
          .from("vitrine_cases")
          .update({ ia_status: "erro", ia_erro: message.slice(0, 500) })
          .eq("id", caseId)
      } catch { /* o erro original é o que importa devolver */ }
    }
    return jsonResponse({ error: message }, status)
  }
})
