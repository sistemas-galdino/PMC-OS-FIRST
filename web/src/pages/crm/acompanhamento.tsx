import { useMemo, useState } from "react"
import { useNavigate } from "react-router-dom"
import { Search } from "lucide-react"
import {
  CICLO_DEFS,
  EntregasPrograma,
  cicloKeyOf,
  type EntregaKey,
} from "@/components/crm/CarteiraVisuals"
import { ClientDrawerHost } from "@/components/crm/ClientDrawer"
import {
  cicloDoCliente,
  openCliente,
  semDataDeEntrada,
  situacaoDe,
  useAtividades,
  useClientes,
  useReunioes,
} from "@/lib/crm/storage"
import { situacaoCliente } from "@/lib/crm/jornada"
import { alertasEntrega, type AlertaEntregaId } from "@/lib/crm/alertas-catalogo"
import { useCsList } from "@/lib/crm/equipe"
import { type Atividade, type Cliente, type CSName } from "@/lib/crm/types"

/**
 * Acompanhamento do Time (coordenação) — base das reuniões 1 a 1.
 *
 * O gate por papel fixo ("apenas admin") saiu: quem chega aqui já passou pelo
 * RequireSecao("crm/acompanhamento") do PMC OS. O filtro de CS desta tela é
 * local (não mexe na "visão" da coordenação), como no original.
 */

// ============ período ============

type Periodo = "semana" | "mes" | "trimestre"

const PERIODOS: { id: Periodo; label: string }[] = [
  { id: "semana", label: "Semana" },
  { id: "mes", label: "Mês" },
  { id: "trimestre", label: "Trimestre" },
]

function periodRange(p: Periodo, anterior = false): [number, number] {
  const now = new Date()
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  if (p === "semana") {
    const day = today.getDay()
    const monday = today.getTime() - ((day + 6) % 7) * 86400000
    const start = anterior ? monday - 7 * 86400000 : monday
    return [start, start + 7 * 86400000]
  }
  if (p === "mes") {
    const m = now.getMonth() - (anterior ? 1 : 0)
    return [
      new Date(now.getFullYear(), m, 1).getTime(),
      new Date(now.getFullYear(), m + 1, 1).getTime(),
    ]
  }
  const triStart = Math.floor(now.getMonth() / 3) * 3 - (anterior ? 3 : 0)
  return [
    new Date(now.getFullYear(), triStart, 1).getTime(),
    new Date(now.getFullYear(), triStart + 3, 1).getTime(),
  ]
}

function inRange(iso: string | undefined, r: [number, number]) {
  if (!iso) return false
  const t = new Date(iso).getTime()
  return !isNaN(t) && t >= r[0] && t < r[1]
}

function isAtrasada(a: Atividade) {
  return a.status !== "Concluída" && new Date(a.data_prevista).getTime() < Date.now() - 86400000
}

/**
 * Cliente que conta como carteira ativa da CS.
 *
 * O original comparava `status === "Ativo"`, mas `status` é texto livre no
 * banco (existe "Em Risco", e o cadastro nem sempre preenche). A situação da
 * jornada é a mesma régua usada pelo resto do port (SaudeCarteira, alertas),
 * e clientes pausados ficam fora dos indicadores por decisão do time.
 */
function contaComoAtivo(c: Cliente) {
  return situacaoCliente(c) === "Ativo" && !c.pausado
}

// ============ alertas ============

const ALERTA_LABELS: { id: AlertaEntregaId; label: string }[] = [
  { id: "guardiao_pendente", label: "Guardião pendente" },
  { id: "sem_reuniao_consultor", label: "Sem reunião com consultor" },
  { id: "sem_reuniao_galdino_trimestre", label: "Sem reunião com Galdino" },
  { id: "sem_contato_valor", label: "Sem contato de valor" },
  { id: "sem_acesso_area_membros", label: "Sem acesso à área de membros" },
  { id: "fechamento_ciclo", label: "Fechamento de ciclo" },
]

function Secao({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="space-y-3">
      <h2 className="text-[11px] font-bold uppercase tracking-[0.25em] text-primary">
        {title}
      </h2>
      {children}
    </section>
  )
}

