// Categorias do feed de Novidades (Comunidade). Compartilhadas entre a página
// do cliente e o cadastro do admin.
export interface CategoriaNovidade {
  slug: string
  label: string
  emoji: string
  // classes do chip (tag) quando ativo/inativo
  cor: string
}

export const CATEGORIAS: CategoriaNovidade[] = [
  { slug: "avisos", label: "Avisos", emoji: "📣", cor: "text-sky-400 border-sky-500/30 bg-sky-500/10" },
  { slug: "insights", label: "Insights", emoji: "💡", cor: "text-amber-400 border-amber-500/30 bg-amber-500/10" },
  { slug: "ofertas", label: "Ofertas", emoji: "🔥", cor: "text-rose-400 border-rose-500/30 bg-rose-500/10" },
  { slug: "conteudo", label: "Conteúdo", emoji: "📚", cor: "text-violet-400 border-violet-500/30 bg-violet-500/10" },
  { slug: "oficial", label: "Post Oficial", emoji: "🏅", cor: "text-primary border-primary/30 bg-primary/10" },
]

export function categoria(slug: string | null | undefined): CategoriaNovidade {
  return CATEGORIAS.find((c) => c.slug === slug) ?? CATEGORIAS[0]
}
