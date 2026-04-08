import { useEffect, useState } from "react"
import { supabase } from "@/lib/supabase"
import { Card, CardContent } from "@/components/ui/card"
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
  BookOpenIcon as BookOpen,
} from "@/components/ui/icons"
import type { Session } from "@supabase/supabase-js"
import { motion } from "framer-motion"

interface Recurso {
  id: string
  titulo: string
  url: string
  icone: string
  categoria: string
  ordem: number
  ativo: boolean
  criado_em: string
}

interface RecursosPageProps {
  session?: Session
  forceAdmin?: boolean
}

export default function RecursosPage({ session, forceAdmin }: RecursosPageProps) {
  const [recursos, setRecursos] = useState<Recurso[]>([])
  const [loading, setLoading] = useState(true)
  const [isAdmin, setIsAdmin] = useState(forceAdmin ?? false)
  const [showSheet, setShowSheet] = useState(false)
  const [editingRecurso, setEditingRecurso] = useState<Recurso | null>(null)
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState({ titulo: '', url: '', icone: '🔗', categoria: '', ordem: 0, ativo: true })
  const [quickLinks, setQuickLinks] = useState<Record<string, string>>({})
  const [clientSc, setClientSc] = useState<string | null>(null)

  useEffect(() => {
    async function init() {
      let admin = forceAdmin ?? false

      // Check admin from session if not forced
      if (!admin && session?.user?.email) {
        const { data } = await supabase
          .from('mentores')
          .select('id')
          .eq('email', session.user.email)
          .maybeSingle()
        admin = !!data
      }
      setIsAdmin(admin)

      // Fetch recursos
      let query = supabase
        .from('recursos_programa')
        .select('*')
        .order('categoria', { ascending: true })
        .order('ordem', { ascending: true })

      if (!admin) {
        query = query.eq('ativo', true)
      }

      const { data: recursos } = await query
      if (recursos) setRecursos(recursos)
      setLoading(false)
    }

    init()

    // Fetch configurable links and client SC for non-admin
    if (session?.user?.id) {
      supabase
        .from('configuracoes_links')
        .select('chave, url')
        .eq('ativo', true)
        .then(({ data: links }) => {
          if (links) {
            const map: Record<string, string> = {}
            links.forEach(l => { map[l.chave] = l.url })
            setQuickLinks(map)
          }
        })
      supabase
        .from('clientes_entrada_new')
        .select('sc')
        .eq('id_cliente', session.user.id)
        .maybeSingle()
        .then(({ data }) => {
          if (data) setClientSc(data.sc ?? null)
        })
    }
  }, [session, forceAdmin])

  function openNew() {
    setEditingRecurso(null)
    setForm({ titulo: '', url: '', icone: '🔗', categoria: '', ordem: 0, ativo: true })
    setShowSheet(true)
  }

  function openEdit(recurso: Recurso) {
    setEditingRecurso(recurso)
    setForm({
      titulo: recurso.titulo,
      url: recurso.url,
      icone: recurso.icone,
      categoria: recurso.categoria,
      ordem: recurso.ordem,
      ativo: recurso.ativo,
    })
    setShowSheet(true)
  }

  async function handleDelete(recurso: Recurso) {
    await supabase.from('recursos_programa').delete().eq('id', recurso.id)
    setRecursos(prev => prev.filter(r => r.id !== recurso.id))
  }

  async function handleSave() {
    console.log('handleSave called, form:', form)
    setSaving(true)
    try {
      if (editingRecurso) {
        const { data, error } = await supabase
          .from('recursos_programa')
          .update(form)
          .eq('id', editingRecurso.id)
          .select()
          .single()
        console.log('update result:', { data, error })
        if (!error && data) {
          setRecursos(prev => prev.map(r => r.id === editingRecurso.id ? data : r))
          setShowSheet(false)
        }
      } else {
        const { data, error } = await supabase
          .from('recursos_programa')
          .insert([form])
          .select()
          .single()
        console.log('insert result:', { data, error })
        if (!error && data) {
          setRecursos(prev => [...prev, data])
          setShowSheet(false)
        }
      }
    } catch (err) {
      console.error('handleSave exception:', err)
    }
    setSaving(false)
  }

  const grouped = recursos.reduce<Record<string, Recurso[]>>((acc, r) => {
    const key = r.categoria
    if (!acc[key]) acc[key] = []
    acc[key].push(r)
    return acc
  }, {})

  const container = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: { staggerChildren: 0.1 }
    }
  }

  const item = {
    hidden: { y: 20, opacity: 0 },
    show: { y: 0, opacity: 1, transition: { duration: 0.5, ease: "easeOut" as const } }
  }

  if (loading) {
    return <div className="grid gap-6 md:grid-cols-2">
      {[1, 2, 3, 4].map(i => <Card key={i} className="h-20 animate-pulse bg-card/40" />)}
    </div>
  }

  return (
    <div className="space-y-10 pb-10">
      <motion.div
        initial={{ opacity: 0, x: -20 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.6 }}
        className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between border-l-4 border-primary pl-8 py-2"
      >
        <div className="flex flex-col gap-2">
          <h1 className="text-4xl lg:text-5xl font-bold tracking-tight text-foreground">Links Importantes</h1>
          <p className="text-muted-foreground font-medium text-sm">Ferramentas e acessos disponíveis para sua operação.</p>
        </div>
        {isAdmin && (
          <Button className="h-12 gap-2 rounded-xl px-6 shadow-xl shadow-primary/10" onClick={openNew}>
            <Plus className="size-5" />
            <span className="font-bold uppercase tracking-wider text-[11px]">Novo Recurso</span>
          </Button>
        )}
      </motion.div>

      {Object.keys(quickLinks).length > 0 && (
        <div className="space-y-6">
          <h2 className="text-xl font-bold tracking-tight text-foreground">Acesso Rápido</h2>
          <motion.div
            variants={container}
            initial="hidden"
            animate="show"
            className="grid gap-4 md:grid-cols-2"
          >
            {[
              { titulo: "Área de Membros", icone: "📚", url: quickLinks.area_membros },
              { titulo: "Suporte (CS)", icone: "💬", url: clientSc ? quickLinks[`suporte_${clientSc.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '')}`] : '' },
              { titulo: "Grupo de Avisos", icone: "📢", url: quickLinks.grupo_avisos },
            ].filter(l => l.url).map(link => (
              <motion.div key={link.titulo} variants={item}>
                <a href={link.url} target="_blank" rel="noopener noreferrer" className="block">
                  <Card className="group overflow-hidden hover:border-primary/30 transition-all duration-300 cursor-pointer">
                    <CardContent className="flex items-center justify-between p-5">
                      <div className="flex items-center gap-4">
                        <span className="text-3xl">{link.icone}</span>
                        <span className="text-lg font-bold tracking-tight text-foreground">{link.titulo}</span>
                      </div>
                      <ExternalLink className="size-5 text-muted-foreground group-hover:text-primary transition-colors" />
                    </CardContent>
                  </Card>
                </a>
              </motion.div>
            ))}
          </motion.div>
        </div>
      )}

      {Object.keys(grouped).length === 0 && (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <div className="bg-muted/20 p-6 rounded-2xl border border-border mb-6">
            <BookOpen className="size-10 text-muted-foreground" />
          </div>
          <p className="text-muted-foreground font-medium">Nenhum recurso disponível no momento.</p>
        </div>
      )}

      {Object.entries(grouped).map(([categoria, items]) => (
        <div key={categoria} className="space-y-6">
          <h2 className="text-xl font-bold tracking-tight text-foreground">{categoria}</h2>
          <motion.div
            variants={container}
            initial="hidden"
            animate="show"
            className="grid gap-4 md:grid-cols-2"
          >
            {items.map(recurso => (
              <motion.div key={recurso.id} variants={item}>
                <a
                  href={recurso.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={`block ${!recurso.ativo ? 'opacity-50' : ''}`}
                >
                  <Card className="group overflow-hidden hover:border-primary/30 transition-all duration-300 cursor-pointer">
                    <CardContent className="flex items-center justify-between p-5">
                      <div className="flex items-center gap-4">
                        <span className="text-3xl">{recurso.icone}</span>
                        <span className="text-lg font-bold tracking-tight text-foreground">{recurso.titulo}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        {isAdmin && (
                          <>
                            {!recurso.ativo && (
                              <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mr-2">Oculto</span>
                            )}
                            <Button
                              variant="ghost"
                              size="icon"
                              className="size-8 rounded-lg hover:bg-muted/50"
                              onClick={(e) => { e.preventDefault(); e.stopPropagation(); openEdit(recurso) }}
                            >
                              <Edit3 className="size-3.5 text-muted-foreground" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="size-8 rounded-lg hover:bg-destructive/10 hover:text-destructive"
                              onClick={(e) => { e.preventDefault(); e.stopPropagation(); handleDelete(recurso) }}
                            >
                              <Trash2 className="size-3.5" />
                            </Button>
                          </>
                        )}
                        {!isAdmin && (
                          <ExternalLink className="size-5 text-muted-foreground group-hover:text-primary transition-colors" />
                        )}
                      </div>
                    </CardContent>
                  </Card>
                </a>
              </motion.div>
            ))}
          </motion.div>
        </div>
      ))}

      <Sheet open={showSheet} onOpenChange={(open) => { if (!open) setShowSheet(false) }}>
        <SheetContent side="right" className="w-full sm:max-w-md p-0 flex flex-col bg-background border-l border-border">
          <SheetHeader className="p-6 border-b border-border">
            <SheetTitle className="text-lg font-bold text-foreground">
              {editingRecurso ? 'Editar Recurso' : 'Novo Recurso'}
            </SheetTitle>
          </SheetHeader>
          <div className="flex-1 overflow-y-auto p-6 space-y-6">
            <div className="space-y-2">
              <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Título</Label>
              <Input
                className="h-11 rounded-xl"
                placeholder="Ex: Galdino SDR"
                value={form.titulo}
                onChange={(e) => setForm(prev => ({ ...prev, titulo: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">URL</Label>
              <Input
                className="h-11 rounded-xl"
                placeholder="https://..."
                value={form.url}
                onChange={(e) => setForm(prev => ({ ...prev, url: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Ícone (Emoji)</Label>
              <div className="flex items-center gap-3">
                <Input
                  className="h-11 rounded-xl flex-1"
                  placeholder="🔗"
                  value={form.icone}
                  onChange={(e) => setForm(prev => ({ ...prev, icone: e.target.value }))}
                />
                <div className="flex items-center justify-center size-11 rounded-xl bg-muted/20 border border-border text-2xl">
                  {form.icone}
                </div>
              </div>
            </div>
            <div className="space-y-2">
              <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Categoria</Label>
              <Input
                className="h-11 rounded-xl"
                placeholder="Ex: Agentes de IA"
                value={form.categoria}
                onChange={(e) => setForm(prev => ({ ...prev, categoria: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Ordem</Label>
              <Input
                type="number"
                className="h-11 rounded-xl"
                value={form.ordem}
                onChange={(e) => setForm(prev => ({ ...prev, ordem: Number(e.target.value) }))}
              />
            </div>
            <div className="space-y-2">
              <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Visibilidade</Label>
              <Select value={form.ativo ? 'true' : 'false'} onValueChange={(v) => setForm(prev => ({ ...prev, ativo: v === 'true' }))}>
                <SelectTrigger className="h-11 rounded-xl border-border bg-background">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="true">Visível para clientes</SelectItem>
                  <SelectItem value="false">Oculto (só admin)</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <SheetFooter className="p-6 border-t border-border">
            <Button
              disabled={saving || !form.titulo || !form.url || !form.categoria}
              className="w-full h-11 rounded-xl font-bold uppercase tracking-wider text-xs"
              onClick={handleSave}
            >
              {saving ? 'Salvando...' : 'Salvar'}
            </Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>
    </div>
  )
}
