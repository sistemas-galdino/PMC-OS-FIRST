// Admin (dono) → cadastro de Novidades da comunidade. As notícias publicadas
// aparecem para os clientes em Comunidade → Novidades (/novidades).
import { useEffect, useState } from "react"
import { supabase } from "@/lib/supabase"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent } from "@/components/ui/card"
import { DatePicker } from "@/components/ui/date-picker"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { CATEGORIAS, categoria as catInfo } from "@/data/novidades-categorias"
import {
  MegaphoneIcon as Megaphone,
  PlusIcon as Plus,
  Edit3Icon as Edit3,
  Trash2Icon as Trash2,
  StarIcon as Star,
  CalendarIcon as Calendar,
  CheckCircle2Icon as CheckCircle2,
  CircleIcon as Circle,
} from "@/components/ui/icons"
import { motion } from "framer-motion"

interface Novidade {
  id: string
  titulo: string
  resumo: string | null
  conteudo: string | null
  data_publicacao: string
  destaque: boolean
  publicado: boolean
  autor: string | null
  categoria: string
  imagem_url: string | null
}

function hojeIso() {
  return new Date().toISOString().slice(0, 10)
}

const FORM_VAZIO = {
  titulo: "",
  resumo: "",
  conteudo: "",
  data_publicacao: hojeIso(),
  destaque: false,
  publicado: true,
  autor: "",
  categoria: "avisos",
  imagem_url: "",
}

function formatarData(iso: string): string {
  return new Date(iso + "T00:00:00").toLocaleDateString("pt-BR", { day: "2-digit", month: "long", year: "numeric" })
}

