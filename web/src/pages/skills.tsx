// Conhecimento → Skills: skills do PMC prontas para o cliente baixar e instalar
// no Claude. Mesma estrutura dos Multiplicadores: hero + busca + filtro de
// categoria + grid de cards com botão de download. Deep-link via ?s=<slug>.
import { useEffect, useMemo, useState } from "react"
import { useSearchParams } from "react-router-dom"
import { AnimatePresence, motion } from "framer-motion"
import { supabase } from "@/lib/supabase"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Dialog, DialogContent } from "@/components/ui/dialog"
import {
  SearchIcon as Search,
  Sparkles2Icon as Sparkles,
  DownloadIcon as Download,
  FileTextIcon as FileText,
  PlayCircleIcon as PlayCircle,
  ChevronDownIcon as ChevronDown,
} from "@/components/ui/icons"
import { ItemThumb, COR } from "@/components/biblioteca/biblioteca-ui"
import { CATEGORIAS, type SkillPMC } from "@/data/skills-pmc"
import { logarDownload } from "@/lib/log-download"
import { parseVideo } from "@/lib/video-embed"

// Configuração do vídeo tutorial: linha `skills_video_tutorial` em
// configuracoes_links (o admin edita em /skills-admin).
export interface VideoTutorial {
  label: string | null
  descricao: string | null
  url: string | null
  ativo: boolean | null
}

function normalizar(row: any): SkillPMC {
  return {
    ...row,
    tags: Array.isArray(row.tags) ? row.tags : [],
    descricao: row.descricao ?? "",
    gatilho: row.gatilho ?? "",
    formato: row.formato ?? "Skill Claude",
  }
}

export default function SkillsPage() {
  const [sp, setSp] = useSearchParams()
  const q = sp.get("q") ?? ""
  const cat = sp.get("cat") ?? "todas"
  const abertoSlug = sp.get("s")

  const [itens, setItens] = useState<SkillPMC[]>([])
  const [video, setVideo] = useState<VideoTutorial | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function carregar() {
      const [skills, cfg] = await Promise.all([
        supabase
          .from("conhecimento_skills")
          .select("*")
          .eq("publicado", true)
          .order("ordem", { ascending: true })
          .order("created_at", { ascending: true }),
        supabase
          .from("configuracoes_links")
          .select("label,descricao,url,ativo")
          .eq("chave", "skills_video_tutorial")
          .maybeSingle(),
      ])
      setItens((skills.data ?? []).map(normalizar))
      setVideo(cfg.data ?? null)
      setLoading(false)
    }
    carregar()
  }, [])

  function setParam(key: string, value: string | null) {
    const next = new URLSearchParams(sp)
    if (value === null || value === "") next.delete(key)
    else next.set(key, value)
    setSp(next, { replace: true })
  }

  const filtrados = useMemo(() => {
    const termo = q.trim().toLowerCase()
    return itens.filter((s) => {
      if (cat !== "todas" && s.categoria !== cat) return false
      if (termo && !(`${s.nome} ${s.descricao}`.toLowerCase().includes(termo))) return false
      return true
    })
  }, [itens, q, cat])

  const aberto = abertoSlug ? itens.find((s) => s.slug === abertoSlug) ?? null : null

  const catsDisponiveis = useMemo(() => {
    const set = new Set(itens.map((s) => s.categoria))
    return CATEGORIAS.filter((c) => set.has(c.slug))
  }, [itens])

  return (
    <div className="space-y-8 pb-12">
      {/* Hero */}
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}>
        <Card className="overflow-hidden border-primary/20">
          <CardContent className="relative p-8 bg-gradient-to-br from-primary/10 via-transparent to-transparent">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-6">
              <div className="flex items-start gap-4">
                <div className="bg-primary/15 p-3.5 rounded-2xl shrink-0">
                  <Sparkles className="size-7 text-primary" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h1 className="text-3xl lg:text-4xl font-bold tracking-tight text-foreground">Skills</h1>
                    <span className="rounded-lg bg-primary/15 text-primary border border-primary/30 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide">Novo</span>
                  </div>
                  <p className="text-sm font-medium text-muted-foreground mt-1 max-w-xl">
                    Skills do PMC prontas para você baixar e instalar no seu Claude. Superpoderes de IA, um arquivo de cada vez.
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-5 text-sm shrink-0">
                <div className="flex items-center gap-2 text-muted-foreground font-medium">
                  <Sparkles className="size-4 text-primary" /> {itens.length} skills
                </div>
                <div className="flex items-center gap-2 text-muted-foreground font-medium">
                  <Download className="size-4 text-primary" /> Baixe e instale
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Vídeo tutorial (colapsável) */}
      <CardVideoTutorial cfg={video} />

      {/* Busca */}
      <div className="relative max-w-xl">
        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
        <Input
          value={q}
          onChange={(e) => setParam("q", e.target.value)}
          placeholder="Buscar skills..."
          className="h-12 pl-10 rounded-xl"
        />
      </div>

      {/* Filtros de categoria */}
      <div className="flex items-center gap-2 flex-wrap">
        <FiltroChip ativo={cat === "todas"} onClick={() => setParam("cat", null)}>Todas</FiltroChip>
        {catsDisponiveis.map((c) => (
          <FiltroChip key={c.slug} ativo={cat === c.slug} onClick={() => setParam("cat", c.slug)}>
            {c.label}
          </FiltroChip>
        ))}
      </div>

      {/* Grid */}
      {loading ? (
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="h-64 rounded-2xl bg-card/40 animate-pulse" />
          ))}
        </div>
      ) : filtrados.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 gap-3 text-center border border-dashed border-border rounded-2xl">
          <Sparkles className="size-8 text-muted-foreground/30" />
          <p className="text-sm font-medium text-muted-foreground">Nenhuma skill encontrada com esses filtros.</p>
        </div>
      ) : (
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {filtrados.map((s, i) => (
            <motion.div
              key={s.slug}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, delay: Math.min(i * 0.03, 0.3) }}
            >
              <Card className="group h-full overflow-hidden border-border hover:border-primary/30 transition-colors flex flex-col">
                <button onClick={() => setParam("s", s.slug)} className="text-left">
                  <ItemThumb icon={s.icon} cor={s.cor} tipoLabel="Skill" tags={s.tags} />
                </button>
                <CardContent className="p-5 space-y-3 flex flex-col flex-1">
                  <button onClick={() => setParam("s", s.slug)} className="text-left">
                    <h3 className="text-[15px] font-bold tracking-tight text-foreground leading-snug line-clamp-1 group-hover:text-primary transition-colors">
                      {s.nome}
                    </h3>
                  </button>
                  <p className="text-[13px] font-medium text-muted-foreground leading-relaxed line-clamp-3 flex-1">
                    {s.descricao}
                  </p>
                  <BotaoBaixar skill={s} />
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>
      )}

      {/* Modal de detalhe */}
      <Dialog open={!!aberto} onOpenChange={(o) => !o && setParam("s", null)}>
        <DialogContent className="max-w-xl p-0 overflow-hidden gap-0">
          {aberto && <DetalheSkill s={aberto} />}
        </DialogContent>
      </Dialog>
    </div>
  )
}

