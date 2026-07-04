import { useMemo, useState, type ReactNode } from "react"
import { Link } from "react-router-dom"

import { PageHeader, Badge, EmptyState } from "@/components/guardiao/ui-kit"
import {
  actions, useStore, STATUS_TAREFA, RECORRENCIAS, SETORES_DISPONIVEIS, TIPOS_ROTINA, ORIGENS_TAREFA,
  type Tarefa, type Prioridade, type TipoRotina, type OrigemTarefa, type Recorrencia,
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
import {
  Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription, SheetFooter,
} from "@/components/ui/sheet"
import {
  CalendarDays, ClipboardList, Sparkles, Lightbulb, ChevronLeft, ChevronRight,
  Trash2, Pencil, CheckCircle2, Copy as CopyIcon, Plus,
} from "lucide-react"

type Opt = { value: string; label: string; disabled?: boolean }

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
          return <SelectItem key={v} value={v} disabled={o.disabled}>{o.label}</SelectItem>
        })}
      </SelectContent>
    </Select>
  )
}

// ---------- Rotina blocks ----------
type RotinaKey = "Diária" | "Semanal" | "Quinzenal" | "Mensal"
const ROTINAS: Array<{
  key: RotinaKey
  titulo: string
  descricao: string
  checklist: string[]
  extras: { titulo: string; itens: string[] }
  origem: OrigemTarefa
}> = [
  {
    key: "Diária",
    titulo: "Rotina Diária",
    descricao: "Manter a máquina rodando, identificar travas e acompanhar o uso da IA nos setores.",
    checklist: [
      "Checar automações do dia anterior",
      "Verificar dados atualizados",
      "Identificar travas do dia",
      "Falar com líderes prioritários",
      "Atualizar status dos projetos",
      "Registrar aprendizados",
      "Fazer o cheque rápido com as lideranças",
    ],
    extras: { titulo: "Perguntas obrigatórias", itens: ["O que a IA fez ontem?", "O que será aplicado hoje?", "Onde travou?"] },
    origem: "Rotina diária",
  },
  {
    key: "Semanal",
    titulo: "Rotina Semanal",
    descricao: "Transformar gargalos da semana em projetos, testes, prompts, fluxos ou sistemas.",
    checklist: [
      "Realizar reunião com líder do setor",
      "Mapear maior perda de tempo da semana",
      "Identificar processo repetitivo",
      "Transformar gargalo em projeto",
      "Atualizar tarefas",
      "Validar próximos passos",
      "Preparar resumo para o CEO",
    ],
    extras: {
      titulo: "Entrega semanal",
      itens: [
        "Gargalos identificados",
        "Projetos em andamento",
        "Sistemas sugeridos",
        "Resultados iniciais",
        "Travamentos que precisam de decisão",
      ],
    },
    origem: "Rotina semanal",
  },
  {
    key: "Quinzenal",
    titulo: "Rotina Quinzenal",
    descricao: "Disseminar boas práticas, apresentar resultados e reforçar a cultura de IA com os líderes.",
    checklist: [
      "Reunir líderes ou setores envolvidos",
      "Apresentar boas práticas de IA",
      "Mostrar sistemas ou automações criadas",
      "Compartilhar aprendizados",
      "Levantar resistências do time",
      "Escolher próximo setor piloto",
      "Atualizar plano de implementação",
    ],
    extras: {
      titulo: "Entrega quinzenal",
      itens: ["Workshop prático de resultados", "Exemplos reais aplicados", "Próximas oportunidades de IA por setor"],
    },
    origem: "Rotina quinzenal",
  },
  {
    key: "Mensal",
    titulo: "Rotina Mensal",
    descricao: "Medir resultados, diagnosticar evolução e recalibrar metas com o CEO ou diretoria.",
    checklist: [
      "Consolidar resultados do mês",
      "Medir horas economizadas",
      "Medir automações implantadas",
      "Medir sistemas criados",
      "Avaliar gargalos resolvidos",
      "Apresentar relatório mensal para CEO",
      "Recalibrar metas",
      "Definir próximos setores",
    ],
    extras: {
      titulo: "Entrega mensal",
      itens: ["Diagnóstico de evolução da IA", "Relatório para CEO", "Próximos projetos pilotos", "Plano de expansão por setor"],
    },
    origem: "Rotina mensal",
  },
]

