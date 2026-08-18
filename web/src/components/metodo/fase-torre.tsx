// Fase 5 — Torre de Comando: o hub da empresa. Repositório de todos os sistemas criados.
import { useEffect, useMemo, useState } from "react"
import { supabase } from "@/lib/supabase"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import {
  PlusIcon as Plus,
  Trash2Icon as Trash2,
  Edit3Icon as Edit3,
  ExternalLinkIcon as ExternalLink,
  Building2Icon as Building2,
  GlobeIcon as Globe,
  Share2Icon as Share2,
  UploadIcon as Upload,
  XIcon as X,
} from "@/components/ui/icons"
import { FaseHeader, VazioFase } from "./compartilhados"
import { SeletorArea, useAreasMetodo } from "./seletor-area"

const PRINT_BUCKET = "sistema-prints"

interface Sistema {
  id: string
  nome: string
  descricao: string | null
  url: string | null
  plataforma: string | null
  categoria: string | null
  id_area: string | null
  integracoes: string | null
  status: string
  print_url: string | null
}

const STATUS_LABEL: Record<string, string> = { ideia: "Ideia", em_construcao: "Em construção", ativo: "Ativo" }
const PLATAFORMAS = ["Claude", "Lovable", "Outro"]
const FORM_VAZIO = { nome: "", descricao: "", url: "", plataforma: "", categoria: "", id_area: null as string | null, integracoes: "", status: "ativo", print_url: "" }
// Categorias padronizadas (usadas nos contadores do Balanço PMC).
const CATEGORIA_OPCOES = ["Dashboard", "Site", "Sistema", "Automação", "Análise", "Outro"]

