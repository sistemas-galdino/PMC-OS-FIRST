// Evidências da Vitrine de Cases (admin/CS).
//
// Cada case precisa de prova: print do dashboard, link do sistema, trecho da
// gravação. A "captura" é o roteiro que o CS escreveu ao assistir a reunião —
// onde está o momento, o que recortar e, principalmente, O QUE OCULTAR.
//
// Regras que NÃO podem ser afrouxadas:
//  1. PENDENTE_VALIDACAO nunca aparece na tela nem em filtro (exibivel/opcoesFiltro).
//  2. Empresa sempre em caixa alta (nomeEmpresa); nome de pessoa preserva a
//     capitalização original.
//  3. Privacidade: prints de case carregam dashboard financeiro e nome dos
//     participantes da reunião. O bucket é PRIVADO — nunca getPublicUrl, só URL
//     assinada de curta duração — e o cadastro exige o aceite explícito de que
//     não há dado sensível exposto.
import { useCallback, useEffect, useMemo, useState } from "react"
import { supabase } from "@/lib/supabase"
import { toast } from "sonner"
import { PageHeader } from "@/components/layout/page-header"
import { LogoCliente } from "@/components/vitrine/logo-cliente"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Checkbox } from "@/components/ui/checkbox"
import { Skeleton } from "@/components/ui/skeleton"
import { Separator } from "@/components/ui/separator"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import {
  SearchIcon as Search,
  PlusIcon as Plus,
  Trash2Icon as Trash2,
  ExternalLinkIcon as ExternalLink,
  LinkIcon as LinkIco,
  ImageIcon as ImageIco,
  UploadIcon as Upload,
  XIcon as X,
  AlertTriangleIcon as AlertTriangle,
  CheckCircle2Icon as CheckCircle2,
  CameraIcon as Camera,
  PlayCircleIcon as PlayCircle,
  ClockIcon as Clock,
} from "@/components/ui/icons"
import { cn } from "@/lib/utils"
import {
  exibivel,
  nomeEmpresa,
  normalizar,
  opcoesFiltro,
  type VitrineCaptura,
  type VitrineEvidencia,
} from "@/lib/vitrine"

const BUCKET = "vitrine-evidencias"
/** Radix não aceita SelectItem com value vazio — sentinela para "todos". */
const TODOS = "__todos__"

const TIPOS_IMAGEM = ["image/png", "image/jpeg", "image/webp"]
const TAMANHO_MAX = 5 * 1024 * 1024

type CaseRow = {
  id: string
  case_id: string
  vitrine_cliente_id: string
  empresa_nome: string | null
  headline_impacto: string | null
  headline_vitrine: string | null
  categoria: string | null
  foco_ia: boolean
  arquivado: boolean
}

type ClienteRow = {
  id: string
  empresa_nome: string
  cliente_nome: string | null
  cs_responsavel: string | null
  logo_path: string | null
  logo_display_path: string | null
}

type Linha = {
  caso: CaseRow
  cliente: ClienteRow | null
  captura: VitrineCaptura | null
  evidencias: VitrineEvidencia[]
  empresa: string
  cs: string | null
  headline: string | null
}

const FORM_VAZIO = { url_externa: "", legenda: "", verificado: false }

