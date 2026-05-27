import { useEffect, useState } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { supabase } from "@/lib/supabase"
import { toast } from "sonner"
import { toISODate, type AplicacaoRecord } from "@/lib/funis"

interface Props {
  open: boolean
  onOpenChange: (o: boolean) => void
  record?: AplicacaoRecord | null
}

export function AplicacaoDialog({ open, onOpenChange, record }: Props) {
  const [date, setDate] = useState(toISODate(new Date()))
  const [endDate, setEndDate] = useState<string>("")
  const [applications, setApplications] = useState(0)
  const [formYes, setFormYes] = useState(0)
  const [formNo, setFormNo] = useState(0)
  const [callsMade, setCallsMade] = useState(0)
  const [salesMade, setSalesMade] = useState(0)
  const [revenue, setRevenue] = useState(0)
  const [adSpend, setAdSpend] = useState(0)
  const [notes, setNotes] = useState("")
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (!open) return
    if (record) {
      setDate(record.record_date)
      setEndDate(record.period_end ?? "")
      setApplications(record.applications)
      setFormYes(record.form_yes)
      setFormNo(record.form_no)
      setCallsMade(record.calls_made)
      setSalesMade(record.sales_made)
      setRevenue(Number(record.revenue))
      setAdSpend(Number(record.ad_spend))
      setNotes(record.notes ?? "")
    } else {
      setDate(toISODate(new Date()))
      setEndDate("")
      setApplications(0); setFormYes(0); setFormNo(0)
      setCallsMade(0); setSalesMade(0); setRevenue(0); setAdSpend(0)
      setNotes("")
    }
  }, [open, record])

  const save = async () => {
    if (endDate && endDate < date) {
      toast.error("Data final deve ser maior ou igual à inicial")
      return
    }
    setSaving(true)
    const payload = {
      record_date: date,
      period_end: endDate || null,
      applications, form_yes: formYes, form_no: formNo,
      calls_made: callsMade, sales_made: salesMade,
      revenue, ad_spend: adSpend, notes: notes || null,
    }
    const { error } = record
      ? await supabase.from("funis_aplicacao").update(payload).eq("id", record.id)
      : await supabase.from("funis_aplicacao").insert(payload)
    setSaving(false)
    if (error) {
      toast.error("Erro ao salvar", { description: error.message })
      return
    }
    toast.success(record ? "Registro atualizado" : "Registro criado")
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold tracking-tight">
            {record ? "Editar registro" : "Novo registro do dia"}
          </DialogTitle>
        </DialogHeader>

        <div className="grid gap-4 py-2">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <Label className="text-xs uppercase tracking-wide text-muted-foreground">Data inicial *</Label>
              <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="mt-1.5" />
            </div>
            <div>
              <Label className="text-xs uppercase tracking-wide text-muted-foreground">Data final (opcional)</Label>
              <Input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} className="mt-1.5" />
              <p className="text-[11px] text-muted-foreground mt-1">Use para registrar um período (ex: semana inteira)</p>
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            <Field label="Aplicações" value={applications} onChange={setApplications} />
            <Field label="SIM no formulário" value={formYes} onChange={setFormYes} />
            <Field label="NÃO no formulário" value={formNo} onChange={setFormNo} />
            <Field label="Ligações realizadas" value={callsMade} onChange={setCallsMade} />
            <Field label="Vendas" value={salesMade} onChange={setSalesMade} />
            <Field label="Receita (R$)" value={revenue} onChange={setRevenue} money />
          </div>

          <div className="rounded-xl border border-border p-4 bg-muted/30">
            <div className="text-xs uppercase tracking-wide text-muted-foreground mb-2">Tráfego</div>
            <Field label="Investimento em tráfego (R$)" value={adSpend} onChange={setAdSpend} money />
          </div>

          <div>
            <Label className="text-xs uppercase tracking-wide text-muted-foreground">Observações</Label>
            <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} className="mt-1.5" rows={2} />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button onClick={save} disabled={saving} className="bg-primary text-primary-foreground font-semibold hover:bg-primary/90">
            {saving ? "Salvando..." : record ? "Salvar alterações" : "Registrar"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

function Field({ label, value, onChange, money = false }: { label: string; value: number; onChange: (n: number) => void; money?: boolean }) {
  return (
    <div>
      <Label className="text-xs uppercase tracking-wide text-muted-foreground">{label}</Label>
      <Input
        type="number" min={0} step={money ? "0.01" : "1"}
        value={value}
        onChange={(e) => onChange(Math.max(0, money ? parseFloat(e.target.value) || 0 : parseInt(e.target.value) || 0))}
        className="mt-1.5"
      />
    </div>
  )
}
