import { useState, useMemo, type ReactNode } from "react"
import { Link, useNavigate, useParams, useSearchParams } from "react-router-dom"
import { toast } from "sonner"

import { Badge, FaseBadge, FaseRegua } from "@/components/guardiao/ui-kit"
import {
  actions, useStore, FASES, FREQ_REPETITIVA, IMPACTOS_TAREFA, TIPOS_ITEM_IA,
  STATUS_FEEDBACK_LIDER, sugerirParaSetor,
  type FrequenciaRepetitiva, type ImpactoTarefa, type Fase,
  type ProcessoSetor, type TarefaRepetitiva, type ItemIANoSetor, type SugestaoIA,
  type TipoItemIA, type FeedbackLider, type StatusFeedbackLider, type Prioridade,
  type Setor,
} from "@/lib/guardiao"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import {
  Select, SelectTrigger, SelectValue, SelectContent, SelectItem,
} from "@/components/ui/select"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  ArrowLeft, Play, Share2, Plus, Trash2, Sparkles, Loader2, ChevronDown, ExternalLink,
} from "lucide-react"

/* ------- GSelect (Radix Select proíbe SelectItem com value ""; sentinel interno) ------- */
type Opt = { value: string; label: string }
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

const faseOptions: Opt[] = FASES.map((f) => ({ value: String(f.num), label: `Fase 0${f.num} — ${f.titulo}` }))

type TabId = "visao" | "diag" | "sugestoes" | "plano" | "vitorias" | "ceo"
const TABS: Array<{ id: TabId; label: string }> = [
  { id: "visao", label: "Visão Geral" },
  { id: "diag", label: "Diagnóstico Guiado" },
  { id: "sugestoes", label: "Sugestões da IA" },
  { id: "plano", label: "Plano de Execução" },
  { id: "vitorias", label: "Vitórias" },
  { id: "ceo", label: "Resumo para CEO" },
]

