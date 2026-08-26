import { useMemo } from "react"
import { useQuery } from "@tanstack/react-query"
import { supabase } from "@/lib/supabase"
import {
  _setListasEquipe,
  _setUsuarios,
  roleDoPapel,
  type CSName,
  type ProfileName,
  type Role,
  type UsuarioMeta,
} from "./types"

/**
 * O time do CRM.
 *
 * No sistema original o time era um tipo literal com 6 nomes e as senhas
 * ficavam em localStorage. Aqui a fonte da verdade é a tabela `mentores`
 * (a mesma do RBAC do PMC OS) — quem entra ou sai do time aparece aqui
 * sem deploy, e a autenticação é a do PMC OS.
 *
 * Ligação com a carteira: `clientes_entrada_new.sc` guarda o NOME da CS em
 * texto livre, então o casamento é por `mentores.nome`.
 */

export interface MembroEquipe {
  mentor_id: number
  nome: string
  email: string
  papel: string
  role: Role
  cargo: string
  /**
   * Carteira operada por esta pessoa — a string exata de
   * `clientes_entrada_new.sc` (mentores.carteira_sc), vinculada em Time &
   * Permissões. É ela, não `nome`, que casa com o dado dos clientes: `nome` é
   * rótulo de tela e pode ganhar sobrenome sem quebrar a carteira. Cai em
   * `nome` enquanto o vínculo não foi feito.
   */
  carteira: string
}

const CARGO_POR_PAPEL: Record<string, string> = {
  super_admin: "Coordenação",
  admin: "Coordenação",
  cs: "CS",
  consultor: "Consultor",
  conteudo: "Conteúdo",
}

export async function fetchEquipe(): Promise<{
  membros: MembroEquipe[]
  usuarios: UsuarioMeta[]
}> {
  const [{ data: mentores, error: errM }, { data: configs, error: errC }] =
    await Promise.all([
      supabase.from("mentores").select("id, nome, email, papel, carteira_sc").order("nome"),
      supabase
        .from("crm_cs_config")
        .select("mentor_id, whatsapp_numero, whatsapp_grupo_id, whatsapp_automacao, whatsapp_horario_resumo"),
    ])
  if (errM) throw errM
  // crm_cs_config é opcional: sem config a CS ainda aparece, só sem WhatsApp.
  if (errC) console.warn("[crm/equipe] crm_cs_config indisponível:", errC.message)

  const porMentor = new Map((configs ?? []).map((c) => [c.mentor_id, c]))

  const membros: MembroEquipe[] = (mentores ?? [])
    .filter((m) => m.nome)
    .map((m) => ({
      mentor_id: m.id,
      nome: m.nome as string,
      email: m.email as string,
      papel: m.papel as string,
      role: roleDoPapel(m.papel),
      cargo: CARGO_POR_PAPEL[m.papel as string] ?? "Time",
      carteira: (m.carteira_sc as string | null)?.trim() || (m.nome as string),
    }))

  const usuarios: UsuarioMeta[] = membros.map((m) => {
    const cfg = porMentor.get(m.mentor_id)
    return {
      profile: m.carteira,
      cargo: m.cargo,
      role: m.role,
      ativo: true,
      whatsapp_numero: cfg?.whatsapp_numero ?? undefined,
      whatsapp_grupo_id: cfg?.whatsapp_grupo_id ?? undefined,
      whatsapp_automacao: (cfg?.whatsapp_automacao as "ativa" | "pausada") ?? "pausada",
      whatsapp_horario_resumo: cfg?.whatsapp_horario_resumo ?? "08:00",
    }
  })

  return { membros, usuarios }
}

export const equipeQueryKey = ["crm", "equipe"] as const

/**
 * Carrega o time e publica nas live bindings de types.ts (CS_LIST,
 * PROFILE_LIST, USUARIOS_DEFAULT), que dezenas de componentes portados
 * importam diretamente.
 */
export function useEquipe() {
  const q = useQuery({
    queryKey: equipeQueryKey,
    queryFn: fetchEquipe,
    staleTime: 5 * 60_000,
  })

  if (q.data) {
    const cs: CSName[] = q.data.membros.filter((m) => m.role === "cs").map((m) => m.carteira)
    const perfis: ProfileName[] = q.data.membros.map((m) => m.carteira)
    _setListasEquipe(cs, perfis)
    _setUsuarios(q.data.usuarios)
  }

  return q
}

/**
 * Lista de CSs, reativa.
 *
 * Prefira este hook a importar `CS_LIST` de types.ts. `CS_LIST` é uma live
 * binding de módulo: quando o time chega do banco o valor muda, mas o React
 * não tem como saber disso. Qualquer `useMemo` que leia `CS_LIST` sem tê-la
 * nas dependências fica preso na lista vazia do primeiro render — foi o que
 * deixou o Heatmap e o "Desempenho por CS" presos em "Carregando o time…".
 *
 * O retorno vem do cache do React Query, então muda de referência quando o
 * time muda e serve como dependência de memo.
 */
export function useCsList(): CSName[] {
  const { data } = useEquipe()
  return useMemo(
    () => (data?.membros ?? []).filter((m) => m.role === "cs").map((m) => m.carteira),
    [data],
  )
}

/** Todos os perfis (CS + coordenação), reativo. Mesmo racional de useCsList. */
export function useProfileList(): ProfileName[] {
  const { data } = useEquipe()
  return useMemo(() => (data?.membros ?? []).map((m) => m.carteira), [data])
}
