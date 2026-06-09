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
  diasDoMes,
  slotsDisponiveisNaData,
} from "@/lib/atendimentos"
import type { Disponibilidade, ExcecaoConsultor, Feriado } from "@/lib/atendimentos"

interface Props {
  consultorId: string
  duracaoMinutos: number
  janelasSemanais: Disponibilidade[]
  excecoes: ExcecaoConsultor[]
  feriados: Feriado[]
  onAddExcecoes: (payloads: Omit<ExcecaoConsultor, "id" | "created_at">[]) => Promise<void>
  onRemoveExcecao: (id: string) => Promise<void>
}

type Faixa = { hora_inicio: string; hora_fim: string }

type NovaExcecao = {
  tipo: "bloqueio" | "extra"
  diaInteiro: boolean
  slotsBloqueio: Set<string>
  faixasExtra: Faixa[]
  motivo: string
}

const FAIXA_PADRAO: Faixa = { hora_inicio: "09:00", hora_fim: "12:00" }

const FORM_INICIAL: NovaExcecao = {
  tipo: "bloqueio",
  diaInteiro: true,
  slotsBloqueio: new Set<string>(),
  faixasExtra: [{ ...FAIXA_PADRAO }],
  motivo: "",
}

const HEADER_DIAS = DIAS_SEMANA.map(d => d.curto)

function startOfMonth(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), 1)
}

function addMonths(d: Date, n: number): Date {
  return new Date(d.getFullYear(), d.getMonth() + n, 1)
}

function addMinutosHHMM(hhmm: string, mins: number): string {
  const [h, m] = hhmm.split(":").map(Number)
  const total = h * 60 + m + mins
  const nh = Math.floor(total / 60) % 24
  const nm = total % 60
  return `${String(nh).padStart(2, "0")}:${String(nm).padStart(2, "0")}`
}

