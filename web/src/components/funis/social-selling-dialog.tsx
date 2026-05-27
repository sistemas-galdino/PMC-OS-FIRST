import { useEffect, useState } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { supabase } from "@/lib/supabase"
import { toast } from "sonner"
import { toISODate, type SocialSellingRecord } from "@/lib/funis"

interface Props {
  open: boolean
  onOpenChange: (o: boolean) => void
  record?: SocialSellingRecord | null
}

export function SocialSellingDialog({ open, onOpenChange, record }: Props) {
  const [date, setDate] = useState(toISODate(new Date()))
  const [approaches, setApproaches] = useState(0)
  const [conversations, setConversations] = useState(0)
  const [callInvites, setCallInvites] = useState(0)
  const [meetings, setMeetings] = useState(0)
  const [notes, setNotes] = useState("")
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (!open) return
    if (record) {
      setDate(record.record_date)
      setApproaches(record.approaches)
      setConversations(record.conversations)
      setCallInvites(record.call_invites)
      setMeetings(record.meetings_scheduled)
      setNotes(record.notes ?? "")
    } else {
      setDate(toISODate(new Date()))
      setApproaches(0); setConversations(0); setCallInvites(0); setMeetings(0)
      setNotes("")
    }
  }, [open, record])

  const save = async () => {
    setSaving(true)
    const payload = {
      record_date: date,
      approaches,
      conversations,
      call_invites: callInvites,
      meetings_scheduled: meetings,
      notes: notes || null,
    }
    const { error } = record
      ? await supabase.from("funis_social_selling").update(payload).eq("id", record.id)
      : await supabase.from("funis_social_selling").insert(payload)
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
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold tracking-tight">
            {record ? "Editar registro" : "Novo registro"}
          </DialogTitle>
        </DialogHeader>

        <div className="grid gap-4 py-2">
          <div>
            <Label className="text-xs uppercase tracking-wide text-muted-foreground">Data</Label>
            <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="mt-1.5" />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <NumField label="Abordagens" value={approaches} setValue={setApproaches} />
            <NumField label="Conversas" value={conversations} setValue={setConversations} />
            <NumField label="Convites para call" value={callInvites} setValue={setCallInvites} />
            <NumField label="Reuniões agendadas" value={meetings} setValue={setMeetings} />
          </div>

          <div>
            <Label className="text-xs uppercase tracking-wide text-muted-foreground">Notas (opcional)</Label>
            <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} className="mt-1.5" rows={2} />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button onClick={save} disabled={saving} className="bg-primary text-primary-foreground font-semibold hover:bg-primary/90">
            {saving ? "Salvando..." : record ? "Salvar alterações" : "Criar registro"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

function NumField({ label, value, setValue }: { label: string; value: number; setValue: (n: number) => void }) {
  return (
    <div>
      <Label className="text-xs uppercase tracking-wide text-muted-foreground">{label}</Label>
      <Input
        type="number"
        min={0}
        value={value}
        onChange={(e) => setValue(Math.max(0, parseInt(e.target.value) || 0))}
        className="mt-1.5 text-lg font-bold"
      />
    </div>
  )
}
