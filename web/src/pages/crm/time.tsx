import { useMemo, useState } from "react"
import { useNavigate } from "react-router-dom"
import {
  getRole,
  useAtividades,
  useClientes,
  useProfile,
  useProjetos,
  useReunioes,
} from "@/lib/crm/storage"
import { CS_LIST, type Atividade, type CSName } from "@/lib/crm/types"
import { AlertTriangle, CalendarDays, Check, Lock, Plus } from "lucide-react"

/**
 * Torre de comando (coordenação).
 *
 * O acesso não é mais decidido aqui: a rota /crm/time já passa pelo
 * RequireSecao("crm/time") do PMC OS. Dentro da tela, "perfil" significa a CS
 * em foco — null quer dizer "todas as CSs", nunca o nome de quem está logado
 * (a coordenação não aparece em clientes_entrada_new.sc).
 */

const VERMELHO = "#E24B4A"
const AMBAR = "#E8A33D"
const VERDE = "#639922"

function startOfToday() {
  const n = new Date()
  return new Date(n.getFullYear(), n.getMonth(), n.getDate()).getTime()
}

function sameDayISO(iso: string | undefined) {
  if (!iso) return false
  const t = new Date(iso).getTime()
  if (isNaN(t)) return false
  return t >= startOfToday() && t < startOfToday() + 86400000
}

function diasDesde(iso?: string) {
  if (!iso) return 0
  const t = new Date(iso).getTime()
  if (isNaN(t)) return 0
  return Math.max(0, Math.floor((Date.now() - t) / 86400000))
}

/**
 * Quando a atividade foi criada. O original usava `status_desde` como proxy
 * porque o localStorage não guardava a criação — e isso contava como "criada
 * hoje" qualquer tarefa antiga que apenas mudasse de status hoje, inflando a
 * produtividade do time. `criado_em` vem de cliente_atividades.created_at.
 */
function criadaEm(a: Atividade) {
  return a.criado_em ?? a.status_desde ?? a.data_prevista
}

function hhmm(iso: string) {
  const d = new Date(iso)
  return isNaN(d.getTime())
    ? "--:--"
    : d.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })
}

function ddmm(iso: string) {
  const d = new Date(iso)
  return isNaN(d.getTime())
    ? "—"
    : d.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" })
}

type EventoTipo = "concluida" | "criada" | "travada" | "reuniao" | "silencio"

interface Evento {
  id: string
  em: string
  tipo: EventoTipo
  cs?: CSName
  texto: React.ReactNode
}