export function CalendarioMesConsultor({
  consultorId,
  duracaoMinutos,
  janelasSemanais,
  excecoes,
  feriados,
  onAddExcecoes,
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

  function resetForm() {
    setForm({
      tipo: "bloqueio",
      diaInteiro: true,
      slotsBloqueio: new Set<string>(),
      faixasExtra: [{ ...FAIXA_PADRAO }],
      motivo: "",
    })
  }

  function abrir(data: Date) {
    setDataSelecionada(data)
    resetForm()
  }

  function fechar() {
    setDataSelecionada(null)
  }

  function toggleSlot(slot: string) {
    setForm(f => {
      const next = new Set(f.slotsBloqueio)
      if (next.has(slot)) next.delete(slot)
      else next.add(slot)
      return { ...f, slotsBloqueio: next }
    })
  }

  function atualizarFaixaExtra(idx: number, patch: Partial<Faixa>) {
    setForm(f => ({
      ...f,
      faixasExtra: f.faixasExtra.map((fx, i) => (i === idx ? { ...fx, ...patch } : fx)),
    }))
  }

  function adicionarFaixaExtra() {
    setForm(f => ({ ...f, faixasExtra: [...f.faixasExtra, { ...FAIXA_PADRAO }] }))
  }

  function removerFaixaExtra(idx: number) {
    setForm(f => ({
      ...f,
      faixasExtra: f.faixasExtra.length > 1
        ? f.faixasExtra.filter((_, i) => i !== idx)
        : f.faixasExtra,
    }))
  }

  const slotsDisponiveis = useMemo(() => {
    if (!dataSelecionada) return []
    const feriadosSet = new Set(feriados.map(f => f.data))
    return slotsDisponiveisNaData({
      data: dataSelecionada,
      janelas: janelasSemanais,
      excecoes,
      feriados: feriadosSet,
      duracao_minutos: duracaoMinutos,
    })
  }, [dataSelecionada, janelasSemanais, excecoes, feriados, duracaoMinutos])

  async function adicionar() {
    if (!dataSelecionada) return
    const iso = isoData(dataSelecionada)
    const motivo = form.motivo.trim() || null

    if (form.tipo === "bloqueio" && form.diaInteiro) {
      setSaving(true)
      await onAddExcecoes([{
        consultor_id: consultorId,
        data: iso,
        tipo: "bloqueio",
        hora_inicio: null,
        hora_fim: null,
        motivo,
      }])
      setSaving(false)
      resetForm()
      return
    }

    if (form.tipo === "bloqueio") {
      if (form.slotsBloqueio.size === 0) {
        alert("Selecione pelo menos um horário pra bloquear")
        return
      }
      setSaving(true)
      const payloads = Array.from(form.slotsBloqueio).map(slot => ({
        consultor_id: consultorId,
        data: iso,
        tipo: "bloqueio" as const,
        hora_inicio: slot + ":00",
        hora_fim: addMinutosHHMM(slot, duracaoMinutos) + ":00",
        motivo,
      }))
      await onAddExcecoes(payloads)
      setSaving(false)
      resetForm()
      return
    }

    // tipo === "extra"
    if (form.faixasExtra.length === 0) {
      alert("Adicione pelo menos uma faixa de horário")
      return
    }
    for (const fx of form.faixasExtra) {
      if (fx.hora_fim <= fx.hora_inicio) {
        alert("Hora fim precisa ser maior que hora início em todas as faixas")
        return
      }
    }

    setSaving(true)
    await onAddExcecoes(form.faixasExtra.map(fx => ({
      consultor_id: consultorId,
      data: iso,
      tipo: "extra" as const,
      hora_inicio: fx.hora_inicio + ":00",
      hora_fim: fx.hora_fim + ":00",
      motivo,
    })))
    setSaving(false)
    resetForm()
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
          <span className="size-2 rounded-sm ring-2 ring-emerald-500/60" /> Avulso
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
                Atender avulso
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

            {form.tipo === "bloqueio" && !form.diaInteiro && (
              slotsDisponiveis.length === 0 ? (
                <p className="text-xs text-muted-foreground py-1">
                  Sem horários disponíveis nesse dia. Marque "Dia inteiro" ou crie atendimento avulso antes.
                </p>
              ) : (
                <div>
                  <div className="text-[10px] uppercase font-bold tracking-widest text-muted-foreground mb-1.5">
                    Selecione os horários a bloquear
                  </div>
                  <div className="grid grid-cols-3 sm:grid-cols-4 gap-1.5">
                    {slotsDisponiveis.map(slot => {
                      const selected = form.slotsBloqueio.has(slot)
                      return (
                        <button
                          key={slot}
                          type="button"
                          onClick={() => toggleSlot(slot)}
                          className={`rounded-lg border-2 px-2 py-1.5 text-xs font-bold tracking-wider transition-all ${
                            selected
                              ? "border-destructive bg-destructive/20 text-destructive"
                              : "border-border bg-muted/10 text-foreground hover:border-destructive/40"
                          }`}
                        >
                          {slot}
                        </button>
                      )
                    })}
                  </div>
                </div>
              )
            )}

            {form.tipo === "extra" && (
              <div className="space-y-2">
                {form.faixasExtra.map((fx, idx) => (
                  <div key={idx} className="flex items-center gap-2">
                    <Input
                      type="time"
                      value={fx.hora_inicio}
                      onChange={e => atualizarFaixaExtra(idx, { hora_inicio: e.target.value })}
                      className="w-28 h-9"
                    />
                    <span className="text-muted-foreground text-xs">até</span>
                    <Input
                      type="time"
                      value={fx.hora_fim}
                      onChange={e => atualizarFaixaExtra(idx, { hora_fim: e.target.value })}
                      className="w-28 h-9"
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      disabled={form.faixasExtra.length === 1}
                      onClick={() => removerFaixaExtra(idx)}
                      className="text-destructive hover:bg-destructive/10 ml-auto disabled:opacity-30"
                    >
                      <Trash2Icon className="size-3.5" />
                    </Button>
                  </div>
                ))}
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={adicionarFaixaExtra}
                  className="gap-1.5"
                >
                  <PlusIcon className="size-3.5" />
                  Adicionar faixa
                </Button>
              </div>
            )}

            <Input
              placeholder="Motivo (opcional)"
              value={form.motivo}
              onChange={e => setForm(f => ({ ...f, motivo: e.target.value }))}
            />

            <Button onClick={adicionar} disabled={saving} className="w-full gap-2">
              <PlusIcon className="size-3.5" />
              {(() => {
                if (saving) return "Salvando..."
                if (form.tipo === "bloqueio") {
                  if (form.diaInteiro) return "Bloquear dia inteiro"
                  const n = form.slotsBloqueio.size
                  if (n === 0) return "Selecione um horário"
                  return n === 1 ? "Bloquear 1 horário" : `Bloquear ${n} horários`
                }
                const n = form.faixasExtra.length
                return n > 1 ? `Adicionar ${n} atendimentos avulsos` : "Adicionar atendimento avulso"
              })()}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
