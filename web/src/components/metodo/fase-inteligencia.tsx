// Fase 2 — Inteligência Empresarial: por área e por mês, o framework
// Dados (Dashboard) → Informação (Análise) → Estratégia (Plano de Ação) → Receita (Única Coisa/Rotina).
import { useEffect, useRef, useState } from "react"
import { toast } from "sonner"
import { supabase } from "@/lib/supabase"
import { ConfirmDialog } from "@/components/funis/confirm-dialog"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import {
  PlusIcon as Plus,
  Trash2Icon as Trash2,
  BarChart3Icon as BarChart3,
  FileTextIcon as FileText,
  TargetIcon as Target,
  DollarSignIcon as DollarSign,
  Sparkles2Icon as Sparkles,
  ChevronRightIcon as ChevronRight,
  SaveIcon as Save,
  UploadIcon as Upload,
  CheckCircle2Icon as CheckCircle2,
  CircleIcon as Circle,
  Edit3Icon as Edit3,
  RefreshCwIcon as RefreshCw,
  FileTextIcon as FileDoc,
  XIcon as X,
  ExternalLinkIcon as ExternalLink,
} from "@/components/ui/icons"
import { invokeMetodoIA, type FluxosInteligenciaIA } from "@/lib/metodo-ia"
import { extrairTextoDocumento, formatoSuportado, ACCEPT_DOCUMENTO } from "@/lib/extrair-documento"
import { FaseHeader, VazioFase, MarkdownBox, BadgeIA } from "./compartilhados"
import { parseVideo } from "@/lib/video-embed"

const DOC_BUCKET = "metodo-documentos"

interface Area { id: string; nome: string; descricao: string | null }
interface Ciclo {
  id: string
  id_area: string
  mes: number
  ano: number
  documento_texto: string | null
  documento_nome: string | null
  documento_url: string | null
  gerado_por_ia: boolean
  fluxos_json: FluxosInteligenciaIA | null
  dados_status: string; dados_conteudo: string | null
  informacao_status: string; informacao_conteudo: string | null
  estrategia_status: string; estrategia_conteudo: string | null
  receita_status: string; receita_conteudo: string | null
}

interface DocCiclo { id: string; id_ciclo: string; nome: string; url: string | null }

const MESES = ["Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho", "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"]
const STATUS_LABEL: Record<string, string> = { pendente: "Pendente", em_andamento: "Em andamento", concluida: "Concluída" }

const ETAPAS = [
  { key: "dados", titulo: "Dados", entregavel: "Dashboard", icon: BarChart3, desc: "As métricas da área organizadas e visíveis." },
  { key: "informacao", titulo: "Informação", entregavel: "Análise", icon: FileText, desc: "O que os números estão dizendo." },
  { key: "estrategia", titulo: "Estratégia", entregavel: "Plano de Ação", icon: Target, desc: "As ações priorizadas do mês." },
  { key: "receita", titulo: "Receita", entregavel: "Única Coisa / Rotina", icon: DollarSign, desc: "A alavanca de maior impacto e a rotina para executá-la." },
] as const