export default function CrmTimePage() {
  const clientes = useClientes()
  const atividades = useAtividades()
  const reunioes = useReunioes()
  const projetos = useProjetos()
  const [profile, setProfile] = useProfile()
  const navigate = useNavigate()
  const [filtroCS, setFiltroCS] = useState<"todas" | CSName>("todas")
  const [limite, setLimite] = useState(30)

  // Para uma CS o perfil é ela mesma ("Minhas tarefas"); para a coordenação é a
  // CS que ela escolheu olhar, e aí o rótulo precisa dizer de quem são.
  const souEu = getRole(profile) === "cs"

  const minhasTarefas = useMemo(() => {
    if (!profile) return []
    return atividades
      .filter(
        (a) => String(a.cs_responsavel) === String(profile) && a.status !== "Concluída",
      )
      .sort(
        (a, b) =>
          new Date(a.data_prevista).getTime() - new Date(b.data_prevista).getTime(),
      )
  }, [atividades, profile])

  const nomeCliente = useMemo(() => {
    const m = new Map<string, string>()
    clientes.forEach((c) => m.set(c.id, c.nome))
    return m
  }, [clientes])

  const concluidasHoje = atividades.filter(
    (a) => a.status === "Concluída" && sameDayISO(a.data_conclusao),
  )
  const criadasHoje = atividades.filter(
    (a) => a.status !== "Concluída" && sameDayISO(criadaEm(a)),
  )
  const reunioesHoje = reunioes.filter((r) => sameDayISO(r.data))
  const reunioesRealizadasHoje = reunioesHoje.filter((r) => r.status === "Realizada")

  const precisaDeVoce = useMemo(
    () =>
      atividades
        .filter(
          (a) =>
            a.status === "Impedida" && diasDesde(a.status_desde ?? a.data_prevista) > 7,
        )
        .sort(
          (a, b) =>
            new Date(a.status_desde ?? a.data_prevista).getTime() -
            new Date(b.status_desde ?? b.data_prevista).getTime(),
        ),
    [atividades],
  )

  const eventos = useMemo<Evento[]>(() => {
    const desde = Date.now() - 2 * 86400000
    const cli = (id?: string) => (id ? (nomeCliente.get(id) ?? "—") : "sem cliente")
    const out: Evento[] = []

    atividades.forEach((a) => {
      if (a.status === "Concluída" && a.data_conclusao) {
        const t = new Date(a.data_conclusao).getTime()
        if (t >= desde)
          out.push({
            id: `c-${a.id}`,
            em: a.data_conclusao,
            tipo: "concluida",
            cs: a.cs_responsavel,
            texto: (
              <>
                <b>{a.cs_responsavel}</b> concluiu {a.titulo}{" "}
                <span className="text-muted-foreground">· {cli(a.cliente_id)}</span>
              </>
            ),
          })
      }
      if (a.status === "Impedida") {
        const iso = criadaEm(a)
        const t = new Date(iso).getTime()
        if (t >= desde)
          out.push({
            id: `t-${a.id}`,
            em: iso,
            tipo: "travada",
            cs: a.cs_responsavel,
            texto: (
              <>
                <b>{a.cs_responsavel}</b> travou {a.titulo}{" "}
                <span className="text-muted-foreground">· {cli(a.cliente_id)}</span>
                {" — "}
                {a.motivo_impedimento || "motivo não informado"}
              </>
            ),
          })
      }
      if (a.status !== "Concluída") {
        const iso = criadaEm(a)
        const t = new Date(iso).getTime()
        if (t >= desde && a.status !== "Impedida")
          out.push({
            id: `n-${a.id}`,
            em: iso,
            tipo: "criada",
            cs: a.cs_responsavel,
            texto: (
              <>
                <b>{a.cs_responsavel}</b> criou {a.titulo}{" "}
                <span className="text-muted-foreground">· {cli(a.cliente_id)}</span>
              </>
            ),
          })
      }
    })

    reunioes.forEach((r) => {
      if (r.status !== "Realizada") return
      const dia = new Date(r.data)
      if (isNaN(dia.getTime())) return
      const iso = `${dia.toISOString().slice(0, 10)}T${r.hora_inicio || "09:00"}:00`
      const t = new Date(iso).getTime()
      if (isNaN(t) || t < desde) return
      out.push({
        id: `r-${r.id}`,
        em: iso,
        tipo: "reuniao",
        cs: r.cs_responsavel,
        texto: (
          <>
            <b>{r.cs_responsavel}</b> realizou reunião {r.titulo}{" "}
            <span className="text-muted-foreground">· {cli(r.cliente_id)}</span>
          </>
        ),
      })
    })

    return out.sort((a, b) => new Date(b.em).getTime() - new Date(a.em).getTime())
  }, [atividades, reunioes, nomeCliente])

  const eventosFiltrados = eventos.filter((e) => filtroCS === "todas" || e.cs === filtroCS)

  // No original o clique levava para /meu-dia?cs=X. Aqui o Meu Dia não lê a CS
  // da URL: quem manda é a "visão" da coordenação, então trocamos a visão e
  // navegamos. Para uma CS o setter é no-op (a visão dela é a carteira dela).
  const irParaCS = (cs: CSName) => {
    setProfile(cs)
    navigate("/crm/meu-dia")
  }

  return (
    <div className="p-6 space-y-6 min-h-full">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Torre de comando</h1>
        <span className="text-[12px] text-muted-foreground">atualizado agora</span>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card
          label="Em movimento hoje"
          value={String(concluidasHoje.length + criadasHoje.length)}
          hint={`${concluidasHoje.length} concluídas · ${criadasHoje.length} criadas`}
        />
        <Card
          label="Precisa de você"
          value={String(precisaDeVoce.length)}
          hint="travadas há mais de 7d"
          tone="danger"
        />
        <Card
          label="Reuniões hoje"
          value={String(reunioesHoje.length)}
          hint={`${reunioesRealizadasHoje.length} já realizadas`}
        />
        {/* O "sem resposta no grupo" depende do módulo de conversas do WhatsApp,
            que ainda não existe na camada de dados. Mostrar 0 diria "ninguém
            está sem resposta", que é diferente de "ainda não sabemos". */}
        <Card
          label="Sem resposta"
          value="—"
          hint="conversas do WhatsApp ainda não integradas"
          tone="amber"
        />
      </div>

      <div className="space-y-3">
        <h2 className="text-sm font-semibold">
          Precisa de você{" "}
          <span className="text-muted-foreground font-normal">
            ({precisaDeVoce.length})
          </span>
        </h2>
        {precisaDeVoce.length === 0 ? (
          <div className="text-sm text-muted-foreground">
            Nada travado há mais de 7 dias.
          </div>
        ) : (
          <div className="bg-card border border-border rounded-xl overflow-hidden">
            {precisaDeVoce.map((a, i) => (
              <button
                key={a.id}
                onClick={() => irParaCS(a.cs_responsavel)}
                className={`w-full flex items-start justify-between gap-4 px-5 py-3.5 text-left hover:bg-secondary/40 transition-colors ${
                  i > 0 ? "border-t border-border/60" : ""
                }`}
                style={i > 0 ? { borderTopWidth: "0.5px" } : undefined}
              >
                <div className="min-w-0">
                  <div className="text-sm truncate">
                    {a.titulo}
                    {a.cliente_id && (
                      <span className="text-muted-foreground">
                        {" · "}
                        {nomeCliente.get(a.cliente_id) ?? "—"}
                      </span>
                    )}
                  </div>
                  <div className="text-[12px] text-muted-foreground mt-0.5">
                    Motivo: {a.motivo_impedimento || "não informado"} · há{" "}
                    {diasDesde(a.status_desde ?? a.data_prevista)} dias
                  </div>
                </div>
                <span className="text-[12px] text-muted-foreground shrink-0">
                  {a.cs_responsavel}
                </span>
              </button>
            ))}
          </div>
        )}
      </div>

      {minhasTarefas.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center justify-between gap-3">
            <h2 className="text-sm font-semibold">
              {souEu ? "Minhas tarefas" : `Tarefas de ${profile}`}{" "}
              <span className="text-muted-foreground font-normal">
                ({minhasTarefas.length})
              </span>
            </h2>
            <button
              onClick={() => navigate("/crm/atividades?periodo=semana&aba=atividades")}
              className="text-[12px] text-muted-foreground hover:text-foreground underline underline-offset-4"
            >
              ver todas
            </button>
          </div>
          <div className="bg-card border border-border rounded-xl overflow-hidden">
            {minhasTarefas.slice(0, 5).map((a, i) => {
              const proj = a.projeto_id
                ? projetos.find((p) => p.id === a.projeto_id)
                : undefined
              const contexto = a.cliente_id ? nomeCliente.get(a.cliente_id) : proj?.titulo
              return (
                <div
                  key={a.id}
                  className={`flex items-center justify-between gap-4 px-5 py-3 ${
                    i > 0 ? "border-t border-border/60" : ""
                  }`}
                  style={i > 0 ? { borderTopWidth: "0.5px" } : undefined}
                >
                  <div className="min-w-0 text-sm truncate">
                    {a.titulo}
                    {contexto && (
                      <span className="text-muted-foreground">
                        {" · "}
                        {contexto}
                      </span>
                    )}
                  </div>
                  <span className="text-[12px] text-muted-foreground shrink-0 tabular-nums">
                    {ddmm(a.data_prevista)}
                  </span>
                </div>
              )
            })}
          </div>
        </div>
      )}

      <div className="space-y-3">
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-sm font-semibold">Acontecendo agora</h2>
          <select
            value={filtroCS}
            onChange={(e) => {
              setFiltroCS(e.target.value as "todas" | CSName)
              setLimite(30)
            }}
            className="bg-card border border-border rounded-lg px-3 py-1.5 text-[12px]"
          >
            <option value="todas">Todas as CS</option>
            {CS_LIST.map((cs) => (
              <option key={cs} value={cs}>
                {cs}
              </option>
            ))}
          </select>
        </div>

        {eventosFiltrados.length === 0 ? (
          <div className="text-sm text-muted-foreground">
            Nenhum evento nos últimos 2 dias.
          </div>
        ) : (
          <>
            <div className="bg-card border border-border rounded-xl overflow-hidden">
              {eventosFiltrados.slice(0, limite).map((e, i) => (
                <div
                  key={e.id}
                  className={`flex items-start gap-3 px-5 py-3 text-sm ${
                    i > 0 ? "border-t border-border/60" : ""
                  }`}
                  style={i > 0 ? { borderTopWidth: "0.5px" } : undefined}
                >
                  <span className="text-[12px] text-muted-foreground tabular-nums shrink-0 w-10">
                    {hhmm(e.em)}
                  </span>
                  <span className="shrink-0 mt-0.5">
                    <EventoIcone tipo={e.tipo} />
                  </span>
                  <span className="min-w-0">{e.texto}</span>
                </div>
              ))}
            </div>
            {eventosFiltrados.length > limite && (
              <button
                onClick={() => setLimite((n) => n + 30)}
                className="text-[12px] text-muted-foreground hover:text-foreground underline underline-offset-4"
              >
                Ver mais
              </button>
            )}
          </>
        )}
      </div>
    </div>
  )
}

