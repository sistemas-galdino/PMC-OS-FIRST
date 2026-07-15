// UI compartilhada das páginas de Conhecimento → Multiplicadores e Skills.
// Thumbnail em gradiente + ícone grande + badges (no lugar das artes de robô do
// print de referência, usamos o design system do PMC).
import {
  LayoutDashboardIcon,
  TargetIcon,
  ShieldCheckIcon,
  MegaphoneIcon,
  UserPlusIcon,
  BanknoteIcon,
  MessageSquareIcon,
  UsersIcon,
  CompassIcon,
  VideoIcon,
  FlagIcon,
  Sparkles2Icon,
  BookOpenIcon,
  ZapIcon,
  PackageIcon,
  TrendingUpIcon,
  FileTextIcon,
  BotIcon,
} from "@/components/ui/icons"

export type IconKey =
  | "dashboard" | "target" | "shield" | "megaphone" | "userplus" | "banknote"
  | "message" | "users" | "compass" | "video" | "flag" | "sparkles"
  | "book" | "zap" | "package" | "trending" | "file" | "bot"

export const ICON_MAP: Record<IconKey, React.ComponentType<{ className?: string }>> = {
  dashboard: LayoutDashboardIcon,
  target: TargetIcon,
  shield: ShieldCheckIcon,
  megaphone: MegaphoneIcon,
  userplus: UserPlusIcon,
  banknote: BanknoteIcon,
  message: MessageSquareIcon,
  users: UsersIcon,
  compass: CompassIcon,
  video: VideoIcon,
  flag: FlagIcon,
  sparkles: Sparkles2Icon,
  book: BookOpenIcon,
  zap: ZapIcon,
  package: PackageIcon,
  trending: TrendingUpIcon,
  file: FileTextIcon,
  bot: BotIcon,
}

export type CorKey = "lime" | "sky" | "violet" | "rose" | "amber" | "emerald"

export const COR: Record<CorKey, { grad: string; fg: string; chip: string }> = {
  lime: { grad: "from-primary/25 via-primary/10", fg: "text-primary", chip: "bg-primary/15 text-primary border-primary/30" },
  sky: { grad: "from-sky-500/25 via-sky-500/10", fg: "text-sky-400", chip: "bg-sky-500/15 text-sky-300 border-sky-500/30" },
  violet: { grad: "from-violet-500/25 via-violet-500/10", fg: "text-violet-400", chip: "bg-violet-500/15 text-violet-300 border-violet-500/30" },
  rose: { grad: "from-rose-500/25 via-rose-500/10", fg: "text-rose-400", chip: "bg-rose-500/15 text-rose-300 border-rose-500/30" },
  amber: { grad: "from-amber-500/25 via-amber-500/10", fg: "text-amber-400", chip: "bg-amber-500/15 text-amber-300 border-amber-500/30" },
  emerald: { grad: "from-emerald-500/25 via-emerald-500/10", fg: "text-emerald-400", chip: "bg-emerald-500/15 text-emerald-300 border-emerald-500/30" },
}

export const COR_OPTIONS: CorKey[] = ["lime", "sky", "violet", "rose", "amber", "emerald"]
export const ICON_OPTIONS = Object.keys(ICON_MAP) as IconKey[]

interface ThumbProps {
  icon: IconKey
  cor: CorKey
  tipoLabel?: string
  tags?: string[]
  className?: string
}

/** Bloco de capa (aspect 16:10) com gradiente, ícone grande e badges nos cantos. */
export function ItemThumb({ icon, cor, tipoLabel, tags = [], className = "" }: ThumbProps) {
  const c = COR[cor]
  const Icon = ICON_MAP[icon]
  return (
    <div className={`relative aspect-[16/10] w-full overflow-hidden bg-gradient-to-br ${c.grad} to-transparent ${className}`}>
      {/* grade sutil de fundo */}
      <div
        className="absolute inset-0 opacity-[0.06]"
        style={{
          backgroundImage: "linear-gradient(currentColor 1px, transparent 1px), linear-gradient(90deg, currentColor 1px, transparent 1px)",
          backgroundSize: "22px 22px",
        }}
      />
      <div className="absolute inset-0 flex items-center justify-center">
        <div className={`rounded-2xl bg-background/40 backdrop-blur-sm p-5 ring-1 ring-border/50 ${c.fg}`}>
          <Icon className="size-10" />
        </div>
      </div>
      {tipoLabel && (
        <span className={`absolute top-3 left-3 rounded-lg border px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide ${c.chip}`}>
          {tipoLabel}
        </span>
      )}
      {tags.length > 0 && (
        <div className="absolute top-3 right-3 flex gap-1.5">
          {tags.slice(0, 2).map((t) => (
            <span key={t} className="rounded-lg border border-border bg-background/60 backdrop-blur-sm px-2 py-0.5 text-[10px] font-bold text-muted-foreground">
              {t}
            </span>
          ))}
        </div>
      )}
    </div>
  )
}
