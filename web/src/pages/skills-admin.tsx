// Admin (dono) → cadastro de Skills. As publicadas aparecem para os clientes
// em Conhecimento → Skills (/skills), com botão de download do arquivo.
import { useEffect, useState } from "react"
import { supabase } from "@/lib/supabase"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import {
  Sparkles2Icon as Sparkles,
  PlusIcon as Plus,
  Edit3Icon as Edit3,
  Trash2Icon as Trash2,
  StarIcon as Star,
  CheckCircle2Icon as CheckCircle2,
  CircleIcon as Circle,
  DownloadIcon as Download,
} from "@/components/ui/icons"
import { ItemThumb, COR_OPTIONS, ICON_OPTIONS, type CorKey, type IconKey } from "@/components/biblioteca/biblioteca-ui"
import { CATEGORIAS } from "@/data/skills-pmc"
import { motion } from "framer-motion"

interface Row {
  id: string
  slug: string
  nome: string
  descricao: string | null
  gatilho: string | null
  categoria: string
  tags: string[]
  formato: string
  arquivo_url: string | null
  cor: string
  icon: string
  destaque: boolean
  publicado: boolean
  ordem: number
}

const FORM_VAZIO = {
  slug: "",
  nome: "",
  descricao: "",
  gatilho: "",
  categoria: "conteudo-marketing",
  tags: "",
  formato: "Skill Claude (.zip)",
  arquivo_url: "",
  cor: "lime" as string,
  icon: "sparkles" as string,
  destaque: false,
  publicado: true,
  ordem: 0,
}

function slugify(s: string): string {
  return s.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "")
}

