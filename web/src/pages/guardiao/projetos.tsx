import { useState, type ReactNode } from "react"
import { Link } from "react-router-dom"

import { PageHeader, Badge, EmptyState, FaseBadge } from "@/components/guardiao/ui-kit"
import {
  actions, useStore, STATUS_PROJETO, TIPOS_ENTREGA, TIPOS_APOIO, TIPOS_PROJETO, FASES,
  type Projeto,
} from "@/lib/guardiao"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Checkbox } from "@/components/ui/checkbox"
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog"
import {
  Sheet, SheetContent, SheetHeader, SheetTitle,
} from "@/components/ui/sheet"
import {
  Select, SelectTrigger, SelectValue, SelectContent, SelectItem,
} from "@/components/ui/select"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Trash2, Pencil, ExternalLink, GripVertical } from "lucide-react"

type View = "kanban" | "lista"
type FiltroTipo = "Todos" | "Piloto" | "Projeto"
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

const CONSULTORES = ["David Abner", "Issao Yokoi"]

function empty(setorId = ""): Omit<Projeto, "id" | "tarefasPadrao"> {
  return {
    nome: "", tipoProjeto: "Projeto", setorId, lider: "", guardiao: "", gargaloId: undefined,
    problema: "", solucao: "", tipoEntrega: "Sistema", meta: "", prazo: "",
    status: "Ideia", resultadoEsperado: "", resultadoAlcancado: "",
    horasEconomizadas: 0, evidencias: "", observacoes: "",
    precisaApoio: false, tipoApoio: "", consultor: "",
  }
}

