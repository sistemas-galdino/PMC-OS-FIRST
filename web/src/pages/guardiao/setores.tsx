import { useState, type ReactNode } from "react"
import { Link, useNavigate } from "react-router-dom"

import { PageHeader, Badge, EmptyState } from "@/components/guardiao/ui-kit"
import {
  actions, useStore, SETORES_DISPONIVEIS, STATUS_SETOR, FASES,
  type Setor, type Prioridade, type PessoaTime, type NivelEnvolvimento, type Fase, type Vitoria,
} from "@/lib/guardiao"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Checkbox } from "@/components/ui/checkbox"
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from "@/components/ui/dialog"
import {
  Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription,
} from "@/components/ui/sheet"
import {
  Select, SelectTrigger, SelectValue, SelectContent, SelectItem,
} from "@/components/ui/select"
import { Trash2, Pencil, ExternalLink, Plus, X, Stethoscope } from "lucide-react"

type Opt = { value: string; label: string }

// Radix Select proíbe SelectItem com value "". Sentinel interno p/ a opção "todos".
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

const freqOpts = ["Diário", "Semanal", "Quinzenal", "Mensal"]
const NIVEIS: NivelEnvolvimento[] = ["Baixo", "Médio", "Alto"]

const empty = (): Omit<Setor, "id"> => ({
  nome: "Marketing", lider: "", guardiao: "", prioridade: "Média",
  status: "Não iniciado", frequencia: "Semanal", objetivo: "", observacoes: "",
  quantidadePessoas: 0, time: [], faseAtual: 1,
})
const novaPessoa = (): PessoaTime => ({
  id: Math.random().toString(36).slice(2, 9),
  nome: "", cargo: "", funcao: "", contato: "", participaIA: true, envolvimento: "Médio",
})

