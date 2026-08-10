import { useEffect, useMemo, useRef, useState } from "react"
import { Link, useSearchParams } from "react-router-dom"
import { toast } from "sonner"
import { AlertCircle, CalendarClock, Snowflake } from "lucide-react"
import { Badge } from "@/components/crm/Badge"
import { NovaAtividadeModal } from "@/components/crm/NovaAtividadeModal"
import {
  buildDisplayIdMap,
  isCS,
  openCliente,
  useAtividades,
  useClientes,
  useProfile,
} from "@/lib/crm/storage"
import { CS_LIST, type Atividade, type Cliente, type CSName } from "@/lib/crm/types"
import { alertasEntrega, type AlertaEntrega, type AlertaEntregaId } from "@/lib/crm/alertas-catalogo"
import { marcacaoKey, useMarcacoesAlertas } from "@/lib/crm/alertas-marcacoes"
import { diasAteFechamentoCiclo, trimestreAtual } from "@/lib/crm/jornada"
import { garantirAtividadesFechamentoCiclo, criarAtividadesFechamentoLote } from "@/lib/crm/fechamento-ciclo"
import {
  ENTREGAS_CICLO,
  contarPreparacaoExistente,
  criarPreparacaoCicloLote,
  preRequisitoOk,
} from "@/lib/crm/ciclo-entregas"

const ORIGEM_PREFIX = "Alerta:"

function temAtividadeAberta(atividades: Atividade[], clienteId: string, alertaId: AlertaEntregaId) {
  return atividades.some(
    (a) =>
      a.cliente_id === clienteId &&
      a.status !== "Concluída" &&
      (a.origem_label || "").includes(`${ORIGEM_PREFIX} ${alertaId}`),
  )
}

function fmtData(iso: string) {
  return new Date(iso).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" })
}

type LinhaAlerta = AlertaEntrega & { estado: "aberto" | "acompanhando"; desde?: string }

const ENTREGA_POR_TRIMESTRE: Record<number, string> = {
  1: "Reunião de fechamento do ciclo",
  2: "Infográfico da Jornada de Sucesso",
  3: "Raio-X de Maturidade em IA",
  4: "Dossiê de Transformação",
}

/** Link para a aba de atividades já com o recorte que a CS espera ver. */
const LINK_ATIVIDADES = "/crm/atividades?periodo=semana&aba=atividades"

