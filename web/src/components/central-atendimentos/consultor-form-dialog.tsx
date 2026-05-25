import { useEffect, useState } from "react"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { slugify, EMAILS_CALENDAR_VALIDOS } from "@/lib/atendimentos"
import type { Consultor, TabelaDestino } from "@/lib/atendimentos"

interface Props {
  open: boolean
  consultor: Consultor | null
  onClose: () => void
  onSave: (id: string | null, payload: Partial<Consultor>) => Promise<void>
}

const initialForm = {
  nome: "",
  slug: "",
  email: "",
  email_calendar: "mentor@rafaelgaldino.com.br",
  tabela_destino: "reunioes_mentoria_new" as TabelaDestino,
  tipo_reuniao: "" as "" | "implementacao" | "tutoria",
  especialidade: "",
  descricao: "",
  avatar_url: "",
  duracao_padrao_minutos: 60,
  ativo: true,
  ordem: 0,
}

export function ConsultorFormDialog({ open, consultor, onClose, onSave }: Props) {
  const [form, setForm] = useState(initialForm)
  const [saving, setSaving] = useState(false)
  const [slugTouched, setSlugTouched] = useState(false)

  useEffect(() => {
    if (open) {
      if (consultor) {
        setForm({
          nome: consultor.nome,
          slug: consultor.slug,
          email: consultor.email ?? "",
          email_calendar: consultor.email_calendar,
          tabela_destino: consultor.tabela_destino,
          tipo_reuniao: (consultor.tipo_reuniao ?? "") as "" | "implementacao" | "tutoria",
          especialidade: consultor.especialidade ?? "",
          descricao: consultor.descricao ?? "",
          avatar_url: consultor.avatar_url ?? "",
          duracao_padrao_minutos: consultor.duracao_padrao_minutos,
          ativo: consultor.ativo,
          ordem: consultor.ordem,
        })
        setSlugTouched(true)
      } else {
        setForm(initialForm)
        setSlugTouched(false)
      }
    }
  }, [open, consultor])

  function setNome(v: string) {
    setForm(f => ({
      ...f,
      nome: v,
      slug: slugTouched ? f.slug : slugify(v),
    }))
  }

  async function handleSave() {
    if (!form.nome.trim() || !form.slug.trim() || !form.email_calendar.trim()) {
      alert("Nome, slug e email do calendar são obrigatórios")
      return
    }
    setSaving(true)
    const payload: Partial<Consultor> = {
      nome: form.nome.trim(),
      slug: form.slug.trim(),
      email: form.email.trim() || null,
      email_calendar: form.email_calendar.trim(),
      tabela_destino: form.tabela_destino,
      tipo_reuniao: form.tipo_reuniao || null,
      especialidade: form.especialidade.trim() || null,
      descricao: form.descricao.trim() || null,
      avatar_url: form.avatar_url.trim() || null,
      duracao_padrao_minutos: form.duracao_padrao_minutos,
      ativo: form.ativo,
      ordem: form.ordem,
    }
    await onSave(consultor?.id ?? null, payload)
    setSaving(false)
  }

  return (
    <Dialog open={open} onOpenChange={v => !v && onClose()}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold">
            {consultor ? "Editar consultor" : "Novo consultor"}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Nome</Label>
              <Input value={form.nome} onChange={e => setNome(e.target.value)} placeholder="Ex: Rodrigo Nogueira" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Slug (URL)</Label>
              <Input
                value={form.slug}
                onChange={e => { setForm(f => ({ ...f, slug: e.target.value })); setSlugTouched(true) }}
                placeholder="ex: rodrigo"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Especialidade</Label>
              <Input value={form.especialidade} onChange={e => setForm(f => ({ ...f, especialidade: e.target.value }))} placeholder="Ex: Tráfego pago" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Duração padrão (min)</Label>
              <Input
                type="number"
                min={15}
                step={15}
                value={form.duracao_padrao_minutos}
                onChange={e => setForm(f => ({ ...f, duracao_padrao_minutos: Number(e.target.value) || 60 }))}
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Descrição</Label>
            <Textarea
              value={form.descricao}
              onChange={e => setForm(f => ({ ...f, descricao: e.target.value }))}
              placeholder="Breve descrição do que esse consultor faz."
              rows={2}
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Email pessoal</Label>
              <Input value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} placeholder="rodrigo@…" type="email" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Email do Calendar (organizador)</Label>
              <Select value={form.email_calendar} onValueChange={v => setForm(f => ({ ...f, email_calendar: v }))}>
                <SelectTrigger>
                  <SelectValue placeholder="Escolha a caixa organizadora" />
                </SelectTrigger>
                <SelectContent>
                  {EMAILS_CALENDAR_VALIDOS.map(email => (
                    <SelectItem key={email} value={email}>{email}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Tabela destino</Label>
              <Select value={form.tabela_destino} onValueChange={v => setForm(f => ({ ...f, tabela_destino: v as TabelaDestino }))}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="reunioes_galdino">reunioes_galdino (1:1 Galdino)</SelectItem>
                  <SelectItem value="reunioes_mentoria_new">reunioes_mentoria_new (consultor PMC)</SelectItem>
                  <SelectItem value="reunioes_blackcrm">reunioes_blackcrm (tutoria / implementação)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Tipo (se BlackCRM)</Label>
              <Select
                value={form.tipo_reuniao || "_none"}
                onValueChange={v => setForm(f => ({ ...f, tipo_reuniao: v === "_none" ? "" : (v as "implementacao" | "tutoria") }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="—" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="_none">—</SelectItem>
                  <SelectItem value="implementacao">Implementação</SelectItem>
                  <SelectItem value="tutoria">Tutoria</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Avatar URL</Label>
              <Input value={form.avatar_url} onChange={e => setForm(f => ({ ...f, avatar_url: e.target.value }))} placeholder="https://..." />
            </div>
            <div className="space-y-1.5">
              <Label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Ordem</Label>
              <Input
                type="number"
                value={form.ordem}
                onChange={e => setForm(f => ({ ...f, ordem: Number(e.target.value) || 0 }))}
              />
            </div>
          </div>

          <label className="flex items-center gap-2 pt-1 cursor-pointer">
            <Checkbox checked={form.ativo} onCheckedChange={v => setForm(f => ({ ...f, ativo: !!v }))} />
            <span className="text-sm font-medium text-foreground">Consultor ativo (aparece na página pública)</span>
          </label>
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
