import { useState, type ReactNode } from "react"

import { PageHeader, Badge, EmptyState, FaseBadge } from "@/components/guardiao/ui-kit"
import {
  actions, useStore, STATUS_TAREFA, TIPOS_TAREFA, ORIGENS_TAREFA, TIPOS_ROTINA,
  type Tarefa, type Prioridade, type OrigemTarefa, type TipoRotina,
} from "@/lib/guardiao"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog"
import {
  Select, SelectTrigger, SelectValue, SelectContent, SelectItem,
} from "@/components/ui/select"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  Table, TableHeader, TableBody, TableRow, TableHead, TableCell,
} from "@/components/ui/table"
import { Trash2, Pencil } from "lucide-react"

type View = "lista" | "kanban" | "calendario"
type Opt = { value: string; label: string }

// Radix Select proíbe SelectItem com value "". Usamos um sentinel interno para
// representar a opção "todos / nenhum" (value "" no modelo do store).
const EMPTY = "__empty__"
function GSelect({
  value, onChange, options, placeholder, className,
}: {
  value: string
  onChange: (v: string) => void
  options: Opt[]
  placeholder?: string
  className?: string
}) {
  return (
    <Select value={value === "" ? EMPTY : value} onValueChange={(v) => onChange(v === EMPTY ? "" : v)}>
      <SelectTrigger className={className}>
        <SelectValue placeholder={placeholder} />
      </SelectTrigger>
      <SelectContent>
        {options.map((o) => {
          const v = o.value === "" ? EMPTY : o.value
          return <SelectItem key={v} value={v}>{o.label}</SelectItem>
        })}
      </SelectContent>
    </Select>
  )
}

function empty(): Omit<Tarefa, "id"> {
  return {
    titulo: "", setorId: undefined, projetoId: undefined, gargaloId: undefined, lider: "", responsavel: "",
    prazo: "", horario: "", prioridade: "Média", status: "A fazer", tipo: "Acompanhamento",
    origem: "Criada manualmente", tipoRotina: "Não se aplica", recorrencia: "Sem recorrência", observacoes: "",
  }
}

