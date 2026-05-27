import { useEffect, useMemo, useState } from "react"
import { supabase } from "@/lib/supabase"
import { toast } from "sonner"
import { Plus, Users, CheckCircle2, ShoppingCart, Clock, Pencil, Trash2, MapPin } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { cn } from "@/lib/utils"
import { fmtPct, fmtDateBR, type EventoRecord } from "@/lib/funis"
import { EventosDialog } from "./eventos-dialog"
import { ConfirmDialog } from "./confirm-dialog"

export function EventosFunil() {
  const [records, setRecords] = useState<EventoRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editing, setEditing] = useState<EventoRecord | null>(null)
  const [deleteId, setDeleteId] = useState<string | null>(null)
  const [selectedId, setSelectedId] = useState<string>("all")

  const fetchData = async () => {
    const { data, error } = await supabase
      .from("funis_eventos")
      .select("*")
      .order("event_date", { ascending: false })
    if (error) toast.error(error.message)
    setRecords((data ?? []) as EventoRecord[])
    setLoading(false)
  }

  useEffect(() => {
    fetchData()
    const channel = supabase
      .channel("funis_eventos_rt")
      .on("postgres_changes", { event: "*", schema: "public", table: "funis_eventos" }, fetchData)
      .subscribe()
    return () => { supabase.removeChannel(channel) }
  }, [])

  const filtered = useMemo(() => {
    if (selectedId === "all") return records
    return records.filter((r) => r.id === selectedId)
  }, [records, selectedId])

  const selectedRecord = useMemo(
    () => (selectedId !== "all" ? records.find((r) => r.id === selectedId) ?? null : null),
    [records, selectedId],
  )

  const totals = useMemo(() => filtered.reduce((acc, r) => ({
    participants: acc.participants + r.participants,
    qualified: acc.qualified + r.qualified,
    bought_pitch: acc.bought_pitch + r.bought_pitch,
    followup_7d: acc.followup_7d + r.followup_7d,
  }), { participants: 0, qualified: 0, bought_pitch: 0, followup_7d: 0 }), [filtered])

  const opportunities = totals.bought_pitch + totals.followup_7d

  const funnelSteps = [
    { name: "Participantes", value: totals.participants, isLast: false },
    { name: "Qualificados", value: totals.qualified, isLast: false, denom: totals.participants },
    { name: "Compraram no pitch", value: totals.bought_pitch, isLast: true, denom: totals.qualified },
    { name: "Follow-up 7 dias", value: totals.followup_7d, isLast: true, denom: totals.qualified },
  ]

  const handleNew = () => { setEditing(null); setDialogOpen(true) }
  const handleEdit = (r: EventoRecord) => { setEditing(r); setDialogOpen(true) }
  const confirmDelete = async () => {
    if (!deleteId) return
    const { error } = await supabase.from("funis_eventos").delete().eq("id", deleteId)
    if (error) toast.error(error.message); else toast.success("Evento excluído")
    setDeleteId(null)
  }

  return (
    <div className="space-y-8">
      <header className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <div className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground mb-1">Funil ativo</div>
          <h2 className="text-3xl font-bold leading-none tracking-tight">Funil de Eventos</h2>
          <p className="text-sm text-muted-foreground mt-1.5">Eventos, turmas e encontros — conversão por evento</p>
        </div>
        <Button onClick={handleNew} className="h-11 bg-primary text-primary-foreground font-semibold gap-2 hover:bg-primary/90">
          <Plus className="h-4 w-4" strokeWidth={2.5} /> Novo evento/turma
        </Button>
      </header>

      <section className="rounded-2xl border border-border bg-card p-5">
        <label className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground">Selecione o evento</label>
        <div className="mt-2 flex flex-col md:flex-row md:items-center gap-3">
          <Select value={selectedId} onValueChange={setSelectedId}>
            <SelectTrigger className="h-12 md:max-w-xl text-base">
              <SelectValue placeholder="Escolha um evento ou turma" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos os eventos (consolidado)</SelectItem>
              {records.map((r) => (
                <SelectItem key={r.id} value={r.id}>
                  {fmtDateBR(r.event_date)} · {r.class_name} — {r.city}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {selectedRecord && (
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <MapPin className="h-3.5 w-3.5" />
              <span>{selectedRecord.city}</span>
              {selectedRecord.partner_name && <span>· {selectedRecord.partner_name}</span>}
            </div>
          )}
        </div>
      </section>

      {loading ? (
        <div className="text-center py-20 text-muted-foreground">Carregando...</div>
      ) : records.length === 0 ? (
        <EmptyState onAdd={handleNew} />
      ) : (
        <>
          <section className="rounded-2xl border border-border bg-card p-6">
            <h3 className="font-bold text-base mb-6 tracking-tight">Funil resumido</h3>
            <div className="flex flex-col items-center">
              {funnelSteps.map((s, i) => {
                const max = funnelSteps[0].value || 1
                const widthPct = Math.max((s.value / max) * 100, 42)
                const next = i < funnelSteps.length - 1 ? funnelSteps[i + 1] : null
                const nextPct = next ? Math.max((next.value / max) * 100, 42) : widthPct * 0.85
                const conv = "denom" in s && s.denom ? fmtPct(s.value, s.denom) : null
                const fillVar = s.isLast ? "var(--foreground)" : "var(--primary)"
                const textColor = s.isLast ? "text-background" : "text-primary-foreground"
                return (
                  <div key={s.name} className="w-full flex flex-col items-center">
                    <div className="relative w-full" style={{ height: 84 }}>
                      <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="absolute inset-0 w-full h-full">
                        <polygon
                          points={`${(100 - widthPct) / 2},0 ${100 - (100 - widthPct) / 2},0 ${100 - (100 - nextPct) / 2},100 ${(100 - nextPct) / 2},100`}
                          fill={fillVar}
                        />
                      </svg>
                      <div className={cn("absolute inset-0 flex flex-col items-center justify-center gap-0.5 px-4 text-center", textColor)}>
                        <span className="text-[10px] font-semibold uppercase tracking-[0.15em] opacity-80">{s.name}</span>
                        <div className="flex items-baseline gap-2">
                          <span className="font-bold text-3xl tabular-nums leading-none">{s.value}</span>
                          {conv && <span className="text-xs font-semibold opacity-80">({conv})</span>}
                        </div>
                      </div>
                    </div>
                    {next && (<div className="text-[10px] text-muted-foreground py-1">▼</div>)}
                  </div>
                )
              })}
            </div>
          </section>

          <section>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              <Metric icon={<Users className="h-4 w-4" />} label="Participantes" value={totals.participants} />
              <Metric icon={<CheckCircle2 className="h-4 w-4" />} label="Qualificados" value={totals.qualified} accent="positive" />
              <Metric icon={<ShoppingCart className="h-4 w-4" />} label="Compraram no pitch" value={totals.bought_pitch} dark />
              <Metric icon={<Clock className="h-4 w-4" />} label="Follow-up 7 dias" value={totals.followup_7d} />
            </div>
            <div className="mt-4 grid grid-cols-2 lg:grid-cols-4 gap-4">
              <Rate label="Taxa de qualificação" pct={fmtPct(totals.qualified, totals.participants)} desc="Qualif. ÷ participantes" />
              <Rate label="Compra no pitch (participantes)" pct={fmtPct(totals.bought_pitch, totals.participants)} desc="Pitch ÷ participantes" />
              <Rate label="Compra no pitch (qualificados)" pct={fmtPct(totals.bought_pitch, totals.qualified)} desc="Pitch ÷ qualificados" highlight />
              <Rate label="Follow-up (participantes)" pct={fmtPct(totals.followup_7d, totals.participants)} desc="Follow-up ÷ participantes" />
              <Rate label="Follow-up (qualificados)" pct={fmtPct(totals.followup_7d, totals.qualified)} desc="Follow-up ÷ qualificados" />
              <Rate label="Oportunidades comerciais" pct={String(opportunities)} desc="Pitch + follow-up" />
              <Rate label="Taxa de oportunidades" pct={fmtPct(opportunities, totals.qualified)} desc="Oport. ÷ qualificados" highlight />
            </div>
          </section>

          <section className="rounded-2xl border border-border bg-card overflow-hidden">
            <div className="px-6 py-4 border-b border-border flex items-center justify-between">
              <h3 className="font-bold text-lg tracking-tight">Histórico de eventos</h3>
              <span className="text-xs text-muted-foreground">{filtered.length} evento(s)</span>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-[11px] uppercase tracking-wider text-muted-foreground bg-muted/40">
                    <th className="px-6 py-3 font-medium">Data</th>
                    <th className="px-3 py-3 font-medium">Cidade</th>
                    <th className="px-3 py-3 font-medium">Turma</th>
                    <th className="px-3 py-3 font-medium">Parceiro</th>
                    <th className="px-3 py-3 font-medium text-right">Part.</th>
                    <th className="px-3 py-3 font-medium text-right">Qualif.</th>
                    <th className="px-3 py-3 font-medium text-right">Pitch</th>
                    <th className="px-3 py-3 font-medium text-right">Follow-up</th>
                    <th className="px-3 py-3 font-medium text-right">% Qualif</th>
                    <th className="px-3 py-3 font-medium text-right">% Pitch</th>
                    <th className="px-3 py-3 font-medium text-right">Oport.</th>
                    <th className="px-6 py-3 font-medium text-right">Ações</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.length === 0 && (
                    <tr><td colSpan={12} className="px-6 py-12 text-center text-muted-foreground">Nenhum evento encontrado.</td></tr>
                  )}
                  {filtered.map((r) => {
                    const opp = r.bought_pitch + r.followup_7d
                    return (
                      <tr key={r.id} className="border-t border-border hover:bg-muted/30 transition">
                        <td className="px-6 py-3 font-medium whitespace-nowrap">{fmtDateBR(r.event_date)}</td>
                        <td className="px-3 py-3">{r.city}</td>
                        <td className="px-3 py-3 font-medium">{r.class_name}</td>
                        <td className="px-3 py-3 text-muted-foreground">{r.partner_name ?? "—"}</td>
                        <td className="px-3 py-3 text-right tabular-nums">{r.participants}</td>
                        <td className="px-3 py-3 text-right tabular-nums">{r.qualified}</td>
                        <td className="px-3 py-3 text-right tabular-nums font-semibold">{r.bought_pitch}</td>
                        <td className="px-3 py-3 text-right tabular-nums">{r.followup_7d}</td>
                        <td className="px-3 py-3 text-right tabular-nums text-muted-foreground">{fmtPct(r.qualified, r.participants)}</td>
                        <td className="px-3 py-3 text-right tabular-nums text-muted-foreground">{fmtPct(r.bought_pitch, r.qualified)}</td>
                        <td className="px-3 py-3 text-right tabular-nums">{opp}</td>
                        <td className="px-6 py-3 text-right">
                          <div className="flex justify-end gap-1">
                            <button onClick={() => handleEdit(r)} className="p-1.5 rounded hover:bg-secondary" aria-label="Editar"><Pencil className="h-3.5 w-3.5" /></button>
                            <button onClick={() => setDeleteId(r.id)} className="p-1.5 rounded hover:bg-destructive/10 hover:text-destructive" aria-label="Excluir"><Trash2 className="h-3.5 w-3.5" /></button>
                          </div>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </section>
        </>
      )}

      <EventosDialog open={dialogOpen} onOpenChange={setDialogOpen} record={editing} />
      <ConfirmDialog
        open={!!deleteId}
        onOpenChange={(o) => !o && setDeleteId(null)}
        title="Excluir evento?"
        onConfirm={confirmDelete}
      />
    </div>
  )
}

function Metric({ icon, label, value, dark, accent }: {
  icon: React.ReactNode; label: string; value: number | string; dark?: boolean; accent?: "positive"
}) {
  const accentClass = accent === "positive" ? "border-l-4 border-l-[oklch(0.6_0.18_124)] bg-[oklch(0.6_0.18_124/0.06)]" : ""
  return (
    <div className={cn("rounded-2xl border p-5 transition", dark ? "bg-foreground text-background border-foreground" : "bg-card border-border", accentClass)}>
      <div className="flex items-center gap-2 text-xs uppercase tracking-wide opacity-80">{icon}<span>{label}</span></div>
      <div className="font-bold text-3xl tabular-nums mt-2">{value}</div>
    </div>
  )
}

function Rate({ label, pct, desc, highlight }: { label: string; pct: string; desc: string; highlight?: boolean }) {
  return (
    <div className={cn("rounded-2xl border p-5", highlight ? "bg-primary/10 border-primary/30" : "bg-card border-border")}>
      <div className="text-xs uppercase tracking-wide text-muted-foreground">{label}</div>
      <div className="font-bold text-3xl tabular-nums mt-2">{pct}</div>
      <div className="text-[11px] mt-1 text-muted-foreground">{desc}</div>
    </div>
  )
}

function EmptyState({ onAdd }: { onAdd: () => void }) {
  return (
    <div className="rounded-2xl border border-dashed border-border bg-card p-16 text-center">
      <MapPin className="h-10 w-10 mx-auto text-muted-foreground mb-4" />
      <h3 className="text-xl font-bold tracking-tight">Nenhum evento cadastrado</h3>
      <p className="text-sm text-muted-foreground mt-1.5 max-w-sm mx-auto">
        Cadastre o primeiro evento ou turma para acompanhar a conversão por evento.
      </p>
      <Button onClick={onAdd} className="mt-6 bg-primary text-primary-foreground font-semibold gap-2 hover:bg-primary/90">
        <Plus className="h-4 w-4" /> Novo evento/turma
      </Button>
    </div>
  )
}
