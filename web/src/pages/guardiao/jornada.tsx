import { Link } from "react-router-dom"

import { PageHeader, Badge } from "@/components/guardiao/ui-kit"
import { useStore, FASES, progressoFase, type Fase, type StatusFase } from "@/lib/guardiao"
import { ArrowRight, ShieldCheck, BarChart3, AlertTriangle, Cog, Bot, Layers, TrendingUp } from "lucide-react"

const ICONS: Record<Fase, typeof ShieldCheck> = {
  1: ShieldCheck, 2: BarChart3, 3: AlertTriangle, 4: Cog, 5: Bot, 6: Layers, 7: TrendingUp,
}

function toneFor(status: StatusFase): "default" | "neon" | "warn" | "ok" {
  if (status === "Concluída" || status === "Validada") return "ok"
  if (status === "Em andamento" || status === "Aguardando validação") return "neon"
  if (status === "Bloqueada") return "default"
  return "warn"
}

export default function JornadaHub() {
  const st = useStore((s) => s)

  return (
    <div className="space-y-6">
      <PageHeader
        title="Jornada das 7 Fases"
        subtitle="Use as fases como guia para entender o caminho da implementação."
      />

      <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-4">
        {FASES.map((f) => {
          const Icon = ICONS[f.num]
          const estado = st.jornada.fases[f.num]
          const prog = progressoFase(st, f.num)
          const setoresNaFase = st.setores.filter((s) => (s.faseAtual ?? 1) === f.num).length
          const tarefasNaFase = st.tarefas.filter((t) => t.fase === f.num).length

          return (
            <Link
              key={f.num}
              to={`/guardiao/fases/${f.num}`}
              className="rounded-lg border bg-card p-4 flex flex-col gap-3 hover:glow-neon transition"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="h-9 w-9 rounded-lg bg-muted flex items-center justify-center text-primary">
                    <Icon className="h-4 w-4" />
                  </div>
                  <div>
                    <div className="text-[11px] text-muted-foreground">Fase 0{f.num}{f.num === 7 ? " · paralela" : ""}</div>
                    <div className="text-sm font-semibold leading-tight">{f.titulo}</div>
                  </div>
                </div>
                <Badge tone={toneFor(estado.status)}>{estado.status}</Badge>
              </div>

              <p className="text-xs text-muted-foreground line-clamp-2">{f.objetivo}</p>

              <div className="h-1 w-full bg-muted rounded-full overflow-hidden">
                <div className="h-full bg-primary" style={{ width: `${prog}%` }} />
              </div>

              <div className="flex items-center justify-between text-[11px] text-muted-foreground">
                <span>{setoresNaFase} setores</span>
                <span>{tarefasNaFase} tarefas</span>
                <span className="text-primary inline-flex items-center gap-1">Ver fase <ArrowRight className="h-3 w-3" /></span>
              </div>
            </Link>
          )
        })}
      </div>
    </div>
  )
}
