// Cliente da edge function `metodo-ia` — gerações de IA do Método MC.
import { supabase } from "@/lib/supabase"

export type MetodoIATipo =
  | "inteligencia_fluxos"
  | "gargalo_plano"
  | "copiloto_sugestoes"
  | "copiloto_skill"
  | "economia_analise"

export interface SkillIA {
  nome: string
  objetivo?: string
  documento?: string
}

export interface RotinaIA {
  necessaria?: boolean
  nome?: string
  cadencia?: string
  passos?: string[]
}

export interface PlanoGargaloIA {
  analise: string
  causa_raiz: string
  tipo_solucao: string
  prioridade: string
  tarefas: string[]
  skills?: SkillIA[]
  rotina?: RotinaIA | null
}

export interface FluxosInteligenciaIA {
  dados: string
  informacao: string
  estrategia: string
  receita: string
}

export interface SugestaoCopilotoIA {
  colaborador_nome: string
  copiloto_nome: string
  funcao: string
  justificativa: string
}

export interface EconomiaItemIA {
  referencia: string
  tipo: string
  natureza: string
  recorrencia: string
  metodo_valoracao: string
  horas_mes: number
  valor_mes: number
  observacao: string
}

// Backstop no cliente: garante que a Promise sempre resolve/rejeita (o botão nunca fica girando pra sempre).
// O edge já tem seu próprio timeout (~110s); este cobre travas de rede antes de a resposta chegar.
const INVOKE_TIMEOUT_MS = 120_000

export async function invokeMetodoIA<T>(tipo: MetodoIATipo, payload: Record<string, unknown>): Promise<T> {
  const call = supabase.functions.invoke("metodo-ia", { body: { tipo, ...payload } })
  const timeout = new Promise<never>((_, reject) =>
    setTimeout(
      () => reject(new Error("A IA demorou demais para responder. Tente de novo com uma descrição mais enxuta.")),
      INVOKE_TIMEOUT_MS,
    ),
  )
  const { data, error } = await Promise.race([call, timeout])
  if (error) {
    // FunctionsHttpError: tenta extrair a mensagem amigável do corpo
    const ctx = (error as any)?.context
    let msg = error.message
    try {
      const body = ctx ? await ctx.json() : null
      if (body?.error) msg = body.error
    } catch { /* mantém a mensagem original */ }
    throw new Error(msg)
  }
  if (data?.error) throw new Error(String(data.error))
  return data as T
}

// ---- Streaming (só o plano de gargalo) --------------------------------------
// A edge function metodo-ia tem um caminho stream:true (AI SDK streamObject) que transmite o JSON
// conforme é gerado. `supabase.functions.invoke` não faz streaming, então usamos fetch cru com o JWT
// da sessão (mesmo padrão do agenteFetch em @/lib/agente).
const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL as string
const SUPABASE_ANON = import.meta.env.VITE_SUPABASE_ANON_KEY as string
const STREAM_TIMEOUT_MS = 120_000

// Parse tolerante do JSON acumulado (o texto final do stream é o JSON completo).
function parseJsonLoose(text: string): unknown {
  const cleaned = text.trim().replace(/^```(?:json)?\s*/i, "").replace(/```\s*$/i, "").trim()
  try {
    return JSON.parse(cleaned)
  } catch {
    const s = cleaned.indexOf("{")
    const e = cleaned.lastIndexOf("}")
    if (s >= 0 && e > s) return JSON.parse(cleaned.slice(s, e + 1))
    throw new Error("A IA não retornou um JSON válido.")
  }
}

/**
 * Gera o plano de gargalo em STREAMING: chama metodo-ia com stream:true e vai entregando o texto
 * conforme a IA escreve (via `onChunk`, que recebe o JSON acumulado). No fim, faz o parse e devolve tipado.
 */
export async function streamMetodoIAGargalo(
  payload: Record<string, unknown>,
  onChunk?: (acumulado: string) => void,
): Promise<PlanoGargaloIA> {
  const { data } = await supabase.auth.getSession()
  const token = data.session?.access_token

  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), STREAM_TIMEOUT_MS)
  try {
    const res = await fetch(`${SUPABASE_URL}/functions/v1/metodo-ia`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        apikey: SUPABASE_ANON,
        Authorization: `Bearer ${token ?? SUPABASE_ANON}`,
      },
      body: JSON.stringify({ tipo: "gargalo_plano", stream: true, ...payload }),
      signal: controller.signal,
    })

    // Erro antes do stream: o edge devolve JSON { error } com status != 2xx.
    if (!res.ok || !res.body) {
      let msg = `Erro ${res.status} ao gerar com a IA.`
      try {
        const body = await res.json()
        if (body?.error) msg = String(body.error)
      } catch { /* mantém a mensagem padrão */ }
      throw new Error(msg)
    }

    const reader = res.body.getReader()
    const decoder = new TextDecoder()
    let acc = ""
    for (;;) {
      const { done, value } = await reader.read()
      if (done) break
      acc += decoder.decode(value, { stream: true })
      onChunk?.(acc)
    }
    acc += decoder.decode() // flush final

    if (!acc.trim()) throw new Error("A IA não retornou conteúdo. Tente de novo.")
    return parseJsonLoose(acc) as PlanoGargaloIA
  } catch (e: any) {
    if (e?.name === "AbortError") throw new Error("A IA demorou demais para responder. Tente de novo com uma descrição mais enxuta.")
    throw e
  } finally {
    clearTimeout(timeout)
  }
}