export default function Tarefas() {
  const setores = useStore((s) => s.setores)
  const projetos = useStore((s) => s.projetos)
  const tarefas = useStore((s) => s.tarefas)
  const [open, setOpen] = useState(false)
  const [editing, setEditing] = useState<Tarefa | null>(null)
  const [form, setForm] = useState<Omit<Tarefa, "id">>(empty())
  const [view, setView] = useState<View>("lista")
  const [filter, setFilter] = useState({ setorId: "", prioridade: "", status: "", q: "", origem: "", tipoRotina: "", fase: "" })

  const filtered = tarefas.filter((t) =>
    (!filter.setorId || t.setorId === filter.setorId) &&
    (!filter.prioridade || t.prioridade === filter.prioridade) &&
    (!filter.status || t.status === filter.status) &&
    (!filter.origem || (t.origem ?? "Criada manualmente") === filter.origem) &&
    (!filter.tipoRotina || (t.tipoRotina ?? "Não se aplica") === filter.tipoRotina) &&
    (!filter.fase || String(t.fase ?? "") === filter.fase) &&
    (!filter.q || t.titulo.toLowerCase().includes(filter.q.toLowerCase()))
  )

  const startNew = () => { setEditing(null); setForm(empty()); setOpen(true) }
  const startEdit = (t: Tarefa) => {
    setEditing(t)
    const { id: _id, ...rest } = t; void _id
    setForm(rest); setOpen(true)
  }
  const save = () => {
    if (editing) actions.updateTarefa(editing.id, form)
    else actions.addTarefa(form)
    setOpen(false)
  }

  const setorNome = (id?: string) => setores.find((s) => s.id === id)?.nome ?? "—"

  return (
    <div className="space-y-6">
      <PageHeader
        title="Tarefas"
        subtitle="Tudo que o Guardião precisa executar."
        action={<Button onClick={startNew}>+ Nova tarefa</Button>}
      />

      <Tabs value={view} onValueChange={(v) => setView(v as View)}>
        <TabsList className="w-full max-w-md">
          <TabsTrigger value="lista">Lista</TabsTrigger>
          <TabsTrigger value="kanban">Kanban</TabsTrigger>
          <TabsTrigger value="calendario">Calendário</TabsTrigger>
        </TabsList>
      </Tabs>

      <div className="flex flex-wrap items-center gap-2">
        <Input
          placeholder="Buscar..."
          className="h-8 w-44"
          value={filter.q}
          onChange={(e) => setFilter({ ...filter, q: e.target.value })}
        />
        <GSelect
          value={filter.setorId} onChange={(v) => setFilter({ ...filter, setorId: v })}
          options={[{ value: "", label: "Todo setor" }, ...setores.map((s) => ({ value: s.id, label: s.nome }))]}
        />
        <GSelect
          value={filter.prioridade} onChange={(v) => setFilter({ ...filter, prioridade: v })}
          options={[{ value: "", label: "Toda prioridade" }, ...["Alta", "Média", "Baixa"].map((p) => ({ value: p, label: p }))]}
        />
        <GSelect
          value={filter.status} onChange={(v) => setFilter({ ...filter, status: v })}
          options={[{ value: "", label: "Todo status" }, ...STATUS_TAREFA.map((s) => ({ value: s, label: s }))]}
        />
        <GSelect
          value={filter.origem} onChange={(v) => setFilter({ ...filter, origem: v })}
          options={[{ value: "", label: "Toda origem" }, ...ORIGENS_TAREFA.map((o) => ({ value: o, label: o }))]}
        />
        <GSelect
          value={filter.tipoRotina} onChange={(v) => setFilter({ ...filter, tipoRotina: v })}
          options={[{ value: "", label: "Toda rotina" }, ...TIPOS_ROTINA.map((r) => ({ value: r, label: r }))]}
        />
        <GSelect
          value={filter.fase} onChange={(v) => setFilter({ ...filter, fase: v })}
          options={[{ value: "", label: "Toda fase" }, ...[1, 2, 3, 4, 5, 6, 7].map((n) => ({ value: String(n), label: `Fase 0${n}` }))]}
        />
      </div>

      {view === "lista" && (
        <div className="space-y-2">
          {filtered.map((t) => (
            <div key={t.id} className="rounded-lg border card-glass p-4 flex items-center gap-3 flex-wrap">
              <div className="flex-1 min-w-0">
                <div className="text-sm font-medium">{t.titulo}</div>
                <div className="text-xs text-muted-foreground">
                  {setorNome(t.setorId)} · {t.responsavel || "—"} · {t.prazo || "sem prazo"}
                  {t.origem && t.origem !== "Criada manualmente" && <> · <span className="text-primary">{t.origem}</span></>}
                </div>
              </div>
              {t.tipoRotina && t.tipoRotina !== "Não se aplica" && <Badge tone="neon">{t.tipoRotina}</Badge>}
              <FaseBadge fase={t.fase ?? undefined} />
              <Badge>{t.tipo}</Badge>
              <Badge tone={t.prioridade === "Alta" ? "warn" : "default"}>{t.prioridade}</Badge>
              <Badge tone={t.status === "Concluído" ? "ok" : "neon"}>{t.status}</Badge>
              <Button variant="ghost" size="icon-sm" onClick={() => startEdit(t)}><Pencil className="h-4 w-4" /></Button>
              <Button
                variant="ghost" size="icon-sm"
                className="hover:bg-destructive/20 hover:text-destructive"
                onClick={() => actions.removeTarefa(t.id)}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          ))}
        </div>
      )}

      {view === "kanban" && (
        <div className="overflow-x-auto -mx-6 px-6">
          <div className="flex gap-3 min-w-max">
            {STATUS_TAREFA.map((col) => (
              <div key={col} className="w-72 shrink-0">
                <div className="text-xs uppercase tracking-wider text-muted-foreground mb-2 px-1">{col}</div>
                <div className="space-y-2 min-h-[100px] rounded-lg border card-glass p-2">
                  {filtered.filter((t) => t.status === col).map((t) => (
                    <div key={t.id} className="p-3 rounded-md bg-muted">
                      <div className="text-sm font-medium">{t.titulo}</div>
                      <div className="text-[11px] text-muted-foreground mt-1">{t.responsavel || "—"} · {t.tipo}</div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {view === "calendario" && (
        <div className="rounded-lg border card-glass p-4">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Prazo</TableHead>
                <TableHead>Tarefa</TableHead>
                <TableHead>Setor</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {[...filtered].sort((a, b) => (a.prazo || "").localeCompare(b.prazo || "")).map((t) => (
                <TableRow key={t.id}>
                  <TableCell className="text-muted-foreground">{t.prazo || "—"}</TableCell>
                  <TableCell>{t.titulo}</TableCell>
                  <TableCell className="text-muted-foreground">{setorNome(t.setorId)}</TableCell>
                  <TableCell><Badge>{t.status}</Badge></TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      {filtered.length === 0 && <EmptyState title="Sem tarefas" />}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-2xl max-h-[92vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editing ? "Editar tarefa" : "Nova tarefa"}</DialogTitle>
          </DialogHeader>
          <div className="grid md:grid-cols-2 gap-3">
            <Field label="Título" full>
              <Input className="h-8" value={form.titulo} onChange={(e) => setForm({ ...form, titulo: e.target.value })} />
            </Field>
            <Field label="Setor">
              <GSelect
                className="w-full" value={form.setorId ?? ""}
                onChange={(v) => setForm({ ...form, setorId: v || undefined })}
                options={[{ value: "", label: "—" }, ...setores.map((s) => ({ value: s.id, label: s.nome }))]}
              />
            </Field>
            <Field label="Projeto vinculado">
              <GSelect
                className="w-full" value={form.projetoId ?? ""}
                onChange={(v) => setForm({ ...form, projetoId: v || undefined })}
                options={[{ value: "", label: "—" }, ...projetos.map((p) => ({ value: p.id, label: p.nome }))]}
              />
            </Field>
            <Field label="Responsável">
              <Input className="h-8" value={form.responsavel} onChange={(e) => setForm({ ...form, responsavel: e.target.value })} />
            </Field>
            <Field label="Prazo">
              <Input type="date" className="h-8" value={form.prazo} onChange={(e) => setForm({ ...form, prazo: e.target.value })} />
            </Field>
            <Field label="Prioridade">
              <GSelect
                className="w-full" value={form.prioridade}
                onChange={(v) => setForm({ ...form, prioridade: v as Prioridade })}
                options={["Alta", "Média", "Baixa"].map((p) => ({ value: p, label: p }))}
              />
            </Field>
            <Field label="Status">
              <GSelect
                className="w-full" value={form.status}
                onChange={(v) => setForm({ ...form, status: v })}
                options={STATUS_TAREFA.map((s) => ({ value: s, label: s }))}
              />
            </Field>
            <Field label="Tipo">
              <GSelect
                className="w-full" value={form.tipo}
                onChange={(v) => setForm({ ...form, tipo: v })}
                options={TIPOS_TAREFA.map((t) => ({ value: t, label: t }))}
              />
            </Field>
            <Field label="Origem da tarefa">
              <GSelect
                className="w-full" value={form.origem ?? "Criada manualmente"}
                onChange={(v) => setForm({ ...form, origem: v as OrigemTarefa })}
                options={ORIGENS_TAREFA.map((o) => ({ value: o, label: o }))}
              />
            </Field>
            <Field label="Tipo de rotina">
              <GSelect
                className="w-full" value={form.tipoRotina ?? "Não se aplica"}
                onChange={(v) => setForm({ ...form, tipoRotina: v as TipoRotina })}
                options={TIPOS_ROTINA.map((r) => ({ value: r, label: r }))}
              />
            </Field>
            <Field label="Observações" full>
              <Textarea
                className="min-h-[60px]"
                value={form.observacoes}
                onChange={(e) => setForm({ ...form, observacoes: e.target.value })}
              />
            </Field>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
            <Button onClick={save}>Salvar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

function Field({ label, children, full }: { label: string; children: ReactNode; full?: boolean }) {
  return (
    <label className={"text-sm block " + (full ? "md:col-span-2" : "")}>
      <div className="text-xs text-muted-foreground mb-1">{label}</div>
      {children}
    </label>
  )
}
