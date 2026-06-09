import { useMemo, useState } from "react"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  VideoIcon,
  FileTextIcon,
  ExternalLinkIcon,
  ClockIcon,
  Building2Icon,
  CalendarIcon,
  UserCheckIcon,
} from "@/components/ui/icons"
import {
  isoData,
  addDias,
  inicioDaSemana,
  formatarDataLonga,
  statusEfetivo,
  STATUS_EFETIVO_BADGE,
  STATUS_EFETIVO_LABEL,
  DIAS_SEMANA,
} from "@/lib/atendimentos"
import type { AgendamentoCentral, StatusEfetivo } from "@/lib/atendimentos"

interface Props {
  agendamentos: AgendamentoCentral[]
  consultorNome: string
}

const HOUR_PX = 56
const JANELA_PADRAO_INICIO = 7 // 07h
const JANELA_PADRAO_FIM = 20 // 20h
const DURACAO_PADRAO = 60
const DURACAO_MIN_VISUAL = 30 // blocos curtos ainda ficam clicáveis

// Cores sólidas por status (derivadas de STATUS_EFETIVO_BADGE, mas preenchidas
// pra leitura tipo Google Agenda).
const BLOCO_COR: Record<StatusEfetivo, string> = {
  agendada: "bg-amber-500 border-amber-600 text-white",
  realizada: "bg-primary border-primary text-primary-foreground",
  faltou: "bg-destructive border-destructive text-white",
  cancelado: "bg-muted border-border text-muted-foreground line-through",
}

type ItemTempo = {
  ag: AgendamentoCentral
  inicioMin: number
  fimMin: number
}

type Bloco = ItemTempo & {
  col: number
  cols: number
}

function horaParaMin(hhmmss: string): number {
  const [h, m] = hhmmss.split(":").map(Number)
  return (h || 0) * 60 + (m || 0)
}

