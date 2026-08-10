import { useMemo, useState } from "react"
import { Calendar, ChevronDown, X } from "lucide-react"
import { toast } from "sonner"
import { useAtividades, useClientes, useReunioes, updateAtividade } from "@/lib/crm/storage"
import type {
  Atividade,
  AtividadeStatus,
  CSName,
  Cliente,
  Reuniao,
} from "@/lib/crm/types"
import type { CardId } from "./IndicadoresAtividades"

function toISODate(d: Date) {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, "0")
  const dd = String(d.getDate()).padStart(2, "0")
  return `${y}-${m}-${dd}`
}

const dateOnly = (iso?: string) => (iso ? iso.slice(0, 10) : "")
const inRange = (iso: string | undefined, ini: string, fim: string) => {
  const d = dateOnly(iso)
  return !!d && d >= ini && d <= fim
}

function diffDias(iso: string, hoje: Date) {
  const a = new Date(`${dateOnly(iso)}T12:00:00`)
  return Math.max(0, Math.round((hoje.getTime() - a.getTime()) / 86400000))
}

const TITULOS: Record<CardId, string> = {
  concluidas: "Concluídas no período",
  em_andamento: "Em andamento",
  atrasadas: "Atrasadas",
  aguardando: "Aguardando",
  reun_cliente: "Reuniões com clientes",
  reun_time: "Reuniões internas PMC",
  carteira: "Carteira tocada",
}

interface Props {
  cs: CSName | null
  inicio: Date
  fim: Date
  hoje: Date
  selected: CardId | null
  onClear: () => void
  onAgendar: (clienteId: string) => void
}

