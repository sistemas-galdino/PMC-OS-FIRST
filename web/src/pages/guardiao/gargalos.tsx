import { useState, type ReactNode } from "react"
import { toast } from "sonner"

import { PageHeader, Badge, EmptyState, FaseBadge } from "@/components/guardiao/ui-kit"
import {
  actions, useStore, STATUS_GARGALO, FASES, gerarAnalise, diagnosticarGargalo,
  type Gargalo, type Prioridade,
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
import { Trash2, Pencil, Rocket, Sparkles, Loader2 } from "lucide-react"

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

const IMPACTOS = ["Tempo", "Custo", "Receita", "Qualidade", "Atendimento", "Decisão do dono", "Gestão do time"]
const FREQ = ["Todos os dias", "Toda semana", "A cada 15 dias", "Todo mês", "Quando solicitado", "Outro"]

function empty(setorId = ""): Omit<Gargalo, "id" | "analiseIA"> {
  return {
    setorId, processo: "", descricao: "", ondeTrava: "", quemExecuta: "",
    tempo: "", pessoas: "", ferramentas: "",
    planilha: false, retrabalho: false, dependencia: false, riscoErro: false,
    impactos: [], frequencia: "Toda semana", prioridade: "Média", status: "Mapeado",
  }
}

export default function Gargalos() {
  const setores = useStore((s) => s.setores)
  const gargalos = useStore((s) => s.gargalos)
  const faseAtual = useStore((s) => s.jornada.faseAtual)
  const [open, setOpen] = useState(false)
  const [editing, setEditing] = useState<Gargalo | null>(null)
  const [form, setForm] = useState<Omit<Gargalo, "id" | "analiseIA">>(empty(setores[0]?.id ?? ""))
  const [analise, setAnalise] = useState("")
  const [filter, setFilter] = useState({ setorId: "", prioridade: "", status: "", q: "", fase: "" })
  const [loadingIA, setLoadingIA] = useState(false)

  const filtered = gargalos.filter((g) => {
    const setor = setores.find((s) => s.id === g.setorId)
    const faseDoGargalo = setor?.faseAtual ?? 3
    return (
      (!filter.setorId || g.setorId === filter.setorId) &&
      (!filter.prioridade || g.prioridade === filter.prioridade) &&
      (!filter.status || g.status === filter.status) &&
      (!filter.fase || String(faseDoGargalo) === filter.fase) &&
      (!filter.q || g.processo.toLowerCase().includes(filter.q.toLowerCase()))
    )
  })

  const startNew = () => {
    setEditing(null)
    setForm(empty(setores[0]?.id ?? ""))
    setAnalise("")
    setOpen(true)
  }
  const startEdit = (g: Gargalo) => {
    setEditing(g)
    const { id: _id, analiseIA, ...rest } = g
    void _id
    setForm(rest)
    setAnalise(analiseIA)
    setOpen(true)
  }
  const recomputar = () => setAnalise(gerarAnalise(form))

  const diagnosticarIA = async () => {
    if (!form.processo.trim()) {
      toast.error("Preencha pelo menos o nome do processo antes.")
      return
    }
    const setorNome = setores.find((s) => s.id === form.setorId)?.nome ?? ""
    setLoadingIA(true)
    try {
      const out = await diagnosticarGargalo({
        processo: form.processo,
        descricao: form.descricao,
        ondeTrava: form.ondeTrava,
        quemExecuta: form.quemExecuta,
        tempo: form.tempo,
        ferramentas: form.ferramentas,
        impactos: form.impactos,
        frequencia: form.frequencia,
        setorNome,
        faseAtual,
      })
      const tarefas = out.tarefasSugeridas.map((t, i) => `${i + 1}. ${t}`).join("\n")
      const analiseFormatada = `${out.analiseIA}\n\nCausa raiz: ${out.causaRaiz}\nTipo de solução sugerido: ${out.tipoSolucao}\n\nPróximos passos sugeridos:\n${tarefas}`
      setAnalise(analiseFormatada)
      setForm((f) => ({ ...f, prioridade: out.prioridade as Prioridade }))
      toast.success("Diagnóstico da IA pronto.")
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err)
      if (msg.includes("RATE_LIMIT")) toast.error("IA ocupada. Tente em alguns segundos.")
      else if (msg.includes("CREDITS_EXHAUSTED")) toast.error("Créditos de IA esgotados. Adicione créditos em Settings → Plans & credits.")
      else toast.error("Erro ao gerar diagnóstico: " + msg)
    } finally {
      setLoadingIA(false)
    }
  }

  const save = () => {
    const analiseFinal = analise || gerarAnalise(form)
    if (editing) actions.updateGargalo(editing.id, { ...form, analiseIA: analiseFinal })
    else actions.addGargalo({ ...form, analiseIA: analiseFinal })
    setOpen(false)
  }
  const virarProjeto = (g: Gargalo) => {
    const setor = setores.find((s) => s.id === g.setorId)
    actions.addProjeto({
      nome: `Projeto: ${g.processo.slice(0, 60)}`, tipoProjeto: "Piloto",
      setorId: g.setorId, lider: setor?.lider ?? "", guardiao: setor?.guardiao ?? "",
      gargaloId: g.id, problema: g.descricao, solucao: g.analiseIA.split("\n")[0] ?? "",
      tipoEntrega: "Sistema", meta: "", prazo: "",
      status: "Diagnóstico", resultadoEsperado: "", resultadoAlcancado: "",
      horasEconomizadas: 0, evidencias: "", observacoes: "",
      precisaApoio: false, tipoApoio: "", consultor: "",
    })
    actions.updateGargalo(g.id, { status: "Virou projeto piloto" })
  }

  const toggleImpacto = (imp: string) => {
    setForm({ ...form, impactos: form.impactos.includes(imp) ? form.impactos.filter((i) => i !== imp) : [...form.impactos, imp] })
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Gargalos"
        subtitle="Mapeie os pontos de trava. A IA sugere o caminho."
        action={<Button onClick={startNew}>+ Novo gargalo</Button>}
      />

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
          options={[{ value: "", label: "Todo status" }, ...STATUS_GARGALO.map((s) => ({ value: s, label: s }))]}
        />
        <GSelect
          value={filter.fase} onChange={(v) => setFilter({ ...filter, fase: v })}
          options={[{ value: "", label: "Toda fase" }, ...FASES.map((f) => ({ value: String(f.num), label: `Fase 0${f.num}` }))]}
        />
      </div>

      <div className="space-y-3">
        {filtered.map((g) => {
          const setor = setores.find((s) => s.id === g.setorId)
          const fase = setor?.faseAtual ?? 3
          return (
            <div key={g.id} className="rounded-lg border bg-card p-5">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap gap-1.5 mb-1">
                    <Badge tone="neon">{setor?.nome ?? "—"}</Badge>
                    <FaseBadge fase={fase} />
                    <Badge>{g.status}</Badge>
                    <Badge tone={g.prioridade === "Alta" ? "warn" : "default"}>Prioridade {g.prioridade}</Badge>
                    <Badge>{g.frequencia}</Badge>
                  </div>
                  <div className="text-lg font-semibold">{g.processo}</div>
                  <div className="text-sm text-muted-foreground mt-1">{g.descricao}</div>
                </div>
                <div className="flex items-center gap-1.5">
                  <Button size="sm" onClick={() => virarProjeto(g)}>
                    <Rocket className="h-3.5 w-3.5" /> Transformar em Projeto Piloto
                  </Button>
                  <Button variant="ghost" size="icon-sm" onClick={() => startEdit(g)}>
                    <Pencil className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost" size="icon-sm"
                    className="hover:bg-destructive/20 hover:text-destructive"
                    onClick={() => actions.removeGargalo(g.id)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
              <details className="mt-3">
                <summary className="text-xs text-primary cursor-pointer">Ver análise da IA</summary>
                <pre className="mt-2 text-xs whitespace-pre-wrap bg-muted p-3 rounded-md text-muted-foreground">{g.analiseIA}</pre>
              </details>
            </div>
          )
        })}
      </div>

      {filtered.length === 0 && <EmptyState title="Nenhum gargalo mapeado" hint="Comece adicionando o primeiro." />}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-3xl max-h-[92vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editing ? "Editar gargalo" : "Novo gargalo"}</DialogTitle>
          </DialogHeader>
          <div className="grid md:grid-cols-2 gap-3">
            <Field label="Setor">
              <GSelect
                className="w-full" value={form.setorId}
                onChange={(v) => setForm({ ...form, setorId: v })}
                options={[{ value: "", label: "Selecione..." }, ...setores.map((s) => ({ value: s.id, label: s.nome }))]}
              />
            </Field>
            <Field label="Nome do processo analisado">
              <Input className="h-8" value={form.processo} onChange={(e) => setForm({ ...form, processo: e.target.value })} />
            </Field>
            <Field label="Descrição do processo atual" full>
              <Textarea className="min-h-[70px]" value={form.descricao} onChange={(e) => setForm({ ...form, descricao: e.target.value })} />
            </Field>
            <Field label="Onde trava?">
              <Input className="h-8" value={form.ondeTrava} onChange={(e) => setForm({ ...form, ondeTrava: e.target.value })} />
            </Field>
            <Field label="Quem executa hoje?">
              <Input className="h-8" value={form.quemExecuta} onChange={(e) => setForm({ ...form, quemExecuta: e.target.value })} />
            </Field>
            <Field label="Quanto tempo leva?">
              <Input className="h-8" value={form.tempo} onChange={(e) => setForm({ ...form, tempo: e.target.value })} />
            </Field>
            <Field label="Quantas pessoas participam?">
              <Input className="h-8" value={form.pessoas} onChange={(e) => setForm({ ...form, pessoas: e.target.value })} />
            </Field>
            <Field label="Ferramentas usadas hoje" full>
              <Input className="h-8" value={form.ferramentas} onChange={(e) => setForm({ ...form, ferramentas: e.target.value })} />
            </Field>

            <div className="md:col-span-2 grid grid-cols-2 md:grid-cols-4 gap-2">
              {([
                ["planilha", "Tem planilha"],
                ["retrabalho", "Tem retrabalho"],
                ["dependencia", "Dependência de pessoa"],
                ["riscoErro", "Risco de erro manual"],
              ] as const).map(([key, label]) => (
                <label key={key} className="flex items-center gap-2 p-2 bg-muted rounded-md text-sm">
                  <input
                    type="checkbox"
                    checked={(form as Record<string, unknown>)[key] as boolean}
                    onChange={(e) => setForm({ ...form, [key]: e.target.checked } as typeof form)}
                  />
                  {label}
                </label>
              ))}
            </div>

            <Field label="Impactos" full>
              <div className="flex flex-wrap gap-1.5">
                {IMPACTOS.map((imp) => (
                  <button
                    key={imp} type="button" onClick={() => toggleImpacto(imp)}
                    className={"px-2.5 py-1 rounded-md text-xs border " +
                      (form.impactos.includes(imp)
                        ? "bg-primary text-primary-foreground border-primary"
                        : "border-border text-muted-foreground")}
                  >
                    {imp}
                  </button>
                ))}
              </div>
            </Field>

            <Field label="Frequência">
              <GSelect
                className="w-full" value={form.frequencia}
                onChange={(v) => setForm({ ...form, frequencia: v })}
                options={FREQ.map((f) => ({ value: f, label: f }))}
              />
            </Field>
            <Field label="Prioridade">
              <GSelect
                className="w-full" value={form.prioridade}
                onChange={(v) => setForm({ ...form, prioridade: v as Prioridade })}
                options={["Alta", "Média", "Baixa"].map((p) => ({ value: p, label: p }))}
              />
            </Field>
            <Field label="Status" full>
              <GSelect
                className="w-full" value={form.status}
                onChange={(v) => setForm({ ...form, status: v })}
                options={STATUS_GARGALO.map((s) => ({ value: s, label: s }))}
              />
            </Field>

            <Field label="Raciocínio / Análise" full>
              <div className="flex items-center justify-between mb-1 gap-2 flex-wrap">
                <span className="text-xs text-muted-foreground">Você pode ajustar antes de salvar.</span>
                <div className="flex items-center gap-2">
                  <Button type="button" variant="outline" size="sm" onClick={recomputar}>Análise rápida</Button>
                  <Button type="button" size="sm" onClick={diagnosticarIA} disabled={loadingIA}>
                    {loadingIA ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Sparkles className="h-3.5 w-3.5" />}
                    {loadingIA ? "Diagnosticando..." : "Diagnosticar com IA"}
                  </Button>
                </div>
              </div>
              <Textarea
                className="min-h-[180px] font-mono text-xs"
                value={analise}
                onChange={(e) => setAnalise(e.target.value)}
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
