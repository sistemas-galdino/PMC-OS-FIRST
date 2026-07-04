import type { ReactNode } from "react"
import { Link } from "react-router-dom"

import { PageHeader, StatCard, Badge, FaseBadge } from "@/components/guardiao/ui-kit"
import {
  useStore, FASES, progressoFase, PROXIMA_ACAO_FASE,
  type Fase,
} from "@/lib/guardiao"
import { Button } from "@/components/ui/button"
import {
  ArrowRight, FileText, MessageSquare, Clock, AlertCircle, Trophy,
  Building2, ListChecks, AlertTriangle, Briefcase, Clock4, CalendarCheck,
} from "lucide-react"

export default function Painel() {
  const st = useStore((s) => s)
  const setores = st.setores
  const projetos = st.projetos
  const tarefas = st.tarefas
  const gargalos = st.gargalos
  const vitorias = st.vitorias ?? []
  const feedbacks = st.feedbacks ?? []
  const tarefasRep = st.tarefasRepetitivas ?? []

  const hojeISO = new Date().toISOString().slice(0, 10)

  const setoresEmImpl = setores.filter((s) => s.status && s.status !== "Não iniciado").length || setores.length
  const projetosAtivos = projetos.filter((p) => !["Apresentado ao time"].includes(p.status)).length
  const tarefasAbertas = tarefas.filter((t) => t.status !== "Concluído" && t.status !== "Concluída").length
  const horasMes = Math.round(tarefasRep.reduce((a, t) => a + (t.tempoMes || 0), 0) * 0.5)
  const feedbacksPend = feedbacks.filter((f) => f.status === "Aguardando retorno" || f.status === "Em andamento").length

  const proximaApresent = tarefas
    .filter((t) => /apresent.*ceo|ceo|relat/i.test(t.titulo) && t.prazo && t.prazo >= hojeISO && t.status !== "Concluído")
    .sort((a, b) => a.prazo.localeCompare(b.prazo))[0]?.prazo ?? "—"

  return (
    <div className="space-y-6">
      <PageHeader
        title="Painel de Controle do Guardião"
        subtitle="Acompanhe setores, projetos, tarefas, vitórias e próximos passos da implementação de IA."
        action={
          <Button asChild>
            <Link to="/guardiao/relatorio">
              <FileText className="h-4 w-4" /> Relatório para CEO
            </Link>
          </Button>
        }
      />

      {/* Indicadores principais (rotina do Guardião) */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <StatCard label="Setores em implementação" value={setoresEmImpl} />
        <StatCard label="Projetos ativos" value={projetosAtivos} />
        <StatCard label="Tarefas abertas" value={tarefasAbertas} />
        <StatCard label="Gargalos mapeados" value={gargalos.length} />
        <StatCard label="Vitórias registradas" value={vitorias.length} />
        <StatCard label="Horas economizadas (mês)" value={`${horasMes}h`} />
        <StatCard label="Feedbacks pendentes" value={feedbacksPend} />
        <StatCard label="Próxima apresentação CEO" value={proximaApresent} hint={proximaApresent === "—" ? "Sem agendamento" : "Próxima data prevista"} />
      </div>

      <MinhaSemana />

      <ProjetosPorSetor />

      <ResumoExecutivoCEO />

      <ConsultaMetodologia />
    </div>
  )
}

// ---------- Minha semana como Guardião ----------
function MinhaSemana() {
  const tarefas = useStore((s) => s.tarefas)
  const feedbacks = useStore((s) => s.feedbacks ?? [])
  const vitorias = useStore((s) => s.vitorias ?? [])
  const setores = useStore((s) => s.setores)
  const evidencias = useStore((s) => s.evidencias)
  const projetos = useStore((s) => s.projetos)

  const hoje = new Date()
  const fim = new Date(hoje.getTime() + 7 * 86400000).toISOString().slice(0, 10)
  const hojeISO = hoje.toISOString().slice(0, 10)
  const seteDias = new Date(hoje.getTime() - 7 * 86400000).toISOString().slice(0, 10)

  const tarefasSemana = tarefas
    .filter((t) => t.prazo && t.prazo >= hojeISO && t.prazo <= fim && t.status !== "Concluído")
    .sort((a, b) => a.prazo.localeCompare(b.prazo))
    .slice(0, 6)

  const tarefasAtrasadas = tarefas.filter((t) =>
    t.status !== "Concluído" && t.status !== "Concluída" && t.prazo && t.prazo < hojeISO
  )

  const feedbacksPend = feedbacks.filter((f) => f.status === "Aguardando retorno" || f.status === "Em andamento")

  const setoresSemAvanco = setores.filter((s) => {
    const ult = [
      ...tarefas.filter((t) => t.setorId === s.id).map((t) => t.prazo || ""),
      ...evidencias.filter((e) => e.setorId === s.id).map((e) => e.data?.slice(0, 10) || ""),
      ...feedbacks.filter((f) => f.setorId === s.id).map((f) => f.atualizadoEm?.slice(0, 10) || ""),
    ].sort().reverse()[0]
    return !ult || ult < seteDias
  })

  const projetosTravados = projetos.filter((p) => p.status === "Travado" || /trav/i.test(p.status))

  const vitoriasRascunho = vitorias.filter((v) => v.status === "Rascunho")

  return (
    <div className="mt-8">
      <div className="flex items-center justify-between mb-3">
        <div>
          <h3 className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">Minha semana como Guardião</h3>
          <p className="text-xs text-muted-foreground mt-1">O que precisa de atenção nos próximos 7 dias.</p>
        </div>
      </div>

      <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-3">
        <CardSemana icon={<ListChecks className="h-4 w-4" />} title="Tarefas da semana" empty="Nenhuma tarefa na semana.">
          {tarefasSemana.map((t) => (
            <Link key={t.id} to="/guardiao/tarefas" className="flex items-center justify-between gap-2 p-2 bg-muted rounded-md hover:glow-neon">
              <div className="min-w-0">
                <div className="text-sm truncate">{t.titulo}</div>
                <div className="text-[11px] text-muted-foreground">{t.prazo} · {t.responsavel || "—"}</div>
              </div>
              {t.fase && <FaseBadge fase={t.fase} />}
            </Link>
          ))}
        </CardSemana>

        <CardSemana
          icon={<Clock className="h-4 w-4 text-amber-400" />}
          title={`Tarefas atrasadas (${tarefasAtrasadas.length})`}
          empty="Tudo em dia. Bom trabalho."
        >
          {tarefasAtrasadas.slice(0, 5).map((t) => (
            <Link key={t.id} to="/guardiao/tarefas" className="flex items-center justify-between gap-2 p-2 bg-muted rounded-md">
              <div className="min-w-0">
                <div className="text-sm truncate">{t.titulo}</div>
                <div className="text-[11px] text-amber-300">Prazo {t.prazo}</div>
              </div>
              <Badge tone="warn">{t.prioridade}</Badge>
            </Link>
          ))}
        </CardSemana>

        <CardSemana
          icon={<MessageSquare className="h-4 w-4 text-primary" />}
          title={`Feedbacks pendentes (${feedbacksPend.length})`}
          empty="Nenhum feedback aguardando retorno."
        >
          {feedbacksPend.slice(0, 5).map((f) => (
            <Link key={f.id} to="/guardiao/feedbacks" className="flex items-center justify-between gap-2 p-2 bg-muted rounded-md">
              <div className="min-w-0">
                <div className="text-sm truncate">{f.titulo}</div>
                <div className="text-[11px] text-muted-foreground">Líder {f.liderDestinatario}</div>
              </div>
              <FaseBadge fase={f.fase} />
            </Link>
          ))}
        </CardSemana>

        <CardSemana
          icon={<AlertCircle className="h-4 w-4 text-amber-400" />}
          title={`Setores sem avanço (${setoresSemAvanco.length})`}
          empty="Todos os setores tiveram atividade recente."
        >
          {setoresSemAvanco.slice(0, 5).map((s) => (
            <Link key={s.id} to={`/guardiao/setores/${s.id}`} className="flex items-center justify-between gap-2 p-2 bg-muted rounded-md">
              <div className="text-sm truncate">{s.nome}</div>
              <FaseBadge fase={(s.faseAtual ?? 1) as Fase} />
            </Link>
          ))}
        </CardSemana>

        <CardSemana
          icon={<AlertTriangle className="h-4 w-4 text-amber-400" />}
          title={`Projetos travados (${projetosTravados.length})`}
          empty="Nenhum projeto travado."
        >
          {projetosTravados.slice(0, 5).map((p) => (
            <Link key={p.id} to={`/guardiao/projetos/${p.id}`} className="flex items-center justify-between gap-2 p-2 bg-muted rounded-md">
              <div className="text-sm truncate">{p.nome}</div>
              <Badge tone="warn">{p.status}</Badge>
            </Link>
          ))}
        </CardSemana>

        <CardSemana
          icon={<Trophy className="h-4 w-4 text-primary" />}
          title={`Vitórias para registrar (${vitoriasRascunho.length})`}
          empty="Sem rascunhos pendentes."
        >
          {vitoriasRascunho.slice(0, 5).map((v) => (
            <Link key={v.id} to="/guardiao/vitorias" className="flex items-center justify-between gap-2 p-2 bg-muted rounded-md">
              <div className="text-sm truncate">{v.titulo}</div>
              <FaseBadge fase={v.fase} />
            </Link>
          ))}
        </CardSemana>
      </div>
    </div>
  )
}

function CardSemana({ icon, title, empty, children }: { icon: ReactNode; title: string; empty: string; children: ReactNode }) {
  const hasChildren = Array.isArray(children) ? children.length > 0 : !!children
  return (
    <div className="rounded-lg border bg-card p-4">
      <div className="flex items-center gap-2 text-xs font-semibold mb-2">{icon}{title}</div>
      <div className="space-y-1.5">
        {hasChildren ? children : <div className="text-xs text-muted-foreground">{empty}</div>}
      </div>
    </div>
  )
}

// ---------- Projetos por setor ----------
function ProjetosPorSetor() {
  const setores = useStore((s) => s.setores)
  const projetos = useStore((s) => s.projetos)
  const tarefas = useStore((s) => s.tarefas)
  const gargalos = useStore((s) => s.gargalos)
  const vitorias = useStore((s) => s.vitorias ?? [])
  const feedbacks = useStore((s) => s.feedbacks ?? [])
  const sugestoes = useStore((s) => s.sugestoesIA ?? [])

  if (setores.length === 0) return null

  return (
    <div className="mt-8">
      <div className="flex items-center justify-between mb-3">
        <div>
          <h3 className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">Projetos por setor</h3>
          <p className="text-xs text-muted-foreground mt-1">Onde cada setor está, qual o projeto principal e o que vem agora.</p>
        </div>
        <Link to="/guardiao/setores" className="text-xs text-primary">Abrir setores →</Link>
      </div>

      <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-3">
        {setores.map((s) => {
          const fase = (s.faseAtual ?? 1) as Fase
          const faseInfo = FASES.find((f) => f.num === fase)
          const projetosSetor = projetos.filter((p) => p.setorId === s.id)
          const projAtivo = projetosSetor.find((p) => !["Apresentado ao time"].includes(p.status)) ?? projetosSetor[0]
          const tarefasAbertas = tarefas.filter((t) => t.setorId === s.id && t.status !== "Concluído" && t.status !== "Concluída").length
          const gargs = gargalos.filter((g) => g.setorId === s.id).length
          const vits = vitorias.filter((v) => v.setorId === s.id).length
          const ultFb = feedbacks.find((f) => f.setorId === s.id)
          const proxima = sugestoes.find((x) => x.setorId === s.id && x.tipo === "Próxima ação")?.texto
            ?? PROXIMA_ACAO_FASE[fase]

          return (
            <div key={s.id} className="rounded-lg border bg-card p-4 flex flex-col gap-2">
              <div className="flex items-start justify-between gap-2 flex-wrap">
                <div className="min-w-0">
                  <div className="text-sm font-semibold truncate flex items-center gap-2">
                    <Building2 className="h-4 w-4 text-primary" />
                    {s.nome}
                  </div>
                  <div className="text-[11px] text-muted-foreground mt-0.5">
                    Líder {s.lider || "—"} · Guardião {s.guardiao || "—"}
                  </div>
                </div>
                <FaseBadge fase={fase} titulo={faseInfo?.titulo} />
              </div>

              {projAtivo ? (
                <div className="text-[12px] p-2 rounded bg-muted">
                  <div className="text-muted-foreground">Projeto principal</div>
                  <div className="font-medium truncate">{projAtivo.nome}</div>
                  <div className="text-[11px] text-muted-foreground mt-0.5">{projAtivo.status}</div>
                </div>
              ) : (
                <div className="text-[11px] text-muted-foreground italic">Sem projeto principal definido</div>
              )}

              <div className="grid grid-cols-3 gap-1 text-center text-[10px]">
                <div className="p-1.5 rounded bg-muted">
                  <div className="text-primary font-semibold text-sm">{tarefasAbertas}</div>
                  <div className="text-muted-foreground">tarefas</div>
                </div>
                <div className="p-1.5 rounded bg-muted">
                  <div className="font-semibold text-sm text-amber-300">{gargs}</div>
                  <div className="text-muted-foreground">gargalos</div>
                </div>
                <div className="p-1.5 rounded bg-muted">
                  <div className="font-semibold text-sm text-emerald-300">{vits}</div>
                  <div className="text-muted-foreground">vitórias</div>
                </div>
              </div>

              <div className="text-[11px] p-2 rounded bg-primary/10 border border-primary/20">
                <span className="text-primary font-medium">Próxima ação: </span>{proxima}
              </div>

              {ultFb && (
                <div className="text-[11px] text-muted-foreground flex items-center gap-1.5 truncate">
                  <MessageSquare className="h-3 w-3 text-primary" />
                  <span className="truncate">Último feedback: {ultFb.titulo}</span>
                </div>
              )}

              <div className="flex gap-2 mt-1">
                {projAtivo && (
                  <Link
                    to={`/guardiao/projetos/${projAtivo.id}`}
                    className="flex-1 text-xs text-center px-2 py-1.5 rounded-md bg-primary text-primary-foreground font-medium"
                  >
                    Abrir projeto
                  </Link>
                )}
                <Link
                  to={`/guardiao/setores/${s.id}`}
                  className="flex-1 text-xs text-center px-2 py-1.5 rounded-md bg-muted hover:bg-card transition"
                >
                  Ver setor
                </Link>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

// ---------- Resumo executivo CEO ----------
function ResumoExecutivoCEO() {
  const setores = useStore((s) => s.setores)
  const projetos = useStore((s) => s.projetos)
  const gargalos = useStore((s) => s.gargalos)
  const vitorias = useStore((s) => s.vitorias ?? [])
  const itensIA = useStore((s) => s.itensIA ?? [])
  const tarefasRep = useStore((s) => s.tarefasRepetitivas ?? [])
  const feedbacks = useStore((s) => s.feedbacks ?? [])

  if (setores.length === 0) return null

  const setoresComIA = setores.filter((s) => itensIA.some((i) => i.setorId === s.id) || projetos.some((p) => p.setorId === s.id)).length
  const horasMes = Math.round(tarefasRep.reduce((a, t) => a + (t.tempoMes || 0), 0) * 0.5)
  const sistemasImpl = itensIA.filter((i) => i.tipo === "Sistema").length
  const gargCriticos = gargalos.filter((g) => g.prioridade === "Alta").length
  const decisaoCEO = feedbacks.filter((f) => /decis|ceo|aprov/i.test(f.proximaAcao || "")).length

  return (
    <div className="mt-8">
      <div className="flex items-center justify-between mb-3">
        <div>
          <h3 className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">Resumo executivo para CEO</h3>
          <p className="text-xs text-muted-foreground mt-1">Visão estratégica para apresentar ao CEO em poucos segundos.</p>
        </div>
        <Link to="/guardiao/relatorio" className="text-xs text-primary">Abrir relatório completo →</Link>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-3">
        <MiniExec icon={<Briefcase className="h-4 w-4" />} k="Setores com IA" v={setoresComIA} />
        <MiniExec icon={<Trophy className="h-4 w-4" />} k="Vitórias" v={vitorias.length} />
        <MiniExec icon={<Clock4 className="h-4 w-4" />} k="Horas econ./mês" v={`${horasMes}h`} />
        <MiniExec icon={<AlertTriangle className="h-4 w-4" />} k="Gargalos críticos" v={gargCriticos} />
        <MiniExec icon={<Building2 className="h-4 w-4" />} k="Sistemas implantados" v={sistemasImpl} />
        <MiniExec icon={<MessageSquare className="h-4 w-4" />} k="Decisões pendentes" v={decisaoCEO} />
        <MiniExec icon={<CalendarCheck className="h-4 w-4" />} k="Projetos ativos" v={projetos.filter((p) => p.status !== "Apresentado ao time").length} />
        <MiniExec icon={<ListChecks className="h-4 w-4" />} k="Setores acompanhados" v={setores.length} />
      </div>

      <div className="rounded-lg border bg-card overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-muted text-xs uppercase tracking-wider text-muted-foreground">
            <tr>
              <th className="text-left p-2">Setor</th>
              <th className="text-center p-2">Fase</th>
              <th className="text-left p-2">Projeto em andamento</th>
              <th className="text-left p-2">Principal gargalo</th>
              <th className="text-left p-2">Resultado</th>
              <th className="text-left p-2">Próxima decisão</th>
            </tr>
          </thead>
          <tbody>
            {setores.map((s) => {
              const fase = (s.faseAtual ?? 1) as Fase
              const proj = projetos.find((p) => p.setorId === s.id && p.status !== "Apresentado ao time")
              const garg = gargalos.find((g) => g.setorId === s.id && g.prioridade === "Alta") ?? gargalos.find((g) => g.setorId === s.id)
              const vit = vitorias.find((v) => v.setorId === s.id)
              const fb = feedbacks.find((f) => f.setorId === s.id)
              return (
                <tr key={s.id} className="border-t border-border/40 hover:bg-muted/40">
                  <td className="p-2 font-medium">
                    <Link to={`/guardiao/setores/${s.id}`} className="hover:text-primary">{s.nome}</Link>
                  </td>
                  <td className="text-center p-2"><FaseBadge fase={fase} /></td>
                  <td className="p-2 text-xs truncate max-w-[200px]" title={proj?.nome}>{proj?.nome ?? "—"}</td>
                  <td className="p-2 text-xs truncate max-w-[220px]" title={garg?.descricao}>{garg?.processo ?? garg?.descricao ?? "—"}</td>
                  <td className="p-2 text-xs truncate max-w-[200px]" title={vit?.titulo}>{vit?.titulo ?? "—"}</td>
                  <td className="p-2 text-xs truncate max-w-[240px]" title={fb?.proximaAcao}>{fb?.proximaAcao ?? s.resumoCEO?.slice(0, 60) ?? "—"}</td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}

function MiniExec({ icon, k, v }: { icon: ReactNode; k: string; v: number | string }) {
  return (
    <div className="rounded-lg border bg-card p-3 flex items-center gap-3">
      <div className="h-9 w-9 rounded-lg bg-muted flex items-center justify-center text-primary">{icon}</div>
      <div className="min-w-0">
        <div className="text-[10px] uppercase tracking-wider text-muted-foreground truncate">{k}</div>
        <div className="text-lg font-semibold text-primary">{v}</div>
      </div>
    </div>
  )
}

// ---------- Consulta da metodologia ----------
function ConsultaMetodologia() {
  const st = useStore((s) => s)

  return (
    <div className="mt-10">
      <div className="flex items-center justify-between mb-3">
        <div>
          <h3 className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">Consulta da Metodologia</h3>
          <p className="text-xs text-muted-foreground mt-1">Use as fases como guia para entender o caminho da implementação.</p>
        </div>
        <Link to="/guardiao/jornada" className="text-xs text-primary">Abrir jornada →</Link>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 xl:grid-cols-7 gap-2">
        {FASES.map((f) => {
          const setoresNaFase = st.setores.filter((s) => (s.faseAtual ?? 1) === f.num).length
          const tarefasNaFase = st.tarefas.filter((t) => t.fase === f.num).length
          const prog = progressoFase(st, f.num)
          return (
            <Link
              key={f.num}
              to={`/guardiao/fases/${f.num}`}
              className="rounded-lg border bg-card p-3 flex flex-col gap-2 hover:glow-neon transition"
            >
              <div className="flex items-center justify-between">
                <FaseBadge fase={f.num} />
              </div>
              <div className="text-xs font-semibold leading-tight line-clamp-2">{f.titulo}</div>
              <div className="text-[10px] text-muted-foreground line-clamp-2">{f.objetivo}</div>
              <div className="h-1 w-full bg-muted rounded-full overflow-hidden">
                <div className="h-full bg-primary" style={{ width: `${prog}%` }} />
              </div>
              <div className="flex items-center justify-between text-[10px] text-muted-foreground">
                <span>{setoresNaFase} set.</span>
                <span>{tarefasNaFase} tar.</span>
                <span className="text-primary inline-flex items-center gap-0.5">Ver <ArrowRight className="h-3 w-3" /></span>
              </div>
            </Link>
          )
        })}
      </div>
    </div>
  )
}