export function DetalhamentoAtividades({
  cs,
  inicio,
  fim,
  hoje,
  selected,
  onClear,
  onAgendar,
}: Props) {
  const atividades = useAtividades()
  const reunioes = useReunioes()
  const clientes = useClientes()
  const [verReunioes, setVerReunioes] = useState(false)
  const [concluidasAbertas, setConcluidasAbertas] = useState(false)

  const nomeCliente = useMemo(() => {
    const map = new Map<string, string>()
    clientes.forEach((c) => map.set(c.id, c.nome))
    return (id?: string) => (id ? (map.get(id) ?? "Geral") : "Geral")
  }, [clientes])

  const ini = toISODate(inicio)
  const end = toISODate(fim)
  const hojeISO = toISODate(hoje)

  const ats = useMemo(
    () => (cs ? atividades.filter((a) => a.cs_responsavel === cs) : atividades),
    [atividades, cs],
  )
  const reus = useMemo(
    () => (cs ? reunioes.filter((r) => r.cs_responsavel === cs) : reunioes),
    [reunioes, cs],
  )

  // ---- Carteira tocada: lista de clientes ----
  if (selected === "carteira") {
    const carteira = clientes.filter(
      (c) => (!cs || c.responsavel_cs === cs) && c.status === "Ativo" && c.pausado !== true,
    )

    type Contato = { tipo: string; quando: string }
    const ultimoNoPeriodo = new Map<string, Contato>()
    const ultimoGeral = new Map<string, string>()

    const registra = (clienteId: string | undefined, data: string, tipo: string) => {
      if (!clienteId) return
      const d = dateOnly(data)
      if (!d) return
      const atual = ultimoGeral.get(clienteId)
      if (!atual || d > atual) ultimoGeral.set(clienteId, d)
      if (d >= ini && d <= end) {
        const cur = ultimoNoPeriodo.get(clienteId)
        if (!cur || d > cur.quando) ultimoNoPeriodo.set(clienteId, { tipo, quando: d })
      }
    }

    reus
      .filter((r) => r.status === "Realizada")
      .forEach((r) => registra(r.cliente_id, r.data, "Reunião"))
    ats
      .filter((a) => a.status === "Concluída")
      .forEach((a) => registra(a.cliente_id, a.data_conclusao ?? a.data_prevista, "Atividade"))

    const comContato = carteira.filter((c) => ultimoNoPeriodo.has(c.id))
    const semContato = carteira.filter((c) => !ultimoNoPeriodo.has(c.id))

    return (
      <section className="mt-8 max-w-[1100px]">
        <Header
          titulo={`${TITULOS.carteira} · ${comContato.length} / ${carteira.length}`}
          onClear={onClear}
        />

        {semContato.length > 0 && (
          <div className="mt-4">
            <div className="text-xs uppercase tracking-wide mb-1" style={{ color: "#EF9F27" }}>
              Sem contato no período · {semContato.length}
            </div>
            <div
              className="rounded-lg overflow-hidden"
              style={{ background: "rgba(239,159,39,0.07)", borderLeft: "2px solid #EF9F27" }}
            >
              {semContato.map((c, i) => {
                const ult = ultimoGeral.get(c.id)
                return (
                  <div
                    key={c.id}
                    className="flex items-center gap-3 px-3 h-[38px] text-sm"
                    style={{ borderTop: i ? "0.5px solid rgba(255,255,255,0.07)" : "none" }}
                  >
                    <span className="text-foreground truncate flex-1">{c.nome}</span>
                    <span className="text-xs" style={{ color: "#EF9F27" }}>
                      {ult
                        ? `último contato há ${diffDias(ult, hoje)} dias`
                        : "sem contato registrado"}
                    </span>
                    <button
                      type="button"
                      onClick={() => onAgendar(c.id)}
                      className="text-xs px-2 h-[26px] rounded-md text-foreground hover:border-primary transition-colors"
                      style={{ border: "0.5px solid rgba(255,255,255,0.2)" }}
                    >
                      Agendar
                    </button>
                  </div>
                )
              })}
            </div>
          </div>
        )}

        <div className="mt-5">
          <div className="text-xs uppercase tracking-wide text-muted-foreground mb-1">
            Com contato no período · {comContato.length}
          </div>
          {comContato.length === 0 ? (
            <Vazio texto="Nenhum cliente com contato neste período." />
          ) : (
            <div>
              {comContato.map((c: Cliente, i) => {
                const ct = ultimoNoPeriodo.get(c.id)!
                return (
                  <div
                    key={c.id}
                    className="flex items-center gap-3 h-[38px] text-sm"
                    style={{ borderTop: i ? "0.5px solid rgba(255,255,255,0.07)" : "none" }}
                  >
                    <span className="text-foreground truncate flex-1">{c.nome}</span>
                    <span className="text-xs text-muted-foreground">{ct.tipo}</span>
                    <span className="text-xs text-muted-foreground tabular-nums">
                      {ct.quando.slice(8, 10)}/{ct.quando.slice(5, 7)}
                    </span>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </section>
    )
  }

  // ---- Reuniões: só faixa recolhida / lista quando o card de reunião está selecionado ----
  const reunioesPeriodo = reus.filter((r) => r.status === "Realizada" && inRange(r.data, ini, end))
  const reunClientes = reunioesPeriodo.filter((r) => r.tipo === "Cliente")
  const reunTime = reunioesPeriodo.filter((r) => r.tipo === "Time PMC")

  if (selected === "reun_cliente" || selected === "reun_time") {
    const lista = (selected === "reun_cliente" ? reunClientes : reunTime)
      .slice()
      .sort((a, b) => dateOnly(a.data).localeCompare(dateOnly(b.data)))
    return (
      <section className="mt-8 max-w-[1100px]">
        <Header titulo={`${TITULOS[selected]} · ${lista.length}`} onClear={onClear} />
        {lista.length === 0 ? (
          <Vazio texto="Nenhuma reunião neste período." />
        ) : (
          <div className="mt-3">
            {lista.map((r, i) => (
              <ReuniaoRow key={r.id} r={r} nomeCliente={nomeCliente} first={i === 0} />
            ))}
          </div>
        )}
      </section>
    )
  }

  // ---- Atividades por status ----
  let base: Atividade[] = []
  if (selected === null) {
    base = ats.filter(
      (a) =>
        a.status !== "Concluída" ||
        inRange(a.data_conclusao ?? a.data_prevista, ini, end),
    )
  } else if (selected === "concluidas") {
    base = ats.filter((a) => a.status === "Concluída" && inRange(a.data_conclusao, ini, end))
  } else if (selected === "em_andamento") {
    base = ats.filter((a) => a.status === "Em andamento")
  } else if (selected === "atrasadas") {
    base = ats.filter(
      (a) =>
        dateOnly(a.data_prevista) < hojeISO &&
        a.status !== "Concluída" &&
        a.status !== "Impedida",
    )
  } else if (selected === "aguardando") {
    base = ats.filter(
      (a) => a.status === "Aguardando cliente" || a.status === "Aguardando time interno",
    )
  }

  const grupoDe = (a: Atividade): GrupoId => {
    if (a.status === "Concluída") return "concluidas"
    if (a.status === "Impedida") return "travadas"
    if (a.status === "Em andamento") return "em_andamento"
    return "a_fazer"
  }

  const buckets = new Map<GrupoId, Atividade[]>()
  base.forEach((a) => {
    const g = grupoDe(a)
    const arr = buckets.get(g) ?? []
    arr.push(a)
    buckets.set(g, arr)
  })
  buckets.forEach((arr) =>
    arr.sort((a, b) => dateOnly(a.data_prevista).localeCompare(dateOnly(b.data_prevista))),
  )

  const titulo =
    selected === null ? `Atividades · ${base.length}` : `${TITULOS[selected]} · ${base.length}`

  return (
    <section className="mt-8 max-w-[1100px]">
      <Header titulo={titulo} onClear={selected ? onClear : undefined} />

      <div
        className="mt-3 rounded-lg px-3 py-2 flex items-center gap-2 text-xs text-muted-foreground"
        style={{ background: "rgba(255,255,255,0.03)" }}
      >
        <Calendar className="w-3.5 h-3.5 shrink-0" />
        <span>
          {reunioesPeriodo.length} reuniões no período · {reunClientes.length} com clientes ·{" "}
          {reunTime.length} internas
        </span>
        <button
          type="button"
          onClick={() => setVerReunioes((v) => !v)}
          className="ml-auto text-xs hover:underline"
          style={{ color: "#DAFC67" }}
        >
          {verReunioes ? "ocultar" : "ver"}
        </button>
      </div>

      {verReunioes && (
        <div className="mt-1 pl-3">
          {reunioesPeriodo.length === 0 ? (
            <Vazio texto="Nenhuma reunião neste período." />
          ) : (
            reunioesPeriodo
              .slice()
              .sort((a, b) => dateOnly(a.data).localeCompare(dateOnly(b.data)))
              .map((r, i) => (
                <ReuniaoRow key={r.id} r={r} nomeCliente={nomeCliente} first={i === 0} />
              ))
          )}
        </div>
      )}

      {base.length === 0 ? (
        <Vazio texto="Nenhuma atividade neste período." />
      ) : (
        <div className="mt-5 space-y-6">
          {GRUPOS.map((g) => {
            const lista = buckets.get(g.id) ?? []
            const vazio = lista.length === 0
            const recolhido = g.id === "concluidas" && !concluidasAbertas
            return (
              <div key={g.id} style={g.id === "concluidas" || vazio ? { opacity: 0.65 } : undefined}>
                <button
                  type="button"
                  onClick={
                    g.id === "concluidas" ? () => setConcluidasAbertas((v) => !v) : undefined
                  }
                  className="flex items-center gap-2 w-full text-left"
                  style={{ cursor: g.id === "concluidas" ? "pointer" : "default" }}
                >
                  <span
                    className="inline-block h-4 rounded-full"
                    style={{ width: 3, background: g.cor }}
                  />
                  <span className="text-sm font-semibold" style={{ color: g.cor }}>
                    {g.label}
                  </span>
                  <span className="text-xs text-muted-foreground">{lista.length}</span>
                  {g.id === "concluidas" && (
                    <ChevronDown
                      className="w-3.5 h-3.5 text-muted-foreground transition-transform"
                      style={{ transform: recolhido ? "rotate(-90deg)" : "none" }}
                    />
                  )}
                </button>

                {!recolhido && (
                  <div className="mt-1">
                    {vazio ? (
                      <p className="text-xs text-muted-foreground py-2">
                        Nenhuma atividade neste grupo.
                      </p>
                    ) : (
                      lista.map((a, i) => (
                        <LinhaAtividade
                          key={a.id}
                          a={a}
                          grupo={g.id}
                          nomeCliente={nomeCliente}
                          hoje={hoje}
                          first={i === 0}
                        />
                      ))
                    )}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}
    </section>
  )
}

type GrupoId = "a_fazer" | "em_andamento" | "travadas" | "concluidas"

const GRUPOS: { id: GrupoId; label: string; cor: string }[] = [
  { id: "a_fazer", label: "A fazer", cor: "#D85A30" },
  { id: "em_andamento", label: "Em andamento", cor: "#EF9F27" },
  { id: "travadas", label: "Travadas", cor: "#E24B4A" },
  { id: "concluidas", label: "Concluídas", cor: "#639922" },
]

const STATUS_OPCOES: AtividadeStatus[] = [
  "Pendente",
  "Em andamento",
  "Aguardando cliente",
  "Aguardando time interno",
  "Impedida",
  "Concluída",
]

function responsavelLabel(a: Atividade) {
  const tipo = a.responsavel_tipo ?? "CS"
  if (tipo === "CS") return a.cs_responsavel
  return a.responsavel_nome ? `${tipo} · ${a.responsavel_nome}` : tipo
}

function LinhaAtividade({
  a,
  grupo,
  nomeCliente,
  hoje,
  first,
}: {
  a: Atividade
  grupo: GrupoId
  nomeCliente: (id?: string) => string
  hoje: Date
  first: boolean
}) {
  const [pedindoMotivo, setPedindoMotivo] = useState(false)
  const [motivo, setMotivo] = useState(a.motivo_impedimento ?? "")

  // data_conclusao é preenchida pelo trigger do banco; aqui só o status muda.
  const aplicar = (status: AtividadeStatus, motivoTexto?: string) => {
    void updateAtividade(a.id, {
      status,
      motivo_impedimento: status === "Impedida" ? motivoTexto ?? "" : "",
    }).catch((e) =>
      toast.error(e instanceof Error ? e.message : "Não foi possível salvar a atividade"),
    )
  }

  const onChangeStatus = (v: AtividadeStatus) => {
    if (v === "Impedida") {
      setMotivo(a.motivo_impedimento ?? "")
      setPedindoMotivo(true)
      return
    }
    aplicar(v)
  }

  const hojeISO = `${hoje.getFullYear()}-${String(hoje.getMonth() + 1).padStart(2, "0")}-${String(hoje.getDate()).padStart(2, "0")}`
  const vencida = a.status !== "Concluída" && dateOnly(a.data_prevista) < hojeISO
  const aguardando =
    a.status === "Aguardando cliente" || a.status === "Aguardando time interno"

  const prazo = vencida ? (
    <span className="text-xs tabular-nums" style={{ color: "#E24B4A" }}>
      há {diffDias(a.data_prevista, hoje)}d
    </span>
  ) : (
    <span className="text-xs text-muted-foreground tabular-nums">
      {dateOnly(a.data_prevista).slice(8, 10)}/{dateOnly(a.data_prevista).slice(5, 7)}
    </span>
  )

  return (
    <div style={{ borderTop: first ? "none" : "0.5px solid rgba(255,255,255,0.07)" }}>
      <div className="flex items-center gap-3 py-2 text-sm">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 min-w-0">
            <span className="text-foreground truncate">{a.titulo}</span>
            {aguardando && (
              <span className="text-xs shrink-0" style={{ color: "#9CA3AF" }}>
                {a.status}
              </span>
            )}
          </div>
          <div className="text-xs text-muted-foreground truncate">
            {nomeCliente(a.cliente_id)}
          </div>
          {grupo === "travadas" && a.motivo_impedimento && (
            <div className="text-xs text-muted-foreground mt-0.5">
              Motivo: {a.motivo_impedimento}
            </div>
          )}
        </div>
        <select
          value={a.status === "Atrasada" ? "Pendente" : a.status}
          onChange={(e) => onChangeStatus(e.target.value as AtividadeStatus)}
          className="text-xs bg-transparent rounded-md px-2 h-[28px] text-foreground focus:outline-none focus:border-primary"
          style={{ border: "0.5px solid rgba(255,255,255,0.2)" }}
        >
          {STATUS_OPCOES.map((s) => (
            <option key={s} value={s} className="bg-card">
              {s}
            </option>
          ))}
        </select>
        <div className="w-[70px] text-right shrink-0">{prazo}</div>
        <div className="w-[140px] text-xs text-muted-foreground truncate shrink-0 text-right">
          {responsavelLabel(a)}
        </div>
      </div>

      {pedindoMotivo && (
        <div className="flex items-center gap-2 pb-2">
          <input
            autoFocus
            value={motivo}
            onChange={(e) => setMotivo(e.target.value)}
            placeholder="Motivo do impedimento"
            className="flex-1 text-xs bg-transparent rounded-md px-2 h-[28px] text-foreground focus:outline-none focus:border-primary"
            style={{ border: "0.5px solid rgba(255,255,255,0.2)" }}
          />
          <button
            type="button"
            disabled={!motivo.trim()}
            onClick={() => {
              aplicar("Impedida", motivo.trim())
              setPedindoMotivo(false)
            }}
            className="text-xs px-2 h-[28px] rounded-md font-semibold disabled:opacity-40"
            style={{ background: "#DAFC67", color: "#111111" }}
          >
            Salvar
          </button>
          <button
            type="button"
            onClick={() => setPedindoMotivo(false)}
            className="text-xs px-2 h-[28px] rounded-md text-muted-foreground"
            style={{ border: "0.5px solid rgba(255,255,255,0.2)" }}
          >
            Cancelar
          </button>
        </div>
      )}
    </div>
  )
}

function ReuniaoRow({
  r,
  nomeCliente,
  first,
}: {
  r: Reuniao
  nomeCliente: (id?: string) => string
  first: boolean
}) {
  return (
    <div
      className="flex items-center gap-2.5 h-[38px] text-sm"
      style={{ borderTop: first ? "none" : "0.5px solid rgba(255,255,255,0.07)" }}
    >
      <Calendar className="w-3.5 h-3.5 shrink-0 text-muted-foreground" />
      <span className="text-foreground truncate">{r.titulo}</span>
      <span className="text-muted-foreground truncate">
        · {r.cliente_id ? nomeCliente(r.cliente_id) : "Time PMC"}
      </span>
      <span className="flex-1" />
      <span className="text-xs text-muted-foreground tabular-nums shrink-0">
        {dateOnly(r.data).slice(8, 10)}/{dateOnly(r.data).slice(5, 7)} · {r.hora_inicio}
      </span>
    </div>
  )
}

function Header({ titulo, onClear }: { titulo: string; onClear?: () => void }) {
  return (
    <div className="flex items-center justify-between pb-2 border-b border-border/50">
      <h2 className="text-base font-medium text-foreground">{titulo}</h2>
      {onClear && (
        <button
          type="button"
          onClick={onClear}
          className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1"
        >
          limpar seleção <X className="w-3 h-3" />
        </button>
      )}
    </div>
  )
}

function Vazio({ texto }: { texto: string }) {
  return <div className="mt-3 text-sm text-muted-foreground">{texto}</div>
}
