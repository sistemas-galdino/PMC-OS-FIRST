import { useEffect, useState } from "react"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Checkbox } from "@/components/ui/checkbox"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { DatePicker } from "@/components/ui/date-picker"
import { Trash2Icon, PlusIcon, LinkIcon } from "@/components/ui/icons"
import {
  VALORES,
  COMPLEXIDADES,
  FASES,
  MARCOS,
} from "@/lib/roadmap"
import type {
  RoadmapItem,
  RoadmapLink,
  Valor,
  Complexidade,
  Fase,
} from "@/lib/roadmap"

interface FormState {
  nome: string
  valor: Valor
  complexidade: Complexidade
  fase: Fase
  responsavel: string
  prazo: string
  observacoes: string
  marco_kickoff: boolean
  marco_kickoff_data: string
  marco_mvp: boolean
  marco_mvp_data: string
  marco_teste: boolean
  marco_teste_data: string
  marco_feito: boolean
  marco_feito_data: string
  links: RoadmapLink[]
}

function emptyForm(): FormState {
  return {
    nome: "",
    valor: "medio",
    complexidade: "media",
    fase: "ideacao",
    responsavel: "",
    prazo: "",
    observacoes: "",
    marco_kickoff: false,
    marco_kickoff_data: "",
    marco_mvp: false,
    marco_mvp_data: "",
    marco_teste: false,
    marco_teste_data: "",
    marco_feito: false,
    marco_feito_data: "",
    links: [],
  }
}

function itemToForm(item: RoadmapItem): FormState {
  return {
    nome: item.nome,
    valor: item.valor,
    complexidade: item.complexidade,
    fase: item.fase,
    responsavel: item.responsavel ?? "",
    prazo: item.prazo ?? "",
    observacoes: item.observacoes ?? "",
    marco_kickoff: item.marco_kickoff,
    marco_kickoff_data: item.marco_kickoff_data ?? "",
    marco_mvp: item.marco_mvp,
    marco_mvp_data: item.marco_mvp_data ?? "",
    marco_teste: item.marco_teste,
    marco_teste_data: item.marco_teste_data ?? "",
    marco_feito: item.marco_feito,
    marco_feito_data: item.marco_feito_data ?? "",
    links: Array.isArray(item.links) ? item.links : [],
  }
}

interface Props {
  open: boolean
  item: RoadmapItem | null
  onClose: () => void
  onSave: (id: string | null, payload: Partial<RoadmapItem>) => Promise<void>
}

const fieldLabel = "text-[11px] font-bold uppercase tracking-wider text-muted-foreground"

