import { useEffect, useMemo, useState } from "react"
import { supabase } from "@/lib/supabase"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetFooter,
} from "@/components/ui/sheet"
import {
  PlusIcon as Plus,
  Trash2Icon as Trash2,
  Edit3Icon as Edit3,
  ExternalLinkIcon as ExternalLink,
  SearchIcon as Search,
  Sparkles2Icon as Sparkles,
} from "@/components/ui/icons"
import type { Session } from "@supabase/supabase-js"
import { motion } from "framer-motion"

interface Ferramenta {
  id: string
  nome: string
  subtitulo: string | null
  categoria: string
  preco: string
  descricao: string
  features: string[]
  url: string
  ordem: number
  ativo: boolean
}

interface FerramentasPageProps {
  session?: Session
  forceAdmin?: boolean
}

interface FormState {
  nome: string
  subtitulo: string
  categoria: string
  preco: string
  descricao: string
  features: string
  url: string
  ordem: number
  ativo: boolean
}

const EMPTY_FORM: FormState = {
  nome: "",
  subtitulo: "",
  categoria: "",
  preco: "",
  descricao: "",
  features: "",
  url: "",
  ordem: 0,
  ativo: true,
}

export default function FerramentasPage({ session, forceAdmin }: FerramentasPageProps) {
  const [ferramentas, setFerramentas] = useState<Ferramenta[]>([])
  const [loading, setLoading] = useState(true)
  const [isAdmin, setIsAdmin] = useState(forceAdmin ?? false)
  const [search, setSearch] = useState("")
  const [showSheet, setShowSheet] = useState(false)
  const [editing, setEditing] = useState<Ferramenta | null>(null)
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState<FormState>(EMPTY_FORM)
  const [confirmDelete, setConfirmDelete] = useState<Ferramenta | null>(null)

  useEffect(() => {
    async function init() {
      let admin = forceAdmin ?? false
      if (!admin && session?.user?.email) {
        const { data } = await supabase
          .from("mentores")
          .select("id")
          .eq("email", session.user.email)
          .maybeSingle()
        admin = !!data
      }
      setIsAdmin(admin)

      let query = supabase
        .from("ferramentas_ia")
        .select("*")
        .order("categoria", { ascending: true })
        .order("ordem", { ascending: true })

      if (!admin) query = query.eq("ativo", true)

      const { data, error } = await query
      if (error) console.error("ferramentas_ia fetch error:", error)
      if (data) setFerramentas(data as Ferramenta[])
      setLoading(false)
    }
    init()
  }, [session, forceAdmin])

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q) return ferramentas
    return ferramentas.filter(f =>
      f.nome.toLowerCase().includes(q) ||
      f.subtitulo?.toLowerCase().includes(q) ||
      f.categoria.toLowerCase().includes(q) ||
      f.descricao.toLowerCase().includes(q) ||
      f.features.some(feat => feat.toLowerCase().includes(q)))
  }, [ferramentas, search])

  const grouped = useMemo(() => {
    return filtered.reduce<Record<string, Ferramenta[]>>((acc, f) => {
      if (!acc[f.categoria]) acc[f.categoria] = []
      acc[f.categoria].push(f)
      return acc
    }, {})
  }, [filtered])

  const categorias = useMemo(
    () => Array.from(new Set(ferramentas.map(f => f.categoria))).sort(),
    [ferramentas]
  )

  function openNew() {
    setEditing(null)
    setForm(EMPTY_FORM)
    setShowSheet(true)
  }

  function openEdit(f: Ferramenta) {
    setEditing(f)
    setForm({
      nome: f.nome,
      subtitulo: f.subtitulo ?? "",
      categoria: f.categoria,
      preco: f.preco,
      descricao: f.descricao,
      features: f.features.join("\n"),
      url: f.url,
      ordem: f.ordem,
      ativo: f.ativo,
    })
    setShowSheet(true)
  }

  async function handleSave() {
    setSaving(true)
    const payload = {
      nome: form.nome.trim(),
      subtitulo: form.subtitulo.trim() || null,
      categoria: form.categoria.trim(),
      preco: form.preco.trim(),
      descricao: form.descricao.trim(),
      features: form.features.split("\n").map(s => s.trim()).filter(Boolean),
      url: form.url.trim(),
      ordem: form.ordem,
      ativo: form.ativo,
    }

    if (editing) {
      const { data, error } = await supabase
        .from("ferramentas_ia")
        .update(payload)
        .eq("id", editing.id)
        .select()
        .single()
      if (!error && data) {
        setFerramentas(prev => prev.map(f => (f.id === editing.id ? (data as Ferramenta) : f)))
        setShowSheet(false)
      } else if (error) {
        console.error("update error:", error)
        alert(`Erro ao salvar: ${error.message}`)
      }
    } else {
      const { data, error } = await supabase
        .from("ferramentas_ia")
        .insert([payload])
        .select()
        .single()
      if (!error && data) {
        setFerramentas(prev => [...prev, data as Ferramenta])
        setShowSheet(false)
      } else if (error) {
        console.error("insert error:", error)
        alert(`Erro ao criar: ${error.message}`)
      }
    }
    setSaving(false)
  }

  async function handleDelete(f: Ferramenta) {
    const { error } = await supabase.from("ferramentas_ia").delete().eq("id", f.id)
    if (!error) {
      setFerramentas(prev => prev.filter(x => x.id !== f.id))
    } else {
      console.error("delete error:", error)
      alert(`Erro ao excluir: ${error.message}`)
    }
    setConfirmDelete(null)
  }

  const container = {
    hidden: { opacity: 0 },
    show: { opacity: 1, transition: { staggerChildren: 0.05 } },
  }

  const item = {
    hidden: { y: 12, opacity: 0 },
    show: { y: 0, opacity: 1, transition: { duration: 0.4, ease: "easeOut" as const } },
  }

  if (loading) {
    return (
      <div className="space-y-6 animate-pulse">
        <div className="h-12 w-1/3 bg-card/40 rounded-xl" />
        <div className="grid gap-4 md:grid-cols-2">
          {[1, 2, 3, 4].map(i => <Card key={i} className="h-40 bg-card/40" />)}
        </div>
      </div>
    )
  }

  const total = ferramentas.length
  const showingCount = filtered.length

  return (
    <div className="space-y-10 pb-10">
      <motion.div
        initial={{ opacity: 0, x: -20 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.6 }}
        className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between border-l-4 border-primary pl-8 py-2"
      >
        <div className="flex flex-col gap-2">
          <h1 className="text-4xl lg:text-5xl font-bold tracking-tight text-foreground">Ferramentas de IA</h1>
          <p className="text-muted-foreground font-medium text-sm">Acesse as melhores ferramentas de inteligência artificial do mercado.</p>
        </div>
        {isAdmin && (
          <Button className="h-12 gap-2 rounded-xl px-6 shadow-xl shadow-primary/10" onClick={openNew}>
            <Plus className="size-5" />
            <span className="font-bold uppercase tracking-wider text-[11px]">Nova Ferramenta</span>
          </Button>
        )}
      </motion.div>

      <div className="flex flex-col md:flex-row md:items-center gap-4 bg-muted/10 p-6 rounded-2xl border border-border/50">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3.5 top-3.5 size-4 text-muted-foreground" />
          <Input
            placeholder="Buscar por nome, funcionalidade..."
            className="pl-11 h-12 bg-background border-border focus-visible:border-primary/50 shadow-sm"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <div className="text-xs font-semibold uppercase tracking-widest text-muted-foreground md:ml-auto">
          <span className="text-foreground">{showingCount}</span>
          {search && <span> de <span className="text-foreground">{total}</span></span>}
          {" "}ferramentas
        </div>
      </div>

      {Object.keys(grouped).length === 0 && (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <div className="bg-muted/20 p-6 rounded-2xl border border-border mb-6">
            <Sparkles className="size-10 text-muted-foreground" />
          </div>
          <p className="text-muted-foreground font-medium">
            {search ? "Nenhuma ferramenta encontrada com esse filtro." : "Nenhuma ferramenta cadastrada ainda."}
          </p>
        </div>
      )}

      {Object.entries(grouped).map(([categoria, items]) => (
        <div key={categoria} className="space-y-4">
          <div>
            <h2 className="text-xl font-bold tracking-tight text-foreground">{categoria}</h2>
            <p className="text-xs text-muted-foreground font-medium mt-1 uppercase tracking-widest">
              {items.length} ferramenta{items.length === 1 ? "" : "s"}
            </p>
          </div>
          <motion.div
            variants={container}
            initial="hidden"
            animate="show"
            className="grid gap-5 md:grid-cols-2 xl:grid-cols-3"
          >
            {items.map(f => (
              <motion.div key={f.id} variants={item}>
                <Card className={`group h-full hover:border-primary/40 transition-all duration-300 ${!f.ativo ? "opacity-50" : ""}`}>
                  <CardContent className="p-6 flex flex-col gap-4 h-full">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-baseline gap-2 flex-wrap">
                          <h3 className="text-lg font-bold tracking-tight text-foreground truncate">{f.nome}</h3>
                          {f.subtitulo && (
                            <span className="text-xs text-muted-foreground font-medium">({f.subtitulo})</span>
                          )}
                        </div>
                        <Badge
                          variant="outline"
                          className="mt-2 rounded-lg px-2.5 py-0.5 text-[10px] font-bold border-border/60 bg-muted/20 text-foreground"
                        >
                          {f.preco}
                        </Badge>
                      </div>
                      {isAdmin && (
                        <div className="flex items-center gap-1 shrink-0">
                          {!f.ativo && (
                            <span className="text-[9px] font-bold uppercase tracking-wider text-muted-foreground mr-1">Oculto</span>
                          )}
                          <Button
                            variant="ghost"
                            size="icon"
                            className="size-8 rounded-lg hover:bg-muted/50"
                            onClick={() => openEdit(f)}
                            title="Editar"
                          >
                            <Edit3 className="size-3.5 text-muted-foreground" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="size-8 rounded-lg hover:bg-destructive/10 hover:text-destructive"
                            onClick={() => setConfirmDelete(f)}
                            title="Excluir"
                          >
                            <Trash2 className="size-3.5" />
                          </Button>
                        </div>
                      )}
                    </div>

                    <p className="text-sm text-muted-foreground leading-relaxed">{f.descricao}</p>

                    {f.features.length > 0 && (
                      <ul className="space-y-1.5 flex-1">
                        {f.features.map((feat, i) => (
                          <li key={i} className="flex items-start gap-2 text-xs text-foreground/80">
                            <span className="mt-1 shrink-0 size-1.5 rounded-full bg-primary/70" />
                            <span>{feat}</span>
                          </li>
                        ))}
                      </ul>
                    )}

                    <a href={f.url} target="_blank" rel="noopener noreferrer" className="mt-auto">
                      <Button
                        variant="outline"
                        className="w-full h-10 rounded-xl gap-2 font-bold uppercase tracking-wider text-[11px] border-primary/30 text-primary hover:bg-primary/10 hover:border-primary/50"
                      >
                        <ExternalLink className="size-3.5" />
                        Acessar
                      </Button>
                    </a>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </motion.div>
        </div>
      ))}

      <Sheet open={showSheet} onOpenChange={(open) => { if (!open) setShowSheet(false) }}>
        <SheetContent side="right" className="w-full sm:max-w-md p-0 flex flex-col bg-background border-l border-border">
          <SheetHeader className="p-6 border-b border-border">
            <SheetTitle className="text-lg font-bold text-foreground">
              {editing ? "Editar Ferramenta" : "Nova Ferramenta"}
            </SheetTitle>
          </SheetHeader>
          <div className="flex-1 overflow-y-auto p-6 space-y-5">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Nome</Label>
                <Input
                  className="h-11 rounded-xl"
                  placeholder="Ex: ChatGPT"
                  value={form.nome}
                  onChange={(e) => setForm(p => ({ ...p, nome: e.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Subtítulo</Label>
                <Input
                  className="h-11 rounded-xl"
                  placeholder="Ex: OpenAI"
                  value={form.subtitulo}
                  onChange={(e) => setForm(p => ({ ...p, subtitulo: e.target.value }))}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Categoria</Label>
              <Input
                className="h-11 rounded-xl"
                placeholder="Ex: Plataformas de LLM"
                list="ferramentas-categorias"
                value={form.categoria}
                onChange={(e) => setForm(p => ({ ...p, categoria: e.target.value }))}
              />
              <datalist id="ferramentas-categorias">
                {categorias.map(c => <option key={c} value={c} />)}
              </datalist>
            </div>

            <div className="space-y-2">
              <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Preço / Plano</Label>
              <Input
                className="h-11 rounded-xl"
                placeholder="Ex: $20+/mês  ou  Gratuito / $20+/mês"
                value={form.preco}
                onChange={(e) => setForm(p => ({ ...p, preco: e.target.value }))}
              />
            </div>

            <div className="space-y-2">
              <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">URL</Label>
              <Input
                className="h-11 rounded-xl"
                placeholder="https://..."
                value={form.url}
                onChange={(e) => setForm(p => ({ ...p, url: e.target.value }))}
              />
            </div>

            <div className="space-y-2">
              <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Descrição</Label>
              <textarea
                className="w-full rounded-xl border border-border bg-background px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary/50 resize-none"
                rows={2}
                placeholder="Descrição curta em 1 linha"
                value={form.descricao}
                onChange={(e) => setForm(p => ({ ...p, descricao: e.target.value }))}
              />
            </div>

            <div className="space-y-2">
              <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Features (1 por linha)</Label>
              <textarea
                className="w-full rounded-xl border border-border bg-background px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary/50 resize-none font-mono"
                rows={5}
                placeholder={"Text-to-Speech de alta qualidade\nClonagem de voz\nMúltiplos idiomas"}
                value={form.features}
                onChange={(e) => setForm(p => ({ ...p, features: e.target.value }))}
              />
              <p className="text-[10px] text-muted-foreground">Cada linha vira um bullet no card.</p>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Ordem</Label>
                <Input
                  type="number"
                  className="h-11 rounded-xl"
                  value={form.ordem}
                  onChange={(e) => setForm(p => ({ ...p, ordem: Number(e.target.value) }))}
                />
              </div>
              <div className="space-y-2">
                <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Visibilidade</Label>
                <Select value={form.ativo ? "true" : "false"} onValueChange={(v) => setForm(p => ({ ...p, ativo: v === "true" }))}>
                  <SelectTrigger className="h-11 rounded-xl border-border bg-background">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="true">Visível</SelectItem>
                    <SelectItem value="false">Oculto</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
          <SheetFooter className="p-6 border-t border-border">
            <Button
              disabled={saving || !form.nome || !form.url || !form.categoria || !form.preco || !form.descricao}
              className="w-full h-11 rounded-xl font-bold uppercase tracking-wider text-xs"
              onClick={handleSave}
            >
              {saving ? "Salvando..." : "Salvar"}
            </Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>

      {confirmDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm p-4" onClick={() => setConfirmDelete(null)}>
          <div className="bg-card border border-border rounded-2xl p-6 max-w-md w-full shadow-2xl" onClick={e => e.stopPropagation()}>
            <h3 className="text-lg font-bold text-foreground">Excluir ferramenta</h3>
            <p className="text-sm text-muted-foreground mt-2">
              Tem certeza que quer excluir <span className="font-bold text-foreground">{confirmDelete.nome}</span>? Essa ação não pode ser desfeita.
            </p>
            <div className="flex gap-3 mt-6">
              <Button variant="outline" className="flex-1 rounded-xl" onClick={() => setConfirmDelete(null)}>
                Cancelar
              </Button>
              <Button variant="destructive" className="flex-1 rounded-xl" onClick={() => handleDelete(confirmDelete)}>
                Excluir
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
