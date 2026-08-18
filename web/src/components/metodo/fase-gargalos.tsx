// Fase 3 — Mapeamento de Gargalos: processos que consomem horas viram plano de
// ação com IA. A estrutura (assistente de 6 etapas, impactos, rota de solução e
// registro de resultado) vem do mapeador do PMC; a análise é a IA do PMC OS.
// Visualização em KANBAN por status; arraste o card entre colunas.
import { useEffect, useMemo, useState } from "react"
import { supabase } from "@/lib/supabase"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { useAreasMetodo, nomeDaArea, type AreaMetodo } from "./seletor-area"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import {
  PlusIcon as Plus,
  Trash2Icon as Trash2,
  Sparkles2Icon as Sparkles,
  ClockIcon as Clock,
  ChevronDownIcon as ChevronDown,
  CheckCircle2Icon as CheckCircle2,
  BotIcon as Bot,
  CopyIcon as Copy,
  RefreshCwIcon as RefreshCw,
  SearchIcon as Search,
  StarIcon as Star,
  TrendingUpIcon as TrendingUp,
  ShieldCheckIcon as ShieldCheck,
  Building2Icon as Building2,
  XIcon as X,
} from "@/components/ui/icons"
import {
  DndContext, useDraggable, useDroppable, PointerSensor, useSensor, useSensors, type DragEndEvent,
} from "@dnd-kit/core"
import { streamMetodoIAGargalo, type PlanoGargaloIA } from "@/lib/metodo-ia"
import { FaseHeader, MarkdownBox, BadgeIA } from "./compartilhados"
import {
  AREAS_GARGALO, AREA_ICONE, IMPACTOS, IMPACTO_ICONE, IMPACTO_LEGENDA,
  FERRAMENTAS, FREQUENCIAS, ESPECIALIDADES, ROTAS, ROTA_LABEL, COLUNAS_GARGALO,
  STATUS_LABEL, GANHOS, GANHO_ICONE, horasRecuperadas,
  type RotaGargalo, type ResultadoGargalo,
} from "@/data/gargalos"