export function EditarItemDialog({ open, item, onClose, onSave }: Props) {
  const [form, setForm] = useState<FormState>(emptyForm)
  const [novoLink, setNovoLink] = useState<RoadmapLink>({ nome: "", url: "" })
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (!open) return
    setForm(item ? itemToForm(item) : emptyForm())
    setNovoLink({ nome: "", url: "" })
  }, [open, item])

  function set<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm(prev => ({ ...prev, [key]: value }))
  }

  function addLink() {
    const url = novoLink.url.trim()
    if (!url) return
    set("links", [...form.links, { nome: novoLink.nome.trim(), url }])
    setNovoLink({ nome: "", url: "" })
  }

  function removeLink(idx: number) {
    set("links", form.links.filter((_, i) => i !== idx))
  }

  async function handleSave() {
    if (!form.nome.trim() || saving) return
    setSaving(true)
    const payload: Partial<RoadmapItem> = {
      nome: form.nome.trim(),
      valor: form.valor,
      complexidade: form.complexidade,
      fase: form.fase,
      prazo: form.prazo.trim() || null,
      responsavel: form.responsavel.trim() || null,
      observacoes: form.observacoes.trim() || null,
      marco_kickoff: form.marco_kickoff,
      marco_kickoff_data: form.marco_kickoff_data || null,
      marco_mvp: form.marco_mvp,
      marco_mvp_data: form.marco_mvp_data || null,
      marco_teste: form.marco_teste,
      marco_teste_data: form.marco_teste_data || null,
      marco_feito: form.marco_feito,
      marco_feito_data: form.marco_feito_data || null,
      links: form.links,
    }
    try {
      await onSave(item?.id ?? null, payload)
      onClose()
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={o => !o && onClose()}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="text-lg font-bold">
            {item ? "Editar Item" : "Novo Item"}
          </DialogTitle>
        </DialogHeader>

        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <label className={fieldLabel}>Nome</label>
            <Input
              value={form.nome}
              onChange={e => set("nome", e.target.value)}
              placeholder="Nome do sistema / funcionalidade"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1.5">
              <label className={fieldLabel}>Valor</label>
              <Select value={form.valor} onValueChange={v => set("valor", v as Valor)}>
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {VALORES.map(v => (
                    <SelectItem key={v.value} value={v.value}>{v.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex flex-col gap-1.5">
              <label className={fieldLabel}>Complexidade</label>
              <Select
                value={form.complexidade}
                onValueChange={v => set("complexidade", v as Complexidade)}
              >
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {COMPLEXIDADES.map(c => (
                    <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1.5">
              <label className={fieldLabel}>Fase</label>
              <Select value={form.fase} onValueChange={v => set("fase", v as Fase)}>
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {FASES.map(f => (
                    <SelectItem key={f.value} value={f.value}>{f.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex flex-col gap-1.5">
              <label className={fieldLabel}>Prazo</label>
              <Input
                value={form.prazo}
                onChange={e => set("prazo", e.target.value)}
                placeholder="Ex: 3-4 semanas"
              />
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            <label className={fieldLabel}>Responsável</label>
            <Input
              value={form.responsavel}
              onChange={e => set("responsavel", e.target.value)}
              placeholder="Nome do responsável"
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label className={fieldLabel}>Observações / Riscos</label>
            <Textarea
              value={form.observacoes}
              onChange={e => set("observacoes", e.target.value)}
              placeholder="Notas, dependências, riscos..."
            />
          </div>

          <div className="flex flex-col gap-2">
            <label className={fieldLabel}>Marcos Evolutivos</label>
            <div className="flex flex-col divide-y divide-border rounded-xl border border-border">
              {MARCOS.map(m => {
                const done = form[m.doneField as keyof FormState] as boolean
                const dataKey = m.dataField as keyof FormState
                return (
                  <div key={m.key} className="flex items-center gap-3 px-3 py-2.5">
                    <Checkbox
                      checked={done}
                      onCheckedChange={c =>
                        set(m.doneField as keyof FormState, !!c as never)
                      }
                    />
                    <span className="w-20 text-sm font-semibold text-foreground">{m.label}</span>
                    <div className="flex-1">
                      <DatePicker
                        compact
                        value={form[dataKey] as string}
                        onChange={v => set(dataKey, v as never)}
                        placeholder="Data"
                      />
                    </div>
                  </div>
                )
              })}
            </div>
          </div>

          <div className="flex flex-col gap-2">
            <label className={fieldLabel}>Links Relacionados</label>
            {form.links.length > 0 && (
              <div className="flex flex-col gap-1.5">
                {form.links.map((l, i) => (
                  <div
                    key={i}
                    className="flex items-center gap-2 rounded-lg border border-border bg-muted/20 px-3 py-2"
                  >
                    <LinkIcon className="size-3.5 shrink-0 text-primary" />
                    <a
                      href={l.url}
                      target="_blank"
                      rel="noreferrer"
                      className="flex-1 truncate text-sm text-foreground hover:underline"
                    >
                      {l.nome || l.url}
                    </a>
                    <button
                      type="button"
                      onClick={() => removeLink(i)}
                      className="text-muted-foreground transition-colors hover:text-destructive"
                      aria-label="Remover link"
                    >
                      <Trash2Icon className="size-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            )}
            <div className="flex items-center gap-2">
              <Input
                value={novoLink.nome}
                onChange={e => setNovoLink(p => ({ ...p, nome: e.target.value }))}
                placeholder="Nome (opcional)"
                className="flex-1"
              />
              <Input
                value={novoLink.url}
                onChange={e => setNovoLink(p => ({ ...p, url: e.target.value }))}
                placeholder="https://..."
                className="flex-1"
                onKeyDown={e => {
                  if (e.key === "Enter") {
                    e.preventDefault()
                    addLink()
                  }
                }}
              />
              <Button type="button" variant="outline" size="sm" onClick={addLink}>
                <PlusIcon className="size-4" />
                Add
              </Button>
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={saving}>
            Cancelar
          </Button>
          <Button onClick={handleSave} disabled={saving || !form.nome.trim()}>
            {saving ? "Salvando..." : "Salvar"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