export default function VitrineEvidenciasPage() {
  const [linhas, setLinhas] = useState<Linha[]>([])
  const [loading, setLoading] = useState(true)
  const [busca, setBusca] = useState("")
  const [cs, setCs] = useState(TODOS)
  const [gravacao, setGravacao] = useState(TODOS)
  const [soSemEvidencia, setSoSemEvidencia] = useState(false)

  const [alvo, setAlvo] = useState<Linha | null>(null)
  const [form, setForm] = useState(FORM_VAZIO)
  const [file, setFile] = useState<File | null>(null)
  const [erro, setErro] = useState<string | null>(null)
  const [salvando, setSalvando] = useState(false)

  const carregar = useCallback(async () => {
    const [cases, clientes, capturas, evidencias] = await Promise.all([
      supabase
        .from("vitrine_cases")
        .select(
          "id, case_id, vitrine_cliente_id, empresa_nome, headline_impacto, headline_vitrine, categoria, foco_ia, arquivado"
        )
        .eq("arquivado", false),
      supabase
        .from("vitrine_clientes")
        .select("id, empresa_nome, cliente_nome, cs_responsavel, logo_path, logo_display_path"),
      supabase.from("vitrine_capturas").select("*"),
      supabase.from("vitrine_evidencias").select("*").order("created_at", { ascending: true }),
    ])

    const erroAlgum = cases.error || clientes.error || capturas.error || evidencias.error
    if (erroAlgum) {
      toast.error("Não foi possível carregar as evidências.")
      setLinhas([])
      setLoading(false)
      return
    }

    const porCliente = new Map<string, ClienteRow>()
    for (const c of (clientes.data ?? []) as ClienteRow[]) porCliente.set(c.id, c)

    const porCaptura = new Map<string, VitrineCaptura>()
    for (const c of (capturas.data ?? []) as VitrineCaptura[]) {
      if (!porCaptura.has(c.vitrine_case_id)) porCaptura.set(c.vitrine_case_id, c)
    }

    const porEvidencia = new Map<string, VitrineEvidencia[]>()
    for (const e of (evidencias.data ?? []) as VitrineEvidencia[]) {
      const lista = porEvidencia.get(e.vitrine_case_id) ?? []
      lista.push(e)
      porEvidencia.set(e.vitrine_case_id, lista)
    }

    const montadas: Linha[] = ((cases.data ?? []) as CaseRow[]).map((caso) => {
      const cliente = porCliente.get(caso.vitrine_cliente_id) ?? null
      const captura = porCaptura.get(caso.id) ?? null
      return {
        caso,
        cliente,
        captura,
        evidencias: porEvidencia.get(caso.id) ?? [],
        empresa: exibivel(caso.empresa_nome) ?? cliente?.empresa_nome ?? "Cliente",
        cs: exibivel(captura?.cs_responsavel) ?? exibivel(cliente?.cs_responsavel) ?? null,
        headline: exibivel(caso.headline_vitrine) ?? exibivel(caso.headline_impacto),
      }
    })

    montadas.sort((a, b) => {
      // Sem evidência primeiro: é o trabalho que ainda falta.
      if ((a.evidencias.length === 0) !== (b.evidencias.length === 0)) {
        return a.evidencias.length === 0 ? -1 : 1
      }
      return a.empresa.localeCompare(b.empresa, "pt-BR")
    })

    setLinhas(montadas)
    setLoading(false)
  }, [])

  useEffect(() => {
    carregar()
  }, [carregar])

  const opcoesCs = useMemo(() => opcoesFiltro(linhas.map((l) => l.cs)), [linhas])

  const filtradas = useMemo(() => {
    const q = normalizar(busca)
    return linhas.filter((l) => {
      if (cs !== TODOS && l.cs !== cs) return false
      const temGravacao = Boolean(exibivel(l.captura?.gravacao_url))
      if (gravacao === "com" && !temGravacao) return false
      if (gravacao === "sem" && temGravacao) return false
      if (soSemEvidencia && l.evidencias.length > 0) return false
      if (!q) return true
      return normalizar([l.empresa, l.headline ?? "", l.cliente?.cliente_nome ?? ""].join(" ")).includes(q)
    })
  }, [linhas, busca, cs, gravacao, soSemEvidencia])

  const resumo = useMemo(() => {
    const comEvidencia = linhas.filter((l) => l.evidencias.length > 0).length
    return {
      cases: linhas.length,
      comEvidencia,
      semEvidencia: linhas.length - comEvidencia,
      evidencias: linhas.reduce((acc, l) => acc + l.evidencias.length, 0),
    }
  }, [linhas])

  function abrirForm(l: Linha) {
    setAlvo(l)
    setForm(FORM_VAZIO)
    setFile(null)
    setErro(null)
  }

  function escolherArquivo(f: File | null) {
    setErro(null)
    if (!f) {
      setFile(null)
      return
    }
    if (!TIPOS_IMAGEM.includes(f.type)) {
      setErro("Formato não aceito. Envie PNG, JPG ou WEBP.")
      return
    }
    if (f.size > TAMANHO_MAX) {
      setErro("Arquivo acima de 5 MB. Reduza o print antes de enviar.")
      return
    }
    setFile(f)
  }

  async function salvar() {
    if (!alvo) return
    const link = form.url_externa.trim()

    if (!link && !file) {
      setErro("Informe um link ou envie um print.")
      return
    }
    if (link && !/^https?:\/\/\S+$/i.test(link)) {
      setErro("O link precisa começar com http:// ou https://.")
      return
    }
    if (!form.verificado) {
      setErro("Confirme a conferência de dados sensíveis antes de salvar.")
      return
    }

    setSalvando(true)
    setErro(null)

    let arquivo_path: string | null = null
    if (file) {
      const safe = file.name.replace(/[^a-zA-Z0-9._-]/g, "_")
      const path = `${alvo.caso.id}/${Date.now()}-${crypto.randomUUID()}-${safe}`
      const { error } = await supabase.storage
        .from(BUCKET)
        .upload(path, file, { contentType: file.type, upsert: false })
      if (error) {
        setSalvando(false)
        setErro(`Falha no upload: ${error.message}`)
        return
      }
      arquivo_path = path
    }

    const { error } = await supabase.from("vitrine_evidencias").insert({
      vitrine_case_id: alvo.caso.id,
      tipo: arquivo_path ? "print" : "link",
      arquivo_path,
      url_externa: link || null,
      legenda: form.legenda.trim() || null,
      dados_sensiveis_verificados: true,
    })

    setSalvando(false)
    if (error) {
      toast.error("Não foi possível salvar a evidência.")
      return
    }
    toast.success("Evidência cadastrada.")
    setAlvo(null)
    carregar()
  }

  async function remover(ev: VitrineEvidencia) {
    // Ordem importa: primeiro a linha (fonte da verdade), depois o objeto.
    const { error } = await supabase.from("vitrine_evidencias").delete().eq("id", ev.id)
    if (error) {
      toast.error("Não foi possível remover a evidência.")
      return
    }
    setLinhas((prev) =>
      prev.map((l) =>
        l.caso.id === ev.vitrine_case_id
          ? { ...l, evidencias: l.evidencias.filter((e) => e.id !== ev.id) }
          : l
      )
    )
    if (ev.arquivo_path) {
      const { error: erroStorage } = await supabase.storage.from(BUCKET).remove([ev.arquivo_path])
      if (erroStorage) {
        toast.warning("Evidência removida, mas o arquivo continua no storage.")
        return
      }
    }
    toast.success("Evidência removida.")
  }

  return (
    <div className="space-y-8 pb-10">
      <PageHeader
        title="Evidências"
        description="A prova de cada case: print do painel, link do sistema ou o trecho exato da gravação. O roteiro de captura mostra onde está o momento e o que precisa ser ocultado antes de qualquer print virar material."
      />

      {/* Resumo */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Metrica label="Cases" valor={resumo.cases} icon={Camera} />
        <Metrica label="Com evidência" valor={resumo.comEvidencia} icon={CheckCircle2} destaque />
        <Metrica label="Sem evidência" valor={resumo.semEvidencia} icon={Clock} alerta />
        <Metrica label="Evidências cadastradas" valor={resumo.evidencias} icon={ImageIco} />
      </div>

      {/* Filtros */}
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
        <div className="relative flex-1 lg:max-w-md">
          <Search className="absolute left-3.5 top-3.5 size-4 text-muted-foreground" />
          <Input
            className="h-11 rounded-xl bg-muted/10 pl-10"
            placeholder="Buscar por empresa ou transformação..."
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
          />
        </div>

        <div className="flex flex-col gap-3 sm:flex-row">
          <Select value={cs} onValueChange={setCs}>
            <SelectTrigger className="h-11 w-full rounded-xl sm:w-52">
              <SelectValue placeholder="Filtrar por CS" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={TODOS}>Todos os CS</SelectItem>
              {opcoesCs.map((c) => (
                <SelectItem key={c} value={c}>
                  {c}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={gravacao} onValueChange={setGravacao}>
            <SelectTrigger className="h-11 w-full rounded-xl sm:w-48">
              <SelectValue placeholder="Gravação" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={TODOS}>Todas</SelectItem>
              <SelectItem value="com">Com gravação</SelectItem>
              <SelectItem value="sem">Sem gravação</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <label className="flex h-11 cursor-pointer items-center gap-2.5 rounded-xl border border-border bg-muted/10 px-4">
          <Checkbox
            checked={soSemEvidencia}
            onCheckedChange={(v) => setSoSemEvidencia(v === true)}
          />
          <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
            Somente sem evidência
          </span>
        </label>
      </div>

      {loading ? (
        <div className="grid gap-4 lg:grid-cols-2">
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-72 rounded-2xl" />
          ))}
        </div>
      ) : filtradas.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border bg-muted/10 p-12 text-center">
          <Camera className="mx-auto size-8 text-muted-foreground/50" />
          <p className="mt-3 text-sm font-bold text-foreground">Nenhum case com esses filtros</p>
          <p className="mt-1 text-[13px] font-medium text-muted-foreground">
            Ajuste a busca ou limpe os filtros para ver os cases do acervo.
          </p>
        </div>
      ) : (
        <div className="grid gap-4 lg:grid-cols-2">
          {filtradas.map((l) => (
            <CardCase key={l.caso.id} linha={l} onAdicionar={() => abrirForm(l)} onRemover={remover} />
          ))}
        </div>
      )}

      {/* Nova evidência */}
      <Dialog open={!!alvo} onOpenChange={(o) => { if (!o) setAlvo(null) }}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Nova evidência</DialogTitle>
          </DialogHeader>
          {alvo && (
            <div className="max-h-[65vh] space-y-4 overflow-y-auto pr-1">
              <div className="rounded-xl border border-border bg-muted/10 p-3">
                <p className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground">
                  {nomeEmpresa(alvo.empresa)}
                </p>
                {alvo.headline && (
                  <p className="mt-1 text-[13px] font-medium leading-snug text-foreground">{alvo.headline}</p>
                )}
              </div>

              {exibivel(alvo.captura?.dados_a_ocultar) && (
                <div className="flex items-start gap-2 rounded-xl border border-destructive/40 bg-destructive/5 p-3">
                  <AlertTriangle className="mt-0.5 size-4 shrink-0 text-destructive" />
                  <div>
                    <p className="text-[11px] font-bold uppercase tracking-wider text-destructive">
                      Dados a ocultar
                    </p>
                    <p className="mt-1 text-[12px] font-medium text-foreground">
                      {exibivel(alvo.captura?.dados_a_ocultar)}
                    </p>
                  </div>
                </div>
              )}

              <div className="space-y-2">
                <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                  Link externo
                </Label>
                <Input
                  className="h-11 rounded-xl"
                  placeholder="https://..."
                  value={form.url_externa}
                  onChange={(e) => setForm((p) => ({ ...p, url_externa: e.target.value }))}
                />
              </div>

              <div className="space-y-2">
                <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                  Print
                </Label>
                {file ? (
                  <div className="relative">
                    <img
                      src={URL.createObjectURL(file)}
                      alt="Print da evidência"
                      className="max-h-56 w-full rounded-xl border border-border object-contain"
                    />
                    <Button
                      variant="ghost"
                      size="sm"
                      className="absolute right-2 top-2 h-8 gap-1.5 rounded-lg bg-background/80 text-xs font-bold text-muted-foreground backdrop-blur hover:text-destructive"
                      onClick={() => setFile(null)}
                    >
                      <X className="size-3.5" /> Remover
                    </Button>
                  </div>
                ) : (
                  <label className="flex h-32 cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-border text-center transition-colors hover:border-primary/40 hover:bg-primary/5">
                    <Upload className="size-5 text-muted-foreground" />
                    <span className="text-[12px] font-bold uppercase tracking-wider text-muted-foreground">
                      Enviar print
                    </span>
                    <span className="text-[11px] font-medium text-muted-foreground/70">
                      PNG, JPG ou WEBP — até 5 MB
                    </span>
                    <input
                      type="file"
                      accept="image/png,image/jpeg,image/webp"
                      className="hidden"
                      onChange={(e) => escolherArquivo(e.target.files?.[0] ?? null)}
                    />
                  </label>
                )}
              </div>

              <div className="space-y-2">
                <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                  Legenda
                </Label>
                <Textarea
                  className="min-h-20 rounded-xl"
                  placeholder="O que essa evidência prova?"
                  value={form.legenda}
                  onChange={(e) => setForm((p) => ({ ...p, legenda: e.target.value }))}
                />
              </div>

              <label className="flex cursor-pointer items-start gap-2.5 rounded-xl border border-primary/30 bg-primary/5 p-3">
                <Checkbox
                  className="mt-0.5"
                  checked={form.verificado}
                  onCheckedChange={(v) => {
                    setForm((p) => ({ ...p, verificado: v === true }))
                    setErro(null)
                  }}
                />
                <span className="text-[12px] font-medium leading-snug text-foreground">
                  Conferi que não há dado sensível exposto{" "}
                  <span className="text-muted-foreground">
                    (faturamento, dados de cliente final, nome de participante da reunião).
                  </span>
                </span>
              </label>

              {erro && <p className="text-[12px] font-medium text-destructive">{erro}</p>}
            </div>
          )}
          <DialogFooter>
            <Button
              className="h-11 w-full rounded-xl text-xs font-bold uppercase tracking-wider"
              disabled={salvando || !form.verificado}
              onClick={salvar}
            >
              {salvando ? "Salvando..." : "Cadastrar evidência"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

function Metrica({
  label,
  valor,
  icon: Icon,
  destaque,
  alerta,
}: {
  label: string
  valor: number
  icon: React.ComponentType<{ className?: string }>
  destaque?: boolean
  alerta?: boolean
}) {
  return (
    <div className="rounded-2xl border border-border bg-card/50 p-4">
      <div className="flex items-center gap-2">
        <Icon
          className={cn(
            "size-3.5 text-muted-foreground",
            destaque && "text-primary",
            alerta && "text-amber-500"
          )}
        />
        <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">{label}</span>
      </div>
      <p className="mt-1.5 text-2xl font-bold tracking-tight text-foreground">{valor}</p>
    </div>
  )
}

function CardCase({
  linha,
  onAdicionar,
  onRemover,
}: {
  linha: Linha
  onAdicionar: () => void
  onRemover: (ev: VitrineEvidencia) => void
}) {
  const c = linha.captura
  const gravacaoUrl = exibivel(c?.gravacao_url)
  const ocultar = exibivel(c?.dados_a_ocultar)

  return (
    <div className="flex flex-col gap-4 rounded-2xl border border-border bg-card/50 p-5">
      <div className="flex items-start gap-3">
        <LogoCliente
          empresa={linha.empresa}
          logoPath={linha.cliente?.logo_path}
          logoDisplayPath={linha.cliente?.logo_display_path}
          className="size-12 shrink-0"
          classeIniciais="text-xs"
        />
        <div className="min-w-0 flex-1">
          <p className="truncate text-[13px] font-bold uppercase tracking-widest text-foreground">
            {nomeEmpresa(linha.empresa)}
          </p>
          {linha.headline && (
            <p className="mt-1 text-[13px] font-medium leading-snug text-muted-foreground">{linha.headline}</p>
          )}
          <div className="mt-2 flex flex-wrap items-center gap-1.5">
            {linha.cs && (
              <Badge variant="outline" className="rounded-lg border-border px-2 py-0 text-[10px] font-bold text-muted-foreground">
                CS {linha.cs}
              </Badge>
            )}
            {exibivel(linha.caso.categoria) && (
              <Badge variant="outline" className="rounded-lg border-primary/30 px-2 py-0 text-[10px] font-bold text-primary">
                {exibivel(linha.caso.categoria)}
              </Badge>
            )}
            <Badge
              variant="outline"
              className={cn(
                "rounded-lg px-2 py-0 text-[10px] font-bold",
                linha.evidencias.length
                  ? "border-primary/30 text-primary"
                  : "border-amber-500/40 text-amber-500"
              )}
            >
              {linha.evidencias.length
                ? `${linha.evidencias.length} evidência${linha.evidencias.length > 1 ? "s" : ""}`
                : "Sem evidência"}
            </Badge>
          </div>
        </div>
      </div>

      {/* Roteiro de captura */}
      {c && (
        <div className="space-y-2.5 rounded-xl border border-border bg-muted/10 p-3.5">
          <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
            Roteiro de captura
          </p>
          <Campo label="Reunião mencionada" valor={exibivel(c.reuniao_mencionada)} />
          <Campo label="Mentor/Consultor" valor={exibivel(c.mentor_consultor)} />
          <Campo label="O que capturar" valor={exibivel(c.o_que_capturar)} />
          <Campo label="Minuto exato" valor={exibivel(c.minuto_exato)} />
          <Campo label="Trecho para localizar" valor={exibivel(c.trecho_para_localizar)} />
          <Campo label="Legenda sugerida" valor={exibivel(c.legenda_sugerida)} />

          {ocultar && (
            <div className="flex items-start gap-2 rounded-lg border border-destructive/40 bg-destructive/5 p-2.5">
              <AlertTriangle className="mt-0.5 size-3.5 shrink-0 text-destructive" />
              <div>
                <p className="text-[10px] font-bold uppercase tracking-wider text-destructive">
                  Dados a ocultar
                </p>
                <p className="mt-0.5 text-[12px] font-medium text-foreground">{ocultar}</p>
              </div>
            </div>
          )}

          {gravacaoUrl && (
            <a
              href={gravacaoUrl}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-primary hover:underline"
            >
              <PlayCircle className="size-3.5" /> Abrir gravação
            </a>
          )}
        </div>
      )}

      <Separator />

      {/* Evidências cadastradas */}
      {linha.evidencias.length > 0 ? (
        <div className="space-y-2">
          {linha.evidencias.map((ev) => (
            <ItemEvidencia key={ev.id} ev={ev} onRemover={() => onRemover(ev)} />
          ))}
        </div>
      ) : (
        <p className="text-[12px] font-medium italic text-muted-foreground/70">
          Nenhuma evidência cadastrada ainda.
        </p>
      )}

      <Button
        variant="outline"
        className="h-10 w-full gap-2 rounded-xl text-[11px] font-bold uppercase tracking-wider hover:border-primary/40"
        onClick={onAdicionar}
      >
        <Plus className="size-4" /> Adicionar evidência
      </Button>
    </div>
  )
}

function Campo({ label, valor }: { label: string; valor: string | null }) {
  if (!valor) return null
  return (
    <div>
      <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground/70">{label}</p>
      <p className="text-[12px] font-medium leading-snug text-foreground">{valor}</p>
    </div>
  )
}

function ItemEvidencia({ ev, onRemover }: { ev: VitrineEvidencia; onRemover: () => void }) {
  const [confirmando, setConfirmando] = useState(false)

  return (
    <div className="flex items-center gap-3 rounded-xl border border-border bg-muted/10 p-2.5">
      <Thumb path={ev.arquivo_path} />
      <div className="min-w-0 flex-1">
        <p className="truncate text-[12px] font-medium text-foreground">
          {exibivel(ev.legenda) ?? (ev.url_externa ? ev.url_externa : "Print sem legenda")}
        </p>
        <div className="mt-1 flex flex-wrap items-center gap-1.5">
          <Badge variant="outline" className="rounded-lg border-border px-1.5 py-0 text-[9px] font-bold uppercase text-muted-foreground">
            {ev.tipo}
          </Badge>
          {ev.aprovada && (
            <Badge variant="outline" className="rounded-lg border-primary/30 px-1.5 py-0 text-[9px] font-bold uppercase text-primary">
              Aprovada
            </Badge>
          )}
          {!ev.dados_sensiveis_verificados && (
            <Badge variant="outline" className="rounded-lg border-destructive/40 px-1.5 py-0 text-[9px] font-bold uppercase text-destructive">
              Sem conferência
            </Badge>
          )}
        </div>
      </div>

      {ev.url_externa && (
        <a
          href={ev.url_externa}
          target="_blank"
          rel="noreferrer"
          className="text-muted-foreground transition-colors hover:text-primary"
          aria-label="Abrir link da evidência"
        >
          <ExternalLink className="size-4" />
        </a>
      )}

      {confirmando ? (
        <div className="flex items-center gap-1">
          <Button
            size="sm"
            variant="ghost"
            className="h-8 rounded-lg text-[10px] font-bold uppercase tracking-wider text-destructive"
            onClick={onRemover}
          >
            Confirmar
          </Button>
          <Button
            size="sm"
            variant="ghost"
            className="h-8 rounded-lg text-[10px] font-bold uppercase tracking-wider text-muted-foreground"
            onClick={() => setConfirmando(false)}
          >
            Cancelar
          </Button>
        </div>
      ) : (
        <Button
          size="sm"
          variant="ghost"
          className="size-8 rounded-lg p-0 text-muted-foreground hover:text-destructive"
          onClick={() => setConfirmando(true)}
          aria-label="Remover evidência"
        >
          <Trash2 className="size-3.5" />
        </Button>
      )}
    </div>
  )
}

/**
 * Miniatura do print. O bucket é privado: nada de URL pública — a URL assinada
 * (1h) é criada sob demanda, só quando o card entra na tela.
 */
function Thumb({ path }: { path: string | null }) {
  const [url, setUrl] = useState<string | null>(null)
  const [falhou, setFalhou] = useState(false)

  useEffect(() => {
    if (!path) return
    let ativo = true
    supabase.storage
      .from(BUCKET)
      .createSignedUrl(path, 3600)
      .then(({ data, error }) => {
        if (!ativo) return
        if (error || !data?.signedUrl) setFalhou(true)
        else setUrl(data.signedUrl)
      })
    return () => {
      ativo = false
    }
  }, [path])

  if (!path) {
    return (
      <div className="flex size-12 shrink-0 items-center justify-center rounded-lg border border-border bg-muted/20">
        <LinkIco className="size-4 text-muted-foreground" />
      </div>
    )
  }

  if (!url || falhou) {
    return (
      <div className="flex size-12 shrink-0 items-center justify-center rounded-lg border border-border bg-muted/20">
        <ImageIco className="size-4 text-muted-foreground" />
      </div>
    )
  }

  return (
    <img
      src={url}
      alt=""
      loading="lazy"
      onError={() => setFalhou(true)}
      className="size-12 shrink-0 rounded-lg border border-border object-cover"
    />
  )
}
