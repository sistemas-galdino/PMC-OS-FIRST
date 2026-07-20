// Comunidade → Novidades: FEED da comunidade. O dono publica os posts (Avisos,
// Insights, Ofertas...); os clientes curtem e comentam (com respostas). Cada post
// abre num modal com o conteúdo completo e a thread de comentários.
import { useEffect, useMemo, useState } from "react"
import { useNavigate, useSearchParams } from "react-router-dom"
import { toast } from "sonner"
import { supabase } from "@/lib/supabase"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Textarea } from "@/components/ui/textarea"
import { Dialog, DialogContent } from "@/components/ui/dialog"
import {
  MegaphoneIcon as Megaphone,
  MessageCircleIcon as MessageCircle,
  ThumbsUpIcon as ThumbsUp,
  Link2Icon as Link2,
  TrophyIcon as Trophy,
  FlagIcon as Pin,
  SendIcon as Send,
  Trash2Icon as Trash2,
  StarIcon as Star,
  TrendingUpIcon as TrendingUp,
  ChevronRightIcon as ChevronRight,
} from "@/components/ui/icons"
import type { Session } from "@supabase/supabase-js"
import { motion } from "framer-motion"
import { PageHeader } from "@/components/layout/page-header"
import ReactMarkdown from "react-markdown"
import remarkGfm from "remark-gfm"
import { CATEGORIAS, categoria as catInfo } from "@/data/novidades-categorias"

interface Novidade {
  id: string
  titulo: string
  resumo: string | null
  conteudo: string | null
  data_publicacao: string
  destaque: boolean
  autor: string | null
  autor_avatar_url: string | null
  categoria: string
  imagem_url: string | null
  likeCount: number
  comentarioCount: number
  curtido: boolean
}

interface TopGuardiao { posicao: number; guardiao_nome: string | null; empresa: string | null; pontos: number; oculto: boolean }

interface Comentario {
  id: string
  parent_id: string | null
  id_autor: string
  autor_nome: string | null
  autor_avatar_url: string | null
  is_admin: boolean
  texto: string
  created_at: string
}

interface Me { id: string; nome: string; avatar: string | null; isAdmin: boolean }

interface NovidadesPageProps { session?: Session; clientId?: string }

function iniciais(nome: string): string {
  const p = (nome || "?").trim().split(/\s+/)
  return ((p[0]?.[0] ?? "") + (p[1]?.[0] ?? "")).toUpperCase() || "?"
}

function tempoRelativo(iso: string): string {
  const d = new Date(iso)
  const diff = (Date.now() - d.getTime()) / 1000
  if (diff < 60) return "agora"
  if (diff < 3600) return `há ${Math.floor(diff / 60)} min`
  if (diff < 86400) return `há ${Math.floor(diff / 3600)} h`
  if (diff < 86400 * 30) return `há ${Math.floor(diff / 86400)} d`
  return d.toLocaleDateString("pt-BR", { day: "2-digit", month: "short" })
}

function Avatar({ nome, url, size = "size-10", ring }: { nome: string; url?: string | null; size?: string; ring?: boolean }) {
  if (url) return <img src={url} alt={nome} className={`${size} rounded-full object-cover shrink-0 ${ring ? "ring-2 ring-primary/40" : ""}`} />
  return (
    <div className={`${size} rounded-full bg-primary/15 text-primary flex items-center justify-center font-bold text-[13px] shrink-0 ${ring ? "ring-2 ring-primary/40" : ""}`}>
      {iniciais(nome)}
    </div>
  )
}

function TagCategoria({ slug }: { slug: string }) {
  const c = catInfo(slug)
  return (
    <span className={`inline-flex items-center gap-1 rounded-lg border px-2 py-0.5 text-[10px] font-bold ${c.cor}`}>
      <span>{c.emoji}</span>{c.label}
    </span>
  )
}

