// Links Importantes — guia de ferramentas e acessos do programa.
// v2: busca + filtro por categoria, favoritos ("Meus atalhos"), recomendação
// pela etapa do Método, descrição/preço por recurso, favicon real (fallback
// emoji) e contador de cliques (registrado via RPC; total visível só p/ admin).
import { useEffect, useMemo, useState } from "react"
import { supabase } from "@/lib/supabase"
import { useAuth } from "@/lib/auth-context"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
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
  SearchIcon as Search,
  StarIcon as Star,
  TrendingUpIcon as TrendingUp,
} from "@/components/ui/icons"
import type { Session } from "@supabase/supabase-js"
import { motion } from "framer-motion"
import { PageHeader } from "@/components/layout/page-header"
import { ETAPAS_METODO, type EtapaMetodo, type SinalEtapa } from "@/data/etapas-metodo"

interface Recurso {
  id: string
  titulo: string
  url: string
  icone: string
  categoria: string
  ordem: number
  ativo: boolean
  criado_em: string
  descricao: string | null
  preco: string | null
  etapas: number[]
  cliques: number
  favorito: boolean
}

interface RecursosPageProps {
  session?: Session
  clientId?: string
  forceAdmin?: boolean
}

interface FormState {
  titulo: string
  url: string
  icone: string
  categoria: string
  ordem: number
  ativo: boolean
  descricao: string
  preco: string
  etapas: number[]
}

const EMPTY_FORM: FormState = { titulo: '', url: '', icone: '🔗', categoria: '', ordem: 0, ativo: true, descricao: '', preco: '', etapas: [] }

const PRECOS: Record<string, { label: string; classe: string }> = {
  gratis:   { label: "Grátis",   classe: "border-primary/40 bg-primary/10 text-primary" },
  freemium: { label: "Freemium", classe: "border-sky-500/40 bg-sky-500/10 text-sky-400" },
  pago:     { label: "Pago",     classe: "border-amber-500/40 bg-amber-500/10 text-amber-400" },
}

// Rótulos curtos das etapas do Método (pro formulário admin e chips).
const ETAPAS_CURTAS: Record<number, string> = {
  1: "Guardião", 2: "Inteligência", 3: "Gargalos", 4: "Engenharia", 5: "Co-Pilotos", 6: "Sistemas", 7: "Arsenal",
}

// Favicon oficial do site (só links externos); emoji continua como fallback.
function faviconDe(url: string): string | null {
  try {
    const u = new URL(url)
    if (u.protocol !== "http:" && u.protocol !== "https:") return null
    return `https://www.google.com/s2/favicons?domain=${u.hostname}&sz=64`
  } catch {
    return null
  }
}

function IconeRecurso({ recurso }: { recurso: Recurso }) {
  const [erro, setErro] = useState(false)
  const favicon = faviconDe(recurso.url)
  if (!favicon || erro) return <span className="text-3xl shrink-0">{recurso.icone}</span>
  return (
    <span className="flex items-center justify-center size-10 rounded-xl bg-muted/20 border border-border shrink-0 overflow-hidden">
      <img src={favicon} alt="" className="size-6" onError={() => setErro(true)} />
    </span>
  )
}

