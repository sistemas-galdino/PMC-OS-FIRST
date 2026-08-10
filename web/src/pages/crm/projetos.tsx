import { useMemo, useState, type ReactNode } from "react"
import { useSearchParams } from "react-router-dom"
import { Plus, X } from "lucide-react"
import { toast } from "sonner"
import { useGargalos, useProjetos, useProfile, createGargalo } from "@/lib/crm/storage"
import type {
  AreaGargalo,
  Gargalo,
  GargaloPrioridade,
  GargaloStatus,
  QuemTrouxe,
  TimeExecutor,
} from "@/lib/crm/types"
import {
  AREAS_GARGALO,
  GARGALO_PRIORIDADE_LIST,
  GARGALO_STATUS_LIST,
  QUEM_TROUXE_LIST,
  TIMES_EXECUTORES,
} from "@/lib/crm/types"
import {
  GargalosCentral,
  type GargalosOrdem,
  type GargalosPeriodo,
  type GargalosView,
} from "@/components/crm/GargalosCentral"
import { ProjetosCentral, type ProjetosChip } from "@/components/crm/ProjetosCentral"

type Aba = "gargalos" | "projetos"

interface ProjetosSearch {
  aba: Aba
  area: string
  status: string
  prioridade: string
  afeta: string
  periodo: GargalosPeriodo
  view: GargalosView
  ordem: GargalosOrdem
  estagio: ProjetosChip
  q: string
  projeto: string
}

const oneOf = <T extends string>(v: string | null, allowed: readonly T[], fallback: T): T =>
  allowed.includes(v as T) ? (v as T) : fallback

/**
 * O original validava a query string com `validateSearch` do TanStack Router.
 * Aqui o equivalente é ler `useSearchParams()` e normalizar na leitura — o
 * estado da tela (aba, filtros, projeto aberto) continua na URL, que é o que
 * permite mandar o link de um recorte para outra pessoa.
 */
function lerSearch(sp: URLSearchParams): ProjetosSearch {
  return {
    aba: sp.get("aba") === "projetos" ? "projetos" : "gargalos",
    area: sp.get("area") ?? "todas",
    status: sp.get("status") ?? "todos",
    prioridade: sp.get("prioridade") ?? "todas",
    afeta: sp.get("afeta") ?? "todos",
    periodo: oneOf<GargalosPeriodo>(sp.get("periodo"), ["todo", "7d", "30d", "90d"], "todo"),
    view: oneOf<GargalosView>(sp.get("view"), ["painel", "lista", "kanban"], "painel"),
    ordem: oneOf<GargalosOrdem>(sp.get("ordem"), ["recente", "antiga", "prioridade"], "recente"),
    estagio: oneOf<ProjetosChip>(
      sp.get("estagio"),
      ["todos", "Backlog", "Em andamento", "Concluído"],
      "todos",
    ),
    q: sp.get("q") ?? "",
    projeto: sp.get("projeto") ?? "",
  }
}

