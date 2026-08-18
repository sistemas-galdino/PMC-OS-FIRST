import { useQuery } from "@tanstack/react-query"
import { supabase } from "@/lib/supabase"
import { queryClient } from "@/lib/query-client"
import { salvarPreparacao } from "./store"
import type { ItemPreparacao, Reuniao } from "./types"

/**
 * Checklist de preparação das reuniões.
 *
 * `store.salvarPreparacao()` já ESCREVE em `crm_reuniao_preparacao`, mas a
 * view `crm_reunioes_v` (e o `rowToReuniao`) não traz esses itens de volta —
 * ou seja, sem este módulo a CS marca "confirmado" e o item volta pendente no
 * próximo fetch. Este arquivo só fecha o ciclo de LEITURA; a escrita continua
 * sendo a função do store, para não haver duas verdades sobre a tabela.
 */

interface PreparacaoRow {
  reuniao_ref: string
  origem: string
  participacao_cs: string | null
  responsavel_externo: string | null
  numero_reuniao: number | null
  itens: ItemPreparacao[] | null
}

const qkPreparacoes = ["crm", "reuniao_preparacoes"] as const

export interface PreparacaoSalva {
  itens: ItemPreparacao[]
  participacao_cs?: Reuniao["participacao_cs"]
  responsavel_externo?: string
  numero_reuniao?: number
}

/** Mapa id da reunião ("origem:ref") → preparação salva. */
export function usePreparacoes(): Map<string, PreparacaoSalva> {
  const { data } = useQuery({
    queryKey: qkPreparacoes,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("crm_reuniao_preparacao")
        .select(
          "reuniao_ref, origem, participacao_cs, responsavel_externo, numero_reuniao, itens",
        )
      if (error) throw error
      const m = new Map<string, PreparacaoSalva>()
      ;((data ?? []) as unknown as PreparacaoRow[]).forEach((r) => {
        m.set(`${r.origem}:${r.reuniao_ref}`, {
          itens: r.itens ?? [],
          participacao_cs:
            r.participacao_cs === "Nao participa" || r.participacao_cs === "Participa"
              ? r.participacao_cs
              : undefined,
          responsavel_externo: r.responsavel_externo ?? undefined,
          numero_reuniao: r.numero_reuniao ?? undefined,
        })
      })
      return m
    },
  })
  return data ?? new Map()
}

/** Grava o checklist inteiro da reunião e reflete na leitura acima. */
export async function salvarItensPreparacao(reuniao: Reuniao, itens: ItemPreparacao[]) {
  await salvarPreparacao({ ...reuniao, preparacao: itens })
  void queryClient.invalidateQueries({ queryKey: qkPreparacoes })
}
