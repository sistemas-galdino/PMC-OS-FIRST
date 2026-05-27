import { useEffect, useMemo, useState } from "react"
import { supabase } from "@/lib/supabase"
import { toast } from "sonner"
import {
  Plus, FileText, CheckCircle2, XCircle, PhoneCall, Trophy,
  Pencil, Trash2, Target, TrendingUp, DollarSign,
} from "lucide-react"
import {
  CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis,
} from "recharts"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { cn } from "@/lib/utils"
import {
  PERIOD_LABELS, type PeriodPreset, fmtPct, fmtDateBR, fmtBRL,
  getPeriodRange, toISODate, type AplicacaoRecord,
} from "@/lib/funis"
import { AplicacaoDialog } from "./aplicacao-dialog"
import { ConfirmDialog } from "./confirm-dialog"

export function AplicacaoFunil() {
  const [records, setRecords] = useState<AplicacaoRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [period, setPeriod] = useState<PeriodPreset>("last_30")
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editing, setEditing] = useState<AplicacaoRecord | null>(null)
  const [deleteId, setDeleteId] = useState<string | null>(null)

  const fetchData = async () => {
    const { data, error } = await supabase
      .from("funis_aplicacao")
      .select("*")
      .order("record_date", { ascending: false })
    if (error) toast.error(error.message)
    setRecords((data ?? []) as AplicacaoRecord[])
    setLoading(false)
  }

  useEffect(() => {
    fetchData()
    const channel = supabase
      .channel("funis_aplicacao_rt")
      .on("postgres_changes", { event: "*", schema: "public", table: "funis_aplicacao" }, fetchData)
      .subscribe()
    return () => { supabase.removeChannel(channel) }
  }, [])

  const filtered = useMemo(() => {
    const { from, to } = getPeriodRange(period)
    if (!from || !to) return records
    const fromIso = toISODate(from)
    const toIso = toISODate(to)
    return records.filter((r) => {
      const start = r.record_date
      const end = r.period_end ?? r.record_date
      return end >= fromIso && start <= toIso
    })
  }, [records, period])

  const totals = useMemo(() => filtered.reduce(
    (acc, r) => ({
      applications: acc.applications + r.applications,
      form_yes: acc.form_yes + r.form_yes,
      form_no: acc.form_no + r.form_no,
      calls_made: acc.calls_made + r.calls_made,
      sales_made: acc.sales_made + r.sales_made,
      revenue: acc.revenue + Number(r.revenue || 0),
      ad_spend: acc.ad_spend + Number(r.ad_spend || 0),
    }),
    { applications: 0, form_yes: 0, form_no: 0, calls_made: 0, sales_made: 0, revenue: 0, ad_spend: 0 },
  ), [filtered])

  const byDay = useMemo(() => {
    const m = new Map<string, typeof totals>()
    for (const r of filtered) {
      const cur = m.get(r.record_date) ?? { applications: 0, form_yes: 0, form_no: 0, calls_made: 0, sales_made: 0, revenue: 0, ad_spend: 0 }
      cur.applications += r.applications
      cur.form_yes += r.form_yes
      cur.form_no += r.form_no
      cur.calls_made += r.calls_made
      cur.sales_made += r.sales_made
      cur.revenue += Number(r.revenue || 0)
      cur.ad_spend += Number(r.ad_spend || 0)
      m.set(r.record_date, cur)
    }
    return [...m.entries()].sort(([a], [b]) => a.localeCompare(b))
  }, [filtered])

  const trend = useMemo(
    () => byDay.map(([date, v]) => ({
      date: date.slice(5),
      Aplicações: v.applications, SIM: v.form_yes, Ligações: v.calls_made, Vendas: v.sales_made,
    })),
    [byDay],
  )

  const yesBase = totals.form_yes
  const cpl = totals.applications > 0 ? totals.ad_spend / totals.applications : 0
  const cpa = totals.sales_made > 0 ? totals.ad_spend / totals.sales_made : 0
  const roas = totals.ad_spend > 0 ? totals.revenue / totals.ad_spend : 0
  const profit = totals.revenue - totals.ad_spend
  const ticket = totals.sales_made > 0 ? totals.revenue / totals.sales_made : 0

  const funnelData = [
    { name: "Aplicações", value: totals.applications },
    { name: "SIM", value: totals.form_yes },
    { name: "Ligações", value: totals.calls_made },
    { name: "Vendas", value: totals.sales_made },
  ]

  const handleNew = () => { setEditing(null); setDialogOpen(true) }
  const handleEdit = (r: AplicacaoRecord) => { setEditing(r); setDialogOpen(true) }
  const confirmDelete = async () => {
    if (!deleteId) return
    const { error } = await supabase.from("funis_aplicacao").delete().eq("id", deleteId)
    if (error) toast.error(error.message); else toast.success("Registro excluído")
    setDeleteId(null)
  }

  return (
    <div className="space-y-8">
      <header className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <div className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground mb-1">Funil ativo</div>
          <h2 className="text-3xl font-bold leading-none tracking-tight">Funil de Aplicação</h2>
          <p className="text-sm text-muted-foreground mt-1.5">Aplicações, formulário, ligações, vendas e tráfego</p>
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
          <section className="rounded-2xl border border-border bg-card p-6">
            <SectionTitle small>Funil de conversão</SectionTitle>
            <div className="mt-4 flex flex-col items-center gap-1.5">
              {funnelData.map((step, i) => {
                const max = funnelData[0].value || 1
                const widthPct = Math.max((step.value / max) * 100, 14)
                const nextPct = i < funnelData.length - 1
                  ? Math.max((funnelData[i + 1].value / max) * 100, 14)
                  : widthPct * 0.72
                const conv = i === 0 ? null : fmtPct(step.value, funnelData[i - 1].value)
                const isLast = i === funnelData.length - 1
                const topInset = (100 - widthPct) / 2
                const bottomInset = (100 - nextPct) / 2
                return (
                  <div key={step.name} className="w-full max-w-2xl">
                    <div
                      className={cn(
                        "relative h-20 mx-auto transition-all",
                        isLast ? "bg-foreground text-background" : "bg-primary text-primary-foreground",
                      )}
                      style={{
                        width: "100%",
                        clipPath: `polygon(${topInset}% 0, ${100 - topInset}% 0, ${100 - bottomInset}% 100%, ${bottomInset}% 100%)`,
                      }}
                    >
                      <div className="absolute inset-0 flex items-center justify-center gap-3 px-6">
                        <span className="text-[11px] font-semibold uppercase tracking-wider opacity-70">{step.name}</span>
                        <span className="font-bold text-2xl tabular-nums">{step.value}</span>
                        {conv && (<span className="text-[11px] font-semibold opacity-70">({conv})</span>)}
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          </section>

          <section>
            <SectionTitle>Volume no período</SectionTitle>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              <MetricCard icon={<FileText className="h-4 w-4" />} label="Aplicações" value={totals.applications} description="Formulários recebidos" highlight />
              <MetricCard icon={<CheckCircle2 className="h-4 w-4" />} label="SIM no formulário" value={totals.form_yes} description="Aprovados" accent="positive" />
              <MetricCard icon={<XCircle className="h-4 w-4" />} label="NÃO no formulário" value={totals.form_no} description="Reprovados — saída do funil" accent="negative" />
              <MetricCard icon={<PhoneCall className="h-4 w-4" />} label="Ligações" value={totals.calls_made} description="Chamadas feitas" />
              <MetricCard icon={<Trophy className="h-4 w-4" />} label="Vendas" value={totals.sales_made} description="Conversões fechadas" dark />
              <MetricCard icon={<TrendingUp className="h-4 w-4" />} label="Receita" value={fmtBRL(totals.revenue)} description="Faturamento no período" />
              <MetricCard icon={<DollarSign className="h-4 w-4" />} label="Investimento" value={fmtBRL(totals.ad_spend)} description="Tráfego no período" />
              <MetricCard icon={<Target className="h-4 w-4" />} label="Lucro" value={fmtBRL(profit)} description="Receita − investimento" dark />
            </div>
          </section>

          <section>
            <SectionTitle>Conversão e performance</SectionTitle>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              <RateCard label="Taxa de aprovação" pct={fmtPct(totals.form_yes, totals.applications)} description="SIM ÷ aplicações" icon={<CheckCircle2 className="h-4 w-4" />} />
              <RateCard label="Taxa de ligação" pct={fmtPct(totals.calls_made, yesBase)} description="Ligações ÷ SIM" icon={<PhoneCall className="h-4 w-4" />} />
              <RateCard label="Taxa de venda" pct={fmtPct(totals.sales_made, yesBase)} description="Vendas ÷ SIM" icon={<Trophy className="h-4 w-4" />} highlight />
              <RateCard label="Conversão geral" pct={fmtPct(totals.sales_made, totals.applications)} description="Vendas ÷ aplicações" icon={<Target className="h-4 w-4" />} />
              <RateCard label="CPL" pct={fmtBRL(cpl)} description="Custo por aplicação" icon={<FileText className="h-4 w-4" />} />
              <RateCard label="CPA" pct={fmtBRL(cpa)} description="Custo por venda" icon={<Trophy className="h-4 w-4" />} />
              <RateCard label="ROAS" pct={`${roas.toFixed(2)}x`} description="Receita ÷ investimento" icon={<TrendingUp className="h-4 w-4" />} highlight />
              <RateCard label="Ticket médio" pct={fmtBRL(ticket)} description="Receita ÷ vendas" icon={<DollarSign className="h-4 w-4" />} />
            </div>
          </section>

          <section>
            <div className="rounded-2xl border border-border bg-card p-6">
              <SectionTitle small>Evolução por dia</SectionTitle>
              <div className="h-[280px] mt-2">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={trend} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                    <XAxis dataKey="date" stroke="var(--muted-foreground)" fontSize={11} />
                    <YAxis stroke="var(--muted-foreground)" fontSize={11} />
                    <Tooltip contentStyle={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: 12, fontSize: 12 }} />
                    <Line type="monotone" dataKey="Aplicações" stroke="var(--foreground)" strokeWidth={2} dot={false} />
                    <Line type="monotone" dataKey="SIM" stroke="oklch(0.6 0.18 124)" strokeWidth={2} dot={false} />
                    <Line type="monotone" dataKey="Ligações" stroke="oklch(0.7 0.04 80)" strokeWidth={2} dot={false} />
                    <Line type="monotone" dataKey="Vendas" stroke="var(--primary)" strokeWidth={3} dot={{ r: 3 }} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
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
                    <th className="px-3 py-3 font-medium text-right">Aplic.</th>
                    <th className="px-3 py-3 font-medium text-right">SIM</th>
                    <th className="px-3 py-3 font-medium text-right">NÃO</th>
                    <th className="px-3 py-3 font-medium text-right">Ligações</th>
                    <th className="px-3 py-3 font-medium text-right">Vendas</th>
                    <th className="px-3 py-3 font-medium text-right">Receita</th>
                    <th className="px-3 py-3 font-medium text-right">Investido</th>
                    <th className="px-3 py-3 font-medium text-right">ROAS</th>
                    <th className="px-6 py-3 font-medium text-right">Ações</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.length === 0 && (
                    <tr><td colSpan={10} className="px-6 py-12 text-center text-muted-foreground">Nenhum registro nesse período.</td></tr>
                  )}
                  {filtered.map((r) => {
                    const rRoas = Number(r.ad_spend) > 0 ? Number(r.revenue) / Number(r.ad_spend) : 0
                    const periodLabel = r.period_end && r.period_end !== r.record_date
                      ? `${fmtDateBR(r.record_date)} → ${fmtDateBR(r.period_end)}`
                      : fmtDateBR(r.record_date)
                    return (
                      <tr key={r.id} className="border-t border-border hover:bg-muted/30 transition">
                        <td className="px-6 py-3 font-medium whitespace-nowrap">{periodLabel}</td>
                        <td className="px-3 py-3 text-right tabular-nums">{r.applications}</td>
                        <td className="px-3 py-3 text-right tabular-nums">{r.form_yes}</td>
                        <td className="px-3 py-3 text-right tabular-nums">{r.form_no}</td>
                        <td className="px-3 py-3 text-right tabular-nums">{r.calls_made}</td>
                        <td className="px-3 py-3 text-right tabular-nums font-semibold">{r.sales_made}</td>
                        <td className="px-3 py-3 text-right tabular-nums">{fmtBRL(Number(r.revenue))}</td>
                        <td className="px-3 py-3 text-right tabular-nums text-muted-foreground">{fmtBRL(Number(r.ad_spend))}</td>
                        <td className="px-3 py-3 text-right tabular-nums font-semibold">{Number(r.ad_spend) > 0 ? `${rRoas.toFixed(2)}x` : "—"}</td>
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

      <AplicacaoDialog open={dialogOpen} onOpenChange={setDialogOpen} record={editing} />
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
    <h3 className={cn("font-bold mb-4 tracking-tight", small ? "text-base" : "text-xl")}>{children}</h3>
  )
}

function MetricCard({ icon, label, value, description, highlight, dark, accent }: {
  icon: React.ReactNode; label: string; value: number | string; description: string; highlight?: boolean; dark?: boolean; accent?: "positive" | "negative"
}) {
  const accentClass =
    accent === "positive" ? "border-l-4 border-l-[oklch(0.6_0.18_124)] bg-[oklch(0.6_0.18_124/0.06)]" :
    accent === "negative" ? "border-l-4 border-l-destructive bg-destructive/5" : ""
  return (
    <div className={cn(
      "rounded-2xl border p-5 transition",
      dark ? "bg-foreground text-background border-foreground" : highlight ? "bg-primary/10 border-primary/30" : "bg-card border-border",
      accentClass,
    )}>
      <div className="flex items-center gap-2 text-xs uppercase tracking-wide opacity-80">{icon}<span>{label}</span></div>
      <div className="font-bold text-3xl tabular-nums mt-2">{value}</div>
      <div className="text-[11px] mt-1 opacity-70">{description}</div>
    </div>
  )
}

function RateCard({ icon, label, pct, description, highlight }: {
  icon: React.ReactNode; label: string; pct: string; description: string; highlight?: boolean
}) {
  return (
    <div className={cn("rounded-2xl border p-5", highlight ? "bg-primary/10 border-primary/30" : "bg-card border-border")}>
      <div className="flex items-center gap-2 text-xs uppercase tracking-wide text-muted-foreground">{icon}<span>{label}</span></div>
      <div className="font-bold text-3xl tabular-nums mt-2">{pct}</div>
      <div className="text-[11px] mt-1 text-muted-foreground">{description}</div>
    </div>
  )
}

function EmptyState({ onAdd }: { onAdd: () => void }) {
  return (
    <div className="rounded-2xl border border-dashed border-border bg-card p-16 text-center">
      <FileText className="h-10 w-10 mx-auto text-muted-foreground mb-4" />
      <h3 className="text-xl font-bold tracking-tight">Nenhum registro ainda</h3>
      <p className="text-sm text-muted-foreground mt-1.5 max-w-sm mx-auto">
        Cadastre o volume diário do funil de aplicação para acompanhar conversões e performance de tráfego.
      </p>
      <Button onClick={onAdd} className="mt-6 bg-primary text-primary-foreground font-semibold gap-2 hover:bg-primary/90">
        <Plus className="h-4 w-4" /> Novo registro
      </Button>
    </div>
  )
}