export function FaseInteligencia({ clientId }: { clientId: string }) {
  const hoje = new Date()
  const [areas, setAreas] = useState<Area[]>([])
  const [ciclos, setCiclos] = useState<Ciclo[]>([])
  const [areaSel, setAreaSel] = useState<Area | null>(null)
  const [cicloSel, setCicloSel] = useState<Ciclo | null>(null)
  const [loading, setLoading] = useState(true)
  const [showNovaArea, setShowNovaArea] = useState(false)
  const [novaArea, setNovaArea] = useState({ nome: "", descricao: "" })
  const [salvando, setSalvando] = useState(false)
  const [gerandoIA, setGerandoIA] = useState(false)
  const [erroIA, setErroIA] = useState<string | null>(null)
  const [processandoDoc, setProcessandoDoc] = useState(false)
  const [docErro, setDocErro] = useState<string | null>(null)
  // Autosave: tudo que o cliente digita é salvo sozinho (debounce) — sem risco
  // de perder trabalho ao trocar de área/ciclo ou fechar a página.
  const [estadoAuto, setEstadoAuto] = useState<"ocioso" | "salvando" | "salvo">("ocioso")
  const autoTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const [confirmArea, setConfirmArea] = useState<Area | null>(null)
  const [confirmIA, setConfirmIA] = useState(false)
  const [novoMes, setNovoMes] = useState(hoje.getMonth() + 1)
  const [novoAno, setNovoAno] = useState(hoje.getFullYear())
  const [docs, setDocs] = useState<DocCiclo[]>([])
  const [editText, setEditText] = useState<Set<string>>(new Set())
  // Vídeo do framework: a URL vem de configuracoes_links (o time troca pelo
  // painel, sem deploy) e some se a chave for desativada.
  const [videoUrl, setVideoUrl] = useState<string | null>(null)

  async function fetchTudo() {
    const [{ data: as }, { data: cs }, { data: ds }, { data: link }] = await Promise.all([
      supabase.from("metodo_areas").select("id, nome, descricao").eq("id_cliente", clientId).order("created_at"),
      supabase.from("metodo_area_ciclos").select("*").eq("id_cliente", clientId).order("ano", { ascending: false }).order("mes", { ascending: false }),
      supabase.from("metodo_ciclo_documentos").select("id, id_ciclo, nome, url").eq("id_cliente", clientId).order("created_at"),
      supabase.from("configuracoes_links").select("url").eq("chave", "video_framework_ie").eq("ativo", true).maybeSingle(),
    ])
    setAreas(as ?? [])
    setCiclos(cs ?? [])
    setDocs(ds ?? [])
    setVideoUrl(link?.url?.trim() ? link.url.trim() : null)
    setLoading(false)
  }

  useEffect(() => { fetchTudo() }, [clientId]) // eslint-disable-line react-hooks/exhaustive-deps

  async function criarArea() {
    if (!novaArea.nome.trim()) return
    setSalvando(true)
    const { data, error } = await supabase
      .from("metodo_areas")
      .insert({ id_cliente: clientId, nome: novaArea.nome.trim(), descricao: novaArea.descricao.trim() || null })
      .select()
      .single()
    setSalvando(false)
    if (!error && data) {
      setShowNovaArea(false)
      setNovaArea({ nome: "", descricao: "" })
      setAreas((prev) => [...prev, data])
      setAreaSel(data)
      setCicloSel(null)
    }
  }

  async function excluirArea(id: string) {
    const { error } = await supabase.from("metodo_areas").delete().eq("id", id)
    if (error) {
      toast.error("Não consegui excluir a área.")
      return
    }
    if (areaSel?.id === id) { setAreaSel(null); setCicloSel(null) }
    fetchTudo()
  }

  async function novoCiclo(area: Area, mes: number, ano: number) {
    const existente = ciclos.find((c) => c.id_area === area.id && c.mes === mes && c.ano === ano)
    if (existente) { setCicloSel(existente); return }
    const { data, error } = await supabase
      .from("metodo_area_ciclos")
      .insert({ id_area: area.id, id_cliente: clientId, mes, ano })
      .select()
      .single()
    if (error) {
      toast.error("Não consegui criar o ciclo.")
      return
    }
    if (data) {
      setCiclos((prev) => [data, ...prev])
      setCicloSel(data)
    }
  }

  // Primeiro uso: cria as áreas clássicas com um clique.
  async function criarAreasPadrao() {
    setSalvando(true)
    const { data, error } = await supabase
      .from("metodo_areas")
      .insert([
        { id_cliente: clientId, nome: "Financeiro", descricao: "Análise mensal do DRE e fluxo de caixa" },
        { id_cliente: clientId, nome: "Comercial", descricao: "Funil, conversão e receita do mês" },
        { id_cliente: clientId, nome: "Operação", descricao: "Entrega, qualidade e produtividade" },
      ])
      .select()
    setSalvando(false)
    if (error) {
      toast.error("Não consegui criar as áreas.")
      return
    }
    setAreas(data ?? [])
    if (data?.[0]) setAreaSel(data[0])
  }

  // Progresso do ciclo: quantas das 4 etapas estão concluídas.
  function progressoCiclo(c: Ciclo): number {
    return ETAPAS.filter((e) => (c as any)[`${e.key}_status`] === "concluida").length
  }

  async function persistirCiclo(ciclo: Ciclo): Promise<boolean> {
    const { id, id_area, mes, ano, ...campos } = ciclo
    const { error } = await supabase
      .from("metodo_area_ciclos")
      .update({ ...campos, updated_at: new Date().toISOString() })
      .eq("id", id)
    if (error) {
      toast.error("Não consegui salvar o ciclo. Suas últimas alterações podem não ter sido gravadas.")
      return false
    }
    return true
  }

  function atualizaCicloLocal(patch: Partial<Ciclo>) {
    if (!cicloSel) return
    const novo = { ...cicloSel, ...patch }
    setCicloSel(novo)
    setCiclos((prev) => prev.map((c) => (c.id === novo.id ? novo : c)))
    // autosave com debounce
    setEstadoAuto("salvando")
    if (autoTimer.current) clearTimeout(autoTimer.current)
    autoTimer.current = setTimeout(async () => {
      const ok = await persistirCiclo(novo)
      setEstadoAuto(ok ? "salvo" : "ocioso")
    }, 900)
  }

  // Ao trocar de ciclo/área, descarta o timer pendente (o conteúdo já foi
  // agendado com o objeto certo; só evita indicador órfão).
  useEffect(() => {
    setEstadoAuto("ocioso")
  }, [cicloSel?.id])

  async function salvarCiclo() {
    if (!cicloSel) return
    setSalvando(true)
    if (autoTimer.current) clearTimeout(autoTimer.current)
    const ok = await persistirCiclo(cicloSel)
    setEstadoAuto(ok ? "salvo" : "ocioso")
    setSalvando(false)
  }

  // Adiciona um documento ao ciclo (vários por ciclo): extrai o texto (p/ a IA)
  // e guarda o arquivo original no storage.
  async function enviarDocumento(file: File) {
    if (!cicloSel) return
    setDocErro(null)
    if (!formatoSuportado(file.name)) {
      setDocErro("Formato não suportado. Use PDF, Excel, CSV ou TXT.")
      return
    }
    setProcessandoDoc(true)
    try {
      const texto = await extrairTextoDocumento(file)
      let url: string | null = null
      const safe = file.name.replace(/[^a-zA-Z0-9._-]/g, "_")
      const path = `${clientId}/${cicloSel.id}/${Date.now()}-${safe}`
      const { error: upErr } = await supabase.storage.from(DOC_BUCKET).upload(path, file, {
        contentType: file.type || undefined,
        upsert: false,
      })
      if (!upErr) {
        url = supabase.storage.from(DOC_BUCKET).getPublicUrl(path).data.publicUrl
      }
      const { data, error } = await supabase
        .from("metodo_ciclo_documentos")
        .insert({ id_ciclo: cicloSel.id, id_cliente: clientId, nome: file.name, url, texto })
        .select("id, id_ciclo, nome, url")
        .single()
      if (error) throw new Error(error.message)
      if (data) setDocs((prev) => [...prev, data])
    } catch (e: any) {
      setDocErro(e.message || "Não consegui ler o documento.")
    } finally {
      setProcessandoDoc(false)
    }
  }

  async function removerDocumento(docId: string) {
    const { error } = await supabase.from("metodo_ciclo_documentos").delete().eq("id", docId)
    if (error) {
      toast.error("Não consegui remover o documento.")
      return
    }
    setDocs((prev) => prev.filter((d) => d.id !== docId))
  }

  // Se já existe conteúdo escrito, confirma antes de a IA sobrescrever.
  function pedirGerarIA() {
    if (!cicloSel) return
    const temConteudo = ETAPAS.some((e) => ((cicloSel as any)[`${e.key}_conteudo`] ?? "").trim().length > 0)
    if (temConteudo) setConfirmIA(true)
    else gerarFluxosIA()
  }

  // Deriva os 4 campos de texto a partir do JSON estruturado (fallback de
  // edição manual + retrocompatibilidade — a home lê receita_conteudo).
  function derivarTextos(f: FluxosInteligenciaIA) {
    const seta = (t: string) => (t === "alta" ? "▲" : t === "queda" ? "▼" : "→")
    const dados = (f.kpis ?? [])
      .map((k) => `- **${k.nome}**: ${k.valor}${k.variacao ? ` (${seta(k.tendencia)} ${k.variacao})` : ""}${k.comentario ? ` — ${k.comentario}` : ""}`)
      .join("\n")
    const informacao = (f.insights ?? [])
      .map((i) => `- **[${i.tipo.toUpperCase()}]** ${i.texto}`)
      .join("\n")
    const estrategia = (f.acoes ?? [])
      .map((a) => `- ${a.texto}${a.prazo_dias ? ` (${a.prazo_dias} dias)` : ""}${a.responsavel ? ` — ${a.responsavel}` : ""}`)
      .join("\n")
    const uc = f.unica_coisa
    const receita = uc
      ? [`**${uc.frase}**`, uc.meta ? `Meta: ${uc.meta}` : "", uc.rotina?.cadencia ? `Rotina (${uc.rotina.cadencia}):` : "", ...(uc.rotina?.passos ?? []).map((p, i) => `${i + 1}. ${p}`)].filter(Boolean).join("\n")
      : ""
    return { dados, informacao, estrategia, receita }
  }

  async function gerarFluxosIA() {
    if (!cicloSel || !areaSel) return
    setGerandoIA(true)
    setErroIA(null)
    try {
      // Busca os textos extraídos dos documentos deste ciclo.
      const idsDocs = docs.filter((d) => d.id_ciclo === cicloSel.id).map((d) => d.id)
      let documentos: { nome: string; texto: string }[] = []
      if (idsDocs.length > 0) {
        const { data } = await supabase
          .from("metodo_ciclo_documentos")
          .select("nome, texto")
          .in("id", idsDocs)
        documentos = (data ?? []).filter((d: any) => (d.texto ?? "").trim())
      }
      const fluxos = await invokeMetodoIA<FluxosInteligenciaIA>("inteligencia_fluxos", {
        area: areaSel.nome,
        mes: cicloSel.mes,
        ano: cicloSel.ano,
        documentos,
        documento: cicloSel.documento_texto || "",
      })
      const acoes = (fluxos.acoes ?? []).map((a) => ({ ...a, feita: false }))
      const fluxosComEstado: FluxosInteligenciaIA = { ...fluxos, acoes }
      const textos = derivarTextos(fluxosComEstado)
      const patch: Partial<Ciclo> = {
        gerado_por_ia: true,
        fluxos_json: fluxosComEstado,
        dados_conteudo: textos.dados, dados_status: "em_andamento",
        informacao_conteudo: textos.informacao, informacao_status: "em_andamento",
        estrategia_conteudo: textos.estrategia, estrategia_status: "em_andamento",
        receita_conteudo: textos.receita, receita_status: "em_andamento",
      }
      atualizaCicloLocal(patch)
      await supabase.from("metodo_area_ciclos").update({ ...patch, updated_at: new Date().toISOString() }).eq("id", cicloSel.id)
    } catch (e: any) {
      setErroIA(e.message || "Erro ao gerar com IA.")
    } finally {
      setGerandoIA(false)
    }
  }

  // Checklist do plano de ação: marca/desmarca e persiste no fluxos_json.
  function toggleAcao(i: number) {
    const f = cicloSel?.fluxos_json
    if (!f) return
    const acoes = (f.acoes ?? []).map((a, j) => (j === i ? { ...a, feita: !a.feita } : a))
    atualizaCicloLocal({ fluxos_json: { ...f, acoes } })
  }

  // parseVideo trata Vimeo não listado (id + hash) e já manda dnt=1.
  const videoEmbed = parseVideo(videoUrl)?.embedUrl ?? null
  const ciclosDaArea = areaSel ? ciclos.filter((c) => c.id_area === areaSel.id) : []
  const docsDoCiclo = cicloSel ? docs.filter((d) => d.id_ciclo === cicloSel.id) : []

  return (
    <div className="space-y-6">
      <FaseHeader numero={2} titulo="Inteligência Empresarial" subtitulo="Dados → Informação → Estratégia → Receita, todo mês">
        <Button className="h-10 gap-2 rounded-xl font-bold text-xs uppercase tracking-wider" onClick={() => setShowNovaArea(true)}>
          <Plus className="size-4" />
          Nova Área
        </Button>
      </FaseHeader>

      <p className="text-[15px] font-medium text-muted-foreground leading-relaxed max-w-3xl">
        Escolha uma área (Financeiro, Comercial, Operação...), crie o ciclo do mês e percorra o framework:
        cada etapa tem um entregável. Você pode preencher sozinho ou enviar o documento da área
        (ex.: o DRE do mês) e deixar o PMC OS gerar os 4 fluxos. Isso se repete todo mês — é a bússola do negócio.
      </p>

      {/* O framework antes do ciclo: até aqui as 4 etapas só apareciam DEPOIS de
          criar um ciclo, então quem chegava pela primeira vez não via a lógica
          Dado → Informação → Estratégia → Receita antes de já estar dentro dela. */}
      <section className="space-y-3">
        <div className="flex items-baseline gap-2 flex-wrap">
          <h3 className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground">
            Como funciona · 2 passos
          </h3>
          <span className="text-[11px] font-medium text-muted-foreground/70">
            Cada mês é um novo ciclo, e as áreas seguem com você pelo Método inteiro.
          </span>
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <Card className="border-primary/20 bg-primary/[0.03]">
            <CardContent className="p-4 flex items-start gap-3">
              <span className="mt-0.5 grid size-7 shrink-0 place-items-center rounded-lg bg-primary/15 font-mono text-[11px] font-bold text-primary">01</span>
              <div>
                <p className="text-[13.5px] font-bold tracking-tight text-foreground">Escolha a área e traga os dados</p>
                <p className="text-[12px] font-medium text-muted-foreground leading-relaxed mt-0.5">
                  Comece pela área que já tem número — uma planilha, um relatório, o DRE. Sem dado, não há
                  o que a IA analisar.
                </p>
              </div>
            </CardContent>
          </Card>
          <Card className="border-primary/20 bg-primary/[0.03]">
            <CardContent className="p-4 flex items-start gap-3">
              <span className="mt-0.5 grid size-7 shrink-0 place-items-center rounded-lg bg-primary/15 font-mono text-[11px] font-bold text-primary">02</span>
              <div>
                <p className="text-[13.5px] font-bold tracking-tight text-foreground">Aplique a Inteligência Empresarial</p>
                <p className="text-[12px] font-medium text-muted-foreground leading-relaxed mt-0.5">
                  Rode as quatro etapas abaixo. Cada uma transforma o que veio antes em algo utilizável.
                </p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* As 4 transformações do framework. Com vídeo, o player fica ao lado
            (2x2) — assistir e ler as etapas na mesma tela; sem vídeo, as 4
            ocupam a largura inteira, como antes. */}
        <div className={videoEmbed ? "grid gap-4 lg:grid-cols-2 lg:items-start" : ""}>
          {videoEmbed && (
            <div className="space-y-2">
              <div className="relative w-full overflow-hidden rounded-xl border border-primary/25 bg-black aspect-video">
                <iframe
                  src={videoEmbed}
                  title="O framework de 4 etapas da Inteligência Empresarial"
                  className="absolute inset-0 size-full"
                  allow="autoplay; fullscreen; picture-in-picture"
                  allowFullScreen
                  loading="lazy"
                />
              </div>
              <p className="text-[11.5px] font-medium text-muted-foreground leading-relaxed">
                <strong className="text-foreground">Assista antes do primeiro ciclo:</strong> as quatro etapas
                explicadas com exemplo real.
              </p>
            </div>
          )}
          <div className={`grid gap-3 sm:grid-cols-2 ${videoEmbed ? "" : "lg:grid-cols-4"}`}>
            {ETAPAS.map((etapa) => (
              <Card key={etapa.key}>
                <CardContent className="p-4 flex flex-col gap-2">
                  <div className="flex size-9 items-center justify-center rounded-lg bg-primary/10 ring-1 ring-primary/25">
                    <etapa.icon className="size-4.5 text-primary" />
                  </div>
                  <p className="text-[13px] font-bold tracking-tight text-foreground">
                    {etapa.titulo} <span className="text-muted-foreground/50">→</span> <span className="text-primary">{etapa.entregavel}</span>
                  </p>
                  <p className="text-[11.5px] font-medium text-muted-foreground leading-relaxed">{etapa.desc}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {loading ? (
        <div className="h-40 rounded-2xl bg-card/40 animate-pulse" />
      ) : areas.length === 0 ? (
        <div className="space-y-4">
          <VazioFase>
            Nenhuma área criada. Comece pela área com mais dor — na maioria das empresas, o Financeiro
            (análise de DRE) é o melhor primeiro ciclo.
          </VazioFase>
          <div className="flex justify-center">
            <Button
              variant="outline"
              disabled={salvando}
              className="h-10 gap-2 rounded-xl font-bold text-xs uppercase tracking-wider hover:border-primary/30 hover:bg-primary/5"
              onClick={criarAreasPadrao}
            >
              <Sparkles className="size-4" />
              {salvando ? "Criando..." : "Criar áreas padrão (Financeiro, Comercial, Operação)"}
            </Button>
          </div>
        </div>
      ) : (
        <div className="grid gap-6 lg:grid-cols-4 lg:items-start">
          {/* Áreas */}
          <div className="space-y-2">
            <p className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground px-1">Áreas</p>
            {areas.map((a) => (
              <button
                key={a.id}
                onClick={() => { setAreaSel(a); setCicloSel(null) }}
                className={`w-full flex items-center justify-between gap-2 p-3.5 rounded-xl border text-left transition-all group ${
                  areaSel?.id === a.id
                    ? "bg-primary/10 border-primary/30 text-primary"
                    : "bg-muted/20 border-transparent hover:border-border text-foreground"
                }`}
              >
                <div className="min-w-0">
                  <p className="text-[13px] font-bold tracking-tight truncate">{a.nome}</p>
                  <p className="text-[11px] font-medium text-muted-foreground">
                    {ciclos.filter((c) => c.id_area === a.id).length} ciclo(s)
                  </p>
                </div>
                <Trash2
                  className="size-3.5 text-muted-foreground/0 group-hover:text-muted-foreground/60 hover:!text-destructive shrink-0"
                  onClick={(e) => { e.stopPropagation(); setConfirmArea(a) }}
                />
              </button>
            ))}
          </div>

          {/* Ciclos + framework */}
          <div className="lg:col-span-3 space-y-4">
            {!areaSel ? (
              <VazioFase>Selecione uma área ao lado para ver os ciclos mensais.</VazioFase>
            ) : (
              <>
                <div className="flex items-center justify-between gap-3 flex-wrap">
                  <div className="flex items-center gap-2 flex-wrap">
                    {ciclosDaArea.map((c) => {
                      const prog = progressoCiclo(c)
                      return (
                        <button
                          key={c.id}
                          onClick={() => setCicloSel(c)}
                          className={`px-3 py-1.5 rounded-lg text-[11px] font-bold uppercase tracking-wider border transition-all inline-flex items-center gap-1.5 ${
                            cicloSel?.id === c.id
                              ? "bg-primary text-primary-foreground border-primary"
                              : "bg-muted/20 border-border text-muted-foreground hover:border-primary/40"
                          }`}
                        >
                          {MESES[c.mes - 1].slice(0, 3)}/{c.ano}
                          <span className={`rounded-full px-1.5 py-px text-[9px] font-bold tabular-nums ${
                            cicloSel?.id === c.id
                              ? "bg-primary-foreground/20"
                              : prog === 4 ? "bg-primary/20 text-primary" : "bg-muted/50"
                          }`}>
                            {prog}/4
                          </span>
                        </button>
                      )
                    })}
                  </div>
                  {/* Criar ciclo de qualquer mês (o DRE de junho fecha em julho) */}
                  <div className="flex items-center gap-1.5">
                    <Select value={String(novoMes)} onValueChange={(v) => setNovoMes(Number(v))}>
                      <SelectTrigger className="h-9 w-24 rounded-lg text-[11px] font-bold"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {MESES.map((m, i) => <SelectItem key={m} value={String(i + 1)}>{m.slice(0, 3)}</SelectItem>)}
                      </SelectContent>
                    </Select>
                    <Select value={String(novoAno)} onValueChange={(v) => setNovoAno(Number(v))}>
                      <SelectTrigger className="h-9 w-20 rounded-lg text-[11px] font-bold"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {[hoje.getFullYear() - 1, hoje.getFullYear(), hoje.getFullYear() + 1].map((a) => (
                          <SelectItem key={a} value={String(a)}>{a}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Button
                      variant="outline" size="sm"
                      className="h-9 gap-1.5 rounded-xl font-bold text-[11px] uppercase tracking-wider hover:border-primary/30 hover:bg-primary/5"
                      onClick={() => novoCiclo(areaSel, novoMes, novoAno)}
                    >
                      <Plus className="size-3.5" />
                      Criar ciclo
                    </Button>
                  </div>
                </div>

                {!cicloSel ? (
                  <VazioFase>
                    {ciclosDaArea.length === 0
                      ? `Crie o primeiro ciclo mensal de ${areaSel.nome}.`
                      : "Selecione um ciclo acima."}
                  </VazioFase>
                ) : (
                  <div className="space-y-4">
                    {/* Documento + IA */}
                    <Card className="border-primary/20">
                      <CardHeader className="pb-2 flex flex-row items-center justify-between">
                        <CardTitle className="text-sm font-bold flex items-center gap-2">
                          <Sparkles className="size-4 text-primary" />
                          Documento da área ({MESES[cicloSel.mes - 1]}/{cicloSel.ano})
                        </CardTitle>
                        <div className="flex items-center gap-2">
                          <span className="text-[11px] font-medium text-muted-foreground min-h-4">
                            {estadoAuto === "salvando" && "Salvando…"}
                            {estadoAuto === "salvo" && <span className="text-primary">✓ Salvo</span>}
                          </span>
                          {cicloSel.gerado_por_ia && <BadgeIA />}
                        </div>
                      </CardHeader>
                      <CardContent className="space-y-3">
                        {/* Upload do documento (extrai o texto p/ a IA) */}
                        <div className="flex items-center gap-2 flex-wrap">
                          <label className={`inline-flex items-center gap-2 h-10 px-4 rounded-xl border border-border text-xs font-bold uppercase tracking-wider transition-colors ${
                            processandoDoc ? "opacity-60 cursor-wait" : "cursor-pointer hover:border-primary/30 hover:bg-primary/5"
                          }`}>
                            <Upload className="size-4" />
                            {processandoDoc ? "Lendo documento..." : "Adicionar documento"}
                            <input
                              type="file"
                              accept={ACCEPT_DOCUMENTO}
                              className="hidden"
                              disabled={processandoDoc}
                              onChange={(e) => {
                                const f = e.target.files?.[0]
                                if (f) enviarDocumento(f)
                                e.target.value = ""
                              }}
                            />
                          </label>
                          <span className="text-[11px] font-medium text-muted-foreground">PDF, Excel, CSV ou TXT — o texto entra no campo abaixo.</span>
                        </div>
                        {docsDoCiclo.length > 0 && (
                          <div className="flex flex-wrap gap-2">
                            {docsDoCiclo.map((doc) => (
                              <div key={doc.id} className="flex items-center gap-2 pl-2.5 pr-1 py-1.5 rounded-xl bg-primary/5 border border-primary/20 max-w-full">
                                <FileDoc className="size-4 text-primary shrink-0" />
                                <span className="text-[12px] font-bold text-foreground truncate max-w-48">{doc.nome}</span>
                                {doc.url && (
                                  <Button variant="ghost" size="sm" className="size-7 p-0 rounded-lg" onClick={() => window.open(doc.url!, "_blank")}>
                                    <ExternalLink className="size-3.5" />
                                  </Button>
                                )}
                                <Button variant="ghost" size="sm" className="size-7 p-0 rounded-lg text-muted-foreground hover:text-destructive" onClick={() => removerDocumento(doc.id)}>
                                  <X className="size-3.5" />
                                </Button>
                              </div>
                            ))}
                          </div>
                        )}
                        {docErro && <p className="text-[12px] font-medium text-destructive">{docErro}</p>}
                        <Textarea
                          className="rounded-xl min-h-24 text-[13px]"
                          placeholder="Texto avulso (opcional): cole dados extras que não estão nos arquivos — a IA analisa junto com os documentos acima."
                          value={cicloSel.documento_texto ?? ""}
                          onChange={(e) => atualizaCicloLocal({ documento_texto: e.target.value })}
                        />
                        {erroIA && <p className="text-[12px] font-medium text-destructive">{erroIA}</p>}
                        <div className="flex items-center gap-2 flex-wrap">
                          <Button
                            disabled={gerandoIA || (docsDoCiclo.length === 0 && !(cicloSel.documento_texto ?? "").trim())}
                            className="h-10 gap-2 rounded-xl font-bold text-xs uppercase tracking-wider"
                            onClick={pedirGerarIA}
                          >
                            <Sparkles className="size-4" />
                            {gerandoIA
                              ? "Analisando..."
                              : docsDoCiclo.length > 1
                              ? `Analisar ${docsDoCiclo.length} documentos com IA`
                              : "Gerar 4 fluxos com IA"}
                          </Button>
                          <Button
                            variant="outline"
                            disabled={salvando}
                            className="h-10 gap-2 rounded-xl font-bold text-xs uppercase tracking-wider hover:border-primary/30 hover:bg-primary/5"
                            onClick={salvarCiclo}
                          >
                            <Save className="size-4" />
                            {salvando ? "Salvando..." : "Salvar ciclo"}
                          </Button>
                        </div>
                      </CardContent>
                    </Card>

                    {/* Framework: 4 etapas */}
                    <div className="grid gap-4 md:grid-cols-2">
                      {ETAPAS.map((etapa, i) => {
                        const status = (cicloSel as any)[`${etapa.key}_status`] as string
                        const conteudo = (cicloSel as any)[`${etapa.key}_conteudo`] as string | null
                        const destaque = etapa.key === "receita" // a Única Coisa é o clímax do ciclo
                        return (
                          <Card
                            key={etapa.key}
                            className={`${destaque ? "md:col-span-2 border-primary/40 bg-primary/[0.05] ring-1 ring-primary/15" : ""} ${status === "concluida" && !destaque ? "border-primary/30 bg-primary/5" : ""}`}
                          >
                            <CardHeader className="pb-2">
                              <div className="flex items-center justify-between gap-2">
                                <CardTitle className="text-sm font-bold flex items-center gap-2 flex-wrap">
                                  <span className="font-mono text-xs text-muted-foreground/60">{i + 1}.</span>
                                  <etapa.icon className="size-4 text-primary" />
                                  {etapa.titulo}
                                  <ChevronRight className="size-3 text-muted-foreground/40" />
                                  <span className="text-primary">{etapa.entregavel}</span>
                                  {destaque && (
                                    <span className="rounded-lg bg-primary/15 border border-primary/30 px-2 py-0.5 text-[9px] font-bold uppercase tracking-widest text-primary">
                                      A alavanca do mês
                                    </span>
                                  )}
                                </CardTitle>
                                <Select
                                  value={status}
                                  onValueChange={(v) => atualizaCicloLocal({ [`${etapa.key}_status`]: v } as any)}
                                >
                                  <SelectTrigger className="h-7 w-36 rounded-lg text-[11px] font-bold">
                                    <SelectValue />
                                  </SelectTrigger>
                                  <SelectContent>
                                    {Object.entries(STATUS_LABEL).map(([v, l]) => (
                                      <SelectItem key={v} value={v}>{l}</SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                              </div>
                              <p className="text-[11px] font-medium text-muted-foreground">{etapa.desc}</p>
                            </CardHeader>
                            <CardContent className="space-y-3">
                              {(() => {
                                const f = cicloSel.fluxos_json
                                const rich =
                                  etapa.key === "dados" ? (f?.kpis?.length ?? 0) > 0 :
                                  etapa.key === "informacao" ? (f?.insights?.length ?? 0) > 0 :
                                  etapa.key === "estrategia" ? (f?.acoes?.length ?? 0) > 0 :
                                  !!f?.unica_coisa
                                if (!rich || !f) {
                                  return (
                                    <>
                                      {conteudo && conteudo.length > 400 && (
                                        <div className="max-h-64 overflow-y-auto rounded-xl bg-muted/20 p-3">
                                          <MarkdownBox>{conteudo}</MarkdownBox>
                                        </div>
                                      )}
                                      <Textarea
                                        className={`rounded-xl text-[13px] ${conteudo && conteudo.length > 400 ? "min-h-16" : "min-h-24"}`}
                                        placeholder={`Entregável: ${etapa.entregavel}. Escreva aqui ou gere com IA acima.`}
                                        value={conteudo ?? ""}
                                        onChange={(e) => atualizaCicloLocal({ [`${etapa.key}_conteudo`]: e.target.value } as any)}
                                      />
                                    </>
                                  )
                                }
                                return (
                                  <>
                                    {etapa.key === "dados" && (
                                      <div className="grid gap-2.5 sm:grid-cols-2">
                                        {f.kpis.map((k, ki) => (
                                          <div key={ki} className="rounded-xl bg-muted/20 border border-border/60 p-3">
                                            <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground truncate">{k.nome}</p>
                                            <p className="text-xl font-bold tracking-tight text-foreground mt-0.5">{k.valor}</p>
                                            {k.variacao && (
                                              <p className={`text-[11px] font-bold mt-0.5 ${k.tendencia === "alta" ? "text-emerald-400" : k.tendencia === "queda" ? "text-rose-400" : "text-muted-foreground"}`}>
                                                {k.tendencia === "alta" ? "▲" : k.tendencia === "queda" ? "▼" : "→"} {k.variacao}
                                              </p>
                                            )}
                                            {k.comentario && <p className="text-[11px] font-medium text-muted-foreground mt-0.5 line-clamp-2">{k.comentario}</p>}
                                          </div>
                                        ))}
                                      </div>
                                    )}
                                    {etapa.key === "informacao" && (
                                      <div className="space-y-2">
                                        {f.insights.map((ins, ii) => (
                                          <div key={ii} className="flex items-start gap-2.5 rounded-xl bg-muted/20 border border-border/60 p-3">
                                            <span className={`shrink-0 rounded-md px-2 py-0.5 text-[9px] font-bold uppercase border ${
                                              ins.tipo === "critico" ? "bg-rose-500/15 text-rose-400 border-rose-500/30" :
                                              ins.tipo === "atencao" ? "bg-amber-500/15 text-amber-400 border-amber-500/30" :
                                              "bg-emerald-500/15 text-emerald-400 border-emerald-500/30"
                                            }`}>
                                              {ins.tipo === "critico" ? "Crítico" : ins.tipo === "atencao" ? "Atenção" : "Positivo"}
                                            </span>
                                            <p className="text-[13px] font-medium text-foreground leading-relaxed">{ins.texto}</p>
                                          </div>
                                        ))}
                                      </div>
                                    )}
                                    {etapa.key === "estrategia" && (
                                      <div className="space-y-1">
                                        {f.acoes.map((ac, ai) => (
                                          <button
                                            key={ai}
                                            type="button"
                                            onClick={() => toggleAcao(ai)}
                                            className="w-full flex items-start gap-2.5 rounded-xl p-2.5 text-left hover:bg-muted/30 transition-colors"
                                          >
                                            {ac.feita
                                              ? <CheckCircle2 className="size-4.5 text-primary shrink-0 mt-0.5" />
                                              : <Circle className="size-4.5 text-muted-foreground/40 shrink-0 mt-0.5" />}
                                            <span className="min-w-0">
                                              <span className={`text-[13px] font-medium leading-snug block ${ac.feita ? "line-through text-muted-foreground" : "text-foreground"}`}>{ac.texto}</span>
                                              <span className="text-[11px] font-medium text-muted-foreground">
                                                {ac.prazo_dias ? `${ac.prazo_dias} dias` : ""}{ac.prazo_dias && ac.responsavel ? " · " : ""}{ac.responsavel ?? ""}
                                              </span>
                                            </span>
                                          </button>
                                        ))}
                                        <p className="text-[11px] font-bold text-primary pl-2.5 pt-1">
                                          {f.acoes.filter((a) => a.feita).length}/{f.acoes.length} concluídas
                                        </p>
                                      </div>
                                    )}
                                    {etapa.key === "receita" && f.unica_coisa && (
                                      <div className="space-y-2.5">
                                        <p className="text-lg font-bold tracking-tight text-foreground leading-snug">{f.unica_coisa.frase}</p>
                                        {f.unica_coisa.por_que && (
                                          <p className="text-[13px] font-medium text-muted-foreground leading-relaxed">{f.unica_coisa.por_que}</p>
                                        )}
                                        <div className="flex items-center gap-2 flex-wrap">
                                          {f.unica_coisa.meta && (
                                            <span className="inline-flex items-center gap-1.5 rounded-lg bg-primary/10 border border-primary/25 px-2.5 py-1 text-[11px] font-bold text-primary">
                                              <Target className="size-3.5" /> {f.unica_coisa.meta}
                                            </span>
                                          )}
                                          {f.unica_coisa.rotina?.cadencia && (
                                            <span className="inline-flex items-center gap-1.5 rounded-lg bg-muted/30 border border-border px-2.5 py-1 text-[11px] font-bold text-muted-foreground">
                                              <RefreshCw className="size-3.5" /> {f.unica_coisa.rotina.cadencia}
                                            </span>
                                          )}
                                        </div>
                                        {(f.unica_coisa.rotina?.passos?.length ?? 0) > 0 && (
                                          <div className="space-y-1 pt-1">
                                            {f.unica_coisa.rotina!.passos.map((p, pi) => (
                                              <div key={pi} className="flex items-start gap-2">
                                                <span className="font-mono text-[11px] font-bold text-primary mt-0.5">{String(pi + 1).padStart(2, "0")}</span>
                                                <p className="text-[13px] font-medium text-foreground">{p}</p>
                                              </div>
                                            ))}
                                          </div>
                                        )}
                                      </div>
                                    )}
                                    {/* Edição manual do texto derivado */}
                                    <button
                                      type="button"
                                      onClick={() => setEditText((prev) => {
                                        const next = new Set(prev)
                                        if (next.has(etapa.key)) next.delete(etapa.key)
                                        else next.add(etapa.key)
                                        return next
                                      })}
                                      className="text-[11px] font-bold text-muted-foreground hover:text-primary inline-flex items-center gap-1"
                                    >
                                      <Edit3 className="size-3" /> {editText.has(etapa.key) ? "Fechar edição" : "Editar texto"}
                                    </button>
                                    {editText.has(etapa.key) && (
                                      <Textarea
                                        className="rounded-xl text-[13px] min-h-24"
                                        value={conteudo ?? ""}
                                        onChange={(e) => atualizaCicloLocal({ [`${etapa.key}_conteudo`]: e.target.value } as any)}
                                      />
                                    )}
                                  </>
                                )
                              })()}
                            </CardContent>
                          </Card>
                        )
                      })}
                    </div>
                    <div className="flex justify-end">
                      <Button
                        disabled={salvando}
                        className="h-10 gap-2 rounded-xl font-bold text-xs uppercase tracking-wider"
                        onClick={salvarCiclo}
                      >
                        <Save className="size-4" />
                        {salvando ? "Salvando..." : "Salvar ciclo"}
                      </Button>
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      )}


      {/* Confirmações */}
      <ConfirmDialog
        open={!!confirmArea}
        onOpenChange={(o) => !o && setConfirmArea(null)}
        title={`Excluir a área "${confirmArea?.nome}"?`}
        description="Todos os ciclos mensais dessa área serão excluídos junto. Essa ação não pode ser desfeita."
        confirmLabel="Excluir área"
        onConfirm={() => { if (confirmArea) excluirArea(confirmArea.id) }}
      />
      <ConfirmDialog
        open={confirmIA}
        onOpenChange={setConfirmIA}
        title="Sobrescrever os fluxos deste ciclo?"
        description="Este ciclo já tem conteúdo escrito. Gerar com IA vai substituir o texto das 4 etapas."
        confirmLabel="Gerar e sobrescrever"
        onConfirm={gerarFluxosIA}
      />

      <Dialog open={showNovaArea} onOpenChange={setShowNovaArea}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Nova Área</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Nome da área *</Label>
              <Input className="h-11 rounded-xl" placeholder="Ex.: Financeiro" value={novaArea.nome} onChange={(e) => setNovaArea((p) => ({ ...p, nome: e.target.value }))} />
            </div>
            <div className="space-y-2">
              <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Descrição</Label>
              <Textarea className="rounded-xl min-h-20" placeholder="Ex.: Análise mensal do DRE e fluxo de caixa" value={novaArea.descricao} onChange={(e) => setNovaArea((p) => ({ ...p, descricao: e.target.value }))} />
            </div>
          </div>
          <DialogFooter>
            <Button disabled={salvando || !novaArea.nome.trim()} className="w-full h-11 rounded-xl font-bold uppercase tracking-wider text-xs" onClick={criarArea}>
              {salvando ? "Criando..." : "Criar Área"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