export default function CrmAlertasPage() {
  const [searchParams] = useSearchParams()
  const tipoDaUrl = (searchParams.get("tipo") as AlertaEntregaId | null) ?? null
  const csDaUrl = (searchParams.get("cs") as CSName | "all" | null) ?? null

  const [profile] = useProfile()
  const clientesAll = useClientes()
  const atividades = useAtividades()
  const lockedCS = isCS(profile) ? (profile as CSName) : null
  const { marcacoes, marcar, reverter } = useMarcacoesAlertas()

  const [csFiltro, setCsFiltro] = useState<CSName | "all">(lockedCS || csDaUrl || "all")
  const [aba, setAba] = useState<"cliente" | "ciclo" | "tipo">(
    tipoDaUrl ? (tipoDaUrl === "fechamento_ciclo" ? "ciclo" : "tipo") : "cliente",
  )
  const [tipoFiltro, setTipoFiltro] = useState<AlertaEntregaId | null>(tipoDaUrl)
  const [modalState, setModalState] = useState<{ clienteId: string; titulo: string; label: string } | null>(null)
  const [janela, setJanela] = useState<30 | 60 | 90>(30)
  const [selecionados, setSelecionados] = useState<Record<number, string[]>>({})
  const [feedback, setFeedback] = useState<Record<number, number>>({})
  const [fluxoAberto, setFluxoAberto] = useState<Record<number, boolean>>({})
  const [prepFeedback, setPrepFeedback] = useState<Record<number, number>>({})

  // O perfil chega assíncrono (tabela `mentores`): quando a pessoa é CS o
  // filtro deixa de ser escolha e passa a ser a carteira dela.
  useEffect(() => {
    if (lockedCS) setCsFiltro(lockedCS)
  }, [lockedCS])

  const clientes = useMemo(() => {
    let list = clientesAll.filter((c) => c.status !== "Cancelado" && !c.pausado)
    if (lockedCS) list = list.filter((c) => c.responsavel_cs === lockedCS)
    else if (csFiltro !== "all") list = list.filter((c) => c.responsavel_cs === csFiltro)
    return list
  }, [clientesAll, lockedCS, csFiltro])

  // Criação automática das atividades de fechamento de ciclo (com trava de
  // duplicidade no banco). A rotina virou assíncrona, e `clientes` muda de
  // identidade a cada refetch do React Query — sem a memória de quem já foi
  // processado nesta sessão a rotina reentraria em loop (ela mesma invalida a
  // query de atividades) e o StrictMode a dispararia duas vezes.
  const jaProcessados = useRef(new Set<string>())
  useEffect(() => {
    const pendentes = clientes.filter((c) => !jaProcessados.current.has(c.id))
    if (pendentes.length === 0) return
    // Marcar ANTES do await é o que impede a segunda montagem do StrictMode
    // de criar a mesma atividade em paralelo.
    pendentes.forEach((c) => jaProcessados.current.add(c.id))
    void garantirAtividadesFechamentoCiclo(pendentes).catch((e: unknown) => {
      // Falhou: solta a trava local para que uma nova visita tente de novo.
      pendentes.forEach((c) => jaProcessados.current.delete(c.id))
      toast.error(`Não foi possível criar as atividades de fechamento de ciclo: ${(e as Error).message}`)
    })
  }, [clientes])

  const idMap = useMemo(() => buildDisplayIdMap(clientesAll), [clientesAll])

  const porCliente = useMemo(() => {
    const out: { cliente: Cliente; alertas: LinhaAlerta[]; ocultos: AlertaEntrega[]; maisAntigo: number }[] = []
    clientes.forEach((cliente) => {
      // "Fechamento de ciclo" vive apenas na aba "Por ciclo"
      const todos = alertasEntrega(cliente, { atividades }).filter((a) => a.id !== "fechamento_ciclo")

      const linhas: LinhaAlerta[] = []
      const ocultos: AlertaEntrega[] = []
      todos.forEach((a) => {
        const m = marcacoes[marcacaoKey(cliente.id, a.id)]
        if (m?.tipo === "nao_se_aplica") {
          ocultos.push(a)
          return
        }
        if (temAtividadeAberta(atividades, cliente.id, a.id)) return
        linhas.push(
          m?.tipo === "acompanhando"
            ? { ...a, estado: "acompanhando", desde: m.data }
            : { ...a, estado: "aberto" },
        )
      })
      if (linhas.length === 0 && ocultos.length === 0) return
      out.push({
        cliente,
        alertas: linhas,
        ocultos,
        maisAntigo: linhas.reduce((max, a) => Math.max(max, a.idade_dias), 0),
      })
    })
    return out.filter((g) => g.alertas.length > 0 || g.ocultos.length > 0).sort((a, b) => b.maisAntigo - a.maisAntigo)
  }, [clientes, atividades, marcacoes])

  const clientesComAlerta = porCliente.filter((g) => g.alertas.length > 0).length
  const totalAlertas = porCliente.reduce((s, g) => s + g.alertas.length, 0)

  const porTipo = useMemo(() => {
    const m = new Map<AlertaEntregaId, { titulo: string; itens: { cliente: Cliente; alerta: LinhaAlerta }[] }>()
    porCliente.forEach((g) =>
      g.alertas.forEach((a) => {
        const bucket = m.get(a.id) || { titulo: a.titulo, itens: [] }
        bucket.itens.push({ cliente: g.cliente, alerta: a })
        m.set(a.id, bucket)
      }),
    )
    return [...m.entries()].filter(([id]) => !tipoFiltro || id === tipoFiltro)
  }, [porCliente, tipoFiltro])

  const porCiclo = useMemo(() => {
    return [1, 2, 3, 4].map((tri) => {
      const itens = clientes
        .map((cliente) => {
          const t = trimestreAtual(cliente)
          const faltam = diasAteFechamentoCiclo(cliente)
          if (t !== tri || faltam === null || faltam < 0 || faltam > janela) return null
          const ativ = atividades.find(
            (a) => a.cliente_id === cliente.id && a.origem_label === `Fechamento de ciclo · T${tri}`,
          )
          const status = !ativ
            ? null
            : ativ.status === "Concluída"
              ? "concluída"
              : ativ.status === "Em andamento"
                ? "em andamento"
                : "atividade criada"
          return { cliente, faltam, status }
        })
        .filter((x): x is { cliente: Cliente; faltam: number; status: string | null } => x !== null)
        .sort((a, b) => a.faltam - b.faltam)
      return { tri, entrega: ENTREGA_POR_TRIMESTRE[tri], itens }
    })
  }, [clientes, atividades, janela])

  function toggleSel(tri: number, clienteId: string) {
    setSelecionados((prev) => {
      const set = new Set(prev[tri] || [])
      if (set.has(clienteId)) set.delete(clienteId)
      else set.add(clienteId)
      return { ...prev, [tri]: [...set] }
    })
  }

  async function criarLote(tri: number, alvos: Cliente[]) {
    try {
      const n = await criarAtividadesFechamentoLote(alvos, tri)
      setSelecionados((prev) => ({ ...prev, [tri]: [] }))
      setFeedback((prev) => ({ ...prev, [tri]: n }))
    } catch (e) {
      toast.error(`Não foi possível criar as atividades: ${(e as Error).message}`)
    }
  }

  async function criarPreparacao(tri: number, alvos: Cliente[]) {
    try {
      const n = await criarPreparacaoCicloLote(alvos, tri)
      setPrepFeedback((p) => ({ ...p, [tri]: n }))
    } catch (e) {
      toast.error(`Não foi possível criar a preparação: ${(e as Error).message}`)
    }
  }

  function marcarAlerta(clienteId: string, alertaId: AlertaEntregaId, tipo: "acompanhando" | "nao_se_aplica") {
    // O autor fica registrado na tabela: a marcação agora é do time, não do
    // navegador de quem marcou.
    void marcar(clienteId, alertaId, tipo, profile ?? undefined).catch((e: unknown) =>
      toast.error(`Não foi possível marcar o alerta: ${(e as Error).message}`),
    )
  }

  function reverterAlerta(clienteId: string, alertaId: AlertaEntregaId) {
    void reverter(clienteId, alertaId).catch((e: unknown) =>
      toast.error(`Não foi possível reverter a marcação: ${(e as Error).message}`),
    )
  }

  function abrirModal(cliente: Cliente, a: AlertaEntrega) {
    setModalState({
      clienteId: cliente.id,
      titulo: a.acao,
      label: `${ORIGEM_PREFIX} ${a.id}`,
    })
  }

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-5">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <h1 className="text-base font-semibold">
          {clientesComAlerta} clientes com alerta · {totalAlertas} alertas em aberto
        </h1>
        {!lockedCS && (
          <select
            value={csFiltro}
            onChange={(e) => setCsFiltro(e.target.value as CSName | "all")}
            className="bg-card border border-border rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:border-primary"
          >
            <option value="all">Todas as CSs</option>
            {CS_LIST.map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
        )}
      </div>

      {tipoFiltro && (
        <div className="flex items-center gap-2 text-xs">
          <span className="text-muted-foreground">Filtrado por tipo</span>
          <button
            onClick={() => setTipoFiltro(null)}
            className="px-2 py-1 rounded-md border border-border hover:border-primary"
          >
            Limpar filtro
          </button>
        </div>
      )}

      <div className="flex gap-1 border-b border-border">
        {(["cliente", "ciclo", "tipo"] as const).map((t) => (
          <button
            key={t}
            onClick={() => setAba(t)}
            className={`px-3 py-2 text-sm -mb-px border-b-2 ${
              aba === t
                ? "border-primary text-foreground font-semibold"
                : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            {t === "cliente" ? "Por cliente" : t === "ciclo" ? "Por ciclo" : "Por tipo"}
          </button>
        ))}
      </div>

      {aba === "ciclo" && (
        <div className="space-y-3">
          <div className="flex items-center gap-2 text-xs">
            <span className="text-muted-foreground">Próximos:</span>
            {([30, 60, 90] as const).map((d) => (
              <button
                key={d}
                onClick={() => setJanela(d)}
                className={`px-2 py-1 rounded-md border ${
                  janela === d
                    ? "border-primary text-foreground font-semibold"
                    : "border-border text-muted-foreground hover:border-primary"
                }`}
              >
                {d} dias
              </button>
            ))}
          </div>
          {porCiclo.map((bloco) => {
            const pendentes = bloco.itens.filter((i) => i.status === null)
            const sel = (selecionados[bloco.tri] || []).filter((id) =>
              pendentes.some((p) => p.cliente.id === id),
            )
            const alvos = sel.length > 0 ? pendentes.filter((p) => sel.includes(p.cliente.id)) : pendentes
            return (
              <div key={bloco.tri} className="bg-card border border-border rounded-lg p-[14px] space-y-2">
                <div className="flex items-center gap-2 flex-wrap">
                  <CalendarClock className="h-4 w-4 text-primary" />
                  <div className="text-sm font-semibold">
                    T{bloco.tri} · {bloco.entrega}
                  </div>
                  {bloco.itens.length > 0 && (
                    <span className="text-xs text-muted-foreground tabular-nums">{bloco.itens.length}</span>
                  )}
                  {pendentes.length > 0 && (
                    <button
                      onClick={() => void criarLote(bloco.tri, alvos.map((a) => a.cliente))}
                      className="ml-auto text-xs px-2 py-1 rounded-md bg-primary text-primary-foreground font-semibold hover:bg-primary/90"
                    >
                      {sel.length > 0
                        ? `Criar atividades para ${sel.length} selecionado(s)`
                        : `Criar atividades para ${pendentes.length} cliente(s)`}
                    </button>
                  )}
                </div>

                {(() => {
                  const e = ENTREGAS_CICLO[bloco.tri]
                  if (!e) return null
                  const aberto = !!fluxoAberto[bloco.tri]
                  const alvosPrep = (sel.length > 0 ? bloco.itens.filter((i) => sel.includes(i.cliente.id)) : bloco.itens).map(
                    (i) => i.cliente,
                  )
                  return (
                    <div className="rounded-lg border border-border/60 bg-background">
                      <div className="flex items-center gap-2 px-3 py-2 flex-wrap">
                        <button
                          onClick={() => setFluxoAberto((p) => ({ ...p, [bloco.tri]: !aberto }))}
                          className="text-xs text-muted-foreground hover:text-foreground"
                        >
                          {aberto ? "▾" : "▸"} Fluxo de entrega do T{bloco.tri} · {e.preparacao.length} atividades preparatórias
                        </button>
                        {alvosPrep.length > 0 && (
                          <button
                            onClick={() => void criarPreparacao(bloco.tri, alvosPrep)}
                            className="ml-auto text-xs px-2 py-1 rounded-md border border-primary text-primary hover:bg-primary hover:text-primary-foreground transition-colors"
                          >
                            Criar preparação para {alvosPrep.length} cliente(s)
                          </button>
                        )}
                      </div>
                      {prepFeedback[bloco.tri] !== undefined && (
                        <div className="px-3 pb-2 text-xs text-primary">
                          {prepFeedback[bloco.tri]} atividades preparatórias criadas
                        </div>
                      )}
                      {aberto && (
                        <div className="px-3 pb-3 space-y-2 text-xs">
                          <div>
                            <span className="text-muted-foreground">Tarefa: </span>
                            {e.tarefa}
                          </div>
                          <div>
                            <span className="text-muted-foreground">Responsável: </span>
                            {e.responsavel}
                          </div>
                          <div>
                            <span className="text-muted-foreground">O que fazer: </span>
                            {e.o_que_fazer}
                          </div>
                          <div>
                            <span className="text-muted-foreground">Pré-requisito: </span>
                            {e.pre_requisito}
                          </div>
                          <div>
                            <span className="text-muted-foreground">Comprovação: </span>
                            {e.comprovacao}
                          </div>
                          {e.nota && (
                            <div className="rounded-md border border-border px-2 py-1.5 text-muted-foreground">
                              {e.nota}
                            </div>
                          )}
                          <div className="pt-1">
                            <div className="text-[10px] uppercase tracking-wide text-muted-foreground mb-1">
                              Antes do fechamento
                            </div>
                            <ol className="space-y-1">
                              {e.preparacao.map((p, i) => (
                                <li key={p.titulo} className="flex gap-2">
                                  <span className="text-muted-foreground tabular-nums">{i + 1}.</span>
                                  <span className="flex-1">{p.titulo}</span>
                                  <span className="text-muted-foreground shrink-0">D-{p.dias_antes}</span>
                                </li>
                              ))}
                            </ol>
                          </div>
                        </div>
                      )}
                    </div>
                  )
                })()}

                {feedback[bloco.tri] ? (
                  <div className="text-xs text-primary">{feedback[bloco.tri]} atividades criadas</div>
                ) : null}
                {bloco.itens.length === 0 ? (
                  <div className="text-xs text-muted-foreground">
                    Nenhum cliente fechando o T{bloco.tri} nos próximos {janela} dias.
                  </div>
                ) : (
                  <div className="divide-y divide-border/50">
                    {bloco.itens.map(({ cliente, faltam, status }) => (
                      <div key={cliente.id} className="flex items-center gap-2 py-2 flex-wrap text-sm">
                        {status === null ? (
                          <input
                            type="checkbox"
                            checked={sel.includes(cliente.id)}
                            onChange={() => toggleSel(bloco.tri, cliente.id)}
                            className="accent-primary h-3.5 w-3.5"
                            aria-label={`Selecionar ${cliente.nome}`}
                          />
                        ) : (
                          <span className="w-3.5" />
                        )}
                        <span className="font-mono text-xs text-primary">{idMap.get(cliente.id)}</span>
                        <button onClick={() => openCliente(cliente.id)} className="font-medium hover:text-primary">
                          {cliente.nome}
                        </button>
                        <span className="text-xs text-muted-foreground">· fecha em {faltam} dias</span>
                        {(() => {
                          const total = ENTREGAS_CICLO[bloco.tri]?.preparacao.length ?? 0
                          const feitas = atividades.length >= 0 ? contarPreparacaoExistente(cliente.id, bloco.tri) : 0
                          return total > 0 ? (
                            <span className="text-[11px] text-muted-foreground tabular-nums">
                              · preparação {feitas}/{total}
                            </span>
                          ) : null
                        })()}
                        {!preRequisitoOk(cliente, bloco.tri) && (
                          <span className="text-[11px] text-destructive">· sem Guardião (risco)</span>
                        )}
                        {status === null ? (
                          <span className="ml-auto text-xs text-muted-foreground">sem atividade</span>
                        ) : (
                          <Link
                            to={LINK_ATIVIDADES}
                            className="ml-auto text-xs px-2 py-1 rounded-md border border-border hover:border-primary"
                          >
                            {status}
                          </Link>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}

      {aba !== "ciclo" && totalAlertas === 0 && (
        <div className="bg-card border border-border rounded-lg p-10 text-center text-sm text-muted-foreground">
          <Snowflake className="h-6 w-6 mx-auto mb-2 opacity-50" />
          Nenhum alerta em aberto.
        </div>
      )}

      {aba === "cliente" &&
        porCliente.map((g) => {
          const tri = trimestreAtual(g.cliente)
          const faltam = diasAteFechamentoCiclo(g.cliente)
          return (
            <div key={g.cliente.id} className="bg-card border border-border rounded-lg p-[14px] space-y-2">
              <div className="flex items-center justify-between gap-3 flex-wrap">
                <div className="flex items-center gap-2 text-sm">
                  <button onClick={() => openCliente(g.cliente.id)} className="font-semibold hover:text-primary">
                    {g.cliente.nome}
                  </button>
                  <span className="font-mono text-xs text-primary">{idMap.get(g.cliente.id)}</span>
                </div>
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <Badge value={g.cliente.temperatura} />
                  {tri !== null && <span>T{tri}</span>}
                  {faltam !== null && <span>· fecha em {faltam} dias</span>}
                </div>
              </div>

              <div className="divide-y divide-border/50">
                {g.alertas.map((a) =>
                  a.id === "fechamento_ciclo" ? (
                    <div key={a.id} className="flex items-center gap-2 py-2 flex-wrap">
                      <CalendarClock className="h-3.5 w-3.5 text-primary shrink-0" />
                      <span className="text-sm">{a.titulo}</span>
                      <span className="text-xs text-muted-foreground">· atividade criada: {a.acao}</span>
                      <Link
                        to={LINK_ATIVIDADES}
                        className="ml-auto text-xs px-2 py-1 rounded-md border border-border hover:border-primary"
                      >
                        Abrir atividade
                      </Link>
                    </div>
                  ) : a.estado === "acompanhando" ? (
                    <div key={a.id} className="flex items-center gap-2 py-2 text-xs text-muted-foreground">
                      <span>{a.titulo}</span>
                      <span>· acompanhando desde {fmtData(a.desde!)}</span>
                      <button
                        onClick={() => reverterAlerta(g.cliente.id, a.id)}
                        className="ml-auto underline hover:text-primary"
                      >
                        reverter
                      </button>
                    </div>
                  ) : (
                    <div key={a.id} className="flex items-center gap-2 py-2 flex-wrap">
                      <AlertCircle className="h-3.5 w-3.5 text-status-yellow shrink-0" />
                      <span className="text-sm">{a.titulo}</span>
                      <span className="text-xs text-muted-foreground">· {a.contexto}</span>
                      <div className="ml-auto flex items-center gap-1.5">
                        <button
                          onClick={() => abrirModal(g.cliente, a)}
                          className="text-xs px-2 py-1 rounded-md bg-primary text-primary-foreground font-semibold hover:bg-primary/90"
                        >
                          Criar atividade
                        </button>
                        <button
                          onClick={() => marcarAlerta(g.cliente.id, a.id, "acompanhando")}
                          className="text-xs px-2 py-1 rounded-md border border-border hover:border-primary"
                        >
                          Acompanhar
                        </button>
                        <button
                          onClick={() => marcarAlerta(g.cliente.id, a.id, "nao_se_aplica")}
                          className="text-xs px-2 py-1 rounded-md border border-border text-muted-foreground hover:border-primary"
                        >
                          Não se aplica
                        </button>
                      </div>
                    </div>
                  ),
                )}
                {g.ocultos.map((a) => (
                  <div key={a.id} className="flex items-center gap-2 py-2 text-xs text-muted-foreground">
                    <span className="line-through">{a.titulo}</span>
                    <span>· não se aplica</span>
                    <button
                      onClick={() => reverterAlerta(g.cliente.id, a.id)}
                      className="ml-auto underline hover:text-primary"
                    >
                      reverter
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )
        })}

      {aba === "tipo" && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
          {porTipo.map(([id, bucket]) => (
            <div key={id} className="bg-card border border-border rounded-lg p-4">
              <div className="flex items-center justify-between gap-2 mb-3">
                <div className="flex items-center gap-2">
                  <AlertCircle className="h-4 w-4 text-status-yellow" />
                  <div className="text-sm font-semibold">{bucket.titulo}</div>
                </div>
                <div className="text-xl font-bold tabular-nums">{bucket.itens.length}</div>
              </div>
              <div className="space-y-1 max-h-64 overflow-y-auto pr-1">
                {bucket.itens.map(({ cliente, alerta }) => (
                  <div
                    key={cliente.id}
                    className="flex items-center gap-2 text-xs bg-background border border-border rounded-md px-2 py-1.5"
                  >
                    <button
                      onClick={() => openCliente(cliente.id)}
                      className="font-mono text-primary hover:underline"
                    >
                      {idMap.get(cliente.id)}
                    </button>
                    <button
                      onClick={() => openCliente(cliente.id)}
                      className="truncate flex-1 text-left hover:text-primary font-medium"
                    >
                      {cliente.nome}
                    </button>
                    <span className="text-[10px] text-muted-foreground truncate hidden md:inline">
                      {alerta.contexto}
                    </span>
                    <button
                      onClick={() => abrirModal(cliente, alerta)}
                      className="text-[11px] px-2 py-0.5 rounded-md bg-primary text-primary-foreground font-semibold hover:bg-primary/90"
                    >
                      Criar atividade
                    </button>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {modalState && (
        <NovaAtividadeModal
          defaultClienteId={modalState.clienteId}
          defaultTitulo={modalState.titulo}
          origem="alerta_automatico"
          origemLabel={modalState.label}
          onClose={() => setModalState(null)}
        />
      )}
    </div>
  )
}