export default function NovidadesAdminPage() {
  const [novidades, setNovidades] = useState<Novidade[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editando, setEditando] = useState<Novidade | null>(null)
  const [form, setForm] = useState(FORM_VAZIO)
  const [salvando, setSalvando] = useState(false)
  const [uploadandoImg, setUploadandoImg] = useState(false)

  async function fetchNovidades() {
    const { data } = await supabase
      .from("comunidade_novidades")
      .select("*")
      .order("data_publicacao", { ascending: false })
      .order("created_at", { ascending: false })
    setNovidades(data ?? [])
    setLoading(false)
  }

  useEffect(() => { fetchNovidades() }, [])

  function abrirNova() {
    setEditando(null)
    setForm({ ...FORM_VAZIO, data_publicacao: hojeIso() })
    setShowForm(true)
  }

  function abrirEdicao(n: Novidade) {
    setEditando(n)
    setForm({
      titulo: n.titulo,
      resumo: n.resumo ?? "",
      conteudo: n.conteudo ?? "",
      data_publicacao: n.data_publicacao,
      destaque: n.destaque,
      publicado: n.publicado,
      autor: n.autor ?? "",
      categoria: n.categoria ?? "avisos",
      imagem_url: n.imagem_url ?? "",
    })
    setShowForm(true)
  }

  // Upload da imagem de capa para o bucket público novidades-imagens.
  async function onUploadImagem(file: File) {
    setUploadandoImg(true)
    const safe = file.name.replace(/[^a-zA-Z0-9._-]/g, "_")
    const path = `${Date.now()}-${safe}`
    const { error } = await supabase.storage.from("novidades-imagens").upload(path, file, {
      contentType: file.type || undefined,
      upsert: false,
    })
    if (error) {
      alert("Falha no upload: " + error.message)
    } else {
      const { data } = supabase.storage.from("novidades-imagens").getPublicUrl(path)
      setForm((f) => ({ ...f, imagem_url: data.publicUrl }))
    }
    setUploadandoImg(false)
  }

  async function salvar() {
    if (!form.titulo.trim()) return
    setSalvando(true)
    const payload = {
      titulo: form.titulo.trim(),
      resumo: form.resumo.trim() || null,
      conteudo: form.conteudo.trim() || null,
      data_publicacao: form.data_publicacao || hojeIso(),
      destaque: form.destaque,
      publicado: form.publicado,
      autor: form.autor.trim() || null,
      categoria: form.categoria,
      imagem_url: form.imagem_url.trim() || null,
      updated_at: new Date().toISOString(),
    }
    const { error } = editando
      ? await supabase.from("comunidade_novidades").update(payload).eq("id", editando.id)
      : await supabase.from("comunidade_novidades").insert(payload)
    setSalvando(false)
    if (!error) {
      setShowForm(false)
      fetchNovidades()
    }
  }

  async function excluir(id: string) {
    if (!confirm("Excluir esta novidade?")) return
    await supabase.from("comunidade_novidades").delete().eq("id", id)
    fetchNovidades()
  }

  async function alternarPublicado(n: Novidade) {
    await supabase
      .from("comunidade_novidades")
      .update({ publicado: !n.publicado, updated_at: new Date().toISOString() })
      .eq("id", n.id)
    setNovidades((prev) => prev.map((x) => (x.id === n.id ? { ...x, publicado: !x.publicado } : x)))
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="space-y-8 pb-10"
    >
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div className="flex items-start gap-4">
          <div className="bg-primary/10 p-3 rounded-2xl shrink-0">
            <Megaphone className="size-6 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-foreground">Novidades da Comunidade</h1>
            <p className="text-sm font-medium text-muted-foreground">
              Cadastre os anúncios que aparecem para os clientes em Comunidade → Novidades.
            </p>
          </div>
        </div>
        <Button className="h-11 gap-2 rounded-xl font-bold uppercase tracking-wider text-xs" onClick={abrirNova}>
          <Plus className="size-4" />
          Nova Novidade
        </Button>
      </div>

      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => <div key={i} className="h-24 rounded-2xl bg-card/40 animate-pulse" />)}
        </div>
      ) : novidades.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 gap-3 text-center border border-dashed border-border rounded-2xl">
          <Megaphone className="size-8 text-muted-foreground/30" />
          <p className="text-sm font-medium text-muted-foreground">Nenhuma novidade cadastrada. Crie a primeira!</p>
        </div>
      ) : (
        <div className="space-y-3">
          {novidades.map((n) => (
            <Card key={n.id} className={`group ${!n.publicado ? "opacity-70" : ""}`}>
              <CardContent className="p-5">
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="text-[15px] font-bold tracking-tight text-foreground">{n.titulo}</p>
                      <span className={`inline-flex items-center gap-1 rounded-lg border px-2 py-0.5 text-[10px] font-bold ${catInfo(n.categoria).cor}`}>
                        {catInfo(n.categoria).emoji} {catInfo(n.categoria).label}
                      </span>
                      {n.destaque && (
                        <Badge variant="outline" className="rounded-lg border-primary/40 text-primary px-2 py-0 text-[10px] font-bold uppercase gap-1">
                          <Star className="size-3" />
                          Destaque
                        </Badge>
                      )}
                      <Badge
                        variant="outline"
                        className={`rounded-lg px-2 py-0 text-[10px] font-bold uppercase ${
                          n.publicado ? "border-primary/30 text-primary" : "border-border text-muted-foreground"
                        }`}
                      >
                        {n.publicado ? "Publicado" : "Rascunho"}
                      </Badge>
                    </div>
                    {n.resumo && <p className="text-[12px] font-medium text-muted-foreground line-clamp-1 mt-1">{n.resumo}</p>}
                    <p className="text-[11px] font-medium text-muted-foreground/70 flex items-center gap-1.5 mt-2">
                      <Calendar className="size-3" />
                      {formatarData(n.data_publicacao)}
                    </p>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <Button
                      variant="ghost" size="sm"
                      className="h-8 gap-1.5 rounded-lg text-[11px] font-bold text-muted-foreground hover:text-primary"
                      onClick={() => alternarPublicado(n)}
                      title={n.publicado ? "Despublicar" : "Publicar"}
                    >
                      {n.publicado ? <CheckCircle2 className="size-4" /> : <Circle className="size-4" />}
                      {n.publicado ? "Ocultar" : "Publicar"}
                    </Button>
                    <Button variant="ghost" size="sm" className="size-8 p-0 rounded-lg" onClick={() => abrirEdicao(n)}>
                      <Edit3 className="size-4" />
                    </Button>
                    <Button
                      variant="ghost" size="sm"
                      className="size-8 p-0 rounded-lg text-muted-foreground hover:text-destructive"
                      onClick={() => excluir(n.id)}
                    >
                      <Trash2 className="size-4" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={showForm} onOpenChange={setShowForm}>
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>{editando ? "Editar Novidade" : "Nova Novidade"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 max-h-[65vh] overflow-y-auto pr-1">
            <div className="space-y-2">
              <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Título *</Label>
              <Input className="h-11 rounded-xl" placeholder="Ex.: Módulo completo: Tudo sobre API Oficial do WhatsApp" value={form.titulo} onChange={(e) => setForm((p) => ({ ...p, titulo: e.target.value }))} />
            </div>
            <div className="space-y-2">
              <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Resumo (aparece na lista)</Label>
              <Input className="h-11 rounded-xl" placeholder="Uma frase curta que aparece no card da timeline" value={form.resumo} onChange={(e) => setForm((p) => ({ ...p, resumo: e.target.value }))} />
            </div>
            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Categoria</Label>
                <Select value={form.categoria} onValueChange={(v) => setForm((p) => ({ ...p, categoria: v }))}>
                  <SelectTrigger className="h-11 rounded-xl"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {CATEGORIAS.map((c) => (
                      <SelectItem key={c.slug} value={c.slug}>{c.emoji} {c.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Data de publicação</Label>
                <DatePicker value={form.data_publicacao} onChange={(v) => setForm((p) => ({ ...p, data_publicacao: v }))} placeholder="Selecionar data" />
              </div>
              <div className="space-y-2">
                <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Autor (opcional)</Label>
                <Input className="h-11 rounded-xl" placeholder="Ex.: Equipe PMC" value={form.autor} onChange={(e) => setForm((p) => ({ ...p, autor: e.target.value }))} />
              </div>
            </div>
            <div className="space-y-2">
              <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Imagem de capa (opcional)</Label>
              {form.imagem_url ? (
                <div className="relative rounded-xl overflow-hidden border border-border">
                  <img src={form.imagem_url} alt="" className="w-full max-h-48 object-cover" />
                  <Button
                    variant="outline"
                    size="sm"
                    className="absolute top-2 right-2 h-8 rounded-lg text-xs font-bold bg-background/80 backdrop-blur"
                    onClick={() => setForm((p) => ({ ...p, imagem_url: "" }))}
                  >
                    Remover
                  </Button>
                </div>
              ) : (
                <label className={`flex items-center justify-center gap-2 h-24 rounded-xl border border-dashed border-border cursor-pointer hover:border-primary/40 hover:bg-primary/5 transition-colors text-[13px] font-medium text-muted-foreground ${uploadandoImg ? "opacity-50 pointer-events-none" : ""}`}>
                  {uploadandoImg ? "Enviando imagem..." : "Clique para enviar a imagem de capa (JPG/PNG)"}
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => { const f = e.target.files?.[0]; if (f) onUploadImagem(f); e.target.value = "" }}
                  />
                </label>
              )}
            </div>
            <div className="space-y-2">
              <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Conteúdo (aceita markdown)</Label>
              <Textarea className="rounded-xl min-h-48 text-[13px] font-mono" placeholder={"Escreva o conteúdo completo. Aceita markdown:\n\n**negrito**, listas com - , títulos com ##, links [texto](url)"} value={form.conteudo} onChange={(e) => setForm((p) => ({ ...p, conteudo: e.target.value }))} />
            </div>
            <div className="flex items-center gap-6">
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" className="accent-[var(--color-primary)] size-4" checked={form.destaque} onChange={(e) => setForm((p) => ({ ...p, destaque: e.target.checked }))} />
                <span className="text-[13px] font-medium text-foreground">Marcar como destaque</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" className="accent-[var(--color-primary)] size-4" checked={form.publicado} onChange={(e) => setForm((p) => ({ ...p, publicado: e.target.checked }))} />
                <span className="text-[13px] font-medium text-foreground">Publicado (visível aos clientes)</span>
              </label>
            </div>
          </div>
          <DialogFooter>
            <Button disabled={salvando || !form.titulo.trim()} className="w-full h-11 rounded-xl font-bold uppercase tracking-wider text-xs" onClick={salvar}>
              {salvando ? "Salvando..." : editando ? "Salvar alterações" : "Publicar Novidade"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </motion.div>
  )
}