export default function CrmProjetosPage() {
  const [searchParams, setSearchParams] = useSearchParams()
  const search = useMemo(() => lerSearch(searchParams), [searchParams])

  const [profile] = useProfile()
  const gargalos = useGargalos()
  const projetos = useProjetos()
  const [modalAberto, setModalAberto] = useState(false)
  const [abrirId, setAbrirId] = useState<string | null>(null)

  const setSearch = (patch: Partial<ProjetosSearch>) => {
    setSearchParams(
      (prev) => {
        const next = new URLSearchParams(prev)
        Object.entries(patch).forEach(([k, v]) => {
          if (v === "" || v === undefined || v === null) next.delete(k)
          else next.set(k, String(v))
        })
        return next
      },
      { replace: true },
    )
  }

  return (
    <div className="p-6 space-y-5">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <h1 className="text-2xl font-semibold">Projetos CS</h1>
        <button
          onClick={() => setModalAberto(true)}
          className="inline-flex items-center gap-2 rounded-lg bg-primary px-3 py-2 text-sm font-medium text-primary-foreground"
        >
          <Plus className="h-4 w-4" /> Adicionar problema e solução
        </button>
      </div>

      <div className="flex items-center gap-2 border-b border-border">
        {(["gargalos", "projetos"] as Aba[]).map((a) => (
          <button
            key={a}
            onClick={() => setSearch({ aba: a })}
            className={`px-3 py-2 text-sm -mb-px border-b-2 ${
              search.aba === a
                ? "border-primary text-foreground"
                : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            {a === "gargalos" ? "Gargalos" : "Projetos"}{" "}
            {a === "gargalos" ? gargalos.length : projetos.length}
          </button>
        ))}
      </div>

      {search.aba === "gargalos" ? (
        <GargalosCentral
          gargalos={gargalos}
          projetos={projetos}
          filtros={{
            area: search.area,
            status: search.status,
            prioridade: search.prioridade,
            afeta: search.afeta,
            periodo: search.periodo,
            view: search.view,
            ordem: search.ordem,
          }}
          onFiltros={(patch) => setSearch(patch)}
          abrirId={abrirId}
          onAbrirProjeto={(id) => setSearch({ aba: "projetos", projeto: id })}
        />
      ) : (
        <ProjetosCentral
          projetos={projetos}
          gargalos={gargalos}
          chip={search.estagio}
          busca={search.q}
          onChip={(c) => setSearch({ estagio: c })}
          onBusca={(q) => setSearch({ q })}
          abertoId={search.projeto || null}
          onAbrir={(id) => setSearch({ projeto: id ?? "" })}
          onVerGargalo={(id) => {
            setSearch({ aba: "gargalos" })
            setAbrirId(id)
          }}
        />
      )}

      {modalAberto && (
        <MapearGargaloModal
          onClose={() => setModalAberto(false)}
          gargalos={gargalos}
          registradoPor={profile ?? "Time de CS"}
          onVer={(id) => {
            setModalAberto(false)
            setSearch({ aba: "gargalos" })
            setAbrirId(id)
          }}
        />
      )}
    </div>
  )
}

function normalizar(s: string): string {
  return s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9 ]/g, " ")
    .split(/\s+/)
    .filter((w) => w.length > 3)
    .join(" ")
}

function parecido(a: string, b: string): boolean {
  const wa = normalizar(a).split(" ").filter(Boolean)
  const wb = normalizar(b).split(" ").filter(Boolean)
  if (wa.length === 0 || wb.length === 0) return false
  const comuns = wa.filter((w) => wb.includes(w)).length
  return comuns >= 2 || (wa.length === 1 && wb.includes(wa[0]))
}

function hojeISO(): string {
  const d = new Date()
  const off = d.getTimezoneOffset()
  return new Date(d.getTime() - off * 60000).toISOString().slice(0, 10)
}

function MapearGargaloModal({
  onClose,
  gargalos,
  registradoPor,
  onVer,
}: {
  onClose: () => void
  gargalos: Gargalo[]
  registradoPor: string
  onVer: (id: string) => void
}) {
  const [problema, setProblema] = useState("")
  const [detalhesProblema, setDetalhesProblema] = useState("")
  const [solucao, setSolucao] = useState("")
  const [detalhesSolucao, setDetalhesSolucao] = useState("")
  const [area, setArea] = useState<AreaGargalo>("Sucesso do Cliente")
  const [areaOutro, setAreaOutro] = useState("")
  const [quemTrouxe, setQuemTrouxe] = useState<QuemTrouxe>("Time de CS")
  const [quemTrouxeOutro, setQuemTrouxeOutro] = useState("")
  const [registrado, setRegistrado] = useState(registradoPor)
  const [executor, setExecutor] = useState<TimeExecutor>("Time de CS")
  const [executorOutro, setExecutorOutro] = useState("")
  const [data, setData] = useState(hojeISO())
  const [status, setStatus] = useState<GargaloStatus>("Não iniciado")
  const [prioridade, setPrioridade] = useState<GargaloPrioridade>("Nenhuma")
  const [afeta, setAfeta] = useState<boolean | null>(null)
  const [salvando, setSalvando] = useState(false)

  const similar = useMemo(
    () => (problema.trim().length < 5 ? undefined : gargalos.find((g) => parecido(problema, g.problema))),
    [problema, gargalos],
  )

  const podeSalvar =
    problema.trim().length > 2 &&
    solucao.trim().length > 2 &&
    registrado.trim().length > 0 &&
    data.length > 0 &&
    afeta !== null &&
    (area !== "Outro" || areaOutro.trim().length > 0) &&
    (quemTrouxe !== "Outro" || quemTrouxeOutro.trim().length > 0) &&
    (executor !== "Outro" || executorOutro.trim().length > 0)

  const salvar = async () => {
    if (!podeSalvar || salvando) return
    setSalvando(true)
    try {
      await createGargalo({
        area,
        area_outro: area === "Outro" ? areaOutro.trim() : undefined,
        quem_trouxe: quemTrouxe,
        quem_trouxe_outro: quemTrouxe === "Outro" ? quemTrouxeOutro.trim() : undefined,
        registrado_por: registrado.trim(),
        quem_vai_executar: executor,
        quem_vai_executar_outro: executor === "Outro" ? executorOutro.trim() : undefined,
        data: new Date(`${data}T12:00:00`).toISOString(),
        status,
        prioridade,
        problema: problema.trim(),
        detalhes_problema: detalhesProblema.trim() || undefined,
        solucao: solucao.trim(),
        detalhes_solucao: detalhesSolucao.trim() || undefined,
        // NOT NULL no banco — o formulário só libera o botão depois da escolha.
        afeta_entrega_cliente: afeta === true,
      })
      onClose()
    } catch (e) {
      toast.error(`Não foi possível salvar o gargalo: ${(e as Error).message}`)
    } finally {
      setSalvando(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/60 p-6">
      <div className="w-full max-w-lg rounded-xl bg-card border border-border">
        <header className="flex items-center justify-between border-b border-border px-4 py-3">
          <h2 className="text-sm font-medium">Adicionar problema e solução</h2>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground">
            <X className="h-4 w-4" />
          </button>
        </header>

        <div className="space-y-3 p-4">
          <Campo label="Problema" obrigatorio>
            <input
              value={problema}
              onChange={(e) => setProblema(e.target.value)}
              className="w-full rounded-lg bg-background border border-border px-3 py-2 text-sm outline-none focus:border-primary"
              placeholder="O que trava a operação?"
            />
          </Campo>

          {similar && (
            <p className="-mt-1 text-xs text-amber-300">
              Problema parecido já registrado: {similar.problema}{" "}
              <button
                onClick={() => onVer(similar.id)}
                className="underline underline-offset-2 text-primary"
              >
                Ver
              </button>
            </p>
          )}

          <Campo label="Detalhes do problema">
            <textarea
              value={detalhesProblema}
              onChange={(e) => setDetalhesProblema(e.target.value)}
              rows={2}
              className="w-full rounded-lg bg-background border border-border px-3 py-2 text-sm outline-none focus:border-primary"
            />
          </Campo>

          <Campo label="Solução" obrigatorio>
            <input
              value={solucao}
              onChange={(e) => setSolucao(e.target.value)}
              className="w-full rounded-lg bg-background border border-border px-3 py-2 text-sm outline-none focus:border-primary"
            />
          </Campo>

          <Campo label="Detalhes da solução">
            <textarea
              value={detalhesSolucao}
              onChange={(e) => setDetalhesSolucao(e.target.value)}
              rows={2}
              className="w-full rounded-lg bg-background border border-border px-3 py-2 text-sm outline-none focus:border-primary"
            />
          </Campo>

          <div className="grid grid-cols-2 gap-3">
            <Campo label="Área" obrigatorio>
              <div className="flex gap-2">
                <Select value={area} onChange={(v) => setArea(v as AreaGargalo)} options={AREAS_GARGALO} />
                {area === "Outro" && (
                  <Texto value={areaOutro} onChange={setAreaOutro} placeholder="Especificar" />
                )}
              </div>
            </Campo>
            <Campo label="Quem trouxe" obrigatorio>
              <div className="flex gap-2">
                <Select
                  value={quemTrouxe}
                  onChange={(v) => setQuemTrouxe(v as QuemTrouxe)}
                  options={QUEM_TROUXE_LIST}
                />
                {quemTrouxe === "Outro" && (
                  <Texto value={quemTrouxeOutro} onChange={setQuemTrouxeOutro} placeholder="Especificar" />
                )}
              </div>
            </Campo>
            <Campo label="Registrado por" obrigatorio>
              <Texto value={registrado} onChange={setRegistrado} />
            </Campo>
            <Campo label="Quem vai executar" obrigatorio>
              <div className="flex gap-2">
                <Select
                  value={executor}
                  onChange={(v) => setExecutor(v as TimeExecutor)}
                  options={TIMES_EXECUTORES}
                />
                {executor === "Outro" && (
                  <Texto value={executorOutro} onChange={setExecutorOutro} placeholder="Especificar" />
                )}
              </div>
            </Campo>
            <Campo label="Status" obrigatorio>
              <Select
                value={status}
                onChange={(v) => setStatus(v as GargaloStatus)}
                options={GARGALO_STATUS_LIST}
              />
            </Campo>
            <Campo label="Data" obrigatorio>
              <input
                type="date"
                value={data}
                onChange={(e) => setData(e.target.value)}
                className="w-full rounded-lg bg-background border border-border px-3 py-2 text-sm outline-none focus:border-primary"
              />
            </Campo>
            <Campo label="Prioridade">
              <Select
                value={prioridade}
                onChange={(v) => setPrioridade(v as GargaloPrioridade)}
                options={GARGALO_PRIORIDADE_LIST}
              />
            </Campo>
          </div>

          <Campo label="Afeta a entrega do cliente?" obrigatorio>
            <div className="flex gap-2">
              {([true, false] as const).map((v) => (
                <button
                  key={String(v)}
                  onClick={() => setAfeta(v)}
                  className={`rounded-lg border px-4 py-1.5 text-sm ${
                    afeta === v
                      ? "border-primary bg-primary/10 text-foreground"
                      : "border-border text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {v ? "Sim" : "Não"}
                </button>
              ))}
            </div>
          </Campo>
        </div>

        <footer className="flex items-center justify-end gap-2 border-t border-border px-4 py-3">
          <button
            onClick={onClose}
            className="rounded-lg border border-border px-3 py-2 text-sm text-muted-foreground hover:text-foreground"
          >
            Cancelar
          </button>
          <button
            onClick={() => void salvar()}
            disabled={!podeSalvar || salvando}
            className="rounded-lg bg-primary px-3 py-2 text-sm font-medium text-primary-foreground disabled:opacity-40"
          >
            Salvar gargalo
          </button>
        </footer>
      </div>
    </div>
  )
}

function Texto({
  value,
  onChange,
  placeholder,
}: {
  value: string
  onChange: (v: string) => void
  placeholder?: string
}) {
  return (
    <input
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      className="w-full rounded-lg bg-background border border-border px-3 py-2 text-sm outline-none focus:border-primary"
    />
  )
}

function Select({
  value,
  onChange,
  options,
}: {
  value: string
  onChange: (v: string) => void
  options: readonly string[]
}) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="w-full rounded-lg bg-background border border-border px-3 py-2 text-sm outline-none focus:border-primary"
    >
      {options.map((o) => (
        <option key={o} value={o}>
          {o}
        </option>
      ))}
    </select>
  )
}

function Campo({
  label,
  obrigatorio,
  children,
}: {
  label: string
  obrigatorio?: boolean
  children: ReactNode
}) {
  return (
    <label className="block space-y-1">
      <span className="text-xs text-muted-foreground">
        {label}
        {obrigatorio && <span className="text-red-400"> *</span>}
      </span>
      {children}
    </label>
  )
}