export default function SkillsAdminPage() {
  const [itens, setItens] = useState<Row[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editando, setEditando] = useState<Row | null>(null)
  const [form, setForm] = useState(FORM_VAZIO)
  const [salvando, setSalvando] = useState(false)
  const [uploadando, setUploadando] = useState(false)

  async function fetchItens() {
    const { data } = await supabase
      .from("conhecimento_skills")
      .select("*")
      .order("ordem", { ascending: true })
      .order("created_at", { ascending: true })
    setItens((data ?? []).map((r) => ({ ...r, tags: Array.isArray(r.tags) ? r.tags : [] })))
    setLoading(false)
  }

  useEffect(() => { fetchItens() }, [])

  function abrirNovo() {
    setEditando(null)
    setForm({ ...FORM_VAZIO, ordem: itens.length + 1 })
    setShowForm(true)
  }

  function abrirEdicao(r: Row) {
    setEditando(r)
    setForm({
      slug: r.slug,
      nome: r.nome,
      descricao: r.descricao ?? "",
      gatilho: r.gatilho ?? "",
      categoria: r.categoria,
      tags: (r.tags ?? []).join(", "),
      formato: r.formato,
      arquivo_url: r.arquivo_url ?? "",
      cor: r.cor,
      icon: r.icon,
      destaque: r.destaque,
      publicado: r.publicado,
      ordem: r.ordem,
    })
    setShowForm(true)
  }

  async function onUpload(file: File) {
    setUploadando(true)
    const safe = file.name.replace(/[^a-zA-Z0-9._-]/g, "_")
    const path = `${form.slug.trim() || slugify(form.nome) || "skill"}/${Date.now()}-${safe}`
    const { error } = await supabase.storage.from("skills-arquivos").upload(path, file, { upsert: true })
    if (error) {
      alert("Falha no upload: " + error.message)
    } else {
      const { data } = supabase.storage.from("skills-arquivos").getPublicUrl(path)
      setForm((f) => ({ ...f, arquivo_url: data.publicUrl }))
    }
    setUploadando(false)
  }

  async function salvar() {
    if (!form.nome.trim()) return
    setSalvando(true)
    const payload = {
      slug: (form.slug.trim() || slugify(form.nome)),
      nome: form.nome.trim(),
      descricao: form.descricao.trim() || null,
      gatilho: form.gatilho.trim() || null,
      categoria: form.categoria,
      tags: form.tags.split(",").map((s) => s.trim()).filter(Boolean),
      formato: form.formato.trim() || "Skill Claude (.zip)",
      arquivo_url: form.arquivo_url.trim() || null,
      cor: form.cor,
      icon: form.icon,
      destaque: form.destaque,
      publicado: form.publicado,
      ordem: Number(form.ordem) || 0,
      updated_at: new Date().toISOString(),
    }
    const { error } = editando
      ? await supabase.from("conhecimento_skills").update(payload).eq("id", editando.id)
      : await supabase.from("conhecimento_skills").insert(payload)
    setSalvando(false)
    if (!error) {
      setShowForm(false)
      fetchItens()
    } else {
      alert("Erro ao salvar: " + error.message)
    }
  }

  async function excluir(id: string) {
    if (!confirm("Excluir esta skill?")) return
    await supabase.from("conhecimento_skills").delete().eq("id", id)
    fetchItens()
  }

  return (
    <div className="space-y-6 pb-10">
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="bg-primary/10 p-2.5 rounded-xl"><Sparkles className="size-5 text-primary" /></div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Skills</h1>
            <p className="text-sm text-muted-foreground font-medium">Skills do PMC para o cliente baixar e instalar no Claude.</p>
          </div>
        </div>
        <Button onClick={abrirNovo} className="h-10 gap-2 rounded-xl font-bold text-xs uppercase tracking-wider">
          <Plus className="size-4" /> Nova
        </Button>
      </div>

      {loading ? (
        <div className="h-40 rounded-2xl bg-card/40 animate-pulse" />
      ) : itens.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 gap-3 text-center border border-dashed border-border rounded-2xl">
          <Sparkles className="size-8 text-muted-foreground/30" />
          <p className="text-sm font-medium text-muted-foreground">Nenhuma skill cadastrada.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {itens.map((r) => (
            <motion.div key={r.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
              <Card>
                <CardContent className="p-4 flex items-center gap-4">
                  <div className="w-28 shrink-0 rounded-xl overflow-hidden border border-border">
                    <ItemThumb icon={r.icon as IconKey} cor={r.cor as CorKey} tipoLabel="Skill" tags={r.tags} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="text-[15px] font-bold text-foreground truncate">{r.nome}</h3>
                      {r.destaque && <Badge className="rounded-md bg-primary/15 text-primary border-primary/30 text-[10px] gap-1"><Star className="size-3" />Destaque</Badge>}
                      <Badge variant="outline" className="rounded-md text-[10px] text-muted-foreground border-border">
                        {r.publicado ? <span className="flex items-center gap-1 text-primary"><CheckCircle2 className="size-3" />Publicado</span> : <span className="flex items-center gap-1"><Circle className="size-3" />Rascunho</span>}
                      </Badge>
                      {r.arquivo_url && <Badge variant="outline" className="rounded-md text-[10px] text-primary border-primary/30 gap-1"><Download className="size-3" />Arquivo</Badge>}
                    </div>
                    <p className="text-[13px] text-muted-foreground font-medium line-clamp-1 mt-1">{r.descricao}</p>
                    <div className="flex items-center gap-2 mt-1.5 text-[11px] text-muted-foreground font-medium">
                      <span>#{r.ordem}</span>·<span>{CATEGORIAS.find((c) => c.slug === r.categoria)?.label ?? r.categoria}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0">
                    <Button variant="ghost" size="icon" className="size-9 rounded-lg" onClick={() => abrirEdicao(r)}><Edit3 className="size-4" /></Button>
                    <Button variant="ghost" size="icon" className="size-9 rounded-lg text-rose-400 hover:text-rose-300" onClick={() => excluir(r.id)}><Trash2 className="size-4" /></Button>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>
      )}

      <Dialog open={showForm} onOpenChange={setShowForm}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editando ? "Editar skill" : "Nova skill"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <Campo label="Nome">
              <Input value={form.nome} onChange={(e) => setForm((f) => ({ ...f, nome: e.target.value }))} placeholder="Analista Financeiro Empresarial" />
            </Campo>
            <div className="grid grid-cols-2 gap-3">
              <Campo label="Slug (vazio = gerar do nome)">
                <Input value={form.slug} onChange={(e) => setForm((f) => ({ ...f, slug: e.target.value }))} placeholder="analista-financeiro" />
              </Campo>
              <Campo label="Ordem">
                <Input type="number" value={form.ordem} onChange={(e) => setForm((f) => ({ ...f, ordem: Number(e.target.value) }))} />
              </Campo>
            </div>
            <Campo label="Descrição (card)">
              <Textarea value={form.descricao} onChange={(e) => setForm((f) => ({ ...f, descricao: e.target.value }))} className="min-h-[70px]" />
            </Campo>
            <Campo label="Quando usar (gatilho)">
              <Textarea value={form.gatilho} onChange={(e) => setForm((f) => ({ ...f, gatilho: e.target.value }))} className="min-h-[60px]" />
            </Campo>
            <div className="grid grid-cols-2 gap-3">
              <Campo label="Categoria">
                <Select value={form.categoria} onValueChange={(v) => setForm((f) => ({ ...f, categoria: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{CATEGORIAS.map((c) => <SelectItem key={c.slug} value={c.slug}>{c.label}</SelectItem>)}</SelectContent>
                </Select>
              </Campo>
              <Campo label="Formato">
                <Input value={form.formato} onChange={(e) => setForm((f) => ({ ...f, formato: e.target.value }))} />
              </Campo>
            </div>
            <Campo label="Tags (separadas por vírgula)">
              <Input value={form.tags} onChange={(e) => setForm((f) => ({ ...f, tags: e.target.value }))} placeholder="Financeiro, Gestão" />
            </Campo>
            <div className="grid grid-cols-2 gap-3">
              <Campo label="Cor">
                <Select value={form.cor} onValueChange={(v) => setForm((f) => ({ ...f, cor: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{COR_OPTIONS.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
                </Select>
              </Campo>
              <Campo label="Ícone">
                <Select value={form.icon} onValueChange={(v) => setForm((f) => ({ ...f, icon: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{ICON_OPTIONS.map((i) => <SelectItem key={i} value={i}>{i}</SelectItem>)}</SelectContent>
                </Select>
              </Campo>
            </div>
            <Campo label="Arquivo da skill (.zip)">
              <div className="flex items-center gap-2">
                <Input value={form.arquivo_url} onChange={(e) => setForm((f) => ({ ...f, arquivo_url: e.target.value }))} placeholder="Cole a URL ou faça upload →" />
                <label className="shrink-0">
                  <input type="file" className="hidden" onChange={(e) => e.target.files?.[0] && onUpload(e.target.files[0])} />
                  <span className="inline-flex items-center gap-1.5 h-10 px-3 rounded-xl border border-border bg-muted/20 text-xs font-bold cursor-pointer hover:bg-muted/40">
                    <Download className="size-4 rotate-180" /> {uploadando ? "Enviando..." : "Upload"}
                  </span>
                </label>
              </div>
            </Campo>
            {/* Preview */}
            <div className="rounded-xl overflow-hidden border border-border max-w-[220px]">
              <ItemThumb icon={form.icon as IconKey} cor={form.cor as CorKey} tipoLabel="Skill" tags={form.tags.split(",").map((s) => s.trim()).filter(Boolean)} />
            </div>
            <div className="flex items-center gap-6">
              <Toggle label="Publicado" checked={form.publicado} onChange={(v) => setForm((f) => ({ ...f, publicado: v }))} />
              <Toggle label="Destaque" checked={form.destaque} onChange={(v) => setForm((f) => ({ ...f, destaque: v }))} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowForm(false)}>Cancelar</Button>
            <Button onClick={salvar} disabled={salvando || !form.nome.trim()}>{salvando ? "Salvando..." : "Salvar"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

function Campo({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">{label}</Label>
      {children}
    </div>
  )
}

function Toggle({ label, checked, onChange }: { label: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <button type="button" onClick={() => onChange(!checked)} className="flex items-center gap-2 text-sm font-bold">
      <span className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${checked ? "bg-primary" : "bg-muted"}`}>
        <span className={`inline-block size-4 rounded-full bg-background transition-transform ${checked ? "translate-x-6" : "translate-x-1"}`} />
      </span>
      {label}
    </button>
  )
}
