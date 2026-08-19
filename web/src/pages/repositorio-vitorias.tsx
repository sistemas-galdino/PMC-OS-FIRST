// Repositório de Vitórias (admin/CS): cura de vitórias de clientes com evidência e
// workflow de aprovação em kanban. As aprovadas podem ser marcadas como "case" — o time
// entra em contato com o cliente para gravar o vídeo do estudo de caso.
import { useEffect, useMemo, useRef, useState } from "react"
import { useNavigate } from "react-router-dom"
import { toast } from "sonner"
import { supabase } from "@/lib/supabase"
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  useDraggable,
  useDroppable,
  useSensor,
  useSensors,
} from "@dnd-kit/core"
import type { DragEndEvent, DragStartEvent } from "@dnd-kit/core"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import {
  PlusIcon as Plus,
  TrophyIcon as Trophy,
  UploadIcon as Upload,
  XIcon as X,
  CheckCircle2Icon as CheckCircle2,
  ClockIcon as Clock,
  VideoIcon as Video,
  ExternalLinkIcon as ExternalLink,
  Trash2Icon as Trash2,
  SearchIcon as Search,
  Sparkles2Icon as Sparkles,
  RefreshCwIcon as RefreshCw,
  AlertTriangleIcon as AlertTriangle,
} from "@/components/ui/icons"
import { cn } from "@/lib/utils"
import { CaseEditorForm } from "@/components/vitrine/case-editor-form"
import { gerarCaseIA } from "@/lib/vitrine-ia"
import type { VitrineCase, VitrineCliente } from "@/lib/vitrine"

const BUCKET = "repositorio-vitorias"

type Status = "aguardando" | "aprovada" | "reprovada" | "case"
type EvidTipo = "imagem" | "whatsapp" | "sistema" | "link"

interface Vitoria {
  id: string
  id_cliente: string | null
  cliente_nome: string | null
  titulo: string
  descricao: string | null
  area: string | null
  origem: string | null
  evidencia_tipo: EvidTipo
  evidencia_url: string | null
  evidencia_link: string | null
  status: Status
  motivo_reprovacao: string | null
  created_at: string
  /** Preenchido = veio do painel do cliente. É o marcador confiável da origem:
   *  o campo `origem` é texto livre e o cliente escreve o que quiser nele. */
  cliente_vitoria_id: string | null
}

interface ClienteOpt { id_cliente: string; nome: string; sc: string | null }

/** Radix não aceita SelectItem com value vazio — sentinelas dos filtros. */
const TODAS = "__todas__"
const SEM_CS = "__sem_cs__"
type FiltroOrigem = "todas" | "cliente" | "time"

/** Case da vitrine nascido de uma vitória — indexado por repositorio_vitoria_id. */
type CaseVinculado = VitrineCase & { cliente?: VitrineCliente | null }

const COLUNAS: { key: Status; label: string; icon: any; hint?: string }[] = [
  { key: "aguardando", label: "Aguardando aprovação", icon: Clock },
  { key: "aprovada", label: "Aprovadas", icon: CheckCircle2 },
  { key: "reprovada", label: "Reprovadas", icon: X },
  { key: "case", label: "Virou Case", icon: Video, hint: "Time contata o cliente para gravar o vídeo" },
]

const AREAS = ["Vendas", "Marketing", "Gestão", "Financeiro", "Produto", "Operações", "Pessoas", "Outros"]
const ORIGENS = ["Reunião com Galdino", "Reunião com Consultor", "Sucesso do Cliente", "Black CRM", "Aplicação com IA", "Outro"]
const EVID_TIPO_LABEL: Record<EvidTipo, string> = { imagem: "Imagem", whatsapp: "Print do WhatsApp", sistema: "Tela de sistema", link: "Link externo" }

const FORM_VAZIO = {
  id_cliente: "",
  titulo: "",
  descricao: "",
  area: "",
  origem: "",
  evidencia_tipo: "imagem" as EvidTipo,
  evidencia_link: "",
}

function evidenciaPreview(v: Vitoria): string | null {
  return v.evidencia_url || (v.evidencia_tipo === "link" ? null : null)
}

