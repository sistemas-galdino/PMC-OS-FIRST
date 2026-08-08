// Tarefas — o cockpit operacional do Guardião. "Tudo que o Guardião precisa executar."
// MVP: visão em Lista + filtros + Nova/Editar. Kanban e Calendário entram na Fase 2.
// Deep links: ?origem=rotina_diaria (pré-filtra) e ?nova=1&origem=... (abre o form já preenchido).
import { useEffect, useMemo, useState } from "react"
import { useSearchParams } from "react-router-dom"
import type { Session } from "@supabase/supabase-js"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { ComboboxInput } from "@/components/ui/combobox-input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import {
  PlusIcon as Plus,
  Trash2Icon as Trash2,
  CheckSquareIcon as CheckSquare,
  CalendarIcon as Calendar,
  ExternalLinkIcon as ExternalLink,
  AlertTriangleIcon as AlertTriangle,
} from "@/components/ui/icons"
import {
  type Tarefa,
  type TarefaInput,
  PRIORIDADES,
  STATUSES,
  TIPOS,
  ORIGENS,
  TIPOS_ROTINA,
  PRIORIDADE_LABEL,
  ORIGEM_LABEL,
  PRIORIDADE_COR,
  STATUS_COR,
  listarTarefas,
  criarTarefa,
  atualizarTarefa,
  excluirTarefa,
  fontesContexto,
  resolverResponsavel,
  type Pessoa,
} from "@/lib/guardiao/tarefas"

interface Props {
  session?: Session
  clientId?: string
}

type Vista = "lista" | "kanban" | "calendario"

const FORM_VAZIO: TarefaInput = {
  titulo: "",
  setor: "",
  projeto: "",
  responsavel: "",
  prazo: "",
  prioridade: "media",
  status: "a_fazer",
  tipo: "acompanhamento",
  origem: "avulsa",
  tipo_rotina: "nao_se_aplica",
  bloqueio: "",
  ref_nome: "",
  ref_link: "",
  observacoes: "",
}

