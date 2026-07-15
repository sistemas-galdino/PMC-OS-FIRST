// Conhecimento → Multiplicadores: tipos e listas de referência. Os itens vivem
// na tabela `conhecimento_multiplicadores` (cadastrados pelo dono no admin).
import type { CorKey, IconKey } from "@/components/biblioteca/biblioteca-ui"

export type TipoMultiplicador = "projeto" | "skill" | "prompt" | "guia"

export interface Multiplicador {
  id: string
  slug: string
  nome: string
  descricao: string
  detalhe: string
  inclui: string[]
  tipo: TipoMultiplicador
  categoria: string
  tags: string[]
  tempo: string
  plataforma: string
  cor: CorKey
  icon: IconKey
  importar_url: string | null
  destaque: boolean
  publicado: boolean
  ordem: number
}

export const TIPOS: { slug: TipoMultiplicador; label: string }[] = [
  { slug: "projeto", label: "Projeto" },
  { slug: "skill", label: "Skill Claude" },
  { slug: "prompt", label: "Prompt" },
  { slug: "guia", label: "Guia" },
]

export const CATEGORIAS: { slug: string; label: string }[] = [
  { slug: "vendas-crm", label: "Vendas & CRM" },
  { slug: "conteudo-marketing", label: "Conteúdo & Marketing" },
  { slug: "gestao-estrategia", label: "Gestão & Estratégia" },
  { slug: "atendimento", label: "Atendimento" },
  { slug: "ferramentas", label: "Ferramentas" },
  { slug: "integracoes", label: "Integrações" },
]

export function tipoLabel(tipo: string): string {
  return TIPOS.find((t) => t.slug === tipo)?.label ?? tipo
}