const ORIGEM_PARA_TIPO_ROTINA: Record<string, TipoRotina> = {
  "Rotina diária": "Diária",
  "Rotina semanal": "Semanal",
  "Rotina quinzenal": "Quinzenal",
  "Rotina mensal": "Mensal",
  "Disseminação da cultura": "Não se aplica",
}

const PERGUNTAS_MANTRA = [
  "Essa planilha ainda precisa ser manual?",
  "Esses dados podem virar dashboard?",
  "Esse acompanhamento pode virar rotina?",
  "Essa rotina pode virar sistema?",
  "Esse sistema pode gerar indicador para o CEO?",
]

type View = "calendario" | "lista"

function empty(): Omit<Tarefa, "id"> {
  return {
    titulo: "", descricao: "", setorId: undefined, projetoId: undefined, gargaloId: undefined,
    lider: "", responsavel: "", prazo: "", horario: "",
    prioridade: "Média", status: "A fazer", tipo: "Acompanhamento",
    origem: "Criada manualmente", tipoRotina: "Não se aplica", recorrencia: "Sem recorrência",
    observacoes: "", resultadoEsperado: "", resultadoAlcancado: "", evidencia: "",
  }
}

export default function Agenda() {
  const setores = useStore((s) => s.setores)
  const projetos = useStore((s) => s.projetos)
  const gargalos = useStore((s) => s.gargalos)
  const tarefas = useStore((s) => s.tarefas)

  const [open, setOpen] = useState(false)
  const [editing, setEditing] = useState<Tarefa | null>(null)
  const [form, setForm] = useState<Omit<Tarefa, "id">>(empty())
  const [aposSalvar, setAposSalvar] = useState<"fechar" | "calendario" | "projeto">("fechar")
  const [view, setView] = useState<View>("calendario")
  const [filtros, setFiltros] = useState<FiltrosLista>({
    tipoRotina: "", setorId: "", responsavel: "", status: "", prioridade: "", projetoId: "", periodo: "",
  })
  const [detail, setDetail] = useState<string | null>(null)

  const startNew = (origem: OrigemTarefa = "Criada manualmente", extra: Partial<Tarefa> = {}) => {
    setEditing(null)
    setForm({ ...empty(), origem, tipoRotina: ORIGEM_PARA_TIPO_ROTINA[origem] ?? "Não se aplica", ...extra })
    setAposSalvar("fechar")
    setOpen(true)
  }
  const startEdit = (t: Tarefa) => {
    setEditing(t)
    const { id: _id, ...rest } = t; void _id
    setForm({ ...empty(), ...rest })
    setOpen(true)
  }
  const save = () => {
    if (editing) actions.updateTarefa(editing.id, form)
    else actions.addTarefa(form)
    setOpen(false)
    if (aposSalvar === "calendario") setView("calendario")
  }

  // ---------- Atividades de rotina ----------
  const atividadesRotina = useMemo(
    () => tarefas.filter((t) => t.origem && t.origem !== "Criada manualmente"),
    [tarefas],
  )

  const filtradas = useMemo(() => {
    return tarefas.filter((t) => {
      if (filtros.tipoRotina && t.tipoRotina !== filtros.tipoRotina) return false
      if (filtros.setorId && t.setorId !== filtros.setorId) return false
      if (filtros.responsavel && !((t.responsavel ?? "").toLowerCase().includes(filtros.responsavel.toLowerCase()))) return false
      if (filtros.status && t.status !== filtros.status) return false
      if (filtros.prioridade && t.prioridade !== filtros.prioridade) return false
      if (filtros.projetoId && t.projetoId !== filtros.projetoId) return false
      if (filtros.periodo) {
        const hoje = new Date()
        if (!t.prazo) return false
        const d = new Date(t.prazo)
        const diff = (d.getTime() - hoje.getTime()) / (1000 * 60 * 60 * 24)
        if (filtros.periodo === "semana" && (diff < -1 || diff > 7)) return false
        if (filtros.periodo === "mes" && (diff < -1 || diff > 31)) return false
        if (filtros.periodo === "atrasadas" && diff >= 0) return false
      }
      return true
    })
  }, [tarefas, filtros])

  return (
    <div className="space-y-6">
      <PageHeader
        title="Rotinas e Rituais"
        subtitle="Acompanhe a cadência diária, semanal, quinzenal e mensal do Guardião de IA."
      />

      {/* 4 Rotina cards */}
      <div className="grid md:grid-cols-2 xl:grid-cols-4 gap-4">
        {ROTINAS.map((r) => {
          const count = atividadesRotina.filter((t) => t.tipoRotina === r.key).length
          return (
            <div key={r.key} className="rounded-lg border bg-card p-5 flex flex-col">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <div className="text-[11px] uppercase tracking-wider text-primary">Cadência</div>
                  <h3 className="text-lg font-semibold mt-1">{r.titulo}</h3>
                </div>
                <Badge tone="neon">{count}</Badge>
              </div>
              <p className="text-xs text-muted-foreground mt-2">{r.descricao}</p>

              <div className="mt-3">
                <div className="text-[11px] uppercase tracking-wider text-muted-foreground mb-1.5">Checklist</div>
                <ul className="space-y-1">
                  {r.checklist.map((c) => (
                    <li key={c} className="text-xs text-foreground/90 flex gap-1.5">
                      <span className="text-primary">•</span>
                      <span>{c}</span>
                    </li>
                  ))}
                </ul>
              </div>

              <div className="mt-3">
                <div className="text-[11px] uppercase tracking-wider text-muted-foreground mb-1.5">{r.extras.titulo}</div>
                <ul className="space-y-1">
                  {r.extras.itens.map((c) => (
                    <li key={c} className="text-xs text-muted-foreground">· {c}</li>
                  ))}
                </ul>
              </div>

              <div className="mt-auto pt-4 flex flex-col gap-2">
                <Button size="sm" className="w-full" onClick={() => startNew(r.origem)}>
                  <Plus className="h-3.5 w-3.5" /> Criar atividade {r.key.toLowerCase()}
                </Button>
                <Button
                  variant="outline" size="sm" className="w-full"
                  onClick={() => { setFiltros({ ...filtros, tipoRotina: r.key }); setView("lista") }}
                >
                  Ver atividades
                </Button>
              </div>
            </div>
          )
        })}
      </div>

      {/* Toggle calendario / lista */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <Tabs value={view} onValueChange={(v) => setView(v as View)}>
          <TabsList className="w-full max-w-md">
            <TabsTrigger value="calendario"><CalendarDays className="h-3.5 w-3.5" /> Calendário</TabsTrigger>
            <TabsTrigger value="lista"><ClipboardList className="h-3.5 w-3.5" /> Lista</TabsTrigger>
          </TabsList>
        </Tabs>
        <Button onClick={() => startNew("Criada manualmente")}>+ Nova atividade</Button>
      </div>

      {view === "calendario" ? (
        <Calendario tarefas={tarefas} setores={setores} onPick={(id) => setDetail(id)} />
      ) : (
        <ListaTarefas
          tarefas={filtradas}
          setores={setores}
          projetos={projetos}
          filtros={filtros}
          setFiltros={setFiltros}
          onEdit={startEdit}
          onView={(id) => setDetail(id)}
        />
      )}

      {/* Disseminação da cultura */}
      <section className="rounded-lg border bg-card p-6">
        <div className="flex items-start justify-between gap-3 flex-wrap">
          <div>
            <div className="text-[11px] uppercase tracking-wider text-primary">Disseminação da Cultura de IA</div>
            <h3 className="text-xl font-semibold mt-1">IA não substitui a liderança. IA facilita a rotina dos líderes.</h3>
            <p className="text-sm text-muted-foreground mt-2 max-w-2xl">
              O papel do Guardião não é apenas criar sistemas, dashboards ou automações. O Guardião precisa ensinar os líderes a enxergarem
              a IA como uma facilitadora da rotina, da tomada de decisão e da execução.
            </p>
          </div>
          <Button onClick={() => startNew("Disseminação da cultura", { tipo: "Treinamento" })}>
            <Sparkles className="h-4 w-4" /> Criar atividade de disseminação
          </Button>
        </div>
        <ul className="mt-4 grid md:grid-cols-2 gap-2">
          {[
            "Traduzir a IA para a linguagem de cada setor",
            "Mostrar ganhos práticos para os líderes",
            "Reduzir medo e resistência",
            "Repetir boas práticas até virar cultura",
            "Transformar exemplos simples em rotina",
            "Ensinar o time a usar IA no contexto real do trabalho",
          ].map((p) => (
            <li key={p} className="text-sm text-foreground/90 flex gap-2 p-2 bg-muted rounded-md">
              <span className="text-primary">→</span> {p}
            </li>
          ))}
        </ul>
      </section>

      {/* Mantra */}
      <section className="rounded-lg border border-primary/30 bg-primary/5 p-6">
        <div className="flex items-start gap-3">
          <Lightbulb className="h-5 w-5 text-primary mt-0.5" />
          <div>
            <div className="text-[11px] uppercase tracking-wider text-primary">Mantra do Guardião</div>
            <h3 className="text-lg font-semibold mt-1">Não ter mais planilhas. Toda planilha deve se transformar em sistema.</h3>
            <ul className="mt-3 space-y-1">
              {PERGUNTAS_MANTRA.map((q) => (
                <li key={q} className="text-sm text-foreground/90">— {q}</li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      <AtividadeModal
        open={open}
        onOpenChange={setOpen}
        form={form}
        setForm={setForm}
        setores={setores}
        projetos={projetos}
        gargalos={gargalos}
        editing={!!editing}
        onSave={save}
        setAposSalvar={setAposSalvar}
      />

      {detail && (
        <DetailDrawer
          tarefa={tarefas.find((x) => x.id === detail)!}
          setores={setores}
          projetos={projetos}
          gargalos={gargalos}
          onClose={() => setDetail(null)}
          onEdit={(t) => { setDetail(null); startEdit(t) }}
        />
      )}
    </div>
  )
}

// ---------- Calendário ----------
function Calendario({
  tarefas, setores, onPick,
}: { tarefas: Tarefa[]; setores: { id: string; nome: string }[]; onPick: (id: string) => void }) {
  const [cursor, setCursor] = useState(() => {
    const d = new Date()
    return { y: d.getFullYear(), m: d.getMonth() }
  })

  const first = new Date(cursor.y, cursor.m, 1)
  const startOffset = first.getDay() // 0 = Sun
  const daysInMonth = new Date(cursor.y, cursor.m + 1, 0).getDate()
  const cells: Array<{ date: Date | null }> = []
  for (let i = 0; i < startOffset; i++) cells.push({ date: null })
  for (let d = 1; d <= daysInMonth; d++) cells.push({ date: new Date(cursor.y, cursor.m, d) })
  while (cells.length % 7 !== 0) cells.push({ date: null })

  const monthLabel = first.toLocaleDateString("pt-BR", { month: "long", year: "numeric" })

  const byDay = useMemo(() => {
    const m = new Map<string, Tarefa[]>()
    for (const t of tarefas) {
      if (!t.prazo) continue
      const key = t.prazo.slice(0, 10)
      const arr = m.get(key) ?? []
      arr.push(t)
      m.set(key, arr)
    }
    return m
  }, [tarefas])

  const todayISO = new Date().toISOString().slice(0, 10)

  return (
    <div className="rounded-lg border bg-card p-4">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-base font-semibold capitalize">{monthLabel}</h3>
        <div className="flex gap-1">
          <Button variant="ghost" size="icon-sm"
            onClick={() => setCursor((c) => ({ y: c.m === 0 ? c.y - 1 : c.y, m: c.m === 0 ? 11 : c.m - 1 }))}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="sm"
            onClick={() => setCursor({ y: new Date().getFullYear(), m: new Date().getMonth() })}>
            Hoje
          </Button>
          <Button variant="ghost" size="icon-sm"
            onClick={() => setCursor((c) => ({ y: c.m === 11 ? c.y + 1 : c.y, m: c.m === 11 ? 0 : c.m + 1 }))}>
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-7 gap-1 text-[10px] uppercase tracking-wider text-muted-foreground mb-1">
        {["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"].map((d) => (
          <div key={d} className="px-2 py-1">{d}</div>
        ))}
      </div>

      <div className="grid grid-cols-7 gap-1">
        {cells.map((c, idx) => {
          const iso = c.date ? `${c.date.getFullYear()}-${String(c.date.getMonth() + 1).padStart(2, "0")}-${String(c.date.getDate()).padStart(2, "0")}` : ""
          const items = c.date ? (byDay.get(iso) ?? []) : []
          const isToday = iso === todayISO
          return (
            <div key={idx} className={"min-h-[96px] p-1.5 rounded-md border " + (c.date ? (isToday ? "border-primary bg-primary/5" : "border-border bg-muted") : "border-transparent")}>
              {c.date && (
                <>
                  <div className={"text-[11px] mb-1 " + (isToday ? "text-primary font-semibold" : "text-muted-foreground")}>{c.date.getDate()}</div>
                  <div className="space-y-0.5">
                    {items.slice(0, 3).map((t) => (
                      <button
                        key={t.id}
                        onClick={() => onPick(t.id)}
                        className="w-full text-left px-1.5 py-0.5 rounded bg-primary/15 text-[10px] text-foreground truncate hover:bg-primary/30"
                        title={`${t.titulo} · ${setores.find((s) => s.id === t.setorId)?.nome ?? ""} · ${t.responsavel ?? ""}`}
                      >
                        {t.horario ? `${t.horario} · ` : ""}{t.titulo}
                      </button>
                    ))}
                    {items.length > 3 && <div className="text-[10px] text-muted-foreground px-1.5">+ {items.length - 3} mais</div>}
                  </div>
                </>
              )}
            </div>
          )
        })}
      </div>

      <div className="mt-3 text-[11px] text-muted-foreground">
        Clique em uma atividade para abrir os detalhes. Apenas atividades com prazo definido aparecem no calendário.
      </div>
    </div>
  )
}

// ---------- Lista de atividades ----------
type FiltrosLista = {
  tipoRotina: string; setorId: string; responsavel: string; status: string
  prioridade: string; projetoId: string; periodo: string
}
function ListaTarefas({
  tarefas, setores, projetos, filtros, setFiltros, onEdit, onView,
}: {
  tarefas: Tarefa[]
  setores: { id: string; nome: string }[]
  projetos: { id: string; nome: string }[]
  filtros: FiltrosLista
  setFiltros: (f: FiltrosLista) => void
  onEdit: (t: Tarefa) => void
  onView: (id: string) => void
}) {
  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-2">
        <GSelect
          value={filtros.tipoRotina} onChange={(v) => setFiltros({ ...filtros, tipoRotina: v })}
          options={[{ value: "", label: "Toda rotina" }, ...TIPOS_ROTINA.map((t) => ({ value: t, label: t }))]}
        />
        <GSelect
          value={filtros.setorId} onChange={(v) => setFiltros({ ...filtros, setorId: v })}
          options={[{ value: "", label: "Todo setor" }, ...setores.map((s) => ({ value: s.id, label: s.nome }))]}
        />
        <Input
          placeholder="Responsável" className="h-8 w-40"
          value={filtros.responsavel} onChange={(e) => setFiltros({ ...filtros, responsavel: e.target.value })}
        />
        <GSelect
          value={filtros.status} onChange={(v) => setFiltros({ ...filtros, status: v })}
          options={[{ value: "", label: "Todo status" }, ...STATUS_TAREFA.map((s) => ({ value: s, label: s }))]}
        />
        <GSelect
          value={filtros.prioridade} onChange={(v) => setFiltros({ ...filtros, prioridade: v })}
          options={[{ value: "", label: "Toda prioridade" }, ...["Alta", "Média", "Baixa"].map((p) => ({ value: p, label: p }))]}
        />
        <GSelect
          value={filtros.projetoId} onChange={(v) => setFiltros({ ...filtros, projetoId: v })}
          options={[{ value: "", label: "Todo projeto" }, ...projetos.map((p) => ({ value: p.id, label: p.nome }))]}
        />
        <GSelect
          value={filtros.periodo} onChange={(v) => setFiltros({ ...filtros, periodo: v })}
          options={[
            { value: "", label: "Todo período" },
            { value: "semana", label: "Próximos 7 dias" },
            { value: "mes", label: "Próximos 30 dias" },
            { value: "atrasadas", label: "Atrasadas" },
          ]}
        />
      </div>

      {tarefas.length === 0 ? (
        <EmptyState title="Nenhuma atividade encontrada" hint="Crie uma nova atividade ou ajuste os filtros." />
      ) : (
        <div className="rounded-lg border bg-card overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Atividade</TableHead>
                <TableHead>Rotina</TableHead>
                <TableHead>Setor</TableHead>
                <TableHead>Responsável</TableHead>
                <TableHead>Prazo</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Prioridade</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {[...tarefas].sort((a, b) => (a.prazo || "9999").localeCompare(b.prazo || "9999")).map((t) => (
                <TableRow key={t.id}>
                  <TableCell>
                    <button onClick={() => onView(t.id)} className="text-left">
                      <div className="font-medium">{t.titulo}</div>
                      <div className="text-[11px] text-muted-foreground">{t.origem ?? "Criada manualmente"}</div>
                    </button>
                  </TableCell>
                  <TableCell className="text-xs">{t.tipoRotina ?? "—"}</TableCell>
                  <TableCell className="text-xs text-muted-foreground">{setores.find((s) => s.id === t.setorId)?.nome ?? "—"}</TableCell>
                  <TableCell className="text-xs">{t.responsavel || "—"}</TableCell>
                  <TableCell className="text-xs text-muted-foreground">{t.prazo || "—"}{t.horario ? ` ${t.horario}` : ""}</TableCell>
                  <TableCell><Badge tone={t.status === "Concluído" ? "ok" : t.status === "Travado" ? "warn" : "neon"}>{t.status}</Badge></TableCell>
                  <TableCell><Badge tone={t.prioridade === "Alta" ? "warn" : "default"}>{t.prioridade}</Badge></TableCell>
                  <TableCell>
                    <div className="flex justify-end gap-1">
                      <Button variant="ghost" size="icon-sm" title="Concluir" onClick={() => actions.updateTarefa(t.id, { status: "Concluído" })}>
                        <CheckCircle2 className="h-4 w-4 text-emerald-400" />
                      </Button>
                      <Button variant="ghost" size="icon-sm" title="Editar" onClick={() => onEdit(t)}>
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="icon-sm" title="Duplicar" onClick={() => { const { id: _i, ...rest } = t; void _i; actions.addTarefa(rest) }}>
                        <CopyIcon className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="icon-sm" title="Excluir" className="hover:bg-destructive/20 hover:text-destructive" onClick={() => actions.removeTarefa(t.id)}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  )
}

// ---------- Modal de atividade ----------
function AtividadeModal({
  open, onOpenChange, form, setForm, setores, projetos, gargalos, editing, onSave, setAposSalvar,
}: {
  open: boolean
  onOpenChange: (o: boolean) => void
  form: Omit<Tarefa, "id">
  setForm: (f: Omit<Tarefa, "id">) => void
  setores: { id: string; nome: string }[]
  projetos: { id: string; nome: string }[]
  gargalos: { id: string; processo: string; setorId: string }[]
  editing: boolean
  onSave: () => void
  setAposSalvar: (v: "fechar" | "calendario" | "projeto") => void
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-3xl max-h-[92vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{editing ? "Editar atividade" : "Nova atividade do Guardião"}</DialogTitle>
        </DialogHeader>
        <div className="grid md:grid-cols-2 gap-3">
          <Field label="Tipo de rotina">
            <GSelect
              className="w-full" value={form.tipoRotina ?? "Não se aplica"}
              onChange={(v) => setForm({ ...form, tipoRotina: v as TipoRotina })}
              options={TIPOS_ROTINA.map((t) => ({ value: t, label: t }))}
            />
          </Field>
          <Field label="Setor">
            <GSelect
              className="w-full" value={form.setorId ?? ""}
              onChange={(v) => setForm({ ...form, setorId: v || undefined })}
              options={[
                { value: "", label: "—" },
                ...setores.map((s) => ({ value: s.id, label: s.nome })),
                ...SETORES_DISPONIVEIS.filter((n) => !setores.some((s) => s.nome === n)).map((n) => ({
                  value: `__hint__${n}`, label: `${n} (não cadastrado)`, disabled: true,
                })),
              ]}
            />
          </Field>
          <Field label="Título da atividade" full>
            <Input className="h-8" value={form.titulo} onChange={(e) => setForm({ ...form, titulo: e.target.value })} />
          </Field>
          <Field label="Descrição da atividade" full>
            <Textarea className="min-h-[60px]" value={form.descricao ?? ""} onChange={(e) => setForm({ ...form, descricao: e.target.value })} />
          </Field>
          <Field label="Líder envolvido">
            <Input className="h-8" value={form.lider ?? ""} onChange={(e) => setForm({ ...form, lider: e.target.value })} />
          </Field>
          <Field label="Responsável pela atividade">
            <Input className="h-8" value={form.responsavel} onChange={(e) => setForm({ ...form, responsavel: e.target.value })} />
          </Field>
          <Field label="Projeto vinculado">
            <GSelect
              className="w-full" value={form.projetoId ?? ""}
              onChange={(v) => setForm({ ...form, projetoId: v || undefined })}
              options={[{ value: "", label: "—" }, ...projetos.map((p) => ({ value: p.id, label: p.nome }))]}
            />
          </Field>
          <Field label="Gargalo vinculado">
            <GSelect
              className="w-full" value={form.gargaloId ?? ""}
              onChange={(v) => setForm({ ...form, gargaloId: v || undefined })}
              options={[{ value: "", label: "—" }, ...gargalos.map((g) => ({ value: g.id, label: g.processo.slice(0, 80) }))]}
            />
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
          <Field label="Prazo">
            <Input type="date" className="h-8" value={form.prazo} onChange={(e) => setForm({ ...form, prazo: e.target.value })} />
          </Field>
          <Field label="Horário (opcional)">
            <Input type="time" className="h-8" value={form.horario ?? ""} onChange={(e) => setForm({ ...form, horario: e.target.value })} />
          </Field>
          <Field label="Recorrência">
            <GSelect
              className="w-full" value={form.recorrencia ?? "Sem recorrência"}
              onChange={(v) => setForm({ ...form, recorrencia: v as Recorrencia })}
              options={RECORRENCIAS.map((r) => ({ value: r, label: r }))}
            />
          </Field>
          <Field label="Origem">
            <GSelect
              className="w-full" value={form.origem ?? "Criada manualmente"}
              onChange={(v) => setForm({ ...form, origem: v as OrigemTarefa })}
              options={ORIGENS_TAREFA.map((o) => ({ value: o, label: o }))}
            />
          </Field>
          <Field label="Observações" full>
            <Textarea className="min-h-[50px]" value={form.observacoes} onChange={(e) => setForm({ ...form, observacoes: e.target.value })} />
          </Field>
          <Field label="Resultado esperado" full>
            <Textarea className="min-h-[50px]" value={form.resultadoEsperado ?? ""} onChange={(e) => setForm({ ...form, resultadoEsperado: e.target.value })} />
          </Field>
          <Field label="Resultado alcançado" full>
            <Textarea className="min-h-[50px]" value={form.resultadoAlcancado ?? ""} onChange={(e) => setForm({ ...form, resultadoAlcancado: e.target.value })} />
          </Field>
          <Field label="Evidência / link" full>
            <Input className="h-8" value={form.evidencia ?? ""} onChange={(e) => setForm({ ...form, evidencia: e.target.value })} />
          </Field>
        </div>
        <DialogFooter className="flex-wrap">
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button
            variant="outline"
            onClick={() => { setAposSalvar("projeto"); onSave() }}
            disabled={!form.projetoId}
            title={!form.projetoId ? "Selecione um projeto vinculado" : ""}
          >
            Salvar e vincular ao projeto
          </Button>
          <Button variant="outline" onClick={() => { setAposSalvar("calendario"); onSave() }}>
            Salvar e adicionar ao calendário
          </Button>
          <Button onClick={() => { setAposSalvar("fechar"); onSave() }}>
            Salvar atividade
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

// ---------- Detalhe ----------
function DetailDrawer({
  tarefa, setores, projetos, gargalos, onClose, onEdit,
}: {
  tarefa: Tarefa
  setores: { id: string; nome: string }[]
  projetos: { id: string; nome: string }[]
  gargalos: { id: string; processo: string }[]
  onClose: () => void
  onEdit: (t: Tarefa) => void
}) {
  const setor = setores.find((s) => s.id === tarefa.setorId)
  const proj = projetos.find((p) => p.id === tarefa.projetoId)
  const garg = gargalos.find((g) => g.id === tarefa.gargaloId)
  return (
    <Sheet open onOpenChange={(o) => { if (!o) onClose() }}>
      <SheetContent side="right" className="w-full overflow-y-auto p-6" style={{ maxWidth: "32rem" }}>
        <SheetHeader className="p-0">
          <div className="flex justify-between items-start gap-3">
            <div>
              <div className="text-[11px] uppercase tracking-wider text-primary">{tarefa.origem ?? "Atividade"}</div>
              <SheetTitle className="text-xl font-semibold">{tarefa.titulo}</SheetTitle>
              <SheetDescription className="text-xs mt-1">
                {tarefa.tipoRotina ?? "—"} · {tarefa.prazo || "sem prazo"}{tarefa.horario ? ` ${tarefa.horario}` : ""}
              </SheetDescription>
            </div>
            <Button variant="ghost" size="icon-sm" className="mr-8" onClick={() => onEdit(tarefa)}>
              <Pencil className="h-4 w-4" />
            </Button>
          </div>
        </SheetHeader>

        <div className="grid grid-cols-2 gap-2 text-sm">
          <Info label="Setor" value={setor?.nome ?? "—"} />
          <Info label="Responsável" value={tarefa.responsavel || "—"} />
          <Info label="Líder" value={tarefa.lider || "—"} />
          <Info label="Prioridade" value={tarefa.prioridade} />
          <Info label="Status" value={tarefa.status} />
          <Info label="Recorrência" value={tarefa.recorrencia ?? "—"} />
        </div>

        {(proj || garg) && (
          <div className="p-3 bg-muted rounded-md text-sm space-y-1">
            {proj && <div>Projeto: <Link to={`/guardiao/projetos/${proj.id}`} className="text-primary">{proj.nome}</Link></div>}
            {garg && <div>Gargalo: <span className="text-foreground">{garg.processo}</span></div>}
          </div>
        )}

        {tarefa.descricao && <Bloco label="Descrição" v={tarefa.descricao} />}
        {tarefa.observacoes && <Bloco label="Observações" v={tarefa.observacoes} />}
        {tarefa.resultadoEsperado && <Bloco label="Resultado esperado" v={tarefa.resultadoEsperado} />}
        {tarefa.resultadoAlcancado && <Bloco label="Resultado alcançado" v={tarefa.resultadoAlcancado} />}
        {tarefa.evidencia && <Bloco label="Evidência" v={tarefa.evidencia} />}

        <SheetFooter className="p-0 flex-row gap-2">
          <Button className="flex-1" onClick={() => actions.updateTarefa(tarefa.id, { status: "Concluído" })}>
            <CheckCircle2 className="h-4 w-4" /> Marcar como concluída
          </Button>
          <Button variant="outline" className="border-destructive/40 text-destructive hover:bg-destructive/20 hover:text-destructive" onClick={() => actions.removeTarefa(tarefa.id)}>
            <Trash2 className="h-4 w-4" /> Excluir
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
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
    <div className="p-2 bg-muted rounded-md">
      <div className="text-[10px] uppercase tracking-wider text-muted-foreground">{label}</div>
      <div className="text-sm">{value}</div>
    </div>
  )
}
function Bloco({ label, v }: { label: string; v: string }) {
  return (
    <div>
      <div className="text-[11px] uppercase tracking-wider text-muted-foreground mb-1">{label}</div>
      <div className="text-sm text-foreground/90 whitespace-pre-wrap p-3 bg-muted rounded-md">{v}</div>
    </div>
  )
}
