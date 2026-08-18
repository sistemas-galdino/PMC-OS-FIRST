// Logos & Clientes — a manutenção da base que sustenta a Vitrine de Cases.
//
// Duas coisas acontecem aqui:
//   1. a curadoria da logo (subir, validar) — sem logo o card cai nas iniciais;
//   2. o VÍNCULO do cliente da vitrine com o cliente real do PMC OS, que é o que
//      liga o case ao histórico do cliente. Vínculo pendente é dívida: o case
//      existe mas não sabe de quem é.
//
// Regras editoriais: PENDENTE_VALIDACAO nunca aparece na tela (tudo passa por
// exibivel/opcoesFiltro) e empresa vai sempre em caixa alta.
import { useEffect, useMemo, useRef, useState } from "react"
import { supabase } from "@/lib/supabase"
import { toast } from "sonner"
import { PageHeader } from "@/components/layout/page-header"
import { LogoCliente } from "@/components/vitrine/logo-cliente"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { Separator } from "@/components/ui/separator"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  SearchIcon as Search,
  XIcon as X,
  UploadIcon as Upload,
  CheckIcon as Check,
  CheckCircle2Icon as CheckCircle2,
  ImageIcon as ImageIco,
  Link2Icon as Link2,
  UsersIcon as Users,
  AlertCircleIcon as AlertCircle,
  ExternalLinkIcon as ExternalLink,
} from "@/components/ui/icons"
import { cn } from "@/lib/utils"
import { exibivel, nomeEmpresa, normalizar, opcoesFiltro, type VitrineCliente } from "@/lib/vitrine"

const BUCKET = "vitrine-logos"
/** Radix não aceita SelectItem com value vazio — sentinela para "todos". */
const TODOS = "__todos__"
const TIPOS_ACEITOS = ["image/png", "image/jpeg", "image/webp"]

/** Status de logo que já passaram pela validação — não precisam de novo aval. */
const LOGO_OK = ["validada", "oficial", "oficial_verificado_site"]

type ClienteReal = {
  id_cliente: string
  codigo_cliente: number | null
  nome_empresa: string | null
  nome_cliente: string | null
}

const LABEL_VINCULO: Record<string, string> = {
  vinculado: "Vinculado",
  pendente: "Vínculo pendente",
  ignorado: "Vínculo ignorado",
}

function BadgeVinculo({ status }: { status: VitrineCliente["vinculo_status"] }) {
  return (
    <Badge
      variant="outline"
      className={cn(
        "text-[10px]",
        status === "vinculado" && "border-primary/40 text-primary",
        status === "pendente" && "border-amber-500/50 text-amber-500",
        status === "ignorado" && "text-muted-foreground"
      )}
    >
      {LABEL_VINCULO[status] ?? status}
    </Badge>
  )
}