export default function RecursosPage({ session, clientId, forceAdmin }: RecursosPageProps) {
  const { isAdmin: isAdminCtx } = useAuth()
  const isAdmin = forceAdmin ?? isAdminCtx
  const uid = session?.user?.id            // dono dos favoritos (auth)
  const cid = clientId || session?.user?.id // dono da jornada (etapa recomendada)
  const [recursos, setRecursos] = useState<Recurso[]>([])
  const [loading, setLoading] = useState(true)
  const [showSheet, setShowSheet] = useState(false)
  const [editingRecurso, setEditingRecurso] = useState<Recurso | null>(null)
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState<FormState>(EMPTY_FORM)
  const [quickLinks, setQuickLinks] = useState<Record<string, string>>({})
  const [clientSc, setClientSc] = useState<string | null>(null)
  const [busca, setBusca] = useState("")
  const [categoriaAtiva, setCategoriaAtiva] = useState("todos")
  const [minhaEtapa, setMinhaEtapa] = useState<EtapaMetodo | null>(null)

  useEffect(() => {
    async function init() {
      let query = supabase
        .from('recursos_programa')
        .select('*, cliques:recursos_cliques(count)')
        .order('categoria', { ascending: true })
        .order('ordem', { ascending: true })

      if (!isAdmin) {
        query = query.eq('ativo', true)
      }

      const [{ data: recs }, favRes] = await Promise.all([
        query,
        uid
          ? supabase.from('recursos_favoritos').select('id_recurso').eq('id_cliente', uid)
          : Promise.resolve({ data: [] as { id_recurso: string }[] }),
      ])
      const favoritos = new Set((favRes.data ?? []).map((f: { id_recurso: string }) => f.id_recurso))
      setRecursos((recs ?? []).map((r: any) => ({
        ...r,
        etapas: Array.isArray(r.etapas) ? r.etapas : [],
        cliques: r.cliques?.[0]?.count ?? 0,
        favorito: favoritos.has(r.id),
      })))
      setLoading(false)
    }

    init()

    // Links configuráveis + SC do cliente (Acesso Rápido)
    if (cid) {
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
        .eq('id_cliente', cid)
        .maybeSingle()
        .then(({ data }) => {
          if (data) setClientSc(data.sc ?? null)
        })
    }
  }, [session, isAdmin])

  // Etapa atual da jornada (só cliente): primeira etapa sem conclusão manual
  // nem sinal automático — mesma regra da Minha Jornada.
  useEffect(() => {
    if (isAdmin || !cid) return
    let cancelled = false
    async function etapaAtual() {
      const cnt = (t: string, col = "id") => supabase.from(t).select(col, { count: "exact", head: true }).eq("id_cliente", cid)
      const [etapasRes, g, a, ga, cp, si, ec, rg, rm, rb] = await Promise.all([
        supabase.from("cliente_etapas_metodo").select("etapa, concluida").eq("id_cliente", cid),
        cnt("metodo_guardioes"), cnt("metodo_areas"), cnt("metodo_gargalos"),
        cnt("metodo_copilotos"), cnt("metodo_sistemas"), cnt("metodo_economias"),
        cnt("reunioes_galdino", "id_unico"), cnt("reunioes_mentoria_new", "id_unico"), cnt("reunioes_blackcrm", "id_unico"),
      ])
      if (cancelled) return
      const manual = new Set<number>((etapasRes.data ?? []).filter((r: any) => r.concluida).map((r: any) => r.etapa))
      const sinais = new Set<SinalEtapa>()
      if ((g.count ?? 0) > 0) sinais.add("guardiao")
      if ((a.count ?? 0) > 0) sinais.add("areas")
      if ((ga.count ?? 0) > 0) sinais.add("gargalos")
      if ((cp.count ?? 0) > 0) sinais.add("copilotos")
      if ((si.count ?? 0) > 0) sinais.add("sistemas")
      if ((ec.count ?? 0) > 0) sinais.add("economias")
      if (((rg.count ?? 0) + (rm.count ?? 0) + (rb.count ?? 0)) > 0) sinais.add("reunioes")
      const atual = ETAPAS_METODO.find(e => !manual.has(e.numero) && !sinais.has(e.sinal)) ?? null
      setMinhaEtapa(atual)
    }
    etapaAtual()
    return () => { cancelled = true }
  }, [isAdmin, cid])

  function registrarClique(r: Recurso) {
    // Fire-and-forget: não atrasa a navegação do cliente.
    supabase.rpc('recurso_registrar_clique', { p_recurso: r.id }).then(() => {})
    if (isAdmin) setRecursos(prev => prev.map(x => (x.id === r.id ? { ...x, cliques: x.cliques + 1 } : x)))
  }

  async function toggleFavorito(r: Recurso) {
    if (!uid) return
    const marcar = !r.favorito
    setRecursos(prev => prev.map(x => (x.id === r.id ? { ...x, favorito: marcar } : x)))
    if (marcar) {
      await supabase.from('recursos_favoritos').insert({ id_recurso: r.id, id_cliente: uid })
    } else {
      await supabase.from('recursos_favoritos').delete().eq('id_recurso', r.id).eq('id_cliente', uid)
    }
  }

  function openNew() {
    setEditingRecurso(null)
    setForm(EMPTY_FORM)
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
      descricao: recurso.descricao ?? '',
      preco: recurso.preco ?? '',
      etapas: recurso.etapas,
    })
    setShowSheet(true)
  }

  async function handleDelete(recurso: Recurso) {
    await supabase.from('recursos_programa').delete().eq('id', recurso.id)
    setRecursos(prev => prev.filter(r => r.id !== recurso.id))
  }

  async function handleSave() {
    setSaving(true)
    try {
      const payload = {
        titulo: form.titulo,
        url: form.url,
        icone: form.icone,
        categoria: form.categoria,
        ordem: form.ordem,
        ativo: form.ativo,
        descricao: form.descricao.trim() || null,
        preco: form.preco || null,
        etapas: form.etapas,
      }
      if (editingRecurso) {
        const { data, error } = await supabase
          .from('recursos_programa')
          .update(payload)
          .eq('id', editingRecurso.id)
          .select()
          .single()
        if (!error && data) {
          setRecursos(prev => prev.map(r => r.id === editingRecurso.id ? { ...r, ...data, etapas: data.etapas ?? [] } : r))
          setShowSheet(false)
        }
      } else {
        const { data, error } = await supabase
          .from('recursos_programa')
          .insert([payload])
          .select()
          .single()
        if (!error && data) {
          setRecursos(prev => [...prev, { ...data, etapas: data.etapas ?? [], cliques: 0, favorito: false }])
          setShowSheet(false)
        }
      }
    } catch (err) {
      console.error('handleSave exception:', err)
    }
    setSaving(false)
  }

  // ---- filtros -------------------------------------------------------------
  const categorias = useMemo(() => {
    const contagem = new Map<string, number>()
    recursos.forEach(r => contagem.set(r.categoria, (contagem.get(r.categoria) ?? 0) + 1))
    return [...contagem.entries()].sort((a, b) => a[0].localeCompare(b[0]))
  }, [recursos])

  const filtrados = useMemo(() => {
    const q = busca.trim().toLowerCase()
    return recursos.filter(r => {
      if (categoriaAtiva !== "todos" && r.categoria !== categoriaAtiva) return false
      if (!q) return true
      return [r.titulo, r.descricao ?? "", r.categoria].some(s => s.toLowerCase().includes(q))
    })
  }, [recursos, busca, categoriaAtiva])

  const semFiltro = busca.trim() === "" && categoriaAtiva === "todos"
  const meusAtalhos = recursos.filter(r => r.favorito)
  const recomendados = minhaEtapa ? recursos.filter(r => r.etapas.includes(minhaEtapa.numero)) : []

  const grouped = filtrados.reduce<Record<string, Recurso[]>>((acc, r) => {
    const key = r.categoria
    if (!acc[key]) acc[key] = []
    acc[key].push(r)
    return acc
  }, {})

  const container = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: { staggerChildren: 0.06 }
    }
  }

  const item = {
    hidden: { y: 20, opacity: 0 },
    show: { y: 0, opacity: 1, transition: { duration: 0.5, ease: "easeOut" as const } }
  }

  function CardRecurso({ recurso }: { recurso: Recurso }) {
    const precoInfo = recurso.preco ? PRECOS[recurso.preco] : null
    return (
      <a
        href={recurso.url}
        target="_blank"
        rel="noopener noreferrer"
        onClick={() => registrarClique(recurso)}
        className={`block h-full ${!recurso.ativo ? 'opacity-50' : ''}`}
      >
        <Card className="group h-full overflow-hidden hover:border-primary/30 transition-all duration-300 cursor-pointer">
          <CardContent className="flex items-start justify-between gap-3 p-5">
            <div className="flex items-start gap-4 min-w-0">
              <IconeRecurso recurso={recurso} />
              <div className="min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-base font-bold tracking-tight text-foreground leading-tight">{recurso.titulo}</span>
                  {precoInfo && (
                    <span className={`rounded-md border px-1.5 py-0 text-[9px] font-bold uppercase tracking-wider ${precoInfo.classe}`}>
                      {precoInfo.label}
                    </span>
                  )}
                </div>
                {recurso.descricao && (
                  <p className="text-[12px] font-medium text-muted-foreground leading-snug mt-1 line-clamp-2">{recurso.descricao}</p>
                )}
                {isAdmin && recurso.cliques > 0 && (
                  <p className="text-[10px] font-bold text-muted-foreground/70 mt-1.5 flex items-center gap-1">
                    <TrendingUp className="size-3" />
                    {recurso.cliques} {recurso.cliques === 1 ? 'clique' : 'cliques'}
                  </p>
                )}
              </div>
            </div>
            <div className="flex items-center gap-1 shrink-0">
              {uid && (
                <Button
                  variant="ghost"
                  size="icon"
                  aria-label={recurso.favorito ? "Remover dos atalhos" : "Adicionar aos atalhos"}
                  aria-pressed={recurso.favorito}
                  className="size-8 rounded-lg hover:bg-muted/50"
                  onClick={(e) => { e.preventDefault(); e.stopPropagation(); toggleFavorito(recurso) }}
                >
                  <Star className={`size-4 ${recurso.favorito ? 'text-primary [&_path]:fill-current' : 'text-muted-foreground'}`} />
                </Button>
              )}
              {isAdmin ? (
                <>
                  {!recurso.ativo && (
                    <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mr-1">Oculto</span>
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
              ) : (
                <ExternalLink className="size-4 text-muted-foreground group-hover:text-primary transition-colors mt-1" />
              )}
            </div>
          </CardContent>
        </Card>
      </a>
    )
  }

  if (loading) {
    return <div className="grid gap-6 md:grid-cols-2">
      {[1, 2, 3, 4].map(i => <Card key={i} className="h-20 animate-pulse bg-card/40" />)}
    </div>
  }

  return (
    <div className="space-y-10 pb-10">
      <PageHeader
        title="Links Importantes"
        description="Ferramentas e acessos disponíveis para sua operação."
        action={isAdmin && (
          <Button className="h-12 gap-2 rounded-xl px-6 shadow-xl shadow-primary/10" onClick={openNew}>
            <Plus className="size-5" />
            <span className="font-bold uppercase tracking-wider text-[11px]">Novo Recurso</span>
          </Button>
        )}
      />

      {/* Busca + filtro por categoria */}
      <div className="space-y-4">
        <div className="relative max-w-md">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
          <Input
            className="h-11 rounded-xl pl-10"
            placeholder="Buscar ferramenta ou acesso..."
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
          />
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <ChipCategoria ativo={categoriaAtiva === "todos"} onClick={() => setCategoriaAtiva("todos")}>
            Todos <span className="opacity-60">· {recursos.length}</span>
          </ChipCategoria>
          {categorias.map(([nome, qtd]) => (
            <ChipCategoria key={nome} ativo={categoriaAtiva === nome} onClick={() => setCategoriaAtiva(nome)}>
              {nome} <span className="opacity-60">· {qtd}</span>
            </ChipCategoria>
          ))}
        </div>
      </div>

      {/* Meus atalhos (favoritos) */}
      {semFiltro && meusAtalhos.length > 0 && (
        <div className="space-y-6">
          <h2 className="text-xl font-bold tracking-tight text-foreground flex items-center gap-2">
            <Star className="size-5 text-primary [&_path]:fill-current" />
            Meus Atalhos
          </h2>
          <motion.div variants={container} initial="hidden" animate="show" className="grid gap-4 md:grid-cols-2">
            {meusAtalhos.map(r => (
              <motion.div key={r.id} variants={item}><CardRecurso recurso={r} /></motion.div>
            ))}
          </motion.div>
        </div>
      )}

      {/* Recomendado pela etapa do Método */}
      {semFiltro && minhaEtapa && recomendados.length > 0 && (
        <div className="space-y-6">
          <div>
            <h2 className="text-xl font-bold tracking-tight text-foreground">Recomendado para a sua etapa</h2>
            <p className="text-[13px] font-medium text-muted-foreground mt-1">
              Você está na <span className="text-primary font-bold">Etapa {minhaEtapa.numero} — {minhaEtapa.titulo}</span>. Estas ferramentas aceleram exatamente esse trabalho.
            </p>
          </div>
          <motion.div variants={container} initial="hidden" animate="show" className="grid gap-4 md:grid-cols-2">
            {recomendados.map(r => (
              <motion.div key={r.id} variants={item}><CardRecurso recurso={r} /></motion.div>
            ))}
          </motion.div>
        </div>
      )}

      {/* Acesso rápido (links do programa) */}
      {semFiltro && Object.keys(quickLinks).length > 0 && (
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
          <p className="text-muted-foreground font-medium">
            {recursos.length === 0 ? 'Nenhum recurso disponível no momento.' : 'Nada encontrado com esse filtro.'}
          </p>
          {recursos.length > 0 && (
            <button
              onClick={() => { setBusca(""); setCategoriaAtiva("todos") }}
              className="text-[13px] font-bold text-primary hover:underline mt-2"
            >
              Limpar busca e filtros
            </button>
          )}
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
              <motion.div key={recurso.id} variants={item}><CardRecurso recurso={recurso} /></motion.div>
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
              <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Descrição (1 linha)</Label>
              <Textarea
                className="rounded-xl min-h-16 text-[13px] resize-none"
                placeholder="O que essa ferramenta resolve pro cliente?"
                value={form.descricao}
                onChange={(e) => setForm(prev => ({ ...prev, descricao: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Preço</Label>
              <Select value={form.preco || 'nenhum'} onValueChange={(v) => setForm(prev => ({ ...prev, preco: v === 'nenhum' ? '' : v }))}>
                <SelectTrigger className="h-11 rounded-xl border-border bg-background">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="nenhum">Sem etiqueta</SelectItem>
                  <SelectItem value="gratis">Grátis</SelectItem>
                  <SelectItem value="freemium">Freemium</SelectItem>
                  <SelectItem value="pago">Pago</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Etapas do Método (recomendação)</Label>
              <div className="flex items-center gap-2 flex-wrap">
                {ETAPAS_METODO.map(e => {
                  const ativo = form.etapas.includes(e.numero)
                  return (
                    <button
                      key={e.numero}
                      type="button"
                      aria-pressed={ativo}
                      onClick={() => setForm(prev => ({
                        ...prev,
                        etapas: ativo ? prev.etapas.filter(n => n !== e.numero) : [...prev.etapas, e.numero].sort((x, y) => x - y),
                      }))}
                      className={`rounded-lg border px-2.5 py-1 text-[11px] font-bold tracking-tight transition-colors ${
                        ativo
                          ? "border-primary/50 bg-primary/10 text-primary"
                          : "border-border text-muted-foreground hover:border-primary/30 hover:text-foreground"
                      }`}
                    >
                      {e.numero} · {ETAPAS_CURTAS[e.numero]}
                    </button>
                  )
                })}
              </div>
            </div>
            <div className="space-y-2">
              <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Ícone (Emoji — fallback do favicon)</Label>
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

// Chip de filtro por categoria — mesmo visual dos filtros de Estudos de Caso.
function ChipCategoria({ ativo, onClick, children }: { ativo: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={ativo}
      className={`rounded-xl border px-3.5 py-1.5 text-[12px] font-bold tracking-tight transition-colors ${
        ativo
          ? "border-primary/50 bg-primary/10 text-primary"
          : "border-border text-muted-foreground hover:border-primary/30 hover:text-foreground"
      }`}
    >
      {children}
    </button>
  )
}
