import { useEffect, useState } from "react"
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Button } from "@/components/ui/button"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

export interface EncontroFormPayload {
  tipo_encontro: string
  titulo: string
  descricao?: string | null
  data: string         // YYYY-MM-DD
  hora_inicio: string  // HH:MM
  hora_fim: string     // HH:MM
}

export interface EncontroFormInicial extends Partial<EncontroFormPayload> {
  id_unico?: string
}

interface Props {
  open: boolean
  inicial: EncontroFormInicial | null   // null = criar novo; presente = editar
  tiposConhecidos: { value: string; label: string }[]
  onClose: () => void
  onSave: (id: string | null, payload: EncontroFormPayload) => Promise<void>
}

const FORM_VAZIO: EncontroFormPayload = {
  tipo_encontro: "",
  titulo: "",
  descricao: "",
  data: "",
  hora_inicio: "19:00",
  hora_fim: "21:00",
}

const TIPO_OUTRO = "__outro__"

export function EncontroFormDialog({ open, inicial, tiposConhecidos, onClose, onSave }: Props) {
  const [form, setForm] = useState<EncontroFormPayload>(FORM_VAZIO)
  const [tipoSelect, setTipoSelect] = useState<string>("")
  const [tipoLivre, setTipoLivre] = useState<string>("")
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (!open) return
    if (inicial) {
      const payload: EncontroFormPayload = {
        tipo_encontro: inicial.tipo_encontro ?? "",
        titulo: inicial.titulo ?? "",
        descricao: inicial.descricao ?? "",
        data: inicial.data ?? "",
        hora_inicio: inicial.hora_inicio ?? "19:00",
        hora_fim: inicial.hora_fim ?? "21:00",
      }
      setForm(payload)
      const conhecido = tiposConhecidos.some(t => t.value === payload.tipo_encontro)
      if (conhecido) {
        setTipoSelect(payload.tipo_encontro)
        setTipoLivre("")
      } else {
        setTipoSelect(TIPO_OUTRO)
        setTipoLivre(payload.tipo_encontro)
      }
    } else {
      setForm(FORM_VAZIO)
      setTipoSelect("")
      setTipoLivre("")
    }
  }, [open, inicial, tiposConhecidos])

  function tipoFinal(): string {
    return tipoSelect === TIPO_OUTRO ? tipoLivre.trim() : tipoSelect
  }

  async function handleSave() {
    const tipo = tipoFinal()
    if (!tipo) {
      alert("Selecione o tipo do encontro")
      return
    }
    if (!form.titulo.trim() || !form.data || !form.hora_inicio || !form.hora_fim) {
      alert("Título, data e horários são obrigatórios")
      return
    }
    if (form.hora_fim <= form.hora_inicio) {
      alert("Hora fim precisa ser maior que hora início")
      return
    }
    setSaving(true)
    try {
      await onSave(inicial?.id_unico ?? null, {
        tipo_encontro: tipo,
        titulo: form.titulo.trim(),
        descricao: form.descricao?.trim() || null,
        data: form.data,
        hora_inicio: form.hora_inicio,
        hora_fim: form.hora_fim,
      })
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={v => !v && onClose()}>
      <DialogContent className="sm:max-w-xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold">
            {inicial?.id_unico ? "Editar encontro" : "Novo encontro"}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="space-y-1.5">
            <Label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
              Tipo
            </Label>
            <Select value={tipoSelect} onValueChange={setTipoSelect}>
              <SelectTrigger>
                <SelectValue placeholder="Selecione o tipo" />
              </SelectTrigger>
              <SelectContent>
                {tiposConhecidos.map(t => (
                  <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                ))}
                <SelectItem value={TIPO_OUTRO}>Outro (digite abaixo)</SelectItem>
              </SelectContent>
            </Select>
            {tipoSelect === TIPO_OUTRO && (
              <Input
                placeholder="Ex: tutoria, workshop_anual, etc"
                value={tipoLivre}
                onChange={e => setTipoLivre(e.target.value)}
              />
            )}
          </div>

          <div className="space-y-1.5">
            <Label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
              Título
            </Label>
            <Input
              value={form.titulo}
              onChange={e => setForm(f => ({ ...f, titulo: e.target.value }))}
              placeholder="Ex: Implementation Day Marília"
            />
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div className="space-y-1.5">
              <Label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                Data
              </Label>
              <Input
                type="date"
                value={form.data}
                onChange={e => setForm(f => ({ ...f, data: e.target.value }))}
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                Início
              </Label>
              <Input
                type="time"
                value={form.hora_inicio}
                onChange={e => setForm(f => ({ ...f, hora_inicio: e.target.value }))}
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                Fim
              </Label>
              <Input
                type="time"
                value={form.hora_fim}
                onChange={e => setForm(f => ({ ...f, hora_fim: e.target.value }))}
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
              Descrição (opcional)
            </Label>
            <Textarea
              value={form.descricao ?? ""}
              onChange={e => setForm(f => ({ ...f, descricao: e.target.value }))}
              rows={3}
              placeholder="Detalhes do encontro, pauta, etc."
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancelar</Button>
          <Button onClick={handleSave} disabled={saving}>
            {saving ? "Salvando..." : "Salvar"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
