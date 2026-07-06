import { useState } from "react"
import { Link } from "react-router-dom"
import { toast } from "sonner"
import { Copy, Download, Trash2, Printer, Play, Sparkles, Loader2 } from "lucide-react"

import { PageHeader, Badge } from "@/components/guardiao/ui-kit"
import {
  actions, useStore, FASES, resumoVitoriaParaCEO, gerarRelatorioCEOIA,
  type Fase,
} from "@/lib/guardiao"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  Select, SelectTrigger, SelectValue, SelectContent, SelectItem,
} from "@/components/ui/select"

// Regras de impressão embutidas (self-contained): o app-alvo não define utilitários
// de print. Escondem toolbar/histórico e o shell durante window.print(), deixando
// só o "papel" branco do relatório visível — comportamento idêntico ao source.
const PRINT_CSS = `
@media print {
  body { background: #fff !important; }
  .guardiao-no-print, aside, header, nav { display: none !important; }
  .guardiao-print-area { background: #fff !important; color: #000 !important; box-shadow: none !important; }
  .guardiao-print-area * { color: #000 !important; border-color: #ccc !important; }
  .guardiao-print-area .guardiao-accent { color: #4a6b00 !important; }
  .guardiao-print-area .guardiao-card { break-inside: avoid; }
}
`

