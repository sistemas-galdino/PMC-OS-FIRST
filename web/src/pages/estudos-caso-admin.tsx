// Admin (dono) → cadastro de Estudos de Caso. Os publicados aparecem para os
// clientes em Conhecimento → Estudos de Caso (/estudos-caso).
import { useEffect, useState } from "react"
import { supabase } from "@/lib/supabase"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent } from "@/components/ui/card"
import { DatePicker } from "@/components/ui/date-picker"
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import {
  BookOpenIcon as BookOpen,
  PlusIcon as Plus,
  Edit3Icon as Edit3,
  Trash2Icon as Trash2,
  StarIcon as Star,
  CalendarIcon as Calendar,
  CheckCircle2Icon as CheckCircle2,
  CircleIcon as Circle,
  XIcon as X,
  PlayCircleIcon as PlayCircle,
} from "@/components/ui/icons"
import { motion } from "framer-motion"
import { parseVideo } from "@/lib/video-embed"
import { NICHO_OPTIONS } from "@/data/nichos"

interface Metrica { valor: string; label: string }

interface EstudoCaso {
  id: string
  titulo: string
  autor: string | null
  autor_papel: string | null
  resumo: string | null
  sobre: string | null
  video_url: string | null
  thumbnail_url: string | null
  tags: string[]
  nicho: string | null
  metricas: Metrica[]
  destaque: boolean
  publicado: boolean
  data_publicacao: string
}

function hojeIso() {
  return new Date().toISOString().slice(0, 10)
}

const FORM_VAZIO = {
  titulo: "",
  autor: "",
  autor_papel: "",
  resumo: "",
  sobre: "",
  video_url: "",
  thumbnail_url: "",
  tags: "",
  nicho: "",
  metricas: [{ valor: "", label: "" }] as Metrica[],
  destaque: false,
  publicado: true,
  data_publicacao: hojeIso(),
}

