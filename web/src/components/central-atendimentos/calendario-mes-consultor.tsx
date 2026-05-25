import { useMemo, useState } from "react"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Trash2Icon, PlusIcon } from "@/components/ui/icons"
import {
  DIAS_SEMANA,
  isoData,
  formatarDataLonga,
} from "@/lib/atendimentos"
import type { Disponibilidade, ExcecaoConsultor, Feriado } from "@/lib/atendimentos"

interface Props {
  consultorId: string
  janelasSemanais: Disponibilidade[]
  excecoes: ExcecaoConsultor[]
  feriados: Feriado[]
  onAddExcecao: (payload: Omit<ExcecaoConsultor, "id" | "created_at">) => Promise<void>
  onRemoveExcecao: (id: string) => Promise<void>
}

type NovaExcecao = {
  tipo: "bloqueio" | "extra"
  diaInteiro: boolean
  hora_inicio: string
  hora_fim: string
  motivo: string
}

const FORM_INICIAL: NovaExcecao = {
  tipo: "bloqueio",
  diaInteiro: true,
  hora_inicio: "09:00",
  hora_fim: "12:00",
  motivo: "",
}

const HEADER_DIAS = DIAS_SEMANA.map(d => d.curto)

function startOfMonth(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), 1)
}

function addMonths(d: Date, n: number): Date {
  return new Date(d.getFullYear(), d.getMonth() + n, 1)
}

function diasDoMes(refMonth: Date): Date[] {
  const first = startOfMonth(refMonth)
  const firstDayOfWeek = first.getDay() // 0 = dom
  const ultimoDia = new Date(first.getFullYear(), first.getMonth() + 1, 0).getDate()
  const cells: Date[] = []
  for (let i = 0; i < firstDayOfWeek; i++) {
    const d = new Date(first)
    d.setDate(d.getDate() - (firstDayOfWeek - i))
    cells.push(d)
  }
  for (let d = 1; d <= ultimoDia; d++) {
    cells.push(new Date(first.getFullYear(), first.getMonth(), d))
  }
  while (cells.length % 7 !== 0) {
    const last = cells[cells.length - 1]
    const next = new Date(last)
    next.setDate(next.getDate() + 1)
    cells.push(next)
  }
  while (cells.length < 42) {
    const last = cells[cells.length - 1]
    const next = new Date(last)
    next.setDate(next.getDate() + 1)
    cells.push(next)
  }
  return cells.slice(0, 42)
}