export default function Projetos() {
  const setores = useStore((s) => s.setores)
  const gargalos = useStore((s) => s.gargalos)
  const projetos = useStore((s) => s.projetos)

  const [open, setOpen] = useState(false)
  const [editing, setEditing] = useState<Projeto | null>(null)
  const [form, setForm] = useState<Omit<Projeto, "id" | "tarefasPadrao">>(empty())
  const [view, setView] = useState<View>("kanban")
  const [detail, setDetail] = useState<string | null>(null)
  const [dragId, setDragId] = useState<string | null>(null)
  const [dragOverCol, setDragOverCol] = useState<string | null>(null)
  const [filtroTipo, setFiltroTipo] = useState<FiltroTipo>("Todos")
  const [filtroSetor, setFiltroSetor] = useState("")
  const [filtroFase, setFiltroFase] = useState("")

  const startNew = () => { setEditing(null); setForm(empty(setores[0]?.id ?? "")); setOpen(true) }
  const startEdit = (p: Projeto) => {
    setEditing(p)
    const { id: _id, tarefasPadrao: _t, ...rest } = p; void _id; void _t
    setForm(rest); setOpen(true)
  }
  const save = () => {
    if (editing) actions.updateProjeto(editing.id, form)
    else actions.addProjeto(form)
    setOpen(false)
  }

  const faseDoProjeto = (p: Projeto): number =>
    p.faseOrigem ?? setores.find((x) => x.id === p.setorId)?.faseAtual ?? 4

  const visiveis = projetos.filter((p) =>
    (filtroTipo === "Todos" || (p.tipoProjeto ?? "Projeto") === filtroTipo) &&
    (!filtroSetor || p.setorId === filtroSetor) &&
    (!filtroFase || String(faseDoProjeto(p)) === filtroFase)
  )
  const det = projetos.find((p) => p.id === detail)

  const onDrop = (col: string) => {
    if (dragId) {
      const p = projetos.find((x) => x.id === dragId)
      if (p && p.status !== col) actions.updateProjeto(dragId, { status: col })
    }
    setDragId(null)
    setDragOverCol(null)
  }

  const setorNome = (id?: string) => setores.find((s) => s.id === id)?.nome ?? "—"

  return (
    <div className="space-y-6">
      <PageHeader
        title="Projetos"
        subtitle="Acompanhe pilotos e projetos de IA. Arraste os cards entre as colunas para atualizar o status."
        action={<Button onClick={startNew}>+ Novo projeto</Button>}
      />

      <div className="flex flex-wrap items-center gap-2">
        <Tabs value={view} onValueChange={(v) => setView(v as View)}>
          <TabsList>
            <TabsTrigger value="kanban">Kanban</TabsTrigger>
            <TabsTrigger value="lista">Lista</TabsTrigger>
          </TabsList>
        </Tabs>
        <GSelect
          value={filtroSetor} onChange={setFiltroSetor}
          options={[{ value: "", label: "Todo setor" }, ...setores.map((s) => ({ value: s.id, label: s.nome }))]}
        />
        <GSelect
          value={filtroFase} onChange={setFiltroFase}
          options={[{ value: "", label: "Toda fase" }, ...FASES.map((f) => ({ value: String(f.num), label: `Fase 0${f.num}` }))]}
        />
        <GSelect
          value={filtroTipo} onChange={(v) => setFiltroTipo(v as FiltroTipo)}
          options={(["Todos", "Piloto", "Projeto"] as const).map((t) => ({ value: t, label: t }))}
        />
      </div>

      {view === "kanban" ? (
        <div className="overflow-x-auto -mx-6 px-6">
          <div className="flex gap-3 min-w-max pb-2">
            {STATUS_PROJETO.map((col) => {
              const itens = visiveis.filter((p) => p.status === col)
              const isOver = dragOverCol === col
              return (
                <div key={col} className="w-72 shrink-0">
                  <div className="text-xs uppercase tracking-wider text-muted-foreground mb-2 px-1 flex justify-between">
                    <span>{col}</span>
                    <span>{itens.length}</span>
                  </div>
                  <div
                    onDragOver={(e) => { e.preventDefault(); setDragOverCol(col) }}
                    onDragLeave={() => setDragOverCol((c) => (c === col ? null : c))}
                    onDrop={() => onDrop(col)}
                    className={cn(
                      "space-y-2 min-h-[120px] rounded-lg p-2 border transition-colors",
                      isOver ? "bg-primary/10 border-primary" : "bg-card border-border"
                    )}
                  >
                    {itens.map((p) => (
                      <div
                        key={p.id}
                        draggable
                        onDragStart={() => setDragId(p.id)}
                        onDragEnd={() => { setDragId(null); setDragOverCol(null) }}
                        onClick={() => setDetail(p.id)}
                        className={cn(
                          "group cursor-grab active:cursor-grabbing p-3 bg-muted rounded-md hover:glow-neon",
                          dragId === p.id && "opacity-40"
                        )}
                      >
                        <div className="flex items-start gap-1.5">
                          <GripVertical className="h-3.5 w-3.5 text-muted-foreground mt-0.5 opacity-0 group-hover:opacity-100" />
                          <div className="flex-1 min-w-0">
                            <div className="text-sm font-medium">{p.nome}</div>
                            <div className="text-[11px] text-muted-foreground mt-1">{setorNome(p.setorId)}</div>
                            <div className="mt-2 flex gap-1.5 flex-wrap">
                              <FaseBadge fase={faseDoProjeto(p)} />
                              <Badge tone={(p.tipoProjeto ?? "Projeto") === "Piloto" ? "warn" : "neon"}>{p.tipoProjeto ?? "Projeto"}</Badge>
                              <Badge tone="neon">{p.tipoEntrega}</Badge>
                              {p.precisaApoio && <Badge tone="warn">Apoio PMC</Badge>}
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                    {itens.length === 0 && (
                      <div className="text-[11px] text-muted-foreground/60 text-center py-4">Arraste um card aqui</div>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      ) : (
        <div className="space-y-2">
          {visiveis.map((p) => (
            <div key={p.id} className="rounded-lg border bg-card p-4 flex items-center gap-4 flex-wrap">
              <button className="flex-1 min-w-0 text-left" onClick={() => setDetail(p.id)}>
                <div className="font-medium">{p.nome}</div>
                <div className="text-xs text-muted-foreground">{setorNome(p.setorId)} · {p.tipoEntrega}</div>
              </button>
              <FaseBadge fase={faseDoProjeto(p)} />
              <Badge tone={(p.tipoProjeto ?? "Projeto") === "Piloto" ? "warn" : "neon"}>{p.tipoProjeto ?? "Projeto"}</Badge>
              <GSelect
                className="w-44"
                value={p.status}
                onChange={(v) => actions.updateProjeto(p.id, { status: v })}
                options={STATUS_PROJETO.map((s) => ({ value: s, label: s }))}
              />
              <Button variant="ghost" size="icon-sm" onClick={() => startEdit(p)}>
                <Pencil className="h-4 w-4" />
              </Button>
              <Button
                variant="ghost" size="icon-sm"
                className="hover:bg-destructive/20 hover:text-destructive"
                onClick={() => actions.removeProjeto(p.id)}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          ))}
        </div>
      )}

      {visiveis.length === 0 && <EmptyState title="Nenhum projeto" hint="Crie um projeto ou transforme um gargalo em projeto piloto." />}

      {/* Modal criar/editar */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-3xl max-h-[92vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editing ? "Editar projeto" : "Novo projeto"}</DialogTitle>
          </DialogHeader>
          <div className="grid md:grid-cols-2 gap-3">
            <Field label="Nome do projeto" full>
              <Input className="h-8" value={form.nome} onChange={(e) => setForm({ ...form, nome: e.target.value })} />
            </Field>
            <Field label="Tipo">
              <GSelect
                className="w-full" value={form.tipoProjeto}
                onChange={(v) => setForm({ ...form, tipoProjeto: v as "Piloto" | "Projeto" })}
                options={TIPOS_PROJETO.map((t) => ({ value: t, label: t }))}
              />
            </Field>
            <Field label="Setor">
              <GSelect
                className="w-full" value={form.setorId}
                onChange={(v) => setForm({ ...form, setorId: v })}
                options={[{ value: "", label: "Selecione..." }, ...setores.map((s) => ({ value: s.id, label: s.nome }))]}
              />
            </Field>
            <Field label="Gargalo vinculado">
              <GSelect
                className="w-full" value={form.gargaloId ?? ""}
                onChange={(v) => setForm({ ...form, gargaloId: v || undefined })}
                options={[
                  { value: "", label: "—" },
                  ...gargalos.filter((g) => !form.setorId || g.setorId === form.setorId).map((g) => ({ value: g.id, label: g.processo })),
                ]}
              />
            </Field>
            <Field label="Líder responsável">
              <Input className="h-8" value={form.lider} onChange={(e) => setForm({ ...form, lider: e.target.value })} />
            </Field>
            <Field label="Guardião responsável">
              <Input className="h-8" value={form.guardiao} onChange={(e) => setForm({ ...form, guardiao: e.target.value })} />
            </Field>
            <Field label="Problema que será resolvido" full>
              <Textarea className="min-h-[60px]" value={form.problema} onChange={(e) => setForm({ ...form, problema: e.target.value })} />
            </Field>
            <Field label="Solução proposta" full>
              <Textarea className="min-h-[60px]" value={form.solucao} onChange={(e) => setForm({ ...form, solucao: e.target.value })} />
            </Field>
            <Field label="Tipo de entrega">
              <GSelect
                className="w-full" value={form.tipoEntrega}
                onChange={(v) => setForm({ ...form, tipoEntrega: v })}
                options={TIPOS_ENTREGA.map((t) => ({ value: t, label: t }))}
              />
            </Field>
            <Field label="Meta do projeto">
              <Input className="h-8" value={form.meta} onChange={(e) => setForm({ ...form, meta: e.target.value })} />
            </Field>
            <Field label="Prazo">
              <Input className="h-8" value={form.prazo} onChange={(e) => setForm({ ...form, prazo: e.target.value })} placeholder="ex: 30 dias" />
            </Field>
            <Field label="Status">
              <GSelect
                className="w-full" value={form.status}
                onChange={(v) => setForm({ ...form, status: v })}
                options={STATUS_PROJETO.map((s) => ({ value: s, label: s }))}
              />
            </Field>
            <Field label="Resultado esperado" full>
              <Textarea className="min-h-[50px]" value={form.resultadoEsperado} onChange={(e) => setForm({ ...form, resultadoEsperado: e.target.value })} />
            </Field>
            <Field label="Resultado alcançado" full>
              <Textarea className="min-h-[50px]" value={form.resultadoAlcancado} onChange={(e) => setForm({ ...form, resultadoAlcancado: e.target.value })} />
            </Field>
            <Field label="Horas estimadas economizadas">
              <Input type="number" className="h-8" value={form.horasEconomizadas} onChange={(e) => setForm({ ...form, horasEconomizadas: Number(e.target.value) })} />
            </Field>
            <Field label="Evidências / links">
              <Input className="h-8" value={form.evidencias} onChange={(e) => setForm({ ...form, evidencias: e.target.value })} />
            </Field>
            <Field label="Observações" full>
              <Textarea className="min-h-[50px]" value={form.observacoes} onChange={(e) => setForm({ ...form, observacoes: e.target.value })} />
            </Field>
            <Field label="Precisa de apoio PMC?">
              <GSelect
                className="w-full" value={form.precisaApoio ? "Sim" : "Não"}
                onChange={(v) => setForm({ ...form, precisaApoio: v === "Sim" })}
                options={[{ value: "Não", label: "Não" }, { value: "Sim", label: "Sim" }]}
              />
            </Field>
            {form.precisaApoio && (
              <>
                <Field label="Tipo de apoio">
                  <GSelect
                    className="w-full" value={form.tipoApoio}
                    onChange={(v) => setForm({ ...form, tipoApoio: v })}
                    options={[{ value: "", label: "—" }, ...TIPOS_APOIO.map((t) => ({ value: t, label: t }))]}
                  />
                </Field>
                <Field label="Consultor sugerido" full>
                  <GSelect
                    className="w-full" value={form.consultor}
                    onChange={(v) => setForm({ ...form, consultor: v })}
                    options={[{ value: "", label: "—" }, ...CONSULTORES.map((c) => ({ value: c, label: c }))]}
                  />
                </Field>
              </>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
            <Button onClick={save}>Salvar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Drawer detalhe com tarefas padrão */}
      <Sheet open={!!det} onOpenChange={(o) => { if (!o) setDetail(null) }}>
        <SheetContent side="right" className="w-full sm:max-w-2xl overflow-y-auto">
          {det && (
            <>
              <SheetHeader>
                <SheetTitle>{det.nome}</SheetTitle>
                <p className="text-sm text-muted-foreground">{setorNome(det.setorId)} · {det.status}</p>
              </SheetHeader>

              <div className="px-4 pb-6 space-y-4">
                <Button asChild size="sm" className="w-fit">
                  <Link to={`/guardiao/projetos/${det.id}`}>
                    <ExternalLink className="h-3 w-3" /> Página completa
                  </Link>
                </Button>

                <div className="grid grid-cols-2 gap-3">
                  <Info label="Tipo" value={det.tipoProjeto ?? "Projeto"} />
                  <Info label="Tipo de entrega" value={det.tipoEntrega} />
                  <Info label="Prazo" value={det.prazo || "—"} />
                  <Info label="Meta" value={det.meta || "—"} />
                  <Info label="Horas economizadas" value={String(det.horasEconomizadas)} />
                </div>

                {det.precisaApoio && (
                  <div className="p-3 bg-primary/10 border border-primary/30 rounded-lg text-sm">
                    <strong className="text-primary">Precisa de apoio PMC:</strong> {det.tipoApoio || "—"} · Consultor: {det.consultor || "—"}
                  </div>
                )}

                <div>
                  <h4 className="text-sm font-semibold mb-2">Problema</h4>
                  <p className="text-sm text-muted-foreground">{det.problema || "—"}</p>
                </div>
                <div>
                  <h4 className="text-sm font-semibold mb-2">Solução</h4>
                  <p className="text-sm text-muted-foreground">{det.solucao || "—"}</p>
                </div>

                <div>
                  <h4 className="text-sm font-semibold mb-2">Tarefas padrão do projeto</h4>
                  <div className="space-y-1">
                    {det.tarefasPadrao.map((t, i) => (
                      <label key={i} className="flex items-start gap-2 p-2 bg-muted rounded-md text-sm">
                        <Checkbox
                          checked={t.done}
                          className="mt-0.5"
                          onCheckedChange={(v) => {
                            const tarefas = det.tarefasPadrao.map((x, j) => (j === i ? { ...x, done: v === true } : x))
                            actions.updateProjeto(det.id, { tarefasPadrao: tarefas })
                          }}
                        />
                        <span className={t.done ? "line-through text-muted-foreground" : ""}>{t.label}</span>
                      </label>
                    ))}
                  </div>
                </div>
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>
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

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div className="p-3 bg-muted rounded-md">
      <div className="text-[11px] text-muted-foreground">{label}</div>
      <div className="text-sm">{value}</div>
    </div>
  )
}