export default function VitrineClientesPage() {
  const [clientes, setClientes] = useState<VitrineCliente[]>([])
  const [loading, setLoading] = useState(true)
  const [busca, setBusca] = useState("")
  const [cs, setCs] = useState(TODOS)
  const [aba, setAba] = useState("sem-logo")

  // upload de logo
  const [arquivos, setArquivos] = useState<Record<string, File>>({})
  const [enviando, setEnviando] = useState<string | null>(null)
  const [validando, setValidando] = useState<string | null>(null)

  // dialog de vínculo
  const [vinculando, setVinculando] = useState<VitrineCliente | null>(null)
  const [buscaCliente, setBuscaCliente] = useState("")
  const [resultados, setResultados] = useState<ClienteReal[]>([])
  const [buscandoClientes, setBuscandoClientes] = useState(false)
  const [salvandoVinculo, setSalvandoVinculo] = useState(false)
  const debounce = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    let ativo = true
    async function carregar() {
      const { data, error } = await supabase.from("vitrine_clientes").select("*").order("empresa_nome")
      if (!ativo) return
      if (error) {
        toast.error("Não foi possível carregar os clientes da vitrine.")
        setClientes([])
      } else {
        setClientes((data ?? []) as VitrineCliente[])
      }
      setLoading(false)
    }
    carregar()
    return () => {
      ativo = false
    }
  }, [])

  // Busca no cadastro real do PMC OS, com debounce (a base é grande).
  useEffect(() => {
    if (!vinculando) return
    const termo = buscaCliente.trim()
    if (debounce.current) clearTimeout(debounce.current)
    if (termo.length < 2) {
      setResultados([])
      setBuscandoClientes(false)
      return
    }
    setBuscandoClientes(true)
    debounce.current = setTimeout(async () => {
      const like = `%${termo}%`
      let filtro = `nome_empresa.ilike.${like},nome_cliente.ilike.${like}`
      if (/^\d+$/.test(termo)) filtro += `,codigo_cliente.eq.${termo}`
      const { data, error } = await supabase
        .from("clientes_entrada_new")
        .select("id_cliente, codigo_cliente, nome_empresa, nome_cliente")
        .or(filtro)
        .limit(30)
      setBuscandoClientes(false)
      if (error) {
        toast.error("Falha ao buscar clientes do PMC OS.")
        setResultados([])
        return
      }
      setResultados((data ?? []) as ClienteReal[])
    }, 350)
    return () => {
      if (debounce.current) clearTimeout(debounce.current)
    }
  }, [buscaCliente, vinculando])

  const temLogo = (c: VitrineCliente) => Boolean(c.logo_display_path || c.logo_path)

  const resumo = useMemo(
    () => ({
      total: clientes.length,
      semLogo: clientes.filter((c) => !temLogo(c)).length,
      comLogo: clientes.filter(temLogo).length,
      pendentes: clientes.filter((c) => c.vinculo_status === "pendente").length,
    }),
    [clientes]
  )

  const opcoesCs = useMemo(() => opcoesFiltro(clientes.map((c) => c.cs_responsavel)), [clientes])

  const filtrados = useMemo(() => {
    const q = normalizar(busca)
    return clientes.filter((c) => {
      if (cs !== TODOS && exibivel(c.cs_responsavel) !== cs) return false
      if (!q) return true
      const alvo = normalizar(
        [c.empresa_nome, exibivel(c.cliente_nome) ?? "", exibivel(c.nicho) ?? "", c.codigo_cliente ? String(c.codigo_cliente) : ""]
          .filter(Boolean)
          .join(" ")
      )
      return alvo.includes(q)
    })
  }, [clientes, busca, cs])

  const semLogo = useMemo(() => filtrados.filter((c) => !temLogo(c)), [filtrados])
  const comLogo = useMemo(() => filtrados.filter(temLogo), [filtrados])

  const temFiltro = Boolean(busca.trim()) || cs !== TODOS

  function atualizarLocal(id: string, patch: Partial<VitrineCliente>) {
    setClientes((atual) => atual.map((c) => (c.id === id ? { ...c, ...patch } : c)))
  }

  async function salvarLogo(c: VitrineCliente) {
    const file = arquivos[c.id]
    if (!file) return
    if (!TIPOS_ACEITOS.includes(file.type)) {
      toast.error("Envie a logo em PNG, JPEG ou WEBP.")
      return
    }
    setEnviando(c.id)
    const safe = file.name.replace(/[^a-zA-Z0-9._-]/g, "_")
    // Sem "/" no início: caminho relativo é objeto no bucket (o "/" marcaria
    // arquivo estático do acervo antigo).
    const path = `clientes/${c.id}/${Date.now()}-${safe}`
    const { error: erroUpload } = await supabase.storage
      .from(BUCKET)
      .upload(path, file, { contentType: file.type, upsert: false })
    if (erroUpload) {
      setEnviando(null)
      toast.error(`Falha no upload: ${erroUpload.message}`)
      return
    }
    const { error } = await supabase
      .from("vitrine_clientes")
      .update({ logo_path: path, logo_status: "enviada_cs" })
      .eq("id", c.id)
    setEnviando(null)
    if (error) {
      toast.error("A logo subiu, mas não foi possível gravar no cliente.")
      return
    }
    atualizarLocal(c.id, { logo_path: path, logo_status: "enviada_cs" })
    setArquivos((a) => {
      const novo = { ...a }
      delete novo[c.id]
      return novo
    })
    toast.success(`Logo enviada para ${nomeEmpresa(c.empresa_nome)}.`)
  }

  async function validarLogo(c: VitrineCliente) {
    setValidando(c.id)
    const { error } = await supabase
      .from("vitrine_clientes")
      .update({ logo_status: "validada", logo_validada_em: new Date().toISOString() })
      .eq("id", c.id)
    setValidando(null)
    if (error) {
      toast.error("Não foi possível validar a logo.")
      return
    }
    atualizarLocal(c.id, { logo_status: "validada" })
    toast.success("Logo validada.")
  }

  function abrirVinculo(c: VitrineCliente) {
    setVinculando(c)
    setBuscaCliente(c.empresa_nome ?? "")
    setResultados([])
  }

  function fecharVinculo() {
    setVinculando(null)
    setBuscaCliente("")
    setResultados([])
  }

  /**
   * Grava o vínculo no cliente da vitrine E propaga para os cases dele: sem
   * isso o case fica órfão do cliente real e some dos cruzamentos.
   */
  async function vincular(alvo: ClienteReal) {
    if (!vinculando) return
    setSalvandoVinculo(true)
    const patch = {
      id_cliente: alvo.id_cliente,
      codigo_cliente: alvo.codigo_cliente,
      vinculo_metodo: "manual",
      vinculo_status: "vinculado" as const,
    }
    const { error } = await supabase.from("vitrine_clientes").update(patch).eq("id", vinculando.id)
    if (error) {
      setSalvandoVinculo(false)
      toast.error("Não foi possível vincular o cliente.")
      return
    }
    const { error: erroCases } = await supabase
      .from("vitrine_cases")
      .update({ id_cliente: alvo.id_cliente, codigo_cliente: alvo.codigo_cliente })
      .eq("vitrine_cliente_id", vinculando.id)
    setSalvandoVinculo(false)
    atualizarLocal(vinculando.id, patch)
    if (erroCases) {
      toast.warning("Cliente vinculado, mas os cases dele não foram atualizados.")
    } else {
      toast.success(`${nomeEmpresa(vinculando.empresa_nome)} vinculada ao cliente do PMC OS.`)
    }
    fecharVinculo()
  }

  async function ignorarVinculo(c: VitrineCliente) {
    const { error } = await supabase
      .from("vitrine_clientes")
      .update({ vinculo_status: "ignorado", vinculo_metodo: "manual" })
      .eq("id", c.id)
    if (error) {
      toast.error("Não foi possível marcar como ignorado.")
      return
    }
    atualizarLocal(c.id, { vinculo_status: "ignorado", vinculo_metodo: "manual" })
    toast.success("Cliente marcado como sem vínculo.")
    if (vinculando?.id === c.id) fecharVinculo()
  }

  function CardCliente({ c, modo }: { c: VitrineCliente; modo: "sem-logo" | "com-logo" }) {
    const logoOk = LOGO_OK.includes(c.logo_status)
    const nicho = exibivel(c.nicho)
    const csResp = exibivel(c.cs_responsavel)
    return (
      <Card>
        <CardContent className="flex flex-col gap-4 p-5">
          <div className="flex items-start gap-3">
            <LogoCliente
              empresa={c.empresa_nome}
              logoPath={c.logo_path}
              logoDisplayPath={c.logo_display_path}
              className="size-14 shrink-0"
              classeIniciais="text-sm"
            />
            <div className="min-w-0 flex-1">
              <p className="truncate text-xs font-bold tracking-wide text-foreground">
                {nomeEmpresa(c.empresa_nome)}
              </p>
              {exibivel(c.cliente_nome) && (
                <p className="truncate text-[11px] text-muted-foreground">{exibivel(c.cliente_nome)}</p>
              )}
              <div className="mt-2 flex flex-wrap items-center gap-1.5">
                <BadgeVinculo status={c.vinculo_status} />
                {nicho && (
                  <Badge variant="secondary" className="text-[10px]">
                    {nicho}
                  </Badge>
                )}
              </div>
            </div>
          </div>

          {csResp && (
            <p className="text-[11px] text-muted-foreground">
              CS responsável: <span className="font-semibold text-foreground">{csResp}</span>
            </p>
          )}

          {/* Vínculo com o cliente real do PMC OS */}
          {c.vinculo_status === "vinculado" && c.id_cliente ? (
            <div className="flex flex-wrap items-center gap-2 rounded-xl border border-border bg-muted/10 px-3 py-2">
              <span className="text-[11px] font-medium text-muted-foreground">
                PMC OS: <span className="font-bold text-foreground">#{c.codigo_cliente ?? "—"}</span>{" "}
                {nomeEmpresa(c.empresa_nome)}
              </span>
              <a
                href={`/cliente/${c.id_cliente}`}
                className="ml-auto inline-flex items-center gap-1 text-[11px] font-bold uppercase tracking-wider text-primary hover:underline"
              >
                Abrir
                <ExternalLink className="size-3" />
              </a>
            </div>
          ) : (
            <div className="flex flex-wrap gap-2">
              <Button
                size="sm"
                variant="outline"
                className="h-8 gap-1 rounded-lg text-[10px] font-bold uppercase tracking-wider"
                onClick={() => abrirVinculo(c)}
              >
                <Link2 className="size-3" />
                Vincular cliente
              </Button>
              {c.vinculo_status !== "ignorado" && (
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-8 rounded-lg text-[10px] font-bold uppercase tracking-wider text-muted-foreground"
                  onClick={() => ignorarVinculo(c)}
                >
                  Ignorar
                </Button>
              )}
            </div>
          )}

          <Separator />

          {modo === "sem-logo" ? (
            <div className="space-y-2">
              <Label htmlFor={`logo-${c.id}`} className="text-[11px] uppercase tracking-wider">
                Enviar logo (PNG, JPEG ou WEBP)
              </Label>
              <Input
                id={`logo-${c.id}`}
                type="file"
                accept="image/png,image/jpeg,image/webp"
                className="h-9 text-xs"
                onChange={(e) => {
                  const f = e.target.files?.[0]
                  setArquivos((a) => (f ? { ...a, [c.id]: f } : a))
                }}
              />
              <Button
                size="sm"
                className="h-8 w-full gap-1 rounded-lg text-[10px] font-bold uppercase tracking-wider"
                disabled={!arquivos[c.id] || enviando === c.id}
                onClick={() => salvarLogo(c)}
              >
                <Upload className="size-3" />
                {enviando === c.id ? "Enviando..." : "Salvar logo"}
              </Button>
            </div>
          ) : logoOk ? (
            <Button
              size="sm"
              variant="outline"
              disabled
              className="h-8 w-full gap-1 rounded-lg text-[10px] font-bold uppercase tracking-wider"
            >
              <CheckCircle2 className="size-3" />
              Logo validada
            </Button>
          ) : (
            <Button
              size="sm"
              className="h-8 w-full gap-1 rounded-lg text-[10px] font-bold uppercase tracking-wider"
              disabled={validando === c.id}
              onClick={() => validarLogo(c)}
            >
              <Check className="size-3" />
              {validando === c.id ? "Validando..." : "Validar esta logo"}
            </Button>
          )}
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-8 pb-10">
      <PageHeader
        title="Logos & Clientes"
        description="A base que sustenta a vitrine: a logo que aparece no card e o vínculo de cada empresa com o cliente real do PMC OS. Vínculo pendente significa case sem dono — resolva primeiro."
      />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[
          { label: "Total", valor: resumo.total, icon: Users },
          { label: "Sem logo", valor: resumo.semLogo, icon: ImageIco },
          { label: "Com logo", valor: resumo.comLogo, icon: CheckCircle2 },
          { label: "Vínculo pendente", valor: resumo.pendentes, icon: AlertCircle },
        ].map((c) => (
          <Card key={c.label}>
            <CardContent className="flex items-center gap-4 p-5">
              <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                <c.icon className="size-5" />
              </div>
              <div>
                <p className="text-2xl font-bold leading-none text-foreground">{loading ? "—" : c.valor}</p>
                <p className="mt-1 text-[11px] font-bold uppercase tracking-widest text-muted-foreground">{c.label}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
        <div className="relative flex-1 lg:max-w-md">
          <Search className="absolute left-3.5 top-3.5 size-4 text-muted-foreground" />
          <Input
            className="h-11 rounded-xl bg-muted/10 pl-10"
            placeholder="Buscar por empresa, pessoa, nicho ou código..."
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
          />
        </div>

        <Select value={cs} onValueChange={setCs}>
          <SelectTrigger className="h-11 w-full rounded-xl sm:w-56">
            <SelectValue placeholder="CS responsável" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={TODOS}>Todos os CS</SelectItem>
            {opcoesCs.map((o) => (
              <SelectItem key={o} value={o}>
                {o}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {temFiltro && (
          <Button
            variant="ghost"
            className="h-11 gap-1.5 rounded-xl text-[11px] font-bold uppercase tracking-wider text-muted-foreground hover:text-foreground"
            onClick={() => {
              setBusca("")
              setCs(TODOS)
            }}
          >
            <X className="size-3.5" />
            Limpar
          </Button>
        )}
      </div>

      {loading ? (
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <Skeleton key={i} className="h-64 rounded-xl" />
          ))}
        </div>
      ) : (
        <Tabs value={aba} onValueChange={setAba}>
          <TabsList>
            <TabsTrigger value="sem-logo" className="gap-2">
              Clientes sem logo
              <Badge variant="secondary" className="h-5 px-2 text-[10px]">
                {semLogo.length}
              </Badge>
            </TabsTrigger>
            <TabsTrigger value="com-logo" className="gap-2">
              Clientes com logo
              <Badge variant="secondary" className="h-5 px-2 text-[10px]">
                {comLogo.length}
              </Badge>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="sem-logo" className="mt-6">
            {semLogo.length === 0 ? (
              <p className="rounded-2xl border border-dashed border-border bg-muted/10 px-6 py-16 text-center text-sm font-bold text-foreground">
                Nenhum cliente sem logo com esses filtros.
              </p>
            ) : (
              <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4">
                {semLogo.map((c) => (
                  <CardCliente key={c.id} c={c} modo="sem-logo" />
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="com-logo" className="mt-6">
            {comLogo.length === 0 ? (
              <p className="rounded-2xl border border-dashed border-border bg-muted/10 px-6 py-16 text-center text-sm font-bold text-foreground">
                Nenhum cliente com logo com esses filtros.
              </p>
            ) : (
              <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4">
                {comLogo.map((c) => (
                  <CardCliente key={c.id} c={c} modo="com-logo" />
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>
      )}

      {/* Vínculo com o cadastro real do PMC OS */}
      <Dialog open={Boolean(vinculando)} onOpenChange={(o) => !o && fecharVinculo()}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Vincular cliente</DialogTitle>
            <DialogDescription>
              {vinculando ? `${nomeEmpresa(vinculando.empresa_nome)} — escolha o cliente correspondente no PMC OS.` : ""}
            </DialogDescription>
          </DialogHeader>

          {vinculando && exibivel(vinculando.vinculo_candidatos) && (
            <div className="rounded-xl border border-amber-500/40 bg-amber-500/5 px-3 py-2">
              <p className="text-[11px] font-bold uppercase tracking-wider text-amber-500">
                Por que ficou pendente
              </p>
              <p className="mt-1 text-[11px] leading-relaxed text-muted-foreground">
                {exibivel(vinculando.vinculo_candidatos)}
              </p>
            </div>
          )}

          <div className="space-y-3">
            <div className="relative">
              <Search className="absolute left-3.5 top-3 size-4 text-muted-foreground" />
              <Input
                className="h-10 rounded-xl pl-10"
                placeholder="Buscar por empresa, pessoa ou código..."
                value={buscaCliente}
                onChange={(e) => setBuscaCliente(e.target.value)}
              />
            </div>

            <div className="max-h-72 space-y-1 overflow-y-auto">
              {buscandoClientes && <p className="px-1 py-2 text-[11px] text-muted-foreground">Buscando...</p>}
              {!buscandoClientes && buscaCliente.trim().length < 2 && (
                <p className="px-1 py-2 text-[11px] text-muted-foreground">Digite ao menos 2 caracteres.</p>
              )}
              {!buscandoClientes && buscaCliente.trim().length >= 2 && resultados.length === 0 && (
                <p className="px-1 py-2 text-[11px] text-muted-foreground">Nenhum cliente encontrado.</p>
              )}
              {resultados.map((r) => (
                <button
                  key={r.id_cliente}
                  type="button"
                  disabled={salvandoVinculo}
                  onClick={() => vincular(r)}
                  className="w-full rounded-xl border border-transparent px-3 py-2 text-left transition-colors hover:border-primary/40 hover:bg-primary/5 disabled:opacity-50"
                >
                  <p className="text-xs font-bold tracking-wide text-foreground">
                    {nomeEmpresa(r.nome_empresa ?? r.nome_cliente ?? "Cliente")}
                  </p>
                  <p className="text-[11px] text-muted-foreground">
                    #{r.codigo_cliente ?? "—"}
                    {r.nome_cliente ? ` · ${r.nome_cliente}` : ""}
                  </p>
                </button>
              ))}
            </div>
          </div>

          <DialogFooter>
            {vinculando && vinculando.vinculo_status !== "ignorado" && (
              <Button variant="ghost" onClick={() => ignorarVinculo(vinculando)} disabled={salvandoVinculo}>
                Ignorar este cliente
              </Button>
            )}
            <Button variant="outline" onClick={fecharVinculo} disabled={salvandoVinculo}>
              Fechar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