export default function Setores() {
  const navigate = useNavigate()
  const setores = useStore((s) => s.setores)
  const gargalos = useStore((s) => s.gargalos)
  const projetos = useStore((s) => s.projetos)
  const tarefas = useStore((s) => s.tarefas)
  const rituais = useStore((s) => s.rituais)
  const relatorios = useStore((s) => s.relatorios)
  const jornada = useStore((s) => s.jornada)
  const evidencias = useStore((s) => s.evidencias)
  const vitorias = useStore((s) => s.vitorias)

  const [open, setOpen] = useState(false)
  const [editing, setEditing] = useState<Setor | null>(null)
  const [form, setForm] = useState<Omit<Setor, "id">>(empty())
  const [selected, setSelected] = useState<string | null>(null)
  const [filter, setFilter] = useState({ prioridade: "", status: "", q: "" })

  const filtered = setores.filter((s) =>
    (!filter.prioridade || s.prioridade === filter.prioridade) &&
    (!filter.status || s.status === filter.status) &&
    (!filter.q || s.nome.toLowerCase().includes(filter.q.toLowerCase()) || s.lider.toLowerCase().includes(filter.q.toLowerCase()))
  )

  const startNew = () => { setEditing(null); setForm(empty()); setOpen(true) }
  const startEdit = (s: Setor) => {
    setEditing(s)
    const { id: _id, ...rest } = s; void _id
    setForm(rest); setOpen(true)
  }
  const save = (goDiagnostico = false) => {
    if (editing) {
      actions.updateSetor(editing.id, form)
      setOpen(false)
      if (goDiagnostico) navigate(`/guardiao/setores/${editing.id}?tab=diag`)
    } else {
      const novo = actions.addSetor(form)
      setOpen(false)
      if (goDiagnostico) navigate(`/guardiao/setores/${novo.id}?tab=diag`)
    }
  }

  const sel = setores.find((s) => s.id === selected)

  return (
    <div className="space-y-6">
      <PageHeader
        title="Setores"
        subtitle="Cadastre e acompanhe a evolução de IA em cada área."
        action={<Button onClick={startNew}>+ Novo setor</Button>}
      />

      <div className="flex flex-wrap items-center gap-2">
        <Input
          placeholder="Buscar..."
          className="h-8 w-44"
          value={filter.q}
          onChange={(e) => setFilter({ ...filter, q: e.target.value })}
        />
        <GSelect
          value={filter.prioridade} onChange={(v) => setFilter({ ...filter, prioridade: v })}
          options={[{ value: "", label: "Toda prioridade" }, ...["Alta", "Média", "Baixa"].map((p) => ({ value: p, label: p }))]}
        />
        <GSelect
          value={filter.status} onChange={(v) => setFilter({ ...filter, status: v })}
          options={[{ value: "", label: "Todo status" }, ...STATUS_SETOR.map((s) => ({ value: s, label: s }))]}
        />
      </div>

      <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-4">
        {filtered.map((s) => (
          <div key={s.id} className="rounded-lg border card-glass p-5 hover:bg-muted transition-colors">
            <div className="flex items-start justify-between gap-3">
              <button onClick={() => setSelected(s.id)} className="text-left flex-1 min-w-0">
                <div className="text-lg font-semibold truncate">{s.nome}</div>
                <div className="text-xs text-muted-foreground">Líder: {s.lider || "—"} · Guardião: {s.guardiao || "—"}</div>
              </button>
              <div className="flex gap-1">
                <Button variant="ghost" size="icon-sm" onClick={() => startEdit(s)}><Pencil className="h-4 w-4" /></Button>
                <Button
                  variant="ghost" size="icon-sm"
                  className="hover:bg-destructive/20 hover:text-destructive"
                  onClick={() => actions.removeSetor(s.id)}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </div>
            <div className="mt-3 flex flex-wrap gap-1.5">
              <Badge tone={s.prioridade === "Alta" ? "neon" : "default"}>{s.prioridade}</Badge>
              <Badge>{s.status}</Badge>
              <Badge>{s.frequencia}</Badge>
            </div>
            {s.objetivo && <p className="mt-3 text-sm text-muted-foreground line-clamp-2">{s.objetivo}</p>}
            <div className="mt-4 flex gap-2">
              <Button asChild size="sm" className="flex-1">
                <Link to={`/guardiao/setores/${s.id}?tab=diag`}>
                  <Stethoscope className="h-3 w-3" /> Ver diagnóstico
                </Link>
              </Button>
              <Button asChild variant="outline" size="sm">
                <Link to={`/guardiao/setores/${s.id}`}>
                  <ExternalLink className="h-3 w-3" /> Abrir setor
                </Link>
              </Button>
            </div>
          </div>
        ))}
      </div>

      {filtered.length === 0 && <EmptyState title="Nenhum setor cadastrado" hint="Clique em + Novo setor para começar." />}

      {/* Modal cadastro/edição */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-3xl max-h-[92vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editing ? "Editar setor" : "Novo setor"}</DialogTitle>
            <DialogDescription>
              Cadastre o setor para iniciar o diagnóstico de IA. O diagnóstico, sugestões e validações acontecem na página do setor.
            </DialogDescription>
          </DialogHeader>

          <div className="text-[11px] uppercase tracking-wider text-primary mt-1 mb-2">Identificação</div>
          <div className="grid md:grid-cols-2 gap-3">
            <Field label="Nome do setor">
              <GSelect
                className="w-full h-8" value={form.nome}
                onChange={(v) => setForm({ ...form, nome: v })}
                options={SETORES_DISPONIVEIS.map((s) => ({ value: s, label: s }))}
              />
            </Field>
            <Field label="Fase atual da jornada">
              <GSelect
                className="w-full h-8" value={String(form.faseAtual ?? 1)}
                onChange={(v) => setForm({ ...form, faseAtual: Number(v) as Fase })}
                options={FASES.map((f) => ({ value: String(f.num), label: `Fase 0${f.num} — ${f.titulo}` }))}
              />
            </Field>
            <Field label="Líder responsável">
              <Input className="h-8" value={form.lider} onChange={(e) => setForm({ ...form, lider: e.target.value })} />
            </Field>
            <Field label="Guardião responsável">
              <Input className="h-8" value={form.guardiao} onChange={(e) => setForm({ ...form, guardiao: e.target.value })} />
            </Field>
            <Field label="Prioridade">
              <GSelect
                className="w-full h-8" value={form.prioridade}
                onChange={(v) => setForm({ ...form, prioridade: v as Prioridade })}
                options={["Alta", "Média", "Baixa"].map((p) => ({ value: p, label: p }))}
              />
            </Field>
            <Field label="Status">
              <GSelect
                className="w-full h-8" value={form.status}
                onChange={(v) => setForm({ ...form, status: v })}
                options={STATUS_SETOR.map((s) => ({ value: s, label: s }))}
              />
            </Field>
            <Field label="Frequência de acompanhamento">
              <GSelect
                className="w-full h-8" value={form.frequencia}
                onChange={(v) => setForm({ ...form, frequencia: v })}
                options={freqOpts.map((f) => ({ value: f, label: f }))}
              />
            </Field>
            <Field label="Quantidade de pessoas no setor">
              <Input type="number" min={0} className="h-8" value={form.quantidadePessoas ?? 0}
                onChange={(e) => setForm({ ...form, quantidadePessoas: Number(e.target.value) })} />
            </Field>
            <Field label="Principal objetivo com IA" full>
              <Textarea className="min-h-[70px]" value={form.objetivo} onChange={(e) => setForm({ ...form, objetivo: e.target.value })} />
            </Field>
            <Field label="Observações" full>
              <Textarea className="min-h-[50px]" value={form.observacoes} onChange={(e) => setForm({ ...form, observacoes: e.target.value })} />
            </Field>
          </div>

          <div className="text-[11px] uppercase tracking-wider text-primary mt-5 mb-2 flex items-center justify-between">
            <span>Time do setor</span>
            <Button type="button" size="xs" onClick={() => setForm({ ...form, time: [...(form.time ?? []), novaPessoa()] })}>
              <Plus className="h-3 w-3" /> Adicionar pessoa
            </Button>
          </div>
          <div className="space-y-2">
            {(form.time ?? []).length === 0 && (
              <div className="text-xs text-muted-foreground p-3 rounded-md bg-muted">Nenhuma pessoa adicionada ainda.</div>
            )}
            {(form.time ?? []).map((p, i) => (
              <div key={p.id} className="p-3 rounded-md bg-muted border border-border/60">
                <div className="grid md:grid-cols-2 gap-2">
                  <Input className="h-8" placeholder="Nome" value={p.nome} onChange={(e) => atualizarPessoa(form, setForm, i, { nome: e.target.value })} />
                  <Input className="h-8" placeholder="Cargo" value={p.cargo} onChange={(e) => atualizarPessoa(form, setForm, i, { cargo: e.target.value })} />
                  <Input className="h-8 md:col-span-2" placeholder="Função principal" value={p.funcao} onChange={(e) => atualizarPessoa(form, setForm, i, { funcao: e.target.value })} />
                  <Input className="h-8" placeholder="E-mail ou contato" value={p.contato} onChange={(e) => atualizarPessoa(form, setForm, i, { contato: e.target.value })} />
                  <div className="flex gap-2 items-center">
                    <GSelect
                      className="w-full h-8" value={p.envolvimento}
                      onChange={(v) => atualizarPessoa(form, setForm, i, { envolvimento: v as NivelEnvolvimento })}
                      options={NIVEIS.map((n) => ({ value: n, label: `Envolvimento ${n}` }))}
                    />
                    <label className="flex items-center gap-2 text-xs whitespace-nowrap px-2 h-8 rounded-md bg-background border border-border">
                      <Checkbox
                        checked={p.participaIA}
                        onCheckedChange={(c) => atualizarPessoa(form, setForm, i, { participaIA: c === true })}
                      />
                      Participa da IA
                    </label>
                  </div>
                </div>
                <div className="flex justify-end mt-1">
                  <Button
                    type="button" variant="ghost" size="xs"
                    className="text-destructive hover:bg-destructive/20 hover:text-destructive"
                    onClick={() => setForm({ ...form, time: (form.time ?? []).filter((_, j) => j !== i) })}
                  >
                    <X className="h-3 w-3" /> Remover
                  </Button>
                </div>
              </div>
            ))}
          </div>

          <div className="mt-5 p-3 rounded-md bg-primary/5 border border-primary/20 text-[11px] text-muted-foreground">
            Validação com o líder e com o CEO acontece <strong className="text-foreground">depois do diagnóstico</strong>, dentro da página do setor → aba <em>Plano de Execução</em>.
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
            <Button variant="outline" className="border-primary/40 text-primary hover:text-primary" onClick={() => save(false)}>Salvar setor</Button>
            <Button onClick={() => save(true)}>
              <Stethoscope className="h-4 w-4" /> Salvar e iniciar diagnóstico
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Drawer detalhe */}
      <Sheet open={!!sel} onOpenChange={(o) => { if (!o) setSelected(null) }}>
        {sel && (
          <SheetContent side="right" className="w-full sm:max-w-2xl! overflow-y-auto">
            <SheetHeader>
              <SheetTitle className="text-xl">{sel.nome}</SheetTitle>
              {sel.objetivo && <SheetDescription>{sel.objetivo}</SheetDescription>}
              <div className="pt-2">
                <Button asChild size="sm">
                  <Link to={`/guardiao/setores/${sel.id}`}>
                    <ExternalLink className="h-3 w-3" /> Página completa
                  </Link>
                </Button>
              </div>
            </SheetHeader>

            <div className="px-4 pb-8 space-y-5">
              <Section title="Evolução nas 7 fases">
                <div className="grid grid-cols-7 gap-1">
                  {FASES.map((f) => {
                    const envolvido = jornada.fases[f.num].setoresEnvolvidos.includes(sel.id)
                    const tFase = tarefas.filter((t) => t.fase === f.num && t.setorId === sel.id)
                    const eFase = evidencias.filter((e) => e.fase === f.num && e.setorId === sel.id)
                    return (
                      <Link
                        key={f.num}
                        to={`/guardiao/fases/${f.num}`}
                        className={
                          "p-2 rounded-md text-center text-[10px] block " +
                          (envolvido
                            ? "bg-primary/15 border border-primary/40 text-foreground"
                            : "bg-muted text-muted-foreground")
                        }
                        title={`Fase 0${f.num} — ${f.titulo}`}
                      >
                        <div className="font-semibold">F0{f.num}</div>
                        <div>{tFase.length}t · {eFase.length}e</div>
                      </Link>
                    )
                  })}
                </div>
                <div className="text-[11px] text-muted-foreground mt-2">
                  Fase atual da jornada: <span className="text-primary">Fase 0{jornada.faseAtual}</span>
                </div>
              </Section>

              <VitoriasDoSetor vitorias={vitorias.filter((v) => v.setorId === sel.id)} />

              <Section title="Gargalos vinculados">
                {gargalos.filter((g) => g.setorId === sel.id).map((g) => (
                  <Row key={g.id} title={g.processo} sub={g.status} />
                ))}
              </Section>
              <Section title="Projetos pilotos vinculados">
                {projetos.filter((p) => p.setorId === sel.id).map((p) => (
                  <Row key={p.id} title={p.nome} sub={p.status} />
                ))}
              </Section>
              <Section title="Tarefas vinculadas">
                {tarefas.filter((t) => t.setorId === sel.id).map((t) => (
                  <Row key={t.id} title={t.titulo} sub={`${t.tipo} · ${t.status}`} />
                ))}
              </Section>
              <Section title="Reuniões / Rituais agendados">
                {rituais.filter((r) => r.setorId === sel.id).map((r) => (
                  <Row key={r.id} title={`${r.tipo} · ${r.data}`} sub={r.lider} />
                ))}
              </Section>
              <Section title="Relatórios">
                {relatorios.map((r) => <Row key={r.id} title={r.periodo} sub={r.conteudo.slice(0, 100) + "..."} />)}
              </Section>
            </div>
          </SheetContent>
        )}
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

function atualizarPessoa(
  form: Omit<Setor, "id">,
  setForm: (s: Omit<Setor, "id">) => void,
  index: number,
  patch: Partial<PessoaTime>,
) {
  const lista = [...(form.time ?? [])]
  lista[index] = { ...lista[index], ...patch }
  setForm({ ...form, time: lista })
}

function VitoriasDoSetor({ vitorias }: { vitorias: Vitoria[] }) {
  const horasSemana = vitorias.reduce((a, v) => a + (v.horasSemana || 0), 0)
  const horasMes = vitorias.reduce((a, v) => a + (v.horasMes || 0), 0)
  const ef = vitorias.filter((v) => v.percentualEficiencia > 0)
  const eficiencia = ef.length ? Math.round(ef.reduce((a, v) => a + v.percentualEficiencia, 0) / ef.length) : 0
  const sistemas = vitorias.filter((v) => v.tipos.includes("Criação de sistema") || v.tipoSolucao === "Sistema").length
  const ultima = [...vitorias].sort((a, b) => (a.data < b.data ? 1 : -1))[0]
  return (
    <div>
      <div className="flex items-center justify-between mb-2 gap-2 flex-wrap">
        <div className="text-xs uppercase tracking-wider text-muted-foreground">Vitórias do setor</div>
        <Button asChild size="xs">
          <Link to="/guardiao/vitorias">Registrar vitória para este setor</Link>
        </Button>
      </div>
      <div className="grid grid-cols-2 md:grid-cols-5 gap-2">
        <Mini k="Total" v={vitorias.length} />
        <Mini k="Horas/semana" v={`${horasSemana}h`} />
        <Mini k="Horas/mês" v={`${horasMes}h`} />
        <Mini k="Eficiência" v={`${eficiencia}%`} />
        <Mini k="Sistemas" v={sistemas} />
      </div>
      {ultima && (
        <div className="text-xs text-muted-foreground mt-2">
          Última vitória: <span className="text-foreground">{ultima.titulo}</span> ({new Date(ultima.data).toLocaleDateString("pt-BR")})
        </div>
      )}
    </div>
  )
}

function Mini({ k, v }: { k: string; v: ReactNode }) {
  return (
    <div className="rounded-md bg-muted p-2 text-center">
      <div className="text-[10px] uppercase tracking-wider text-muted-foreground">{k}</div>
      <div className="text-sm font-semibold text-primary">{v}</div>
    </div>
  )
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div>
      <div className="text-xs uppercase tracking-wider text-muted-foreground mb-2">{title}</div>
      <div className="space-y-1.5">{children || <div className="text-sm text-muted-foreground">—</div>}</div>
    </div>
  )
}

function Row({ title, sub }: { title: string; sub?: string }) {
  return (
    <div className="p-3 bg-muted rounded-lg">
      <div className="text-sm font-medium">{title}</div>
      {sub && <div className="text-xs text-muted-foreground">{sub}</div>}
    </div>
  )
}