export default function EstudosCasoAdminPage() {
  const [estudos, setEstudos] = useState<EstudoCaso[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editando, setEditando] = useState<EstudoCaso | null>(null)
  const [form, setForm] = useState(FORM_VAZIO)
  const [salvando, setSalvando] = useState(false)

  async function fetchEstudos() {
    const { data } = await supabase
      .from("conhecimento_estudos_caso")
      .select("*")
      .order("data_publicacao", { ascending: false })
    setEstudos(
      (data ?? []).map((e) => ({
        ...e,
        tags: Array.isArray(e.tags) ? e.tags : [],
        metricas: Array.isArray(e.metricas) ? e.metricas : [],
      }))
    )
    setLoading(false)
  }

  useEffect(() => { fetchEstudos() }, [])

  function abrirNovo() {
    setEditando(null)
    setForm({ ...FORM_VAZIO, metricas: [{ valor: "", label: "" }], data_publicacao: hojeIso() })
    setShowForm(true)
  }

  function abrirEdicao(e: EstudoCaso) {
    setEditando(e)
    setForm({
      titulo: e.titulo,
      autor: e.autor ?? "",
      autor_papel: e.autor_papel ?? "",
      resumo: e.resumo ?? "",
      sobre: e.sobre ?? "",
      video_url: e.video_url ?? "",
      thumbnail_url: e.thumbnail_url ?? "",
      tags: e.tags.join(", "),
      nicho: e.nicho ?? "",
      metricas: e.metricas.length ? e.metricas : [{ valor: "", label: "" }],
      destaque: e.destaque,
      publicado: e.publicado,
      data_publicacao: e.data_publicacao,
    })
    setShowForm(true)
  }

  function setMetrica(i: number, campo: keyof Metrica, v: string) {
    setForm((p) => ({
      ...p,
      metricas: p.metricas.map((m, mi) => (mi === i ? { ...m, [campo]: v } : m)),
    }))
  }

  async function salvar() {
    if (!form.titulo.trim()) return
    setSalvando(true)
    const payload = {
      titulo: form.titulo.trim(),
      autor: form.autor.trim() || null,
      autor_papel: form.autor_papel.trim() || null,
      resumo: form.resumo.trim() || null,
      sobre: form.sobre.trim() || null,
      video_url: form.video_url.trim() || null,
      thumbnail_url: form.thumbnail_url.trim() || null,
      tags: form.tags.split(",").map((t) => t.trim()).filter(Boolean),
      nicho: form.nicho || null,
      metricas: form.metricas.filter((m) => m.valor.trim() || m.label.trim()),
      destaque: form.destaque,
      publicado: form.publicado,
      data_publicacao: form.data_publicacao || hojeIso(),
      updated_at: new Date().toISOString(),
    }
    const { error } = editando
      ? await supabase.from("conhecimento_estudos_caso").update(payload).eq("id", editando.id)
      : await supabase.from("conhecimento_estudos_caso").insert(payload)
    setSalvando(false)
    if (!error) {
      setShowForm(false)
      fetchEstudos()
    }
  }

  async function excluir(id: string) {
    if (!confirm("Excluir este estudo de caso?")) return
    await supabase.from("conhecimento_estudos_caso").delete().eq("id", id)
    fetchEstudos()
  }

  async function alternarPublicado(e: EstudoCaso) {
    await supabase
      .from("conhecimento_estudos_caso")
      .update({ publicado: !e.publicado, updated_at: new Date().toISOString() })
      .eq("id", e.id)
    setEstudos((prev) => prev.map((x) => (x.id === e.id ? { ...x, publicado: !x.publicado } : x)))
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
            <BookOpen className="size-6 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-foreground">Estudos de Caso</h1>
            <p className="text-sm font-medium text-muted-foreground">
              Cadastre as histórias que aparecem para os clientes em Conhecimento → Estudos de Caso.
            </p>
          </div>
        </div>
        <Button className="h-11 gap-2 rounded-xl font-bold uppercase tracking-wider text-xs" onClick={abrirNovo}>
          <Plus className="size-4" />
          Novo Estudo de Caso
        </Button>
      </div>

      {loading ? (
        <div className="space-y-3">
          {[1, 2].map((i) => <div key={i} className="h-24 rounded-2xl bg-card/40 animate-pulse" />)}
        </div>
      ) : estudos.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 gap-3 text-center border border-dashed border-border rounded-2xl">
          <BookOpen className="size-8 text-muted-foreground/30" />
          <p className="text-sm font-medium text-muted-foreground">Nenhum estudo de caso cadastrado. Crie o primeiro!</p>
        </div>
      ) : (
        <div className="space-y-3">
          {estudos.map((e) => (
            <Card key={e.id} className={`group ${!e.publicado ? "opacity-70" : ""}`}>
              <CardContent className="p-5">
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      {e.video_url && <PlayCircle className="size-4 text-primary shrink-0" />}
                      <p className="text-[15px] font-bold tracking-tight text-foreground">{e.titulo}</p>
                      {e.destaque && (
                        <Badge variant="outline" className="rounded-lg border-primary/40 text-primary px-2 py-0 text-[10px] font-bold uppercase gap-1">
                          <Star className="size-3" />
                          Destaque
                        </Badge>
                      )}
                      <Badge
                        variant="outline"
                        className={`rounded-lg px-2 py-0 text-[10px] font-bold uppercase ${
                          e.publicado ? "border-primary/30 text-primary" : "border-border text-muted-foreground"
                        }`}
                      >
                        {e.publicado ? "Publicado" : "Rascunho"}
                      </Badge>
                    </div>
                    <p className="text-[12px] font-medium text-muted-foreground mt-1">
                      {[e.autor, e.autor_papel].filter(Boolean).join(" · ")}
                      {e.metricas.length > 0 && ` — ${e.metricas.length} métrica(s)`}
                      {e.tags.length > 0 && ` — ${e.tags.length} tag(s)`}
                    </p>
                    <p className="text-[11px] font-medium text-muted-foreground/70 flex items-center gap-1.5 mt-2">
                      <Calendar className="size-3" />
                      {new Date(e.data_publicacao + "T00:00:00").toLocaleDateString("pt-BR", { day: "2-digit", month: "long", year: "numeric" })}
                    </p>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <Button
                      variant="ghost" size="sm"
                      className="h-8 gap-1.5 rounded-lg text-[11px] font-bold text-muted-foreground hover:text-primary"
                      onClick={() => alternarPublicado(e)}
                    >
                      {e.publicado ? <CheckCircle2 className="size-4" /> : <Circle className="size-4" />}
                      {e.publicado ? "Ocultar" : "Publicar"}
                    </Button>
                    <Button variant="ghost" size="sm" className="size-8 p-0 rounded-lg" onClick={() => abrirEdicao(e)}>
                      <Edit3 className="size-4" />
                    </Button>
                    <Button
                      variant="ghost" size="sm"
                      className="size-8 p-0 rounded-lg text-muted-foreground hover:text-destructive"
                      onClick={() => excluir(e.id)}
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
            <DialogTitle>{editando ? "Editar Estudo de Caso" : "Novo Estudo de Caso"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 max-h-[65vh] overflow-y-auto pr-1">
            <div className="space-y-2">
              <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Título *</Label>
              <Input className="h-11 rounded-xl" placeholder="Ex.: Ela montou um time de agentes de IA para produção de conteúdo" value={form.titulo} onChange={(ev) => setForm((p) => ({ ...p, titulo: ev.target.value }))} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Autor</Label>
                <Input className="h-11 rounded-xl" placeholder="Ex.: Gabi" value={form.autor} onChange={(ev) => setForm((p) => ({ ...p, autor: ev.target.value }))} />
              </div>
              <div className="space-y-2">
                <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Papel do autor</Label>
                <Input className="h-11 rounded-xl" placeholder="Ex.: Mentora e Empreendedora" value={form.autor_papel} onChange={(ev) => setForm((p) => ({ ...p, autor_papel: ev.target.value }))} />
              </div>
            </div>
            <div className="space-y-2">
              <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Resumo (aparece no card)</Label>
              <Input className="h-11 rounded-xl" placeholder="Uma frase curta que resume a história" value={form.resumo} onChange={(ev) => setForm((p) => ({ ...p, resumo: ev.target.value }))} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Vídeo (Vimeo, YouTube ou .mp4)</Label>
                <Input
                  className="h-11 rounded-xl"
                  placeholder="Cole o link do Vimeo: https://vimeo.com/123456789/abc123"
                  value={form.video_url}
                  onChange={(ev) => setForm((p) => ({ ...p, video_url: ev.target.value }))}
                />
                {(() => {
                  const info = parseVideo(form.video_url)
                  if (!form.video_url.trim()) {
                    return <p className="text-[11px] font-medium text-muted-foreground">Aceita link normal ou de vídeo não listado (com hash).</p>
                  }
                  if (!info) return null
                  if (info.tipo === "vimeo") {
                    return (
                      <p className="text-[11px] font-bold text-primary">
                        ✓ Vimeo detectado · ID {info.id}{info.hash ? " · não listado (hash ok)" : ""}
                      </p>
                    )
                  }
                  if (info.tipo === "youtube") return <p className="text-[11px] font-bold text-primary">✓ YouTube detectado · ID {info.id}</p>
                  return <p className="text-[11px] font-bold text-amber-400">Link direto de arquivo — será usado no player nativo.</p>
                })()}
              </div>
              <div className="space-y-2">
                <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Capa (opcional)</Label>
                <Input className="h-11 rounded-xl" placeholder="URL da imagem (Vimeo/YouTube geram sozinho)" value={form.thumbnail_url} onChange={(ev) => setForm((p) => ({ ...p, thumbnail_url: ev.target.value }))} />
              </div>
            </div>

            {/* Pré-visualização do player — confirma que o embed funciona antes de publicar */}
            {(() => {
              const info = parseVideo(form.video_url)
              if (!info || info.tipo === "arquivo") return null
              return (
                <div className="space-y-2">
                  <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Pré-visualização</Label>
                  <iframe
                    key={info.embedUrl}
                    className="w-full aspect-video rounded-xl border border-border"
                    src={info.embedUrl}
                    title="Pré-visualização do vídeo"
                    allow="autoplay; fullscreen; picture-in-picture"
                    allowFullScreen
                  />
                  <p className="text-[11px] font-medium text-muted-foreground">
                    Se o vídeo não tocar aqui, no Vimeo confira em <strong>Privacidade → Onde pode ser embedado</strong> (permita em qualquer lugar ou adicione o domínio do portal).
                  </p>
                </div>
              )
            })()}
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Tags (separadas por vírgula)</Label>
                <Input className="h-11 rounded-xl" placeholder="Ex.: Automação de Conteúdo, IA Generativa" value={form.tags} onChange={(ev) => setForm((p) => ({ ...p, tags: ev.target.value }))} />
              </div>
              {/* Mesma taxonomia do onboarding: é o que permite ao cliente
                  filtrar os cases pelo setor dele. */}
              <div className="space-y-2">
                <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Nicho</Label>
                <select
                  value={form.nicho}
                  onChange={(ev) => setForm((p) => ({ ...p, nicho: ev.target.value }))}
                  className="h-11 w-full rounded-xl border border-border bg-background px-3 text-sm text-foreground"
                >
                  <option value="">Sem nicho definido</option>
                  {NICHO_OPTIONS.map((n) => <option key={n} value={n}>{n}</option>)}
                </select>
              </div>
            </div>

            {/* Métricas dinâmicas */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Métricas de resultado (até 4)</Label>
                <Button
                  type="button" variant="outline" size="sm"
                  disabled={form.metricas.length >= 4}
                  className="h-8 gap-1.5 rounded-lg text-[11px] font-bold uppercase"
                  onClick={() => setForm((p) => ({ ...p, metricas: [...p.metricas, { valor: "", label: "" }] }))}
                >
                  <Plus className="size-3.5" />
                  Adicionar
                </Button>
              </div>
              {form.metricas.map((m, i) => (
                <div key={i} className="flex items-center gap-2">
                  <Input className="h-10 rounded-xl flex-1" placeholder='Valor (ex.: "De R$800 para R$200")' value={m.valor} onChange={(ev) => setMetrica(i, "valor", ev.target.value)} />
                  <Input className="h-10 rounded-xl flex-1" placeholder='Rótulo (ex.: "Redução de Custo")' value={m.label} onChange={(ev) => setMetrica(i, "label", ev.target.value)} />
                  <Button
                    type="button" variant="ghost" size="sm"
                    className="size-8 p-0 rounded-lg text-muted-foreground hover:text-destructive shrink-0"
                    onClick={() => setForm((p) => ({ ...p, metricas: p.metricas.filter((_, mi) => mi !== i) }))}
                  >
                    <X className="size-4" />
                  </Button>
                </div>
              ))}
            </div>

            <div className="space-y-2">
              <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Sobre este estudo de caso (aceita markdown)</Label>
              <Textarea className="rounded-xl min-h-36 text-[13px]" placeholder={"A história completa. Aceita markdown: **negrito**, listas com - , links [texto](url)"} value={form.sobre} onChange={(ev) => setForm((p) => ({ ...p, sobre: ev.target.value }))} />
            </div>

            <div className="grid grid-cols-2 gap-4 items-end">
              <div className="space-y-2">
                <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Data de publicação</Label>
                <DatePicker value={form.data_publicacao} onChange={(v) => setForm((p) => ({ ...p, data_publicacao: v }))} placeholder="Selecionar data" />
              </div>
              <div className="flex items-center gap-6 pb-2">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" className="accent-[var(--color-primary)] size-4" checked={form.destaque} onChange={(ev) => setForm((p) => ({ ...p, destaque: ev.target.checked }))} />
                  <span className="text-[13px] font-medium text-foreground">Destaque</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" className="accent-[var(--color-primary)] size-4" checked={form.publicado} onChange={(ev) => setForm((p) => ({ ...p, publicado: ev.target.checked }))} />
                  <span className="text-[13px] font-medium text-foreground">Publicado</span>
                </label>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button disabled={salvando || !form.titulo.trim()} className="w-full h-11 rounded-xl font-bold uppercase tracking-wider text-xs" onClick={salvar}>
              {salvando ? "Salvando..." : editando ? "Salvar alterações" : "Publicar Estudo de Caso"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </motion.div>
  )
}
