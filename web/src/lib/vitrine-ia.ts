import { supabase } from "@/lib/supabase"

/**
 * Redação dos blocos editoriais de um case da Vitrine pela edge function
 * `vitrine-gerar-case`.
 *
 * Dois modos, e a diferença importa:
 * - `persistir: true` — o kanban acabou de criar o case e ninguém está com o
 *   formulário aberto; a função grava o texto e fecha o `ia_status`.
 * - `persistir: false` — veio do botão "Gerar com IA" do editor; o retorno vira
 *   rascunho no formulário e só é salvo quando a pessoa clicar em Salvar. Mesma
 *   regra do CRM: a IA sugere, a gente confere.
 */

const TIMEOUT_MS = 120_000

export interface CaseGerado {
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

export async function gerarCaseIA(
  vitrineCaseId: string,
  opcoes: { persistir: boolean },
): Promise<CaseGerado> {
  const chamada = supabase.functions.invoke("vitrine-gerar-case", {
    body: { vitrine_case_id: vitrineCaseId, persistir: opcoes.persistir },
  })
  const limite = new Promise<never>((_, reject) =>
    setTimeout(() => reject(new Error("A IA demorou demais para responder.")), TIMEOUT_MS),
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
  const d = data as { error?: string; case?: CaseGerado } | null
  if (d?.error) throw new Error(String(d.error))
  if (!d?.case) throw new Error("A IA não devolveu o conteúdo do case.")
  return d.case
}