export default function NovidadesPage(_props: NovidadesPageProps) {
  const [novidades, setNovidades] = useState<Novidade[]>([])
  const [loading, setLoading] = useState(true)
  const [me, setMe] = useState<Me | null>(null)
  const [filtro, setFiltro] = useState<string>("todos")
  const [searchParams, setSearchParams] = useSearchParams()
  const abertaId = searchParams.get("post")

  // comentários do post aberto
  const [comentarios, setComentarios] = useState<Comentario[]>([])
  const [loadingCom, setLoadingCom] = useState(false)
  const [novoTexto, setNovoTexto] = useState("")
  const [replyTo, setReplyTo] = useState<{ id: string; nome: string } | null>(null)
  const [enviando, setEnviando] = useState(false)
  const [topGuardioes, setTopGuardioes] = useState<TopGuardiao[]>([])
  // Última visita ao feed (localStorage) — posts publicados depois ganham "NOVO".
  const [ultimaVisita] = useState<string | null>(() => {
    const prev = localStorage.getItem("novidades_ultima_visita")
    localStorage.setItem("novidades_ultima_visita", new Date().toISOString().slice(0, 10))
    return prev
  })
  const navigate = useNavigate()

  async function resolverMe(): Promise<Me | null> {
    const { data: { session } } = await supabase.auth.getSession()
    const uid = session?.user?.id
    const email = session?.user?.email
    if (!uid) return null
    if (email) {
      const { data: mentor } = await supabase.from("mentores").select("nome").eq("email", email).maybeSingle()
      if (mentor) return { id: uid, nome: mentor.nome || "Equipe PMC", avatar: null, isAdmin: true }
    }
    const { data: cli } = await supabase
      .from("clientes_entrada_new")
      .select("nome_cliente_formatado, avatar_url")
      .eq("id_cliente", uid)
      .maybeSingle()
    return { id: uid, nome: cli?.nome_cliente_formatado || "Você", avatar: cli?.avatar_url ?? null, isAdmin: false }
  }

  async function carregarFeed(meResolved: Me | null) {
    const [{ data }, likesRes] = await Promise.all([
      supabase
        .from("comunidade_novidades")
        .select("*, likes:comunidade_novidades_likes(count), comentarios:comunidade_novidades_comentarios(count)")
        .eq("publicado", true)
        .order("destaque", { ascending: false })
        .order("data_publicacao", { ascending: false }),
      meResolved
        ? supabase.from("comunidade_novidades_likes").select("id_novidade").eq("id_cliente", meResolved.id)
        : Promise.resolve({ data: [] as { id_novidade: string }[] }),
    ])
    const curtidas = new Set((likesRes.data ?? []).map((l: { id_novidade: string }) => l.id_novidade))
    setNovidades(
      (data ?? []).map((n: any) => ({
        id: n.id,
        titulo: n.titulo,
        resumo: n.resumo,
        conteudo: n.conteudo,
        data_publicacao: n.data_publicacao,
        destaque: n.destaque,
        autor: n.autor,
        autor_avatar_url: n.autor_avatar_url,
        categoria: n.categoria || "avisos",
        imagem_url: n.imagem_url ?? null,
        likeCount: n.likes?.[0]?.count ?? 0,
        comentarioCount: n.comentarios?.[0]?.count ?? 0,
        curtido: curtidas.has(n.id),
      }))
    )
    setLoading(false)
  }

  useEffect(() => {
    let cancelled = false
    async function init() {
      const m = await resolverMe()
      if (cancelled) return
      setMe(m)
      await carregarFeed(m)
      // Guardiões do mês (top 3 públicos) — cross-link com o ranking.
      const { data: rk } = await supabase.rpc("ranking_guardioes", { periodo: "mes" })
      if (!cancelled) setTopGuardioes(((rk ?? []) as TopGuardiao[]).filter((r) => !r.oculto).slice(0, 3))
    }
    init()
    return () => { cancelled = true }
  }, [])

  const aberta = useMemo(() => novidades.find((n) => n.id === abertaId) ?? null, [novidades, abertaId])

  // Carrega comentários quando um post abre
  useEffect(() => {
    if (!abertaId) { setComentarios([]); return }
    let cancelled = false
    setLoadingCom(true)
    supabase
      .from("comunidade_novidades_comentarios")
      .select("*")
      .eq("id_novidade", abertaId)
      .order("created_at", { ascending: true })
      .then(({ data }) => {
        if (cancelled) return
        setComentarios(data ?? [])
        setLoadingCom(false)
      })
    return () => { cancelled = true }
  }, [abertaId])

  const feedFiltrado = useMemo(
    () => (filtro === "todos" ? novidades : novidades.filter((n) => n.categoria === filtro)),
    [novidades, filtro]
  )

  const totalComentarios = useMemo(() => novidades.reduce((a, n) => a + n.comentarioCount, 0), [novidades])
  const totalCurtidas = useMemo(() => novidades.reduce((a, n) => a + n.likeCount, 0), [novidades])
  const emAlta = useMemo(
    () => [...novidades].sort((a, b) => (b.likeCount + b.comentarioCount) - (a.likeCount + a.comentarioCount)).slice(0, 3),
    [novidades]
  )
  const fixados = useMemo(() => novidades.filter((n) => n.destaque), [novidades])

  async function toggleLike(n: Novidade) {
    if (!me) return
    const curtido = !n.curtido
    // otimista
    setNovidades((prev) => prev.map((x) => (x.id === n.id ? { ...x, curtido, likeCount: x.likeCount + (curtido ? 1 : -1) } : x)))
    if (curtido) {
      await supabase.from("comunidade_novidades_likes").insert({ id_novidade: n.id, id_cliente: me.id })
    } else {
      await supabase.from("comunidade_novidades_likes").delete().eq("id_novidade", n.id).eq("id_cliente", me.id)
    }
  }

  async function enviarComentario() {
    if (!me || !aberta || !novoTexto.trim()) return
    setEnviando(true)
    const payload = {
      id_novidade: aberta.id,
      parent_id: replyTo?.id ?? null,
      id_autor: me.id,
      autor_nome: me.nome,
      autor_avatar_url: me.avatar,
      is_admin: me.isAdmin,
      texto: novoTexto.trim(),
    }
    const { data, error } = await supabase.from("comunidade_novidades_comentarios").insert(payload).select().single()
    setEnviando(false)
    if (!error && data) {
      setComentarios((prev) => [...prev, data])
      setNovoTexto("")
      setReplyTo(null)
      setNovidades((prev) => prev.map((x) => (x.id === aberta.id ? { ...x, comentarioCount: x.comentarioCount + 1 } : x)))
    }
  }

  async function excluirComentario(c: Comentario) {
    await supabase.from("comunidade_novidades_comentarios").delete().eq("id", c.id)
    // remove o comentário e suas respostas
    setComentarios((prev) => prev.filter((x) => x.id !== c.id && x.parent_id !== c.id))
    if (aberta) setNovidades((prev) => prev.map((x) => (x.id === aberta.id ? { ...x, comentarioCount: Math.max(0, x.comentarioCount - 1) } : x)))
  }

  const topLevel = comentarios.filter((c) => !c.parent_id)
  const respostasDe = (id: string) => comentarios.filter((c) => c.parent_id === id)

  if (loading) {
    return (
      <div className="space-y-6 animate-pulse max-w-3xl">
        <div className="h-20 bg-card/40 rounded-2xl" />
        {[1, 2, 3].map((i) => <div key={i} className="h-40 bg-card/40 rounded-2xl" />)}
      </div>
    )
  }

  return (
    <div className="space-y-6 pb-10">
      {/* Cabeçalho */}
      <PageHeader
        title="Novidades"
        description="Atualizações e anúncios da comunidade — curta e comente."
      />

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px] lg:items-start">
        {/* Coluna principal — feed */}
        <div className="space-y-5 min-w-0">
          {/* Filtros de categoria */}
          <div className="flex items-center gap-2 flex-wrap">
            <button
              onClick={() => setFiltro("todos")}
              className={`rounded-xl px-3 py-1.5 text-[12px] font-bold transition-all ${filtro === "todos" ? "bg-primary text-primary-foreground" : "bg-muted/20 text-muted-foreground hover:text-foreground border border-border"}`}
            >
              Todos
            </button>
            {CATEGORIAS.map((c) => {
              const ativo = filtro === c.slug
              const n = novidades.filter((x) => x.categoria === c.slug).length
              if (n === 0 && !ativo) return null
              return (
                <button
                  key={c.slug}
                  onClick={() => setFiltro(c.slug)}
                  className={`rounded-xl px-3 py-1.5 text-[12px] font-bold transition-all border ${ativo ? "bg-primary text-primary-foreground border-primary" : "bg-muted/20 text-muted-foreground hover:text-foreground border-border"}`}
                >
                  {c.emoji} {c.label}
                </button>
              )
            })}
          </div>

          {/* Feed */}
          {feedFiltrado.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 gap-3 text-center border border-dashed border-border rounded-2xl">
              <Megaphone className="size-8 text-muted-foreground/30" />
              <p className="text-sm font-medium text-muted-foreground">Nenhuma novidade nesta categoria ainda.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {feedFiltrado.map((n, i) => (
            <motion.div key={n.id} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}>
              <Card className={`overflow-hidden transition-all hover:border-primary/30 ${n.destaque ? "border-primary/30" : ""}`}>
                <CardContent className="p-5">
                  {/* topo: autor + pinned */}
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3 min-w-0">
                      <Avatar nome={n.autor || "Equipe PMC"} url={n.autor_avatar_url || "/galdino-foto.png"} />
                      <div className="min-w-0">
                        <p className="text-[13px] font-bold text-foreground truncate">{n.autor || "Equipe PMC"}</p>
                        <div className="flex items-center gap-2">
                          <span className="text-[11px] font-medium text-muted-foreground">
                            {new Date(n.data_publicacao + "T00:00:00").toLocaleDateString("pt-BR", { day: "2-digit", month: "short" })}
                          </span>
                          <TagCategoria slug={n.categoria} />
                          {ultimaVisita && n.data_publicacao > ultimaVisita && (
                            <Badge className="rounded-md bg-primary text-primary-foreground px-1.5 py-0 text-[9px] font-bold">NOVO</Badge>
                          )}
                        </div>
                      </div>
                    </div>
                    {n.destaque && (
                      <Badge variant="outline" className="rounded-lg border-primary/30 text-primary px-2 py-0.5 text-[10px] font-bold gap-1 shrink-0">
                        <Pin className="size-3" />
                        Fixado
                      </Badge>
                    )}
                  </div>

                  {/* corpo (clicável) */}
                  <button onClick={() => setSearchParams({ post: n.id })} className="text-left w-full mt-3 group">
                    {n.imagem_url && (
                      <div className="rounded-xl overflow-hidden border border-border/60 mb-3">
                        <img src={n.imagem_url} alt="" loading="lazy" className="w-full max-h-72 object-cover group-hover:scale-[1.01] transition-transform" />
                      </div>
                    )}
                    <h2 className="text-lg font-bold tracking-tight text-foreground leading-snug group-hover:text-primary transition-colors">{n.titulo}</h2>
                    {n.resumo && <p className="text-[13px] font-medium text-muted-foreground leading-relaxed line-clamp-2 mt-1">{n.resumo}</p>}
                  </button>

                  {/* engajamento */}
                  <div className="flex items-center gap-4 mt-4 pt-3 border-t border-border/50">
                    <button
                      onClick={() => toggleLike(n)}
                      className={`flex items-center gap-1.5 text-[13px] font-bold transition-colors ${n.curtido ? "text-primary" : "text-muted-foreground hover:text-foreground"}`}
                    >
                      <ThumbsUp className={`size-4 ${n.curtido ? "" : "opacity-70"}`} />
                      {n.likeCount}
                    </button>
                    <button
                      onClick={() => setSearchParams({ post: n.id, foco: "1" })}
                      className="flex items-center gap-1.5 text-[13px] font-bold text-muted-foreground hover:text-foreground transition-colors"
                    >
                      <MessageCircle className="size-4" />
                      {n.comentarioCount}
                    </button>
                    <span className="text-[11px] font-medium text-muted-foreground/60 ml-auto">{tempoRelativo(n.data_publicacao + "T00:00:00")}</span>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          ))}
            </div>
          )}
        </div>

        {/* Painel lateral */}
        <aside className="space-y-4 lg:sticky lg:top-6">
          {/* Comunidade PMC */}
          <Card className="border-primary/20 overflow-hidden">
            <div className="bg-gradient-to-br from-primary/15 to-transparent p-5 border-b border-border/50">
              <div className="flex items-center gap-3">
                <div className="bg-primary/15 p-2.5 rounded-xl shrink-0">
                  <Megaphone className="size-5 text-primary" />
                </div>
                <div>
                  <p className="text-sm font-bold tracking-tight text-foreground">Comunidade PMC</p>
                  <p className="text-[11px] font-medium text-muted-foreground">Fique por dentro de tudo</p>
                </div>
              </div>
            </div>
            <CardContent className="p-5">
              <div className="grid grid-cols-3 gap-2 text-center">
                {[
                  { v: novidades.length, l: "Posts" },
                  { v: totalComentarios, l: "Comentários" },
                  { v: totalCurtidas, l: "Curtidas" },
                ].map((s) => (
                  <div key={s.l}>
                    <p className="text-xl font-bold tracking-tight text-foreground">{s.v}</p>
                    <p className="text-[10px] font-medium text-muted-foreground">{s.l}</p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Guardiões do mês — cross-link com o ranking */}
          {topGuardioes.length > 0 && (
            <Card className="border-primary/20">
              <CardContent className="p-5">
                <p className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground flex items-center gap-1.5 mb-3">
                  <Trophy className="size-3.5 text-primary" />
                  Guardiões do mês
                </p>
                <div className="space-y-1">
                  {topGuardioes.map((g, i) => (
                    <div key={g.posicao} className="flex items-center gap-2.5 p-2 rounded-xl">
                      <span className="text-base shrink-0">{["🥇", "🥈", "🥉"][i]}</span>
                      <div className="min-w-0 flex-1">
                        <p className="text-[13px] font-bold text-foreground leading-snug truncate">{g.guardiao_nome || "Guardião não definido"}</p>
                        <p className="text-[10px] font-medium text-muted-foreground truncate">{g.empresa || "Empresa"}</p>
                      </div>
                      <span className="text-[12px] font-bold tabular-nums text-primary shrink-0">{g.pontos.toLocaleString("pt-BR")}</span>
                    </div>
                  ))}
                </div>
                <button
                  onClick={() => navigate("/ranking-guardioes")}
                  className="w-full mt-2 flex items-center justify-center gap-1 text-[11px] font-bold uppercase tracking-wider text-primary hover:underline"
                >
                  Ver ranking completo <ChevronRight className="size-3.5" />
                </button>
              </CardContent>
            </Card>
          )}

          {/* Em alta */}
          {emAlta.length > 0 && (
            <Card>
              <CardContent className="p-5">
                <p className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground flex items-center gap-1.5 mb-3">
                  <TrendingUp className="size-3.5 text-primary" />
                  Em alta
                </p>
                <div className="space-y-1">
                  {emAlta.map((n, i) => (
                    <button
                      key={n.id}
                      onClick={() => setSearchParams({ post: n.id })}
                      className="w-full flex items-start gap-3 p-2 rounded-xl hover:bg-muted/30 transition-colors text-left group"
                    >
                      <span className="text-base font-bold text-primary/60 w-5 shrink-0">{i + 1}</span>
                      <div className="min-w-0">
                        <p className="text-[13px] font-bold text-foreground leading-snug line-clamp-2 group-hover:text-primary transition-colors">{n.titulo}</p>
                        <p className="text-[10px] font-medium text-muted-foreground mt-0.5 flex items-center gap-2">
                          <span className="flex items-center gap-1"><ThumbsUp className="size-3" />{n.likeCount}</span>
                          <span className="flex items-center gap-1"><MessageCircle className="size-3" />{n.comentarioCount}</span>
                        </p>
                      </div>
                    </button>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Fixados */}
          {fixados.length > 0 && (
            <Card>
              <CardContent className="p-5">
                <p className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground flex items-center gap-1.5 mb-3">
                  <Pin className="size-3.5 text-primary" />
                  Fixados
                </p>
                <div className="space-y-1">
                  {fixados.slice(0, 4).map((n) => (
                    <button
                      key={n.id}
                      onClick={() => setSearchParams({ post: n.id })}
                      className="w-full flex items-center justify-between gap-2 p-2 rounded-xl hover:bg-muted/30 transition-colors text-left group"
                    >
                      <span className="text-[13px] font-medium text-foreground leading-snug line-clamp-1 group-hover:text-primary transition-colors">{n.titulo}</span>
                      <ChevronRight className="size-4 text-muted-foreground/50 shrink-0 group-hover:text-primary" />
                    </button>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </aside>
      </div>

      {/* Modal do post + comentários */}
      <Dialog open={!!aberta} onOpenChange={(o) => { if (!o) { setSearchParams({}, { replace: true }); setReplyTo(null); setNovoTexto("") } }}>
        <DialogContent className="sm:max-w-2xl p-0 gap-0 max-h-[90vh] flex flex-col overflow-hidden">
          {aberta && (
            <>
              {/* Post */}
              <div className="border-b border-border overflow-y-auto">
                {aberta.imagem_url && (
                  <img src={aberta.imagem_url} alt="" className="w-full max-h-80 object-cover" />
                )}
                <div className="p-6">
                <div className="flex items-center gap-3">
                  <Avatar nome={aberta.autor || "Equipe PMC"} url={aberta.autor_avatar_url || "/galdino-foto.png"} />
                  <div>
                    <p className="text-[13px] font-bold text-foreground">{aberta.autor || "Equipe PMC"}</p>
                    <div className="flex items-center gap-2">
                      <span className="text-[11px] font-medium text-muted-foreground">
                        {new Date(aberta.data_publicacao + "T00:00:00").toLocaleDateString("pt-BR", { day: "2-digit", month: "long", year: "numeric" })}
                      </span>
                      <TagCategoria slug={aberta.categoria} />
                      {aberta.destaque && <Star className="size-3.5 text-primary" />}
                    </div>
                  </div>
                </div>
                <h2 className="text-2xl font-bold tracking-tight text-foreground leading-tight mt-4">{aberta.titulo}</h2>
                <div className="prose prose-invert max-w-none text-[15px] leading-relaxed text-foreground/90 mt-3 [&_p]:my-2.5 [&_ul]:my-2.5 [&_li]:my-1 [&_strong]:text-foreground [&_a]:text-primary">
                  <ReactMarkdown remarkPlugins={[remarkGfm]}>{aberta.conteudo || aberta.resumo || ""}</ReactMarkdown>
                </div>
                <div className="flex items-center gap-4 mt-4">
                  <button
                    onClick={() => toggleLike(aberta)}
                    className={`flex items-center gap-1.5 text-[13px] font-bold transition-colors ${aberta.curtido ? "text-primary" : "text-muted-foreground hover:text-foreground"}`}
                  >
                    <ThumbsUp className="size-4" />
                    {aberta.likeCount} {aberta.likeCount === 1 ? "curtida" : "curtidas"}
                  </button>
                  <span className="flex items-center gap-1.5 text-[13px] font-bold text-muted-foreground">
                    <MessageCircle className="size-4" />
                    {aberta.comentarioCount} {aberta.comentarioCount === 1 ? "comentário" : "comentários"}
                  </span>
                  <button
                    onClick={() => {
                      navigator.clipboard.writeText(`${window.location.origin}/novidades?post=${aberta.id}`)
                      toast.success("Link do post copiado!")
                    }}
                    className="flex items-center gap-1.5 text-[13px] font-bold text-muted-foreground hover:text-primary transition-colors ml-auto"
                  >
                    <Link2 className="size-4" />
                    Copiar link
                  </button>
                </div>
                </div>
              </div>

              {/* Comentários */}
              <div className="flex-1 overflow-y-auto p-6 space-y-4 bg-muted/5">
                {loadingCom ? (
                  <div className="space-y-3">{[1, 2].map((i) => <div key={i} className="h-16 bg-card/40 rounded-xl animate-pulse" />)}</div>
                ) : topLevel.length === 0 ? (
                  <p className="text-[13px] font-medium text-muted-foreground text-center py-6">Seja o primeiro a comentar.</p>
                ) : (
                  topLevel.map((c) => (
                    <ComentarioItem key={c.id} c={c} me={me} onReply={() => setReplyTo({ id: c.id, nome: c.autor_nome || "" })} onDelete={() => excluirComentario(c)}>
                      {respostasDe(c.id).map((r) => (
                        <ComentarioItem key={r.id} c={r} me={me} isReply onReply={() => setReplyTo({ id: c.id, nome: r.autor_nome || "" })} onDelete={() => excluirComentario(r)} />
                      ))}
                    </ComentarioItem>
                  ))
                )}
              </div>

              {/* Composer */}
              <div className="p-4 border-t border-border bg-background">
                {replyTo && (
                  <div className="flex items-center justify-between mb-2 px-1">
                    <span className="text-[11px] font-medium text-muted-foreground">Respondendo a <strong className="text-foreground">{replyTo.nome}</strong></span>
                    <button className="text-[11px] font-bold text-muted-foreground hover:text-destructive" onClick={() => setReplyTo(null)}>Cancelar</button>
                  </div>
                )}
                <div className="flex items-end gap-2">
                  {me && <Avatar nome={me.nome} url={me.avatar} size="size-9" />}
                  <Textarea
                    autoFocus={searchParams.get("foco") === "1"}
                    className="rounded-xl min-h-11 text-[13px] flex-1 resize-none"
                    placeholder={replyTo ? "Escreva sua resposta..." : "Escreva um comentário..."}
                    value={novoTexto}
                    onChange={(e) => setNovoTexto(e.target.value)}
                    onKeyDown={(e) => { if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) enviarComentario() }}
                  />
                  <Button
                    disabled={enviando || !novoTexto.trim()}
                    className="h-11 gap-2 rounded-xl font-bold text-xs uppercase tracking-wider shrink-0"
                    onClick={enviarComentario}
                  >
                    <Send className="size-4" />
                    {enviando ? "..." : "Enviar"}
                  </Button>
                </div>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}

// --- item de comentário (com respostas aninhadas) ---------------------------
function ComentarioItem({
  c, me, isReply, onReply, onDelete, children,
}: {
  c: Comentario
  me: Me | null
  isReply?: boolean
  onReply: () => void
  onDelete: () => void
  children?: React.ReactNode
}) {
  const podeExcluir = me && (me.id === c.id_autor || me.isAdmin)
  return (
    <div className={isReply ? "pl-6 border-l-2 border-border/50 ml-4" : ""}>
      <div className="flex items-start gap-3 group">
        <Avatar nome={c.autor_nome || "?"} url={c.autor_avatar_url || (c.is_admin ? "/galdino-foto.png" : null)} size="size-9" />
        <div className="min-w-0 flex-1">
          <div className="rounded-2xl bg-muted/20 border border-border/50 px-4 py-2.5">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-[13px] font-bold text-foreground">{c.autor_nome || "Membro"}</span>
              {c.is_admin && (
                <Badge className="rounded bg-primary/10 text-primary border-primary/20 px-1.5 py-0 text-[9px] font-bold">EQUIPE</Badge>
              )}
              <span className="text-[11px] font-medium text-muted-foreground/70">{tempoRelativo(c.created_at)}</span>
            </div>
            <p className="text-[13px] font-medium text-foreground/90 leading-relaxed mt-0.5 whitespace-pre-wrap">{c.texto}</p>
          </div>
          <div className="flex items-center gap-3 mt-1 px-1">
            <button onClick={onReply} className="text-[11px] font-bold text-muted-foreground hover:text-primary">Responder</button>
            {podeExcluir && (
              <button onClick={onDelete} className="text-[11px] font-bold text-muted-foreground hover:text-destructive flex items-center gap-1">
                <Trash2 className="size-3" /> Excluir
              </button>
            )}
          </div>
          {children && <div className="mt-3 space-y-3">{children}</div>}
        </div>
      </div>
    </div>
  )
}
