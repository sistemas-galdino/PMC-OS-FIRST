// Conhecimento → Estudos de Caso: histórias reais de membros transformando
// negócios com IA. Galeria (cards com vídeo, tags e métricas) + página do
// estudo com player embutido, deep-linkável via ?caso=<id>.
import { useEffect, useMemo, useRef, useState } from "react"
import { useSearchParams } from "react-router-dom"
import { supabase } from "@/lib/supabase"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Textarea } from "@/components/ui/textarea"
import {
  BookOpenIcon as BookOpen,
  PlayCircleIcon as PlayCircle,
  TrendingUpIcon as TrendingUp,
  ArrowLeftIcon as ArrowLeft,
  StarIcon as Star,
  CalendarIcon as Calendar,
  EyeIcon as Eye,
  ThumbsUpIcon as ThumbsUp,
  MessageCircleIcon as MessageCircle,
  SendIcon as Send,
  Trash2Icon as Trash2,
} from "@/components/ui/icons"
import type { Session } from "@supabase/supabase-js"
import { motion } from "framer-motion"
import ReactMarkdown from "react-markdown"
import remarkGfm from "remark-gfm"
import { parseVideo, thumbnailImediata, thumbnailVimeo } from "@/lib/video-embed"

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
  data_publicacao: string
  visualizacoes: number
  likeCount: number
  comentarioCount: number
  curtido: boolean
}

interface Comentario {
  id: string
  id_autor: string
  autor_nome: string | null
  autor_avatar_url: string | null
  is_admin: boolean
  texto: string
  created_at: string
}

interface Me { id: string; nome: string; avatar: string | null; isAdmin: boolean }

interface EstudosCasoPageProps {
  session?: Session
  clientId?: string
}

// --- helpers de vídeo -------------------------------------------------------
// Parsing (Vimeo com hash de privacidade, YouTube, arquivo) vive em lib/video-embed.
function thumbnailDe(estudo: EstudoCaso, thumbsVimeo?: Map<string, string>): string | null {
  return estudo.thumbnail_url || thumbnailImediata(estudo.video_url) || thumbsVimeo?.get(estudo.id) || null
}

function PlayerVideo({ url, titulo }: { url: string; titulo: string }) {
  const info = parseVideo(url)
  if (!info) return null
  if (info.tipo === "arquivo") {
    return <video className="w-full aspect-video rounded-2xl border border-border bg-black" src={url} controls />
  }
  return (
    <iframe
      className="w-full aspect-video rounded-2xl border border-border"
      src={info.embedUrl}
      title={titulo}
      allow="autoplay; fullscreen; picture-in-picture; clipboard-write; encrypted-media"
      allowFullScreen
    />
  )
}

// --- página ------------------------------------------------------------------
// Quem sou eu (pra curtir/comentar) — mesmo resolvedor do feed de Novidades.
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