function extrairAnaliseParcial(acc: string): string {
  const m = acc.match(/"analise"\s*:\s*"/)
  if (!m || m.index === undefined) return ""
  const start = m.index + m[0].length
  let out = ""
  for (let i = start; i < acc.length; i++) {
    const ch = acc[i]
    if (ch === "\\") {
      const next = acc[i + 1]
      if (next === "n") out += "\n"
      else if (next === "t") out += "\t"
      else if (next === '"') out += '"'
      else if (next === "\\") out += "\\"
      else out += next ?? ""
      i++
    } else if (ch === '"') {
      break // fim do campo analise
    } else {
      out += ch
    }
  }
  return out
}

interface Gargalo {
  id: string
  area: string | null      // legado: texto digitado antes do vínculo com a Fase 2
  id_area: string | null   // área do Método (Fase 2)
  processo: string
  descricao: string | null
  quem_executa: string | null
  ferramentas: string | null            // legado, texto livre
  ferramentas_lista: string[] | null
  impactos: string[] | null
  horas_mes: number | null
  frequencia: string | null
  status: string
  prioridade: boolean
  prioridade_motivo: string | null
  rota: RotaGargalo | null
  responsavel: string | null
  especialidade: string | null
  prazo: string | null
  resultado: ResultadoGargalo | null
  resolvido_em: string | null
  plano_ia: PlanoGargaloIA | null
}

const PRIORIDADE_COR: Record<string, string> = {
  Alta: "bg-rose-500/15 text-rose-400 border-rose-500/30",
  Média: "bg-amber-500/15 text-amber-400 border-amber-500/30",
  Baixa: "bg-emerald-500/15 text-emerald-400 border-emerald-500/30",
}

// Para onde o card vai ao ser solto numa coluna. A coluna "Definindo solução"
// agrupa dois status — soltar nela deixa em 'definindo'; 'aguardando_pmc' só é
// atingido escolhendo a rota Apoio PMC, que é o que dá sentido ao status.
const STATUS_AO_SOLTAR: Record<string, string> = {
  mapeados: "mapeado",
  analisados: "analisado",
  definindo: "definindo",
  implementacao: "em_implementacao",
  resolvidos: "resolvido",
}

function colunaDoStatus(status: string): string {
  return COLUNAS_GARGALO.find((c) => c.statuses.includes(status))?.id ?? "mapeados"
}

const num = (n: number) => n.toLocaleString("pt-BR", { maximumFractionDigits: 1 })

export function FaseGargalos({ clientId }: { clientId: string }) {
  const areas = useAreasMetodo(clientId)
  const [gargalos, setGargalos] = useState<Gargalo[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [salvando, setSalvando] = useState(false)
  // Filtros do painel — busca, área e a aba "só prioridades".
  const [busca, setBusca] = useState("")
  const [areaFiltro, setAreaFiltro] = useState("todas")
  const [soPrioridades, setSoPrioridades] = useState(false)
  const [resultadoId, setResultadoId] = useState<string | null>(null)
  const [gerandoId, setGerandoId] = useState<string | null>(null)
  const [gerandoSeg, setGerandoSeg] = useState(0)
  const [streamPreview, setStreamPreview] = useState("")
  const [erroIA, setErroIA] = useState<string | null>(null)
  const [detalheId, setDetalheId] = useState<string | null>(null)
  const [skillAberta, setSkillAberta] = useState<string | null>(null)
  const [copiado, setCopiado] = useState<string | null>(null)

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 6 } }))

  function copiarSkill(chave: string, texto: string) {
    navigator.clipboard.writeText(texto)
    setCopiado(chave)
    setTimeout(() => setCopiado((c) => (c === chave ? null : c)), 2000)
  }

  async function fetchGargalos() {
    const { data } = await supabase
      .from("metodo_gargalos")
      .select("*")
      .eq("id_cliente", clientId)
      .order("created_at", { ascending: false })
    setGargalos(data ?? [])
    setLoading(false)
  }

  useEffect(() => { fetchGargalos() }, [clientId]) // eslint-disable-line react-hooks/exhaustive-deps

  // Conta os segundos enquanto a IA gera, pra dar feedback de progresso.
  useEffect(() => {
    if (!gerandoId) return
    setGerandoSeg(0)
    const t = setInterval(() => setGerandoSeg((s) => s + 1), 1000)
    return () => clearInterval(t)
  }, [gerandoId])

  async function salvar(dados: NovoGargalo) {
    setSalvando(true)
    const { error } = await supabase.from("metodo_gargalos").insert({
      id_cliente: clientId,
      area: dados.areaTexto,
      id_area: dados.id_area,
      processo: dados.processo,
      descricao: dados.descricao,
      quem_executa: dados.quem_executa,
      // `ferramentas` (texto) continua preenchido: é o que o prompt da IA lê.
      ferramentas: dados.ferramentas.join(", ") || null,
      ferramentas_lista: dados.ferramentas,
      impactos: dados.impactos,
      horas_mes: dados.horas_mes,
      frequencia: dados.frequencia,
      prioridade: dados.prioridade,
      prioridade_motivo: dados.prioridade ? dados.prioridade_motivo : null,
      status: "mapeado",
    })
    setSalvando(false)
    if (!error) {
      setShowForm(false)
      fetchGargalos()
    }
  }

  /** Rota de solução. Apoio PMC muda o status para deixar claro que a bola está com o PMC. */
  async function definirRota(g: Gargalo, campos: Partial<Gargalo>) {
    const status = campos.rota === "pmc" ? "aguardando_pmc"
      : g.status === "mapeado" || g.status === "analisado" ? "definindo"
      : g.status
    setGargalos((prev) => prev.map((x) => (x.id === g.id ? { ...x, ...campos, status } : x)))
    await supabase.from("metodo_gargalos")
      .update({ ...campos, status, updated_at: new Date().toISOString() })
      .eq("id", g.id)
  }

  async function registrarResultado(g: Gargalo, resultado: ResultadoGargalo) {
    const patch = { resultado, status: "resolvido", resolvido_em: new Date().toISOString().slice(0, 10) }
    setGargalos((prev) => prev.map((x) => (x.id === g.id ? { ...x, ...patch } as Gargalo : x)))
    setResultadoId(null)
    await supabase.from("metodo_gargalos")
      .update({ ...patch, updated_at: new Date().toISOString() })
      .eq("id", g.id)
  }

  async function excluir(id: string) {
    await supabase.from("metodo_gargalos").delete().eq("id", id)
    setDetalheId((d) => (d === id ? null : d))
    fetchGargalos()
  }

  async function mudarStatus(g: Gargalo, status: string) {
    if (g.status === status) return
    setGargalos((prev) => prev.map((x) => (x.id === g.id ? { ...x, status } : x)))
    await supabase.from("metodo_gargalos").update({ status, updated_at: new Date().toISOString() }).eq("id", g.id)
  }

  async function gerarPlanoIA(g: Gargalo) {
    setGerandoId(g.id)
    setErroIA(null)
    setStreamPreview("")
    setDetalheId(g.id) // abre o detalhe pra mostrar a IA escrevendo
    try {
      const plano = await streamMetodoIAGargalo(
        {
          area: nomeDaArea(areas, g.id_area) ?? g.area ?? "", processo: g.processo, descricao: g.descricao,
          quem_executa: g.quem_executa, ferramentas: g.ferramentas,
          horas_mes: g.horas_mes, frequencia: g.frequencia,
        },
        (acc) => setStreamPreview(extrairAnaliseParcial(acc)),
      )
      await supabase
        .from("metodo_gargalos")
        .update({ plano_ia: plano, status: g.status === "mapeado" ? "analisado" : g.status, updated_at: new Date().toISOString() })
        .eq("id", g.id)
      setGargalos((prev) => prev.map((x) => (x.id === g.id ? { ...x, plano_ia: plano, status: x.status === "mapeado" ? "analisado" : x.status } : x)))
    } catch (e: any) {
      setErroIA(e.message || "Erro ao gerar plano com IA.")
    } finally {
      setGerandoId(null)
      setStreamPreview("")
    }
  }

  function onDragEnd(e: DragEndEvent) {
    const { active, over } = e
    if (!over) return
    const g = gargalos.find((x) => x.id === active.id)
    const alvo = STATUS_AO_SOLTAR[String(over.id)]
    if (g && alvo) mudarStatus(g, alvo)
  }

  const detalhe = detalheId ? gargalos.find((g) => g.id === detalheId) ?? null : null
  const emResultado = resultadoId ? gargalos.find((g) => g.id === resultadoId) ?? null : null

  // Os KPIs olham o conjunto inteiro, não o filtrado: o número do topo é o
  // retrato da empresa, não da busca em curso.
  const kpis = useMemo(() => {
    const h = (g: Gargalo) => Number(g.horas_mes) || 0
    const naoResolvidos = gargalos.filter((g) => g.status !== "resolvido")
    return {
      horasMapeadas: naoResolvidos.reduce((a, g) => a + h(g), 0),
      total: gargalos.length,
      prioridades: gargalos.filter((g) => g.prioridade && g.status !== "resolvido").length,
      interna: gargalos.filter((g) => g.rota === "interna").length,
      pmc: gargalos.filter((g) => g.rota === "pmc").length,
      implementacao: gargalos.filter((g) => colunaDoStatus(g.status) === "implementacao").length,
      resolvidos: gargalos.filter((g) => g.status === "resolvido").length,
      horasRecuperadas: gargalos.reduce((a, g) => a + horasRecuperadas(g.horas_mes, g.resultado), 0),
    }
  }, [gargalos])

  // Nomes de área disponíveis para filtrar: os do Método (Fase 2) mais o texto
  // legado de quem mapeou antes de a fase existir.
  const areasDisponiveis = useMemo(() => {
    const nomes = new Set<string>()
    gargalos.forEach((g) => {
      const nome = nomeDaArea(areas, g.id_area) ?? g.area
      if (nome) nomes.add(nome)
    })
    return [...nomes].sort((a, b) => a.localeCompare(b, "pt-BR"))
  }, [gargalos, areas])

  const filtrados = useMemo(() => {
    const termo = busca.trim().toLowerCase()
    return gargalos.filter((g) => {
      if (soPrioridades && !g.prioridade) return false
      if (areaFiltro !== "todas" && (nomeDaArea(areas, g.id_area) ?? g.area) !== areaFiltro) return false
      if (termo && !`${g.processo} ${g.descricao ?? ""}`.toLowerCase().includes(termo)) return false
      return true
    })
  }, [gargalos, busca, areaFiltro, soPrioridades, areas])

  return (
    <div className="space-y-6">
      <FaseHeader numero={3} titulo="Mapeamento de Gargalos" subtitulo="Onde a operação sangra horas e caixa">
        <Button className="h-10 gap-2 rounded-xl font-bold text-xs uppercase tracking-wider" onClick={() => setShowForm(true)}>
          <Plus className="size-4" />
          Mapear Gargalo
        </Button>
      </FaseHeader>

      <p className="text-[15px] font-medium text-muted-foreground leading-relaxed max-w-3xl">
        Mapeie os processos que consomem tempo da operação — o assistente pergunta o essencial em seis
        passos. Para cada gargalo, clique em <strong className="text-foreground">Gerar plano com IA</strong>:
        a IA devolve a causa raiz e o passo a passo para substituir aquele processo. Depois escolha
        <strong className="text-foreground"> como resolver</strong> e registre o resultado quando terminar.
      </p>

      {gargalos.length > 0 && (
        <div className="grid gap-3 grid-cols-2 lg:grid-cols-4 xl:grid-cols-8">
          <Kpi valor={`${num(kpis.horasMapeadas)}h/mês`} label="Horas mapeadas" destaque
            ajuda="Tempo que os gargalos abertos ainda consomem." />
          <Kpi valor={num(kpis.total)} label="Gargalos" ajuda="Processos identificados." />
          <Kpi valor={num(kpis.prioridades)} label="★ Prioridades" ajuda="Precisam de atenção imediata." />
          <Kpi valor={num(kpis.interna)} label="Solução interna" ajuda="A empresa resolve sozinha." />
          <Kpi valor={num(kpis.pmc)} label="Apoio PMC" ajuda="Precisam de apoio especializado." />
          <Kpi valor={num(kpis.implementacao)} label="Em implementação" />
          <Kpi valor={num(kpis.resolvidos)} label="Resolvidos" />
          <Kpi valor={`${num(kpis.horasRecuperadas)}h/mês`} label="Horas recuperadas" destaque
            ajuda="Tempo devolvido para a operação." />
        </div>
      )}

      {gargalos.length > 0 && (
        <div className="flex items-center gap-3 flex-wrap">
          <div className="relative flex-1 min-w-56 max-w-sm">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
            <Input
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
              placeholder="Buscar gargalo..."
              className="h-10 pl-10 rounded-xl"
            />
          </div>
          {areasDisponiveis.length > 0 && (
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Área</span>
              <select
                value={areaFiltro}
                onChange={(e) => setAreaFiltro(e.target.value)}
                className="h-10 rounded-xl border border-border bg-background px-3 text-[13px] font-medium text-foreground"
              >
                <option value="todas">Todas</option>
                {areasDisponiveis.map((a) => <option key={a} value={a}>{a}</option>)}
              </select>
            </div>
          )}
          <div className="flex items-center gap-1.5">
            <Aba ativa={!soPrioridades} onClick={() => setSoPrioridades(false)} contagem={gargalos.length}>
              Todos os gargalos
            </Aba>
            <Aba ativa={soPrioridades} onClick={() => setSoPrioridades(true)} contagem={gargalos.filter((g) => g.prioridade).length}>
              ★ Prioridades
            </Aba>
          </div>
        </div>
      )}

      {erroIA && <p className="text-[12px] font-medium text-destructive">{erroIA}</p>}

      {loading ? (
        <div className="h-40 rounded-2xl bg-card/40 animate-pulse" />
      ) : gargalos.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border p-8 text-center">
          <p className="text-sm font-medium text-muted-foreground max-w-md mx-auto">
            Nenhum gargalo mapeado. Pergunte ao seu time: "qual tarefa consome mais horas por mês
            na frente do computador?" — e comece por ela. O assistente leva menos de dois minutos.
          </p>
        </div>
      ) : (
        <DndContext sensors={sensors} onDragEnd={onDragEnd}>
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-5 gap-4 items-start">
            {COLUNAS_GARGALO.map((col) => (
              <Coluna
                key={col.id}
                col={col}
                itens={filtrados.filter((g) => col.statuses.includes(g.status))}
                onAbrir={setDetalheId}
                areas={areas}
              />
            ))}
          </div>
        </DndContext>
      )}

      {/* Detalhe do gargalo (plano da IA, skills, rotina) */}
      <Dialog open={!!detalhe} onOpenChange={(o) => !o && setDetalheId(null)}>
        <DialogContent className="sm:max-w-2xl max-h-[88vh] overflow-y-auto">
          {detalhe && (
            <>
              <DialogHeader>
                <DialogTitle className="pr-6">{detalhe.processo}</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div className="flex items-center gap-2 flex-wrap">
                  {(nomeDaArea(areas, detalhe.id_area) ?? detalhe.area) && (
                    <Badge variant="outline" className="rounded-lg border-border text-muted-foreground px-2 py-0 text-[10px] font-bold uppercase">{nomeDaArea(areas, detalhe.id_area) ?? detalhe.area}</Badge>
                  )}
                  {detalhe.horas_mes ? (
                    <Badge variant="outline" className="rounded-lg border-border text-muted-foreground px-2 py-0 text-[10px] font-bold gap-1">
                      <Clock className="size-3" />{Number(detalhe.horas_mes).toLocaleString("pt-BR")}h/mês
                    </Badge>
                  ) : null}
                  {detalhe.prioridade && (
                    <Badge className="rounded-lg px-2 py-0 text-[10px] font-bold border bg-primary/15 text-primary border-primary/30">
                      ★ PRIORIDADE
                    </Badge>
                  )}
                  {detalhe.plano_ia?.prioridade && (
                    <Badge className={`rounded-lg px-2 py-0 text-[10px] font-bold border ${PRIORIDADE_COR[detalhe.plano_ia.prioridade] ?? "bg-muted/20 text-muted-foreground border-border"}`}>
                      IA: {detalhe.plano_ia.prioridade.toUpperCase()}
                    </Badge>
                  )}
                  <div className="ml-auto flex items-center gap-1.5">
                    {/* Mover de etapa */}
                    {COLUNAS_GARGALO.map((c) => (
                      <button
                        key={c.id}
                        onClick={() => mudarStatus(detalhe, STATUS_AO_SOLTAR[c.id])}
                        className={`text-[10px] font-bold uppercase px-2 py-1 rounded-lg border transition-colors ${colunaDoStatus(detalhe.status) === c.id ? "bg-primary text-primary-foreground border-primary" : "border-border text-muted-foreground hover:text-foreground"}`}
                      >
                        {c.label}
                      </button>
                    ))}
                  </div>
                </div>

                {detalhe.descricao && <p className="text-[13px] font-medium text-muted-foreground">{detalhe.descricao}</p>}

                <FichaGargalo g={detalhe} />

                {detalhe.prioridade && detalhe.prioridade_motivo && (
                  <p className="rounded-xl border border-primary/25 bg-primary/[0.05] p-3 text-[12.5px] font-medium text-foreground/90">
                    <strong className="text-primary">Por que é prioridade:</strong> {detalhe.prioridade_motivo}
                  </p>
                )}

                {detalhe.resultado
                  ? <BlocoResultado g={detalhe} />
                  : <BlocoRota g={detalhe} onSalvar={(campos) => definirRota(detalhe, campos)} />}

                <div className="flex items-center gap-2 flex-wrap">
                  <Button
                    size="sm"
                    disabled={gerandoId === detalhe.id}
                    className="h-9 gap-2 rounded-xl font-bold text-[11px] uppercase tracking-wider"
                    onClick={() => gerarPlanoIA(detalhe)}
                  >
                    <Sparkles className="size-3.5" />
                    {gerandoId === detalhe.id ? "Gerando plano..." : detalhe.plano_ia ? "Gerar novo plano com IA" : "Gerar plano com IA"}
                  </Button>
                  {!detalhe.resultado && (
                    <Button
                      variant="outline" size="sm"
                      className="h-9 gap-2 rounded-xl font-bold text-[11px] uppercase tracking-wider hover:border-primary/30 hover:bg-primary/5"
                      onClick={() => setResultadoId(detalhe.id)}
                    >
                      <CheckCircle2 className="size-3.5" />
                      Registrar resultado
                    </Button>
                  )}
                  <Button
                    variant="ghost" size="sm"
                    className="h-9 gap-1.5 rounded-xl font-bold text-[11px] uppercase tracking-wider text-muted-foreground hover:text-destructive ml-auto"
                    onClick={() => excluir(detalhe.id)}
                  >
                    <Trash2 className="size-3.5" /> Excluir
                  </Button>
                </div>

                {/* IA escrevendo o plano ao vivo (streaming) */}
                {gerandoId === detalhe.id && (
                  <div className="rounded-xl bg-muted/20 border border-primary/20 p-4 space-y-3">
                    <div className="flex items-center gap-2">
                      <BadgeIA />
                      <span className="text-[11px] font-bold uppercase tracking-widest text-primary animate-pulse">
                        A IA está escrevendo o plano… {gerandoSeg}s
                      </span>
                    </div>
                    {streamPreview ? (
                      <p className="text-[13px] font-medium text-foreground/90 leading-relaxed whitespace-pre-wrap">
                        {streamPreview}
                        <span className="ml-0.5 inline-block h-4 w-1.5 translate-y-0.5 bg-primary animate-pulse" />
                      </p>
                    ) : (
                      <div className="space-y-2">
                        <div className="h-3 w-3/4 rounded bg-muted/40 animate-pulse" />
                        <div className="h-3 w-2/3 rounded bg-muted/40 animate-pulse" />
                        <div className="h-3 w-1/2 rounded bg-muted/40 animate-pulse" />
                      </div>
                    )}
                  </div>
                )}

                {detalhe.plano_ia && gerandoId !== detalhe.id && (
                  <div className="rounded-xl bg-muted/20 border border-primary/20 p-4 space-y-4">
                    <div className="flex items-center justify-between gap-2 flex-wrap">
                      <BadgeIA />
                      <Badge variant="outline" className="rounded-lg border-border text-muted-foreground px-2 py-0.5 text-[10px] font-bold">
                        SOLUÇÃO: {detalhe.plano_ia.tipo_solucao?.toUpperCase()}
                      </Badge>
                    </div>
                    {detalhe.plano_ia.causa_raiz && (
                      <p className="text-[13px] font-bold text-foreground">
                        Causa raiz: <span className="font-medium text-muted-foreground">{detalhe.plano_ia.causa_raiz}</span>
                      </p>
                    )}
                    <MarkdownBox>{detalhe.plano_ia.analise || ""}</MarkdownBox>
                    {Array.isArray(detalhe.plano_ia.tarefas) && detalhe.plano_ia.tarefas.length > 0 && (
                      <div className="space-y-1.5">
                        <p className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground">Próximos passos (30 dias)</p>
                        {detalhe.plano_ia.tarefas.map((t, i) => (
                          <div key={i} className="flex items-start gap-2">
                            <span className="font-mono text-[11px] font-bold text-primary mt-0.5">{String(i + 1).padStart(2, "0")}</span>
                            <p className="text-[13px] font-medium text-foreground">{t}</p>
                          </div>
                        ))}
                      </div>
                    )}

                    {Array.isArray(detalhe.plano_ia.skills) && detalhe.plano_ia.skills.length > 0 && (
                      <div className="space-y-2 pt-1">
                        <p className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground flex items-center gap-1.5">
                          <Bot className="size-3.5 text-primary" />
                          Skills para resolver ({detalhe.plano_ia.skills.length})
                        </p>
                        {detalhe.plano_ia.skills.map((s, i) => {
                          const chave = `${detalhe.id}-${i}`
                          const aberta = skillAberta === chave
                          return (
                            <div key={chave} className="rounded-xl bg-background/40 border border-border p-3">
                              <div className="flex items-start justify-between gap-3">
                                <div className="min-w-0">
                                  <p className="text-[13px] font-bold text-foreground flex items-center gap-1.5">
                                    <Bot className="size-3.5 text-primary shrink-0" />{s.nome}
                                  </p>
                                  {s.objetivo && <p className="text-[12px] font-medium text-muted-foreground mt-0.5">{s.objetivo}</p>}
                                </div>
                                {s.documento && (
                                  <div className="flex items-center gap-1 shrink-0">
                                    <Button variant="ghost" size="sm" className="h-8 gap-1.5 rounded-lg text-[11px] font-bold text-primary hover:text-primary hover:bg-primary/5" onClick={() => copiarSkill(chave, s.documento!)}>
                                      <Copy className="size-3.5" />{copiado === chave ? "Copiado!" : "Copiar"}
                                    </Button>
                                    <Button variant="ghost" size="sm" className="size-8 p-0 rounded-lg text-muted-foreground" onClick={() => setSkillAberta(aberta ? null : chave)}>
                                      <ChevronDown className={`size-4 transition-transform ${aberta ? "rotate-180" : ""}`} />
                                    </Button>
                                  </div>
                                )}
                              </div>
                              {aberta && s.documento && (
                                <div className="mt-3 rounded-lg bg-muted/20 border border-border p-3"><MarkdownBox>{s.documento}</MarkdownBox></div>
                              )}
                            </div>
                          )
                        })}
                      </div>
                    )}

                    {detalhe.plano_ia.rotina?.necessaria && (detalhe.plano_ia.rotina.nome || (detalhe.plano_ia.rotina.passos?.length ?? 0) > 0) && (
                      <div className="rounded-xl bg-background/40 border border-primary/20 p-3 space-y-2">
                        <div className="flex items-center justify-between gap-2 flex-wrap">
                          <p className="text-[13px] font-bold text-foreground flex items-center gap-1.5">
                            <RefreshCw className="size-3.5 text-primary shrink-0" />
                            {detalhe.plano_ia.rotina.nome || "Rotina recomendada"}
                          </p>
                          {detalhe.plano_ia.rotina.cadencia && (
                            <Badge variant="outline" className="rounded-lg border-primary/30 text-primary px-2 py-0 text-[10px] font-bold uppercase">{detalhe.plano_ia.rotina.cadencia}</Badge>
                          )}
                        </div>
                        {Array.isArray(detalhe.plano_ia.rotina.passos) && detalhe.plano_ia.rotina.passos.length > 0 && (
                          <div className="space-y-1.5">
                            {detalhe.plano_ia.rotina.passos.map((p, i) => (
                              <div key={i} className="flex items-start gap-2">
                                <span className="font-mono text-[11px] font-bold text-primary mt-0.5">{String(i + 1).padStart(2, "0")}</span>
                                <p className="text-[13px] font-medium text-foreground">{p}</p>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>

      <AssistenteGargalo
        aberto={showForm}
        onFechar={() => setShowForm(false)}
        areas={areas}
        salvando={salvando}
        onSalvar={salvar}
      />

      <DialogResultado
        g={emResultado}
        onFechar={() => setResultadoId(null)}
        onSalvar={(r) => emResultado && registrarResultado(emResultado, r)}
      />
    </div>
  )
}

// ---- Coluna do kanban (área que recebe o card) ----
function Coluna({ col, itens, onAbrir, areas }: { col: { id: string; label: string }; itens: Gargalo[]; onAbrir: (id: string) => void; areas: AreaMetodo[] }) {
  const { setNodeRef, isOver } = useDroppable({ id: col.id })
  const resolvido = col.id === "resolvidos"
  const horas = itens.reduce((a, g) => a + (Number(g.horas_mes) || 0), 0)
  return (
    <div
      ref={setNodeRef}
      className={`rounded-2xl border p-3 min-h-[160px] transition-colors ${isOver ? "border-primary/50 bg-primary/5" : "border-border bg-muted/10"}`}
    >
      <div className="flex items-center justify-between px-1 pb-3">
        <div className="flex items-center gap-2">
          <span className={`size-2 rounded-full ${resolvido ? "bg-primary" : "bg-muted-foreground/40"}`} />
          <div>
            <p className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground">{col.label}</p>
            {itens.length > 0 && (
              <p className="text-[10px] font-medium text-muted-foreground/70">
                {itens.length} gargalo{itens.length === 1 ? "" : "s"} · {num(horas)}h/mês
              </p>
            )}
          </div>
        </div>
        <span className="text-[11px] font-bold text-muted-foreground bg-muted/40 rounded-full px-2 py-0.5 tabular-nums">{itens.length}</span>
      </div>
      <div className="space-y-2">
        {itens.map((g) => <CardGargalo key={g.id} g={g} onAbrir={onAbrir} areas={areas} />)}
        {itens.length === 0 && (
          <p className="text-[11px] text-muted-foreground/50 text-center py-6">Nenhum gargalo aqui</p>
        )}
      </div>
    </div>
  )
}

// ---- Card arrastável ----
function CardGargalo({ g, onAbrir, areas }: { g: Gargalo; onAbrir: (id: string) => void; areas: AreaMetodo[] }) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({ id: g.id })
  const style = transform ? { transform: `translate3d(${transform.x}px, ${transform.y}px, 0)` } : undefined
  return (
    <Card
      ref={setNodeRef}
      style={style}
      {...listeners}
      {...attributes}
      onClick={() => onAbrir(g.id)}
      className={`cursor-grab active:cursor-grabbing touch-none select-none transition-shadow ${isDragging ? "opacity-50 shadow-xl" : "hover:border-primary/30"}`}
    >
      <CardContent className="p-3.5 space-y-2">
        {g.prioridade && (
          <span className="inline-flex items-center gap-1 rounded-md bg-primary/10 border border-primary/25 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider text-primary">
            <Star className="size-2.5" /> Prioridade
          </span>
        )}
        <div className="flex items-start justify-between gap-2">
          <p className="text-[13px] font-bold tracking-tight text-foreground leading-snug line-clamp-2">{g.processo}</p>
          {g.plano_ia && <Bot className="size-3.5 text-primary shrink-0 mt-0.5" />}
        </div>
        <div className="flex items-center gap-1.5 flex-wrap">
          {(nomeDaArea(areas, g.id_area) ?? g.area) && (
            <Badge variant="outline" className="rounded-md border-border text-muted-foreground px-1.5 py-0 text-[9px] font-bold uppercase">{nomeDaArea(areas, g.id_area) ?? g.area}</Badge>
          )}
          {g.horas_mes ? (
            <Badge variant="outline" className="rounded-md border-border text-muted-foreground px-1.5 py-0 text-[9px] font-bold gap-0.5">
              <Clock className="size-2.5" />{Number(g.horas_mes).toLocaleString("pt-BR")}h
            </Badge>
          ) : null}
          {g.rota && (
            <Badge variant="outline" className="rounded-md border-border text-muted-foreground px-1.5 py-0 text-[9px] font-bold uppercase">
              {ROTA_LABEL[g.rota]}
            </Badge>
          )}
        </div>
        {(g.impactos?.length ?? 0) > 0 && (
          <p className="text-[10px] font-medium text-muted-foreground/80 line-clamp-1">
            {g.impactos!.slice(0, 3).map((i) => `${IMPACTO_ICONE[i] ?? ""} ${i}`).join(" · ")}
          </p>
        )}
        {g.resultado && horasRecuperadas(g.horas_mes, g.resultado) > 0 && (
          <p className="text-[10px] font-bold text-emerald-400">
            ✅ {num(horasRecuperadas(g.horas_mes, g.resultado))}h/mês recuperadas
          </p>
        )}
      </CardContent>
    </Card>
  )
}

// ---- Indicador do topo ----
function Kpi({ valor, label, ajuda, destaque }: { valor: string; label: string; ajuda?: string; destaque?: boolean }) {
  return (
    <div className={`rounded-xl border p-3.5 ${destaque ? "border-primary/30 bg-primary/[0.05]" : "border-border bg-muted/10"}`}>
      <p className="text-[9px] font-bold uppercase tracking-widest text-muted-foreground">{label}</p>
      <p className={`mt-1 text-xl font-bold tabular-nums ${destaque ? "text-primary" : "text-foreground"}`}>{valor}</p>
      {ajuda && <p className="mt-0.5 text-[10px] font-medium text-muted-foreground/70 leading-snug">{ajuda}</p>}
    </div>
  )
}

function Aba({ ativa, onClick, contagem, children }: { ativa: boolean; onClick: () => void; contagem: number; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-1.5 h-10 px-3.5 rounded-xl border text-[12px] font-bold transition-colors ${
        ativa ? "border-primary bg-primary/10 text-primary" : "border-border text-muted-foreground hover:text-foreground"
      }`}
    >
      {children}
      <span className={`rounded-full px-1.5 text-[10px] tabular-nums ${ativa ? "bg-primary/20" : "bg-muted/40"}`}>{contagem}</span>
    </button>
  )
}

/** Chip de seleção — usado para ferramentas e frequência no assistente. */
function Chip({ ativo, onClick, children }: { ativo: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-xl border px-3 py-1.5 text-[12.5px] font-semibold transition-colors ${
        ativo ? "border-primary bg-primary/10 text-primary" : "border-border text-muted-foreground hover:border-primary/40 hover:text-foreground"
      }`}
    >
      {children}
    </button>
  )
}

function Campo({ label, valor }: { label: string; valor: React.ReactNode }) {
  if (valor === null || valor === undefined || valor === "") return null
  return (
    <div>
      <p className="text-[9px] font-bold uppercase tracking-widest text-muted-foreground">{label}</p>
      <p className="text-[13px] font-medium text-foreground">{valor}</p>
    </div>
  )
}

// ---- Ficha do gargalo (o que o cliente respondeu no assistente) ----
function FichaGargalo({ g }: { g: Gargalo }) {
  const ferramentas = (g.ferramentas_lista?.length ? g.ferramentas_lista.join(", ") : g.ferramentas) ?? ""
  return (
    <div className="rounded-xl border border-border bg-muted/10 p-4 space-y-3">
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        <Campo label="Horas/mês" valor={g.horas_mes ? `${num(Number(g.horas_mes))}h` : ""} />
        <Campo label="Frequência" valor={g.frequencia} />
        <Campo label="Quem executa" valor={g.quem_executa} />
        <Campo label="Ferramentas" valor={ferramentas} />
        <Campo label="Status" valor={STATUS_LABEL[g.status] ?? g.status} />
        <Campo label="Prazo" valor={g.prazo} />
      </div>
      {(g.impactos?.length ?? 0) > 0 && (
        <div>
          <p className="text-[9px] font-bold uppercase tracking-widest text-muted-foreground mb-1.5">O que prejudica</p>
          <div className="flex flex-wrap gap-1.5">
            {g.impactos!.map((i) => (
              <span key={i} className="rounded-lg border border-border bg-background/50 px-2 py-0.5 text-[11px] font-medium text-foreground">
                {IMPACTO_ICONE[i] ?? ""} {i}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

// ---- Rota de solução: quem resolve, e com o quê ----
function BlocoRota({ g, onSalvar }: { g: Gargalo; onSalvar: (campos: Partial<Gargalo>) => void }) {
  const [rota, setRota] = useState<RotaGargalo | null>(g.rota)
  const [responsavel, setResponsavel] = useState(g.responsavel ?? "")
  const [especialidade, setEspecialidade] = useState(g.especialidade ?? "")
  const [prazo, setPrazo] = useState(g.prazo ?? "")

  // Cada gargalo tem a sua rota: sem isto, abrir outro card mantinha o estado do anterior.
  useEffect(() => {
    setRota(g.rota); setResponsavel(g.responsavel ?? "")
    setEspecialidade(g.especialidade ?? ""); setPrazo(g.prazo ?? "")
  }, [g.id]) // eslint-disable-line react-hooks/exhaustive-deps

  const mudou = rota !== g.rota || responsavel !== (g.responsavel ?? "")
    || especialidade !== (g.especialidade ?? "") || prazo !== (g.prazo ?? "")

  return (
    <div className="rounded-xl border border-border bg-card p-4 space-y-3">
      <p className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground">Como esse gargalo vai ser resolvido?</p>
      <div className="grid gap-2 sm:grid-cols-3">
        {ROTAS.map((r) => {
          const Icone = r.key === "interna" ? Building2 : r.key === "pmc" ? ShieldCheck : Clock
          return (
            <button
              key={r.key}
              type="button"
              onClick={() => setRota(r.key)}
              className={`rounded-xl border p-3 text-left transition-colors ${
                rota === r.key ? "border-primary bg-primary/10" : "border-border hover:border-primary/40"
              }`}
            >
              <Icone className={`size-4 ${rota === r.key ? "text-primary" : "text-muted-foreground"}`} />
              <p className="mt-1.5 text-[13px] font-bold text-foreground">{r.label}</p>
              <p className="text-[11px] font-medium text-muted-foreground leading-snug">{r.ajuda}</p>
            </button>
          )
        })}
      </div>

      {rota === "interna" && (
        <div className="space-y-2">
          <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Responsável</Label>
          <Input className="h-11 rounded-xl" placeholder="Ex.: João — Comercial" value={responsavel} onChange={(e) => setResponsavel(e.target.value)} />
        </div>
      )}
      {rota === "pmc" && (
        <div className="space-y-2">
          <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Especialidade necessária</Label>
          <div className="flex flex-wrap gap-2">
            {ESPECIALIDADES.map((e) => (
              <Chip key={e} ativo={especialidade === e} onClick={() => setEspecialidade(e)}>{e}</Chip>
            ))}
          </div>
        </div>
      )}
      {rota && (
        <div className="flex items-end gap-3 flex-wrap">
          <div className="space-y-2">
            <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Prazo</Label>
            <Input type="date" className="h-11 rounded-xl w-44" value={prazo} onChange={(e) => setPrazo(e.target.value)} />
          </div>
          <Button
            disabled={!mudou}
            className="h-11 rounded-xl font-bold text-xs uppercase tracking-wider"
            onClick={() => onSalvar({
              rota,
              responsavel: rota === "interna" ? responsavel.trim() || null : null,
              especialidade: rota === "pmc" ? especialidade || null : null,
              prazo: prazo || null,
            })}
          >
            Salvar rota
          </Button>
        </div>
      )}
    </div>
  )
}

// ---- Resultado já registrado ----
function BlocoResultado({ g }: { g: Gargalo }) {
  const r = g.resultado!
  const horas = horasRecuperadas(g.horas_mes, r)
  const conv = typeof r.conversao_antes === "number" && typeof r.conversao_depois === "number"
    ? Math.round((r.conversao_depois - r.conversao_antes) * 10) / 10
    : null
  return (
    <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/[0.06] p-4 space-y-3">
      <p className="text-[11px] font-bold uppercase tracking-widest text-emerald-400">Resultado registrado</p>
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        {horas > 0 && <Campo label="Horas recuperadas" valor={`${num(horas)}h/mês`} />}
        {typeof r.horas_depois === "number" && <Campo label="Consome agora" valor={`${num(r.horas_depois)}h/mês`} />}
        {typeof r.custo_mes === "number" && r.custo_mes > 0 && (
          <Campo label="Custo economizado" valor={r.custo_mes.toLocaleString("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 })} />
        )}
        {conv !== null && conv !== 0 && <Campo label="Conversão" valor={`${conv > 0 ? "+" : ""}${num(conv)} p.p.`} />}
        {g.resolvido_em && <Campo label="Resolvido em" valor={g.resolvido_em} />}
      </div>
      {(r.ganhos?.length ?? 0) > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {r.ganhos!.map((k) => (
            <span key={k} className="rounded-lg border border-emerald-500/25 bg-background/40 px-2 py-0.5 text-[11px] font-medium text-foreground">
              {GANHO_ICONE[k] ?? ""} {GANHOS.find((g2) => g2.key === k)?.label ?? k}
            </span>
          ))}
        </div>
      )}
      {r.descricao && <p className="text-[13px] font-medium text-foreground/90 leading-relaxed">{r.descricao}</p>}
      {r.evidencia && (
        <p className="text-[12px] font-medium text-muted-foreground">
          <strong className="text-foreground">Evidência:</strong> {r.evidencia}
        </p>
      )}
      {(r.evidencia_links?.length ?? 0) > 0 && (
        <div className="flex flex-wrap gap-2">
          {r.evidencia_links!.map((l) => (
            <a key={l} href={l} target="_blank" rel="noreferrer" className="text-[12px] font-semibold text-primary underline underline-offset-2 break-all">{l}</a>
          ))}
        </div>
      )}
    </div>
  )
}

// ---- Assistente de mapeamento (6 etapas) ----
// Uma pergunta por vez em vez de um formulário de 8 campos: o cliente responde
// o que sabe de cabeça e não abandona no meio. A validação é por etapa, então
// ele nunca chega ao fim com um campo essencial em branco.
export interface NovoGargalo {
  id_area: string | null
  areaTexto: string | null
  processo: string
  descricao: string | null
  horas_mes: number | null
  frequencia: string | null
  quem_executa: string | null
  ferramentas: string[]
  impactos: string[]
  prioridade: boolean
  prioridade_motivo: string | null
}

function AssistenteGargalo({ aberto, onFechar, areas, salvando, onSalvar }: {
  aberto: boolean
  onFechar: () => void
  areas: AreaMetodo[]
  salvando: boolean
  onSalvar: (dados: NovoGargalo) => void
}) {
  const [etapa, setEtapa] = useState(1)
  const [idArea, setIdArea] = useState<string | null>(null)
  const [areaTexto, setAreaTexto] = useState<string | null>(null)
  const [processo, setProcesso] = useState("")
  const [descricao, setDescricao] = useState("")
  const [horas, setHoras] = useState("")
  const [frequencia, setFrequencia] = useState("")
  const [quemExecuta, setQuemExecuta] = useState("")
  const [ferramentas, setFerramentas] = useState<string[]>([])
  const [impactos, setImpactos] = useState<string[]>([])
  const [prioridade, setPrioridade] = useState<boolean | null>(null)
  const [motivo, setMotivo] = useState("")

  // Zera ao reabrir — senão o segundo gargalo nasce com as respostas do primeiro.
  useEffect(() => {
    if (!aberto) return
    setEtapa(1); setIdArea(null); setAreaTexto(null); setProcesso(""); setDescricao("")
    setHoras(""); setFrequencia(""); setQuemExecuta(""); setFerramentas([]); setImpactos([])
    setPrioridade(null); setMotivo("")
  }, [aberto])

  // As áreas vêm da Fase 2 quando existem — é o que mantém o gargalo ligado ao
  // resto do Método. Sem áreas cadastradas, cai na lista fixa e grava só o texto.
  const usandoFase2 = areas.length > 0
  const opcoesArea = usandoFase2 ? areas.map((a) => a.nome) : [...AREAS_GARGALO]
  const areaEscolhida = usandoFase2 ? (areas.find((a) => a.id === idArea)?.nome ?? null) : areaTexto

  function alternar(lista: string[], item: string, set: (v: string[]) => void) {
    set(lista.includes(item) ? lista.filter((x) => x !== item) : [...lista, item])
  }

  const bloqueado =
    (etapa === 1 && !areaEscolhida) ||
    (etapa === 2 && !processo.trim()) ||
    (etapa === 3 && (!horas || !frequencia)) ||
    (etapa === 5 && impactos.length === 0)

  function concluir() {
    onSalvar({
      id_area: usandoFase2 ? idArea : null,
      areaTexto: areaEscolhida,
      processo: processo.trim(),
      descricao: descricao.trim() || null,
      horas_mes: horas ? Number(horas) : null,
      frequencia: frequencia || null,
      quem_executa: quemExecuta.trim() || null,
      ferramentas,
      impactos,
      prioridade: prioridade === true,
      prioridade_motivo: motivo.trim() || null,
    })
  }

  return (
    <Dialog open={aberto} onOpenChange={(o) => !o && onFechar()}>
      <DialogContent className="sm:max-w-2xl max-h-[88vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Mapear novo gargalo</DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          <div>
            <div className="flex gap-1.5">
              {[1, 2, 3, 4, 5, 6].map((n) => (
                <span key={n} className={`h-1 flex-1 rounded-full ${n <= etapa ? "bg-primary" : "bg-muted/40"}`} />
              ))}
            </div>
            <p className="mt-2 text-[11px] font-bold uppercase tracking-widest text-muted-foreground">
              Etapa {etapa} de 6
            </p>
          </div>

          {etapa === 1 && (
            <div className="space-y-4">
              <h3 className="text-lg font-bold tracking-tight text-foreground">Em qual área está o gargalo?</h3>
              {usandoFase2 && (
                <p className="text-[12px] font-medium text-muted-foreground">
                  São as áreas que você criou na <strong className="text-foreground">Fase 2</strong> — é o que
                  mantém este gargalo ligado ao resto do Método.
                </p>
              )}
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {opcoesArea.map((nome, i) => {
                  const id = usandoFase2 ? areas[i].id : null
                  const ativa = usandoFase2 ? idArea === id : areaTexto === nome
                  return (
                    <button
                      key={nome}
                      type="button"
                      onClick={() => {
                        if (usandoFase2) setIdArea(id)
                        else setAreaTexto(nome)
                        setEtapa(2)
                      }}
                      className={`rounded-xl border p-4 text-left transition-colors ${
                        ativa ? "border-primary bg-primary/10" : "border-border hover:border-primary/50"
                      }`}
                    >
                      <span className="text-xl">{AREA_ICONE[nome] ?? "➕"}</span>
                      <p className="mt-2 text-[13px] font-bold text-foreground">{nome}</p>
                    </button>
                  )
                })}
              </div>
            </div>
          )}

          {etapa === 2 && (
            <div className="space-y-4">
              <h3 className="text-lg font-bold tracking-tight text-foreground">
                Qual processo ou tarefa está consumindo tempo demais?
              </h3>
              <div className="space-y-2">
                <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Nome do gargalo</Label>
                <Input
                  className="h-11 rounded-xl"
                  placeholder="Ex.: Montagem manual de propostas comerciais"
                  value={processo}
                  onChange={(e) => setProcesso(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                  Como esse processo funciona hoje?
                </Label>
                <Textarea
                  className="rounded-xl min-h-28"
                  placeholder="Ex.: O vendedor recebe as informações pelo WhatsApp, consulta os preços em uma planilha, monta a proposta no Word, gera o PDF e envia manualmente ao cliente."
                  value={descricao}
                  onChange={(e) => setDescricao(e.target.value)}
                />
              </div>
            </div>
          )}

          {etapa === 3 && (
            <div className="space-y-5">
              <h3 className="text-lg font-bold tracking-tight text-foreground">Quanto esse gargalo custa?</h3>
              <div className="space-y-2">
                <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                  Quantas horas por mês esse processo consome?
                </Label>
                <div className="flex items-center gap-3">
                  <Input
                    type="number" min={0}
                    className="h-14 rounded-xl max-w-32 text-2xl font-bold"
                    placeholder="23"
                    value={horas}
                    onChange={(e) => setHoras(e.target.value)}
                  />
                  <span className="text-[13px] font-medium text-muted-foreground">horas/mês</span>
                </div>
              </div>
              <div className="space-y-2">
                <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Com que frequência acontece?</Label>
                <div className="flex flex-wrap gap-2">
                  {FREQUENCIAS.map((f) => (
                    <Chip key={f} ativo={frequencia === f} onClick={() => setFrequencia(f)}>{f}</Chip>
                  ))}
                </div>
              </div>
              <div className="space-y-2">
                <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Quem executa esse processo?</Label>
                <Input className="h-11 rounded-xl" placeholder="Ex.: Vendedor" value={quemExecuta} onChange={(e) => setQuemExecuta(e.target.value)} />
              </div>
            </div>
          )}

          {etapa === 4 && (
            <div className="space-y-4">
              <h3 className="text-lg font-bold tracking-tight text-foreground">Quais ferramentas são utilizadas atualmente?</h3>
              <p className="text-[13px] font-medium text-muted-foreground">Pode selecionar mais de uma.</p>
              <div className="flex flex-wrap gap-2">
                {FERRAMENTAS.map((f) => (
                  <Chip key={f} ativo={ferramentas.includes(f)} onClick={() => alternar(ferramentas, f, setFerramentas)}>{f}</Chip>
                ))}
              </div>
            </div>
          )}

          {etapa === 5 && (
            <div className="space-y-4">
              <h3 className="text-lg font-bold tracking-tight text-foreground">O que esse gargalo prejudica hoje?</h3>
              <p className="text-[13px] font-medium text-muted-foreground">
                Selecione todos os impactos que se aplicam. A legenda abaixo de cada item explica o que ele significa.
              </p>
              <div className="grid gap-3 sm:grid-cols-2">
                {IMPACTOS.map((i) => (
                  <button
                    key={i}
                    type="button"
                    onClick={() => alternar(impactos, i, setImpactos)}
                    className={`rounded-xl border p-4 text-left transition-colors ${
                      impactos.includes(i) ? "border-primary bg-primary/10" : "border-border hover:border-primary/50"
                    }`}
                  >
                    <p className="text-[13px] font-bold text-foreground">
                      <span className="mr-2">{IMPACTO_ICONE[i]}</span>{i}
                    </p>
                    <p className="mt-1 text-[11.5px] font-medium text-muted-foreground leading-relaxed">{IMPACTO_LEGENDA[i]}</p>
                  </button>
                ))}
              </div>
            </div>
          )}

          {etapa === 6 && (
            <div className="space-y-4">
              <h3 className="text-lg font-bold tracking-tight text-foreground">Este gargalo é uma prioridade para ser resolvido?</h3>
              <div className="grid gap-3 sm:grid-cols-2">
                {[
                  { v: false, label: "Não", hint: "Importante, mas não é urgente agora." },
                  { v: true, label: "★ Sim, é prioridade", hint: "Precisa de atenção imediata da empresa." },
                ].map((o) => (
                  <button
                    key={String(o.v)}
                    type="button"
                    onClick={() => setPrioridade(o.v)}
                    className={`rounded-xl border p-4 text-left transition-colors ${
                      prioridade === o.v ? "border-primary bg-primary/10" : "border-border hover:border-primary/50"
                    }`}
                  >
                    <p className="text-[13px] font-bold text-foreground">{o.label}</p>
                    <p className="mt-1 text-[11.5px] font-medium text-muted-foreground">{o.hint}</p>
                  </button>
                ))}
              </div>
              {prioridade === true && (
                <div className="space-y-2">
                  <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                    Por que este gargalo é prioridade? <span className="font-medium normal-case text-muted-foreground/70">(opcional)</span>
                  </Label>
                  <Textarea
                    className="rounded-xl min-h-20"
                    placeholder="Ex.: Está travando o processo comercial e consumindo mais de 30 horas por mês da equipe."
                    value={motivo}
                    onChange={(e) => setMotivo(e.target.value)}
                  />
                </div>
              )}
            </div>
          )}

          <div className="flex items-center justify-between pt-2 border-t border-border">
            <Button
              variant="ghost"
              className="h-11 rounded-xl font-bold text-xs uppercase tracking-wider text-muted-foreground"
              onClick={() => (etapa === 1 ? onFechar() : setEtapa(etapa - 1))}
            >
              {etapa === 1 ? "Cancelar" : "Voltar"}
            </Button>
            {etapa < 6 ? (
              <Button disabled={bloqueado} className="h-11 rounded-xl font-bold text-xs uppercase tracking-wider" onClick={() => setEtapa(etapa + 1)}>
                Continuar
              </Button>
            ) : (
              <Button disabled={prioridade === null || salvando} className="h-11 rounded-xl font-bold text-xs uppercase tracking-wider" onClick={concluir}>
                {salvando ? "Salvando..." : "Concluir mapeamento"}
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}

// ---- Registrar o resultado depois de resolver ----
// É o que fecha o ciclo: sem número depois, "resolvido" é só uma coluna.
function DialogResultado({ g, onFechar, onSalvar }: {
  g: Gargalo | null
  onFechar: () => void
  onSalvar: (r: ResultadoGargalo) => void
}) {
  const [horasDepois, setHorasDepois] = useState("")
  const [custo, setCusto] = useState("")
  const [convAntes, setConvAntes] = useState("")
  const [convDepois, setConvDepois] = useState("")
  const [ganhos, setGanhos] = useState<string[]>([])
  const [descricao, setDescricao] = useState("")
  const [evidencia, setEvidencia] = useState("")
  const [links, setLinks] = useState<string[]>([])
  const [novoLink, setNovoLink] = useState("")

  useEffect(() => {
    if (!g) return
    setHorasDepois(""); setCusto(""); setConvAntes(""); setConvDepois("")
    setGanhos([]); setDescricao(""); setEvidencia(""); setLinks([]); setNovoLink("")
  }, [g?.id]) // eslint-disable-line react-hooks/exhaustive-deps

  if (!g) return null

  const numero = (v: string) => (v.trim() === "" ? null : Number(v.replace(",", ".")))
  const recuperadas = horasRecuperadas(g.horas_mes, { horas_depois: numero(horasDepois) })

  function adicionarLink() {
    const l = novoLink.trim()
    if (!l) return
    setLinks((p) => (p.includes(l) ? p : [...p, l]))
    setNovoLink("")
  }

  return (
    <Dialog open onOpenChange={(o) => !o && onFechar()}>
      <DialogContent className="sm:max-w-xl max-h-[88vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="pr-6">Registrar resultado — {g.processo}</DialogTitle>
        </DialogHeader>
        <div className="space-y-5">
          <div className="rounded-xl border border-border bg-muted/10 p-4 grid grid-cols-3 gap-3">
            <Campo label="Consumia" valor={g.horas_mes ? `${num(Number(g.horas_mes))}h/mês` : "—"} />
            <div className="space-y-1.5">
              <p className="text-[9px] font-bold uppercase tracking-widest text-muted-foreground">Consome agora</p>
              <Input
                type="number" min={0}
                className="h-10 rounded-xl"
                placeholder="4"
                value={horasDepois}
                onChange={(e) => setHorasDepois(e.target.value)}
              />
            </div>
            <Campo label="Recuperadas" valor={recuperadas > 0 ? `${num(recuperadas)}h/mês` : "—"} />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Custo economizado (R$/mês)</Label>
              <Input type="number" min={0} className="h-11 rounded-xl" placeholder="Opcional" value={custo} onChange={(e) => setCusto(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Conversão antes → depois (%)</Label>
              <div className="flex items-center gap-2">
                <Input type="number" className="h-11 rounded-xl" placeholder="Antes" value={convAntes} onChange={(e) => setConvAntes(e.target.value)} />
                <span className="text-muted-foreground">→</span>
                <Input type="number" className="h-11 rounded-xl" placeholder="Depois" value={convDepois} onChange={(e) => setConvDepois(e.target.value)} />
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">O que a empresa ganhou</Label>
            <div className="flex flex-wrap gap-2">
              {GANHOS.map((g2) => (
                <Chip
                  key={g2.key}
                  ativo={ganhos.includes(g2.key)}
                  onClick={() => setGanhos((p) => (p.includes(g2.key) ? p.filter((x) => x !== g2.key) : [...p, g2.key]))}
                >
                  {g2.icon} {g2.label}
                </Chip>
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">O que mudou na prática</Label>
            <Textarea
              className="rounded-xl min-h-20"
              placeholder="Ex.: Agora o sistema concilia sozinho e o analista revisa apenas as divergências do dia."
              value={descricao}
              onChange={(e) => setDescricao(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Evidência</Label>
            <Input
              className="h-11 rounded-xl"
              placeholder="Ex.: Fechamento passou de 1h para 10 minutos por dia."
              value={evidencia}
              onChange={(e) => setEvidencia(e.target.value)}
            />
            <div className="flex items-center gap-2">
              <Input
                className="h-10 rounded-xl"
                placeholder="Link do painel, planilha ou print"
                value={novoLink}
                onChange={(e) => setNovoLink(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); adicionarLink() } }}
              />
              <Button variant="outline" className="h-10 rounded-xl text-xs font-bold" onClick={adicionarLink}>Adicionar</Button>
            </div>
            {links.length > 0 && (
              <div className="flex flex-wrap gap-1.5">
                {links.map((l) => (
                  <span key={l} className="flex items-center gap-1.5 rounded-lg border border-border bg-muted/20 px-2 py-1 text-[11px] font-medium text-foreground max-w-full">
                    <span className="truncate">{l}</span>
                    <button onClick={() => setLinks((p) => p.filter((x) => x !== l))} className="text-muted-foreground hover:text-destructive">
                      <X className="size-3" />
                    </button>
                  </span>
                ))}
              </div>
            )}
          </div>

          <Button
            className="w-full h-11 rounded-xl font-bold uppercase tracking-wider text-xs gap-2"
            onClick={() => onSalvar({
              horas_depois: numero(horasDepois),
              custo_mes: numero(custo),
              conversao_antes: numero(convAntes),
              conversao_depois: numero(convDepois),
              ganhos,
              descricao: descricao.trim() || null,
              evidencia: evidencia.trim() || null,
              evidencia_links: links,
            })}
          >
            <TrendingUp className="size-4" />
            Marcar como resolvido
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
