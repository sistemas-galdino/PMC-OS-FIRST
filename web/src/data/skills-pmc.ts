// Conhecimento → Skills: tipos e lista de categorias de referência. Os itens
// vivem na tabela `conhecimento_skills` (cadastrados pelo dono no admin).
import type { CorKey, IconKey } from "@/components/biblioteca/biblioteca-ui"

export interface SkillPMC {
  id: string
  slug: string
  nome: string
  descricao: string
  gatilho: string
  categoria: string
  tags: string[]
  formato: string
  arquivo_url: string | null
  cor: CorKey
  icon: IconKey
  destaque: boolean
  publicado: boolean
  ordem: number
}

export const CATEGORIAS: { slug: string; label: string }[] = [
  { slug: "conteudo-marketing", label: "Conteúdo & Marketing" },
  { slug: "vendas", label: "Vendas" },
  { slug: "gestao-estrategia", label: "Gestão & Estratégia" },
  { slug: "financeiro", label: "Financeiro" },
  { slug: "video", label: "Vídeo" },
  { slug: "design", label: "Design" },
]
