// Peças compartilhadas entre as fases do Método MC.
import type { ReactNode } from "react"
import { useNavigate } from "react-router-dom"
import ReactMarkdown from "react-markdown"
import remarkGfm from "remark-gfm"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  PlayCircleIcon as PlayCircle,
  ExternalLinkIcon as ExternalLink,
  Sparkles2Icon as Sparkles,
} from "@/components/ui/icons"

/** Card "Trilha da fase": vídeos de apoio (link configurável, fallback /trilhas). */
export function TrilhaFase({ url, titulo }: { url?: string; titulo: string }) {
  const navigate = useNavigate()
  return (
    <Card className="border-primary/20 bg-primary/5">
      <CardContent className="flex items-center justify-between gap-4 p-5">
        <div className="flex items-center gap-4 min-w-0">
          <div className="bg-primary/10 p-2.5 rounded-lg shrink-0">
            <PlayCircle className="size-5 text-primary" />
          </div>
          <div className="min-w-0">
            <p className="text-sm font-bold tracking-tight text-foreground">Trilha em vídeo — {titulo}</p>
            <p className="text-[11px] font-medium text-muted-foreground">
              Assista às aulas desta fase antes de executar.
            </p>
          </div>
        </div>
        <Button
          size="sm"
          className="h-9 gap-2 rounded-xl font-bold uppercase tracking-wider text-[11px] shrink-0"
          onClick={() => (url ? window.open(url, "_blank") : navigate("/trilhas"))}
        >
          Assistir
          <ExternalLink className="size-3.5" />
        </Button>
      </CardContent>
    </Card>
  )
}

/** Bloco de conteúdo markdown (respostas da IA / entregáveis). */
export function MarkdownBox({ children }: { children: string }) {
  return (
    <div className="prose prose-sm prose-invert max-w-none text-[13px] leading-relaxed [&_p]:my-2 [&_ul]:my-2 [&_li]:my-0.5 [&_h1]:text-base [&_h2]:text-sm [&_h3]:text-sm [&_strong]:text-foreground text-muted-foreground">
      <ReactMarkdown remarkPlugins={[remarkGfm]}>{children}</ReactMarkdown>
    </div>
  )
}

/** Badge "Gerado por IA". */
export function BadgeIA() {
  return (
    <Badge className="rounded-lg bg-primary/10 text-primary border-primary/20 px-2 py-0.5 text-[10px] font-bold gap-1">
      <Sparkles className="size-3" />
      GERADO POR IA
    </Badge>
  )
}

/** Cabeçalho padrão de fase. */
export function FaseHeader({ numero, titulo, subtitulo, children }: {
  numero: number
  titulo: string
  subtitulo: string
  children?: ReactNode
}) {
  return (
    <div className="flex flex-wrap items-start justify-between gap-4">
      <div className="flex items-start gap-4">
        <div className="size-12 rounded-2xl bg-primary text-primary-foreground flex items-center justify-center font-mono font-extrabold text-lg shrink-0">
          {String(numero).padStart(2, "0")}
        </div>
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-foreground">{titulo}</h2>
          <p className="text-sm font-medium text-muted-foreground">{subtitulo}</p>
        </div>
      </div>
      {children && <div className="flex items-center gap-2">{children}</div>}
    </div>
  )
}

/** Estado vazio padrão. */
export function VazioFase({ children }: { children: ReactNode }) {
  return (
    <div className="flex flex-col items-center justify-center py-12 gap-2 text-center border border-dashed border-border rounded-2xl">
      <p className="text-sm font-medium text-muted-foreground max-w-md">{children}</p>
    </div>
  )
}