export function FaseTorre({ clientId }: { clientId: string }) {
  const areas = useAreasMetodo(clientId)
  const [sistemas, setSistemas] = useState<Sistema[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editando, setEditando] = useState<Sistema | null>(null)
  const [form, setForm] = useState(FORM_VAZIO)
  const [file, setFile] = useState<File | null>(null)
  const [uploadErro, setUploadErro] = useState<string | null>(null)
  const [salvando, setSalvando] = useState(false)

  async function fetchSistemas() {
    const { data } = await supabase
      .from("metodo_sistemas")
      .select("*")
      .eq("id_cliente", clientId)
      .order("created_at", { ascending: false })
    setSistemas(data ?? [])
    setLoading(false)
  }

  useEffect(() => { fetchSistemas() }, [clientId]) // eslint-disable-line react-hooks/exhaustive-deps

  const porCategoria = useMemo(() => {
    const g: Record<string, Sistema[]> = {}
    sistemas.forEach((s) => { (g[s.categoria || "Geral"] ??= []).push(s) })
    return g
  }, [sistemas])

  function abrirNovo() {
    setEditando(null)
    setForm(FORM_VAZIO)
    setFile(null)
    setUploadErro(null)
    setShowForm(true)
  }

  function abrirEdicao(s: Sistema) {
    setEditando(s)
    setForm({
      nome: s.nome, descricao: s.descricao ?? "", url: s.url ?? "",
      plataforma: s.plataforma ?? "", categoria: s.categoria ?? "", id_area: s.id_area,
      integracoes: s.integracoes ?? "", status: s.status,
      print_url: s.print_url ?? "",
    })
    setFile(null)
    setUploadErro(null)
    setShowForm(true)
  }

  async function uploadPrint(): Promise<string | null> {
    if (!file) return null
    const safe = file.name.replace(/[^a-zA-Z0-9._-]/g, "_")
    const path = `${clientId}/${Date.now()}-${crypto.randomUUID()}-${safe}`
    const { error } = await supabase.storage.from(PRINT_BUCKET).upload(path, file, {
      contentType: file.type || undefined,
      upsert: false,
    })
    if (error) {
      setUploadErro(`Falha no upload do print: ${error.message}. O sistema será salvo sem a imagem.`)
      return null
    }
    const { data } = supabase.storage.from(PRINT_BUCKET).getPublicUrl(path)
    return data.publicUrl
  }

  async function salvar() {
    if (!form.nome.trim()) return
    setSalvando(true)
    setUploadErro(null)
    let print_url: string | null = form.print_url || null
    if (file) {
      const uploaded = await uploadPrint()
      if (uploaded) print_url = uploaded
    }
    const payload = {
      id_cliente: clientId,
      nome: form.nome.trim(),
      descricao: form.descricao.trim() || null,
      url: form.url.trim() || null,
      plataforma: form.plataforma || null,
      categoria: form.categoria.trim() || null,
      id_area: form.id_area,
      integracoes: form.integracoes.trim() || null,
      status: form.status,
      print_url,
      updated_at: new Date().toISOString(),
    }
    const { error } = editando
      ? await supabase.from("metodo_sistemas").update(payload).eq("id", editando.id)
      : await supabase.from("metodo_sistemas").insert(payload)
    setSalvando(false)
    if (!error) {
      setShowForm(false)
      fetchSistemas()
    }
  }

  async function excluir(id: string) {
    await supabase.from("metodo_sistemas").delete().eq("id", id)
    fetchSistemas()
  }

  const ativos = sistemas.filter((s) => s.status === "ativo").length

  return (
    <div className="space-y-6">
      <FaseHeader numero={5} titulo="Torre de Comando" subtitulo="Todos os sistemas da empresa em um só lugar">
        <Button className="h-10 gap-2 rounded-xl font-bold text-xs uppercase tracking-wider" onClick={abrirNovo}>
          <Plus className="size-4" />
          Cadastrar Sistema
        </Button>
      </FaseHeader>

      <p className="text-[15px] font-medium text-muted-foreground leading-relaxed max-w-3xl">
        A Torre de Comando é o hub do dono: todos os dashboards, análises e sistemas que você criou
        (no Claude, no Lovable ou onde for) organizados em um único repositório — com clareza das
        integrações entre eles. O primeiro sistema da sua empresa de tecnologia é este aqui.
      </p>

      {sistemas.length > 0 && (
        <div className="flex items-center gap-3 flex-wrap">
          <Badge className="rounded-lg bg-primary/10 text-primary border-primary/20 px-3 py-1 text-[11px] font-bold gap-1.5">
            <Building2 className="size-3.5" />
            {ativos} sistema{ativos !== 1 ? "s" : ""} no ar
          </Badge>
          <Badge variant="outline" className="rounded-lg border-border text-muted-foreground px-3 py-1 text-[11px] font-bold">
            {sistemas.length} no repositório
          </Badge>
        </div>
      )}

      {loading ? (
        <div className="h-40 rounded-2xl bg-card/40 animate-pulse" />
      ) : sistemas.length === 0 ? (
        <VazioFase>
          Repositório vazio. Cadastre aqui cada sistema que você criar — o hub da empresa,
          os dashboards de área, os fluxos internos. Sua empresa de tecnologia começa organizada.
        </VazioFase>
      ) : (
        <div className="space-y-6">
          {Object.entries(porCategoria).map(([cat, lista]) => (
            <div key={cat}>
              <p className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground mb-3">{cat}</p>
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {lista.map((s) => (
                  <Card key={s.id} className="group">
                    <CardContent className="p-5 space-y-3">
                      {s.print_url && (
                        <img
                          src={s.print_url}
                          alt={s.nome}
                          className="w-full h-32 rounded-lg object-cover border border-border"
                        />
                      )}
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-center gap-3 min-w-0">
                          <div className="bg-primary/10 p-2 rounded-lg shrink-0">
                            <Building2 className="size-4 text-primary" />
                          </div>
                          <p className="text-sm font-bold tracking-tight text-foreground truncate">{s.nome}</p>
                        </div>
                        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                          <Button variant="ghost" size="sm" className="size-7 p-0 rounded-lg" onClick={() => abrirEdicao(s)}>
                            <Edit3 className="size-3.5" />
                          </Button>
                          <Button variant="ghost" size="sm" className="size-7 p-0 rounded-lg text-muted-foreground hover:text-destructive" onClick={() => excluir(s.id)}>
                            <Trash2 className="size-3.5" />
                          </Button>
                        </div>
                      </div>
                      {s.descricao && <p className="text-[12px] font-medium text-muted-foreground line-clamp-2">{s.descricao}</p>}
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <Badge variant="outline" className={`rounded-lg px-2 py-0 text-[10px] font-bold ${
                          s.status === "ativo" ? "border-primary/30 text-primary" : "border-border text-muted-foreground"
                        }`}>
                          {STATUS_LABEL[s.status] ?? s.status}
                        </Badge>
                        {s.plataforma && (
                          <Badge variant="outline" className="rounded-lg border-border text-muted-foreground px-2 py-0 text-[10px] font-bold uppercase">
                            {s.plataforma}
                          </Badge>
                        )}
                      </div>
                      {s.integracoes && (
                        <p className="text-[11px] font-medium text-muted-foreground flex items-center gap-1.5">
                          <Share2 className="size-3 shrink-0" />
                          <span className="truncate">{s.integracoes}</span>
                        </p>
                      )}
                      {s.url && (
                        <Button
                          variant="outline" size="sm"
                          className="w-full h-8 gap-1.5 rounded-lg text-[11px] font-bold uppercase tracking-wider hover:border-primary/30 hover:bg-primary/5"
                          onClick={() => window.open(s.url!, "_blank")}
                        >
                          <Globe className="size-3.5" />
                          Abrir sistema
                          <ExternalLink className="size-3" />
                        </Button>
                      )}
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}


      <Dialog open={showForm} onOpenChange={setShowForm}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{editando ? "Editar Sistema" : "Cadastrar Sistema"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 max-h-[60vh] overflow-y-auto pr-1">
            {/* Print do sistema */}
            <div className="space-y-2">
              <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Print do sistema</Label>
              {(() => {
                const preview = file ? URL.createObjectURL(file) : form.print_url
                return preview ? (
                  <div className="relative group/print">
                    <img src={preview} alt="Print do sistema" className="w-full max-h-56 rounded-xl object-cover border border-border" />
                    <Button
                      variant="ghost" size="sm"
                      className="absolute top-2 right-2 h-8 gap-1.5 rounded-lg bg-background/80 backdrop-blur text-xs font-bold text-muted-foreground hover:text-destructive"
                      onClick={() => { setFile(null); setForm((p) => ({ ...p, print_url: "" })) }}
                    >
                      <X className="size-3.5" />
                      Remover
                    </Button>
                    <label className="absolute bottom-2 right-2 inline-flex items-center gap-2 h-8 px-3 rounded-lg bg-background/80 backdrop-blur border border-border text-xs font-bold uppercase tracking-wider cursor-pointer hover:border-primary/30 hover:bg-primary/5 transition-colors">
                      <Upload className="size-3.5" />
                      Trocar
                      <input type="file" accept="image/*" className="hidden" onChange={(e) => { setFile(e.target.files?.[0] ?? null); setUploadErro(null) }} />
                    </label>
                  </div>
                ) : (
                  <label className="flex flex-col items-center justify-center gap-2 h-32 rounded-xl border border-dashed border-border cursor-pointer hover:border-primary/40 hover:bg-primary/5 transition-colors text-center">
                    <Upload className="size-5 text-muted-foreground" />
                    <span className="text-[12px] font-bold uppercase tracking-wider text-muted-foreground">Enviar print</span>
                    <span className="text-[11px] font-medium text-muted-foreground/70">PNG ou JPG do sistema</span>
                    <input type="file" accept="image/*" className="hidden" onChange={(e) => { setFile(e.target.files?.[0] ?? null); setUploadErro(null) }} />
                  </label>
                )
              })()}
            </div>
            {uploadErro && <p className="text-[12px] font-medium text-destructive">{uploadErro}</p>}
            <div className="space-y-2">
              <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Nome *</Label>
              <Input className="h-11 rounded-xl" placeholder="Ex.: Torre de Comando — Hub da empresa" value={form.nome} onChange={(e) => setForm((p) => ({ ...p, nome: e.target.value }))} />
            </div>
            <div className="space-y-2">
              <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Descrição</Label>
              <Textarea className="rounded-xl min-h-20" placeholder="O que este sistema faz e para quem" value={form.descricao} onChange={(e) => setForm((p) => ({ ...p, descricao: e.target.value }))} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Plataforma</Label>
                <Select value={form.plataforma} onValueChange={(v) => setForm((p) => ({ ...p, plataforma: v }))}>
                  <SelectTrigger className="h-11 rounded-xl"><SelectValue placeholder="Onde foi criado" /></SelectTrigger>
                  <SelectContent>
                    {PLATAFORMAS.map((p) => <SelectItem key={p} value={p}>{p}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Status</Label>
                <Select value={form.status} onValueChange={(v) => setForm((p) => ({ ...p, status: v }))}>
                  <SelectTrigger className="h-11 rounded-xl"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {Object.entries(STATUS_LABEL).map(([v, l]) => <SelectItem key={v} value={v}>{l}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-2">
              <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">URL</Label>
              <Input className="h-11 rounded-xl" placeholder="https://..." value={form.url} onChange={(e) => setForm((p) => ({ ...p, url: e.target.value }))} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Categoria</Label>
                <Select value={form.categoria} onValueChange={(v) => setForm((p) => ({ ...p, categoria: v }))}>
                  <SelectTrigger className="h-11 rounded-xl"><SelectValue placeholder="Tipo do sistema" /></SelectTrigger>
                  <SelectContent>
                    {CATEGORIA_OPCOES.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <SeletorArea
                areas={areas}
                value={form.id_area}
                onChange={(id) => setForm((p) => ({ ...p, id_area: id }))}
              />
              <div className="space-y-2">
                <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Integrações</Label>
                <Input className="h-11 rounded-xl" placeholder="Ex.: Supabase, Google Agenda" value={form.integracoes} onChange={(e) => setForm((p) => ({ ...p, integracoes: e.target.value }))} />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button disabled={salvando || !form.nome.trim()} className="w-full h-11 rounded-xl font-bold uppercase tracking-wider text-xs" onClick={salvar}>
              {salvando ? "Salvando..." : "Salvar Sistema"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