export default function EstudosCasoPage(_props: EstudosCasoPageProps) {
  const [estudos, setEstudos] = useState<EstudoCaso[]>([])
  const [loading, setLoading] = useState(true)
  const [searchParams, setSearchParams] = useSearchParams()
  const casoId = searchParams.get("caso")
  // Thumbnails do Vimeo vêm por oEmbed (assíncrono) quando não há thumbnail_url.
  const [thumbsVimeo, setThumbsVimeo] = useState<Map<string, string>>(new Map())
  // Filtro por nicho: vem da URL para o link ser compartilhável.
  const nichoAtivo = searchParams.get("nicho") ?? "todos"
  const [me, setMe] = useState<Me | null>(null)
  // comentários do case aberto
  const [comentarios, setComentarios] = useState<Comentario[]>([])
  const [loadingCom, setLoadingCom] = useState(false)
  const [novoTexto, setNovoTexto] = useState("")
  const [enviando, setEnviando] = useState(false)
  // Cases já contados nesta sessão de página — evita inflar o contador ao reabrir.
  const viewsContadas = useRef<Set<string>>(new Set())

  function filtrarNicho(nicho: string | null) {
    const next = new URLSearchParams(searchParams)
    if (nicho) next.set("nicho", nicho)
    else next.delete("nicho")
    setSearchParams(next, { replace: true })
  }

  useEffect(() => {
    let cancelled = false
    async function load() {
      const meResolved = await resolverMe()
      if (cancelled) return
      setMe(meResolved)
      const [{ data }, likesRes] = await Promise.all([
        supabase
          .from("conhecimento_estudos_caso")
          .select("id, titulo, autor, autor_papel, resumo, sobre, video_url, thumbnail_url, tags, nicho, metricas, destaque, data_publicacao, visualizacoes, likes:conhecimento_estudos_caso_likes(count), comentarios:conhecimento_estudos_caso_comentarios(count)")
          .eq("publicado", true)
          .order("destaque", { ascending: false })
          .order("data_publicacao", { ascending: false }),
        meResolved
          ? supabase.from("conhecimento_estudos_caso_likes").select("id_estudo").eq("id_cliente", meResolved.id)
          : Promise.resolve({ data: [] as { id_estudo: string }[] }),
      ])
      if (cancelled) return
      const curtidos = new Set((likesRes.data ?? []).map((l: { id_estudo: string }) => l.id_estudo))
      const lista = (data ?? []).map((e: any) => ({
        ...e,
        tags: Array.isArray(e.tags) ? e.tags : [],
        metricas: Array.isArray(e.metricas) ? e.metricas : [],
        visualizacoes: e.visualizacoes ?? 0,
        likeCount: e.likes?.[0]?.count ?? 0,
        comentarioCount: e.comentarios?.[0]?.count ?? 0,
        curtido: curtidos.has(e.id),
      }))
      setEstudos(lista)
      setLoading(false)

      // Busca as capas do Vimeo dos cases sem thumbnail própria.
      const pendentes = lista.filter(
        (e: any) => !e.thumbnail_url && parseVideo(e.video_url)?.tipo === "vimeo"
      )
      pendentes.forEach(async (e: any) => {
        const t = await thumbnailVimeo(e.video_url)
        if (!cancelled && t) setThumbsVimeo((prev) => new Map(prev).set(e.id, t))
      })
    }
    load()
    return () => { cancelled = true }
  }, [])

  const selecionado = useMemo(
    () => estudos.find((e) => e.id === casoId) ?? null,
    [estudos, casoId]
  )

  // Visualização: conta quando alguém abre o case pra assistir (clique ou deep
  // link), uma vez por case por sessão de página. O incremento real é via RPC.
  useEffect(() => {
    if (!casoId || loading || viewsContadas.current.has(casoId)) return
    if (!estudos.some((e) => e.id === casoId)) return
    viewsContadas.current.add(casoId)
    supabase.rpc("estudo_caso_registrar_view", { p_estudo: casoId })
    setEstudos((prev) => prev.map((e) => (e.id === casoId ? { ...e, visualizacoes: e.visualizacoes + 1 } : e)))
  }, [casoId, loading, estudos])

  // Comentários do case aberto.
  useEffect(() => {
    if (!casoId) { setComentarios([]); return }
    let cancelled = false
    setLoadingCom(true)
    supabase
      .from("conhecimento_estudos_caso_comentarios")
      .select("*")
      .eq("id_estudo", casoId)
      .order("created_at", { ascending: true })
      .then(({ data }) => {
        if (cancelled) return
        setComentarios(data ?? [])
        setLoadingCom(false)
      })
    return () => { cancelled = true }
  }, [casoId])

  async function toggleCurtida(estudo: EstudoCaso) {
    if (!me) return
    const curtir = !estudo.curtido
    setEstudos((prev) => prev.map((x) => (
      x.id === estudo.id ? { ...x, curtido: curtir, likeCount: Math.max(0, x.likeCount + (curtir ? 1 : -1)) } : x
    )))
    if (curtir) {
      await supabase.from("conhecimento_estudos_caso_likes").insert({ id_estudo: estudo.id, id_cliente: me.id })
    } else {
      await supabase.from("conhecimento_estudos_caso_likes").delete().eq("id_estudo", estudo.id).eq("id_cliente", me.id)
    }
  }

  async function enviarComentario() {
    if (!me || !selecionado || !novoTexto.trim()) return
    setEnviando(true)
    const payload = {
      id_estudo: selecionado.id,
      id_autor: me.id,
      autor_nome: me.nome,
      autor_avatar_url: me.avatar,
      is_admin: me.isAdmin,
      texto: novoTexto.trim(),
    }
    const { data, error } = await supabase.from("conhecimento_estudos_caso_comentarios").insert(payload).select().single()
    setEnviando(false)
    if (!error && data) {
      setComentarios((prev) => [...prev, data])
      setNovoTexto("")
      setEstudos((prev) => prev.map((x) => (x.id === selecionado.id ? { ...x, comentarioCount: x.comentarioCount + 1 } : x)))
    }
  }

  async function excluirComentario(c: Comentario) {
    await supabase.from("conhecimento_estudos_caso_comentarios").delete().eq("id", c.id)
    setComentarios((prev) => prev.filter((x) => x.id !== c.id))
    if (selecionado) {
      setEstudos((prev) => prev.map((x) => (x.id === selecionado.id ? { ...x, comentarioCount: Math.max(0, x.comentarioCount - 1) } : x)))
    }
  }

  // Nichos que realmente têm case publicado, com a contagem, do maior para o menor.
  const nichosDisponiveis = useMemo(() => {
    const contagem = new Map<string, number>()
    estudos.forEach((e) => {
      const n = e.nicho?.trim()
      if (n) contagem.set(n, (contagem.get(n) ?? 0) + 1)
    })
    return [...contagem.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
  }, [estudos])

  const filtrados = useMemo(
    () => (nichoAtivo === "todos" ? estudos : estudos.filter((e) => e.nicho?.trim() === nichoAtivo)),
    [estudos, nichoAtivo],
  )

  function abrir(id: string) {
    // Preserva o filtro ao abrir um case, para o "voltar" cair na mesma lista.
    const next = new URLSearchParams(searchParams)
    next.set("caso", id)
    setSearchParams(next)
    window.scrollTo({ top: 0, behavior: "smooth" })
  }

  function fechar() {
    // Fecha o case mas mantém o nicho filtrado.
    const next = new URLSearchParams(searchParams)
    next.delete("caso")
    setSearchParams(next, { replace: true })
  }

  if (loading) {
    return (
      <div className="space-y-6 animate-pulse">
        <div className="h-24 bg-card/40 rounded-2xl" />
        <div className="grid gap-6 md:grid-cols-2">
          <div className="h-[420px] bg-card/40 rounded-2xl" />
          <div className="h-[420px] bg-card/40 rounded-2xl" />
        </div>
      </div>
    )
  }

  // ---------- Página do estudo de caso ----------
  if (selecionado) {
    const outros = estudos.filter((e) => e.id !== selecionado.id)
    return (
      <motion.div
        key={selecionado.id}
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35 }}
        className="space-y-8 pb-10"
      >
        <Button
          variant="ghost"
          size="sm"
          onClick={fechar}
          className="text-muted-foreground hover:text-foreground gap-2 -ml-2"
        >
          <ArrowLeft className="size-4" />
          <span className="text-xs font-bold uppercase tracking-widest">Estudos de Caso</span>
        </Button>

        {/* Player */}
        {selecionado.video_url && <PlayerVideo url={selecionado.video_url} titulo={selecionado.titulo} />}

        {/* Cabeçalho */}
        <div className="space-y-3">
          <div className="flex items-center gap-2 flex-wrap">
            {(selecionado.autor || selecionado.autor_papel) && (
              <p className="text-xs font-bold uppercase tracking-widest text-primary">
                {[selecionado.autor, selecionado.autor_papel].filter(Boolean).join(" · ")}
              </p>
            )}
            {selecionado.destaque && (
              <Badge className="rounded-lg bg-primary/10 text-primary border-primary/20 px-2 py-0 text-[10px] font-bold gap-1">
                <Star className="size-3" />
                DESTAQUE
              </Badge>
            )}
          </div>
          <h1 className="text-3xl lg:text-4xl font-bold tracking-tight text-foreground leading-tight">
            {selecionado.titulo}
          </h1>
          <div className="flex items-center gap-2 flex-wrap">
            {selecionado.tags.map((t) => (
              <Badge key={t} variant="outline" className="rounded-lg border-border bg-muted/20 text-muted-foreground px-2.5 py-0.5 text-[11px] font-bold">
                {t}
              </Badge>
            ))}
            <span className="text-[11px] font-medium text-muted-foreground/70 flex items-center gap-1.5 ml-1">
              <Calendar className="size-3" />
              {new Date(selecionado.data_publicacao + "T00:00:00").toLocaleDateString("pt-BR", { day: "2-digit", month: "long", year: "numeric" })}
            </span>
          </div>

          {/* Engajamento: visualizações, curtida e comentários */}
          <div className="flex items-center gap-3 flex-wrap pt-1">
            <span className="flex items-center gap-1.5 text-[13px] font-bold text-muted-foreground">
              <Eye className="size-4" />
              {selecionado.visualizacoes} {selecionado.visualizacoes === 1 ? "visualização" : "visualizações"}
            </span>
            <button
              type="button"
              onClick={() => toggleCurtida(selecionado)}
              disabled={!me}
              aria-pressed={selecionado.curtido}
              className={`flex items-center gap-1.5 rounded-xl border px-3 py-1.5 text-[12px] font-bold tracking-tight transition-colors ${
                selecionado.curtido
                  ? "border-primary/50 bg-primary/10 text-primary"
                  : "border-border text-muted-foreground hover:border-primary/30 hover:text-foreground"
              }`}
            >
              <ThumbsUp className="size-4" />
              {selecionado.curtido ? "Curtido" : "Curtir"}
              <span className="opacity-60">· {selecionado.likeCount}</span>
            </button>
            <span className="flex items-center gap-1.5 text-[13px] font-bold text-muted-foreground">
              <MessageCircle className="size-4" />
              {selecionado.comentarioCount} {selecionado.comentarioCount === 1 ? "comentário" : "comentários"}
            </span>
          </div>
        </div>

        {/* Métricas */}
        {selecionado.metricas.length > 0 && (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {selecionado.metricas.slice(0, 4).map((m, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 + i * 0.08 }}
              >
                <Card className="h-full border-primary/15">
                  <CardContent className="p-5">
                    <p className="text-xl lg:text-2xl font-bold tracking-tight text-primary leading-tight">{m.valor}</p>
                    <p className="text-[11px] font-medium text-muted-foreground mt-1.5">{m.label}</p>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
        )}

        {/* Sobre */}
        {(selecionado.sobre || selecionado.resumo) && (
          <Card>
            <CardContent className="p-6 lg:p-8 space-y-4">
              <h2 className="text-lg font-bold tracking-tight text-foreground">Sobre este estudo de caso</h2>
              <div className="prose prose-invert max-w-none text-[15px] leading-relaxed text-foreground/90 [&_p]:my-3 [&_ul]:my-3 [&_li]:my-1 [&_strong]:text-foreground [&_a]:text-primary">
                <ReactMarkdown remarkPlugins={[remarkGfm]}>
                  {selecionado.sobre || selecionado.resumo || ""}
                </ReactMarkdown>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Comentários */}
        <Card>
          <CardContent className="p-6 lg:p-8 space-y-5">
            <h2 className="text-lg font-bold tracking-tight text-foreground flex items-center gap-2">
              <MessageCircle className="size-5 text-primary" />
              Comentários
              {selecionado.comentarioCount > 0 && (
                <span className="text-[13px] font-bold text-muted-foreground">({selecionado.comentarioCount})</span>
              )}
            </h2>

            {loadingCom ? (
              <div className="space-y-3">{[1, 2].map((i) => <div key={i} className="h-16 bg-card/40 rounded-xl animate-pulse" />)}</div>
            ) : comentarios.length === 0 ? (
              <p className="text-[13px] font-medium text-muted-foreground py-2">Seja o primeiro a comentar este estudo de caso.</p>
            ) : (
              <div className="space-y-4">
                {comentarios.map((c) => (
                  <div key={c.id} className="flex items-start gap-3 group/comentario">
                    <AvatarComentario nome={c.autor_nome || "Membro"} url={c.autor_avatar_url} />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-[13px] font-bold text-foreground">{c.autor_nome || "Membro"}</span>
                        {c.is_admin && (
                          <Badge className="rounded-md bg-primary/10 text-primary border-primary/20 px-1.5 py-0 text-[9px] font-bold">EQUIPE</Badge>
                        )}
                        <span className="text-[11px] font-medium text-muted-foreground/70">
                          {new Date(c.created_at).toLocaleDateString("pt-BR", { day: "2-digit", month: "short" })}
                        </span>
                        {me && (me.id === c.id_autor || me.isAdmin) && (
                          <button
                            type="button"
                            onClick={() => excluirComentario(c)}
                            className="opacity-0 group-hover/comentario:opacity-100 text-muted-foreground hover:text-destructive transition-all"
                            aria-label="Excluir comentário"
                          >
                            <Trash2 className="size-3.5" />
                          </button>
                        )}
                      </div>
                      <p className="text-[13px] font-medium text-foreground/90 leading-relaxed mt-0.5 whitespace-pre-wrap break-words">{c.texto}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Composer */}
            {me && (
              <div className="flex items-end gap-2 pt-2 border-t border-border/50">
                <AvatarComentario nome={me.nome} url={me.avatar} />
                <Textarea
                  className="rounded-xl min-h-11 text-[13px] flex-1 resize-none"
                  placeholder="Escreva um comentário..."
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
            )}
          </CardContent>
        </Card>

        {/* Mais estudos */}
        {outros.length > 0 && (
          <div className="space-y-4">
            <p className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground">Mais estudos de caso</p>
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {outros.slice(0, 3).map((e) => (
                <button key={e.id} onClick={() => abrir(e.id)} className="text-left group">
                  <Card className="overflow-hidden hover:border-primary/30 transition-all h-full">
                    <div className="relative aspect-video bg-muted/20 overflow-hidden">
                      {thumbnailDe(e, thumbsVimeo) ? (
                        <img src={thumbnailDe(e, thumbsVimeo)!} alt={e.titulo} className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105" />
                      ) : (
                        <div className="w-full h-full bg-gradient-to-br from-primary/15 to-muted/30" />
                      )}
                      <div className="absolute inset-0 flex items-center justify-center">
                        <div className="bg-background/70 backdrop-blur-sm rounded-full p-2.5 group-hover:bg-primary group-hover:text-primary-foreground transition-colors">
                          <PlayCircle className="size-5" />
                        </div>
                      </div>
                    </div>
                    <CardContent className="p-4">
                      <p className="text-[13px] font-bold tracking-tight text-foreground line-clamp-2">{e.titulo}</p>
                    </CardContent>
                  </Card>
                </button>
              ))}
            </div>
          </div>
        )}
      </motion.div>
    )
  }

  // ---------- Galeria ----------
  return (
    <div className="space-y-8 pb-10">
      {/* Hero */}
      <motion.div
        initial={{ opacity: 0, x: -20 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.5 }}
      >
        <Card className="border-primary/20 overflow-hidden">
          <CardContent className="p-6 lg:p-8">
            <div className="flex items-start justify-between gap-6 flex-wrap">
              <div className="flex items-start gap-4">
                <div className="bg-primary/10 p-3 rounded-2xl shrink-0">
                  <BookOpen className="size-6 text-primary" />
                </div>
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <h1 className="text-3xl lg:text-4xl font-bold tracking-tight text-foreground">Estudos de Caso</h1>
                    {estudos.some((e) => e.destaque) && (
                      <Badge className="rounded-lg bg-primary/10 text-primary border-primary/20 px-2 py-0.5 text-[10px] font-bold">
                        NOVO
                      </Badge>
                    )}
                  </div>
                  <p className="text-sm font-medium text-muted-foreground mt-1">
                    Casos reais de quem saiu do caos operacional e virou Multiplicador de Crescimento com IA e sistemas.
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-5">
                <div className="flex items-center gap-2">
                  <PlayCircle className="size-4 text-primary" />
                  <span className="text-[13px] font-bold text-foreground">{estudos.length} disponíve{estudos.length === 1 ? "l" : "is"}</span>
                </div>
                <div className="flex items-center gap-2">
                  <TrendingUp className="size-4 text-primary" />
                  <span className="text-[13px] font-bold text-foreground">Resultados reais</span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Filtro por nicho — só aparecem os setores que têm case publicado,
          para o cliente nunca clicar num filtro que devolve lista vazia. */}
      {nichosDisponiveis.length > 0 && (
        <div className="flex items-center gap-2 flex-wrap">
          <ChipNicho ativo={nichoAtivo === "todos"} onClick={() => filtrarNicho(null)}>
            Todos <span className="opacity-60">· {estudos.length}</span>
          </ChipNicho>
          {nichosDisponiveis.map(([nome, qtd]) => (
            <ChipNicho key={nome} ativo={nichoAtivo === nome} onClick={() => filtrarNicho(nome)}>
              {nome} <span className="opacity-60">· {qtd}</span>
            </ChipNicho>
          ))}
        </div>
      )}

      {estudos.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 gap-3 text-center border border-dashed border-border rounded-2xl">
          <BookOpen className="size-8 text-muted-foreground/30" />
          <p className="text-sm font-medium text-muted-foreground">Nenhum estudo de caso publicado ainda. Volte em breve!</p>
        </div>
      ) : filtrados.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 gap-3 text-center border border-dashed border-border rounded-2xl">
          <BookOpen className="size-8 text-muted-foreground/30" />
          <p className="text-sm font-medium text-muted-foreground">Nenhum case de {nichoAtivo} ainda.</p>
          <button onClick={() => filtrarNicho(null)} className="text-[13px] font-bold text-primary hover:underline">
            Ver todos os estudos
          </button>
        </div>
      ) : (
        <div className="grid gap-6 md:grid-cols-2">
          {filtrados.map((e, i) => (
            <motion.button
              key={e.id}
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.08, duration: 0.4 }}
              onClick={() => abrir(e.id)}
              className="text-left group"
            >
              <Card className="overflow-hidden h-full hover:border-primary/40 transition-all duration-300 hover:shadow-[0_0_32px_rgba(218,252,103,0.08)]">
                {/* Thumbnail */}
                <div className="relative aspect-video bg-muted/20 overflow-hidden">
                  {thumbnailDe(e, thumbsVimeo) ? (
                    <img
                      src={thumbnailDe(e, thumbsVimeo)!}
                      alt={e.titulo}
                      className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                    />
                  ) : (
                    <div className="w-full h-full bg-gradient-to-br from-primary/15 to-muted/30 flex items-center justify-center">
                      <BookOpen className="size-10 text-primary/40" />
                    </div>
                  )}
                  <div className="absolute inset-0 bg-gradient-to-t from-background/80 via-transparent to-transparent" />
                  {/* Play */}
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="bg-background/70 backdrop-blur-sm rounded-full p-4 transition-all group-hover:bg-primary group-hover:text-primary-foreground group-hover:scale-110 group-hover:shadow-[0_0_24px_rgba(218,252,103,0.5)]">
                      <PlayCircle className="size-7" />
                    </div>
                  </div>
                  {/* Tags sobre o thumb */}
                  {e.tags.length > 0 && (
                    <div className="absolute bottom-3 left-3 right-3 flex flex-wrap gap-1.5">
                      {e.tags.slice(0, 4).map((t) => (
                        <span key={t} className="rounded-lg bg-background/80 backdrop-blur-sm border border-border px-2 py-0.5 text-[10px] font-bold text-foreground">
                          {t}
                        </span>
                      ))}
                    </div>
                  )}
                  {e.destaque && (
                    <Badge className="absolute top-3 right-3 rounded-lg bg-primary text-primary-foreground px-2 py-0.5 text-[10px] font-bold gap-1">
                      <Star className="size-3" />
                      NOVO
                    </Badge>
                  )}
                </div>

                {/* Conteúdo */}
                <CardContent className="p-5 space-y-3">
                  {(e.autor || e.autor_papel) && (
                    <p className="text-[11px] font-bold uppercase tracking-widest text-primary">
                      {[e.autor, e.autor_papel].filter(Boolean).join(" · ")}
                    </p>
                  )}
                  <h2 className="text-xl font-bold tracking-tight text-foreground leading-snug group-hover:text-primary transition-colors">
                    {e.titulo}
                  </h2>
                  {e.resumo && (
                    <p className="text-[13px] font-medium text-muted-foreground leading-relaxed line-clamp-2">{e.resumo}</p>
                  )}
                  {e.metricas.length > 0 && (
                    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 pt-3 border-t border-border/50">
                      {e.metricas.slice(0, 4).map((m, mi) => (
                        <div key={mi} className="min-w-0">
                          <p className="text-[13px] font-bold tracking-tight text-foreground leading-tight">{m.valor}</p>
                          <p className="text-[10px] font-medium text-muted-foreground mt-0.5 line-clamp-2">{m.label}</p>
                        </div>
                      ))}
                    </div>
                  )}
                  {/* Engajamento do case */}
                  <div className="flex items-center gap-4 pt-3 border-t border-border/50 text-muted-foreground">
                    <span className="flex items-center gap-1.5 text-[11px] font-bold">
                      <Eye className="size-3.5" />
                      {e.visualizacoes}
                    </span>
                    <span className={`flex items-center gap-1.5 text-[11px] font-bold ${e.curtido ? "text-primary" : ""}`}>
                      <ThumbsUp className="size-3.5" />
                      {e.likeCount}
                    </span>
                    <span className="flex items-center gap-1.5 text-[11px] font-bold">
                      <MessageCircle className="size-3.5" />
                      {e.comentarioCount}
                    </span>
                  </div>
                </CardContent>
              </Card>
            </motion.button>
          ))}
        </div>
      )}
    </div>
  )
}

// Avatar do comentário — foto se houver, senão iniciais (mesmo padrão do feed).
function AvatarComentario({ nome, url }: { nome: string; url?: string | null }) {
  if (url) return <img src={url} alt={nome} className="size-9 rounded-full object-cover shrink-0" />
  const iniciais = nome.split(" ").filter(Boolean).map((p) => p[0]).slice(0, 2).join("").toUpperCase() || "?"
  return (
    <div className="size-9 rounded-full bg-primary/15 text-primary flex items-center justify-center text-[11px] font-bold shrink-0">
      {iniciais}
    </div>
  )
}

// Chip de filtro por nicho — mesmo visual dos filtros de Skills/Multiplicadores.
function ChipNicho({ ativo, onClick, children }: { ativo: boolean; onClick: () => void; children: React.ReactNode }) {
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
