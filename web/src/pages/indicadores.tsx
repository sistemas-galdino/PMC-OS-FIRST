import { useEffect, useMemo, useState } from "react"
import { supabase } from "@/lib/supabase"
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  TrendingUpIcon as TrendingUp,
  DollarSignIcon as DollarSign,
  PercentIcon as Percent,
  RefreshCwIcon as RefreshCw,
  BarChart3Icon as BarChart3,
  PlusIcon as Plus,
  Edit3Icon as Edit3,
  Trash2Icon as Trash2,
  MoreHorizontalIcon as MoreHorizontal,
} from "@/components/ui/icons"
import type { Session } from "@supabase/supabase-js"
import { motion } from "framer-motion"

interface Indicador {
  id_cliente: string
  ano: number
  mes: number
  investimento_trafego: number
  faturamento: number
  ticket_medio: number
  frequencia_compra: number
}

interface IndicadoresPageProps {
  session?: Session
  clientId?: string
}

const MESES = [
  "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
  "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro",
]

const fmtBRL = (n: number) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 }).format(n || 0)

const fmtROI = (inv: number, fat: number) => {
  if (!inv || inv <= 0) return "—"
  const pct = ((fat - inv) / inv) * 100
  return `${pct.toFixed(0)}%`
}

const now = new Date()
const ANO_ATUAL = now.getFullYear()
const ANOS = Array.from({ length: 7 }, (_, i) => ANO_ATUAL - 4 + i)

interface FormState {
  mes: number
  ano: number
  investimento_trafego: string
  faturamento: string
  ticket_medio: string
  frequencia_compra: string
}

const emptyForm = (): FormState => ({
  mes: now.getMonth() + 1,
  ano: ANO_ATUAL,
  investimento_trafego: "",
  faturamento: "",
  ticket_medio: "",
  frequencia_compra: "",
})