function EventoIcone({ tipo }: { tipo: EventoTipo }) {
  if (tipo === "concluida") return <Check className="h-4 w-4" style={{ color: VERDE }} />
  if (tipo === "criada") return <Plus className="h-4 w-4 text-muted-foreground" />
  if (tipo === "travada") return <Lock className="h-4 w-4" style={{ color: VERMELHO }} />
  if (tipo === "reuniao") return <CalendarDays className="h-4 w-4 text-muted-foreground" />
  return <AlertTriangle className="h-4 w-4" style={{ color: AMBAR }} />
}

function Card({
  label,
  value,
  hint,
  tone = "default",
}: {
  label: string
  value: string
  hint?: string
  tone?: "default" | "danger" | "amber"
}) {
  return (
    <div
      className={`rounded-xl border p-5 ${
        tone === "danger"
          ? "bg-[#E24B4A]/10 border-[#E24B4A]/40"
          : "bg-card border-border"
      }`}
    >
      <div className="text-[11px] uppercase tracking-wider text-muted-foreground">
        {label}
      </div>
      <div
        className={`mt-2 text-2xl font-bold ${tone === "danger" ? "text-[#E24B4A]" : ""}`}
      >
        {value}
      </div>
      {hint && (
        <div
          className="text-[12px] mt-1"
          style={{
            color: tone === "amber" ? AMBAR : tone === "danger" ? VERMELHO : undefined,
          }}
        >
          <span className={tone === "default" ? "text-muted-foreground" : ""}>{hint}</span>
        </div>
      )}
    </div>
  )
}