// Barra colapsada por padrão: mostra que o vídeo existe sem ocupar espaço.
// O iframe só é montado quando aberto, para não carregar o player à toa.
function CardVideoTutorial({ cfg }: { cfg: VideoTutorial | null }) {
  const [aberto, setAberto] = useState(false)
  const info = parseVideo(cfg?.url)
  if (!cfg || cfg.ativo === false || !info) return null

  return (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3, delay: 0.1 }}>
      <Card className="overflow-hidden border-primary/20">
        <button
          onClick={() => setAberto((v) => !v)}
          className="w-full flex items-center gap-4 p-5 text-left hover:bg-primary/5 transition-colors"
        >
          <div className="bg-primary/15 p-2.5 rounded-xl shrink-0">
            <PlayCircle className="size-5 text-primary" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <h2 className="text-[15px] font-bold tracking-tight text-foreground">
                {cfg.label || "Como usar as skills"}
              </h2>
              <span className="rounded-lg bg-primary/15 text-primary border border-primary/30 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide">
                Vídeo
              </span>
            </div>
            {cfg.descricao && (
              <p className="text-[13px] font-medium text-muted-foreground mt-0.5">{cfg.descricao}</p>
            )}
          </div>
          <motion.div animate={{ rotate: aberto ? 180 : 0 }} transition={{ duration: 0.2 }} className="shrink-0">
            <ChevronDown className="size-5 text-muted-foreground" />
          </motion.div>
        </button>

        <AnimatePresence initial={false}>
          {aberto && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="overflow-hidden"
            >
              <div className="px-5 pb-5">
                {info.tipo === "arquivo" ? (
                  <video
                    src={info.embedUrl}
                    controls
                    className="w-full aspect-video rounded-2xl border border-border bg-black"
                  />
                ) : (
                  <iframe
                    className="w-full aspect-video rounded-2xl border border-border"
                    src={info.embedUrl}
                    title={cfg.label || "Como usar as skills"}
                    allow="autoplay; fullscreen; picture-in-picture; clipboard-write; encrypted-media"
                    allowFullScreen
                  />
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </Card>
    </motion.div>
  )
}

function FiltroChip({ children, ativo, onClick }: { children: React.ReactNode; ativo: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className={`rounded-xl px-3.5 py-1.5 text-[12px] font-bold transition-all ${ativo ? "bg-primary text-primary-foreground" : "bg-muted/20 text-muted-foreground hover:text-foreground border border-border"}`}
    >
      {children}
    </button>
  )
}

function BotaoBaixar({ skill }: { skill: SkillPMC }) {
  if (!skill.arquivo_url) {
    return (
      <Button variant="outline" disabled className="w-full h-10 gap-2 rounded-xl font-bold text-xs">
        <Download className="size-4" /> Em breve
      </Button>
    )
  }
  return (
    <Button asChild className="w-full h-10 gap-2 rounded-xl font-bold text-xs">
      <a
        href={skill.arquivo_url}
        download
        onClick={(e) => { e.stopPropagation(); logarDownload("skill", skill.slug, skill.nome, skill.arquivo_url) }}
      >
        <Download className="size-4" /> Baixar skill
      </a>
    </Button>
  )
}

function DetalheSkill({ s }: { s: SkillPMC }) {
  const c = COR[s.cor]
  return (
    <div>
      <ItemThumb icon={s.icon} cor={s.cor} tipoLabel="Skill" tags={s.tags} className="aspect-[16/7]" />
      <div className="p-6 space-y-5">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-foreground">{s.nome}</h2>
          <p className="text-sm font-medium text-muted-foreground mt-2 leading-relaxed">{s.descricao}</p>
        </div>

        <div className="rounded-xl border border-border bg-muted/10 p-4">
          <p className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground mb-1.5">Quando usar</p>
          <p className="text-[13px] font-medium text-foreground leading-relaxed">{s.gatilho}</p>
        </div>

        <div className="flex items-center gap-2 text-[12px] font-medium text-muted-foreground">
          <FileText className={`size-4 ${c.fg}`} />
          {s.formato}
        </div>

        <BotaoBaixar skill={s} />
      </div>
    </div>
  )
}