export default function Relatorio() {
  const setores = useStore((s) => s.setores)
  const gargalos = useStore((s) => s.gargalos)
  const projetos = useStore((s) => s.projetos)
  const relatorios = useStore((s) => s.relatorios)
  const jornada = useStore((s) => s.jornada)
  const tarefas = useStore((s) => s.tarefas)
  const evidencias = useStore((s) => s.evidencias)
  const vitorias = useStore((s) => s.vitorias ?? [])
  const guardiao = useStore((s) => s.guardiao)
  const vitoriasDoRelatorio = vitorias.filter((v) => v.noRelatorioCEO)

  const [periodo, setPeriodo] = useState("Semana atual")
  const [conteudo, setConteudo] = useState("")
  const [view, setView] = useState<"editar" | "visualizar">("editar")
  const [faseSelecionada, setFaseSelecionada] = useState<"jornada" | Fase>("jornada")
  const [loadingIA, setLoadingIA] = useState(false)

  const horas = projetos.reduce((a, p) => a + (p.horasEconomizadas || 0), 0)
  const implantados = projetos.filter((p) => ["Implementado", "Medindo resultados", "Apresentado ao CEO", "Apresentado ao time"].includes(p.status)).length
  const ativos = projetos.filter((p) => !["Concluído"].includes(p.status))

  const gerarPorFase = () => {
    const blocos: string[] = []
    blocos.push(`Relatório do Guardião de IA — visão por fases`)
    blocos.push(`Fase atual da empresa: Fase 0${jornada.faseAtual}`)
    blocos.push("")
    const alvo: Fase[] = faseSelecionada === "jornada" ? [1, 2, 3, 4, 5, 6, 7] : [faseSelecionada]
    alvo.forEach((n) => {
      const f = FASES.find((x) => x.num === n)!
      const est = jornada.fases[n]
      const tFase = tarefas.filter((t) => t.fase === n)
      const concl = tFase.filter((t) => t.status === "Concluído" || t.status === "Concluída").length
      const evAprov = evidencias.filter((e) => e.fase === n && e.status === "Aprovada").length
      blocos.push(`============================`)
      blocos.push(`Fase 0${n} — ${f.titulo}`)
      blocos.push(`Status: ${est.status}`)
      blocos.push(`Setores: ${est.setoresEnvolvidos.map((id) => setores.find((s) => s.id === id)?.nome).filter(Boolean).join(", ") || "—"}`)
      blocos.push(`Tarefas concluídas: ${concl}/${tFase.length}`)
      blocos.push(`Evidências aprovadas: ${evAprov}`)
      blocos.push(`Resultado: ${est.resultadoAlcancado || "(não preenchido)"}`)
      blocos.push(`Próxima ação: ${est.proximaAcao || "(não definida)"}`)
      if (est.resumoCEO) {
        blocos.push("")
        blocos.push("Resumo para CEO:")
        blocos.push(est.resumoCEO)
      }
      blocos.push("")
    })
    setConteudo(blocos.join("\n"))
    setPeriodo(faseSelecionada === "jornada" ? "Jornada completa" : `Fase 0${faseSelecionada}`)
  }

  const gerar = (tipo: "semanal" | "mensal") => {
    const setorPrioritario = setores[0]?.nome ?? "[setor]"
    const projetoAtivo = projetos.find((p) => !["Concluído"].includes(p.status))
    const horasLocal = projetos.reduce((a, p) => a + (p.horasEconomizadas || 0), 0)
    const concluidos = projetos.filter((p) => p.status === "Concluído").length
    const sugSistemas = gargalos.filter((g) => /sistema/i.test(g.analiseIA)).length
    const sugAutos = gargalos.filter((g) => /automa/i.test(g.analiseIA)).length

    const resumo = `Resumo executivo (${tipo === "semanal" ? "semana" : "mês"}):
Esta ${tipo === "semanal" ? "semana" : "este mês"}, o Guardião mapeou os principais gargalos do setor ${setorPrioritario}, identificou oportunidades de automação e iniciou o projeto piloto ${projetoAtivo?.nome ?? "[nome do projeto]"}, com foco em reduzir tempo manual, melhorar a visibilidade dos indicadores e transformar processos repetitivos em sistemas.

Setores trabalhados:
${setores.map((s) => " - " + s.nome + " (" + s.status + ")").join("\n") || " - —"}

Gargalos identificados (${gargalos.length}):
${gargalos.slice(0, 8).map((g) => " - " + g.processo + " [" + g.status + "]").join("\n") || " - —"}

Projetos pilotos em andamento:
${projetos.filter((p) => p.status !== "Concluído").map((p) => " - " + p.nome + " [" + p.status + "]").join("\n") || " - —"}

Projetos concluídos: ${concluidos}
Sistemas sugeridos: ${sugSistemas}
Automações sugeridas: ${sugAutos}
Horas estimadas economizadas: ${horasLocal}

Principais travas:
${gargalos.filter((g) => g.prioridade === "Alta").map((g) => " - " + g.processo).join("\n") || " - —"}

Apoios necessários:
${projetos.filter((p) => p.precisaApoio).map((p) => " - " + p.nome + " (" + (p.tipoApoio || "—") + ")").join("\n") || " - —"}

Próximos passos:
 - Avançar com o projeto piloto em andamento
 - Validar com líderes de setor
 - Apresentar resultados para o CEO

Vitórias do período:
${vitoriasDoRelatorio.length === 0 ? " - Nenhuma vitória marcada para o relatório" : vitoriasDoRelatorio.map((v) => " - " + v.titulo + " (" + (v.setorNome ?? "—") + ") · " + (v.horasSemana || 0) + "h/sem · " + (v.percentualEficiencia || 0) + "% eficiência").join("\n")}`
    setConteudo(resumo)
    setPeriodo(tipo === "semanal" ? "Semana atual" : "Mês atual")
  }

  const gerarComIA = async () => {
    const fasesResumo = FASES.map((f) => {
      const est = jornada.fases[f.num]
      const tFase = tarefas.filter((t) => t.fase === f.num)
      const concl = tFase.filter((t) => t.status === "Concluído" || t.status === "Concluída").length
      const evAprov = evidencias.filter((e) => e.fase === f.num && e.status === "Aprovada").length
      return `Fase 0${f.num} — ${f.titulo}: ${est.status} · tarefas ${concl}/${tFase.length} · evidências aprovadas ${evAprov}${est.resultadoAlcancado ? ` · resultado: ${est.resultadoAlcancado}` : ""}${est.proximaAcao ? ` · próxima: ${est.proximaAcao}` : ""}`
    }).join("\n")

    const setoresLinha = setores.map((s) => `- ${s.nome} (${s.status}) — líder ${s.lider || "—"}`).join("\n") || "- —"
    const gargalosAbertos = gargalos.filter((g) => g.status !== "Resolvido" && g.status !== "Virou projeto piloto")
    const gargalosLinha = gargalosAbertos.slice(0, 12).map((g) => `- [${g.prioridade}] ${g.processo} (${setores.find((s) => s.id === g.setorId)?.nome ?? "—"})`).join("\n") || "- nenhum gargalo aberto"
    const projetosLinha = projetos.filter((p) => p.status !== "Concluído").slice(0, 12).map((p) => `- ${p.nome} [${p.status}]${p.precisaApoio ? ` (precisa apoio: ${p.tipoApoio || "—"})` : ""}`).join("\n") || "- nenhum projeto ativo"
    const vitoriasLinha = vitoriasDoRelatorio.map((v) => `- ${v.titulo} (Fase 0${v.fase} · ${v.setorNome ?? "—"}) · ${v.horasSemana || 0}h/sem · ${v.percentualEficiencia || 0}% eficiência${v.resumoCEO ? ` — ${v.resumoCEO}` : ""}`).join("\n") || "- nenhuma vitória marcada"

    const snapshot = `EMPRESA: ${guardiao.setor || "—"}
GUARDIÃO: ${guardiao.nomePrincipal || "—"}
FASE ATUAL: 0${jornada.faseAtual}

JORNADA POR FASES:
${fasesResumo}

SETORES:
${setoresLinha}

GARGALOS ABERTOS (${gargalosAbertos.length}):
${gargalosLinha}

PROJETOS ATIVOS:
${projetosLinha}

VITÓRIAS DO PERÍODO:
${vitoriasLinha}

MÉTRICAS:
- Horas economizadas (acumulado projetos): ${horas}h
- Projetos implantados: ${implantados}
- Projetos ativos: ${ativos.length}`

    setLoadingIA(true)
    try {
      const out = await gerarRelatorioCEOIA({
        periodo,
        empresa: guardiao.setor || "",
        guardiao: guardiao.nomePrincipal || "",
        faseAtual: jornada.faseAtual,
        snapshot,
      })
      setConteudo(out.text)
      toast.success("Relatório gerado pela IA.")
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err)
      if (msg.includes("RATE_LIMIT")) toast.error("IA ocupada. Tente em alguns segundos.")
      else if (msg.includes("CREDITS_EXHAUSTED")) toast.error("Créditos de IA esgotados. Adicione créditos em Settings → Plans & credits.")
      else toast.error("Erro ao gerar relatório: " + msg)
    } finally {
      setLoadingIA(false)
    }
  }

  const salvar = () => {
    actions.addRelatorio({ periodo, conteudo })
    setConteudo("")
  }

  const copiar = () => { navigator.clipboard.writeText(conteudo) }
  const exportar = () => {
    const blob = new Blob([conteudo], { type: "text/plain" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = `relatorio-${periodo.toLowerCase().replace(/\s+/g, "-")}.txt`
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div className="space-y-6">
      <style>{PRINT_CSS}</style>

      <PageHeader
        title="Relatório para CEO"
        subtitle="Visão executiva: setores, fases, vitórias e decisões pendentes."
        action={
          <Button asChild variant="outline" className="border-primary/40 bg-primary/10 text-primary hover:bg-primary/20 hover:text-primary">
            <Link to="/guardiao/apresentacao">
              <Play className="h-4 w-4" /> Apresentar ao vivo
            </Link>
          </Button>
        }
      />

      {/* Resumo executivo no topo */}
      <ResumoExecutivoTopo />

      <div className="guardiao-no-print flex flex-wrap items-center gap-2">
        <Button onClick={gerarComIA} disabled={loadingIA} className="glow-neon">
          {loadingIA ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
          {loadingIA ? "Gerando com IA..." : "Gerar com IA"}
        </Button>
        <Button variant="outline" onClick={() => gerar("semanal")}>Modelo semanal</Button>
        <Button variant="outline" onClick={() => gerar("mensal")}>Modelo mensal</Button>
        <div className="flex items-center gap-1">
          <Select
            value={String(faseSelecionada)}
            onValueChange={(v) => setFaseSelecionada(v === "jornada" ? "jornada" : (Number(v) as Fase))}
          >
            <SelectTrigger className="w-56">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="jornada">Jornada completa</SelectItem>
              {FASES.map((f) => (
                <SelectItem key={f.num} value={String(f.num)}>Fase 0{f.num} — {f.titulo}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button onClick={gerarPorFase}>Gerar por fase</Button>
        </div>
        <Button variant="outline" onClick={copiar} disabled={!conteudo}><Copy className="h-4 w-4" /> Copiar</Button>
        <Button variant="outline" onClick={exportar} disabled={!conteudo}><Download className="h-4 w-4" /> Exportar texto</Button>
        <Button variant="outline" onClick={() => window.print()} disabled={!conteudo}><Printer className="h-4 w-4" /> Imprimir / PDF</Button>
      </div>

      <div className="guardiao-no-print">
        <Tabs value={view} onValueChange={(v) => setView(v as "editar" | "visualizar")}>
          <TabsList className="w-full max-w-md">
            <TabsTrigger value="editar">Editar</TabsTrigger>
            <TabsTrigger value="visualizar">Visualizar</TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      {view === "editar" ? (
        <div className="guardiao-no-print rounded-lg border card-glass p-5">
          <label className="text-xs text-muted-foreground">Período</label>
          <Input className="mb-3 mt-1" value={periodo} onChange={(e) => setPeriodo(e.target.value)} />
          <Textarea
            className="min-h-[360px] font-mono whitespace-pre-wrap"
            value={conteudo}
            onChange={(e) => setConteudo(e.target.value)}
            placeholder="Clique em 'Gerar relatório' para começar ou escreva manualmente..."
          />
          <div className="flex justify-end mt-3">
            <Button onClick={salvar} disabled={!conteudo}>Salvar relatório</Button>
          </div>
        </div>
      ) : (
        <div className="guardiao-print-area rounded-lg border bg-white text-black p-10 print-area">
          <div className="flex items-center justify-between border-b border-neutral-300 pb-6 mb-8">
            <div className="flex items-center gap-3">
              <div className="h-12 w-12 rounded-lg bg-primary/15 border border-primary/40 flex items-center justify-center text-primary text-sm font-bold guardiao-accent">PMC</div>
              <div>
                <div className="text-xs uppercase tracking-[0.25em] text-primary guardiao-accent">Multiplicador de Crescimento</div>
                <div className="text-lg font-semibold">Relatório do Guardião de IA</div>
              </div>
            </div>
            <div className="text-right">
              <div className="text-xs uppercase tracking-wider text-neutral-500">Período</div>
              <div className="text-base font-semibold">{periodo}</div>
              <div className="text-xs text-neutral-500">{new Date().toLocaleDateString("pt-BR")}</div>
            </div>
          </div>

          <div className="grid grid-cols-4 gap-4 mb-8">
            <PrintStat n={setores.length} label="Setores" />
            <PrintStat n={ativos.length} label="Projetos ativos" />
            <PrintStat n={implantados} label="Implantados" />
            <PrintStat n={`${horas}h`} label="Economizadas/sem" />
          </div>

          <div className="prose prose-sm max-w-none">
            <h2 className="text-xl font-semibold mb-3">Resumo executivo</h2>
            <pre className="whitespace-pre-wrap font-sans text-[14px] leading-relaxed">{conteudo || "Gere ou escreva o conteúdo na aba Editar."}</pre>
          </div>

          {vitoriasDoRelatorio.length > 0 && (
            <div className="mt-8 pt-6 border-t border-neutral-300">
              <h2 className="text-xl font-semibold mb-3">Vitórias do período</h2>
              <div className="grid grid-cols-3 gap-3 mb-4">
                <PrintStat n={vitoriasDoRelatorio.length} label="Vitórias" />
                <PrintStat n={`${vitoriasDoRelatorio.reduce((a, v) => a + (v.horasSemana || 0), 0)}h`} label="Horas/semana" />
                <PrintStat n={`${Math.round((vitoriasDoRelatorio.filter((v) => v.percentualEficiencia > 0).reduce((a, v) => a + v.percentualEficiencia, 0) / Math.max(1, vitoriasDoRelatorio.filter((v) => v.percentualEficiencia > 0).length)) || 0)}%`} label="Eficiência média" />
              </div>
              <div className="space-y-3">
                {vitoriasDoRelatorio.map((v) => {
                  const setorNome = setores.find((s) => s.id === v.setorId)?.nome ?? v.setorNome
                  const resumo = v.resumoCEO || resumoVitoriaParaCEO(v, setorNome)
                  return (
                    <div key={v.id} className="border border-neutral-300 rounded-lg p-4 guardiao-card">
                      <div className="text-xs uppercase tracking-wider text-neutral-500">Fase 0{v.fase} · {setorNome ?? "—"}</div>
                      <div className="text-base font-semibold">{v.titulo}</div>
                      <p className="text-sm mt-2 leading-relaxed">{resumo}</p>
                      {v.teveApoioPMC && <div className="text-xs text-neutral-600 mt-2">Apoio PMC: {v.apoioQuem.join(", ")}</div>}
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          <ResumoPorSetorPrint />

          <div className="mt-10 pt-6 border-t border-neutral-300 text-xs text-neutral-500 flex justify-between">
            <div>Sistema Operacional do Guardião de IA · PMC</div>
            <div>Não ter mais planilhas. Toda planilha deve se transformar em sistema.</div>
          </div>
        </div>
      )}

      <h3 className="guardiao-no-print text-lg font-semibold">Histórico de relatórios</h3>
      <div className="guardiao-no-print space-y-2">
        {relatorios.map((r) => (
          <div key={r.id} className="rounded-lg border card-glass p-4">
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="text-sm font-medium">{r.periodo}</div>
                <div className="text-xs text-muted-foreground">{new Date(r.criadoEm).toLocaleString("pt-BR")}</div>
              </div>
              <div className="flex gap-2 items-center">
                <Badge tone="neon">Salvo</Badge>
                <Button variant="ghost" size="icon-sm" onClick={() => { navigator.clipboard.writeText(r.conteudo) }}>
                  <Copy className="h-4 w-4" />
                </Button>
                <Button
                  variant="ghost" size="icon-sm"
                  className="hover:bg-destructive/20 hover:text-destructive"
                  onClick={() => actions.removeRelatorio(r.id)}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </div>
            <details className="mt-2">
              <summary className="text-xs text-primary cursor-pointer">Ver conteúdo</summary>
              <pre className="mt-2 text-xs whitespace-pre-wrap text-muted-foreground bg-muted p-3 rounded-md">{r.conteudo}</pre>
            </details>
          </div>
        ))}
        {relatorios.length === 0 && <div className="text-sm text-muted-foreground">Nenhum relatório salvo ainda.</div>}
      </div>
    </div>
  )
}

function PrintStat({ n, label }: { n: number | string; label: string }) {
  return (
    <div className="border border-neutral-300 rounded-lg p-4 guardiao-card">
      <div className="text-3xl font-semibold text-primary guardiao-accent">{n}</div>
      <div className="text-xs uppercase tracking-wider text-neutral-500 mt-1">{label}</div>
    </div>
  )
}

function MiniPrint({ k, v }: { k: string; v: number | string }) {
  return (
    <div className="border border-neutral-200 rounded p-2">
      <div className="text-base font-semibold text-primary guardiao-accent">{v}</div>
      <div className="text-[10px] uppercase tracking-wider text-neutral-500">{k}</div>
    </div>
  )
}

function ResumoPorSetorPrint() {
  const setores = useStore((s) => s.setores)
  const processos = useStore((s) => s.processosSetor ?? [])
  const tarefasRep = useStore((s) => s.tarefasRepetitivas ?? [])
  const gargalos = useStore((s) => s.gargalos)
  const sugestoes = useStore((s) => s.sugestoesIA ?? [])
  const projetos = useStore((s) => s.projetos)
  const vitorias = useStore((s) => s.vitorias ?? [])

  const linhas = setores.map((s) => {
    const procs = processos.filter((p) => p.setorId === s.id).length
    const tarefas = tarefasRep.filter((t) => t.setorId === s.id)
    const garg = gargalos.filter((g) => g.setorId === s.id)
    const sug = sugestoes.filter((x) => x.setorId === s.id)
    const sis = sug.filter((x) => x.tipo === "Sistema")
    const proj = projetos.filter((p) => p.setorId === s.id)
    const vit = vitorias.filter((v) => v.setorId === s.id)
    const hMes = Math.round(tarefas.reduce((a, t) => a + (t.tempoMes || 0), 0) * 0.5)
    const ef = vit.filter((v) => v.percentualEficiencia > 0)
    const eficiencia = ef.length ? Math.round(ef.reduce((a, v) => a + v.percentualEficiencia, 0) / ef.length) : 0
    const sisPrincipal = sis[0]?.titulo
    const gargPrincipal = garg.find((g) => g.prioridade === "Alta")?.processo ?? garg[0]?.processo
    const proxima = sug.find((x) => x.tipo === "Próxima ação")?.texto
    const resumoTxt = s.resumoCEO?.trim() ||
      `No setor de ${s.nome}, foram mapeados ${procs} processos e ${tarefas.length} tarefas repetitivas. Foram identificados ${garg.length} gargalos principais${gargPrincipal ? `, com destaque para ${gargPrincipal}` : ""}. A IA sugeriu ${sug.length} soluções${sisPrincipal ? `, incluindo ${sisPrincipal}` : ""}. O projeto piloto recomendado é ${proj[0]?.nome ?? sisPrincipal ?? "(a definir)"}, com potencial de reduzir ${hMes}h por mês e gerar ${eficiencia || 20}% de eficiência operacional.`
    return { s, procs, tarefas: tarefas.length, garg: garg.length, sug: sug.length, sis: sis.length, proj: proj.length, vit: vit.length, hMes, eficiencia, resumoTxt, proxima }
  })

  if (setores.length === 0) return null

  return (
    <div className="mt-8 pt-6 border-t border-neutral-300">
      <h2 className="text-xl font-semibold mb-3">Resumo por setor</h2>
      <div className="space-y-4">
        {linhas.map(({ s, procs, tarefas, garg, sug, sis, proj, vit, hMes, eficiencia, resumoTxt, proxima }) => (
          <div key={s.id} className="border border-neutral-300 rounded-lg p-4 guardiao-card">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <div>
                <div className="text-xs uppercase tracking-wider text-neutral-500">Fase 0{s.faseAtual ?? 1} · {s.status}</div>
                <div className="text-base font-semibold">{s.nome}</div>
              </div>
              <div className="text-xs text-neutral-600">Líder: {s.lider || "—"} · Guardião: {s.guardiao || "—"}</div>
            </div>
            <div className="grid grid-cols-4 md:grid-cols-8 gap-2 mt-3 text-center">
              <MiniPrint k="Processos" v={procs} />
              <MiniPrint k="Tarefas rep." v={tarefas} />
              <MiniPrint k="Gargalos" v={garg} />
              <MiniPrint k="Sugestões IA" v={sug} />
              <MiniPrint k="Sistemas" v={sis} />
              <MiniPrint k="Projetos" v={proj} />
              <MiniPrint k="Vitórias" v={vit} />
              <MiniPrint k="h/mês" v={`${hMes}h`} />
            </div>
            <p className="text-sm mt-3 leading-relaxed">{resumoTxt}</p>
            {s.validacaoLider?.validado && (
              <div className="text-xs text-neutral-600 mt-2">✓ Validado com o líder {s.validacaoLider.nome ? `(${s.validacaoLider.nome})` : ""}{s.validacaoLider.data ? ` em ${s.validacaoLider.data}` : ""}.</div>
            )}
            {s.validacaoCEO?.precisa && (
              <div className="text-xs text-neutral-600">Decisão do CEO: <strong>{s.validacaoCEO.status}</strong>.</div>
            )}
            {eficiencia > 0 && <div className="text-xs text-neutral-600">Eficiência média registrada: {eficiencia}%.</div>}
            {proxima && <div className="text-xs text-neutral-700 mt-2"><strong>Próximos passos:</strong> {proxima}</div>}
          </div>
        ))}
      </div>
    </div>
  )
}

function ResumoExecutivoTopo() {
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

  const StatMini = ({ label, value }: { label: string; value: number | string }) => (
    <div className="rounded-lg border card-glass p-3">
      <div className="text-[10px] uppercase tracking-wider text-muted-foreground">{label}</div>
      <div className="text-xl font-semibold text-primary">{value}</div>
    </div>
  )

  return (
    <div className="guardiao-no-print">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-3">
        <StatMini label="Setores com IA" value={setoresComIA} />
        <StatMini label="Vitórias" value={vitorias.length} />
        <StatMini label="Horas econ./mês" value={`${horasMes}h`} />
        <StatMini label="Gargalos críticos" value={gargCriticos} />
        <StatMini label="Sistemas implantados" value={sistemasImpl} />
        <StatMini label="Projetos ativos" value={projetos.filter((p) => p.status !== "Apresentado ao time").length} />
        <StatMini label="Feedbacks abertos" value={feedbacks.filter((f) => f.status === "Aguardando retorno" || f.status === "Em andamento").length} />
        <StatMini label="Setores acompanhados" value={setores.length} />
      </div>

      <div className="rounded-lg border card-glass overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-muted text-xs uppercase tracking-wider text-muted-foreground">
            <tr>
              <th className="text-left p-2">Setor</th>
              <th className="text-center p-2">Fase</th>
              <th className="text-left p-2">Projeto</th>
              <th className="text-left p-2">Principal gargalo</th>
              <th className="text-left p-2">Resultado</th>
              <th className="text-left p-2">Próxima decisão do CEO</th>
            </tr>
          </thead>
          <tbody>
            {setores.map((s) => {
              const proj = projetos.find((p) => p.setorId === s.id && p.status !== "Apresentado ao time")
              const garg = gargalos.find((g) => g.setorId === s.id && g.prioridade === "Alta") ?? gargalos.find((g) => g.setorId === s.id)
              const vit = vitorias.find((v) => v.setorId === s.id)
              const fb = feedbacks.find((f) => f.setorId === s.id)
              return (
                <tr key={s.id} className="border-t border-border/40">
                  <td className="p-2 font-medium">{s.nome}</td>
                  <td className="text-center p-2 text-primary">0{s.faseAtual ?? 1}</td>
                  <td className="p-2 text-xs truncate max-w-[200px]" title={proj?.nome}>{proj?.nome ?? "—"}</td>
                  <td className="p-2 text-xs truncate max-w-[220px]">{garg?.processo ?? garg?.descricao ?? "—"}</td>
                  <td className="p-2 text-xs truncate max-w-[200px]">{vit?.titulo ?? "—"}</td>
                  <td className="p-2 text-xs truncate max-w-[240px]">{fb?.proximaAcao ?? s.resumoCEO?.slice(0, 60) ?? "—"}</td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}
