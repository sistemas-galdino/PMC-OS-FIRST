import { useQuery } from "@tanstack/react-query"
import { supabase } from "@/lib/supabase"
import { queryClient } from "@/lib/query-client"

/**
 * Rotinas da CS (checkups de segunda/quarta/sexta e a rotina quinzenal).
 *
 * No sistema original o "já fiz isso hoje" morava em localStorage, com uma
 * chave por semana ISO — quer dizer: sumia ao trocar de máquina e a
 * coordenação nunca via se a rotina rodou. Agora existe `crm_rotinas`
 * (catálogo, semeado com 4 rotinas) e `crm_rotina_execucoes` (marcação por
 * CS + data, UNIQUE), então a marcação é dado de negócio no banco.
 *
 * Fica num arquivo separado de propósito: `store.ts` é a camada já validada
 * contra o banco e não deve ser reescrita por causa desta tela.
 */

export type RotinaCadencia = "semanal" | "quinzenal" | "mensal" | "trimestral"
export type RotinaExecucaoStatus = "pendente" | "em_andamento" | "concluida" | "pulada"

export interface Rotina {
  id: string
  chave: string
  titulo: string
  descricao: string | null
  /** 0=domingo … 6=sábado; null para rotinas sem dia fixo. */
  dia_semana: number | null
  cadencia: RotinaCadencia
  ordem: number
  passos: unknown[]
  link_manual: string | null
  ativo: boolean
}

export interface RotinaExecucao {
  id: string
  rotina_id: string
  responsavel_cs: string
  /** "AAAA-MM-DD" */
  data_referencia: string
  status: RotinaExecucaoStatus
  observacoes: string | null
  concluida_em: string | null
}

export const qkRotinas = {
  catalogo: ["crm", "rotinas"] as const,
  execucoes: (cs: string, de: string, ate: string) =>
    ["crm", "rotina_execucoes", cs, de, ate] as const,
}

export function useRotinas(): Rotina[] {
  const { data } = useQuery({
    queryKey: qkRotinas.catalogo,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("crm_rotinas")
        .select("*")
        .eq("ativo", true)
        .order("ordem")
      if (error) throw error
      return (data ?? []) as unknown as Rotina[]
    },
  })
  return data ?? []
}

/** Execuções de uma CS num intervalo de datas ("AAAA-MM-DD"). */
export function useRotinaExecucoes(
  cs: string | null,
  de: string,
  ate: string,
): RotinaExecucao[] {
  const { data } = useQuery({
    queryKey: qkRotinas.execucoes(cs ?? "", de, ate),
    enabled: !!cs,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("crm_rotina_execucoes")
        .select("*")
        .eq("responsavel_cs", cs)
        .gte("data_referencia", de)
        .lte("data_referencia", ate)
      if (error) throw error
      return (data ?? []) as unknown as RotinaExecucao[]
    },
  })
  return data ?? []
}

/**
 * Itens concluídos de uma execução.
 *
 * O schema guarda a rotina inteira (status), não item a item. Como o painel
 * que o time validou tem checkbox por item, a lista dos itens marcados vai em
 * `observacoes` como JSON — é o único campo livre da tabela. Se um dia a
 * granularidade por item virar de primeira classe, é este par de funções que
 * muda, não a tela.
 */
export function itensFeitosDe(exec: RotinaExecucao | undefined): string[] {
  if (!exec?.observacoes) return []
  try {
    const v = JSON.parse(exec.observacoes)
    return Array.isArray(v) ? (v as string[]) : []
  } catch {
    return []
  }
}

export async function salvarExecucaoRotina(params: {
  rotinaId: string
  cs: string
  dataReferencia: string
  itensFeitos: string[]
  totalItens: number
}) {
  const { rotinaId, cs, dataReferencia, itensFeitos, totalItens } = params
  const concluida = totalItens > 0 && itensFeitos.length >= totalItens
  const status: RotinaExecucaoStatus = concluida
    ? "concluida"
    : itensFeitos.length > 0
      ? "em_andamento"
      : "pendente"
  const { error } = await supabase.from("crm_rotina_execucoes").upsert(
    {
      rotina_id: rotinaId,
      responsavel_cs: cs,
      data_referencia: dataReferencia,
      status,
      observacoes: JSON.stringify(itensFeitos),
      concluida_em: concluida ? new Date().toISOString() : null,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "rotina_id,responsavel_cs,data_referencia" },
  )
  if (error) throw error
  void queryClient.invalidateQueries({ queryKey: ["crm", "rotina_execucoes"] })
}
