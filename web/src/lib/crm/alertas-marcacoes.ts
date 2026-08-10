import { useCallback } from "react"
import { useQuery } from "@tanstack/react-query"
import { supabase } from "@/lib/supabase"
import { queryClient } from "@/lib/query-client"
import type { AlertaEntregaId } from "./alertas-catalogo"

/**
 * Marcações de alerta: a CS sinaliza que já está acompanhando um alerta ou
 * que ele não se aplica àquele cliente, sem que o alerta suma do sistema.
 *
 * No original ficava em localStorage — ou seja, o "não se aplica" que a
 * Francielly marcasse não apareceria para a Mayara nem para a CS que
 * assumisse a carteira depois. Como o ponto da reunião era justamente que o
 * histórico não pode morrer com a pessoa, aqui é tabela.
 */

export type MarcacaoTipo = "acompanhando" | "nao_se_aplica"

export interface Marcacao {
  tipo: MarcacaoTipo
  data: string
}

/** chave = `${clienteId}:${alertaId}` */
export type MarcacoesMap = Record<string, Marcacao>

export function marcacaoKey(clienteId: string, alertaId: AlertaEntregaId): string {
  return `${clienteId}:${alertaId}`
}

const QK = ["crm", "alerta-marcacoes"] as const

export function useMarcacoesAlertas() {
  const { data } = useQuery({
    queryKey: QK,
    queryFn: async (): Promise<MarcacoesMap> => {
      const { data, error } = await supabase
        .from("crm_alerta_marcacoes")
        .select("id_cliente, alerta_id, tipo, data")
      if (error) throw error
      const out: MarcacoesMap = {}
      for (const r of data ?? []) {
        out[marcacaoKey(r.id_cliente as string, r.alerta_id as AlertaEntregaId)] = {
          tipo: r.tipo as MarcacaoTipo,
          data: r.data as string,
        }
      }
      return out
    },
  })

  const marcar = useCallback(
    async (clienteId: string, alertaId: AlertaEntregaId, tipo: MarcacaoTipo, autor?: string) => {
      const { error } = await supabase
        .from("crm_alerta_marcacoes")
        .upsert(
          { id_cliente: clienteId, alerta_id: alertaId, tipo, autor: autor ?? null, data: new Date().toISOString() },
          { onConflict: "id_cliente,alerta_id" },
        )
      if (error) throw error
      void queryClient.invalidateQueries({ queryKey: QK })
    },
    [],
  )

  const reverter = useCallback(async (clienteId: string, alertaId: AlertaEntregaId) => {
    const { error } = await supabase
      .from("crm_alerta_marcacoes")
      .delete()
      .eq("id_cliente", clienteId)
      .eq("alerta_id", alertaId)
    if (error) throw error
    void queryClient.invalidateQueries({ queryKey: QK })
  }, [])

  return { marcacoes: data ?? {}, marcar, reverter }
}
