// Fase 2 — Inteligência Empresarial: por área e por mês, o framework
// Dados (Dashboard) → Informação (Análise) → Estratégia (Plano de Ação) → Receita (Única Coisa/Rotina).
import { useEffect, useState } from "react"
import { supabase } from "@/lib/supabase"
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
  FileTextIcon as FileDoc,
  XIcon as X,
  ExternalLinkIcon as ExternalLink,
} from "@/components/ui/icons"
import { invokeMetodoIA, type FluxosInteligenciaIA } from "@/lib/metodo-ia"
import { extrairTextoDocumento, formatoSuportado, ACCEPT_DOCUMENTO } from "@/lib/extrair-documento"
import { FaseHeader, VazioFase, MarkdownBox, BadgeIA } from "./compartilhados"

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
  dados_status: string; dados_conteudo: string | null
  informacao_status: string; informacao_conteudo: string | null
  estrategia_status: string; estrategia_conteudo: string | null
  receita_status: string; receita_conteudo: string | null
}

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

  async function fetchTudo() {
    const [{ data: as }, { data: cs }] = await Promise.all([
      supabase.from("metodo_areas").select("id, nome, descricao").eq("id_cliente", clientId).order("created_at"),
      supabase.from("metodo_area_ciclos").select("*").eq("id_cliente", clientId).order("ano", { ascending: false }).order("mes", { ascending: false }),
    ])
    setAreas(as ?? [])
    setCiclos(cs ?? [])
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
    await supabase.from("metodo_areas").delete().eq("id", id)
    if (areaSel?.id === id) { setAreaSel(null); setCicloSel(null) }
    fetchTudo()
  }

  async function novoCiclo(area: Area) {
    const existente = ciclos.find((c) => c.id_area === area.id && c.mes === hoje.getMonth() + 1 && c.ano === hoje.getFullYear())
    if (existente) { setCicloSel(existente); return }
    const { data, error } = await supabase
      .from("metodo_area_ciclos")
      .insert({ id_area: area.id, id_cliente: clientId, mes: hoje.getMonth() + 1, ano: hoje.getFullYear() })
      .select()
      .single()
    if (!error && data) {
      setCiclos((prev) => [data, ...prev])
      setCicloSel(data)
    }
  }

  function atualizaCicloLocal(patch: Partial<Ciclo>) {
    if (!cicloSel) return
    const novo = { ...cicloSel, ...patch }
    setCicloSel(novo)
    setCiclos((prev) => prev.map((c) => (c.id === novo.id ? novo : c)))
  }

  async function salvarCiclo() {
    if (!cicloSel) return
    setSalvando(true)
    const { id, id_area, mes, ano, ...campos } = cicloSel
    await supabase.from("metodo_area_ciclos").update({ ...campos, updated_at: new Date().toISOString() }).eq("id", id)
    setSalvando(false)
  }

  // Upload do documento: extrai o texto (p/ a IA) e guarda o arquivo original.
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
      // Guarda o arquivo original (best-effort — se falhar, seguimos só com o texto).
      let documento_url: string | null = cicloSel.documento_url ?? null
      const safe = file.name.replace(/[^a-zA-Z0-9._-]/g, "_")
      const path = `${clientId}/${cicloSel.id}/${Date.now()}-${safe}`
      const { error: upErr } = await supabase.storage.from(DOC_BUCKET).upload(path, file, {
        contentType: file.type || undefined,
        upsert: false,
      })
      if (!upErr) {
        documento_url = supabase.storage.from(DOC_BUCKET).getPublicUrl(path).data.publicUrl
      }
      const patch: Partial<Ciclo> = {
        documento_texto: texto,
        documento_nome: file.name,
        documento_url,
      }
      atualizaCicloLocal(patch)
      await supabase.from("metodo_area_ciclos").update({ ...patch, updated_at: new Date().toISOString() }).eq("id", cicloSel.id)
    } catch (e: any) {
      setDocErro(e.message || "Não consegui ler o documento.")
    } finally {
      setProcessandoDoc(false)
    }
  }

  async function removerDocumento() {
    if (!cicloSel) return
    const patch: Partial<Ciclo> = { documento_nome: null, documento_url: null }
    atualizaCicloLocal(patch)
    await supabase.from("metodo_area_ciclos").update({ ...patch, updated_at: new Date().toISOString() }).eq("id", cicloSel.id)
  }

  async function gerarFluxosIA() {
    if (!cicloSel || !areaSel) return
    setGerandoIA(true)
    setErroIA(null)
    try {
      const fluxos = await invokeMetodoIA<FluxosInteligenciaIA>("inteligencia_fluxos", {
        area: areaSel.nome,
        mes: cicloSel.mes,
        ano: cicloSel.ano,
        documento: cicloSel.documento_texto || "",
      })
      const patch: Partial<Ciclo> = {
        gerado_por_ia: true,
        dados_conteudo: fluxos.dados, dados_status: "em_andamento",
        informacao_conteudo: fluxos.informacao, informacao_status: "em_andamento",
        estrategia_conteudo: fluxos.estrategia, estrategia_status: "em_andamento",
        receita_conteudo: fluxos.receita, receita_status: "em_andamento",
      }
      atualizaCicloLocal(patch)
      await supabase.from("metodo_area_ciclos").update({ ...patch, updated_at: new Date().toISOString() }).eq("id", cicloSel.id)
    } catch (e: any) {
      setErroIA(e.message || "Erro ao gerar com IA.")
    } finally {
      setGerandoIA(false)
    }
  }

  const ciclosDaArea = areaSel ? ciclos.filter((c) => c.id_area === areaSel.id) : []

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

      {loading ? (
        <div className="h-40 rounded-2xl bg-card/40 animate-pulse" />
      ) : areas.length === 0 ? (
        <VazioFase>
          Nenhuma área criada. Comece pela área com mais dor — na maioria das empresas, o Financeiro
          (análise de DRE) é o melhor primeiro ciclo.
        </VazioFase>
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
                  onClick={(e) => { e.stopPropagation(); excluirArea(a.id) }}
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
                    {ciclosDaArea.map((c) => (
                      <button
                        key={c.id}
                        onClick={() => setCicloSel(c)}
                        className={`px-3 py-1.5 rounded-lg text-[11px] font-bold uppercase tracking-wider border transition-all ${
                          cicloSel?.id === c.id
                            ? "bg-primary text-primary-foreground border-primary"
                            : "bg-muted/20 border-border text-muted-foreground hover:border-primary/40"
                        }`}
                      >
                        {MESES[c.mes - 1].slice(0, 3)}/{c.ano}
                      </button>
                    ))}
                  </div>
                  <Button
                    variant="outline" size="sm"
                    className="h-9 gap-1.5 rounded-xl font-bold text-[11px] uppercase tracking-wider hover:border-primary/30 hover:bg-primary/5"
                    onClick={() => novoCiclo(areaSel)}
                  >
                    <Plus className="size-3.5" />
                    Ciclo de {MESES[hoje.getMonth()].slice(0, 3)}/{hoje.getFullYear()}
                  </Button>
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
                        {cicloSel.gerado_por_ia && <BadgeIA />}
                      </CardHeader>
                      <CardContent className="space-y-3">
                        {/* Upload do documento (extrai o texto p/ a IA) */}
                        <div className="flex items-center gap-2 flex-wrap">
                          <label className={`inline-flex items-center gap-2 h-10 px-4 rounded-xl border border-border text-xs font-bold uppercase tracking-wider transition-colors ${
                            processandoDoc ? "opacity-60 cursor-wait" : "cursor-pointer hover:border-primary/30 hover:bg-primary/5"
                          }`}>
                            <Upload className="size-4" />
                            {processandoDoc ? "Lendo documento..." : "Enviar documento"}
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
                        {cicloSel.documento_nome && (
                          <div className="flex items-center justify-between gap-2 p-2.5 rounded-xl bg-primary/5 border border-primary/20">
                            <div className="flex items-center gap-2 min-w-0">
                              <FileDoc className="size-4 text-primary shrink-0" />
                              <span className="text-[12px] font-bold text-foreground truncate">{cicloSel.documento_nome}</span>
                            </div>
                            <div className="flex items-center gap-1 shrink-0">
                              {cicloSel.documento_url && (
                                <Button variant="ghost" size="sm" className="size-8 p-0 rounded-lg" onClick={() => window.open(cicloSel.documento_url!, "_blank")}>
                                  <ExternalLink className="size-4" />
                                </Button>
                              )}
                              <Button variant="ghost" size="sm" className="size-8 p-0 rounded-lg text-muted-foreground hover:text-destructive" onClick={removerDocumento}>
                                <X className="size-4" />
                              </Button>
                            </div>
                          </div>
                        )}
                        {docErro && <p className="text-[12px] font-medium text-destructive">{docErro}</p>}
                        <Textarea
                          className="rounded-xl min-h-28 text-[13px]"
                          placeholder="Cole o documento da área (ex.: DRE, relatório de vendas, extrato de indicadores...) ou clique em Enviar documento acima. A IA usa este texto para gerar os 4 fluxos."
                          value={cicloSel.documento_texto ?? ""}
                          onChange={(e) => atualizaCicloLocal({ documento_texto: e.target.value })}
                        />
                        {erroIA && <p className="text-[12px] font-medium text-destructive">{erroIA}</p>}
                        <div className="flex items-center gap-2 flex-wrap">
                          <Button
                            disabled={gerandoIA || !(cicloSel.documento_texto ?? "").trim()}
                            className="h-10 gap-2 rounded-xl font-bold text-xs uppercase tracking-wider"
                            onClick={gerarFluxosIA}
                          >
                            <Sparkles className="size-4" />
                            {gerandoIA ? "Gerando os 4 fluxos..." : "Gerar 4 fluxos com IA"}
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
                        return (
                          <Card key={etapa.key} className={status === "concluida" ? "border-primary/30 bg-primary/5" : ""}>
                            <CardHeader className="pb-2">
                              <div className="flex items-center justify-between gap-2">
                                <CardTitle className="text-sm font-bold flex items-center gap-2">
                                  <span className="font-mono text-xs text-muted-foreground/60">{i + 1}.</span>
                                  <etapa.icon className="size-4 text-primary" />
                                  {etapa.titulo}
                                  <ChevronRight className="size-3 text-muted-foreground/40" />
                                  <span className="text-primary">{etapa.entregavel}</span>
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
                            <CardContent>
                              {conteudo && conteudo.length > 400 ? (
                                <div className="max-h-64 overflow-y-auto rounded-xl bg-muted/20 p-3">
                                  <MarkdownBox>{conteudo}</MarkdownBox>
                                </div>
                              ) : null}
                              <Textarea
                                className={`rounded-xl text-[13px] ${conteudo && conteudo.length > 400 ? "mt-2 min-h-16" : "min-h-24"}`}
                                placeholder={`Entregável: ${etapa.entregavel}. Escreva aqui ou gere com IA acima.`}
                                value={conteudo ?? ""}
                                onChange={(e) => atualizaCicloLocal({ [`${etapa.key}_conteudo`]: e.target.value } as any)}
                              />
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