export default function SetorDetalhe() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const setor = useStore((s) => s.setores.find((x) => x.id === id))
  const gargalos = useStore((s) => s.gargalos.filter((g) => g.setorId === id))
  const projetos = useStore((s) => s.projetos.filter((p) => p.setorId === id))
  const processos = useStore((s) => (s.processosSetor ?? []).filter((p) => p.setorId === id))
  const tarefasRep = useStore((s) => (s.tarefasRepetitivas ?? []).filter((t) => t.setorId === id))
  const sugestoes = useStore((s) => (s.sugestoesIA ?? []).filter((g) => g.setorId === id))
  const itensIA = useStore((s) => (s.itensIA ?? []).filter((i) => i.setorId === id))
  const vitorias = useStore((s) => (s.vitorias ?? []).filter((v) => v.setorId === id))
  const tarefasSetor = useStore((s) => s.tarefas.filter((t) => t.setorId === id))

  const [tab, setTab] = useState<TabId>(() => (searchParams.get("tab") as TabId) || "visao")
  const [loadingIA, setLoadingIA] = useState(false)

  if (!setor) {
    return (
      <div className="space-y-6">
        <div className="rounded-lg border card-glass p-10 text-center">
          <div className="text-base font-medium">Setor não encontrado</div>
          <Link to="/guardiao/setores" className="text-sm text-primary mt-2 inline-block">← Voltar para setores</Link>
        </div>
      </div>
    )
  }

  // ---------- Indicadores agregados ----------
  const horasSemanaTarefas = tarefasRep.reduce((a, t) => a + (t.tempoSemana || 0), 0)
  const horasMesTarefas = tarefasRep.reduce((a, t) => a + (t.tempoMes || 0), 0)
  const horasMesEconomizadas = Math.round(horasMesTarefas * 0.5)
  const horasSemanaEconomizadas = Math.round(horasSemanaTarefas * 0.5)
  const horasDiaEconomizadas = Math.round((horasMesEconomizadas / 22) * 10) / 10

  const sistemasSug = sugestoes.filter((s) => s.tipo === "Sistema").length
  const agentesSug = sugestoes.filter((s) => s.tipo === "Agente").length
  const automacoesSug = sugestoes.filter((s) => s.tipo === "Automação").length
  const sistemasImpl = itensIA.filter((i) => i.tipo === "Sistema").length
  const efAv = vitorias.filter((v) => v.percentualEficiencia > 0)
  const eficiencia = efAv.length ? Math.round(efAv.reduce((a, v) => a + v.percentualEficiencia, 0) / efAv.length) : 0
  const reducaoCusto = vitorias.reduce((a, v) => a + (v.valorCustoEconomizado || 0), 0)
  const projetosImplantados = projetos.filter((p) => ["Implementado", "Medindo resultados", "Apresentado ao CEO", "Apresentado ao time"].includes(p.status)).length

  const statusIA = projetosImplantados > 0 || itensIA.length > 0 ? "IA já em uso"
    : sugestoes.length > 0 ? "Diagnóstico feito"
    : tarefasRep.length || processos.length ? "Em mapeamento"
    : "Não iniciado"

  // ---------- Sugestões IA ----------
  const gerarSugestoes = async () => {
    setLoadingIA(true)
    try {
      const out = await sugerirParaSetor({
        setorNome: setor.nome,
        liderNome: setor.lider,
        guardiaoNome: setor.guardiao,
        quantidadePessoas: setor.quantidadePessoas ?? (setor.time?.length ?? 0),
        faseAtual: (setor.faseAtual ?? 1) as number,
        time: (setor.time ?? []).map((p) => ({ nome: p.nome, cargo: p.cargo, funcao: p.funcao })),
        processos: processos.map((p) => ({
          nome: p.nome, descricao: p.descricao, quemExecuta: p.quemExecuta,
          ferramentas: p.ferramentas, temPlanilha: p.temPlanilha, impacto: p.impacto,
        })),
        tarefasRepetitivas: tarefasRep.map((t) => ({
          nome: t.nome, frequencia: t.frequencia,
          tempoSemana: t.tempoSemana, tempoMes: t.tempoMes, impactos: t.impactos as string[],
        })),
        gargalos: gargalos.map((g) => ({ processo: g.processo, prioridade: g.prioridade, tempo: g.tempo, impactos: g.impactos })),
      })

      const lote: Array<Omit<SugestaoIA, "id" | "setorId" | "criadoEm" | "status">> = []
      lote.push({ tipo: "Diagnóstico", titulo: "Diagnóstico do setor", texto: out.diagnostico, prioridade: "Fazer agora", faseSugerida: (setor.faseAtual ?? 1) as Fase })
      out.principaisGargalos.forEach((g) => lote.push({ tipo: "Gargalo", titulo: g, texto: g, prioridade: "Fazer agora", faseSugerida: 3 }))
      out.tarefasMaiorImpacto.forEach((g) => lote.push({ tipo: "Tarefa de maior impacto", titulo: g, texto: g, prioridade: "Planejar", faseSugerida: 3 }))
      const normPrio = (p: string): "Fazer agora" | "Planejar" | "Deixar para depois" => {
        const s = (p || "").toLowerCase()
        if (s.includes("agora") || s.includes("alta")) return "Fazer agora"
        if (s.includes("depois") || s.includes("baixa")) return "Deixar para depois"
        return "Planejar"
      }
      const map = (it: { nome: string; descricao: string; faseSugerida: number; prioridade: string }, tipo: SugestaoIA["tipo"]): Omit<SugestaoIA, "id" | "setorId" | "criadoEm" | "status"> =>
        ({ tipo, titulo: it.nome, texto: it.descricao, prioridade: normPrio(it.prioridade), faseSugerida: Math.min(7, Math.max(1, it.faseSugerida || 1)) as Fase })
      out.melhorias.forEach((m) => lote.push(map(m, "Melhoria")))
      out.sistemasSugeridos.forEach((m) => lote.push(map(m, "Sistema")))
      out.agentesSugeridos.forEach((m) => lote.push(map(m, "Agente")))
      out.automacoesSugeridas.forEach((m) => lote.push(map(m, "Automação")))
      lote.push({ tipo: "Próxima ação", titulo: "Próxima ação recomendada", texto: out.proximaAcao, prioridade: "Fazer agora", faseSugerida: (setor.faseAtual ?? 1) as Fase })

      actions.addSugestoesIABatch(setor.id, lote)

      if (out.resumoCEO && !setor.resumoCEO) {
        actions.updateSetor(setor.id, { resumoCEO: out.resumoCEO })
      }
      toast.success(`IA gerou ${lote.length} sugestões para o setor.`)
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err)
      if (msg.includes("RATE_LIMIT")) toast.error("IA ocupada. Tente novamente.")
      else if (msg.includes("CREDITS_EXHAUSTED")) toast.error("Créditos de IA esgotados.")
      else toast.error("Erro ao gerar sugestões: " + msg)
    } finally {
      setLoadingIA(false)
    }
  }

  const gerarResumoLocal = () => {
    const tarefas = tarefasRep.length
    const procs = processos.length
    const garg = gargalos.length
    const faseTitulo = FASES.find((f) => f.num === ((setor.faseAtual ?? 1) as Fase))?.titulo ?? ""
    const principalGargalo = gargalos.find((g) => g.prioridade === "Alta")?.processo || gargalos[0]?.processo || "(definir)"
    const oportunidade = sugestoes.find((s) => s.tipo === "Sistema" || s.tipo === "Automação" || s.tipo === "Agente")?.titulo || "—"
    const piloto = setor.diagnostico?.primeiroPiloto
      || sugestoes.find((s) => s.tipo === "Sistema")?.titulo
      || projetos[0]?.nome || "(definir)"
    const decisao = setor.validacaoCEO?.oQueValidar || "Aprovar o início do projeto piloto recomendado."
    const texto =
`Setor: ${setor.nome}
Fase atual: Fase 0${setor.faseAtual ?? 1} — ${faseTitulo}
Líder responsável: ${setor.lider || "—"}
Guardião responsável: ${setor.guardiao || "—"}

O que foi identificado:
Foram mapeadas ${tarefas} atividades repetitivas, ${procs} processos e ${garg} gargalos principais.

Principal gargalo:
${principalGargalo}

Oportunidade com IA:
${oportunidade}

Projeto piloto recomendado:
${piloto}

Resultado esperado:
Redução estimada de ${horasMesEconomizadas}h por mês e ganho de ${eficiencia || 20}% de eficiência operacional.

Próxima decisão necessária:
${decisao}`
    actions.updateSetor(setor.id, { resumoCEO: texto })
    toast.success("Resumo para CEO gerado.")
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <Link to="/guardiao/setores" className="text-sm text-muted-foreground hover:text-foreground flex items-center gap-1">
          <ArrowLeft className="h-4 w-4" /> Voltar para setores
        </Link>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => { navigator.clipboard.writeText(window.location.href); toast.success("Link copiado") }}>
            <Share2 className="h-4 w-4" /> Copiar link
          </Button>
          <Button onClick={() => navigate(`/guardiao/apresentacao?setor=${setor.id}`)}>
            <Play className="h-4 w-4" /> Apresentar este setor
          </Button>
        </div>
      </div>

      {/* Cabeçalho */}
      <div className="rounded-lg border card-glass p-6">
        <div className="text-xs uppercase tracking-[0.2em] text-primary mb-2">Setor</div>
        <h1 className="text-3xl md:text-4xl font-semibold tracking-tight">{setor.nome}</h1>
        <div className="mt-3 flex flex-wrap gap-2 items-center">
          <Badge tone="neon">{setor.status}</Badge>
          <Badge>Prioridade {setor.prioridade}</Badge>
          <Badge>{setor.frequencia}</Badge>
          <FaseBadge fase={(setor.faseAtual ?? 1) as Fase} titulo={FASES.find((f) => f.num === ((setor.faseAtual ?? 1) as Fase))?.titulo} />
          <Badge>{statusIA}</Badge>
        </div>
        <p className="mt-4 text-sm text-muted-foreground max-w-3xl">{setor.objetivo || "—"}</p>
        <div className="mt-4">
          <div className="text-[10px] uppercase tracking-widest text-muted-foreground mb-1.5">Jornada das 7 fases</div>
          <FaseRegua atual={setor.faseAtual ?? 1} />
        </div>
        <div className="mt-4 grid sm:grid-cols-2 gap-3 text-sm">
          <Info label="Líder do setor" value={setor.lider || "—"} />
          <Info label="Guardião responsável" value={setor.guardiao || "—"} />
        </div>
      </div>

      {/* Tabs */}
      <div className="overflow-x-auto">
        <Tabs value={tab} onValueChange={(v) => setTab(v as TabId)}>
          <TabsList className="w-full min-w-max">
            {TABS.map((t) => (
              <TabsTrigger key={t.id} value={t.id}>{t.label}</TabsTrigger>
            ))}
          </TabsList>
        </Tabs>
      </div>

      {tab === "visao" && (
        <>
          <Section title="Indicadores do setor">
            <div className="grid grid-cols-2 md:grid-cols-4 xl:grid-cols-8 gap-2">
              <Mini label="Pessoas" v={setor.quantidadePessoas ?? (setor.time?.length ?? 0)} />
              <Mini label="Processos" v={processos.length} />
              <Mini label="Tarefas repetitivas" v={tarefasRep.length} />
              <Mini label="Gargalos" v={gargalos.length} />
              <Mini label="Sugestões IA" v={sugestoes.length} />
              <Mini label="Projetos" v={projetos.length} />
              <Mini label="Sistemas sug." v={sistemasSug} />
              <Mini label="Sistemas impl." v={sistemasImpl} />
              <Mini label="Agentes sug." v={agentesSug} />
              <Mini label="Automações sug." v={automacoesSug} />
              <Mini label="Vitórias" v={vitorias.length} />
              <Mini label="h/dia econ." v={`${horasDiaEconomizadas}h`} />
              <Mini label="h/sem econ." v={`${horasSemanaEconomizadas}h`} />
              <Mini label="h/mês econ." v={`${horasMesEconomizadas}h`} />
              <Mini label="Eficiência" v={`${eficiencia}%`} />
              <Mini label="Custo R$" v={reducaoCusto ? `R$ ${reducaoCusto}` : "—"} />
            </div>
            <div className="mt-3 flex items-center justify-between gap-2 flex-wrap">
              <div className="text-[11px] text-muted-foreground">
                Estimativa: 50% de redução sobre o tempo total das tarefas repetitivas mapeadas (h/mês {horasMesTarefas}).
              </div>
              <Button size="sm" onClick={() => setTab("diag")}>
                <Sparkles className="h-4 w-4" /> Iniciar diagnóstico
              </Button>
            </div>
          </Section>

          <Section title="Time do setor" right={
            <Link to="/guardiao/setores" className="text-xs text-primary">Editar no formulário do setor →</Link>
          }>
            {(setor.time ?? []).length === 0 && <Empty msg="Nenhuma pessoa cadastrada. Edite o setor para adicionar o time." />}
            <div className="grid md:grid-cols-2 gap-2">
              {(setor.time ?? []).map((p) => (
                <div key={p.id} className="p-3 rounded-md bg-muted">
                  <div className="flex items-center justify-between">
                    <div className="text-sm font-medium">{p.nome || "Pessoa sem nome"}</div>
                    <Badge tone={p.participaIA ? "neon" : "default"}>{p.participaIA ? "Participa da IA" : "Não participa"}</Badge>
                  </div>
                  <div className="text-xs text-muted-foreground">{p.cargo || "—"} · {p.funcao || "—"}</div>
                  <div className="text-[11px] text-muted-foreground mt-1">Envolvimento {p.envolvimento}{p.contato ? ` · ${p.contato}` : ""}</div>
                </div>
              ))}
            </div>
          </Section>

          <Section title="Projetos do setor" right={
            <Link to="/guardiao/projetos" className="text-xs text-primary">Abrir Projetos →</Link>
          }>
            {projetos.length === 0 && <Empty msg="Nenhum projeto vinculado a este setor." />}
            <div className="space-y-2">
              {projetos.map((p) => (
                <Link key={p.id} to={`/guardiao/projetos/${p.id}`} className="block p-3 bg-muted rounded-lg hover:glow-neon">
                  <div className="flex items-center justify-between gap-2">
                    <div className="min-w-0">
                      <div className="text-sm font-medium truncate">{p.nome}</div>
                      <div className="text-xs text-muted-foreground">{p.tipoEntrega} · {p.tipoProjeto} · {p.meta || "—"}</div>
                    </div>
                    <Badge tone="neon">{p.status}</Badge>
                  </div>
                </Link>
              ))}
            </div>
          </Section>
        </>
      )}

      {tab === "diag" && (
        <>
          <div className="rounded-lg border border-primary/30 card-glass p-5">
            <h3 className="text-lg font-semibold">Diagnóstico guiado do setor</h3>
            <p className="text-sm text-muted-foreground mt-1">
              Responda com base na conversa com o líder e na observação da rotina do setor. Cada bloco abaixo é um trecho do roteiro da reunião.
            </p>
            <div className="mt-3 flex flex-wrap gap-2 text-[11px]">
              <Badge tone="neon">1 · Time</Badge>
              <Badge tone="neon">2 · Rotina</Badge>
              <Badge tone="neon">3 · Gargalos</Badge>
              <Badge tone="neon">4 · Oportunidades</Badge>
              <Badge tone="neon">5 · Indicadores</Badge>
              <Badge tone="neon">6 · Prioridade do piloto</Badge>
            </div>
          </div>

          <Section title="Bloco 1 — Time do setor" right={
            <Link to="/guardiao/setores" className="text-xs text-primary">Editar time no cadastro →</Link>
          }>
            {(setor.time ?? []).length === 0 && <Empty msg="Nenhuma pessoa cadastrada ainda. Edite o setor para registrar o time." />}
            <div className="grid md:grid-cols-2 gap-2">
              {(setor.time ?? []).map((p) => (
                <div key={p.id} className="p-2.5 rounded-md bg-muted">
                  <div className="text-sm font-medium">{p.nome || "—"} <span className="text-[11px] text-muted-foreground">· {p.cargo || "—"}</span></div>
                  <div className="text-[11px] text-muted-foreground">{p.funcao || "—"} · Envolvimento {p.envolvimento} · {p.participaIA ? "Participa da IA" : "Não participa"}</div>
                </div>
              ))}
            </div>
          </Section>

          <div className="text-xs uppercase tracking-wider text-primary mt-6 mb-2 px-1">Bloco 2 — Rotina do setor</div>
          <ProcessosBlock setorId={setor.id} processos={processos} faseAtual={(setor.faseAtual ?? 1) as Fase} />
          <TarefasRepBlock setorId={setor.id} lista={tarefasRep} />

          <div className="text-xs uppercase tracking-wider text-primary mt-6 mb-2 px-1">Bloco 3 — Gargalos</div>
          <Section title={`Gargalos mapeados (${gargalos.length})`} right={
            <Link to="/guardiao/gargalos" className="text-xs text-primary">Cadastrar gargalo →</Link>
          }>
            {gargalos.length === 0 && <Empty msg="Use a aba Gargalos para registrar onde o setor mais trava." />}
            <div className="space-y-2">
              {gargalos.map((g) => (
                <div key={g.id} className="p-3 bg-muted rounded-lg">
                  <div className="flex items-start justify-between gap-2">
                    <div className="text-sm font-medium">{g.processo}</div>
                    <Badge tone={g.prioridade === "Alta" ? "warn" : "default"}>{g.prioridade}</Badge>
                  </div>
                  <div className="text-xs text-muted-foreground mt-1">{g.status} · {g.tempo}</div>
                </div>
              ))}
            </div>
          </Section>

          <DiagnosticoExtraBlock setor={setor} />

          <div className="rounded-lg border card-glass p-4 mt-4 flex flex-wrap items-center gap-2 justify-between">
            <div className="text-sm text-muted-foreground">Diagnóstico preenchido? Gere as sugestões da IA na próxima aba.</div>
            <Button size="sm" onClick={() => setTab("sugestoes")}>
              <Sparkles className="h-4 w-4" /> Ir para Sugestões da IA
            </Button>
          </div>
        </>
      )}

      {tab === "sugestoes" && (
        <>
          <div className="rounded-lg border card-glass p-5">
            <h3 className="text-lg font-semibold">Sugestões da IA para este setor</h3>
            <p className="text-sm text-muted-foreground mt-1">
              A IA usa o diagnóstico preenchido (processos, tarefas repetitivas, gargalos e time) para sugerir dashboards, sistemas, automações, agentes e o primeiro projeto piloto.
            </p>
            <div className="mt-3">
              <Button size="sm" onClick={gerarSugestoes} disabled={loadingIA}>
                {loadingIA ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
                {loadingIA ? "Gerando..." : sugestoes.length ? "Gerar novamente" : "Gerar sugestões com IA"}
              </Button>
            </div>
          </div>

          {sugestoes.length === 0 ? (
            <Empty msg="Nenhuma sugestão ainda. Preencha o diagnóstico e clique em Gerar sugestões com IA." />
          ) : (
            <>
              <Section title={`Sugestões geradas (${sugestoes.length})`}>
                <div className="space-y-2">
                  {sugestoes.map((s) => <SugestaoCard key={s.id} sug={s} setorId={setor.id} />)}
                </div>
              </Section>
              <Section title="Estimativa de ganho">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                  <Mini label="h/sem econ." v={`${horasSemanaEconomizadas}h`} />
                  <Mini label="h/mês econ." v={`${horasMesEconomizadas}h`} />
                  <Mini label="Eficiência" v={`${eficiencia || 20}%`} />
                  <Mini label="Sistemas sug." v={sistemasSug} />
                </div>
              </Section>
            </>
          )}
        </>
      )}

      {tab === "plano" && (
        <>
          <Section title={`Tarefas do setor (${tarefasSetor.length})`} right={
            <Link to="/guardiao/tarefas" className="text-xs text-primary">Abrir Tarefas →</Link>
          }>
            {tarefasSetor.length === 0 && <Empty msg="Nenhuma tarefa vinculada. Crie tarefas a partir de sugestões da IA ou na aba Tarefas." />}
            <div className="space-y-2">
              {tarefasSetor.map((t) => (
                <div key={t.id} className="p-3 bg-muted rounded-lg">
                  <div className="flex items-start justify-between gap-2 flex-wrap">
                    <div className="min-w-0">
                      <div className="text-sm font-medium">{t.titulo}</div>
                      <div className="text-[11px] text-muted-foreground mt-0.5">
                        {t.responsavel || "—"} · {t.prazo || "sem prazo"}
                      </div>
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      <FaseBadge fase={t.fase ?? undefined} />
                      <Badge tone={t.prioridade === "Alta" ? "warn" : "default"}>{t.prioridade}</Badge>
                      <Badge tone={t.status === "Concluída" ? "ok" : "neon"}>{t.status}</Badge>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </Section>
          <FeedbacksBlock setorId={setor.id} liderPadrao={setor.lider} faseAtual={(setor.faseAtual ?? 1) as Fase} />
          <ValidacaoCEOBlock setor={setor} />
          <ItensIABlock setorId={setor.id} itens={itensIA} faseAtual={(setor.faseAtual ?? 1) as Fase} />
        </>
      )}

      {tab === "vitorias" && (
        <Section title="Vitórias do setor" right={
          <Link to="/guardiao/vitorias" className="text-xs text-primary">Registrar vitória →</Link>
        }>
          {vitorias.length === 0 && <Empty msg="Nenhuma vitória registrada para este setor." />}
          <div className="space-y-2">
            {vitorias.map((v) => (
              <div key={v.id} className="p-3 bg-muted rounded-lg">
                <div className="flex items-center justify-between gap-2">
                  <div className="text-sm font-medium">{v.titulo}</div>
                  <Badge tone="neon">Fase 0{v.fase}</Badge>
                </div>
                <div className="text-xs text-muted-foreground">{v.horasSemana || 0}h/sem · {v.percentualEficiencia || 0}% eficiência</div>
              </div>
            ))}
          </div>
        </Section>
      )}

      {tab === "ceo" && (
        <Section title="Resumo executivo para o CEO">
          <div className="flex flex-wrap gap-2 mb-3">
            <Button size="sm" onClick={gerarResumoLocal}>Gerar resumo</Button>
            <Button
              variant="outline" size="sm"
              onClick={() => { if (setor.resumoCEO) { navigator.clipboard.writeText(setor.resumoCEO); toast.success("Resumo copiado.") } }}
            >
              Copiar texto
            </Button>
            <Button asChild variant="outline" size="sm" className="border-primary/40 text-primary">
              <Link to="/guardiao/relatorio">Enviar para Relatório para CEO →</Link>
            </Button>
          </div>
          <Textarea
            className="min-h-[180px]"
            value={setor.resumoCEO ?? ""}
            onChange={(e) => actions.updateSetor(setor.id, { resumoCEO: e.target.value })}
            placeholder="Setor / Fase / Líder / O que foi identificado / Principal gargalo / Oportunidade com IA / Projeto piloto recomendado / Resultado esperado / Próxima decisão necessária."
          />
          {setor.resumoCEO && (
            <div className="text-[11px] text-muted-foreground mt-1">Este resumo aparece no Relatório para CEO.</div>
          )}
        </Section>
      )}
    </div>
  )
}

/* ------- Subcomponentes ------- */

function Section({ title, right, children }: { title: string; right?: ReactNode; children: ReactNode }) {
  return (
    <div className="rounded-lg border card-glass p-5">
      <div className="flex items-center justify-between mb-3 gap-3 flex-wrap">
        <h3 className="text-lg font-semibold">{title}</h3>
        {right}
      </div>
      {children}
    </div>
  )
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div className="p-3 bg-muted/60 rounded-md">
      <div className="text-[11px] uppercase tracking-wider text-muted-foreground">{label}</div>
      <div className="text-sm font-medium">{value}</div>
    </div>
  )
}

function Mini({ label, v }: { label: string; v: ReactNode }) {
  return (
    <div className="rounded-md bg-muted p-2 text-center">
      <div className="text-[10px] uppercase tracking-wider text-muted-foreground">{label}</div>
      <div className="text-sm font-semibold text-primary">{v}</div>
    </div>
  )
}

function Empty({ msg }: { msg: string }) {
  return <div className="text-sm text-muted-foreground p-3 rounded-md bg-muted/50">{msg}</div>
}

/* ------- Processos ------- */

function ProcessosBlock({ setorId, processos, faseAtual }: { setorId: string; processos: ProcessoSetor[]; faseAtual: Fase }) {
  const [open, setOpen] = useState(false)
  const [form, setForm] = useState<Omit<ProcessoSetor, "id" | "criadoEm" | "setorId">>({
    nome: "", descricao: "", quemExecuta: "", ferramentas: "",
    temPlanilha: false, geraIndicador: false, impacto: "", fase: faseAtual,
  })

  const salvar = () => {
    if (!form.nome.trim()) return toast.error("Informe o nome do processo.")
    actions.addProcessoSetor({ ...form, setorId })
    setForm({ nome: "", descricao: "", quemExecuta: "", ferramentas: "", temPlanilha: false, geraIndicador: false, impacto: "", fase: faseAtual })
    setOpen(false)
  }

  return (
    <Section title={`Processos do setor (${processos.length})`} right={
      <Button size="xs" onClick={() => setOpen(!open)}><Plus className="h-3 w-3" /> Adicionar processo</Button>
    }>
      {open && (
        <div className="p-3 mb-3 rounded-md bg-muted border border-border/60 space-y-2">
          <div className="grid md:grid-cols-2 gap-2">
            <Input placeholder="Nome do processo" value={form.nome} onChange={(e) => setForm({ ...form, nome: e.target.value })} />
            <Input placeholder="Quem executa" value={form.quemExecuta} onChange={(e) => setForm({ ...form, quemExecuta: e.target.value })} />
            <Input className="md:col-span-2" placeholder="Ferramentas usadas hoje" value={form.ferramentas} onChange={(e) => setForm({ ...form, ferramentas: e.target.value })} />
            <Textarea className="md:col-span-2 min-h-[60px]" placeholder="Descrição do processo" value={form.descricao} onChange={(e) => setForm({ ...form, descricao: e.target.value })} />
            <Input placeholder="Impacta (receita/custo/entrega/atendimento)" value={form.impacto} onChange={(e) => setForm({ ...form, impacto: e.target.value })} />
            <GSelect className="w-full" value={String(form.fase)} onChange={(v) => setForm({ ...form, fase: Number(v) as Fase })} options={faseOptions} />
            <label className="flex items-center gap-2 text-sm p-2 rounded-md card-glass"><input type="checkbox" checked={form.temPlanilha} onChange={(e) => setForm({ ...form, temPlanilha: e.target.checked })} /> Existe planilha envolvida</label>
            <label className="flex items-center gap-2 text-sm p-2 rounded-md card-glass"><input type="checkbox" checked={form.geraIndicador} onChange={(e) => setForm({ ...form, geraIndicador: e.target.checked })} /> Gera dado ou indicador</label>
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="outline" size="sm" onClick={() => setOpen(false)}>Cancelar</Button>
            <Button size="sm" onClick={salvar}>Salvar processo</Button>
          </div>
        </div>
      )}

      {processos.length === 0 && <Empty msg="Nenhum processo mapeado ainda." />}
      <div className="space-y-2">
        {processos.map((p) => (
          <div key={p.id} className="p-3 bg-muted rounded-lg">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <div className="text-sm font-medium">{p.nome}</div>
                <div className="text-xs text-muted-foreground">Executa: {p.quemExecuta || "—"} · {p.ferramentas || "—"}</div>
                {p.descricao && <div className="text-xs text-muted-foreground mt-1">{p.descricao}</div>}
              </div>
              <div className="flex items-center gap-1 shrink-0">
                <Badge tone="neon">Fase 0{p.fase}</Badge>
                <Button variant="ghost" size="icon-sm" className="hover:bg-destructive/20 hover:text-destructive" onClick={() => actions.removeProcessoSetor(p.id)}><Trash2 className="h-4 w-4" /></Button>
              </div>
            </div>
            <div className="flex flex-wrap gap-1 mt-2">
              {p.temPlanilha && <Badge>Usa planilha</Badge>}
              {p.geraIndicador && <Badge>Gera indicador</Badge>}
              {p.impacto && <Badge>Impacto: {p.impacto}</Badge>}
            </div>
          </div>
        ))}
      </div>
    </Section>
  )
}

/* ------- Tarefas Repetitivas ------- */

function TarefasRepBlock({ setorId, lista }: { setorId: string; lista: TarefaRepetitiva[] }) {
  const [open, setOpen] = useState(false)
  type Draft = Omit<TarefaRepetitiva, "id" | "setorId" | "criadoEm" | "tempoSemana" | "tempoMes">
  const empty: Draft = {
    nome: "", descricao: "", quemExecuta: "", cargo: "", qtdPessoas: 1,
    frequencia: "Toda semana", tempoPorExecucao: 1, vezesPorPeriodo: 1,
    flagPlanilha: false, flagCopiaCola: false, flagBuscaManual: false,
    flagRespostaRepetitiva: false, flagDados: false, flagComunicacao: false, flagDecisaoLider: false,
    impactos: [],
  }
  const [form, setForm] = useState<Draft>(empty)

  const toggleImpacto = (i: ImpactoTarefa) => {
    setForm((f) => ({ ...f, impactos: f.impactos.includes(i) ? f.impactos.filter((x) => x !== i) : [...f.impactos, i] }))
  }

  const totalSemana = lista.reduce((a, t) => a + (t.tempoSemana || 0), 0)
  const totalMes = lista.reduce((a, t) => a + (t.tempoMes || 0), 0)

  return (
    <Section title={`Tarefas repetitivas (${lista.length}) — ${totalSemana}h/sem · ${totalMes}h/mês`} right={
      <Button size="xs" onClick={() => setOpen(!open)}><Plus className="h-3 w-3" /> Adicionar tarefa</Button>
    }>
      {open && (
        <div className="p-3 mb-3 rounded-md bg-muted border border-border/60 space-y-2">
          <div className="grid md:grid-cols-3 gap-2">
            <Input className="md:col-span-2" placeholder="Nome da tarefa" value={form.nome} onChange={(e) => setForm({ ...form, nome: e.target.value })} />
            <GSelect className="w-full" value={form.frequencia} onChange={(v) => setForm({ ...form, frequencia: v as FrequenciaRepetitiva })} options={FREQ_REPETITIVA.map((f) => ({ value: f, label: f }))} />
            <Textarea className="md:col-span-3 min-h-[60px]" placeholder="Descrição" value={form.descricao} onChange={(e) => setForm({ ...form, descricao: e.target.value })} />
            <Input placeholder="Quem executa hoje" value={form.quemExecuta} onChange={(e) => setForm({ ...form, quemExecuta: e.target.value })} />
            <Input placeholder="Cargo" value={form.cargo} onChange={(e) => setForm({ ...form, cargo: e.target.value })} />
            <Input type="number" min={1} placeholder="Pessoas envolvidas" value={form.qtdPessoas} onChange={(e) => setForm({ ...form, qtdPessoas: Number(e.target.value) })} />
            <Input type="number" min={0} step="0.25" placeholder="Tempo por execução (h)" value={form.tempoPorExecucao} onChange={(e) => setForm({ ...form, tempoPorExecucao: Number(e.target.value) })} />
            <Input type="number" min={0} placeholder="Vezes por período" value={form.vezesPorPeriodo} onChange={(e) => setForm({ ...form, vezesPorPeriodo: Number(e.target.value) })} />
          </div>
          <div className="grid sm:grid-cols-2 md:grid-cols-4 gap-1 text-xs">
            <Flag label="Planilha" v={form.flagPlanilha} on={(b) => setForm({ ...form, flagPlanilha: b })} />
            <Flag label="Copia/cola" v={form.flagCopiaCola} on={(b) => setForm({ ...form, flagCopiaCola: b })} />
            <Flag label="Busca manual" v={form.flagBuscaManual} on={(b) => setForm({ ...form, flagBuscaManual: b })} />
            <Flag label="Resposta repetitiva" v={form.flagRespostaRepetitiva} on={(b) => setForm({ ...form, flagRespostaRepetitiva: b })} />
            <Flag label="Envolve dados" v={form.flagDados} on={(b) => setForm({ ...form, flagDados: b })} />
            <Flag label="Comunicação" v={form.flagComunicacao} on={(b) => setForm({ ...form, flagComunicacao: b })} />
            <Flag label="Decisão do líder" v={form.flagDecisaoLider} on={(b) => setForm({ ...form, flagDecisaoLider: b })} />
          </div>
          <div>
            <div className="text-[11px] uppercase tracking-wider text-muted-foreground mb-1">Impactos</div>
            <div className="flex flex-wrap gap-1">
              {IMPACTOS_TAREFA.map((i) => (
                <button key={i} onClick={() => toggleImpacto(i)}
                  className={"text-[11px] px-2 py-1 rounded-md border " + (form.impactos.includes(i) ? "bg-primary text-primary-foreground border-primary" : "border-border text-muted-foreground")}>
                  {i}
                </button>
              ))}
            </div>
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="outline" size="sm" onClick={() => { setOpen(false); setForm(empty) }}>Cancelar</Button>
            <Button size="sm" onClick={() => {
              if (!form.nome.trim()) return toast.error("Informe o nome da tarefa.")
              actions.addTarefaRepetitiva({ ...form, setorId })
              setForm(empty); setOpen(false)
            }}>Salvar tarefa</Button>
          </div>
        </div>
      )}

      {lista.length === 0 && <Empty msg="Nenhuma tarefa repetitiva mapeada. Mapeie para a IA sugerir automações." />}
      <div className="space-y-2">
        {lista.map((t) => (
          <details key={t.id} className="p-3 bg-muted rounded-lg group">
            <summary className="flex items-center justify-between cursor-pointer">
              <div className="min-w-0">
                <div className="text-sm font-medium">{t.nome}</div>
                <div className="text-xs text-muted-foreground">{t.frequencia} · {t.tempoPorExecucao}h × {t.vezesPorPeriodo} · {t.quemExecuta || "—"}</div>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <Badge tone="neon">{t.tempoSemana}h/sem</Badge>
                <Badge>{t.tempoMes}h/mês</Badge>
                <ChevronDown className="h-4 w-4 transition-transform group-open:rotate-180" />
                <button onClick={(e) => { e.preventDefault(); actions.removeTarefaRepetitiva(t.id) }} className="p-1 hover:bg-destructive/20 rounded">
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            </summary>
            <div className="mt-2 text-xs text-muted-foreground space-y-1">
              {t.descricao && <div>{t.descricao}</div>}
              <div className="flex flex-wrap gap-1">
                {t.flagPlanilha && <Badge>Planilha</Badge>}
                {t.flagCopiaCola && <Badge>Copia/cola</Badge>}
                {t.flagBuscaManual && <Badge>Busca manual</Badge>}
                {t.flagRespostaRepetitiva && <Badge>Resposta repetitiva</Badge>}
                {t.flagDados && <Badge>Dados</Badge>}
                {t.flagComunicacao && <Badge>Comunicação</Badge>}
                {t.flagDecisaoLider && <Badge>Decisão líder</Badge>}
              </div>
              {t.impactos.length > 0 && (
                <div className="flex flex-wrap gap-1">{t.impactos.map((i) => <Badge key={i} tone="warn">{i}</Badge>)}</div>
              )}
            </div>
          </details>
        ))}
      </div>
    </Section>
  )
}

function Flag({ label, v, on }: { label: string; v: boolean; on: (b: boolean) => void }) {
  return (
    <label className="flex items-center gap-2 p-1.5 rounded-md card-glass cursor-pointer">
      <input type="checkbox" checked={v} onChange={(e) => on(e.target.checked)} /> {label}
    </label>
  )
}

/* ------- Sugestão card ------- */

function SugestaoCard({ sug, setorId }: { sug: SugestaoIA; setorId: string }) {
  const [editing, setEditing] = useState(false)
  const [texto, setTexto] = useState(sug.texto)
  const guardiao = useStore((s) => s.guardiao)

  const virarTarefa = () => {
    actions.addTarefa({
      titulo: sug.titulo, descricao: texto, setorId,
      responsavel: guardiao.nomePrincipal || "",
      prazo: "", prioridade: sug.prioridade === "Fazer agora" ? "Alta" : "Média",
      status: "A fazer", tipo: "Construção", origem: "Criada manualmente",
      tipoRotina: "Não se aplica", recorrencia: "Sem recorrência",
      observacoes: `Origem: sugestão da IA (${sug.tipo})`,
      fase: sug.faseSugerida,
    })
    actions.updateSugestaoIA(sug.id, { status: "Virou tarefa" })
    toast.success("Tarefa criada.")
  }

  const virarProjeto = () => {
    actions.addProjeto({
      nome: sug.titulo, tipoProjeto: "Piloto", setorId,
      lider: "", guardiao: guardiao.nomePrincipal || "", problema: texto, solucao: texto,
      tipoEntrega: sug.tipo === "Sistema" ? "Sistema" : sug.tipo === "Automação" ? "Automação" : sug.tipo === "Agente" ? "Agente" : "Dashboard",
      meta: "", prazo: "", status: "Ideia",
      resultadoEsperado: texto, resultadoAlcancado: "",
      horasEconomizadas: 0, evidencias: "", observacoes: `Origem: sugestão IA (${sug.tipo})`,
      precisaApoio: false, tipoApoio: "", consultor: "",
      faseOrigem: (sug.faseSugerida >= 4 && sug.faseSugerida <= 6 ? sug.faseSugerida : 4) as 4 | 5 | 6,
    })
    actions.updateSugestaoIA(sug.id, { status: "Virou projeto" })
    toast.success("Projeto piloto criado.")
  }

  const virarSistema = () => {
    actions.addItemIA({
      setorId, nome: sug.titulo, tipo: "Sistema", fase: sug.faseSugerida,
      responsavel: guardiao.nomePrincipal || "", status: "Em construção",
      resultadoEsperado: texto, resultadoAlcancado: "", link: "",
    })
    actions.updateSugestaoIA(sug.id, { status: "Virou sistema" })
    toast.success("Adicionado em 'O que a IA já está fazendo'.")
  }

  const enviarRelatorio = () => {
    actions.updateSugestaoIA(sug.id, { status: "No relatório CEO" })
    toast.success("Marcada para o relatório CEO.")
  }

  return (
    <div className="p-3 rounded-lg bg-muted border border-border/40">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <Badge tone="neon">{sug.tipo}</Badge>
            <Badge>Fase 0{sug.faseSugerida}</Badge>
            <Badge tone={sug.prioridade === "Fazer agora" ? "warn" : "default"}>{sug.prioridade}</Badge>
            {sug.status !== "Aberta" && <Badge tone="ok">{sug.status}</Badge>}
          </div>
          <div className="text-sm font-medium mt-1">{sug.titulo}</div>
        </div>
        <button onClick={() => actions.removeSugestaoIA(sug.id)} className="p-1 hover:bg-destructive/20 rounded shrink-0">
          <Trash2 className="h-3.5 w-3.5" />
        </button>
      </div>
      {editing ? (
        <Textarea className="mt-2 min-h-[80px]" value={texto} onChange={(e) => setTexto(e.target.value)} />
      ) : (
        <p className="text-xs text-muted-foreground mt-2 whitespace-pre-wrap">{texto}</p>
      )}
      <div className="mt-2 flex flex-wrap gap-1">
        {editing
          ? <Button size="xs" onClick={() => { actions.updateSugestaoIA(sug.id, { texto, status: "Salva" }); setEditing(false); toast.success("Sugestão salva.") }}>Salvar</Button>
          : <Button variant="outline" size="xs" onClick={() => setEditing(true)}>Editar raciocínio</Button>}
        <Button variant="outline" size="xs" onClick={virarTarefa}>→ Tarefa</Button>
        <Button variant="outline" size="xs" onClick={virarProjeto}>→ Projeto piloto</Button>
        <Button variant="outline" size="xs" onClick={virarSistema}>→ Item IA do setor</Button>
        <Button variant="outline" size="xs" onClick={() => { actions.updateSugestaoIA(sug.id, { status: "Enviada para líder" }); toast.success("Marcada para validação do líder.") }}>Validar com líder</Button>
        <Button variant="outline" size="xs" className="border-primary/40 text-primary" onClick={enviarRelatorio}>+ Relatório CEO</Button>
      </div>
    </div>
  )
}

/* ------- Itens IA já em uso ------- */

function ItensIABlock({ setorId, itens, faseAtual }: { setorId: string; itens: ItemIANoSetor[]; faseAtual: Fase }) {
  const [open, setOpen] = useState(false)
  type Draft = Omit<ItemIANoSetor, "id" | "criadoEm" | "setorId">
  const empty: Draft = {
    nome: "", tipo: "Dashboard", fase: faseAtual, responsavel: "",
    status: "Em uso", resultadoEsperado: "", resultadoAlcancado: "", link: "",
  }
  const [form, setForm] = useState<Draft>(empty)

  const grupos = useMemo(() => {
    const m: Record<string, ItemIANoSetor[]> = {}
    itens.forEach((i) => { (m[i.tipo] ??= []).push(i) })
    return m
  }, [itens])

  return (
    <Section title="O que a IA já está fazendo neste setor" right={
      <Button size="xs" onClick={() => setOpen(!open)}><Plus className="h-3 w-3" /> Adicionar item</Button>
    }>
      {open && (
        <div className="p-3 mb-3 rounded-md bg-muted border border-border/60">
          <div className="grid md:grid-cols-3 gap-2">
            <Input className="md:col-span-2" placeholder="Nome do item" value={form.nome} onChange={(e) => setForm({ ...form, nome: e.target.value })} />
            <GSelect className="w-full" value={form.tipo} onChange={(v) => setForm({ ...form, tipo: v as TipoItemIA })} options={TIPOS_ITEM_IA.map((t) => ({ value: t, label: t }))} />
            <Input placeholder="Responsável" value={form.responsavel} onChange={(e) => setForm({ ...form, responsavel: e.target.value })} />
            <GSelect className="w-full" value={String(form.fase)} onChange={(v) => setForm({ ...form, fase: Number(v) as Fase })} options={FASES.map((f) => ({ value: String(f.num), label: `Fase 0${f.num}` }))} />
            <Input placeholder="Status" value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })} />
            <Input className="md:col-span-3" placeholder="Link ou evidência" value={form.link} onChange={(e) => setForm({ ...form, link: e.target.value })} />
            <Input className="md:col-span-3" placeholder="Resultado esperado" value={form.resultadoEsperado} onChange={(e) => setForm({ ...form, resultadoEsperado: e.target.value })} />
            <Input className="md:col-span-3" placeholder="Resultado alcançado" value={form.resultadoAlcancado} onChange={(e) => setForm({ ...form, resultadoAlcancado: e.target.value })} />
          </div>
          <div className="flex justify-end gap-2 mt-2">
            <Button variant="outline" size="sm" onClick={() => { setOpen(false); setForm(empty) }}>Cancelar</Button>
            <Button size="sm" onClick={() => {
              if (!form.nome.trim()) return toast.error("Informe o nome.")
              actions.addItemIA({ ...form, setorId })
              setForm(empty); setOpen(false)
            }}>Salvar item</Button>
          </div>
        </div>
      )}

      {itens.length === 0 && <Empty msg="Nenhum item da IA em uso neste setor ainda." />}
      <div className="space-y-3">
        {Object.entries(grupos).map(([tipo, items]) => (
          <div key={tipo}>
            <div className="text-[11px] uppercase tracking-wider text-muted-foreground mb-1">{tipo} ({items.length})</div>
            <div className="space-y-1.5">
              {items.map((i) => (
                <div key={i.id} className="p-2.5 bg-muted rounded-md flex items-center justify-between gap-2">
                  <div className="min-w-0">
                    <div className="text-sm font-medium">{i.nome}</div>
                    <div className="text-xs text-muted-foreground">Fase 0{i.fase} · {i.responsavel || "—"} · {i.status}</div>
                    {i.resultadoAlcancado && <div className="text-[11px] text-muted-foreground mt-0.5">Resultado: {i.resultadoAlcancado}</div>}
                  </div>
                  <div className="flex items-center gap-1">
                    {i.link && <a href={i.link} target="_blank" rel="noopener" className="p-1 rounded hover:bg-primary/10"><ExternalLink className="h-3.5 w-3.5" /></a>}
                    <button onClick={() => actions.removeItemIA(i.id)} className="p-1 hover:bg-destructive/20 rounded"><Trash2 className="h-3.5 w-3.5" /></button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </Section>
  )
}

/* ------- Alinhamentos com o líder ------- */

function FeedbacksBlock({ setorId, liderPadrao, faseAtual }: { setorId: string; liderPadrao: string; faseAtual: Fase }) {
  const feedbacks = useStore((s) => (s.feedbacks ?? []).filter((f) => f.setorId === setorId))
  const projetos = useStore((s) => s.projetos.filter((p) => p.setorId === setorId))
  const gargalos = useStore((s) => s.gargalos.filter((g) => g.setorId === setorId))
  const guardiao = useStore((s) => s.guardiao)
  const [open, setOpen] = useState(false)
  type Draft = Omit<FeedbackLider, "id" | "criadoEm" | "atualizadoEm" | "status" | "setorId" | "guardiao">
  const empty: Draft = {
    titulo: "", liderDestinatario: liderPadrao || "", fase: faseAtual,
    projetoId: undefined, gargaloId: undefined, descricao: "", proximaAcao: "",
    prazo: "", prioridade: "Média",
  }
  const [form, setForm] = useState<Draft>(empty)

  const salvar = () => {
    if (!form.titulo.trim()) return toast.error("Informe o título do feedback.")
    actions.addFeedbackLider({ ...form, setorId, guardiao: guardiao.nomePrincipal || "Guardião" })
    setForm({ ...empty, liderDestinatario: liderPadrao || "", fase: faseAtual })
    setOpen(false)
    toast.success("Feedback registrado.")
  }

  return (
    <Section
      title={`Alinhamentos com o líder (${feedbacks.length})`}
      right={
        <Button size="xs" onClick={() => setOpen(!open)}><Plus className="h-3 w-3" /> Novo alinhamento</Button>
      }
    >
      {open && (
        <div className="p-3 mb-3 rounded-md bg-muted border border-border/60 space-y-2">
          <div className="grid md:grid-cols-2 gap-2">
            <Input className="md:col-span-2" placeholder="Título do feedback" value={form.titulo} onChange={(e) => setForm({ ...form, titulo: e.target.value })} />
            <Input placeholder="Líder destinatário" value={form.liderDestinatario} onChange={(e) => setForm({ ...form, liderDestinatario: e.target.value })} />
            <GSelect className="w-full" value={String(form.fase)} onChange={(v) => setForm({ ...form, fase: Number(v) as Fase })} options={faseOptions} />
            <GSelect className="w-full" value={form.projetoId ?? ""} onChange={(v) => setForm({ ...form, projetoId: v || undefined })}
              options={[{ value: "", label: "Projeto vinculado (opcional)" }, ...projetos.map((p) => ({ value: p.id, label: p.nome }))]} />
            <GSelect className="w-full" value={form.gargaloId ?? ""} onChange={(v) => setForm({ ...form, gargaloId: v || undefined })}
              options={[{ value: "", label: "Gargalo vinculado (opcional)" }, ...gargalos.map((g) => ({ value: g.id, label: g.processo }))]} />
            <Textarea className="md:col-span-2 min-h-[80px]" placeholder="Descrição do feedback" value={form.descricao} onChange={(e) => setForm({ ...form, descricao: e.target.value })} />
            <Input className="md:col-span-2" placeholder="Próxima ação esperada" value={form.proximaAcao} onChange={(e) => setForm({ ...form, proximaAcao: e.target.value })} />
            <Input type="date" value={form.prazo} onChange={(e) => setForm({ ...form, prazo: e.target.value })} />
            <GSelect className="w-full" value={form.prioridade} onChange={(v) => setForm({ ...form, prioridade: v as Prioridade })} options={["Alta", "Média", "Baixa"].map((p) => ({ value: p, label: p }))} />
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="outline" size="sm" onClick={() => { setOpen(false); setForm(empty) }}>Cancelar</Button>
            <Button size="sm" onClick={salvar}>Registrar alinhamento</Button>
          </div>
        </div>
      )}

      {feedbacks.length === 0 && <Empty msg="Nenhum alinhamento registrado com o líder ainda." />}

      <div className="space-y-2">
        {feedbacks.map((f) => (
          <div key={f.id} className="p-3 bg-muted rounded-lg">
            <div className="flex items-start justify-between gap-2 flex-wrap">
              <div className="min-w-0">
                <div className="text-sm font-medium">{f.titulo}</div>
                <div className="text-[11px] text-muted-foreground mt-0.5">
                  Para {f.liderDestinatario || "—"} · {new Date(f.criadoEm).toLocaleDateString("pt-BR")}
                  {f.prazo ? ` · Prazo ${f.prazo}` : ""}
                </div>
              </div>
              <div className="flex items-center gap-1 shrink-0">
                <FaseBadge fase={f.fase} />
                <Badge tone={f.prioridade === "Alta" ? "warn" : "default"}>{f.prioridade}</Badge>
                <GSelect
                  className="h-8 w-auto text-[11px]"
                  value={f.status}
                  onChange={(v) => actions.updateFeedbackLider(f.id, { status: v as StatusFeedbackLider })}
                  options={STATUS_FEEDBACK_LIDER.map((s) => ({ value: s, label: s }))}
                />
                <button onClick={() => actions.removeFeedbackLider(f.id)} className="p-1 hover:bg-destructive/20 rounded">
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
            {f.descricao && <p className="text-xs text-muted-foreground mt-2 whitespace-pre-wrap">{f.descricao}</p>}
            {f.proximaAcao && (
              <div className="mt-2 text-[11px] p-2 rounded bg-primary/10 border border-primary/20">
                <span className="text-primary font-medium">Próxima ação: </span>{f.proximaAcao}
              </div>
            )}
          </div>
        ))}
      </div>
    </Section>
  )
}

/* ------- Diagnóstico extra (blocos 4, 5, 6) ------- */

const RESULTADOS_IMPORTANTES = [
  "Ganhar tempo", "Reduzir custo", "Melhorar decisão", "Melhorar atendimento",
  "Reduzir erro", "Organizar indicadores", "Aumentar receita", "Melhorar acompanhamento",
]

function DiagnosticoExtraBlock({ setor }: { setor: Setor }) {
  const d = setor.diagnostico ?? {}
  const upd = (patch: Partial<NonNullable<Setor["diagnostico"]>>) =>
    actions.updateSetor(setor.id, { diagnostico: { ...d, ...patch } })
  const toggleRes = (r: string) => {
    const cur = d.resultadosImportantes ?? []
    upd({ resultadosImportantes: cur.includes(r) ? cur.filter((x) => x !== r) : [...cur, r] })
  }
  return (
    <>
      <div className="text-xs uppercase tracking-wider text-primary mt-6 mb-2 px-1">Bloco 4 — Oportunidades com IA</div>
      <Section title="O que a IA pode fazer neste setor">
        <div className="grid md:grid-cols-2 gap-2">
          <FieldDiag label="O que a IA poderia ajudar neste setor?">
            <Textarea className="min-h-[60px]" value={d.oportunidadeIA ?? ""} onChange={(e) => upd({ oportunidadeIA: e.target.value })} />
          </FieldDiag>
          <FieldDiag label="O que poderia ser automatizado?">
            <Textarea className="min-h-[60px]" value={d.oQueAutomatizar ?? ""} onChange={(e) => upd({ oQueAutomatizar: e.target.value })} />
          </FieldDiag>
          <FieldDiag label="O que poderia virar dashboard?">
            <Textarea className="min-h-[60px]" value={d.oQueDashboard ?? ""} onChange={(e) => upd({ oQueDashboard: e.target.value })} />
          </FieldDiag>
          <FieldDiag label="O que poderia virar sistema?">
            <Textarea className="min-h-[60px]" value={d.oQueSistema ?? ""} onChange={(e) => upd({ oQueSistema: e.target.value })} />
          </FieldDiag>
          <FieldDiag label="O que poderia virar agente ou copiloto?">
            <Textarea className="min-h-[60px]" value={d.oQueAgente ?? ""} onChange={(e) => upd({ oQueAgente: e.target.value })} />
          </FieldDiag>
          <FieldDiag label="O que melhoraria a eficiência operacional?">
            <Textarea className="min-h-[60px]" value={d.oQueEficiencia ?? ""} onChange={(e) => upd({ oQueEficiencia: e.target.value })} />
          </FieldDiag>
        </div>
        <div className="mt-3">
          <div className="text-[11px] uppercase tracking-wider text-muted-foreground mb-1">Resultado mais importante para o líder</div>
          <div className="flex flex-wrap gap-1">
            {RESULTADOS_IMPORTANTES.map((r) => {
              const on = (d.resultadosImportantes ?? []).includes(r)
              return (
                <button key={r} onClick={() => toggleRes(r)}
                  className={"text-[11px] px-2 py-1 rounded-md border " + (on ? "bg-primary text-primary-foreground border-primary" : "border-border text-muted-foreground")}>
                  {r}
                </button>
              )
            })}
          </div>
        </div>
      </Section>

      <div className="text-xs uppercase tracking-wider text-primary mt-6 mb-2 px-1">Bloco 5 — Indicadores e tempo</div>
      <Section title="Tempo gasto, meta e indicadores">
        <div className="grid md:grid-cols-3 gap-2">
          <FieldDiag label="Horas/semana com tarefas repetitivas">
            <Input type="number" min={0} value={d.horasSemanaRepetitivas ?? 0} onChange={(e) => upd({ horasSemanaRepetitivas: Number(e.target.value) })} />
          </FieldDiag>
          <FieldDiag label="Horas/mês com tarefas repetitivas">
            <Input type="number" min={0} value={d.horasMesRepetitivas ?? 0} onChange={(e) => upd({ horasMesRepetitivas: Number(e.target.value) })} />
          </FieldDiag>
          <FieldDiag label="Meta de redução">
            <GSelect className="w-full" value={d.metaReducao ?? ""} onChange={(v) => upd({ metaReducao: v })}
              options={[{ value: "", label: "Selecionar" }, ...["10%", "20%", "30%", "50%", "Outro"].map((m) => ({ value: m, label: m }))]} />
          </FieldDiag>
          <FieldDiag label="Custo envolvido no processo (opcional)">
            <Input value={d.custoEnvolvido ?? ""} onChange={(e) => upd({ custoEnvolvido: e.target.value })} placeholder="Ex.: R$ 2.000/mês com plataforma" />
          </FieldDiag>
          <FieldDiag label="Indicador atual do setor">
            <Input value={d.indicadorAtual ?? ""} onChange={(e) => upd({ indicadorAtual: e.target.value })} placeholder="Ex.: CAC, NPS, ROAS, ticket médio" />
          </FieldDiag>
          <FieldDiag label="Esse indicador já é apresentado ao CEO?">
            <GSelect className="w-full" value={d.indicadorApresentadoCEO ? "Sim" : "Não"} onChange={(v) => upd({ indicadorApresentadoCEO: v === "Sim" })}
              options={[{ value: "Não", label: "Não" }, { value: "Sim", label: "Sim" }]} />
          </FieldDiag>
        </div>
      </Section>

      <div className="text-xs uppercase tracking-wider text-primary mt-6 mb-2 px-1">Bloco 6 — Prioridade do projeto piloto</div>
      <Section title="Primeiro projeto piloto do setor">
        <div className="grid md:grid-cols-2 gap-2">
          <FieldDiag label="Qual problema deve ser resolvido primeiro?">
            <Textarea className="min-h-[60px]" value={d.problemaPrimeiro ?? ""} onChange={(e) => upd({ problemaPrimeiro: e.target.value })} />
          </FieldDiag>
          <FieldDiag label="Por que esse problema é prioridade?">
            <Textarea className="min-h-[60px]" value={d.porQuePrioridade ?? ""} onChange={(e) => upd({ porQuePrioridade: e.target.value })} />
          </FieldDiag>
          <FieldDiag label="Qual seria o primeiro projeto piloto ideal?">
            <Input value={d.primeiroPiloto ?? ""} onChange={(e) => upd({ primeiroPiloto: e.target.value })} />
          </FieldDiag>
          <FieldDiag label="Quem precisa participar da validação?">
            <Input value={d.quemValida ?? ""} onChange={(e) => upd({ quemValida: e.target.value })} />
          </FieldDiag>
          <FieldDiag label="Prazo desejado para testar a primeira solução">
            <Input value={d.prazoTestar ?? ""} onChange={(e) => upd({ prazoTestar: e.target.value })} placeholder="Ex.: 15 dias, 30 dias" />
          </FieldDiag>
        </div>
      </Section>
    </>
  )
}

function FieldDiag({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="text-sm">
      <div className="text-[11px] text-muted-foreground mb-1">{label}</div>
      {children}
    </label>
  )
}

/* ------- Validação com CEO (no Plano) ------- */

const STATUS_CEO_LOCAL: Array<"Não enviado" | "Enviado" | "Aguardando retorno" | "Aprovado" | "Solicitar ajuste"> =
  ["Não enviado", "Enviado", "Aguardando retorno", "Aprovado", "Solicitar ajuste"]

function ValidacaoCEOBlock({ setor }: { setor: Setor }) {
  const v = setor.validacaoCEO ?? { precisa: false, status: "Não enviado" as const }
  const upd = (patch: Partial<NonNullable<Setor["validacaoCEO"]>>) =>
    actions.updateSetor(setor.id, { validacaoCEO: { ...v, ...patch } })
  return (
    <Section title="Validação com CEO">
      <label className="flex items-center gap-2 text-sm p-2 rounded-md bg-muted mb-3">
        <input type="checkbox" checked={v.precisa ?? false} onChange={(e) => upd({ precisa: e.target.checked })} />
        Precisa validar com CEO?
      </label>
      {v.precisa && (
        <div className="grid md:grid-cols-2 gap-2">
          <FieldDiag label="O que precisa ser validado?">
            <Textarea className="min-h-[60px]" value={v.oQueValidar ?? ""} onChange={(e) => upd({ oQueValidar: e.target.value })} />
          </FieldDiag>
          <FieldDiag label="Status">
            <GSelect className="w-full" value={v.status} onChange={(val) => upd({ status: val as typeof STATUS_CEO_LOCAL[number] })}
              options={STATUS_CEO_LOCAL.map((s) => ({ value: s, label: s }))} />
          </FieldDiag>
          <FieldDiag label="Data da validação">
            <Input type="date" value={v.data ?? ""} onChange={(e) => upd({ data: e.target.value })} />
          </FieldDiag>
          <FieldDiag label="Observações do CEO">
            <Textarea className="min-h-[60px]" value={v.observacoes ?? ""} onChange={(e) => upd({ observacoes: e.target.value })} />
          </FieldDiag>
        </div>
      )}
    </Section>
  )
}