export default function IndicadoresPage({ session, clientId }: IndicadoresPageProps) {
  const resolvedClientId = clientId || session?.user?.id
  const [indicadores, setIndicadores] = useState<Indicador[]>([])
  const [loading, setLoading] = useState(true)
  const [showDialog, setShowDialog] = useState(false)
  const [editing, setEditing] = useState<Indicador | null>(null)
  const [form, setForm] = useState<FormState>(emptyForm())
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (!resolvedClientId) { setLoading(false); return }
    async function fetchIndicadores() {
      const { data } = await supabase
        .from("cliente_indicadores_mensais")
        .select("*")
        .eq("id_cliente", resolvedClientId)
        .order("ano", { ascending: false })
        .order("mes", { ascending: false })
      setIndicadores((data as Indicador[]) || [])
      setLoading(false)
    }
    fetchIndicadores()
  }, [resolvedClientId])

  const totals = useMemo(() => {
    const sumInv = indicadores.reduce((s, i) => s + Number(i.investimento_trafego || 0), 0)
    const sumFat = indicadores.reduce((s, i) => s + Number(i.faturamento || 0), 0)
    const tickets = indicadores.map(i => Number(i.ticket_medio || 0)).filter(t => t > 0)
    const avgTicket = tickets.length ? tickets.reduce((s, t) => s + t, 0) / tickets.length : 0
    const roi = sumInv > 0 ? ((sumFat - sumInv) / sumInv) * 100 : null
    return { sumInv, sumFat, avgTicket, roi }
  }, [indicadores])

  function openNew() {
    setEditing(null)
    setForm(emptyForm())
    setShowDialog(true)
  }

  function openEdit(i: Indicador) {
    setEditing(i)
    setForm({
      mes: i.mes,
      ano: i.ano,
      investimento_trafego: String(i.investimento_trafego ?? ""),
      faturamento: String(i.faturamento ?? ""),
      ticket_medio: String(i.ticket_medio ?? ""),
      frequencia_compra: String(i.frequencia_compra ?? ""),
    })
    setShowDialog(true)
  }

  async function handleDelete(i: Indicador) {
    if (!confirm(`Excluir indicadores de ${MESES[i.mes - 1]}/${i.ano}?`)) return
    await supabase
      .from("cliente_indicadores_mensais")
      .delete()
      .eq("id_cliente", i.id_cliente)
      .eq("ano", i.ano)
      .eq("mes", i.mes)
    setIndicadores(prev => prev.filter(x => !(x.ano === i.ano && x.mes === i.mes)))
  }

  async function handleSave() {
    if (!resolvedClientId) return
    setSaving(true)
    const payload: Indicador = {
      id_cliente: resolvedClientId,
      ano: form.ano,
      mes: form.mes,
      investimento_trafego: Number(form.investimento_trafego) || 0,
      faturamento: Number(form.faturamento) || 0,
      ticket_medio: Number(form.ticket_medio) || 0,
      frequencia_compra: Number(form.frequencia_compra) || 0,
    }
    const { error } = await supabase
      .from("cliente_indicadores_mensais")
      .upsert(payload, { onConflict: "id_cliente,ano,mes" })
    if (!error) {
      setIndicadores(prev => {
        const filtered = prev.filter(x => !(x.ano === payload.ano && x.mes === payload.mes))
        return [...filtered, payload].sort((a, b) =>
          b.ano !== a.ano ? b.ano - a.ano : b.mes - a.mes
        )
      })
      setShowDialog(false)
    }
    setSaving(false)
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="grid gap-4 lg:grid-cols-4">
          {[1, 2, 3, 4].map(i => <Card key={i} className="h-32 animate-pulse bg-card/40" />)}
        </div>
        <Card className="h-64 animate-pulse bg-card/40" />
      </div>
    )
  }

  return (
    <div className="space-y-8 pb-10">
      <motion.div
        initial={{ opacity: 0, x: -20 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.5 }}
        className="border-l-4 border-primary pl-6 py-2"
      >
        <h1 className="text-3xl font-bold tracking-tight">Indicadores</h1>
        <p className="text-muted-foreground font-medium text-sm mt-1">
          Métricas mensais de tráfego e faturamento
        </p>
      </motion.div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard
          icon={TrendingUp}
          label="Investimento Total"
          value={fmtBRL(totals.sumInv)}
          hint="em tráfego pago"
        />
        <KpiCard
          icon={DollarSign}
          label="Faturamento Total"
          value={fmtBRL(totals.sumFat)}
          hint="no período"
        />
        <KpiCard
          icon={Percent}
          label="Ticket Médio"
          value={fmtBRL(totals.avgTicket)}
          hint="média do período"
        />
        <KpiCard
          icon={RefreshCw}
          label="ROI Médio"
          value={totals.roi == null ? "—" : `${totals.roi.toFixed(0)}%`}
          hint="retorno sobre investimento"
        />
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between gap-4 pb-4">
          <div className="flex items-center gap-3">
            <div className="bg-primary/10 p-2 rounded-lg">
              <BarChart3 className="size-5 text-primary" />
            </div>
            <div>
              <CardTitle className="text-lg font-bold tracking-tight">Indicadores Mensais</CardTitle>
              <p className="text-xs text-muted-foreground font-medium mt-0.5">Acompanhe os indicadores mês a mês</p>
            </div>
          </div>
          <Button onClick={openNew} className="h-10 gap-2 rounded-xl px-4 shadow-lg shadow-primary/10">
            <Plus className="size-4" />
            <span className="font-bold uppercase tracking-wider text-[11px]">Novo Mês</span>
          </Button>
        </CardHeader>
        <CardContent>
          {indicadores.length === 0 ? (
            <div className="py-16 text-center text-sm text-muted-foreground">
              Nenhum indicador cadastrado
            </div>
          ) : (
            <>
              <div className="hidden md:block">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">Mês/Ano</TableHead>
                      <TableHead className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">Investimento</TableHead>
                      <TableHead className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">Faturamento</TableHead>
                      <TableHead className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">Ticket Médio</TableHead>
                      <TableHead className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">Freq. Compra</TableHead>
                      <TableHead className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">ROI</TableHead>
                      <TableHead className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground text-right">Ações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {indicadores.map(i => (
                      <TableRow key={`${i.ano}-${i.mes}`}>
                        <TableCell className="font-semibold">{MESES[i.mes - 1]}/{i.ano}</TableCell>
                        <TableCell>{fmtBRL(Number(i.investimento_trafego))}</TableCell>
                        <TableCell>{fmtBRL(Number(i.faturamento))}</TableCell>
                        <TableCell>{fmtBRL(Number(i.ticket_medio))}</TableCell>
                        <TableCell>{Number(i.frequencia_compra).toFixed(2)}x</TableCell>
                        <TableCell className="font-semibold">{fmtROI(Number(i.investimento_trafego), Number(i.faturamento))}</TableCell>
                        <TableCell className="text-right">
                          <RowActions onEdit={() => openEdit(i)} onDelete={() => handleDelete(i)} />
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              <div className="md:hidden space-y-3">
                {indicadores.map(i => (
                  <Card key={`${i.ano}-${i.mes}`} className="bg-muted/10">
                    <CardHeader className="flex-row items-center justify-between pb-3">
                      <CardTitle className="text-base font-bold">{MESES[i.mes - 1]}/{i.ano}</CardTitle>
                      <RowActions onEdit={() => openEdit(i)} onDelete={() => handleDelete(i)} />
                    </CardHeader>
                    <CardContent className="space-y-2 text-sm">
                      <Row label="Investimento" value={fmtBRL(Number(i.investimento_trafego))} />
                      <Row label="Faturamento" value={fmtBRL(Number(i.faturamento))} />
                      <Row label="Ticket Médio" value={fmtBRL(Number(i.ticket_medio))} />
                      <Row label="Freq. Compra" value={`${Number(i.frequencia_compra).toFixed(2)}x`} />
                      <Row label="ROI" value={fmtROI(Number(i.investimento_trafego), Number(i.faturamento))} />
                    </CardContent>
                  </Card>
                ))}
              </div>
            </>
          )}
        </CardContent>
      </Card>

      <Dialog open={showDialog} onOpenChange={(open) => { if (!open) setShowDialog(false) }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold">
              {editing ? "Editar Indicadores" : "Adicionar Indicadores"}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-5 py-2">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Mês</Label>
                <Select
                  value={String(form.mes)}
                  onValueChange={(v) => setForm(p => ({ ...p, mes: Number(v) }))}
                  disabled={!!editing}
                >
                  <SelectTrigger className="h-11 rounded-xl">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {MESES.map((m, idx) => (
                      <SelectItem key={m} value={String(idx + 1)}>{m}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Ano</Label>
                <Select
                  value={String(form.ano)}
                  onValueChange={(v) => setForm(p => ({ ...p, ano: Number(v) }))}
                  disabled={!!editing}
                >
                  <SelectTrigger className="h-11 rounded-xl">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {ANOS.map(a => (
                      <SelectItem key={a} value={String(a)}>{a}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <NumberField
              label="Investimento em Tráfego Pago (R$)"
              value={form.investimento_trafego}
              onChange={(v) => setForm(p => ({ ...p, investimento_trafego: v }))}
            />
            <NumberField
              label="Faturamento (R$)"
              value={form.faturamento}
              onChange={(v) => setForm(p => ({ ...p, faturamento: v }))}
            />
            <NumberField
              label="Ticket Médio (R$)"
              value={form.ticket_medio}
              onChange={(v) => setForm(p => ({ ...p, ticket_medio: v }))}
            />
            <NumberField
              label="Frequência de Compra (recompra)"
              value={form.frequencia_compra}
              onChange={(v) => setForm(p => ({ ...p, frequencia_compra: v }))}
            />
          </div>
          <DialogFooter className="gap-2 sm:gap-2">
            <Button variant="outline" onClick={() => setShowDialog(false)} disabled={saving}>
              Cancelar
            </Button>
            <Button onClick={handleSave} disabled={saving} className="font-bold uppercase tracking-wider text-[11px]">
              {saving ? "Salvando..." : "Salvar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

function KpiCard({ icon: Icon, label, value, hint }: { icon: React.ElementType, label: string, value: string, hint: string }) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">{label}</CardTitle>
        <div className="bg-primary/10 p-2 rounded-lg">
          <Icon className="size-4 text-primary" />
        </div>
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold tracking-tight mb-1">{value}</div>
        <p className="text-[11px] font-medium text-muted-foreground">{hint}</p>
      </CardContent>
    </Card>
  )
}

function RowActions({ onEdit, onDelete }: { onEdit: () => void, onDelete: () => void }) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="size-8">
          <MoreHorizontal className="size-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onClick={onEdit} className="cursor-pointer">
          <Edit3 className="size-4" />
          Editar
        </DropdownMenuItem>
        <DropdownMenuItem onClick={onDelete} className="cursor-pointer text-destructive focus:text-destructive">
          <Trash2 className="size-4" />
          Excluir
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

function Row({ label, value }: { label: string, value: string }) {
  return (
    <div className="flex justify-between">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-semibold">{value}</span>
    </div>
  )
}

function NumberField({ label, value, onChange }: { label: string, value: string, onChange: (v: string) => void }) {
  return (
    <div className="space-y-2">
      <Label className="text-sm font-medium">{label}</Label>
      <Input
        type="number"
        inputMode="decimal"
        min={0}
        step="0.01"
        placeholder="0"
        className="h-11 rounded-xl"
        value={value}
        onChange={(e) => onChange(e.target.value)}
      />
    </div>
  )
}
