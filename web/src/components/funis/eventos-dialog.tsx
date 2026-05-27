import { useEffect, useState } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { supabase } from "@/lib/supabase"
import { toast } from "sonner"
import { toISODate, type EventoRecord } from "@/lib/funis"

interface Props {
  open: boolean
  onOpenChange: (o: boolean) => void
  record?: EventoRecord | null
}

export function EventosDialog({ open, onOpenChange, record }: Props) {
  const [eventDate, setEventDate] = useState(toISODate(new Date()))
  const [city, setCity] = useState("")
  const [className, setClassName] = useState("")
  const [partner, setPartner] = useState("")
  const [participants, setParticipants] = useState(0)
  const [qualified, setQualified] = useState(0)
  const [boughtPitch, setBoughtPitch] = useState(0)
  const [followup, setFollowup] = useState(0)
  const [notes, setNotes] = useState("")
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (!open) return
    if (record) {
      setEventDate(record.event_date)
      setCity(record.city)
      setClassName(record.class_name)
      setPartner(record.partner_name ?? "")
      setParticipants(record.participants)
      setQualified(record.qualified)
      setBoughtPitch(record.bought_pitch)
      setFollowup(record.followup_7d)
      setNotes(record.notes ?? "")
    } else {
      setEventDate(toISODate(new Date()))
      setCity(""); setClassName(""); setPartner("")
      setParticipants(0); setQualified(0); setBoughtPitch(0); setFollowup(0)
      setNotes("")
    }
  }, [open, record])

  const save = async () => {
    if (!city.trim() || !className.trim()) {
      toast.error("Preencha cidade e nome da turma")
      return
    }
    setSaving(true)
    const payload = {
      event_date: eventDate,
      city: city.trim(),
      class_name: className.trim(),
      partner_name: partner.trim() || null,
      participants, qualified,
      bought_pitch: boughtPitch,
      followup_7d: followup,
      notes: notes || null,
    }
    const { error } = record
      ? await supabase.from("funis_eventos").update(payload).eq("id", record.id)
      : await supabase.from("funis_eventos").insert(payload)
    setSaving(false)
    if (error) {
      toast.error("Erro ao salvar", { description: error.message })
      return
    }
    toast.success(record ? "Evento atualizado" : "Evento criado")
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold tracking-tight">
            {record ? "Editar evento/turma" : "Novo evento/turma"}
          </DialogTitle>
        </DialogHeader>

        <div className="grid gap-4 py-2">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <Label className="text-xs uppercase tracking-wide text-muted-foreground">Cidade *</Label>
              <Input value={city} onChange={(e) => setCity(e.target.value)} placeholder="Fortaleza, São Paulo..." className="mt-1.5" />
            </div>
            <div>
              <Label className="text-xs uppercase tracking-wide text-muted-foreground">Data do evento *</Label>
              <Input type="date" value={eventDate} onChange={(e) => setEventDate(e.target.value)} className="mt-1.5" />
            </div>
            <div>
              <Label className="text-xs uppercase tracking-wide text-muted-foreground">Nome da turma *</Label>
              <Input value={className} onChange={(e) => setClassName(e.target.value)} placeholder="Turma Fortaleza Maio" className="mt-1.5" />
            </div>
            <div>
              <Label className="text-xs uppercase tracking-wide text-muted-foreground">Parceiro</Label>
              <Input value={partner} onChange={(e) => setPartner(e.target.value)} placeholder="Anfitrião / empresa" className="mt-1.5" />
            </div>
          </div>

          <div className="rounded-xl border border-border p-4 bg-muted/30">
            <div className="text-xs uppercase tracking-wide text-muted-foreground mb-3">Métricas do evento</div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <NumField label="Participantes" value={participants} onChange={setParticipants} />
              <NumField label="Qualificados" value={qualified} onChange={setQualified} />
              <NumField label="Compraram no pitch" value={boughtPitch} onChange={setBoughtPitch} />
              <NumField label="Follow-up 7 dias" value={followup} onChange={setFollowup} />
            </div>
          </div>

          <div>
            <Label className="text-xs uppercase tracking-wide text-muted-foreground">Observações</Label>
            <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} className="mt-1.5" rows={3} placeholder="Qualidade da audiência, parceiro, objeções, aprendizados..." />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button onClick={save} disabled={saving} className="bg-primary text-primary-foreground font-semibold hover:bg-primary/90">
            {saving ? "Salvando..." : record ? "Salvar alterações" : "Cadastrar evento"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

function NumField({ label, value, onChange }: { label: string; value: number; onChange: (n: number) => void }) {
  return (
    <div>
      <Label className="text-xs uppercase tracking-wide text-muted-foreground">{label}</Label>
      <Input
        type="number" min={0} step="1"
        value={value}
        onChange={(e) => onChange(Math.max(0, parseInt(e.target.value) || 0))}
        className="mt-1.5"
      />
    </div>
  )
}
