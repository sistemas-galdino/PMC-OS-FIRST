// Conquistas MC — apresentação (arte). O conteúdo (nome, descrição, critério,
// raridade, meta) vem da tabela badges_catalogo; aqui só mapeamos ícone →
// componente e raridade → estilo visual. Níveis usam os arquétipos (arq_*).
import {
  CheckCircle2Icon, Sparkles2Icon, TargetIcon, ShieldCheckIcon, UsersIcon,
  TrophyIcon, StarIcon, CalendarIcon, MessageCircleIcon, TrendingUpIcon,
} from "@/components/ui/icons"

export interface BadgeCatalogo {
  slug: string
  nome: string
  descricao: string
  criterio: string
  raridade: "bronze" | "prata" | "ouro" | "lenda"
  icone: string
  trilha: string
  ordem: number
  meta_metrica: string
  meta_valor: number
  auto: boolean
}

export interface BadgeGanha { slug: string; em: string }

export const TRILHAS: Record<string, string> = {
  execucao: "Execução",
  vitorias: "Vitórias",
  metodo: "Método MC",
  nivel: "Níveis",
  constancia: "Constância",
  comunidade: "Comunidade",
}

// Ícones não-arquétipo. arq_* é tratado à parte (imagem em /niveis/*.png).
const ICONE_MAP: Record<string, any> = {
  check: CheckCircle2Icon,
  zap: Sparkles2Icon,
  flame: Sparkles2Icon,
  rocket: TrendingUpIcon,
  star: StarIcon,
  trophy: TrophyIcon,
  medal: TrophyIcon,
  crown: TrophyIcon,
  shield: ShieldCheckIcon,
  brain: Sparkles2Icon,
  target: TargetIcon,
  users: UsersIcon,
  cpu: TargetIcon,
  coins: TrendingUpIcon,
  calendar: CalendarIcon,
  message: MessageCircleIcon,
}

const ARQUETIPO: Record<string, string> = {
  arq_construtor: "/niveis/construtor.png",
  arq_multiplicador: "/niveis/multiplicador.png",
  arq_arquiteto: "/niveis/arquiteto.png",
  arq_mestre: "/niveis/mestre.png",
}

export function arquetipoDaBadge(icone: string): string | null {
  return ARQUETIPO[icone] ?? null
}

export function iconeDaBadge(icone: string): any {
  return ICONE_MAP[icone] ?? StarIcon
}

// Estilo por raridade (moldura + brilho). Aplicado só quando conquistada.
export const RARIDADE: Record<string, { label: string; bg: string; borda: string; texto: string; brilho: string; medalha: string }> = {
  bronze: { label: "Bronze", bg: "bg-amber-700/15", borda: "border-amber-600/40", texto: "text-amber-800", brilho: "", medalha: "/medalhas/bronze.png" },
  prata: { label: "Prata", bg: "bg-slate-400/15", borda: "border-slate-300/40", texto: "text-slate-700", brilho: "", medalha: "/medalhas/prata.png" },
  ouro: { label: "Ouro", bg: "bg-amber-400/15", borda: "border-amber-400/50", texto: "text-amber-900", brilho: "shadow-[0_0_20px_rgba(251,191,36,0.15)]", medalha: "/medalhas/ouro.png" },
  lenda: { label: "Lenda", bg: "bg-primary/15", borda: "border-primary/50", texto: "text-lime-950", brilho: "shadow-[0_0_28px_rgba(218,252,103,0.25)]", medalha: "/medalhas/lenda.png" },
}
