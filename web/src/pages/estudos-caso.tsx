// Conhecimento → Estudos de Caso: histórias reais de membros transformando
// negócios com IA. Galeria (cards com vídeo, tags e métricas) + página do
// estudo com player embutido, deep-linkável via ?caso=<id>.
import { useEffect, useMemo, useState } from "react"
import { useSearchParams } from "react-router-dom"
import { supabase } from "@/lib/supabase"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import {
  BookOpenIcon as BookOpen,
  PlayCircleIcon as PlayCircle,
  TrendingUpIcon as TrendingUp,
  ArrowLeftIcon as ArrowLeft,
  StarIcon as Star,
  CalendarIcon as Calendar,
} from "@/components/ui/icons"
import type { Session } from "@supabase/supabase-js"
import { motion } from "framer-motion"
import ReactMarkdown from "react-markdown"
import remarkGfm from "remark-gfm"

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
  metricas: Metrica[]
  destaque: boolean
  data_publicacao: string
}

interface EstudosCasoPageProps {
  session?: Session
  clientId?: string
}

// --- helpers de vídeo -------------------------------------------------------
function youtubeId(url: string): string | null {
  const m = url.match(/(?:youtube\.com\/(?:watch\?v=|shorts\/|embed\/)|youtu\.be\/)([A-Za-z0-9_-]{6,})/)
  return m ? m[1] : null
}

function vimeoId(url: string): string | null {
  const m = url.match(/vimeo\.com\/(\d+)/)
  return m ? m[1] : null
}

function thumbnailDe(estudo: EstudoCaso): string | null {
  if (estudo.thumbnail_url) return estudo.thumbnail_url
  const yt = estudo.video_url ? youtubeId(estudo.video_url) : null
  return yt ? `https://img.youtube.com/vi/${yt}/hqdefault.jpg` : null
}

function PlayerVideo({ url, titulo }: { url: string; titulo: string }) {
  const yt = youtubeId(url)
  if (yt) {
    return (
      <iframe
        className="w-full aspect-video rounded-2xl border border-border"
        src={`https://www.youtube.com/embed/${yt}`}
        title={titulo}
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
        allowFullScreen
      />
    )
  }
  const vm = vimeoId(url)
  if (vm) {
    return (
      <iframe
        className="w-full aspect-video rounded-2xl border border-border"
        src={`https://player.vimeo.com/video/${vm}`}
        title={titulo}
        allow="autoplay; fullscreen; picture-in-picture"
        allowFullScreen
      />
    )
  }
  return <video className="w-full aspect-video rounded-2xl border border-border bg-black" src={url} controls />
}

// --- página ------------------------------------------------------------------
export default function EstudosCasoPage(_props: EstudosCasoPageProps) {
  const [estudos, setEstudos] = useState<EstudoCaso[]>([])
  const [loading, setLoading] = useState(true)
  const [searchParams, setSearchParams] = useSearchParams()
  const casoId = searchParams.get("caso")

  useEffect(() => {
    let cancelled = false
    async function load() {
      const { data } = await supabase
        .from("conhecimento_estudos_caso")
        .select("id, titulo, autor, autor_papel, resumo, sobre, video_url, thumbnail_url, tags, metricas, destaque, data_publicacao")
        .eq("publicado", true)
        .order("destaque", { ascending: false })
        .order("data_publicacao", { ascending: false })
      if (cancelled) return
      setEstudos(
        (data ?? []).map((e) => ({
          ...e,
          tags: Array.isArray(e.tags) ? e.tags : [],
          metricas: Array.isArray(e.metricas) ? e.metricas : [],
        }))
      )
      setLoading(false)
    }
    load()
    return () => { cancelled = true }
  }, [])

  const selecionado = useMemo(
    () => estudos.find((e) => e.id === casoId) ?? null,
    [estudos, casoId]
  )

  function abrir(id: string) {
    setSearchParams({ caso: id })
    window.scrollTo({ top: 0, behavior: "smooth" })
  }

  function fechar() {
    setSearchParams({}, { replace: true })
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

        {/* Mais estudos */}
        {outros.length > 0 && (
          <div className="space-y-4">
            <p className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground">Mais estudos de caso</p>
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {outros.slice(0, 3).map((e) => (
                <button key={e.id} onClick={() => abrir(e.id)} className="text-left group">
                  <Card className="overflow-hidden hover:border-primary/30 transition-all h-full">
                    <div className="relative aspect-video bg-muted/20 overflow-hidden">
                      {thumbnailDe(e) ? (
                        <img src={thumbnailDe(e)!} alt={e.titulo} className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105" />
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

      {estudos.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 gap-3 text-center border border-dashed border-border rounded-2xl">
          <BookOpen className="size-8 text-muted-foreground/30" />
          <p className="text-sm font-medium text-muted-foreground">Nenhum estudo de caso publicado ainda. Volte em breve!</p>
        </div>
      ) : (
        <div className="grid gap-6 md:grid-cols-2">
          {estudos.map((e, i) => (
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
                  {thumbnailDe(e) ? (
                    <img
                      src={thumbnailDe(e)!}
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
                </CardContent>
              </Card>
            </motion.button>
          ))}
        </div>
      )}
    </div>
  )
}
