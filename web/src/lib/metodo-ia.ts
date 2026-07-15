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

export async function invokeMetodoIA<T>(tipo: MetodoIATipo, payload: Record<string, unknown>): Promise<T> {
  const { data, error } = await supabase.functions.invoke("metodo-ia", {
    body: { tipo, ...payload },
  })
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
