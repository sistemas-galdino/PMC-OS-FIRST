import { useCallback, useEffect, useState } from "react"
import { useAuth } from "@/lib/auth-context"
import { useEquipe } from "./equipe"
import { roleDoPapel, type CSName, type ProfileName, type Role } from "./types"

/**
 * Sessão do CS Manager.
 *
 * Substitui o ProfileGate do sistema original, onde a pessoa escolhia um nome
 * numa lista e criava uma senha guardada em localStorage. Aqui quem é a pessoa
 * vem da sessão do PMC OS e o que ela pode ver vem do RBAC (`minhas_secoes`).
 *
 * O conceito de "perfil" continua existindo, mas com outro sentido: para a
 * coordenação ele é a CS cuja visão está sendo olhada no momento — "cada uma
 * vai escolher o seu… aí vai ter a minha visão, que eu vou ter a visão de
 * todas" (Mayara). Para a CS, é ela mesma, sem opção de troca.
 */

export type AppArea =
  | "meu-dia"
  | "clientes"
  | "rotinas"
  | "visao-geral"
  | "gestao"
  | "manual"
  | "alertas"
  | "atendimento"
  | "projetos"
  | "time"

/** Área do CRM -> chave em secoes_catalogo. */
const SECAO_DA_AREA: Record<AppArea, string> = {
  "meu-dia": "crm/meu-dia",
  rotinas: "crm/atividades",
  clientes: "crm/clientes",
  alertas: "crm/alertas",
  atendimento: "crm/atendimento",
  projetos: "crm/projetos",
  manual: "crm/manual",
  "visao-geral": "crm/visao-geral",
  time: "crm/time",
  gestao: "crm/acompanhamento",
}

// Espelho do estado da sessão para as funções síncronas que os componentes
// portados chamam fora de hooks (canSee, getRole…).
const atual: { nome: string | null; role: Role | null; can: (s: string) => boolean } = {
  nome: null,
  role: null,
  can: () => false,
}

// "Vendo como": só a coordenação troca. null = visão consolidada do time.
let visaoCs: CSName | null = null
const listeners = new Set<() => void>()
function emitir() {
  listeners.forEach((l) => l())
}

export function setVisaoCs(cs: CSName | null) {
  visaoCs = cs
  emitir()
}
export function getVisaoCs(): CSName | null {
  return visaoCs
}

/**
 * Liga a sessão do PMC OS ao CRM. Deve ser montado uma vez por página do CRM
 * (o CrmLayout faz isso) antes de qualquer componente que use getRole/canSee.
 */
export function useSessaoCrm() {
  const { papel, can } = useAuth()
  const equipe = useEquipe()
  const [, forcar] = useState(0)

  const nome =
    equipe.data?.membros.find((m) => m.papel === papel && m.nome)?.nome ?? null
  const role = roleDoPapel(papel)

  atual.role = role
  atual.can = can

  useEffect(() => {
    const l = () => forcar((n) => n + 1)
    listeners.add(l)
    return () => {
      listeners.delete(l)
    }
  }, [])

  return {
    /** Nome da pessoa logada, como aparece em mentores.nome / clientes.sc. */
    nome,
    role,
    /** Coordenação vê o time inteiro e pode trocar a visão. */
    isCoordenacao: role === "admin" || role === "strategic",
    /** CS efetivamente em foco: a escolhida (coordenação) ou a própria. */
    csEmFoco: role === "cs" ? nome : visaoCs,
    setVisaoCs,
    carregando: equipe.isLoading,
  }
}

/** Espelha o nome resolvido da pessoa logada para os getters síncronos. */
export function _setNomeSessao(nome: string | null) {
  atual.nome = nome
}

// ───────── Shims da API original ─────────

/**
 * [perfil, setPerfil, montado] — mesma assinatura do useProfile() original,
 * para não precisar reescrever os componentes. `perfil` é a CS em foco.
 */
export function useProfile(): [ProfileName | null, (p: ProfileName | null) => void, boolean] {
  const s = useSessaoCrm()
  _setNomeSessao(s.nome)
  const set = useCallback(
    (p: ProfileName | null) => {
      // Uma CS não troca de perfil: a visão dela é a carteira dela.
      if (s.role === "cs") return
      setVisaoCs(p)
    },
    [s.role],
  )
  return [s.csEmFoco ?? s.nome, set, !s.carregando]
}

export function getProfile(): ProfileName | null {
  return visaoCs ?? atual.nome
}

export function getRole(p?: ProfileName | null): Role | null {
  // O papel é de quem está logado, não do perfil sendo observado.
  void p
  return atual.role
}

export function isAdmin(p?: ProfileName | null): boolean {
  return getRole(p) === "admin"
}

export function isStrategic(p?: ProfileName | null): boolean {
  return getRole(p) === "strategic"
}

export function isCS(p: ProfileName | null): p is CSName {
  return !!p && atual.role === "cs"
}

/** Agora quem decide é o RBAC do PMC OS, não uma tabela fixa por papel. */
export function canSee(p: ProfileName | null, area: AppArea): boolean {
  void p
  return atual.can(SECAO_DA_AREA[area])
}

export function defaultRoute(p?: ProfileName | null): string {
  void p
  return atual.role === "admin" || atual.role === "strategic"
    ? "/crm/time"
    : "/crm/meu-dia"
}
