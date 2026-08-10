import { useEffect, useMemo, useState } from "react"
import { useNavigate, useSearchParams } from "react-router-dom"
import { toast } from "sonner"
import { NovaAtividadeModal } from "@/components/crm/NovaAtividadeModal"
import { NextActionModal } from "@/components/crm/NextActionModal"
import {
  buildDisplayIdMap,
  concluirAtividade,
  deleteAtividade,
  diasSemContato,
  isCS,
  openCliente,
  sameDay,
  updateAtividade,
  useAtividades,
  useClientes,
  useNomeExibicao,
  useProfile,
} from "@/lib/crm/storage"
import { ReunioesClientes } from "@/components/crm/ReunioesClientes"
import { ReunioesDoDia } from "@/components/crm/ReunioesDoDia"
import {
  CONSULTORES,
  type Atividade,
  type AtividadeStatus,
  type CSName,
  type Cliente,
  type Prioridade,
} from "@/lib/crm/types"
import { saudacaoDoDia } from "@/lib/crm/saudacoes"

import {
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  Plus,
  CalendarDays,
  X,
  Play,
  Check,
  Ban,
  SlidersHorizontal,
  Search as SearchIcon,
  MoreHorizontal,
} from "lucide-react"

const WEEKDAYS = ["Domingo", "Segunda", "Terça", "Quarta", "Quinta", "Sexta", "Sábado"]
const WEEKDAYS_SHORT = ["DOM", "SEG", "TER", "QUA", "QUI", "SEX", "SAB"]
const WD_MINI = ["D", "S", "T", "Q", "Q", "S", "S"]
const MONTHS = [
  "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
  "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro",
]

function fmtDate(d: Date) {
  return `${String(d.getDate()).padStart(2, "0")}/${String(d.getMonth() + 1).padStart(2, "0")}/${d.getFullYear()}`
}
function fmtShort(d: Date) {
  return `${String(d.getDate()).padStart(2, "0")}/${String(d.getMonth() + 1).padStart(2, "0")}`
}
function startOfDay(d: Date) {
  const x = new Date(d)
  x.setHours(0, 0, 0, 0)
  return x
}

/**
 * As mutações agora são assíncronas (Supabase). Nada de estado local depois:
 * o React Query invalida e re-renderiza; aqui só sobra avisar em caso de erro.
 */
function mutar(p: Promise<unknown>, fallback = "Não foi possível salvar a atividade") {
  void p.catch((e) => toast.error(e instanceof Error ? e.message : fallback))
}

function effectiveStatus(a: Atividade): AtividadeStatus {
  if (
    a.status === "Atrasada" ||
    a.status === "Concluída" ||
    a.status === "Impedida" ||
    a.status === "Aguardando cliente" ||
    a.status === "Aguardando time interno"
  )
    return a.status
  const t = new Date(a.data_prevista).getTime()
  if ((a.status === "Pendente" || a.status === "Em andamento") && t < Date.now() - 86400000)
    return "Atrasada"
  return a.status
}

const STATUS_BAR: Record<AtividadeStatus, string> = {
  Pendente: "bg-[#6B7280]",
  "Em andamento": "bg-[#60A5FA]",
  "Aguardando cliente": "bg-[#A78BFA]",
  "Aguardando time interno": "bg-[#F59E0B]",
  Concluída: "bg-[#22C55E]",
  Atrasada: "bg-[#EF4444]",
  Impedida: "bg-[#F97316]",
}
const STATUS_PILL: Record<AtividadeStatus, string> = {
  Pendente: "bg-[#6B7280]/20 text-[#9CA3AF] border-[#6B7280]/50",
  "Em andamento": "bg-[#60A5FA]/20 text-[#60A5FA] border-[#60A5FA]/50",
  "Aguardando cliente": "bg-[#A78BFA]/20 text-[#A78BFA] border-[#A78BFA]/50",
  "Aguardando time interno": "bg-[#F59E0B]/20 text-[#F59E0B] border-[#F59E0B]/50",
  Concluída: "bg-[#22C55E]/20 text-[#22C55E] border-[#22C55E]/50",
  Atrasada: "bg-[#EF4444]/20 text-[#EF4444] border-[#EF4444]/50",
  Impedida: "bg-[#F97316]/20 text-[#F97316] border-[#F97316]/50",
}
const STATUS_EMOJI: Record<AtividadeStatus, string> = {
  Pendente: "⬜",
  "Em andamento": "🔵",
  "Aguardando cliente": "🟣",
  "Aguardando time interno": "🟠",
  Concluída: "✅",
  Atrasada: "⚠️",
  Impedida: "🚫",
}
const PRIO_EMOJI: Record<Prioridade, string> = {
  Urgente: "🔴",
  Médio: "🟡",
  Normal: "🟢",
}
const PRIO_PILL: Record<Prioridade, string> = {
  Urgente: "bg-[#EF4444]/15 text-[#EF4444] border-[#EF4444]/40",
  Médio: "bg-[#F59E0B]/15 text-[#F59E0B] border-[#F59E0B]/40",
  Normal: "bg-[#6B7280]/15 text-[#9CA3AF] border-[#6B7280]/40",
}

type ViewMode = "meudia" | "dia" | "semana" | "mes"
type StatusFilter = "all" | AtividadeStatus
type PrioFilter = "all" | Prioridade