export default function RepositorioVitoriasPage() {
  const [vitorias, setVitorias] = useState<Vitoria[]>([])
  const [clientes, setClientes] = useState<ClienteOpt[]>([])
  const [loading, setLoading] = useState(true)
  const [busca, setBusca] = useState("")
  const [filtroOrigem, setFiltroOrigem] = useState<FiltroOrigem>("todas")
  const [filtroCs, setFiltroCs] = useState<string>(TODAS)
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState(FORM_VAZIO)
  const [file, setFile] = useState<File | null>(null)
  const [salvando, setSalvando] = useState(false)
  const [uploadErro, setUploadErro] = useState<string | null>(null)
  const [detalhe, setDetalhe] = useState<Vitoria | null>(null)
  const [motivo, setMotivo] = useState("")
  const [activeId, setActiveId] = useState<string | null>(null)
  /** Case da vitrine de cada vitória, por repositorio_vitoria_id. */
  const [cases, setCases] = useState<Map<string, CaseVinculado>>(new Map())
  const navigate = useNavigate()

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 6 } }))

  /** Só os cases nascidos aqui; os 143 do legado não interessam a esta tela. */
  async function fetchCases() {
    const [{ data: cs }, { data: clis }] = await Promise.all([
      supabase.from("vitrine_cases").select("*").not("repositorio_vitoria_id", "is", null),
      supabase.from("vitrine_clientes").select("*"),
    ])
    const porId = new Map(((clis ?? []) as VitrineCliente[]).map((c) => [c.id, c]))
    setCases(
      new Map(
        ((cs ?? []) as VitrineCase[]).map((c) => [
          c.repositorio_vitoria_id as string,
          { ...c, cliente: porId.get(c.vitrine_cliente_id) ?? null },
        ])
      )
    )
  }

  async function fetchTudo() {
    const [{ data: vs }, { data: cs }] = await Promise.all([
      supabase.from("repositorio_vitorias").select("*").order("created_at", { ascending: false }),
      supabase
        .from("clientes_entrada_new")
        .select("id_cliente, nome_cliente_formatado, nome_empresa_formatado, sc")
        .order("nome_empresa_formatado"),
    ])
    fetchCases()
    setVitorias((vs ?? []) as Vitoria[])
    setClientes(
      (cs ?? [])
        .filter((c: any) => c.id_cliente)
        .map((c: any) => ({
          id_cliente: c.id_cliente as string,
          nome: (c.nome_empresa_formatado || c.nome_cliente_formatado || "Cliente") as string,
          sc: (c.sc ?? null) as string | null,
        }))
    )
    setLoading(false)
  }

  useEffect(() => { fetchTudo() }, [])

  // Enquanto algum case estiver com a IA escrevendo, o selo do card precisa
  // apagar sozinho — inclusive se a geração foi disparada em outra máquina ou
  // se a página foi recarregada no meio.
  const gerando = useMemo(() => [...cases.values()].some((c) => c.ia_status === "gerando"), [cases])
  const timerRef = useRef<number | null>(null)
  useEffect(() => {
    if (!gerando) return
    timerRef.current = window.setInterval(fetchCases, 4000)
    return () => {
      if (timerRef.current) window.clearInterval(timerRef.current)
      timerRef.current = null
    }
  }, [gerando])

  /** id_cliente → CS responsável (clientes_entrada_new.sc). A vitória guarda o
   *  id do cliente, não a CS, então o cruzamento é aqui. */
  const csPorCliente = useMemo(
    () => new Map(clientes.map((c) => [c.id_cliente, (c.sc ?? "").trim()])),
    [clientes]
  )

  /** Opções do filtro de CS: os valores que realmente existem na carteira. */
  const opcoesCs = useMemo(() => {
    const nomes = new Set<string>()
    let temSemCs = false
    for (const v of vitorias) {
      const cs = v.id_cliente ? csPorCliente.get(v.id_cliente) : ""
      if (cs) nomes.add(cs)
      else temSemCs = true
    }
    return {
      lista: [...nomes].sort((a, b) => a.localeCompare(b, "pt-BR")),
      temSemCs,
    }
  }, [vitorias, csPorCliente])

  const filtradas = useMemo(() => {
    const q = busca.trim().toLowerCase()
    return vitorias.filter((v) => {
      if (filtroOrigem === "cliente" && !v.cliente_vitoria_id) return false
      if (filtroOrigem === "time" && v.cliente_vitoria_id) return false
      if (filtroCs !== TODAS) {
        const cs = v.id_cliente ? csPorCliente.get(v.id_cliente) ?? "" : ""
        if (filtroCs === SEM_CS ? Boolean(cs) : cs !== filtroCs) return false
      }
      if (!q) return true
      return `${v.titulo} ${v.cliente_nome ?? ""} ${v.area ?? ""}`.toLowerCase().includes(q)
    })
  }, [vitorias, busca, filtroOrigem, filtroCs, csPorCliente])

  const temFiltro = Boolean(busca.trim()) || filtroOrigem !== "todas" || filtroCs !== TODAS

  function limparFiltros() {
    setBusca("")
    setFiltroOrigem("todas")
    setFiltroCs(TODAS)
  }

  function abrirNovo() {
    setForm(FORM_VAZIO)
    setFile(null)
    setUploadErro(null)
    setShowForm(true)
  }

  async function uploadEvidencia(): Promise<string | null> {
    if (!file) return null
    const safe = file.name.replace(/[^a-zA-Z0-9._-]/g, "_")
    const path = `${form.id_cliente || "geral"}/${Date.now()}-${crypto.randomUUID()}-${safe}`
    const { error } = await supabase.storage.from(BUCKET).upload(path, file, { contentType: file.type || undefined, upsert: false })
    if (error) {
      setUploadErro(`Falha no upload: ${error.message}.`)
      return null
    }
    return supabase.storage.from(BUCKET).getPublicUrl(path).data.publicUrl
  }

  async function salvar() {
    if (!form.titulo.trim()) return
    setSalvando(true)
    setUploadErro(null)
    let evidencia_url: string | null = null
    if (file) {
      evidencia_url = await uploadEvidencia()
      if (!evidencia_url) { setSalvando(false); return }
    }
    const cliente = clientes.find((c) => c.id_cliente === form.id_cliente)
    const { data: sess } = await supabase.auth.getSession()
    const { error } = await supabase.from("repositorio_vitorias").insert({
      id_cliente: form.id_cliente || null,
      cliente_nome: cliente?.nome ?? null,
      titulo: form.titulo.trim(),
      descricao: form.descricao.trim() || null,
      area: form.area || null,
      origem: form.origem || null,
      evidencia_tipo: form.evidencia_tipo,
      evidencia_url,
      evidencia_link: form.evidencia_tipo === "link" ? (form.evidencia_link.trim() || null) : null,
      cadastrado_por: sess.session?.user?.id ?? null,
    })
    setSalvando(false)
    if (!error) {
      setShowForm(false)
      fetchTudo()
    }
  }

  async function mudarStatus(v: Vitoria, status: Status, motivoReprovacao?: string) {
    const patch: Record<string, unknown> = { status, updated_at: new Date().toISOString() }
    if (status === "reprovada") patch.motivo_reprovacao = motivoReprovacao ?? v.motivo_reprovacao ?? null
    setVitorias((prev) => prev.map((x) => (x.id === v.id ? { ...x, ...patch, status } : x)))
    setDetalhe((prev) => (prev?.id === v.id ? { ...prev, ...patch, status } as Vitoria : prev))
    const { error } = await supabase.from("repositorio_vitorias").update(patch).eq("id", v.id)
    if (error) {
      toast.error("Não foi possível mudar o status da vitória.")
      fetchTudo()
      return
    }
    await sincronizarVitrine(v, status)
  }

  /**
   * Aprovada (ou "virou case") entra na vitrine; voltar para aguardando ou
   * reprovada só tira do ar — o case e o texto já revisado ficam. Quando o case
   * nasce agora, a IA escreve os blocos editoriais em seguida.
   */
  async function sincronizarVitrine(v: Vitoria, status: Status) {
    const { data, error } = await supabase.rpc("sincronizar_vitoria_vitrine", { p_vitoria_id: v.id })
    if (error) {
      toast.error(`A vitória mudou de status, mas a vitrine não acompanhou: ${error.message}`)
      return
    }
    const linha = (Array.isArray(data) ? data[0] : data) as
      | { vitrine_case_id: string | null; criado: boolean }
      | null
    const caseId = linha?.vitrine_case_id
    if (!caseId) {
      await fetchCases()
      return
    }
    if (!linha?.criado) {
      await fetchCases()
      if (status === "aguardando" || status === "reprovada") toast.info("O case saiu da vitrine.")
      return
    }
    await fetchCases()
    toast.success("Case criado na vitrine — a IA está escrevendo o texto.")
    gerarTexto(caseId)
  }

  /** A falha da IA não desfaz o case: o texto pode ser escrito à mão depois. */
  async function gerarTexto(vitrineCaseId: string) {
    try {
      await gerarCaseIA(vitrineCaseId, { persistir: true })
      toast.success("Texto do case pronto.")
    } catch (e) {
      toast.error(`O case entrou na vitrine, mas a IA falhou: ${e instanceof Error ? e.message : e}`)
    } finally {
      fetchCases()
    }
  }

  async function excluir(id: string) {
    setDetalhe(null)
    setVitorias((prev) => prev.filter((v) => v.id !== id))
    await supabase.from("repositorio_vitorias").delete().eq("id", id)
    // O case vinculado não é apagado junto (ON DELETE SET NULL): vira um case
    // órfão, editável na aba Cases.
    fetchCases()
  }

  function handleDragEnd(e: DragEndEvent) {
    setActiveId(null)
    const { active, over } = e
    if (!over) return
    const v = vitorias.find((x) => x.id === active.id)
    const novo = over.id as Status
    if (v && v.status !== novo) mudarStatus(v, novo)
  }

  const active = activeId ? vitorias.find((v) => v.id === activeId) ?? null : null

  return (
    <div className="space-y-8 pb-10">
      <div className="flex flex-col gap-5 border-l-4 border-primary pl-8 py-2 md:flex-row md:items-start md:justify-between">
        <div className="flex flex-col gap-2 max-w-2xl">
          <h1 className="text-3xl lg:text-4xl font-bold tracking-tight text-foreground leading-tight">Repositório de Vitórias</h1>
          <p className="text-sm text-muted-foreground font-medium leading-relaxed">
            A CS cadastra as vitórias dos clientes com evidência (imagem, print do WhatsApp, tela de sistema).
            Aprove no kanban e marque as melhores como <strong className="text-foreground">Case</strong> — o time
            contata o cliente para gravar o vídeo do estudo de caso.
          </p>
        </div>
        <Button className="h-12 gap-2 rounded-xl px-6 shadow-xl shadow-primary/10 shrink-0" onClick={abrirNovo}>
          <Plus className="size-5" />
          <span className="font-bold uppercase tracking-wider text-[11px]">Nova Vitória</span>
        </Button>
      </div>

      <div className="flex flex-col gap-3 md:flex-row md:items-center">
        <div className="relative w-full md:max-w-md">
          <Search className="absolute left-3.5 top-3.5 size-4 text-muted-foreground" />
          <Input className="h-11 pl-10 rounded-xl bg-muted/10" placeholder="Buscar por cliente, título ou área..." value={busca} onChange={(e) => setBusca(e.target.value)} />
        </div>

        <Select value={filtroOrigem} onValueChange={(v) => setFiltroOrigem(v as FiltroOrigem)}>
          <SelectTrigger className="h-11 rounded-xl bg-muted/10 md:w-56">
            <SelectValue placeholder="Origem" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="todas">Todas as origens</SelectItem>
            <SelectItem value="cliente">Registradas pelo cliente</SelectItem>
            <SelectItem value="time">Registradas pelo time</SelectItem>
          </SelectContent>
        </Select>

        <Select value={filtroCs} onValueChange={setFiltroCs}>
          <SelectTrigger className="h-11 rounded-xl bg-muted/10 md:w-52">
            <SelectValue placeholder="CS responsável" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={TODAS}>Todas as CS</SelectItem>
            {opcoesCs.lista.map((cs) => (
              <SelectItem key={cs} value={cs}>{cs}</SelectItem>
            ))}
            {opcoesCs.temSemCs && <SelectItem value={SEM_CS}>Sem CS atribuída</SelectItem>}
          </SelectContent>
        </Select>

        {temFiltro && (
          <Button variant="ghost" className="h-11 gap-1.5 rounded-xl text-xs font-bold uppercase tracking-wider text-muted-foreground" onClick={limparFiltros}>
            <X className="size-3.5" /> Limpar
          </Button>
        )}
      </div>

      {temFiltro && (
        <p className="-mt-4 text-[12px] font-medium text-muted-foreground">
          Mostrando {filtradas.length} de {vitorias.length} vitórias.
        </p>
      )}

      {loading ? (
        <div className="grid gap-4 md:grid-cols-4">
          {[1, 2, 3, 4].map((i) => <div key={i} className="h-64 rounded-2xl bg-card/40 animate-pulse" />)}
        </div>
      ) : (
        <DndContext
          sensors={sensors}
          onDragStart={(e: DragStartEvent) => setActiveId(e.active.id as string)}
          onDragEnd={handleDragEnd}
          onDragCancel={() => setActiveId(null)}
        >
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            {COLUNAS.map((col) => {
              const itens = filtradas.filter((v) => v.status === col.key)
              return <Coluna key={col.key} col={col} itens={itens} cases={cases} onAbrir={setDetalhe} onRegerar={gerarTexto} />
            })}
          </div>
          <DragOverlay>
            {active ? (
              <div className="w-64 rotate-2">
                <VitoriaCardConteudo v={active} caseVinculado={cases.get(active.id) ?? null} />
              </div>
            ) : null}
          </DragOverlay>
        </DndContext>
      )}

      {/* Nova vitória */}
      <Dialog open={showForm} onOpenChange={setShowForm}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader><DialogTitle>Nova Vitória</DialogTitle></DialogHeader>
          <div className="space-y-4 max-h-[65vh] overflow-y-auto pr-1">
            <div className="space-y-2">
              <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Cliente</Label>
              <Select value={form.id_cliente} onValueChange={(v) => setForm((p) => ({ ...p, id_cliente: v }))}>
                <SelectTrigger className="h-11 rounded-xl"><SelectValue placeholder="De qual cliente é a vitória?" /></SelectTrigger>
                <SelectContent>
                  {clientes.map((c) => <SelectItem key={c.id_cliente} value={c.id_cliente}>{c.nome}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Título *</Label>
              <Input className="h-11 rounded-xl" placeholder="Ex.: Reduziu o CAC em 40% com o copiloto de anúncios" value={form.titulo} onChange={(e) => setForm((p) => ({ ...p, titulo: e.target.value }))} />
            </div>
            <div className="space-y-2">
              <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Descrição</Label>
              <Textarea className="rounded-xl min-h-20" placeholder="O que aconteceu, contexto e resultado" value={form.descricao} onChange={(e) => setForm((p) => ({ ...p, descricao: e.target.value }))} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Área</Label>
                <Select value={form.area} onValueChange={(v) => setForm((p) => ({ ...p, area: v }))}>
                  <SelectTrigger className="h-11 rounded-xl"><SelectValue placeholder="Selecione" /></SelectTrigger>
                  <SelectContent>{AREAS.map((a) => <SelectItem key={a} value={a}>{a}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Origem</Label>
                <Select value={form.origem} onValueChange={(v) => setForm((p) => ({ ...p, origem: v }))}>
                  <SelectTrigger className="h-11 rounded-xl"><SelectValue placeholder="Selecione" /></SelectTrigger>
                  <SelectContent>{ORIGENS.map((o) => <SelectItem key={o} value={o}>{o}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            </div>

            {/* Evidência */}
            <div className="space-y-2">
              <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Tipo de evidência *</Label>
              <Select value={form.evidencia_tipo} onValueChange={(v) => { setForm((p) => ({ ...p, evidencia_tipo: v as EvidTipo })); setFile(null) }}>
                <SelectTrigger className="h-11 rounded-xl"><SelectValue /></SelectTrigger>
                <SelectContent>{Object.entries(EVID_TIPO_LABEL).map(([v, l]) => <SelectItem key={v} value={v}>{l}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            {form.evidencia_tipo === "link" ? (
              <div className="space-y-2">
                <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Link da evidência</Label>
                <Input className="h-11 rounded-xl" placeholder="https://..." value={form.evidencia_link} onChange={(e) => setForm((p) => ({ ...p, evidencia_link: e.target.value }))} />
              </div>
            ) : (
              <div className="space-y-2">
                <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Imagem da evidência</Label>
                {file ? (
                  <div className="relative">
                    <img src={URL.createObjectURL(file)} alt="Evidência" className="w-full max-h-56 rounded-xl object-cover border border-border" />
                    <Button variant="ghost" size="sm" className="absolute top-2 right-2 h-8 gap-1.5 rounded-lg bg-background/80 backdrop-blur text-xs font-bold text-muted-foreground hover:text-destructive" onClick={() => setFile(null)}>
                      <X className="size-3.5" /> Remover
                    </Button>
                  </div>
                ) : (
                  <label className="flex flex-col items-center justify-center gap-2 h-32 rounded-xl border border-dashed border-border cursor-pointer hover:border-primary/40 hover:bg-primary/5 transition-colors text-center">
                    <Upload className="size-5 text-muted-foreground" />
                    <span className="text-[12px] font-bold uppercase tracking-wider text-muted-foreground">Enviar imagem</span>
                    <span className="text-[11px] font-medium text-muted-foreground/70">{EVID_TIPO_LABEL[form.evidencia_tipo]} — PNG ou JPG</span>
                    <input type="file" accept="image/*" className="hidden" onChange={(e) => { setFile(e.target.files?.[0] ?? null); setUploadErro(null) }} />
                  </label>
                )}
              </div>
            )}
            {uploadErro && <p className="text-[12px] font-medium text-destructive">{uploadErro}</p>}
          </div>
          <DialogFooter>
            <Button disabled={salvando || !form.titulo.trim()} className="w-full h-11 rounded-xl font-bold uppercase tracking-wider text-xs" onClick={salvar}>
              {salvando ? "Salvando..." : "Cadastrar Vitória"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Detalhe */}
      <Dialog open={!!detalhe} onOpenChange={(o) => { if (!o) { setDetalhe(null); setMotivo("") } }}>
        <DialogContent className={cn("max-h-[90vh] overflow-y-auto", detalhe && cases.has(detalhe.id) ? "sm:max-w-3xl" : "sm:max-w-lg")}>
          {detalhe && (
            <>
              <DialogHeader><DialogTitle className="flex items-center gap-2"><Trophy className="size-5 text-primary" />{detalhe.titulo}</DialogTitle></DialogHeader>
              <div className="space-y-4 max-h-[65vh] overflow-y-auto pr-1">
                <div className="flex items-center gap-2 flex-wrap">
                  {detalhe.cliente_nome && <Badge variant="outline" className="rounded-lg border-border text-muted-foreground px-2 py-0.5 text-[11px] font-bold">{detalhe.cliente_nome}</Badge>}
                  {detalhe.cliente_vitoria_id && <Badge variant="outline" className="rounded-lg border-primary/40 bg-primary/5 text-primary px-2 py-0.5 text-[11px] font-bold">Registrada pelo cliente</Badge>}
                  {detalhe.id_cliente && csPorCliente.get(detalhe.id_cliente) && (
                    <Badge variant="outline" className="rounded-lg border-border text-muted-foreground px-2 py-0.5 text-[11px] font-bold">CS: {csPorCliente.get(detalhe.id_cliente)}</Badge>
                  )}
                  {detalhe.area && <Badge variant="outline" className="rounded-lg border-primary/30 text-primary px-2 py-0.5 text-[11px] font-bold">{detalhe.area}</Badge>}
                  {detalhe.origem && <Badge variant="outline" className="rounded-lg border-border text-muted-foreground px-2 py-0.5 text-[11px] font-bold">{detalhe.origem}</Badge>}
                </div>
                {detalhe.descricao && <p className="text-[13px] font-medium text-muted-foreground leading-relaxed">{detalhe.descricao}</p>}

                {/* Evidência */}
                {detalhe.evidencia_url ? (
                  <img src={detalhe.evidencia_url} alt="Evidência" className="w-full rounded-xl object-contain border border-border max-h-80" />
                ) : detalhe.evidencia_link ? (
                  <Button variant="outline" className="w-full h-11 gap-2 rounded-xl font-bold text-xs uppercase tracking-wider hover:border-primary/30" onClick={() => window.open(detalhe.evidencia_link!, "_blank")}>
                    <ExternalLink className="size-4" /> Abrir evidência
                  </Button>
                ) : (
                  <p className="text-[12px] font-medium text-muted-foreground/70 italic">Sem evidência anexada.</p>
                )}

                {detalhe.status === "reprovada" && (
                  <div className="rounded-xl border border-destructive/30 bg-destructive/5 p-3">
                    <p className="text-[11px] font-bold uppercase tracking-wider text-destructive mb-1">Motivo da reprovação</p>
                    <Textarea className="rounded-xl min-h-16 text-[13px]" placeholder="Por que foi reprovada?" value={motivo || detalhe.motivo_reprovacao || ""} onChange={(e) => setMotivo(e.target.value)} onBlur={() => motivo && mudarStatus(detalhe, "reprovada", motivo)} />
                  </div>
                )}

                {/* Ações de status */}
                <div className="flex items-center gap-2 flex-wrap">
                  {detalhe.status !== "aprovada" && (
                    <Button size="sm" className="h-9 gap-2 rounded-xl font-bold text-[11px] uppercase tracking-wider" onClick={() => mudarStatus(detalhe, "aprovada")}>
                      <CheckCircle2 className="size-3.5" /> Aprovar
                    </Button>
                  )}
                  {detalhe.status !== "reprovada" && (
                    <Button variant="outline" size="sm" className="h-9 gap-2 rounded-xl font-bold text-[11px] uppercase tracking-wider hover:border-destructive/40 hover:text-destructive" onClick={() => mudarStatus(detalhe, "reprovada")}>
                      <X className="size-3.5" /> Reprovar
                    </Button>
                  )}
                  {detalhe.status === "aprovada" && (
                    <Button size="sm" className="h-9 gap-2 rounded-xl font-bold text-[11px] uppercase tracking-wider" onClick={() => mudarStatus(detalhe, "case")}>
                      <Video className="size-3.5" /> Marcar como Case
                    </Button>
                  )}
                  <Button variant="ghost" size="sm" className="h-9 gap-1.5 rounded-xl font-bold text-[11px] uppercase tracking-wider text-muted-foreground hover:text-destructive ml-auto" onClick={() => excluir(detalhe.id)}>
                    <Trash2 className="size-3.5" /> Excluir
                  </Button>
                </div>

                {detalhe.status === "case" && (
                  <div className="rounded-xl border border-primary/30 bg-primary/5 p-3 flex items-start gap-2">
                    <Video className="size-4 text-primary shrink-0 mt-0.5" />
                    <p className="text-[12px] font-medium text-foreground">
                      Selecionada para virar Case. Próximo passo: o time entra em contato com o cliente para agendar a gravação do vídeo de ~1h.
                    </p>
                  </div>
                )}

                {/* Como a vitória aparece na vitrine — mesmo editor da aba Cases */}
                {(() => {
                  const c = cases.get(detalhe.id)
                  if (!c) return null
                  return (
                    <div className="rounded-xl border border-border bg-muted/10 p-4 space-y-4">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="text-[11px] font-bold uppercase tracking-widest text-foreground">Como aparece na vitrine</p>
                        <Badge variant="outline" className="rounded-lg border-border text-muted-foreground px-2 py-0 text-[10px] font-bold">{c.case_id}</Badge>
                        {c.ia_status === "gerando" && (
                          <span className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-primary">
                            <RefreshCw className="size-3 animate-spin" /> Gerando…
                          </span>
                        )}
                        <Button
                          variant="ghost"
                          size="sm"
                          className="ml-auto h-8 gap-1.5 rounded-lg text-[11px] font-bold uppercase tracking-wider"
                          onClick={() => navigate(`/vitrine/case/${c.case_id}`)}
                        >
                          <ExternalLink className="size-3.5" /> Ver na vitrine
                        </Button>
                      </div>
                      {!c.aprovado_vitrine && (
                        <p className="text-[12px] font-medium text-muted-foreground">
                          Este case está fora da vitrine — o texto continua salvo e volta ao ar quando a vitória for aprovada de novo.
                        </p>
                      )}
                      <CaseEditorForm
                        caso={c}
                        comPreview={false}
                        onSalvo={(atualizado) => setCases((prev) => new Map(prev).set(detalhe.id, atualizado))}
                      />
                    </div>
                  )
                })()}
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}

function Coluna({ col, itens, cases, onAbrir, onRegerar }: { col: { key: Status; label: string; icon: any; hint?: string }; itens: Vitoria[]; cases: Map<string, CaseVinculado>; onAbrir: (v: Vitoria) => void; onRegerar: (vitrineCaseId: string) => void }) {
  const { setNodeRef, isOver } = useDroppable({ id: col.key })
  const Icon = col.icon
  return (
    <div ref={setNodeRef} className={cn("flex flex-col rounded-2xl border border-border bg-muted/10 transition-colors min-h-[200px]", isOver && "border-primary/50 bg-primary/5")}>
      <header className="border-b border-border/60 px-3.5 py-3">
        <div className="flex items-center gap-2">
          <Icon className="size-3.5 text-muted-foreground" />
          <h3 className="text-[11px] font-bold uppercase tracking-widest text-foreground">{col.label}</h3>
          <Badge variant="outline" className="ml-auto rounded-lg border-border text-muted-foreground px-2 py-0 text-[10px] font-bold">{itens.length}</Badge>
        </div>
        {col.hint && <p className="text-[10px] font-medium text-muted-foreground/70 mt-1">{col.hint}</p>}
      </header>
      <div className="flex flex-col gap-2.5 p-2.5">
        {itens.map((v) => (
          <VitoriaCard key={v.id} v={v} caseVinculado={cases.get(v.id) ?? null} onAbrir={onAbrir} onRegerar={onRegerar} />
        ))}
      </div>
    </div>
  )
}

function VitoriaCard({ v, caseVinculado, onAbrir, onRegerar }: { v: Vitoria; caseVinculado: CaseVinculado | null; onAbrir: (v: Vitoria) => void; onRegerar: (vitrineCaseId: string) => void }) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({ id: v.id })
  return (
    <div
      ref={setNodeRef}
      {...listeners}
      {...attributes}
      onClick={() => onAbrir(v)}
      className={cn("cursor-grab active:cursor-grabbing", isDragging && "opacity-40")}
    >
      <VitoriaCardConteudo v={v} caseVinculado={caseVinculado} onRegerar={onRegerar} />
    </div>
  )
}

function VitoriaCardConteudo({ v, caseVinculado, onRegerar }: { v: Vitoria; caseVinculado?: CaseVinculado | null; onRegerar?: (vitrineCaseId: string) => void }) {
  const preview = evidenciaPreview(v)
  const ia = caseVinculado?.ia_status
  return (
    <div className="rounded-xl border border-border bg-card p-3 shadow-sm transition-shadow hover:border-primary/40 space-y-2.5">
      <div className="relative">
        {ia === "gerando" && (
          <div className="absolute right-1.5 top-1.5 z-10 flex items-center gap-1.5 rounded-lg border border-primary/40 bg-background/90 px-2 py-1 shadow-sm backdrop-blur">
            <RefreshCw className="size-3 animate-spin text-primary" />
            <span className="text-[9px] font-bold uppercase tracking-wider text-primary animate-pulse">Gerando vitória</span>
          </div>
        )}
        {ia === "erro" && (
          <button
            type="button"
            title={caseVinculado?.ia_erro ?? "Falha ao gerar o texto do case"}
            onClick={(e) => { e.stopPropagation(); if (caseVinculado) onRegerar?.(caseVinculado.id) }}
            onPointerDown={(e) => e.stopPropagation()}
            className="absolute right-1.5 top-1.5 z-10 flex items-center gap-1.5 rounded-lg border border-destructive/40 bg-background/90 px-2 py-1 shadow-sm backdrop-blur hover:bg-destructive/10"
          >
            <AlertTriangle className="size-3 text-destructive" />
            <span className="text-[9px] font-bold uppercase tracking-wider text-destructive">Falha ao gerar</span>
          </button>
        )}
        {ia === "pronto" && (
          <div className="absolute right-1.5 top-1.5 z-10 flex items-center gap-1 rounded-lg border border-primary/30 bg-background/90 px-2 py-1 shadow-sm backdrop-blur" title="Na vitrine, com texto gerado por IA">
            <Sparkles className="size-3 text-primary" />
          </div>
        )}
        {preview ? (
          <img src={preview} alt="" className="w-full h-24 rounded-lg object-cover border border-border" />
        ) : (
          <div className="w-full h-24 rounded-lg border border-dashed border-border bg-muted/20 flex items-center justify-center">
            <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground/60">{EVID_TIPO_LABEL[v.evidencia_tipo]}</span>
          </div>
        )}
      </div>
      <p className="text-[13px] font-bold leading-snug text-foreground line-clamp-2">{v.titulo}</p>
      {v.cliente_nome && <p className="text-[11px] font-medium text-muted-foreground">{v.cliente_nome}</p>}
      <div className="flex items-center gap-1.5 flex-wrap">
        {v.cliente_vitoria_id && (
          <Badge variant="outline" className="rounded-lg border-primary/40 bg-primary/5 text-primary px-2 py-0 text-[9px] font-bold uppercase">Do cliente</Badge>
        )}
        {v.area && <Badge variant="outline" className="rounded-lg border-primary/30 text-primary px-2 py-0 text-[9px] font-bold uppercase">{v.area}</Badge>}
        {v.origem && <Badge variant="outline" className="rounded-lg border-border text-muted-foreground px-2 py-0 text-[9px] font-bold uppercase">{v.origem}</Badge>}
      </div>
    </div>
  )
}
