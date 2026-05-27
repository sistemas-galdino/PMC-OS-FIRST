import { useEffect, useMemo, useState } from "react"
import { supabase } from "@/lib/supabase"
import { toast } from "sonner"
import {
  Plus, TrendingUp, MessageSquare, PhoneCall, Calendar,
  Pencil, Trash2, Users, Reply, Target, Trophy,
} from "lucide-react"
import {
  Bar, BarChart, CartesianGrid, Cell, Line, LineChart, ResponsiveContainer,
  Tooltip, XAxis, YAxis,
} from "recharts"
import { Button } from "@/components/ui/button"
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select"
import {
  PERIOD_LABELS, type PeriodPreset, fmtPct, fmtDateBR,
  getPeriodRange, toISODate, type SocialSellingRecord,
} from "@/lib/funis"
import { SocialSellingDialog } from "./social-selling-dialog"
import { ConfirmDialog } from "./confirm-dialog"

export function SocialSellingFunil() {
  const [records, setRecords] = useState<SocialSellingRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [period, setPeriod] = useState<PeriodPreset>("last_30")
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editing, setEditing] = useState<SocialSellingRecord | null>(null)
  const [deleteId, setDeleteId] = useState<string | null>(null)

  const fetchData = async () => {
    const { data, error } = await supabase
      .from("funis_social_selling")
      .select("*")
      .order("record_date", { ascending: false })
    if (error) toast.error(error.message)
    setRecords((data ?? []) as SocialSellingRecord[])
    setLoading(false)
  }

  useEffect(() => {
    fetchData()
    const channel = supabase
      .channel("funis_social_selling_rt")
      .on("postgres_changes", { event: "*", schema: "public", table: "funis_social_selling" }, fetchData)
      .subscribe()
    return () => { supabase.removeChannel(channel) }
  }, [])

  const filtered = useMemo(() => {
    const { from, to } = getPeriodRange(period)
    if (!from || !to) return records
    const fromIso = toISODate(from)
    const toIso = toISODate(to)
    return records.filter((r) => r.record_date >= fromIso && r.record_date <= toIso)
  }, [records, period])

  const totals = useMemo(() => filtered.reduce(
    (acc, r) => ({
      approaches: acc.approaches + r.approaches,
      conversations: acc.conversations + r.conversations,
      call_invites: acc.call_invites + r.call_invites,
      meetings: acc.meetings + r.meetings_scheduled,
    }),
    { approaches: 0, conversations: 0, call_invites: 0, meetings: 0 }
  ), [filtered])

  const trend = useMemo(() => {
    const byDate = new Map<string, { Abordagens: number; Conversas: number; Convites: number; Reuniões: number }>()
    for (const r of filtered) {
      const cur = byDate.get(r.record_date) ?? { Abordagens: 0, Conversas: 0, Convites: 0, Reuniões: 0 }
      cur.Abordagens += r.approaches
      cur.Conversas += r.conversations
      cur.Convites += r.call_invites
      cur.Reuniões += r.meetings_scheduled
      byDate.set(r.record_date, cur)
    }
    return [...byDate.entries()]
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([date, v]) => ({ date: date.slice(5), ...v }))
  }, [filtered])

  const funnelData = [
    { name: "Abordagens", value: totals.approaches },
    { name: "Conversas", value: totals.conversations },
    { name: "Convites", value: totals.call_invites },
    { name: "Reuniões", value: totals.meetings },
  ]

  const handleNew = () => { setEditing(null); setDialogOpen(true) }
  const handleEdit = (r: SocialSellingRecord) => { setEditing(r); setDialogOpen(true) }
  const confirmDelete = async () => {
    if (!deleteId) return
    const { error } = await supabase.from("funis_social_selling").delete().eq("id", deleteId)
    if (error) toast.error(error.message); else toast.success("Registro excluído")
    setDeleteId(null)
  }

  return (
    <div className="space-y-8">
      <header className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <div className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground mb-1">Funil ativo</div>
          <h2 className="text-3xl font-bold leading-none tracking-tight">Social Selling</h2>
          <p className="text-sm text-muted-foreground mt-1.5">Acompanhamento de abordagens, conversas, convites e reuniões.</p>
        </div>
        <div className="flex items-center gap-2">
          <Select value={period} onValueChange={(v) => setPeriod(v as PeriodPreset)}>
            <SelectTrigger className="w-[180px] h-11"><SelectValue /></SelectTrigger>
            <SelectContent>
              {(Object.keys(PERIOD_LABELS) as PeriodPreset[]).map((p) => (
                <SelectItem key={p} value={p}>{PERIOD_LABELS[p]}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button onClick={handleNew} className="h-11 bg-primary text-primary-foreground font-semibold gap-2 hover:bg-primary/90">
            <Plus className="h-4 w-4" strokeWidth={2.5} /> Novo registro
          </Button>
        </div>
      </header>

      {loading ? (
        <div className="text-center py-20 text-muted-foreground">Carregando...</div>
      ) : records.length === 0 ? (
        <EmptyState onAdd={handleNew} />
      ) : (
        <>
          <section>
            <SectionTitle>Volume no período</SectionTitle>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              <MetricCard icon={<Users className="h-4 w-4" />} label="Abordagens" value={totals.approaches} description="Pessoas abordadas" highlight />
              <MetricCard icon={<MessageSquare className="h-4 w-4" />} label="Conversas" value={totals.conversations} description="Responderam ou avançaram" />
              <MetricCard icon={<PhoneCall className="h-4 w-4" />} label="Convites para call" value={totals.call_invites} description="Convites enviados" />
              <MetricCard icon={<Calendar className="h-4 w-4" />} label="Reuniões agendadas" value={totals.meetings} description="Calls confirmadas" dark />
            </div>
          </section>

          <section>
            <SectionTitle>Taxas de conversão</SectionTitle>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              <RateCard icon={<Reply className="h-4 w-4" />} label="Taxa de conversa" pct={fmtPct(totals.conversations, totals.approaches)} description="Conversas ÷ abordagens" />
              <RateCard icon={<Target className="h-4 w-4" />} label="Taxa de convite" pct={fmtPct(totals.call_invites, totals.conversations)} description="Convites ÷ conversas" />
              <RateCard icon={<PhoneCall className="h-4 w-4" />} label="Taxa de agendamento" pct={fmtPct(totals.meetings, totals.call_invites)} description="Reuniões ÷ convites" />
              <RateCard icon={<Trophy className="h-4 w-4" />} label="Conversão total" pct={fmtPct(totals.meetings, totals.approaches)} description="Reuniões ÷ abordagens" highlight />
            </div>
          </section>

          <section className="grid grid-cols-1 xl:grid-cols-3 gap-4">
            <div className="xl:col-span-1 rounded-2xl border border-border bg-card p-6">
              <SectionTitle small>Funil de conversão</SectionTitle>
              <div className="space-y-3 mt-2">
                {funnelData.map((step, i) => {
                  const max = funnelData[0].value || 1
                  const widthPct = (step.value / max) * 100
                  const conv = i === 0 ? null : fmtPct(step.value, funnelData[i - 1].value)
                  return (
                    <div key={step.name}>
                      <div className="flex items-baseline justify-between mb-1.5">
                        <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">{step.name}</span>
                        <span className="font-bold text-lg tabular-nums">{step.value}</span>
                      </div>
                      <div className="relative h-9 bg-secondary rounded-lg overflow-hidden">
                        <div
                          className={`absolute inset-y-0 left-0 rounded-lg transition-all ${i === funnelData.length - 1 ? "bg-foreground" : "bg-primary"}`}
                          style={{ width: `${Math.max(widthPct, 2)}%` }}
                        />
                        {conv && (
                          <div className="absolute right-2.5 inset-y-0 flex items-center text-[11px] font-semibold text-background/80">
                            {conv}
                          </div>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>

            <div className="xl:col-span-2 rounded-2xl border border-border bg-card p-6">
              <SectionTitle small>Evolução por dia</SectionTitle>
              <div className="h-[280px] mt-2">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={trend} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                    <XAxis dataKey="date" stroke="var(--muted-foreground)" fontSize={11} />
                    <YAxis stroke="var(--muted-foreground)" fontSize={11} />
                    <Tooltip contentStyle={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: 12, fontSize: 12 }} />
                    <Line type="monotone" dataKey="Abordagens" stroke="var(--foreground)" strokeWidth={2} dot={false} />
                    <Line type="monotone" dataKey="Conversas" stroke="oklch(0.6 0.18 124)" strokeWidth={2} dot={false} />
                    <Line type="monotone" dataKey="Convites" stroke="oklch(0.7 0.04 80)" strokeWidth={2} dot={false} />
                    <Line type="monotone" dataKey="Reuniões" stroke="var(--primary)" strokeWidth={3} dot={{ r: 3 }} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>
          </section>

          <section className="rounded-2xl border border-border bg-card p-6">
            <SectionTitle small>Volume por etapa</SectionTitle>
            <div className="h-[220px] mt-2">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={funnelData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                  <XAxis dataKey="name" stroke="var(--muted-foreground)" fontSize={12} />
                  <YAxis stroke="var(--muted-foreground)" fontSize={11} />
                  <Tooltip contentStyle={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: 12, fontSize: 12 }} />
                  <Bar dataKey="value" radius={[8, 8, 0, 0]}>
                    {funnelData.map((_, i) => (
                      <Cell key={i} fill={i === funnelData.length - 1 ? "var(--foreground)" : "var(--primary)"} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </section>

          <section className="rounded-2xl border border-border bg-card overflow-hidden">
            <div className="px-6 py-4 border-b border-border flex items-center justify-between">
              <h3 className="font-bold text-lg tracking-tight">Registros</h3>
              <span className="text-xs text-muted-foreground">{filtered.length} no período</span>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-[11px] uppercase tracking-wider text-muted-foreground bg-muted/40">
                    <th className="px-6 py-3 font-medium">Data</th>
                    <th className="px-3 py-3 font-medium text-right">Abord.</th>
                    <th className="px-3 py-3 font-medium text-right">Conv.</th>
                    <th className="px-3 py-3 font-medium text-right">Convites</th>
                    <th className="px-3 py-3 font-medium text-right">Reuniões</th>
                    <th className="px-3 py-3 font-medium text-right">T. conv.</th>
                    <th className="px-3 py-3 font-medium text-right">T. agend.</th>
                    <th className="px-3 py-3 font-medium text-right">Total</th>
                    <th className="px-6 py-3 font-medium text-right">Ações</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.length === 0 && (
                    <tr><td colSpan={9} className="px-6 py-12 text-center text-muted-foreground">Nenhum registro nesse período.</td></tr>
                  )}
                  {filtered.map((r) => (
                    <tr key={r.id} className="border-t border-border hover:bg-muted/30 transition">
                      <td className="px-6 py-3 font-medium">{fmtDateBR(r.record_date)}</td>
                      <td className="px-3 py-3 text-right tabular-nums">{r.approaches}</td>
                      <td className="px-3 py-3 text-right tabular-nums">{r.conversations}</td>
                      <td className="px-3 py-3 text-right tabular-nums">{r.call_invites}</td>
                      <td className="px-3 py-3 text-right tabular-nums font-semibold">{r.meetings_scheduled}</td>
                      <td className="px-3 py-3 text-right tabular-nums text-muted-foreground">{fmtPct(r.conversations, r.approaches)}</td>
                      <td className="px-3 py-3 text-right tabular-nums text-muted-foreground">{fmtPct(r.meetings_scheduled, r.call_invites)}</td>
                      <td className="px-3 py-3 text-right tabular-nums font-semibold">{fmtPct(r.meetings_scheduled, r.approaches)}</td>
                      <td className="px-6 py-3 text-right">
                        <div className="flex justify-end gap-1">
                          <button onClick={() => handleEdit(r)} className="p-1.5 rounded hover:bg-secondary" aria-label="Editar"><Pencil className="h-3.5 w-3.5" /></button>
                          <button onClick={() => setDeleteId(r.id)} className="p-1.5 rounded hover:bg-destructive/10 hover:text-destructive" aria-label="Excluir"><Trash2 className="h-3.5 w-3.5" /></button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        </>
      )}

      <SocialSellingDialog open={dialogOpen} onOpenChange={setDialogOpen} record={editing} />
      <ConfirmDialog
        open={!!deleteId}
        onOpenChange={(o) => !o && setDeleteId(null)}
        title="Excluir registro?"
        onConfirm={confirmDelete}
      />
    </div>
  )
}

function SectionTitle({ children, small }: { children: React.ReactNode; small?: boolean }) {
  return (
    <h3 className={`font-bold tracking-tight ${small ? "text-base" : "text-xl"} mb-4 flex items-center gap-2`}>
      <span className="h-1.5 w-1.5 rounded-full bg-primary" />
      {children}
    </h3>
  )
}

function MetricCard({ icon, label, value, description, highlight, dark }: {
  icon: React.ReactNode; label: string; value: number | string; description: string; highlight?: boolean; dark?: boolean
}) {
  const base = "relative rounded-2xl p-5 border transition hover:-translate-y-0.5"
  const variant = highlight
    ? "bg-primary border-primary text-primary-foreground"
    : dark
    ? "bg-foreground border-foreground text-background"
    : "bg-card border-border text-foreground"
  return (
    <div className={`${base} ${variant}`}>
      <div className="flex items-center justify-between mb-3">
        <span className="text-[10px] uppercase tracking-widest opacity-70">{label}</span>
        <div className={`h-7 w-7 rounded-lg flex items-center justify-center ${highlight ? "bg-primary-foreground/10" : dark ? "bg-primary/15 text-primary" : "bg-secondary"}`}>
          {icon}
        </div>
      </div>
      <div className="font-bold text-4xl tabular-nums leading-none">{value}</div>
      <div className="text-xs mt-2 opacity-70">{description}</div>
    </div>
  )
}

function RateCard({ icon, label, pct, description, highlight }: {
  icon: React.ReactNode; label: string; pct: string; description: string; highlight?: boolean
}) {
  return (
    <div className={`rounded-2xl p-5 border ${highlight ? "bg-foreground text-background border-foreground" : "bg-card border-border"}`}>
      <div className="flex items-center justify-between mb-3">
        <span className="text-[10px] uppercase tracking-widest opacity-70">{label}</span>
        <div className={`h-7 w-7 rounded-lg flex items-center justify-center ${highlight ? "bg-primary text-primary-foreground" : "bg-muted/40"}`}>
          {icon}
        </div>
      </div>
      <div className="font-bold text-4xl tabular-nums leading-none">{pct}</div>
      <div className="text-xs mt-2 opacity-70">{description}</div>
    </div>
  )
}

function EmptyState({ onAdd }: { onAdd: () => void }) {
  return (
    <div className="rounded-3xl border-2 border-dashed border-border bg-card p-12 lg:p-20 text-center">
      <div className="mx-auto h-16 w-16 rounded-2xl bg-primary flex items-center justify-center mb-6">
        <TrendingUp className="h-8 w-8 text-primary-foreground" strokeWidth={2.5} />
      </div>
      <h3 className="text-2xl font-bold tracking-tight">Sem registros ainda</h3>
      <p className="text-muted-foreground mt-2 max-w-md mx-auto">
        Adicione o primeiro registro de Social Selling para começar a acompanhar seus indicadores.
      </p>
      <Button onClick={onAdd} className="mt-6 bg-primary text-primary-foreground font-semibold gap-2 h-11 px-6 hover:bg-primary/90">
        <Plus className="h-4 w-4" strokeWidth={2.5} /> Adicionar primeiro registro
      </Button>
    </div>
  )
}