export function TarefasPage({ fixedView, title }: { fixedView?: ViewMode; title?: string } = {}) {
  const [profile] = useProfile()
  // Quem está logado (saudação/cabeçalho) é separado de `profile`, que é o
  // filtro de carteira: para a coordenação, `profile` é null (= todas as CSs).
  const nomeExibicao = useNomeExibicao()
  const atividades = useAtividades()
  const clientes = useClientes()
  const [searchParams] = useSearchParams()

  const profileCS: CSName | null = isCS(profile) ? (profile as CSName) : null

  const [view, setView] = useState<ViewMode>(fixedView ?? "semana")
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all")
  const [prioFilter, setPrioFilter] = useState<PrioFilter>("all")
  // Multi-select filters (used no Meu Dia)
  const [statusMulti, setStatusMulti] = useState<Set<AtividadeStatus>>(new Set())
  const [prioMulti, setPrioMulti] = useState<Set<Prioridade>>(new Set())
  const [clienteMulti, setClienteMulti] = useState<Set<string>>(new Set())
  const [filterOpen, setFilterOpen] = useState(false)
  const [selected, setSelected] = useState(() => {
    const d = new Date()
    d.setHours(12, 0, 0, 0)
    return d
  })
  const [meuDiaDay, setMeuDiaDay] = useState(() => {
    const d = new Date()
    d.setHours(12, 0, 0, 0)
    return d
  })
  const [openNew, setOpenNew] = useState(false)
  const [detailId, setDetailId] = useState<string | null>(null)
  const [nextAction, setNextAction] = useState<{ atividadeId: string; clienteId: string; cs: CSName } | null>(null)
  const [waitingModal, setWaitingModal] = useState<{
    atividade: Atividade
    status: "Aguardando cliente" | "Aguardando time interno" | "Impedida"
  } | null>(null)

  const readonly = searchParams.get("view") === "readonly"

  // Escopo de CS
  // Meu Dia / Atividades são pessoais para a CS. Para a coordenação, `profile`
  // é null e a tela passa a mostrar o time inteiro, identificando de quem é
  // cada atividade — é a "visão de todas" que a Mayara descreveu.
  const csName: CSName | null = (profile as CSName | null) ?? null

  const isMeuDia = fixedView === "meudia"

  // Atividades aplicando filtros (CS + status + prioridade)
  const visiveis = useMemo(() => {
    return atividades.filter((a) => {
      if (csName && a.cs_responsavel !== csName) return false
      if (isMeuDia) {
        if (statusMulti.size > 0 && !statusMulti.has(effectiveStatus(a))) return false
        if (prioMulti.size > 0 && !prioMulti.has(a.prioridade)) return false
        if (clienteMulti.size > 0 && !clienteMulti.has(a.cliente_id)) return false
      } else {
        if (statusFilter !== "all" && effectiveStatus(a) !== statusFilter) return false
        if (prioFilter !== "all" && a.prioridade !== prioFilter) return false
      }
      return true
    })
  }, [atividades, csName, statusFilter, prioFilter, isMeuDia, statusMulti, prioMulti, clienteMulti])

  const clientesCarteira = useMemo(() => {
    const list = csName ? clientes.filter((c) => c.responsavel_cs === csName) : clientes
    return [...list].sort((a, b) => a.nome.localeCompare(b.nome))
  }, [clientes, csName])

  const activeFilterCount =
    (statusMulti.size > 0 ? 1 : 0) +
    (prioMulti.size > 0 ? 1 : 0) +
    (clienteMulti.size > 0 ? 1 : 0)

  function setStatus(id: string, st: AtividadeStatus) {
    const a = atividades.find((x) => x.id === id)
    if (!a) return
    if (st === "Concluída") {
      mutar(concluirAtividade(id))
      if (a.cliente_id) {
        setNextAction({ atividadeId: id, clienteId: a.cliente_id, cs: a.cs_responsavel })
      }
      return
    }
    // Aguardando cliente / time interno → modal dedicado
    if (st === "Aguardando cliente" || st === "Aguardando time interno") {
      setWaitingModal({ atividade: a, status: st })
      return
    }
    // Impedida também passa pelo modal, e não por window.prompt: o motivo é
    // obrigatório (o banco rejeita 'impedido' sem motivo), e um prompt nativo
    // aceita string vazia — o UPDATE falharia depois, longe da ação da CS.
    if (st === "Impedida") {
      setWaitingModal({ atividade: a, status: st })
      return
    }
    const status_desde = a.status === st ? a.status_desde ?? new Date().toISOString() : new Date().toISOString()
    mutar(updateAtividade(id, { status: st, motivo_impedimento: a.motivo_impedimento, status_desde }))
  }

  function openDependenciaModal(id: string) {
    const a = atividades.find((x) => x.id === id)
    if (!a) return
    if (a.status !== "Aguardando cliente" && a.status !== "Aguardando time interno") return
    setWaitingModal({ atividade: a, status: a.status })
  }

  function delAtividade(id: string) {
    if (!confirm("Excluir esta atividade?")) return
    mutar(deleteAtividade(id), "Não foi possível excluir a atividade")
    setDetailId(null)
  }

  const headerTitle = title ? title : `Tarefas · ${profile ?? "todas as CSs"}`

  return (
    <div>
      <header className="mb-5">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            {isMeuDia ? (
              <MeuDiaHeader profile={nomeExibicao} day={meuDiaDay} setDay={setMeuDiaDay} />
            ) : (
              <h1 className="text-2xl font-bold">{headerTitle}</h1>
            )}
            {readonly && (
              <p className="text-xs text-muted-foreground mt-1">Somente leitura</p>
            )}
          </div>
          <div className="flex items-center gap-2 relative">
            {isMeuDia && (
              <button
                onClick={() => setFilterOpen((v) => !v)}
                className={`inline-flex items-center gap-2 border font-semibold px-3.5 py-2 rounded-lg text-sm transition-colors ${
                  activeFilterCount > 0
                    ? "border-primary text-primary bg-primary/10"
                    : "border-border text-foreground bg-card hover:border-primary"
                }`}
              >
                <SlidersHorizontal className="h-4 w-4" />
                Filtro{activeFilterCount > 0 ? ` (${activeFilterCount})` : ""}
              </button>
            )}
            {!readonly && (
              <button
                onClick={() => setOpenNew(true)}
                className="inline-flex items-center gap-2 bg-primary text-primary-foreground font-semibold px-4 py-2 rounded-lg text-sm hover:bg-primary/90"
              >
                <Plus className="h-4 w-4" /> Nova Atividade
              </button>
            )}
            {isMeuDia && filterOpen && (
              <FiltroPopover
                onClose={() => setFilterOpen(false)}
                statusSel={statusMulti}
                setStatusSel={setStatusMulti}
                prioSel={prioMulti}
                setPrioSel={setPrioMulti}
                clienteSel={clienteMulti}
                setClienteSel={setClienteMulti}
                clientes={clientesCarteira}
              />
            )}
          </div>
        </div>

        {/* Chips de filtros ativos (Meu Dia) */}
        {isMeuDia && activeFilterCount > 0 && (
          <div className="mt-3 flex flex-wrap items-center gap-1.5">
            {[...statusMulti].map((s) => (
              <FilterChip
                key={`s-${s}`}
                label={`Status: ${s}`}
                onRemove={() => {
                  const n = new Set(statusMulti)
                  n.delete(s)
                  setStatusMulti(n)
                }}
              />
            ))}
            {[...prioMulti].map((p) => (
              <FilterChip
                key={`p-${p}`}
                label={`Prioridade: ${p}`}
                onRemove={() => {
                  const n = new Set(prioMulti)
                  n.delete(p)
                  setPrioMulti(n)
                }}
              />
            ))}
            {[...clienteMulti].map((id) => {
              const c = clientes.find((x) => x.id === id)
              return (
                <FilterChip
                  key={`c-${id}`}
                  label={`Cliente: ${c?.nome ?? id}`}
                  onRemove={() => {
                    const n = new Set(clienteMulti)
                    n.delete(id)
                    setClienteMulti(n)
                  }}
                />
              )
            })}
            <button
              onClick={() => {
                setStatusMulti(new Set())
                setPrioMulti(new Set())
                setClienteMulti(new Set())
              }}
              className="text-[11px] text-muted-foreground hover:text-foreground underline ml-1"
            >
              limpar
            </button>
          </div>
        )}

        {/* View toggle */}
        {!fixedView && (
          <div className="mt-4 flex items-center gap-1 bg-card border border-border rounded-lg p-1 w-fit">
            {(["dia", "semana", "mes"] as ViewMode[]).map((v) => (
              <button
                key={v}
                onClick={() => setView(v)}
                className={`px-4 py-1.5 rounded-md text-xs font-semibold capitalize transition-colors ${
                  view === v
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {v === "dia" ? "📅 Dia" : v === "semana" ? "📆 Semana" : "🗓 Mês"}
              </button>
            ))}
          </div>
        )}

        {/* Filters row (ocultada no Meu Dia — usa popover) */}
        <div className="mt-3 flex flex-col gap-2">
          {!isMeuDia && (
            <>
              <FilterRow
                label="Status"
                value={statusFilter}
                onChange={(v) => setStatusFilter(v as StatusFilter)}
                options={[
                  { v: "all", l: "Todas", emoji: "" },
                  { v: "Pendente", l: "Pendente", emoji: "⬜" },
                  { v: "Em andamento", l: "Em andamento", emoji: "🔵" },
                  { v: "Aguardando cliente", l: "Aguard. cliente", emoji: "🟣" },
                  { v: "Aguardando time interno", l: "Aguard. time", emoji: "🟠" },
                  { v: "Concluída", l: "Concluída", emoji: "✅" },
                  { v: "Atrasada", l: "Atrasada", emoji: "⚠️" },
                  { v: "Impedida", l: "Impedida", emoji: "🚫" },
                ]}
              />
              <FilterRow
                label="Prioridade"
                value={prioFilter}
                onChange={(v) => setPrioFilter(v as PrioFilter)}
                options={[
                  { v: "all", l: "Todas", emoji: "" },
                  { v: "Urgente", l: "Urgente", emoji: "🔴" },
                  { v: "Médio", l: "Médio", emoji: "🟡" },
                  { v: "Normal", l: "Normal", emoji: "🟢" },
                ]}
              />
            </>
          )}

          {/* Meu Dia / Atividades são pessoais: sem seletor de CS aqui. */}
        </div>

        {(view === "meudia" || view === "dia" || view === "semana") && (
          <div className="mt-3">
            <RotinaDeHoje csName={csName} clientes={clientes} atividades={atividades} />
          </div>
        )}
      </header>

      {view === "meudia" && (
        <MeuDiaView
          atividades={visiveis}
          clientes={clientes}
          readonly={readonly}
          setStatus={setStatus}
          onDetail={setDetailId}
          onDelete={delAtividade}
          onEditDependencia={openDependenciaModal}
          userKey={nomeExibicao}
          csName={csName}
          day={meuDiaDay}
        />
      )}
      {view === "dia" && (
        <DiaView
          atividades={visiveis}
          clientes={clientes}
          selected={selected}
          setSelected={setSelected}
          readonly={readonly}
          profileCS={profileCS}
          setStatus={setStatus}
          onOpenNew={() => setOpenNew(true)}
          onDetail={setDetailId}
        />
      )}
      {view === "semana" && (
        <SemanaView
          atividades={visiveis}
          clientes={clientes}
          selected={selected}
          setSelected={setSelected}
          profileCS={profileCS}
          onDetail={setDetailId}
        />
      )}
      {view === "mes" && (
        <MesView
          atividades={visiveis}
          clientes={clientes}
          selected={selected}
          setSelected={setSelected}
          profileCS={profileCS}
          onDetail={setDetailId}
          setStatus={setStatus}
          readonly={readonly}
        />
      )}

      {openNew && (
        <NovaAtividadeModal
          defaultDate={selected.toISOString().slice(0, 10)}
          onClose={() => setOpenNew(false)}
        />
      )}

      {nextAction && (() => {
        const cli = clientes.find((c) => c.id === nextAction.clienteId)
        if (!cli) return null
        return (
          <NextActionModal
            cliente={cli}
            cs={nextAction.cs}
            concluidaId={nextAction.atividadeId}
            onClose={() => setNextAction(null)}
          />
        )
      })()}

      {detailId && (() => {
        const a = atividades.find((x) => x.id === detailId)
        if (!a) return null
        return (
          <DetailPanel
            atividade={a}
            clientes={clientes}
            onClose={() => setDetailId(null)}
            readonly={readonly}
            setStatus={setStatus}
            onDelete={() => delAtividade(a.id)}
            onEditDependencia={() => openDependenciaModal(a.id)}
          />
        )
      })()}

      {waitingModal && (
        <WaitingReasonModal
          atividade={waitingModal.atividade}
          status={waitingModal.status}
          cliente={clientes.find((c) => c.id === waitingModal.atividade.cliente_id) ?? null}
          onClose={() => setWaitingModal(null)}
          onSave={(patch) => {
            const base = waitingModal.atividade
            const status_desde =
              base.status === waitingModal.status
                ? base.status_desde ?? new Date().toISOString()
                : new Date().toISOString()
            mutar(
              updateAtividade(base.id, {
                status: waitingModal.status,
                motivo_impedimento: patch.motivo,
                dependencia_nome: patch.quem,
                status_desde,
              }),
            )
            setWaitingModal(null)
          }}
        />
      )}
    </div>
  )
}

function FilterRow({
  label,
  value,
  onChange,
  options,
}: {
  label: string
  value: string
  onChange: (v: string) => void
  options: { v: string; l: string; emoji: string }[]
}) {
  return (
    <div className="flex items-center gap-2 flex-wrap">
      <span className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">
        {label}:
      </span>
      {options.map((o) => (
        <button
          key={o.v}
          onClick={() => onChange(o.v)}
          className={`px-3 py-1 rounded-full text-xs font-semibold border transition-colors ${
            value === o.v
              ? "bg-primary text-primary-foreground border-primary"
              : "bg-card text-muted-foreground border-border hover:border-primary"
          }`}
        >
          {o.emoji && <span className="mr-1">{o.emoji}</span>}
          {o.l}
        </button>
      ))}
    </div>
  )
}

// ============ DIA VIEW ============

function DiaView({
  atividades,
  clientes,
  selected,
  setSelected,
  readonly,
  profileCS,
  setStatus,
  onOpenNew,
  onDetail,
}: {
  atividades: Atividade[]
  clientes: Cliente[]
  selected: Date
  setSelected: (d: Date) => void
  readonly: boolean
  profileCS: CSName | null
  setStatus: (id: string, st: AtividadeStatus) => void
  onOpenNew: () => void
  onDetail: (id: string) => void
}) {
  const [calMonth, setCalMonth] = useState(() => new Date(selected.getFullYear(), selected.getMonth(), 1))

  function shiftDay(delta: number) {
    const n = new Date(selected)
    n.setDate(n.getDate() + delta)
    setSelected(n)
    setCalMonth(new Date(n.getFullYear(), n.getMonth(), 1))
  }

  const doDia = useMemo(
    () => atividades.filter((a) => sameDay(a.data_prevista, selected.toISOString())),
    [atividades, selected],
  )

  // Buckets
  const atrasadas = doDia.filter((a) => effectiveStatus(a) === "Atrasada")
  const urgentes = doDia.filter((a) => a.prioridade === "Urgente" && effectiveStatus(a) !== "Atrasada" && a.status !== "Concluída")
  const medio = doDia.filter((a) => a.prioridade === "Médio" && effectiveStatus(a) !== "Atrasada" && a.status !== "Concluída")
  const normal = doDia.filter((a) => a.prioridade === "Normal" && effectiveStatus(a) !== "Atrasada" && a.status !== "Concluída")
  const concluidas = doDia.filter((a) => a.status === "Concluída")

  // Semana resumo
  const weekRange = useMemo(() => {
    const s = new Date(selected)
    const day = s.getDay()
    const start = startOfDay(new Date(s))
    start.setDate(s.getDate() - day)
    const end = new Date(start)
    end.setDate(start.getDate() + 7)
    return [start, end] as const
  }, [selected])
  const semana = atividades.filter((a) => {
    const t = new Date(a.data_prevista).getTime()
    return t >= weekRange[0].getTime() && t < weekRange[1].getTime()
  })
  const wkConcl = semana.filter((a) => a.status === "Concluída").length
  const wkPend = semana.filter((a) => a.status === "Pendente" || a.status === "Em andamento").length
  const wkAtr = semana.filter((a) => effectiveStatus(a) === "Atrasada").length

  function dayDot(d: Date): string | null {
    const dayActs = atividades.filter((a) => sameDay(a.data_prevista, d.toISOString()))
    if (dayActs.length === 0) return null
    if (dayActs.some((a) => effectiveStatus(a) === "Atrasada")) return "bg-status-red"
    if (dayActs.some((a) => a.status === "Pendente" || a.status === "Em andamento")) return "bg-status-yellow"
    if (dayActs.every((a) => a.status === "Concluída")) return "bg-status-green"
    return "bg-status-gray"
  }

  const calStart = new Date(calMonth)
  calStart.setDate(1 - calStart.getDay())
  const calDays: Date[] = []
  for (let i = 0; i < 42; i++) {
    const d = new Date(calStart)
    d.setDate(calStart.getDate() + i)
    calDays.push(d)
  }

  const isToday = sameDay(selected.toISOString(), new Date().toISOString())

  return (
    <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
      <section className="lg:col-span-3 space-y-4">
        <div className="bg-card border border-border rounded-lg p-5 flex items-center justify-between">
          <div>
            <div className="text-[11px] uppercase tracking-wider text-muted-foreground">
              {isToday ? "Hoje" : WEEKDAYS[selected.getDay()]}
            </div>
            <div className="text-xl font-bold mt-0.5">
              {WEEKDAYS[selected.getDay()]}, {fmtDate(selected)}
            </div>
            <div className="text-xs text-muted-foreground mt-1">
              {doDia.length} atividade{doDia.length === 1 ? "" : "s"} para este dia
            </div>
          </div>
          <div className="flex items-center gap-1">
            <button onClick={() => shiftDay(-1)} className="h-9 w-9 rounded-lg border border-border hover:border-primary flex items-center justify-center">
              <ChevronLeft className="h-4 w-4" />
            </button>
            <button onClick={() => { const d = new Date(); d.setHours(12,0,0,0); setSelected(d); setCalMonth(new Date(d.getFullYear(), d.getMonth(), 1)) }} className="text-xs px-3 h-9 rounded-lg border border-border hover:border-primary">
              Hoje
            </button>
            <button onClick={() => shiftDay(1)} className="h-9 w-9 rounded-lg border border-border hover:border-primary flex items-center justify-center">
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>

        {doDia.length === 0 ? (
          <div className="bg-card border border-border rounded-lg p-10 text-center">
            <CalendarDays className="h-10 w-10 mx-auto text-muted-foreground/60" />
            <div className="mt-3 text-sm text-muted-foreground">Nenhuma atividade para este dia</div>
            {!readonly && (
              <button onClick={onOpenNew} className="mt-4 inline-flex items-center gap-2 bg-primary text-primary-foreground font-semibold px-4 py-2 rounded-lg text-sm">
                <Plus className="h-4 w-4" /> Adicionar atividade
              </button>
            )}
          </div>
        ) : (
          <div className="space-y-5">
            <DiaGroup title="ATRASADAS" emoji="⚠️" color="text-[#EF4444]" items={atrasadas} clientes={clientes} onDetail={onDetail} setStatus={setStatus} profileCS={profileCS} readonly={readonly} />
            <DiaGroup title="URGENTES" emoji="🔴" color="text-[#EF4444]/90" items={urgentes} clientes={clientes} onDetail={onDetail} setStatus={setStatus} profileCS={profileCS} readonly={readonly} />
            <DiaGroup title="MÉDIO" emoji="🟡" color="text-[#F59E0B]" items={medio} clientes={clientes} onDetail={onDetail} setStatus={setStatus} profileCS={profileCS} readonly={readonly} />
            <DiaGroup title="NORMAL" emoji="🟢" color="text-[#9CA3AF]" items={normal} clientes={clientes} onDetail={onDetail} setStatus={setStatus} profileCS={profileCS} readonly={readonly} />
            <DiaGroup title="CONCLUÍDAS" emoji="✅" color="text-[#22C55E]" items={concluidas} clientes={clientes} onDetail={onDetail} setStatus={setStatus} profileCS={profileCS} readonly={readonly} collapsedDefault striked />
          </div>
        )}
      </section>

      <aside className="lg:col-span-2 space-y-4">
        <div className="bg-card border border-border rounded-lg p-4">
          <div className="flex items-center justify-between mb-3">
            <div className="font-semibold text-sm">{MONTHS[calMonth.getMonth()]} {calMonth.getFullYear()}</div>
            <div className="flex items-center gap-1">
              <button onClick={() => setCalMonth(new Date(calMonth.getFullYear(), calMonth.getMonth() - 1, 1))} className="h-7 w-7 rounded-md hover:bg-background flex items-center justify-center">
                <ChevronLeft className="h-4 w-4" />
              </button>
              <button onClick={() => setCalMonth(new Date(calMonth.getFullYear(), calMonth.getMonth() + 1, 1))} className="h-7 w-7 rounded-md hover:bg-background flex items-center justify-center">
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </div>
          <div className="grid grid-cols-7 gap-1 mb-1">
            {WD_MINI.map((d, i) => (
              <div key={i} className="text-center text-[10px] text-muted-foreground font-semibold py-1">{d}</div>
            ))}
          </div>
          <div className="grid grid-cols-7 gap-1">
            {calDays.map((d, i) => {
              const inMonth = d.getMonth() === calMonth.getMonth()
              const isSel = sameDay(d.toISOString(), selected.toISOString())
              const isHoje = sameDay(d.toISOString(), new Date().toISOString())
              const dot = dayDot(d)
              return (
                <button
                  key={i}
                  onClick={() => {
                    const nd = new Date(d)
                    nd.setHours(12, 0, 0, 0)
                    setSelected(nd)
                    if (nd.getMonth() !== calMonth.getMonth()) setCalMonth(new Date(nd.getFullYear(), nd.getMonth(), 1))
                  }}
                  className={`relative aspect-square flex flex-col items-center justify-center rounded-md text-xs transition-all ${
                    isSel
                      ? "bg-primary text-primary-foreground font-bold"
                      : inMonth
                        ? "hover:bg-background text-foreground"
                        : "text-muted-foreground/40"
                  } ${isHoje && !isSel ? "ring-2 ring-primary/60" : ""}`}
                >
                  <span>{d.getDate()}</span>
                  {dot && <span className={`h-1 w-1 rounded-full mt-0.5 ${dot}`} />}
                </button>
              )
            })}
          </div>
        </div>

        <div className="bg-card border border-border rounded-lg p-4">
          <div className="text-[11px] uppercase tracking-wider text-muted-foreground mb-3 font-semibold">
            Resumo da semana
          </div>
          <div className="flex items-center justify-between text-sm flex-wrap gap-2">
            <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-status-green" /> ✅ {wkConcl} concluídas</span>
            <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-status-yellow" /> ⏳ {wkPend} pendentes</span>
            <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-status-red" /> ⚠️ {wkAtr} atrasadas</span>
          </div>
        </div>
      </aside>
    </div>
  )
}

function DiaGroup({
  title, emoji, color, items, clientes, onDetail, setStatus, profileCS, readonly, collapsedDefault, striked,
}: {
  title: string
  emoji: string
  color: string
  items: Atividade[]
  clientes: Cliente[]
  onDetail: (id: string) => void
  setStatus: (id: string, st: AtividadeStatus) => void
  profileCS: CSName | null
  readonly: boolean
  collapsedDefault?: boolean
  striked?: boolean
}) {
  const [open, setOpen] = useState(!collapsedDefault)
  if (items.length === 0) return null
  return (
    <div className="space-y-2">
      <button onClick={() => setOpen((v) => !v)} className="w-full flex items-center justify-between px-2">
        <div className={`text-[11px] font-bold uppercase tracking-wider ${color}`}>
          {emoji} {title} · {items.length}
        </div>
        <span className="text-[10px] text-muted-foreground">{open ? "ocultar" : "mostrar"}</span>
      </button>
      {open && [...items]
        .sort((a, b) => (a.hora || "99:99").localeCompare(b.hora || "99:99"))
        .map((a) => (
          <ActivityCard
            key={a.id}
            atividade={a}
            clientes={clientes}
            onDetail={onDetail}
            setStatus={setStatus}
            profileCS={profileCS}
            readonly={readonly}
            striked={striked}
          />
        ))}
    </div>
  )
}

function ActivityCard({
  atividade: a, clientes, onDetail, setStatus, profileCS, readonly, striked,
}: {
  atividade: Atividade
  clientes: Cliente[]
  onDetail: (id: string) => void
  setStatus: (id: string, st: AtividadeStatus) => void
  profileCS: CSName | null
  readonly: boolean
  striked?: boolean
}) {
  const eff = effectiveStatus(a)
  const cli = clientes.find((c) => c.id === a.cliente_id)
  const idMap = useMemo(() => buildDisplayIdMap(clientes), [clientes])
  const [menu, setMenu] = useState(false)

  const title = a.acao && a.entrega ? `${a.acao} · ${a.entrega}` : a.titulo

  return (
    <div className="relative bg-card border border-border rounded-lg overflow-hidden hover:border-primary/60 transition-colors">
      <div className="flex items-stretch">
        <div className={`w-1 shrink-0 ${STATUS_BAR[eff]}`} />
        <div className="flex-1 p-4">
          <div className="flex items-center gap-2 flex-wrap mb-1.5">
            <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold border ${STATUS_PILL[eff]}`}>
              <span>{STATUS_EMOJI[eff]}</span> {eff}
            </span>
            <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold border ${PRIO_PILL[a.prioridade]}`}>
              {PRIO_EMOJI[a.prioridade]} {a.prioridade}
            </span>
            {a.hora && (
              <span className="text-[10px] font-semibold text-muted-foreground tabular-nums">{a.hora}</span>
            )}
          </div>
          <button
            onClick={() => onDetail(a.id)}
            className={`block text-left font-bold text-sm leading-snug hover:text-primary ${striked ? "line-through text-muted-foreground" : ""}`}
          >
            {title}
          </button>
          <button
            onClick={(e) => { e.stopPropagation(); if (cli) openCliente(cli.id) }}
            className="text-xs text-muted-foreground hover:text-primary mt-0.5 text-left"
          >
            {cli && <span className="font-mono font-bold text-primary mr-1.5">{idMap.get(cli.id)}</span>}
            {cli ? cli.nome : <span className="italic">Tarefa geral (sem cliente)</span>}
            {cli?.empresa && <span className="text-foreground/60"> · {cli.empresa}</span>}
            {!profileCS && <span> · {a.cs_responsavel}</span>}
          </button>
        </div>
        {!readonly && a.status !== "Concluída" && (
          <div className="flex items-center gap-1 px-3 shrink-0">
            {a.status !== "Em andamento" && (
              <button
                onClick={() => setStatus(a.id, "Em andamento")}
                className="inline-flex items-center gap-1 text-[10px] px-2 py-1 rounded-md border border-[#60A5FA]/40 text-[#60A5FA] hover:bg-[#60A5FA]/10"
              >
                <Play className="h-3 w-3" /> Iniciar
              </button>
            )}
            <button
              onClick={() => setStatus(a.id, "Concluída")}
              className="inline-flex items-center gap-1 text-[10px] px-2 py-1 rounded-md border border-[#22C55E]/40 text-[#22C55E] hover:bg-[#22C55E]/10"
            >
              <Check className="h-3 w-3" /> Feito
            </button>
            <button
              onClick={() => setMenu((v) => !v)}
              className="text-muted-foreground hover:text-foreground text-xs px-1"
              title="Mais"
            >
              ⋯
            </button>
            {menu && (
              <>
                <div className="fixed inset-0 z-20" onClick={() => setMenu(false)} />
                <div className="absolute right-2 top-full mt-1 z-30 w-44 bg-card border border-border rounded-lg shadow-lg overflow-hidden">
                  {(["Pendente", "Em andamento", "Impedida"] as AtividadeStatus[]).map((st) => (
                    <button
                      key={st}
                      onClick={() => { setStatus(a.id, st); setMenu(false) }}
                      className="w-full flex items-center gap-2 px-3 py-2 text-xs hover:bg-background"
                    >
                      <span>{STATUS_EMOJI[st]}</span> Marcar como {st}
                      {st === "Impedida" && <Ban className="h-3 w-3 ml-auto text-[#F97316]" />}
                    </button>
                  ))}
                </div>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

// ============ SEMANA VIEW ============

function SemanaView({
  atividades, clientes, selected, setSelected, profileCS, onDetail,
}: {
  atividades: Atividade[]
  clientes: Cliente[]
  selected: Date
  setSelected: (d: Date) => void
  profileCS: CSName | null
  onDetail: (id: string) => void
}) {
  // semana Seg-Sex baseada em selected
  const monday = useMemo(() => {
    const s = startOfDay(new Date(selected))
    const day = s.getDay()
    const diff = day === 0 ? -6 : 1 - day // domingo recua 6
    s.setDate(s.getDate() + diff)
    return s
  }, [selected])
  const dias: Date[] = Array.from({ length: 5 }, (_, i) => {
    const d = new Date(monday)
    d.setDate(monday.getDate() + i)
    return d
  })
  const idMap = useMemo(() => buildDisplayIdMap(clientes), [clientes])

  function shiftWeek(delta: number) {
    const n = new Date(selected)
    n.setDate(n.getDate() + delta * 7)
    setSelected(n)
  }

  // atrasadas anteriores (antes da semana)
  const atrasadasAnteriores = atividades.filter((a) => {
    const t = new Date(a.data_prevista).getTime()
    return effectiveStatus(a) === "Atrasada" && t < monday.getTime()
  })

  // semana total
  const semanaList = atividades.filter((a) => {
    const t = new Date(a.data_prevista).getTime()
    const end = new Date(monday)
    end.setDate(monday.getDate() + 5)
    return t >= monday.getTime() && t < end.getTime()
  })
  const wkConcl = semanaList.filter((a) => a.status === "Concluída").length
  const wkAtr = semanaList.filter((a) => effectiveStatus(a) === "Atrasada").length
  const wkPend = semanaList.filter((a) => a.status === "Pendente" || a.status === "Em andamento").length
  const total = semanaList.length + atrasadasAnteriores.length
  const pct = semanaList.length > 0 ? Math.round((wkConcl / semanaList.length) * 100) : 0

  const weekNum = getWeekNumber(monday)

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <div className="text-sm font-semibold">
          {fmtShort(monday)} – {fmtShort(dias[4])} · Semana {weekNum}
        </div>
        <div className="flex items-center gap-1">
          <button onClick={() => shiftWeek(-1)} className="h-9 w-9 rounded-lg border border-border hover:border-primary flex items-center justify-center">
            <ChevronLeft className="h-4 w-4" />
          </button>
          <button onClick={() => { const d = new Date(); d.setHours(12,0,0,0); setSelected(d) }} className="text-xs px-3 h-9 rounded-lg border border-border hover:border-primary">
            Esta semana
          </button>
          <button onClick={() => shiftWeek(1)} className="h-9 w-9 rounded-lg border border-border hover:border-primary flex items-center justify-center">
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      </div>

      <div className="grid grid-cols-5 gap-3">
        {dias.map((d, i) => {
          const isHoje = sameDay(d.toISOString(), new Date().toISOString())
          const dayActs = atividades.filter((a) => sameDay(a.data_prevista, d.toISOString()))
          const extras = i === 0 ? atrasadasAnteriores : []
          const all = [...extras, ...dayActs].sort((a, b) => (a.hora || "99:99").localeCompare(b.hora || "99:99"))
          return (
            <div
              key={i}
              className={`bg-card border rounded-lg flex flex-col min-h-[400px] ${
                isHoje ? "border-primary bg-primary/5" : "border-border"
              }`}
            >
              <div className={`px-3 py-2 border-b border-border ${isHoje ? "bg-primary/10" : ""}`}>
                <div className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">
                  {WEEKDAYS_SHORT[d.getDay()]} · {fmtShort(d)}
                </div>
                <div className="text-xs font-bold mt-0.5">{all.length} ativ.</div>
              </div>
              <div className="p-2 flex-1 space-y-2 overflow-y-auto max-h-[600px]">
                {all.length === 0 && (
                  <div className="text-[10px] text-muted-foreground text-center py-6">—</div>
                )}
                {all.map((a) => {
                  const eff = effectiveStatus(a)
                  const cli = clientes.find((c) => c.id === a.cliente_id)
                  const isExtra = extras.includes(a)
                  return (
                    <button
                      key={a.id}
                      onClick={() => onDetail(a.id)}
                      className="w-full text-left bg-background border border-border rounded-md overflow-hidden hover:border-primary/60 transition-colors"
                    >
                      <div className="flex">
                        <div className={`w-1 shrink-0 ${STATUS_BAR[eff]}`} />
                        <div className="flex-1 p-2 space-y-1">
                          {isExtra && (
                            <span className="inline-block px-1.5 py-0.5 rounded text-[9px] font-bold bg-[#EF4444]/20 text-[#EF4444] border border-[#EF4444]/40">
                              ⚠️ Atrasada
                            </span>
                          )}
                          <div className="flex items-center gap-1">
                            <span className="text-xs">{PRIO_EMOJI[a.prioridade]}</span>
                            {a.hora && <span className="text-[9px] text-muted-foreground tabular-nums">{a.hora}</span>}
                          </div>
                          <div className="text-xs font-semibold leading-tight line-clamp-2">
                            {a.acao && a.entrega ? `${a.acao} · ${a.entrega}` : a.titulo}
                          </div>
                          {cli && (
                            <div className="text-[10px] text-muted-foreground">
                              <span className="font-mono font-bold text-primary">{idMap.get(cli.id)}</span> · {cli.empresa || cli.nome}
                            </div>
                          )}
                          <span className={`inline-block px-1.5 py-0.5 rounded text-[9px] font-bold border ${STATUS_PILL[eff]}`}>
                            {STATUS_EMOJI[eff]} {eff}
                          </span>
                          {!profileCS && (
                            <div className="text-[9px] text-muted-foreground">CS: {a.cs_responsavel}</div>
                          )}
                        </div>
                      </div>
                    </button>
                  )
                })}
              </div>
            </div>
          )
        })}
      </div>

      <div className="bg-card border border-border rounded-lg px-4 py-3 text-sm flex items-center justify-between flex-wrap gap-2">
        <span className="font-semibold">Semana {weekNum}</span>
        <span className="text-muted-foreground">
          {total} atividades · {wkConcl} concluídas ({pct}%) · {wkAtr} atrasadas · {wkPend} pendentes
        </span>
      </div>
    </div>
  )
}

function getWeekNumber(d: Date): number {
  const date = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()))
  const dayNum = date.getUTCDay() || 7
  date.setUTCDate(date.getUTCDate() + 4 - dayNum)
  const yearStart = new Date(Date.UTC(date.getUTCFullYear(), 0, 1))
  return Math.ceil(((date.getTime() - yearStart.getTime()) / 86400000 + 1) / 7)
}

// ============ MES VIEW ============

function MesView({
  atividades, clientes, selected, setSelected, profileCS, onDetail, setStatus, readonly,
}: {
  atividades: Atividade[]
  clientes: Cliente[]
  selected: Date
  setSelected: (d: Date) => void
  profileCS: CSName | null
  onDetail: (id: string) => void
  setStatus: (id: string, st: AtividadeStatus) => void
  readonly: boolean
}) {
  const [month, setMonth] = useState(() => new Date(selected.getFullYear(), selected.getMonth(), 1))
  const [sideDay, setSideDay] = useState<Date | null>(null)

  const start = new Date(month)
  start.setDate(1 - start.getDay())
  const days: Date[] = Array.from({ length: 42 }, (_, i) => {
    const d = new Date(start)
    d.setDate(start.getDate() + i)
    return d
  })

  const monthAct = atividades.filter((a) => {
    const t = new Date(a.data_prevista)
    return t.getMonth() === month.getMonth() && t.getFullYear() === month.getFullYear()
  })
  const mConcl = monthAct.filter((a) => a.status === "Concluída").length
  const mPend = monthAct.filter((a) => a.status === "Pendente" || a.status === "Em andamento").length
  const mAtr = monthAct.filter((a) => effectiveStatus(a) === "Atrasada").length

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <div className="text-sm font-semibold">{MONTHS[month.getMonth()]} {month.getFullYear()}</div>
        <div className="flex items-center gap-1">
          <button onClick={() => setMonth(new Date(month.getFullYear(), month.getMonth() - 1, 1))} className="h-9 w-9 rounded-lg border border-border hover:border-primary flex items-center justify-center">
            <ChevronLeft className="h-4 w-4" />
          </button>
          <button onClick={() => { const d = new Date(); setMonth(new Date(d.getFullYear(), d.getMonth(), 1)) }} className="text-xs px-3 h-9 rounded-lg border border-border hover:border-primary">
            Este mês
          </button>
          <button onClick={() => setMonth(new Date(month.getFullYear(), month.getMonth() + 1, 1))} className="h-9 w-9 rounded-lg border border-border hover:border-primary flex items-center justify-center">
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      </div>

      <div className="bg-card border border-border rounded-lg overflow-hidden">
        <div className="grid grid-cols-7 border-b border-border">
          {WEEKDAYS_SHORT.map((d) => (
            <div key={d} className="text-center text-[10px] font-bold uppercase text-muted-foreground py-2">{d}</div>
          ))}
        </div>
        <div className="grid grid-cols-7">
          {days.map((d, i) => {
            const inMonth = d.getMonth() === month.getMonth()
            const isHoje = sameDay(d.toISOString(), new Date().toISOString())
            const dayActs = atividades.filter((a) => sameDay(a.data_prevista, d.toISOString()))
            const hasAtr = dayActs.some((a) => effectiveStatus(a) === "Atrasada")
            const visible = dayActs.slice(0, 3)
            const more = dayActs.length - visible.length
            return (
              <button
                key={i}
                onClick={() => { setSideDay(d); setSelected(d) }}
                className={`text-left min-h-[100px] border-r border-b border-border p-1.5 hover:bg-background transition-colors ${
                  isHoje ? "ring-2 ring-primary ring-inset" : ""
                } ${!inMonth ? "opacity-40" : ""}`}
              >
                <div className={`text-xs font-bold mb-1 ${hasAtr ? "text-[#EF4444]" : "text-foreground"}`}>
                  {d.getDate()}
                </div>
                <div className="space-y-0.5">
                  {visible.map((a) => {
                    const cli = clientes.find((c) => c.id === a.cliente_id)
                    return (
                      <div
                        key={a.id}
                        className={`text-[9px] px-1.5 py-0.5 rounded truncate border ${PRIO_PILL[a.prioridade]}`}
                        title={a.titulo}
                      >
                        {PRIO_EMOJI[a.prioridade]} {(a.acao || a.titulo).slice(0, 18)}
                        {cli && <span className="opacity-70"> · {cli.empresa || cli.nome}</span>}
                      </div>
                    )
                  })}
                  {more > 0 && (
                    <div className="text-[9px] text-muted-foreground font-semibold pl-1.5">+{more} mais</div>
                  )}
                </div>
              </button>
            )
          })}
        </div>
      </div>

      <div className="bg-card border border-border rounded-lg px-4 py-3 text-sm flex items-center justify-between flex-wrap gap-2">
        <span className="font-semibold">{MONTHS[month.getMonth()]}</span>
        <span className="text-muted-foreground">
          {monthAct.length} atividades · {mConcl} concluídas · {mPend} pendentes · {mAtr} atrasadas
        </span>
      </div>

      {sideDay && (
        <div className="fixed inset-0 z-40 flex">
          <div className="flex-1 bg-black/50" onClick={() => setSideDay(null)} />
          <aside className="w-full max-w-md bg-background border-l border-border overflow-y-auto">
            <div className="p-5 border-b border-border flex items-center justify-between">
              <div>
                <div className="text-[11px] uppercase tracking-wider text-muted-foreground">
                  {WEEKDAYS[sideDay.getDay()]}
                </div>
                <div className="text-lg font-bold">{fmtDate(sideDay)}</div>
              </div>
              <button onClick={() => setSideDay(null)} className="text-muted-foreground hover:text-foreground">
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="p-4 space-y-2">
              {atividades.filter((a) => sameDay(a.data_prevista, sideDay.toISOString())).length === 0 && (
                <div className="text-center text-sm text-muted-foreground py-10">Sem atividades neste dia</div>
              )}
              {atividades
                .filter((a) => sameDay(a.data_prevista, sideDay.toISOString()))
                .sort((a, b) => (a.hora || "99:99").localeCompare(b.hora || "99:99"))
                .map((a) => (
                  <ActivityCard
                    key={a.id}
                    atividade={a}
                    clientes={clientes}
                    onDetail={(id) => { setSideDay(null); onDetail(id) }}
                    setStatus={setStatus}
                    profileCS={profileCS}
                    readonly={readonly}
                  />
                ))}
            </div>
          </aside>
        </div>
      )}
    </div>
  )
}

// ============ DETAIL PANEL ============

function DetailPanel({
  atividade: a, clientes, onClose, readonly, setStatus, onDelete, onEditDependencia,
}: {
  atividade: Atividade
  clientes: Cliente[]
  onClose: () => void
  readonly: boolean
  setStatus: (id: string, st: AtividadeStatus) => void
  onDelete: () => void
  onEditDependencia: () => void
}) {
  const eff = effectiveStatus(a)
  const cli = clientes.find((c) => c.id === a.cliente_id)
  const idMap = useMemo(() => buildDisplayIdMap(clientes), [clientes])
  const title = a.acao && a.entrega ? `${a.acao} · ${a.entrega}` : a.titulo

  const aguardando = a.status === "Aguardando cliente" || a.status === "Aguardando time interno"
  const isConcluida = a.status === "Concluída"

  function cobrar() {
    const alvo = a.status === "Aguardando cliente"
      ? cli?.nome ?? "cliente"
      : a.dependencia_nome?.trim() || "time interno"
    const nota = window.prompt(`Registrar cobrança para ${alvo}. O que foi cobrado?`, "")
    if (nota === null) return
    const stamp = new Date()
    const linha = `[Cobrança ${stamp.toLocaleDateString("pt-BR")}] ${nota.trim()}`.trim()
    const descricao = a.descricao ? `${a.descricao}\n${linha}` : linha
    mutar(updateAtividade(a.id, { descricao, status_desde: stamp.toISOString() }))
  }

  const primary: { label: string; onClick: () => void } | null = isConcluida
    ? null
    : aguardando
      ? { label: "Cobrar", onClick: cobrar }
      : a.status === "Em andamento"
        ? { label: "Concluir", onClick: () => { setStatus(a.id, "Concluída"); onClose() } }
        : { label: "Iniciar", onClick: () => setStatus(a.id, "Em andamento") }

  const STATUS_OPTIONS: AtividadeStatus[] = [
    "Pendente",
    "Em andamento",
    "Aguardando cliente",
    "Aguardando time interno",
    "Impedida",
    "Concluída",
  ]

  const diasDesde = a.status_desde
    ? Math.max(0, Math.floor((Date.now() - new Date(a.status_desde).getTime()) / 86400000))
    : null

  const quem = a.status === "Aguardando cliente"
    ? cli?.nome ?? "cliente"
    : a.status === "Aguardando time interno"
      ? a.dependencia_nome?.trim() || "time interno"
      : null

  function handleDelete() {
    if (window.confirm("Excluir esta tarefa? Esta ação não pode ser desfeita.")) {
      onDelete()
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex">
      <div className="flex-1 bg-black/50" onClick={onClose} />
      <aside className="w-full max-w-md bg-background border-l border-border overflow-y-auto flex flex-col">
        <div className="p-5 border-b border-border flex items-start justify-between gap-3">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold border ${PRIO_PILL[a.prioridade]}`}>
                {PRIO_EMOJI[a.prioridade]} {a.prioridade}
              </span>
              <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold border ${STATUS_PILL[eff]}`}>
                {STATUS_EMOJI[eff]} {eff}
              </span>
            </div>
            <div className="text-lg font-bold leading-tight">{title}</div>
          </div>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground">
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Ação primária no topo */}
        {!readonly && primary && (
          <div className="p-5 border-b border-border">
            <button
              onClick={primary.onClick}
              className="w-full inline-flex items-center justify-center gap-2 px-3 py-2.5 rounded-lg bg-primary text-primary-foreground text-sm font-semibold hover:bg-primary/90"
            >
              {primary.label}
            </button>
          </div>
        )}

        <div className="p-5 space-y-4 text-sm flex-1">
          {cli && (
            <DetailRow label="Cliente">
              <div className="flex flex-col gap-1">
                <div>
                  <span className="font-mono font-bold text-primary mr-1.5">{idMap.get(cli.id)}</span>
                  {cli.nome}
                  {cli.empresa && <span className="text-muted-foreground"> · {cli.empresa}</span>}
                </div>
                <button
                  onClick={() => { openCliente(cli.id); onClose() }}
                  className="text-left text-[12px] text-primary hover:underline"
                >
                  Abrir Cliente 360 →
                </button>
              </div>
            </DetailRow>
          )}

          {/* Bloco de espera — editável */}
          {aguardando && (
            <DetailRow label="Aguardando">
              <div className="rounded-md border border-border p-3 flex flex-col gap-2">
                <div className="text-[13px]">
                  <span className="text-muted-foreground">Motivo: </span>
                  <span>{a.motivo_impedimento?.trim() || <span className="text-muted-foreground italic">sem motivo</span>}</span>
                </div>
                <div className="text-[13px]">
                  <span className="text-muted-foreground">Quem: </span>
                  <span>{quem}</span>
                </div>
                <div className="text-[12px] text-muted-foreground">
                  Parada há {diasDesde ?? 0} {(diasDesde ?? 0) === 1 ? "dia" : "dias"}
                </div>
                {!readonly && (
                  <button
                    onClick={onEditDependencia}
                    className="self-start text-[12px] text-primary hover:underline"
                  >
                    Editar motivo / quem
                  </button>
                )}
              </div>
            </DetailRow>
          )}

          <DetailRow label="Data">
            {fmtDate(new Date(a.data_prevista))} {a.hora && `· ${a.hora}`}
          </DetailRow>
          <DetailRow label="CS responsável">{a.cs_responsavel}</DetailRow>
          <DetailRow label="Tipo">{a.tipo}</DetailRow>
          {a.origem_label && <DetailRow label="Origem">{a.origem_label}</DetailRow>}
          {a.descricao && <DetailRow label="Observações"><div className="whitespace-pre-wrap">{a.descricao}</div></DetailRow>}
          <DetailRow label="Criação">{fmtDate(new Date(a.data_prevista))}</DetailRow>
          {a.data_conclusao && (
            <DetailRow label="Concluída em">{fmtDate(new Date(a.data_conclusao))}</DetailRow>
          )}

          {/* Seletor de status */}
          {!readonly && (
            <DetailRow label="Status">
              <select
                value={a.status}
                onChange={(e) => setStatus(a.id, e.target.value as AtividadeStatus)}
                className="w-full bg-card border border-border rounded-md px-3 py-2 text-sm hover:border-primary/50 focus:border-primary outline-none"
              >
                {STATUS_OPTIONS.map((s) => (
                  <option key={s} value={s}>{s === "Pendente" ? "A fazer" : s}</option>
                ))}
              </select>
            </DetailRow>
          )}
        </div>

        {/* Rodapé: link discreto de exclusão */}
        {!readonly && (
          <div className="p-5 border-t border-border">
            <button
              onClick={handleDelete}
              className="text-[12px] text-[#EF4444] hover:underline"
            >
              Excluir tarefa
            </button>
          </div>
        )}
      </aside>
    </div>
  )
}

function DetailRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <div className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold mb-1">{label}</div>
      <div className="text-sm">{children}</div>
    </div>
  )
}

// ============ ROTINA DE HOJE ============

function RotinaDeHoje({
  csName, clientes, atividades,
}: {
  csName: CSName | null
  clientes: Cliente[]
  atividades: Atividade[]
}) {
  const navigate = useNavigate()
  const dow = new Date().getDay()
  const semContato = useMemo(() => {
    const list = clientes.filter(
      (c) => (csName ? c.responsavel_cs === csName : true) && c.status !== "Cancelado",
    )
    return list.filter((c) => {
      const d = diasSemContato(c.id, atividades)
      return d !== null && d >= 14
    }).length
  }, [clientes, atividades, csName])

  const dayBadge =
    dow === 1
      ? { emoji: "📋", label: "Check Geral da Carteira", secao: "semanal" }
      : dow === 3
        ? { emoji: "⚙️", label: "Acompanhamento de Implementações", secao: "semanal" }
        : dow === 5
          ? { emoji: "🔍", label: "Varredura Final", secao: "semanal" }
          : null

  if (!dayBadge && semContato === 0) return null

  return (
    <div className="bg-card border border-border rounded-lg px-4 py-2.5 flex items-center justify-between gap-3 flex-wrap">
      <div className="flex items-center gap-2 flex-wrap">
        <span className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">
          Rotina de hoje
        </span>
        {dayBadge && (
          <button
            onClick={() => navigate(`/crm/atividades?periodo=semana&aba=rotinas&secao=${dayBadge.secao}`)}
            className="inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1 rounded-full bg-primary/10 text-primary border border-primary/30 hover:bg-primary/20"
          >
            <span>{dayBadge.emoji}</span> {dayBadge.label}
          </button>
        )}
        {semContato > 0 && (
          <button
            onClick={() => navigate("/crm/atividades?periodo=semana&aba=rotinas&secao=quinzenal")}
            className="inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1 rounded-full bg-status-red/15 text-status-red border border-status-red/40 hover:bg-status-red/25"
          >
            ⚠️ {semContato} cliente{semContato === 1 ? "" : "s"} sem contato há mais de 14 dias
          </button>
        )}
      </div>
    </div>
  )
}

// ============ MEU DIA VIEW ============

function MeuDiaView({
  atividades,
  clientes,
  readonly,
  setStatus,
  onDetail,
  onDelete,
  onEditDependencia,
  userKey: _userKey,
  csName,
  day,
}: {
  atividades: Atividade[]
  clientes: Cliente[]
  readonly: boolean
  setStatus: (id: string, st: AtividadeStatus) => void
  onDetail: (id: string) => void
  onDelete: (id: string) => void
  onEditDependencia: (id: string) => void
  userKey: string
  csName: CSName | null
  day: Date
}) {
  const today = startOfDay(day)
  const todayTs = today.getTime()
  const [concluidasOpen, setConcluidasOpen] = useState(false)

  // Único eixo: tempo.
  const atrasadas = atividades.filter((a) => {
    if (a.status === "Concluída") return false
    const ts = startOfDay(new Date(a.data_prevista)).getTime()
    return ts < todayTs
  })
  const hoje = atividades.filter(
    (a) => sameDay(a.data_prevista, today.toISOString()) && a.status !== "Concluída",
  )
  const concluidasHoje = atividades.filter((a) => {
    if (a.status !== "Concluída") return false
    const ref = a.data_conclusao ?? a.data_prevista
    return sameDay(ref, today.toISOString())
  })

  const idadeDias = (a: Atividade) =>
    Math.floor((todayTs - startOfDay(new Date(a.data_prevista)).getTime()) / 86400000)

  const sortByDate = (list: Atividade[]) =>
    [...list].sort(
      (a, b) => new Date(a.data_prevista).getTime() - new Date(b.data_prevista).getTime(),
    )

  const atrasadasOrdenadas = sortByDate(atrasadas)
  const atrasadasSubgrupos = [
    {
      key: "gt15",
      titulo: "Há mais de 15 dias",
      tone: "text-[#EF4444]",
      items: atrasadasOrdenadas.filter((a) => idadeDias(a) > 15),
    },
    {
      key: "8a15",
      titulo: "Há 8 a 15 dias",
      tone: "text-[#F97316]",
      items: atrasadasOrdenadas.filter((a) => {
        const d = idadeDias(a)
        return d >= 8 && d <= 15
      }),
    },
    {
      key: "ate7",
      titulo: "Até 7 dias",
      tone: "text-[#A1A1A1]",
      items: atrasadasOrdenadas.filter((a) => idadeDias(a) >= 1 && idadeDias(a) <= 7),
    },
  ]

  const scrollTo = (id: string) => {
    const el = document.getElementById(id)
    if (el) el.scrollIntoView({ behavior: "smooth", block: "start" })
  }

  const totalItems = atrasadas.length + hoje.length + concluidasHoje.length

  // Contadores por status para o resumo dentro do cabeçalho de "Suas tarefas"
  const ativas = [...atrasadas, ...hoje]
  const isImpedida = (s: AtividadeStatus) =>
    s === "Impedida" || s === "Aguardando cliente" || s === "Aguardando time interno"
  const nAFazer = ativas.filter((a) => a.status === "Pendente" || a.status === "Atrasada").length
  const nAndamento = ativas.filter((a) => a.status === "Em andamento").length
  const nImpedida = ativas.filter((a) => isImpedida(a.status)).length
  const totalTarefas = atrasadas.length + hoje.length

  const tarefasResumo: Array<{ n: number; label: string; target: string; danger?: boolean }> = [
    { n: atrasadas.length, label: atrasadas.length === 1 ? "atrasada" : "atrasadas", target: "bloco-atrasadas", danger: true },
    { n: nAFazer, label: "a fazer", target: "bloco-hoje" },
    { n: nAndamento, label: nAndamento === 1 ? "em andamento" : "em andamento", target: "bloco-hoje" },
    { n: nImpedida, label: nImpedida === 1 ? "impedida" : "impedidas", target: "bloco-atrasadas" },
  ]

  // Estado totalmente vazio da tela
  if (totalItems === 0) {
    return (
      <div className="flex flex-col gap-5 max-w-[860px]">
        <ReunioesDoDia csName={csName} day={day} />
        <ReunioesClientes csName={csName} day={day} />
        <section style={{ marginTop: 26 }}>
          <header className="flex items-baseline gap-2" style={{ marginBottom: 6 }}>
            <h2 className="text-[16px] font-medium text-white">Suas tarefas</h2>
            <span className="text-[12px] text-[#6B6B6B]">0</span>
          </header>
          <div style={{ height: "0.5px", background: "#2E2E2E" }} />
          <div className="flex flex-col items-center justify-center py-24 text-center gap-4">
            <div className="text-5xl">🌤️</div>
            <div>
              <div className="text-lg font-semibold">Sem tarefas para hoje</div>
              <p className="text-sm text-muted-foreground mt-1">
                Nada atrasado, nada agendado para hoje.
              </p>
            </div>
            {!readonly && (
              <button
                onClick={() => {
                  const btn = Array.from(document.querySelectorAll("button")).find(
                    (b) => b.textContent?.trim().startsWith("Nova Atividade"),
                  ) as HTMLButtonElement | undefined
                  btn?.click()
                }}
                className="inline-flex items-center gap-2 bg-primary text-primary-foreground font-semibold px-4 py-2 rounded-lg text-sm hover:bg-primary/90"
              >
                <Plus className="h-4 w-4" /> Nova Atividade
              </button>
            )}
          </div>
        </section>
      </div>
    )
  }

  const atrasadasSubgruposVisiveis = atrasadasSubgrupos.filter((g) => g.items.length > 0)

  return (
    <div className="flex flex-col max-w-[860px]">
      <ReunioesDoDia csName={csName} day={day} />
      <ReunioesClientes csName={csName} day={day} />

      <section style={{ marginTop: 26 }}>
        <header className="flex items-baseline gap-2 flex-wrap" style={{ marginBottom: 6 }}>
          <h2 className="text-[16px] font-medium text-white">Suas tarefas</h2>
          <span className="text-[12px] text-[#6B6B6B]">{totalTarefas}</span>
          <div className="ml-auto flex items-center gap-1 text-[12px]">
            {tarefasResumo.map((r, i) => {
              const zero = r.n === 0
              return (
                <span key={i} className="inline-flex items-center gap-1">
                  {i > 0 && <span className="text-[#4B4B4B]">·</span>}
                  <button
                    onClick={() => scrollTo(r.target)}
                    disabled={zero}
                    className={`inline-flex items-center gap-1 rounded px-1 transition-colors ${
                      zero ? "cursor-default" : "hover:bg-card"
                    }`}
                    style={{
                      color: zero ? "#4B4B4B" : r.danger ? "#EF4444" : "#6B6B6B",
                    }}
                  >
                    <span>{r.n}</span>
                    <span>{r.label}</span>
                  </button>
                </span>
              )
            })}
          </div>
        </header>
        <div style={{ height: "0.5px", background: "#2E2E2E" }} />

        {/* 1. ATRASADAS */}
        {atrasadas.length === 0 ? (
          <BlocoVazio id="bloco-atrasadas" titulo="Atrasadas" />
        ) : (
          <section id="bloco-atrasadas" className="scroll-mt-6" style={{ marginTop: 18 }}>
            <header className="flex items-baseline gap-2" style={{ marginBottom: 6 }}>
              <h2 className="text-[14px] font-semibold text-white">Atrasadas</h2>
              <span className="text-[12px] text-[#6B6B6B]">{atrasadas.length}</span>
            </header>
            <div className="flex flex-col gap-4">
              {atrasadasSubgruposVisiveis.map((g) => (
                <div key={g.key}>
                  {atrasadasSubgruposVisiveis.length > 1 && (
                    <div
                      className={`text-[11px] uppercase font-semibold mb-2 ${g.tone}`}
                      style={{ letterSpacing: "0.04em" }}
                    >
                      {g.titulo} · {g.items.length}
                    </div>
                  )}
                  <div className="space-y-[5px]">
                    {g.items.map((a) => (
                      <MeuDiaCard
                        key={a.id}
                        atividade={a}
                        clientes={clientes}
                        readonly={readonly}
                        onOpen={() => onDetail(a.id)}
                        setStatus={setStatus}
                        onDelete={onDelete}
                        onEditDependencia={onEditDependencia}
                      />
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* 2. HOJE */}
        {hoje.length === 0 ? (
          <BlocoVazio id="bloco-hoje" titulo="Hoje" />
        ) : (
          <section id="bloco-hoje" className="scroll-mt-6" style={{ marginTop: 18 }}>
            <header className="flex items-baseline gap-2" style={{ marginBottom: 6 }}>
              <h2 className="text-[14px] font-semibold text-white">Hoje</h2>
              <span className="text-[12px] text-[#6B6B6B]">{hoje.length}</span>
            </header>
            <div className="space-y-[5px]">
              {sortByDate(hoje).map((a) => (
                <MeuDiaCard
                  key={a.id}
                  atividade={a}
                  clientes={clientes}
                  readonly={readonly}
                  onOpen={() => onDetail(a.id)}
                  setStatus={setStatus}
                  onDelete={onDelete}
                  onEditDependencia={onEditDependencia}
                />
              ))}
            </div>
          </section>
        )}

        {/* 3. CONCLUÍDAS HOJE — rodapé colapsado */}
        <section
          id="bloco-concluidas"
          className="scroll-mt-6 border-t border-border/60"
          style={{ marginTop: 18, paddingTop: 6 }}
        >
          {concluidasHoje.length === 0 ? (
            <div className="h-8 flex items-baseline gap-2 text-[13px]">
              <span className="text-[14px] font-semibold text-[#6B6B6B]">Concluídas hoje</span>
              <span className="text-[12px] text-[#6B6B6B]">0</span>
            </div>
          ) : (
            <>
              <button
                onClick={() => setConcluidasOpen((v) => !v)}
                className="w-full h-8 flex items-center gap-2 text-[13px] text-[#6B6B6B] hover:text-foreground transition-colors"
              >
                <span className="text-[14px] font-semibold">Concluídas hoje</span>
                <span className="text-[12px]">{concluidasHoje.length}</span>
                {concluidasOpen ? (
                  <ChevronDown className="h-4 w-4 ml-auto" />
                ) : (
                  <ChevronRight className="h-4 w-4 ml-auto" />
                )}
              </button>
              {concluidasOpen && (
                <div className="space-y-[5px] mt-2">
                  {sortByDate(concluidasHoje).map((a) => (
                    <MeuDiaCard
                      key={a.id}
                      atividade={a}
                      clientes={clientes}
                      readonly={readonly}
                      onOpen={() => onDetail(a.id)}
                      setStatus={setStatus}
                      onDelete={onDelete}
                      onEditDependencia={onEditDependencia}
                    />
                  ))}
                </div>
              )}
            </>
          )}
        </section>
      </section>
    </div>
  )
}

function BlocoVazio({ id, titulo }: { id: string; titulo: string }) {
  return (
    <div
      id={id}
      className="h-8 flex items-baseline gap-2 text-[13px] scroll-mt-6"
      style={{ marginTop: 18 }}
    >
      <span className="text-[14px] font-semibold text-[#6B6B6B]">{titulo}</span>
      <span className="text-[12px] text-[#6B6B6B]">0</span>
    </div>
  )
}

function MeuDiaCard({
  atividade: a,
  clientes,
  readonly,
  onOpen,
  setStatus,
  onDelete,
  onEditDependencia,
}: {
  atividade: Atividade
  clientes: Cliente[]
  readonly: boolean
  onOpen: () => void
  setStatus: (id: string, st: AtividadeStatus) => void
  onDelete: (id: string) => void
  onEditDependencia: (id: string) => void
}) {
  const cli = clientes.find((c) => c.id === a.cliente_id)
  const title = a.acao && a.entrega ? `${a.acao} · ${a.entrega}` : a.titulo
  const eff = effectiveStatus(a)

  const now = new Date()
  const today0 = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime()
  const dPrev = new Date(a.data_prevista)
  const dPrev0 = new Date(dPrev.getFullYear(), dPrev.getMonth(), dPrev.getDate()).getTime()
  const isToday = dPrev0 === today0
  const isConcluida = a.status === "Concluída"
  const isAtrasada = eff === "Atrasada" && !isConcluida
  const diasAtraso = isAtrasada ? Math.max(1, Math.floor((today0 - dPrev0) / 86400000)) : 0

  const borderColor = isConcluida
    ? "#22C55E"
    : isAtrasada
      ? "#EF4444"
      : isToday
        ? "#60A5FA"
        : "#6B6B6B"

  const prioColor =
    a.prioridade === "Urgente" ? "#EF4444" : a.prioridade === "Médio" ? "#F59E0B" : "#22C55E"

  const clienteTxt = cli ? cli.nome : "Tarefa geral (sem cliente)"
  const dataTxt = isToday && a.hora ? a.hora : fmtDate(dPrev)
  // Sufixo colorido de dependência (renderizado inline na segunda linha)
  type Dep = { text: string; color: string; tooltip: string; clickable: boolean }
  let dep: Dep | null = null
  if (a.status === "Aguardando cliente") {
    const motivo = a.motivo_impedimento?.trim()
    dep = motivo
      ? { text: "aguarda cliente", color: "#EF9F27", tooltip: motivo, clickable: false }
      : { text: "aguarda · sem motivo", color: "#6B6B6B", tooltip: "Clique para preencher o motivo", clickable: true }
  } else if (a.status === "Aguardando time interno") {
    const nome = a.dependencia_nome?.trim()
    const motivo = a.motivo_impedimento?.trim()
    dep = motivo || nome
      ? {
          text: `aguarda ${nome || "time interno"}`,
          color: "#AFA9EC",
          tooltip: motivo || "Sem motivo registrado",
          clickable: !motivo,
        }
      : { text: "aguarda · sem motivo", color: "#6B6B6B", tooltip: "Clique para preencher o motivo", clickable: true }
  } else if (a.status === "Em andamento") {
    dep = { text: "em andamento", color: "#378ADD", tooltip: "Em andamento", clickable: false }
  } else if (a.status === "Impedida") {
    const motivo = a.motivo_impedimento?.trim()
    dep = { text: motivo ? "impedida" : "impedida · sem motivo", color: motivo ? "#F97316" : "#6B6B6B", tooltip: motivo || "Sem motivo registrado", clickable: false }
  }

  const [menuOpen, setMenuOpen] = useState(false)

  // Ação primária: rótulo é a instrução.
  //   aguardando cliente / time interno → Cobrar
  //   em andamento                       → Concluir
  //   demais (a fazer / atrasada)        → Iniciar
  const aguardando =
    a.status === "Aguardando cliente" || a.status === "Aguardando time interno"

  function cobrar() {
    const alvo =
      a.status === "Aguardando cliente"
        ? cli?.nome ?? "cliente"
        : a.dependencia_nome?.trim() || "time interno"
    const nota = window.prompt(
      `Registrar cobrança para ${alvo}. O que foi cobrado?`,
      "",
    )
    if (nota === null) return
    const stamp = new Date()
    const linha = `[Cobrança ${stamp.toLocaleDateString("pt-BR")}] ${nota.trim()}`.trim()
    const descricao = a.descricao ? `${a.descricao}\n${linha}` : linha
    mutar(updateAtividade(a.id, { descricao, status_desde: stamp.toISOString() }))
  }

  function reagendar() {
    const atual = a.data_prevista.slice(0, 10)
    const nova = window.prompt("Reagendar para qual data? (AAAA-MM-DD)", atual)
    if (nova === null) return
    const t = nova.trim()
    if (!/^\d{4}-\d{2}-\d{2}$/.test(t)) {
      alert("Data inválida. Use o formato AAAA-MM-DD.")
      return
    }
    mutar(updateAtividade(a.id, { data_prevista: new Date(`${t}T12:00:00`).toISOString() }))
  }

  const primary: { label: string; onClick: () => void } | null = isConcluida
    ? null
    : aguardando
      ? { label: "Cobrar", onClick: cobrar }
      : a.status === "Em andamento"
        ? { label: "Concluir", onClick: () => setStatus(a.id, "Concluída") }
        : { label: "Iniciar", onClick: () => setStatus(a.id, "Em andamento") }

  return (
    <div
      className="flex items-center gap-3 rounded-r-md group/row"
      style={{
        background: "#232323",
        padding: "9px 10px",
        borderLeft: `2px solid ${borderColor}`,
        minHeight: 48,
      }}
    >
      <span
        title={a.prioridade}
        aria-label={`Prioridade ${a.prioridade}`}
        className="shrink-0 rounded-full"
        style={{ width: 7, height: 7, background: prioColor }}
      />

      <button
        onClick={onOpen}
        className="text-left flex-1 min-w-0"
      >
        <div
          className="text-white"
          style={{
            fontSize: 14,
            lineHeight: 1.25,
            whiteSpace: "nowrap",
            overflow: "hidden",
            textOverflow: "ellipsis",
          }}
        >
          {title}
        </div>
        <div
          style={{
            fontSize: 12,
            color: "#6B6B6B",
            whiteSpace: "nowrap",
            overflow: "hidden",
            textOverflow: "ellipsis",
            marginTop: 2,
          }}
        >
          {clienteTxt} · {dataTxt}
          {dep && (
            <>
              {" · "}
              <span
                title={dep.tooltip}
                onClick={(e) => {
                  if (!dep!.clickable || readonly) return
                  e.stopPropagation()
                  e.preventDefault()
                  onEditDependencia(a.id)
                }}
                style={{
                  color: dep.color,
                  cursor: dep.clickable && !readonly ? "pointer" : "default",
                }}
              >
                {dep.text}
              </span>
            </>
          )}
        </div>
      </button>

      <span
        className="shrink-0 text-right tabular-nums"
        style={{
          fontSize: 11,
          color: "#EF4444",
          width: 32,
          visibility: diasAtraso > 0 ? "visible" : "hidden",
        }}
      >
        {diasAtraso > 0 ? `${diasAtraso}d` : "0d"}
      </span>

      {!readonly && (
        <div
          className="shrink-0 flex items-center gap-1.5 opacity-100 md:opacity-0 md:group-hover/row:opacity-100 md:focus-within:opacity-100 transition-opacity"
        >
          {primary && (
            <button
              onClick={primary.onClick}
              className="inline-flex items-center justify-center px-2.5 rounded-md text-[12px] text-foreground/90 hover:bg-white/5"
              style={{ height: 26, border: "0.5px solid rgba(255,255,255,0.18)" }}
            >
              {primary.label}
            </button>
          )}
          <div className="relative">
            <button
              onClick={() => setMenuOpen((v) => !v)}
              onBlur={() => setTimeout(() => setMenuOpen(false), 150)}
              className="inline-flex items-center justify-center px-2 rounded-md text-[12px] text-foreground/70 hover:bg-white/5"
              style={{ height: 26, border: "0.5px solid rgba(255,255,255,0.18)" }}
              aria-label="Mais ações"
            >
              <MoreHorizontal className="h-3.5 w-3.5" />
            </button>
            {menuOpen && (
              <div className="absolute right-0 top-full mt-1 z-20 min-w-[200px] bg-[#232323] border border-border rounded-md shadow-lg py-1 text-[12px]">
                {!isConcluida && (
                  <MenuItem onClick={() => setStatus(a.id, "Concluída")}>Concluir</MenuItem>
                )}
                {!isConcluida && a.status !== "Em andamento" && (
                  <MenuItem onClick={() => setStatus(a.id, "Em andamento")}>Iniciar</MenuItem>
                )}
                <MenuItem onClick={onOpen}>Editar</MenuItem>
                <MenuItem onClick={reagendar}>Reagendar</MenuItem>
                {!isConcluida && a.status !== "Aguardando cliente" && (
                  <MenuItem onClick={() => setStatus(a.id, "Aguardando cliente")}>
                    Aguardando cliente
                  </MenuItem>
                )}
                {!isConcluida && a.status !== "Aguardando time interno" && (
                  <MenuItem onClick={() => setStatus(a.id, "Aguardando time interno")}>
                    Aguardando time interno
                  </MenuItem>
                )}
                {!isConcluida && a.status !== "Impedida" && (
                  <MenuItem onClick={() => setStatus(a.id, "Impedida")}>
                    Marcar como impedida
                  </MenuItem>
                )}
                {cli && (
                  <MenuItem onClick={() => openCliente(cli.id)}>Abrir Cliente 360</MenuItem>
                )}
                <div className="my-1 border-t border-border" />
                <button
                  onMouseDown={(e) => {
                    e.preventDefault()
                    onDelete(a.id)
                  }}
                  className="w-full text-left px-3 py-1.5 hover:bg-red-500/10 text-[#EF4444]"
                >
                  Excluir
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

function MenuItem({ children, onClick }: { children: React.ReactNode; onClick: () => void }) {
  return (
    <button
      onMouseDown={(e) => {
        e.preventDefault()
        onClick()
      }}
      className="w-full text-left px-3 py-1.5 hover:bg-white/5 text-foreground"
    >
      {children}
    </button>
  )
}

// ============ FILTER CHIP + POPOVER (Meu Dia) ============

function FilterChip({ label, onRemove }: { label: string; onRemove: () => void }) {
  return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium bg-primary/10 text-primary border border-primary/30">
      {label}
      <button
        onClick={onRemove}
        className="hover:bg-primary/20 rounded-full p-0.5"
        aria-label={`Remover ${label}`}
      >
        <X className="h-2.5 w-2.5" />
      </button>
    </span>
  )
}

function FiltroPopover({
  onClose,
  statusSel,
  setStatusSel,
  prioSel,
  setPrioSel,
  clienteSel,
  setClienteSel,
  clientes,
}: {
  onClose: () => void
  statusSel: Set<AtividadeStatus>
  setStatusSel: (s: Set<AtividadeStatus>) => void
  prioSel: Set<Prioridade>
  setPrioSel: (s: Set<Prioridade>) => void
  clienteSel: Set<string>
  setClienteSel: (s: Set<string>) => void
  clientes: Cliente[]
}) {
  const [busca, setBusca] = useState("")
  const statusOpts: AtividadeStatus[] = [
    "Pendente",
    "Em andamento",
    "Aguardando cliente",
    "Aguardando time interno",
    "Concluída",
    "Atrasada",
    "Impedida",
  ]
  const prioOpts: Prioridade[] = ["Urgente", "Médio", "Normal"]

  const toggle = <T,>(set: Set<T>, v: T, setter: (s: Set<T>) => void) => {
    const n = new Set(set)
    if (n.has(v)) n.delete(v)
    else n.add(v)
    setter(n)
  }

  const clientesFiltrados = busca.trim()
    ? clientes.filter((c) =>
        `${c.nome} ${c.empresa ?? ""}`.toLowerCase().includes(busca.toLowerCase()),
      )
    : clientes

  return (
    <>
      <div
        className="fixed inset-0 z-40"
        onClick={onClose}
        aria-hidden
      />
      <div className="absolute right-0 top-full mt-2 z-50 w-[340px] bg-card border border-border rounded-xl shadow-2xl p-4">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-bold">Filtros</h3>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground">
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="mb-4">
          <div className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold mb-2">
            Status
          </div>
          <div className="flex flex-wrap gap-1.5">
            {statusOpts.map((s) => {
              const on = statusSel.has(s)
              return (
                <button
                  key={s}
                  onClick={() => toggle(statusSel, s, setStatusSel)}
                  className={`px-2 py-1 rounded-full text-[11px] font-semibold border transition-colors ${
                    on
                      ? "bg-primary text-primary-foreground border-primary"
                      : "bg-background text-muted-foreground border-border hover:border-primary"
                  }`}
                >
                  {s}
                </button>
              )
            })}
          </div>
        </div>

        <div className="mb-4">
          <div className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold mb-2">
            Prioridade
          </div>
          <div className="flex flex-wrap gap-1.5">
            {prioOpts.map((p) => {
              const on = prioSel.has(p)
              return (
                <button
                  key={p}
                  onClick={() => toggle(prioSel, p, setPrioSel)}
                  className={`px-2 py-1 rounded-full text-[11px] font-semibold border transition-colors ${
                    on
                      ? "bg-primary text-primary-foreground border-primary"
                      : "bg-background text-muted-foreground border-border hover:border-primary"
                  }`}
                >
                  {p}
                </button>
              )
            })}
          </div>
        </div>

        <div>
          <div className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold mb-2">
            Cliente
          </div>
          <div className="relative mb-2">
            <SearchIcon className="absolute left-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
            <input
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
              placeholder="Buscar cliente…"
              className="w-full bg-background border border-border rounded-md pl-7 pr-2 py-1.5 text-xs focus:outline-none focus:border-primary"
            />
          </div>
          <div className="max-h-48 overflow-y-auto space-y-1 pr-1">
            {clientesFiltrados.length === 0 ? (
              <p className="text-[11px] text-muted-foreground italic px-1 py-2">
                Nenhum cliente encontrado.
              </p>
            ) : (
              clientesFiltrados.map((c) => {
                const on = clienteSel.has(c.id)
                return (
                  <button
                    key={c.id}
                    onClick={() => toggle(clienteSel, c.id, setClienteSel)}
                    className={`w-full text-left px-2 py-1.5 rounded-md text-[11px] flex items-center gap-2 transition-colors ${
                      on ? "bg-primary/15 text-primary" : "hover:bg-background text-foreground"
                    }`}
                  >
                    <span
                      className={`inline-block h-3 w-3 rounded-sm border ${
                        on ? "bg-primary border-primary" : "border-muted-foreground/40"
                      }`}
                    />
                    <span className="truncate">
                      {c.nome}
                      {c.empresa && (
                        <span className="text-muted-foreground"> · {c.empresa}</span>
                      )}
                    </span>
                  </button>
                )
              })
            )}
          </div>
        </div>
      </div>
    </>
  )
}

// ============= WAITING REASON MODAL =============

const MOTIVO_SUGESTOES = [
  "Aguardando material",
  "Aguardando aprovação",
  "Aguardando retorno",
  "Aguardando liberação de acesso",
] as const

function WaitingReasonModal({
  atividade,
  status,
  cliente,
  onClose,
  onSave,
}: {
  atividade: Atividade
  status: "Aguardando cliente" | "Aguardando time interno" | "Impedida"
  cliente: Cliente | null
  onClose: () => void
  onSave: (patch: { motivo: string; quem: string }) => void
}) {
  const isCliente = status === "Aguardando cliente"
  // "Impedida" reusa este modal porque o motivo é obrigatório dos dois lados —
  // a diferença é que um impedimento não espera necessariamente por alguém.
  const isImpedimento = status === "Impedida"
  const defaultQuem = isCliente
    ? cliente?.nome ?? "Cliente"
    : atividade.dependencia_nome ?? ""
  const [motivo, setMotivo] = useState(atividade.motivo_impedimento ?? "")
  const [quem, setQuem] = useState(defaultQuem)

  const timeOptions = ["Galdino", ...CONSULTORES]

  function submit() {
    const m = motivo.trim()
    const q = quem.trim()
    // O banco rejeita status impedido/aguardando sem motivo (CHECK em
    // cliente_atividades), então a guarda vive aqui, antes do request.
    if (!m) return
    if (!isCliente && !isImpedimento && !q) return
    onSave({ motivo: m, quem: isCliente ? cliente?.nome ?? "" : q })
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-md rounded-xl p-5"
        style={{ background: "#1E1E1E", border: "1px solid #2A2A2A" }}
      >
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-[15px] font-semibold text-white">
            {isImpedimento
              ? "Impedida"
              : isCliente
                ? "Aguardando cliente"
                : "Aguardando time interno"}
          </h3>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground">
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="space-y-4">
          <div className={isImpedimento ? "hidden" : undefined}>
            <label className="block text-[11px] uppercase tracking-wider text-[#A1A1A1] mb-1.5">
              Quem
            </label>
            {isCliente ? (
              <input
                readOnly
                value={cliente?.nome ?? "Cliente"}
                className="w-full h-9 px-3 rounded-md bg-[#232323] border border-[#2A2A2A] text-[13px] text-[#A1A1A1]"
              />
            ) : (
              <>
                <input
                  value={quem}
                  onChange={(e) => setQuem(e.target.value)}
                  placeholder="Ex.: Galdino, nome do consultor…"
                  className="w-full h-9 px-3 rounded-md bg-[#232323] border border-[#2A2A2A] text-[13px] text-white outline-none focus:border-primary"
                />
                <div className="flex flex-wrap gap-1.5 mt-2">
                  {timeOptions.map((n) => (
                    <button
                      key={n}
                      onClick={() => setQuem(n)}
                      className="px-2 py-0.5 rounded-full text-[11px] text-[#A1A1A1] border border-[#2A2A2A] hover:border-primary hover:text-white"
                    >
                      {n}
                    </button>
                  ))}
                </div>
              </>
            )}
          </div>

          <div>
            <label className="block text-[11px] uppercase tracking-wider text-[#A1A1A1] mb-1.5">
              Motivo
            </label>
            <input
              autoFocus
              value={motivo}
              onChange={(e) => setMotivo(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") submit()
              }}
              placeholder={isImpedimento ? "O que está impedindo?" : "O que está esperando?"}
              className="w-full h-9 px-3 rounded-md bg-[#232323] border border-[#2A2A2A] text-[13px] text-white outline-none focus:border-primary"
            />
            <div className="flex flex-wrap gap-1.5 mt-2">
              {MOTIVO_SUGESTOES.map((s) => (
                <button
                  key={s}
                  onClick={() => setMotivo(s)}
                  className="px-2 py-0.5 rounded-full text-[11px] text-[#A1A1A1] border border-[#2A2A2A] hover:border-primary hover:text-white"
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="flex items-center justify-end gap-2 mt-5">
          <button
            onClick={onClose}
            className="h-9 px-3 rounded-md text-[12px] text-[#A1A1A1] hover:bg-white/5"
          >
            Cancelar
          </button>
          <button
            onClick={submit}
            disabled={!motivo.trim() || (!isCliente && !quem.trim())}
            className="h-9 px-4 rounded-md text-[12px] font-semibold bg-primary text-primary-foreground disabled:opacity-40"
          >
            Salvar
          </button>
        </div>
      </div>
    </div>
  )
}

function MeuDiaHeader({
  profile,
  day,
  setDay,
}: {
  profile: string | null
  day: Date
  setDay: (d: Date) => void
}) {
  const [now, setNow] = useState(() => new Date())
  useEffect(() => {
    const onVis = () => { if (document.visibilityState === "visible") setNow(new Date()) }
    const onFocus = () => setNow(new Date())
    document.addEventListener("visibilitychange", onVis)
    window.addEventListener("focus", onFocus)
    const id = window.setInterval(() => setNow(new Date()), 60_000)
    return () => {
      document.removeEventListener("visibilitychange", onVis)
      window.removeEventListener("focus", onFocus)
      window.clearInterval(id)
    }
  }, [])
  const primeiro = (profile ?? "").trim().split(/\s+/)[0] || ""
  // TODO(fase IA): o original chamava uma server function (gerarSaudacaoIA) com
  // os contadores do dia. Isso vira Edge Function numa fase posterior; até lá a
  // saudação é o banco determinístico local.
  const saudacao = saudacaoDoDia(now, profile ?? "anon", primeiro || "CS")
  const dia = day.toLocaleDateString("pt-BR", { weekday: "long" })
  const diaCap = dia.charAt(0).toUpperCase() + dia.slice(1)
  const restante = day.toLocaleDateString("pt-BR", { day: "numeric", month: "long", year: "numeric" })

  const textoSaudacao = saudacao.completo

  const shift = (deltaDays: number) => {
    const d = new Date(day)
    d.setDate(d.getDate() + deltaDays)
    d.setHours(12, 0, 0, 0)
    setDay(d)
  }
  const isToday = (() => {
    const t = new Date()
    return t.getFullYear() === day.getFullYear() && t.getMonth() === day.getMonth() && t.getDate() === day.getDate()
  })()
  const goToday = () => {
    const d = new Date()
    d.setHours(12, 0, 0, 0)
    setDay(d)
  }

  return (
    <div>
      <h1 className="text-[21px] font-medium text-white leading-tight">
        {textoSaudacao}
      </h1>
      <div className="flex items-center gap-2 mt-1">
        <button
          onClick={() => shift(-1)}
          className="h-6 w-6 inline-flex items-center justify-center rounded-md border border-border hover:border-primary text-[#6B6B6B] hover:text-white"
          aria-label="Dia anterior"
          title="Dia anterior"
        >
          <ChevronLeft className="h-3.5 w-3.5" />
        </button>
        <p className="text-[13px]" style={{ color: "#6B6B6B" }}>
          {diaCap}, {restante}
        </p>
        <button
          onClick={() => shift(1)}
          className="h-6 w-6 inline-flex items-center justify-center rounded-md border border-border hover:border-primary text-[#6B6B6B] hover:text-white"
          aria-label="Próximo dia"
          title="Próximo dia"
        >
          <ChevronRight className="h-3.5 w-3.5" />
        </button>
        {!isToday && (
          <button
            onClick={goToday}
            className="text-[11px] px-2 h-6 rounded-md border border-border hover:border-primary text-[#6B6B6B] hover:text-white"
          >
            Hoje
          </button>
        )}
      </div>
    </div>
  )
}
