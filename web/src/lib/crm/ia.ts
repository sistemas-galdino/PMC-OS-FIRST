import { supabase } from "@/lib/supabase"

/**
 * Chamadas de IA do CS Manager.
 *
 * No sistema original eram server functions do TanStack Start batendo direto no
 * gateway do Lovable com a chave no processo. Aqui são edge functions do
 * Supabase (`crm-saudacao`, `crm-analisar-transcricao`), que já rodam com o JWT
 * de quem está logado e re-checam se a pessoa é do time.
 *
 * Nada do que sai daqui é gravado automaticamente — ver `analisarTranscricao`.
 */

async function invocar<T>(fn: string, body: Record<string, unknown>, timeoutMs: number): Promise<T> {
  const chamada = supabase.functions.invoke(fn, { body })
  const limite = new Promise<never>((_, reject) =>
    setTimeout(() => reject(new Error("A IA demorou demais para responder.")), timeoutMs),
  )
  const { data, error } = await Promise.race([chamada, limite])
  if (error) {
    // FunctionsHttpError esconde a mensagem no corpo; sem isso o usuário vê
    // só "Edge Function returned a non-2xx status code".
    let msg = error.message
    try {
      const ctx = (error as { context?: { json: () => Promise<{ error?: string }> } }).context
      const corpo = ctx ? await ctx.json() : null
      if (corpo?.error) msg = corpo.error
    } catch {
      /* mantém a mensagem original */
    }
    throw new Error(msg)
  }
  const d = data as { error?: string } | null
  if (d?.error) throw new Error(String(d.error))
  return data as T
}

// ───────────────────────── Saudação ─────────────────────────

export interface ContextoSaudacao {
  primeiro: string
  diaSemana: string
  dataExtenso: string
  periodo: "manha" | "tarde" | "noite"
  atrasadas: number
  hoje: number
  andamento: number
  impedidas: number
  concluidasHoje: number
  reunioes: number
  proximaReuniao?: string
}

export function gerarSaudacaoIA(ctx: ContextoSaudacao): Promise<{ texto: string }> {
  return invocar<{ texto: string }>("crm-saudacao", { ...ctx }, 25_000)
}

// ───────────────────────── Transcrição ─────────────────────────

export interface PassoIA {
  texto: string
  prazo?: string
}
export interface PassoClienteIA extends PassoIA {
  responsavel?: string
}

export interface AnaliseTranscricao {
  reuniao_realizada: boolean
  motivo_nao_realizada?: string
  resumo: string
  decisoes: string[]
  pendencias: string[]
  passos: { cs: PassoIA[]; cliente: PassoClienteIA[] }
}

/**
 * Extrai próximos passos de uma transcrição. **Não grava nada**: a saída vira
 * rascunho editável no TransformarTarefasModal, e só vira tarefa depois que
 * alguém revisa. A exigência de revisão humana veio da reunião de 05/08/2026.
 */
export function analisarTranscricao(entrada: {
  transcricao: string
  titulo?: string
  cliente?: string
  csNome?: string
}): Promise<AnaliseTranscricao> {
  return invocar<AnaliseTranscricao>("crm-analisar-transcricao", { ...entrada }, 120_000)
}