export default function TarefasPage({ session, clientId }: Props) {
  const resolvedClientId = clientId || session?.user?.id
  const [searchParams, setSearchParams] = useSearchParams()
  const [tarefas, setTarefas] = useState<Tarefa[]>([])
  const [fontes, setFontes] = useState<{ setores: string[]; projetos: string[]; pessoas: Pessoa[] }>({ setores: [], projetos: [], pessoas: [] })
  const [loading, setLoading] = useState(true)
  const [vista, setVista] = useState<Vista>("lista")

  // Filtros
  const [busca, setBusca] = useState("")
  const [fSetor, setFSetor] = useState("todos")
  const [fPrioridade, setFPrioridade] = useState("todas")
  const [fStatus, setFStatus] = useState("todos")
  const [fOrigem, setFOrigem] = useState(searchParams.get("origem") || "todas")
  const [fRotina, setFRotina] = useState("todas")

  // Form
  const [editando, setEditando] = useState<Tarefa | null>(null)
  const [form, setForm] = useState<TarefaInput>(FORM_VAZIO)
  const [aberto, setAberto] = useState(false)
  const [salvando, setSalvando] = useState(false)

  async function carregar() {
    if (!resolvedClientId) return
    setLoading(true)
    try {
      const [t, f] = await Promise.all([listarTarefas(resolvedClientId), fontesContexto(resolvedClientId)])
      setTarefas(t)
      setFontes(f)
    } catch (e) {
      console.error("Erro ao carregar tarefas:", e)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { carregar() }, [resolvedClientId]) // eslint-disable-line react-hooks/exhaustive-deps

  // Deep link ?nova=1(&origem=...) → abre o form já com a origem certa
  useEffect(() => {
    if (searchParams.get("nova") === "1") {
      const origem = searchParams.get("origem") || "avulsa"
      const cad = ORIGENS.find((o) => o.chave === origem)
      const tipoRotina = cad && origem.startsWith("rotina_") ? origem.replace("rotina_", "") : "nao_se_aplica"
      abrirNova({ ...FORM_VAZIO, origem, tipo_rotina: tipoRotina })
      // limpa os params de ação, preservando o filtro de origem
      setSearchParams((p) => { p.delete("nova"); return p }, { replace: true })
    }
  }, [searchParams]) // eslint-disable-line react-hooks/exhaustive-deps

  const setores = useMemo(
    () => [...new Set([...fontes.setores, ...tarefas.map((t) => t.setor).filter((x): x is string => !!x)])],
    [fontes.setores, tarefas],
  )

  const filtradas = useMemo(() => {
    const q = busca.trim().toLowerCase()
    return tarefas.filter((t) => {
      if (q && !`${t.titulo} ${t.responsavel ?? ""} ${t.projeto ?? ""}`.toLowerCase().includes(q)) return false
      if (fSetor !== "todos" && t.setor !== fSetor) return false
      if (fPrioridade !== "todas" && t.prioridade !== fPrioridade) return false
      if (fStatus !== "todos" && t.status !== fStatus) return false
      if (fOrigem !== "todas" && t.origem !== fOrigem) return false
      if (fRotina !== "todas" && t.tipo_rotina !== fRotina) return false
      return true
    })
  }, [tarefas, busca, fSetor, fPrioridade, fStatus, fOrigem, fRotina])

  function abrirNova(base: TarefaInput = FORM_VAZIO) {
    setEditando(null)
    setForm({ ...base })
    setAberto(true)
  }

  function abrirEdicao(t: Tarefa) {
    setEditando(t)
    setForm({
      titulo: t.titulo,
      setor: t.setor ?? "",
      projeto: t.projeto ?? "",
      responsavel: t.responsavel ?? "",
      prazo: t.prazo ?? "",
      prioridade: t.prioridade,
      status: t.status,
      tipo: t.tipo ?? "acompanhamento",
      origem: t.origem,
      tipo_rotina: t.tipo_rotina,
      bloqueio: t.bloqueio ?? "",
      ref_nome: t.ref_nome ?? "",
      ref_link: t.ref_link ?? "",
      observacoes: t.observacoes ?? "",
    })
    setAberto(true)
  }

  async function salvar() {
    if (!resolvedClientId || !form.titulo?.trim()) return
    setSalvando(true)
    try {
      // O texto digitado vira vínculo com a pessoa do time sempre que casar.
      const payload = { ...form, responsavel_id: resolverResponsavel(form.responsavel, fontes.pessoas) }
      if (editando) {
        await atualizarTarefa(editando.id, payload)
      } else {
        await criarTarefa(resolvedClientId, payload)
      }
      setAberto(false)
      await carregar()
    } catch (e) {
      console.error("Erro ao salvar tarefa:", e)
    } finally {
      setSalvando(false)
    }
  }

  async function remover() {
    if (!editando) return
    setSalvando(true)
    try {
      await excluirTarefa(editando.id)
      setAberto(false)
      await carregar()
    } catch (e) {
      console.error("Erro ao excluir tarefa:", e)
    } finally {
      setSalvando(false)
    }
  }

  // Troca rápida de status direto da lista
  async function mudarStatus(t: Tarefa, status: string) {
    setTarefas((prev) => prev.map((x) => (x.id === t.id ? { ...x, status } : x)))
    try {
      await atualizarTarefa(t.id, { status })
    } catch {
      carregar()
    }
  }

  if (!resolvedClientId) return null

  const set = (patch: Partial<TarefaInput>) => setForm((p) => ({ ...p, ...patch }))

  return (
    <div className="space-y-6 pb-10">
      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground">Tarefas</h1>
          <p className="text-sm font-medium text-muted-foreground mt-1">Tudo que o Guardião precisa executar.</p>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1 rounded-xl bg-muted/30 p-1">
            {(["lista", "kanban", "calendario"] as Vista[]).map((v) => (
              <button
                key={v}
                onClick={() => setVista(v)}
                className={`h-8 rounded-lg px-3 text-[12px] font-bold capitalize transition-colors ${
                  vista === v ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {v === "calendario" ? "Calendário" : v}
              </button>
            ))}
          </div>
          <Button className="h-9 gap-2 rounded-xl font-bold text-xs uppercase tracking-wider" onClick={() => abrirNova()}>
            <Plus className="size-4" />
            Nova tarefa
          </Button>
        </div>
      </div>

      {/* Filtros */}
      <div className="flex flex-wrap items-center gap-2">
        <Input
          placeholder="Buscar..."
          value={busca}
          onChange={(e) => setBusca(e.target.value)}
          className="h-10 w-full max-w-56 rounded-xl"
        />
        <FiltroSelect value={fSetor} onChange={setFSetor} placeholder="Todo setor" all="todos"
          options={setores.map((s) => ({ chave: s, label: s }))} />
        <FiltroSelect value={fPrioridade} onChange={setFPrioridade} placeholder="Toda prioridade" all="todas"
          options={PRIORIDADES.map((p) => ({ chave: p.chave, label: p.label }))} />
        <FiltroSelect value={fStatus} onChange={setFStatus} placeholder="Todo status" all="todos"
          options={STATUSES.map((s) => ({ chave: s.chave, label: s.label }))} />
        <FiltroSelect value={fOrigem} onChange={setFOrigem} placeholder="Toda origem" all="todas"
          options={ORIGENS.map((o) => ({ chave: o.chave, label: o.label }))} />
        <FiltroSelect value={fRotina} onChange={setFRotina} placeholder="Toda rotina" all="todas"
          options={TIPOS_ROTINA.map((r) => ({ chave: r.chave, label: r.label }))} />
      </div>

      {/* Conteúdo */}
      {vista !== "lista" ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center gap-2 py-16 text-center">
            <Calendar className="size-8 text-muted-foreground/40" />
            <p className="text-sm font-bold text-foreground">
              {vista === "kanban" ? "Kanban" : "Calendário"} em breve
            </p>
            <p className="text-[13px] font-medium text-muted-foreground max-w-sm">
              A visão em Lista já está no ar. As visões de {vista === "kanban" ? "Kanban" : "Calendário"} chegam na próxima fase.
            </p>
            <Button variant="outline" size="sm" className="mt-2 rounded-lg text-xs font-bold" onClick={() => setVista("lista")}>
              Ver em Lista
            </Button>
          </CardContent>
        </Card>
      ) : loading ? (
        <div className="space-y-2">
          {[0, 1, 2].map((i) => <div key={i} className="h-16 rounded-xl bg-card/40 animate-pulse" />)}
        </div>
      ) : filtradas.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center gap-3 py-20 text-center">
            <CheckSquare className="size-8 text-muted-foreground/40" />
            <p className="text-lg font-bold text-foreground">Sem tarefas</p>
            <p className="text-[13px] font-medium text-muted-foreground max-w-sm">
              {tarefas.length === 0
                ? "Comece criando a primeira tarefa — ou gere direto de uma rotina em Rotinas e Rituais."
                : "Nenhuma tarefa bate com os filtros atuais."}
            </p>
            <Button className="mt-2 gap-2 rounded-xl font-bold text-xs uppercase tracking-wider" onClick={() => abrirNova()}>
              <Plus className="size-4" />
              Nova tarefa
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {filtradas.map((t) => {
            const atrasada = t.prazo && t.status !== "concluido" && t.prazo < hoje()
            return (
              <Card key={t.id} className="transition-colors hover:border-primary/30">
                <CardContent className="flex items-center gap-4 p-4">
                  <button className="min-w-0 flex-1 text-left" onClick={() => abrirEdicao(t)}>
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="text-[14px] font-bold tracking-tight text-foreground truncate">{t.titulo}</p>
                      {t.bloqueio && (
                        <Badge variant="outline" className="gap-1 rounded-lg border-rose-400/30 text-rose-400 px-1.5 py-0 text-[10px] font-bold">
                          <AlertTriangle className="size-3" /> Bloqueio
                        </Badge>
                      )}
                    </div>
                    <div className="mt-1 flex items-center gap-2 flex-wrap text-[11px] font-medium text-muted-foreground">
                      {t.setor && <span className="uppercase tracking-wider">{t.setor}</span>}
                      {t.responsavel && <span>· {t.responsavel}</span>}
                      {t.origem !== "avulsa" && <span>· {ORIGEM_LABEL[t.origem]}</span>}
                      {t.prazo && (
                        <span className={`flex items-center gap-1 ${atrasada ? "text-rose-400 font-bold" : ""}`}>
                          · <Calendar className="size-3" /> {formatarData(t.prazo)}
                        </span>
                      )}
                    </div>
                  </button>
                  <Badge variant="outline" className={`shrink-0 rounded-lg px-2 py-0.5 text-[10px] font-bold uppercase ${PRIORIDADE_COR[t.prioridade]}`}>
                    {PRIORIDADE_LABEL[t.prioridade]}
                  </Badge>
                  <Select value={t.status} onValueChange={(v) => mudarStatus(t, v)}>
                    <SelectTrigger className={`h-8 w-36 shrink-0 rounded-lg text-[11px] font-bold ${STATUS_COR[t.status]}`}>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {STATUSES.map((s) => <SelectItem key={s.chave} value={s.chave}>{s.label}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </CardContent>
              </Card>
            )
          })}
          <p className="px-1 pt-1 text-[11px] font-medium text-muted-foreground/70">
            {filtradas.length} de {tarefas.length} tarefa{tarefas.length === 1 ? "" : "s"}
          </p>
        </div>
      )}

      {/* Form Nova / Editar */}
      <Dialog open={aberto} onOpenChange={setAberto}>
        <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editando ? "Editar tarefa" : "Nova tarefa"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <Campo label="Título">
              <Input className="h-11 rounded-xl" value={form.titulo ?? ""} onChange={(e) => set({ titulo: e.target.value })} />
            </Campo>
            <div className="grid gap-4 sm:grid-cols-2">
              <Campo label="Setor">
                <ComboboxInput value={form.setor ?? ""} onChange={(v) => set({ setor: v })} options={fontes.setores} placeholder="Ex.: Marketing" />
              </Campo>
              <Campo label="Projeto vinculado">
                <ComboboxInput value={form.projeto ?? ""} onChange={(v) => set({ projeto: v })} options={fontes.projetos} placeholder="Sistema, automação..." />
              </Campo>
              {/* Sugere o time (vira responsavel_id) mas aceita nome de fora do cadastro. */}
              <Campo label="Responsável">
                <ComboboxInput
                  value={form.responsavel ?? ""}
                  onChange={(v) => set({ responsavel: v })}
                  options={fontes.pessoas.map((p) => p.nome)}
                  placeholder="Quem executa"
                />
              </Campo>
              <Campo label="Prazo">
                <Input type="date" className="h-11 rounded-xl" value={form.prazo ?? ""} onChange={(e) => set({ prazo: e.target.value })} />
              </Campo>
              <Campo label="Prioridade">
                <SelectCampo value={form.prioridade ?? "media"} onChange={(v) => set({ prioridade: v })} options={PRIORIDADES} />
              </Campo>
              <Campo label="Status">
                <SelectCampo value={form.status ?? "a_fazer"} onChange={(v) => set({ status: v })} options={STATUSES} />
              </Campo>
              <Campo label="Tipo">
                <SelectCampo value={form.tipo ?? "acompanhamento"} onChange={(v) => set({ tipo: v })} options={TIPOS} />
              </Campo>
              <Campo label="Origem da tarefa">
                <SelectCampo value={form.origem ?? "avulsa"} onChange={(v) => set({ origem: v })} options={ORIGENS} />
              </Campo>
              <Campo label="Tipo de rotina">
                <SelectCampo value={form.tipo_rotina ?? "nao_se_aplica"} onChange={(v) => set({ tipo_rotina: v })} options={TIPOS_ROTINA} />
              </Campo>
            </div>
            <Campo label="Bloqueio (se houver)">
              <Input className="h-11 rounded-xl" value={form.bloqueio ?? ""} onChange={(e) => set({ bloqueio: e.target.value })} />
            </Campo>
            <div>
              <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Referência no PMCOS</Label>
              <div className="mt-2 grid gap-4 sm:grid-cols-2">
                <Input className="h-11 rounded-xl" placeholder="Nome / item PMCOS" value={form.ref_nome ?? ""} onChange={(e) => set({ ref_nome: e.target.value })} />
                <Input className="h-11 rounded-xl" placeholder="Link" value={form.ref_link ?? ""} onChange={(e) => set({ ref_link: e.target.value })} />
              </div>
            </div>
            <Campo label="Observações">
              <Textarea className="rounded-xl min-h-24" value={form.observacoes ?? ""} onChange={(e) => set({ observacoes: e.target.value })} />
            </Campo>
          </div>
          <DialogFooter className="flex-row items-center justify-between gap-2 sm:justify-between">
            {editando ? (
              <Button variant="ghost" size="sm" disabled={salvando} onClick={remover}
                className="gap-1.5 rounded-xl font-bold text-[11px] uppercase tracking-wider text-muted-foreground hover:text-destructive">
                <Trash2 className="size-3.5" /> Excluir
              </Button>
            ) : <span />}
            <div className="flex items-center gap-2">
              {editando && form.ref_link && (
                <Button variant="outline" size="sm" className="gap-1.5 rounded-xl font-bold text-[11px] uppercase tracking-wider"
                  onClick={() => window.open(form.ref_link!, "_blank")}>
                  <ExternalLink className="size-3.5" /> Abrir
                </Button>
              )}
              <Button variant="outline" className="h-10 rounded-xl font-bold text-xs uppercase tracking-wider" onClick={() => setAberto(false)}>
                Cancelar
              </Button>
              <Button disabled={salvando || !form.titulo?.trim()} className="h-10 rounded-xl font-bold text-xs uppercase tracking-wider" onClick={salvar}>
                {salvando ? "Salvando..." : "Salvar"}
              </Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

// ---- Subcomponentes -----------------------------------------------------------

function Campo({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-2">
      <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">{label}</Label>
      {children}
    </div>
  )
}

function SelectCampo({ value, onChange, options }: { value: string; onChange: (v: string) => void; options: readonly { chave: string; label: string }[] }) {
  return (
    <Select value={value} onValueChange={onChange}>
      <SelectTrigger className="h-11 rounded-xl"><SelectValue /></SelectTrigger>
      <SelectContent>
        {options.map((o) => <SelectItem key={o.chave} value={o.chave}>{o.label}</SelectItem>)}
      </SelectContent>
    </Select>
  )
}

function FiltroSelect({ value, onChange, placeholder, all, options }: {
  value: string; onChange: (v: string) => void; placeholder: string; all: string
  options: { chave: string; label: string }[]
}) {
  return (
    <Select value={value} onValueChange={onChange}>
      <SelectTrigger className="h-10 w-auto min-w-36 rounded-xl text-[13px] font-medium"><SelectValue placeholder={placeholder} /></SelectTrigger>
      <SelectContent>
        <SelectItem value={all}>{placeholder}</SelectItem>
        {options.map((o) => <SelectItem key={o.chave} value={o.chave}>{o.label}</SelectItem>)}
      </SelectContent>
    </Select>
  )
}

// ---- utils --------------------------------------------------------------------

function hoje(): string {
  return new Date().toISOString().slice(0, 10)
}
function formatarData(iso: string): string {
  const [y, m, d] = iso.split("-")
  return `${d}/${m}/${y}`
}
