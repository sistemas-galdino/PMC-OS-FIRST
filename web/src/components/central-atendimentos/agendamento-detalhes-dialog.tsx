import { useEffect, useState } from "react"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Checkbox } from "@/components/ui/checkbox"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  STATUS_AGENDAMENTO,
  STATUS_LABEL,
  STATUS_BADGE,
  formatarData,
} from "@/lib/atendimentos"
import type { AgendamentoCentral, StatusAgendamento, EquipeConfig } from "@/lib/atendimentos"

interface Props {
  open: boolean
  agendamento: AgendamentoCentral | null
  cfg: EquipeConfig
  onClose: () => void
  onSave: (ag: AgendamentoCentral, patch: Partial<AgendamentoCentral>) => Promise<void>
}

export function AgendamentoDetalhesDialog({ open, agendamento, cfg, onClose, onSave }: Props) {
  const [status, setStatus] = useState<StatusAgendamento>("pendente_sync")
  const [observacoes, setObservacoes] = useState("")
  const [compareceu, setCompareceu] = useState<boolean | null>(null)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (open && agendamento) {
      setStatus((agendamento.status_agendamento as StatusAgendamento | null) ?? "pendente_sync")
      setObservacoes(agendamento.observacoes ?? "")
      setCompareceu(agendamento.cliente_compareceu)
    }
  }, [open, agendamento])

  if (!agendamento) return null

  async function handleSave() {
    if (!agendamento) return
    setSaving(true)
    await onSave(agendamento, {
      status_agendamento: status,
      observacoes: observacoes || null,
      cliente_compareceu: compareceu,
    })
    setSaving(false)
  }

  return (
    <Dialog open={open} onOpenChange={v => !v && onClose()}>
      <DialogContent className="sm:max-w-xl">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold">Detalhes do agendamento</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="grid grid-cols-2 gap-3">
            <Info label="Data" value={formatarData(agendamento.data_reuniao)} />
            <Info label="Horário" value={(agendamento.horario ?? "").slice(0, 5) || "—"} />
            <Info label={cfg.profSingularTitulo} value={agendamento.consultor_nome ?? "—"} />
            <Info label="Origem" value={<Badge variant="outline" className="font-bold uppercase text-[9px] px-2">{agendamento.origem}</Badge>} />
            <Info label="Cliente" value={agendamento.cliente_nome ?? "—"} />
            <Info label="Empresa" value={agendamento.empresa ?? "—"} />
            <Info label="Email" value={agendamento.cliente_email ?? "—"} />
            <Info label="Telefone" value={agendamento.cliente_telefone ?? "—"} />
          </div>

          {!agendamento.id_reuniao && (
            <div className="rounded-xl border border-amber-500/30 bg-amber-500/5 p-3 text-xs text-amber-400 font-medium">
              Evento ainda não foi criado no Google Calendar. Quando a integração estiver ativa, o sistema sincroniza automaticamente.
            </div>
          )}

          {agendamento.link_meet && (
            <div className="rounded-xl border border-primary/30 bg-primary/5 p-3">
              <div className="text-[10px] font-bold uppercase tracking-widest text-primary/80">Link Meet</div>
              <a href={agendamento.link_meet} target="_blank" rel="noopener noreferrer" className="text-sm text-primary underline break-all">
                {agendamento.link_meet}
              </a>
            </div>
          )}

          <div className="space-y-1.5">
            <Label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Status</Label>
            <Select value={status} onValueChange={v => setStatus(v as StatusAgendamento)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {STATUS_AGENDAMENTO.map(s => (
                  <SelectItem key={s} value={s}>
                    <Badge variant="outline" className={`uppercase font-bold text-[9px] px-2 mr-2 ${STATUS_BADGE[s]}`}>
                      {STATUS_LABEL[s]}
                    </Badge>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <label className="flex items-center gap-2 cursor-pointer">
            <Checkbox checked={compareceu === true} onCheckedChange={v => setCompareceu(!!v)} />
            <span className="text-sm font-medium text-foreground">Cliente compareceu</span>
          </label>

          <div className="space-y-1.5">
            <Label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Observações</Label>
            <Textarea
              value={observacoes}
              onChange={e => setObservacoes(e.target.value)}
              rows={3}
              placeholder="Notas internas sobre esse atendimento..."
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Fechar</Button>
          <Button onClick={handleSave} disabled={saving}>
            {saving ? "Salvando..." : "Salvar"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

function Info({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="space-y-1">
      <div className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">{label}</div>
      <div className="text-sm text-foreground font-medium truncate">{value}</div>
    </div>
  )
}