function minParaHHMM(min: number): string {
  const h = Math.floor(min / 60)
  const m = min % 60
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`
}

function mesAbrev(d: Date): string {
  return d.toLocaleDateString("pt-BR", { month: "short" }).replace(".", "")
}

function capitalizar(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1)
}

// Empacota reuniões que se sobrepõem no mesmo dia em colunas lado a lado.
function empacotarDia(items: ItemTempo[]): Bloco[] {
  const ordenados = [...items].sort(
    (a, b) => a.inicioMin - b.inicioMin || a.fimMin - b.fimMin,
  )
  const blocos: Bloco[] = []
  let cluster: ItemTempo[] = []
  let clusterFim = -1

  function flush() {
    if (cluster.length === 0) return
    const colEnds: number[] = [] // fim (min) da última reunião em cada coluna
    const atribuidos = cluster.map(it => {
      let col = colEnds.findIndex(end => end <= it.inicioMin)
      if (col === -1) {
        col = colEnds.length
        colEnds.push(it.fimMin)
      } else {
        colEnds[col] = it.fimMin
      }
      return { it, col }
    })
    const cols = colEnds.length
    for (const { it, col } of atribuidos) {
      blocos.push({ ...it, col, cols })
    }
    cluster = []
    clusterFim = -1
  }

  for (const it of ordenados) {
    if (cluster.length > 0 && it.inicioMin >= clusterFim) flush()
    cluster.push(it)
    clusterFim = Math.max(clusterFim, it.fimMin)
  }
  flush()
  return blocos
}

export function CalendarioAgendaConsultor({ agendamentos, consultorNome }: Props) {
  const [view, setView] = useState<"semana" | "dia">("semana")
  const [refDate, setRefDate] = useState(() => {
    const n = new Date()
    return new Date(n.getFullYear(), n.getMonth(), n.getDate())
  })
  const [selecionado, setSelecionado] = useState<AgendamentoCentral | null>(null)

  // Reuniões canceladas não aparecem na grade (igual às listas).
  const visiveis = useMemo(
    () => agendamentos.filter(a => statusEfetivo(a) !== "cancelado"),
    [agendamentos],
  )

  const porData = useMemo(() => {
    const m: Record<string, AgendamentoCentral[]> = {}
    for (const a of visiveis) {
      if (!a.data_reuniao) continue
      const dia = a.data_reuniao.slice(0, 10)
      if (!m[dia]) m[dia] = []
      m[dia].push(a)
    }
    return m
  }, [visiveis])

  const dias = useMemo(() => {
    if (view === "dia") return [refDate]
    const ini = inicioDaSemana(refDate)
    return Array.from({ length: 7 }, (_, i) => addDias(ini, i))
  }, [view, refDate])

  // Blocos posicionáveis (com horário) e "sem horário", por dia visível.
  const { blocosPorDia, semHorarioPorDia, janelaInicioMin, totalHeight, horas } =
    useMemo(() => {
      const blocosPorDia: Record<string, Bloco[]> = {}
      const semHorarioPorDia: Record<string, AgendamentoCentral[]> = {}
      let minMin = JANELA_PADRAO_INICIO * 60
      let maxMin = JANELA_PADRAO_FIM * 60

      for (const d of dias) {
        const iso = isoData(d)
        const doDia = porData[iso] ?? []
        const comHora: ItemTempo[] = []
        const semHora: AgendamentoCentral[] = []
        for (const a of doDia) {
          if (!a.horario) {
            semHora.push(a)
            continue
          }
          const inicioMin = horaParaMin(a.horario)
          const dur = Math.max(a.duracao_minutos ?? DURACAO_PADRAO, DURACAO_MIN_VISUAL)
          const item = { ag: a, inicioMin, fimMin: inicioMin + dur }
          comHora.push(item)
          minMin = Math.min(minMin, inicioMin)
          maxMin = Math.max(maxMin, item.fimMin)
        }
        blocosPorDia[iso] = empacotarDia(comHora)
        if (semHora.length) semHorarioPorDia[iso] = semHora
      }

      const janelaInicioH = Math.max(0, Math.floor(minMin / 60))
      const janelaFimH = Math.min(24, Math.ceil(maxMin / 60))
      const horas = Array.from(
        { length: janelaFimH - janelaInicioH + 1 },
        (_, i) => janelaInicioH + i,
      )
      return {
        blocosPorDia,
        semHorarioPorDia,
        janelaInicioMin: janelaInicioH * 60,
        totalHeight: (janelaFimH - janelaInicioH) * HOUR_PX,
        horas,
      }
    }, [dias, porData])

  const hojeIso = isoData(new Date())

  function navegar(dir: -1 | 1) {
    setRefDate(d => addDias(d, dir * (view === "semana" ? 7 : 1)))
  }
  function irHoje() {
    const n = new Date()
    setRefDate(new Date(n.getFullYear(), n.getMonth(), n.getDate()))
  }

  const titulo = useMemo(() => {
    if (view === "dia") return capitalizar(formatarDataLonga(refDate))
    const ini = dias[0]
    const fim = dias[dias.length - 1]
    if (ini.getMonth() === fim.getMonth()) {
      return `${ini.getDate()} – ${fim.getDate()} de ${capitalizar(
        ini.toLocaleDateString("pt-BR", { month: "long" }),
      )} ${ini.getFullYear()}`
    }
    return `${ini.getDate()} ${mesAbrev(ini)} – ${fim.getDate()} ${mesAbrev(
      fim,
    )} ${fim.getFullYear()}`
  }, [view, refDate, dias])

  const totalVisiveis = visiveis.length
  const gridCols = `56px repeat(${dias.length}, minmax(130px, 1fr))`

  return (
    <div className="space-y-4">
      {/* Navegação + troca de view */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={irHoje} className="font-bold">
            Hoje
          </Button>
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navegar(-1)}
              className="size-8 p-0 text-base"
              aria-label="Anterior"
            >
              ‹
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navegar(1)}
              className="size-8 p-0 text-base"
              aria-label="Próximo"
            >
              ›
            </Button>
          </div>
          <span className="text-sm font-bold text-foreground">{titulo}</span>
        </div>
        <div className="flex items-center gap-1 bg-muted/20 rounded-lg p-1 border border-border">
          {(["semana", "dia"] as const).map(v => (
            <Button
              key={v}
              variant={view === v ? "default" : "ghost"}
              size="sm"
              onClick={() => setView(v)}
              className="font-bold capitalize h-8"
            >
              {v}
            </Button>
          ))}
        </div>
      </div>

      {/* Grade */}
      <div className="rounded-xl border border-border overflow-auto" style={{ maxHeight: 640 }}>
        <div className="grid relative" style={{ gridTemplateColumns: gridCols }}>
          {/* Linha 1: canto + cabeçalhos de dia (sticky no topo) */}
          <div className="sticky top-0 left-0 z-30 bg-card border-b border-r border-border" />
          {dias.map(d => {
            const iso = isoData(d)
            const ehHoje = iso === hojeIso
            const sem = semHorarioPorDia[iso] ?? []
            return (
              <div
                key={iso}
                className="sticky top-0 z-20 bg-card border-b border-border flex flex-col items-center gap-1 py-2 px-1"
              >
                <span className="text-[10px] uppercase font-bold tracking-wider text-muted-foreground">
                  {DIAS_SEMANA[d.getDay()].curto}
                </span>
                <span
                  className={
                    ehHoje
                      ? "size-7 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-sm font-bold"
                      : "text-sm font-bold text-foreground"
                  }
                >
                  {d.getDate()}
                </span>
                {sem.length > 0 && (
                  <div className="w-full space-y-0.5 mt-0.5">
                    {sem.slice(0, 2).map(a => (
                      <button
                        key={a.id_unico}
                        onClick={() => setSelecionado(a)}
                        className="w-full truncate rounded bg-muted/40 border border-border px-1 py-0.5 text-[9px] font-semibold text-foreground hover:bg-muted/70"
                        title={`Sem horário · ${a.empresa ?? a.cliente_nome ?? ""}`}
                      >
                        {a.empresa ?? a.cliente_nome ?? "Reunião"}
                      </button>
                    ))}
                    {sem.length > 2 && (
                      <div className="text-[9px] text-center text-muted-foreground font-semibold">
                        +{sem.length - 2} s/ horário
                      </div>
                    )}
                  </div>
                )}
              </div>
            )
          })}

          {/* Linha 2: gutter de horas + colunas dos dias */}
          <div
            className="sticky left-0 z-10 bg-card border-r border-border relative"
            style={{ height: totalHeight }}
          >
            {horas.map((h, i) => (
              <div
                key={h}
                className="absolute right-1 text-[10px] font-semibold text-muted-foreground"
                style={{ top: i * HOUR_PX - (i === 0 ? 0 : 6) }}
              >
                {String(h).padStart(2, "0")}h
              </div>
            ))}
          </div>

          {dias.map(d => {
            const iso = isoData(d)
            const blocos = blocosPorDia[iso] ?? []
            const ehHoje = iso === hojeIso
            return (
              <div
                key={iso}
                className={`relative border-r border-border/40 ${ehHoje ? "bg-primary/[0.03]" : ""}`}
                style={{ height: totalHeight }}
              >
                {/* linhas de hora */}
                {horas.map((h, i) => (
                  <div
                    key={h}
                    className="absolute inset-x-0 border-t border-border/30"
                    style={{ top: i * HOUR_PX }}
                  />
                ))}
                {/* blocos das reuniões */}
                {blocos.map(b => {
                  const status = statusEfetivo(b.ag)
                  const top = ((b.inicioMin - janelaInicioMin) / 60) * HOUR_PX
                  const height = ((b.fimMin - b.inicioMin) / 60) * HOUR_PX
                  const widthPct = 100 / b.cols
                  const leftPct = b.col * widthPct
                  return (
                    <button
                      key={b.ag.id_unico}
                      onClick={() => setSelecionado(b.ag)}
                      className={`absolute rounded-md border px-1.5 py-1 text-left overflow-hidden shadow-sm hover:brightness-110 transition ${BLOCO_COR[status]}`}
                      style={{
                        top: top + 1,
                        height: Math.max(height - 2, 16),
                        left: `calc(${leftPct}% + 2px)`,
                        width: `calc(${widthPct}% - 4px)`,
                      }}
                      title={`${minParaHHMM(b.inicioMin)} · ${b.ag.empresa ?? b.ag.cliente_nome ?? ""}`}
                    >
                      <div className="text-[10px] font-bold leading-tight">
                        {minParaHHMM(b.inicioMin)}
                      </div>
                      <div className="text-[11px] font-semibold leading-tight truncate">
                        {b.ag.empresa ?? b.ag.cliente_nome ?? "Reunião"}
                      </div>
                      {b.ag.codigo_cliente != null && (
                        <div className="text-[9px] font-semibold leading-tight opacity-80 truncate">
                          ID {b.ag.codigo_cliente}
                        </div>
                      )}
                    </button>
                  )
                })}
              </div>
            )
          })}
        </div>
      </div>

      {totalVisiveis === 0 && (
        <div className="py-10 text-center space-y-2">
          <div className="mx-auto size-12 rounded-2xl bg-muted/20 flex items-center justify-center">
            <CalendarIcon className="size-5 text-muted-foreground" />
          </div>
          <p className="text-sm text-muted-foreground">
            Nenhuma reunião para {consultorNome}.
          </p>
        </div>
      )}

      <AgendamentoDetalhe ag={selecionado} onClose={() => setSelecionado(null)} />
    </div>
  )
}

function AgendamentoDetalhe({
  ag,
  onClose,
}: {
  ag: AgendamentoCentral | null
  onClose: () => void
}) {
  if (!ag) return null
  const status = statusEfetivo(ag)
  const aguardandoMeet = status === "agendada" && !ag.link_meet
  const data = ag.data_reuniao
    ? capitalizar(formatarDataLonga(new Date(ag.data_reuniao + "T00:00:00")))
    : "Sem data"
  return (
    <Dialog open={!!ag} onOpenChange={v => !v && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-lg font-bold">
            <Building2Icon className="size-5 text-muted-foreground" />
            {ag.empresa ?? "—"}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <Badge
              variant="outline"
              className={`uppercase font-bold text-[9px] px-2 ${STATUS_EFETIVO_BADGE[status]}`}
            >
              {STATUS_EFETIVO_LABEL[status]}
            </Badge>
          </div>

          <div className="flex items-center gap-2 text-sm text-foreground">
            <UserCheckIcon className="size-4 text-muted-foreground" />
            {ag.cliente_nome ?? ag.cliente_email ?? "Cliente"}
          </div>

          {ag.codigo_cliente != null && (
            <div className="flex items-center gap-2 text-sm">
              <span className="text-[10px] uppercase font-bold tracking-widest text-muted-foreground">
                ID do cliente
              </span>
              <span className="font-bold text-foreground">#{ag.codigo_cliente}</span>
            </div>
          )}

          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <CalendarIcon className="size-4" />
            {data}
            <span className="mx-1">·</span>
            <ClockIcon className="size-4" />
            {(ag.horario ?? "").slice(0, 5) || "Sem horário"}
            {ag.duracao_minutos ? ` (${ag.duracao_minutos}min)` : ""}
          </div>

          {(ag.link_meet || aguardandoMeet || ag.link_gravacao || ag.link_geminidoc) && (
            <div className="flex flex-wrap gap-2 pt-2 border-t border-border/50">
              {ag.link_meet && (
                <Button
                  onClick={() => window.open(ag.link_meet!, "_blank", "noopener,noreferrer")}
                  className="font-bold"
                >
                  <VideoIcon className="size-4" />
                  Entrar no Meet
                  <ExternalLinkIcon className="size-3.5" />
                </Button>
              )}
              {aguardandoMeet && (
                <span className="text-xs text-muted-foreground italic">Aguardando link do Meet</span>
              )}
              {ag.link_gravacao && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => window.open(ag.link_gravacao!, "_blank", "noopener,noreferrer")}
                  className="font-bold text-xs"
                >
                  <VideoIcon className="size-3.5" />
                  Gravação
                </Button>
              )}
              {ag.link_geminidoc && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => window.open(ag.link_geminidoc!, "_blank", "noopener,noreferrer")}
                  className="font-bold text-xs"
                >
                  <FileTextIcon className="size-3.5" />
                  Doc
                </Button>
              )}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