export function CalendarioMesConsultor({
  consultorId,
  janelasSemanais,
  excecoes,
  feriados,
  onAddExcecao,
  onRemoveExcecao,
}: Props) {
  const [mesRef, setMesRef] = useState(() => startOfMonth(new Date()))
  const [dataSelecionada, setDataSelecionada] = useState<Date | null>(null)
  const [form, setForm] = useState<NovaExcecao>(FORM_INICIAL)
  const [saving, setSaving] = useState(false)

  const cells = useMemo(() => diasDoMes(mesRef), [mesRef])

  const excecoesPorData = useMemo(() => {
    const m: Record<string, ExcecaoConsultor[]> = {}
    for (const e of excecoes) {
      if (!m[e.data]) m[e.data] = []
      m[e.data].push(e)
    }
    return m
  }, [excecoes])

  const feriadosPorData = useMemo(() => {
    const m: Record<string, Feriado> = {}
    for (const f of feriados) m[f.data] = f
    return m
  }, [feriados])

  const janelasPorDia = useMemo(() => {
    const m: Record<number, Disponibilidade[]> = {}
    for (const j of janelasSemanais) {
      if (!m[j.dia_semana]) m[j.dia_semana] = []
      m[j.dia_semana].push(j)
    }
    return m
  }, [janelasSemanais])

  const isoSelecionada = dataSelecionada ? isoData(dataSelecionada) : null
  const excecoesSelecionadas = isoSelecionada ? excecoesPorData[isoSelecionada] ?? [] : []
  const feriadoSelecionado = isoSelecionada ? feriadosPorData[isoSelecionada] : undefined
  const janelasSelecionadas = dataSelecionada ? janelasPorDia[dataSelecionada.getDay()] ?? [] : []

  function abrir(data: Date) {
    setDataSelecionada(data)
    setForm(FORM_INICIAL)
  }

  function fechar() {
    setDataSelecionada(null)
  }

  async function adicionar() {
    if (!dataSelecionada) return
    const iso = isoData(dataSelecionada)
    if (form.tipo === "bloqueio" && form.diaInteiro) {
      setSaving(true)
      await onAddExcecao({
        consultor_id: consultorId,
        data: iso,
        tipo: "bloqueio",
        hora_inicio: null,
        hora_fim: null,
        motivo: form.motivo.trim() || null,
      })
      setSaving(false)
      setForm(FORM_INICIAL)
      return
    }
    if (form.hora_fim <= form.hora_inicio) {
      alert("Hora fim precisa ser maior que hora início")
      return
    }
    setSaving(true)
    await onAddExcecao({
      consultor_id: consultorId,
      data: iso,
      tipo: form.tipo,
      hora_inicio: form.hora_inicio + ":00",
      hora_fim: form.hora_fim + ":00",
      motivo: form.motivo.trim() || null,
    })
    setSaving(false)
    setForm(FORM_INICIAL)
  }

  const tituloMes = mesRef
    .toLocaleDateString("pt-BR", { month: "long", year: "numeric" })
    .replace(/^./, c => c.toUpperCase())

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <span className="text-[11px] uppercase font-bold tracking-widest text-muted-foreground">
          Datas específicas
        </span>
        <div className="flex items-center gap-1">
          <Button variant="ghost" size="sm" onClick={() => setMesRef(m => addMonths(m, -1))} className="size-7 p-0">
            ‹
          </Button>
          <span className="text-xs font-bold text-foreground w-32 text-center">{tituloMes}</span>
          <Button variant="ghost" size="sm" onClick={() => setMesRef(m => addMonths(m, 1))} className="size-7 p-0">
            ›
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-7 gap-1">
        {HEADER_DIAS.map(d => (
          <div key={d} className="text-center text-[10px] uppercase font-bold tracking-widest text-muted-foreground py-1">
            {d}
          </div>
        ))}
        {cells.map((d, idx) => {
          const iso = isoData(d)
          const noMes = d.getMonth() === mesRef.getMonth()
          const dia = d.getDay()
          const temJanelaSemanal = (janelasPorDia[dia]?.length ?? 0) > 0
          const exs = excecoesPorData[iso] ?? []
          const temExtra = exs.some(e => e.tipo === "extra")
          const temBloqueio = exs.some(e => e.tipo === "bloqueio")
          const bloqFullDay = exs.some(e => e.tipo === "bloqueio" && !e.hora_inicio)
          const feriado = feriadosPorData[iso]
          const temSlot = !feriado && !bloqFullDay && (temJanelaSemanal || temExtra)

          const classes = [
            "relative aspect-square flex flex-col items-center justify-center rounded-lg text-xs font-semibold cursor-pointer transition-colors",
          ]
          if (!noMes) classes.push("opacity-30")
          if (feriado) classes.push("bg-amber-500/10 text-amber-400 border border-amber-500/40")
          else if (bloqFullDay) classes.push("bg-destructive/10 text-destructive line-through border border-destructive/30")
          else if (temSlot) classes.push("bg-primary/10 text-primary hover:bg-primary/20 border border-primary/30")
          else classes.push("text-muted-foreground hover:bg-muted/20 border border-transparent")
          if (temExtra && !bloqFullDay) classes.push("ring-2 ring-emerald-500/50")
          if (temBloqueio && !bloqFullDay) classes.push("ring-2 ring-destructive/50")

          return (
            <button
              key={idx}
              type="button"
              onClick={() => abrir(d)}
              className={classes.join(" ")}
              title={feriado?.nome}
            >
              <span>{d.getDate()}</span>
              {feriado && <span className="absolute bottom-0.5 size-1 rounded-full bg-amber-400" />}
            </button>
          )
        })}
      </div>

      <div className="flex items-center gap-3 flex-wrap text-[10px] uppercase tracking-widest text-muted-foreground pt-1">
        <span className="flex items-center gap-1.5">
          <span className="size-2 rounded-sm bg-primary/40 border border-primary/40" /> Disponível
        </span>
        <span className="flex items-center gap-1.5">
          <span className="size-2 rounded-sm ring-2 ring-emerald-500/60" /> Extra
        </span>
        <span className="flex items-center gap-1.5">
          <span className="size-2 rounded-sm ring-2 ring-destructive/60" /> Bloqueio
        </span>
        <span className="flex items-center gap-1.5">
          <span className="size-2 rounded-sm bg-amber-500/60" /> Feriado
        </span>
      </div>

      <Dialog open={!!dataSelecionada} onOpenChange={v => !v && fechar()}>
        <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold">
              {dataSelecionada ? formatarDataLonga(dataSelecionada) : "—"}
            </DialogTitle>
          </DialogHeader>

          {feriadoSelecionado && (
            <div className="rounded-lg border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-xs text-amber-300">
              <strong>Feriado:</strong> {feriadoSelecionado.nome}. Bloqueado para todos os consultores.
            </div>
          )}

          <div className="space-y-1.5">
            <div className="text-[10px] uppercase font-bold tracking-widest text-muted-foreground">
              Janelas semanais herdadas
            </div>
            {janelasSelecionadas.length === 0 ? (
              <p className="text-xs text-muted-foreground">Sem disponibilidade semanal nesse dia da semana.</p>
            ) : (
              <ul className="text-xs text-foreground space-y-0.5">
                {janelasSelecionadas.map(j => (
                  <li key={j.id}>
                    • {j.hora_inicio.slice(0, 5)} às {j.hora_fim.slice(0, 5)}
                  </li>
                ))}
              </ul>
            )}
          </div>

          {excecoesSelecionadas.length > 0 && (
            <div className="space-y-1.5">
              <div className="text-[10px] uppercase font-bold tracking-widest text-muted-foreground">
                Exceções cadastradas
              </div>
              <div className="space-y-1.5">
                {excecoesSelecionadas.map(e => (
                  <div
                    key={e.id}
                    className="flex items-center gap-2 p-2 rounded-lg bg-background/60 border border-border/50"
                  >
                    <Badge
                      variant="outline"
                      className={
                        e.tipo === "bloqueio"
                          ? "text-[9px] uppercase font-bold bg-destructive/10 border-destructive/30 text-destructive"
                          : "text-[9px] uppercase font-bold bg-emerald-500/10 border-emerald-500/30 text-emerald-400"
                      }
                    >
                      {e.tipo}
                    </Badge>
                    <span className="text-xs text-foreground flex-1">
                      {e.hora_inicio
                        ? `${e.hora_inicio.slice(0, 5)} – ${e.hora_fim?.slice(0, 5)}`
                        : "Dia inteiro"}
                      {e.motivo ? ` · ${e.motivo}` : ""}
                    </span>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => onRemoveExcecao(e.id)}
                      className="text-destructive hover:bg-destructive/10"
                    >
                      <Trash2Icon className="size-3.5" />
                    </Button>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="space-y-2 pt-2 border-t border-border/50">
            <div className="text-[10px] uppercase font-bold tracking-widest text-muted-foreground">
              Nova exceção
            </div>
            <div className="flex gap-2">
              <Button
                type="button"
                variant={form.tipo === "bloqueio" ? "default" : "outline"}
                size="sm"
                onClick={() => setForm(f => ({ ...f, tipo: "bloqueio" }))}
                className="flex-1"
              >
                Bloquear
              </Button>
              <Button
                type="button"
                variant={form.tipo === "extra" ? "default" : "outline"}
                size="sm"
                onClick={() => setForm(f => ({ ...f, tipo: "extra", diaInteiro: false }))}
                className="flex-1"
              >
                Atender extra
              </Button>
            </div>

            {form.tipo === "bloqueio" && (
              <label className="flex items-center gap-2 text-xs text-foreground cursor-pointer">
                <input
                  type="checkbox"
                  checked={form.diaInteiro}
                  onChange={e => setForm(f => ({ ...f, diaInteiro: e.target.checked }))}
                />
                Dia inteiro
              </label>
            )}

            {!(form.tipo === "bloqueio" && form.diaInteiro) && (
              <div className="flex items-center gap-2">
                <Input
                  type="time"
                  value={form.hora_inicio}
                  onChange={e => setForm(f => ({ ...f, hora_inicio: e.target.value }))}
                  className="w-28 h-9"
                />
                <span className="text-muted-foreground text-xs">até</span>
                <Input
                  type="time"
                  value={form.hora_fim}
                  onChange={e => setForm(f => ({ ...f, hora_fim: e.target.value }))}
                  className="w-28 h-9"
                />
              </div>
            )}

            <Input
              placeholder="Motivo (opcional)"
              value={form.motivo}
              onChange={e => setForm(f => ({ ...f, motivo: e.target.value }))}
            />

            <Button onClick={adicionar} disabled={saving} className="w-full gap-2">
              <PlusIcon className="size-3.5" />
              {saving ? "Salvando..." : "Adicionar exceção"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