export default function CrmAcompanhamentoPage() {
  const clientesAll = useClientes()
  const atividades = useAtividades()
  const reunioes = useReunioes()
  const navigate = useNavigate()
  // Lista reativa: o time chega do banco depois do 1º render.
  const csList = useCsList()

  const [periodo, setPeriodo] = useState<Periodo>("semana")
  const [cs, setCs] = useState<CSName | "all">("all")
  const [busca, setBusca] = useState("")
  const [entregaAtiva, setEntregaAtiva] = useState<{ key: EntregaKey; side: "com" | "sem" } | null>(
    null,
  )

  const range = useMemo(() => periodRange(periodo), [periodo])
  const rangeAnt = useMemo(() => periodRange(periodo, true), [periodo])

  const alertasPorCliente = useMemo(() => {
    const m = new Map<string, AlertaEntregaId[]>()
    clientesAll.forEach((c) =>
      m.set(
        c.id,
        alertasEntrega(c, { atividades }).map((a) => a.id),
      ),
    )
    return m
  }, [clientesAll, atividades])

  function metricas(csName: CSName, r: [number, number]) {
    const carteira = clientesAll.filter((c) => c.responsavel_cs === csName)
    const ativos = carteira.filter(contaComoAtivo)
    const ats = atividades.filter((a) => a.cs_responsavel === csName)
    const concluidas = ats.filter((a) => a.status === "Concluída" && inRange(a.data_conclusao, r))
    const tocados = new Set<string>()
    concluidas.forEach((a) => a.cliente_id && tocados.add(a.cliente_id))
    reunioes
      .filter(
        (rr) =>
          rr.cs_responsavel === csName &&
          rr.status === "Realizada" &&
          inRange(rr.data, r) &&
          rr.cliente_id,
      )
      .forEach((rr) => tocados.add(rr.cliente_id!))
    const idsAtivos = new Set(ativos.map((c) => c.id))
    return {
      cs: csName,
      carteira: ativos.length,
      concluidas: concluidas.length,
      atrasadas: ats.filter(isAtrasada).length,
      travadas: ats.filter((a) => a.status === "Impedida").length,
      tocada: [...tocados].filter((id) => idsAtivos.has(id)).length,
      alertas: carteira.reduce((s, c) => s + (alertasPorCliente.get(c.id)?.length ?? 0), 0),
    }
  }

  const linhas = useMemo(
    () => (cs === "all" ? csList : [cs]).map((c) => metricas(c, range)),
    // csList na dependência: sem ela as linhas ficavam presas na lista vazia
    // do 1º render.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [cs, range, clientesAll, atividades, reunioes, alertasPorCliente, csList],
  )
  const linhaAnterior = useMemo(
    () => (cs === "all" ? null : metricas(cs, rangeAnt)),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [cs, rangeAnt, clientesAll, atividades, reunioes, alertasPorCliente],
  )

  // Escopo de clientes conforme filtro de CS
  const escopo = useMemo(
    () => (cs === "all" ? clientesAll : clientesAll.filter((c) => c.responsavel_cs === cs)),
    [clientesAll, cs],
  )

  const carteira = useMemo(() => {
    const sit = (c: Cliente) => situacaoCliente(c)
    return {
      total: escopo.length,
      quentes: escopo.filter((c) => c.temperatura === "Quente").length,
      mornos: escopo.filter((c) => c.temperatura === "Morno").length,
      frios: escopo.filter((c) => c.temperatura === "Frio").length,
      risco: escopo.filter((c) => c.status === "Em Risco" || c.temperatura === "Em Risco").length,
      naoIniciaram: escopo.filter((c) => sit(c) === "Não iniciou o programa").length,
      cancelados: escopo.filter((c) => sit(c) === "Cancelado").length,
    }
  }, [escopo])

  const porCiclo = useMemo(
    () =>
      CICLO_DEFS.map((d) => ({
        ...d,
        total: escopo.filter((c) => cicloKeyOf(c) === d.key).length,
      })),
    [escopo],
  )

  // Ativo sem data de entrada não tem ciclo calculável: cairia fora de todas as
  // colunas acima e a soma da régua não bateria com a carteira. Mostrar a
  // pendência de cadastro é o que a CS precisa ver até o backfill rodar.
  const semData = useMemo(
    () => escopo.filter((c) => situacaoDe(c) === "Ativo" && semDataDeEntrada(c)).length,
    [escopo],
  )

  const totaisAlerta = useMemo(
    () =>
      ALERTA_LABELS.map((a) => ({
        ...a,
        total: escopo.reduce(
          (s, c) => s + (alertasPorCliente.get(c.id)?.filter((id) => id === a.id).length ?? 0),
          0,
        ),
      })),
    [escopo, alertasPorCliente],
  )

  const listaClientes = useMemo(() => {
    const q = busca.trim().toLowerCase()
    return escopo
      .filter((c) => !q || `${c.nome} ${c.empresa ?? ""}`.toLowerCase().includes(q))
      .sort((a, b) => a.nome.localeCompare(b.nome))
  }, [escopo, busca])

  return (
    <div className="p-8 space-y-8">
      <header className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold">Acompanhamento do Time</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Base das reuniões 1 a 1 com cada CS
          </p>
        </div>
        <div className="flex items-center gap-2">
          <div className="inline-flex bg-card border border-border rounded-lg p-1">
            {PERIODOS.map((p) => (
              <button
                key={p.id}
                onClick={() => setPeriodo(p.id)}
                className={`px-3 py-1.5 text-xs rounded-md ${
                  periodo === p.id
                    ? "bg-primary text-primary-foreground font-semibold"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {p.label}
              </button>
            ))}
          </div>
          <select
            value={cs}
            onChange={(e) => setCs(e.target.value as CSName | "all")}
            className="bg-card border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-primary"
          >
            <option value="all">Todas as CS</option>
            {csList.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </div>
      </header>

      {/* BLOCO 1 */}
      <Secao title="Por CS">
        <div className="bg-card border border-border rounded-lg overflow-hidden">
          <div
            className={`grid ${linhaAnterior ? "grid-cols-8" : "grid-cols-7"} px-5 py-3 text-[11px] text-muted-foreground uppercase tracking-wider`}
          >
            <span>CS</span>
            <span className="text-right">Carteira</span>
            <span className="text-right">Concluídas</span>
            <span className="text-right">Atrasadas</span>
            <span className="text-right">Travadas</span>
            <span className="text-right">Carteira tocada</span>
            <span className="text-right">Alertas</span>
            {linhaAnterior && <span className="text-right">Período anterior</span>}
          </div>
          {linhas.length === 0 && (
            <div className="px-5 py-8 text-center text-sm text-muted-foreground border-t border-border/60">
              Time ainda carregando.
            </div>
          )}
          {linhas.map((l) => (
            <button
              key={l.cs}
              onClick={() => setCs(l.cs)}
              className={`w-full grid ${linhaAnterior ? "grid-cols-8" : "grid-cols-7"} px-5 py-3.5 text-sm text-left border-t border-border/60 hover:bg-primary/5 transition-colors`}
            >
              <span className="font-semibold">{l.cs}</span>
              <span className="text-right">{l.carteira}</span>
              <span className="text-right">{l.concluidas}</span>
              <span
                className={`text-right ${l.atrasadas > 0 ? "text-status-red font-semibold" : "text-muted-foreground"}`}
              >
                {l.atrasadas}
              </span>
              <span
                className={`text-right ${l.travadas > 0 ? "text-status-red font-semibold" : "text-muted-foreground"}`}
              >
                {l.travadas}
              </span>
              <span className="text-right">
                {l.tocada} / {l.carteira}
              </span>
              <span className="text-right">{l.alertas}</span>
              {linhaAnterior && (
                <span className="text-right text-xs text-muted-foreground">
                  {linhaAnterior.concluidas} concluídas · {linhaAnterior.tocada}/
                  {linhaAnterior.carteira} tocada
                </span>
              )}
            </button>
          ))}
        </div>
      </Secao>

      {/* BLOCO 2 */}
      <Secao title="Carteira">
        <div className="grid grid-cols-2 md:grid-cols-4 xl:grid-cols-7 gap-3">
          <Indicador label="Total" value={carteira.total} />
          <Indicador label="Quentes" value={carteira.quentes} tone="text-status-green" />
          <Indicador label="Mornos" value={carteira.mornos} tone="text-status-yellow" />
          <Indicador label="Frios" value={carteira.frios} tone="text-[#60A5FA]" />
          <Indicador label="Em risco" value={carteira.risco} tone="text-status-red" />
          <Indicador
            label="Não iniciaram"
            value={carteira.naoIniciaram}
            tone="text-muted-foreground"
          />
          <Indicador label="Cancelados" value={carteira.cancelados} tone="text-status-red" />
        </div>
        <div className="bg-card border border-border rounded-lg p-4 grid grid-cols-2 md:grid-cols-4 xl:grid-cols-8 gap-3">
          {porCiclo.map((c) => (
            <div key={c.key}>
              <div className="text-2xl font-black text-primary">{c.total}</div>
              <div className="text-[11px] text-muted-foreground mt-1">{c.label}</div>
            </div>
          ))}
          <div>
            <div
              className={`text-2xl font-black ${semData > 0 ? "text-status-yellow" : "text-muted-foreground"}`}
            >
              {semData}
            </div>
            <div className="text-[11px] text-muted-foreground mt-1">Sem data de entrada</div>
          </div>
        </div>
      </Secao>

      {/* BLOCO 3 */}
      <Secao title="Entregas do programa">
        <EntregasPrograma
          clientes={escopo}
          active={entregaAtiva}
          onToggle={(key, side) =>
            setEntregaAtiva((p) => (p && p.key === key && p.side === side ? null : { key, side }))
          }
        />
      </Secao>

      {/* BLOCO 4 */}
      <Secao title="Alertas">
        <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-3">
          {totaisAlerta.map((a) => (
            <button
              key={a.id}
              onClick={() => navigate(`/crm/alertas?tipo=${a.id}&cs=${encodeURIComponent(cs)}`)}
              className="bg-card border border-border rounded-lg p-4 text-left hover:border-primary transition-colors"
            >
              <div
                className={`text-3xl font-black ${a.total > 0 ? "text-primary" : "text-muted-foreground"}`}
              >
                {a.total}
              </div>
              <div className="text-[11px] text-muted-foreground mt-1 leading-tight">{a.label}</div>
            </button>
          ))}
        </div>
      </Secao>

      {/* BLOCO 5 */}
      <Secao title="Clientes">
        <div className="relative">
          <Search className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            placeholder="Buscar cliente..."
            className="w-full bg-card border border-border rounded-lg pl-9 pr-3 py-2.5 text-sm focus:outline-none focus:border-primary"
          />
        </div>
        <div className="bg-card border border-border rounded-lg overflow-hidden">
          <div className="grid grid-cols-5 px-5 py-3 text-[11px] text-muted-foreground uppercase tracking-wider">
            <span>Cliente</span>
            <span>CS</span>
            <span>Temperatura</span>
            <span>Ciclo</span>
            <span className="text-right">Alertas</span>
          </div>
          {listaClientes.length === 0 && (
            <div className="px-5 py-8 text-center text-sm text-muted-foreground border-t border-border/60">
              Nenhum cliente no escopo.
            </div>
          )}
          {listaClientes.map((c) => {
            const ck = cicloKeyOf(c)
            // Sem ciclo calculável o original caía na situação ("Ativo"), que
            // esconde a causa. Quando falta a data de entrada, dizer isso.
            const ciclo =
              CICLO_DEFS.find((d) => d.key === ck)?.label ??
              (situacaoDe(c) === "Ativo" && semDataDeEntrada(c)
                ? cicloDoCliente(c)
                : situacaoCliente(c))
            const nAlertas = alertasPorCliente.get(c.id)?.length ?? 0
            return (
              <button
                key={c.id}
                onClick={() => openCliente(c.id)}
                className="w-full grid grid-cols-5 px-5 py-3 text-sm text-left border-t border-border/60 hover:bg-primary/5 transition-colors"
              >
                <span className="font-medium truncate pr-2">{c.nome}</span>
                <span className="text-muted-foreground">{c.responsavel_cs || "—"}</span>
                <span className="text-muted-foreground">{c.temperatura}</span>
                <span className="text-muted-foreground">{ciclo}</span>
                <span
                  className={`text-right ${nAlertas > 0 ? "text-primary font-semibold" : "text-muted-foreground"}`}
                >
                  {nAlertas}
                </span>
              </button>
            )
          })}
        </div>
      </Secao>

      {/* openCliente é um pub/sub global: sem o host montado, o clique na
          linha do cliente não abriria nada nesta página. */}
      <ClientDrawerHost />
    </div>
  )
}

function Indicador({ label, value, tone }: { label: string; value: number; tone?: string }) {
  return (
    <div className="bg-card border border-border rounded-lg p-4">
      <div className={`text-3xl font-black ${tone ?? "text-foreground"}`}>{value}</div>
      <div className="text-[11px] uppercase tracking-wider text-muted-foreground mt-1">{label}</div>
    </div>
  )
}
