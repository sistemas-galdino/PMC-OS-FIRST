import { useEffect, useState, useMemo } from "react"
import { useNavigate } from "react-router-dom"
import { supabase } from "@/lib/supabase"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  MapIcon as Map,
  ArrowUpRightIcon as ArrowUpRight,
  ChevronDownIcon as ChevronDown,
  ChevronUp2Icon as ChevronUp,
  ExternalLinkIcon as ExternalLink,
  Edit3Icon as Edit3,
  CheckIcon as Check,
  XIcon as X,
  TargetIcon as Target,
  TrendingUpIcon as TrendingUp,
  ZapIcon as Zap,
  Sparkles2Icon as Sparkles,
  TrophyIcon as Trophy,
} from "@/components/ui/icons"
import type { Session } from "@supabase/supabase-js"
import { motion, AnimatePresence } from "framer-motion"
import { TRILHA_IA, PILARES, type Passo, type Tarefa } from "@/data/trilha-ia"
import TrilhaEvidenciasPage from "@/pages/trilha-evidencias"

interface TrilhasPageProps {
  session?: Session
  clientId?: string
  embedded?: boolean
}

interface LinkRow { tarefa_id: string; link_url: string }

export default function TrilhasPage({ session, clientId, embedded }: TrilhasPageProps) {
  const navigate = useNavigate()
  const [resolvedClientId, setResolvedClientId] = useState<string | undefined>(clientId || session?.user?.id)
  const [isAdmin, setIsAdmin] = useState(false)
  const [loading, setLoading] = useState(true)
  const [pilaresComEvidencia, setPilaresComEvidencia] = useState<Set<string>>(new Set())
  const [links, setLinks] = useState<Record<string, string>>({})
  const [openPassoId, setOpenPassoId] = useState<string | null>(TRILHA_IA.passos[0]?.id ?? null)
  const [showEvidencias, setShowEvidencias] = useState(false)

  useEffect(() => {
    if (resolvedClientId) return
    if (clientId) { setResolvedClientId(clientId); return }
    supabase.auth.getSession().then(({ data }) => {
      if (data.session?.user?.id) setResolvedClientId(data.session.user.id)
      else setLoading(false)
    })
  }, [clientId, resolvedClientId])

  useEffect(() => {
    if (!resolvedClientId) return
    let cancelled = false
    async function fetchAll() {
      const [{ data: evData }, { data: linkData }, { data: { session: s } }] = await Promise.all([
        supabase.from("cliente_pilar_evidencias").select("pilar_id").eq("id_cliente", resolvedClientId),
        supabase.from("trilha_links").select("tarefa_id,link_url"),
        supabase.auth.getSession(),
      ])
      if (cancelled) return
      const set = new Set<string>((evData || []).map((r: { pilar_id: string }) => r.pilar_id))
      setPilaresComEvidencia(set)
      const linkMap: Record<string, string> = {}
      ;(linkData || []).forEach((r: LinkRow) => { linkMap[r.tarefa_id] = r.link_url })
      setLinks(linkMap)
      if (s?.user?.email) {
        const { data: mentor } = await supabase.from("mentores").select("id").eq("email", s.user.email).maybeSingle()
        if (!cancelled) setIsAdmin(!!mentor)
      }
      setLoading(false)
    }
    fetchAll()
    return () => { cancelled = true }
  }, [resolvedClientId])

  const totals = useMemo(() => {
    const done = PILARES.filter(p => pilaresComEvidencia.has(p.id)).length
    const total = PILARES.length
    return { total, done, pct: total > 0 ? Math.round((done / total) * 100) : 0 }
  }, [pilaresComEvidencia])

  function handleOpenEvidencias() {
    if (embedded) setShowEvidencias(true)
    else navigate("/trilhas/evidencias")
  }

  async function saveLink(tarefaId: string, url: string) {
    const trimmed = url.trim()
    if (!trimmed) {
      await supabase.from("trilha_links").delete().eq("tarefa_id", tarefaId)
      setLinks(prev => { const next = { ...prev }; delete next[tarefaId]; return next })
      return
    }
    await supabase.from("trilha_links").upsert({ tarefa_id: tarefaId, link_url: trimmed, updated_at: new Date().toISOString() })
    setLinks(prev => ({ ...prev, [tarefaId]: trimmed }))
  }

  if (embedded && showEvidencias) {
    return (
      <div className="space-y-4">
        <Button
          variant="outline"
          size="sm"
          className="h-9 gap-2 rounded-xl"
          onClick={() => setShowEvidencias(false)}
        >
          <ChevronDown className="size-4 rotate-90" />
          <span className="font-bold text-xs uppercase tracking-wider">Voltar à Trilha</span>
        </Button>
        <TrilhaEvidenciasPage clientId={resolvedClientId} embedded />
      </div>
    )
  }

  if (loading) {
    return (
      <div className="space-y-4">
        {[1, 2, 3].map(i => <div key={i} className="h-32 rounded-2xl bg-card/40 animate-pulse" />)}
      </div>
    )
  }

  return (
    <div className="space-y-8 pb-10">
      <motion.div
        initial={{ opacity: 0, x: -20 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.6 }}
        className="flex flex-col gap-5 md:flex-row md:items-end md:justify-between border-l-4 border-primary pl-8 py-2"
      >
        <div className="flex items-start gap-5">
          <div className="bg-primary/10 p-3.5 rounded-2xl shrink-0">
            <Map className="size-8 text-primary" />
          </div>
          <div className="flex flex-col gap-2">
            <h1 className="text-3xl lg:text-4xl font-bold tracking-tight text-foreground leading-tight">
              {TRILHA_IA.titulo}
            </h1>
            {TRILHA_IA.subtitulo && (
              <p className="text-muted-foreground font-medium text-sm">{TRILHA_IA.subtitulo}</p>
            )}
          </div>
        </div>
        <Button
          className="h-12 gap-2 rounded-xl px-6 shadow-xl shadow-primary/10 shrink-0"
          onClick={handleOpenEvidencias}
        >
          <ArrowUpRight className="size-5" />
          <span className="font-bold uppercase tracking-wider text-[11px]">Evidências</span>
        </Button>
      </motion.div>

      {/* Progresso na jornada — gamificado */}
      <ProgressoJornadaCard done={totals.done} total={totals.total} pct={totals.pct} />

      {/* Passos */}
      <div className="space-y-4">
        {TRILHA_IA.passos.map((passo) => (
          <PassoCard
            key={passo.id}
            passo={passo}
            open={openPassoId === passo.id}
            onToggle={() => setOpenPassoId(openPassoId === passo.id ? null : passo.id)}
            links={links}
            isAdmin={isAdmin}
            onSaveLink={saveLink}
          />
        ))}
      </div>
    </div>
  )
}

interface PassoCardProps {
  passo: Passo
  open: boolean
  onToggle: () => void
  links: Record<string, string>
  isAdmin: boolean
  onSaveLink: (id: string, url: string) => Promise<void>
}

function PassoCard({ passo, open, onToggle, links, isAdmin, onSaveLink }: PassoCardProps) {
  return (
    <div className="rounded-2xl border border-border bg-card/20 transition-all">
      <button
        type="button"
        onClick={onToggle}
        className="w-full flex items-center gap-4 p-5 text-left hover:bg-muted/10 transition-colors rounded-2xl"
      >
        <div className="size-11 rounded-xl flex items-center justify-center font-bold text-lg shrink-0 bg-primary/10 text-primary border border-primary/20">
          {passo.numero}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h3 className="font-bold text-base text-foreground">Etapa {passo.numero} — {passo.titulo}</h3>
          </div>
          {passo.descricao && <p className="text-xs text-muted-foreground mt-1 line-clamp-1">{passo.descricao}</p>}
        </div>
        <div className="flex items-center gap-3 shrink-0">
          <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
            {passo.tarefas.length} {passo.tarefas.length === 1 ? "aula" : "aulas"}
          </span>
          {open ? <ChevronUp className="size-5 text-muted-foreground" /> : <ChevronDown className="size-5 text-muted-foreground" />}
        </div>
      </button>

      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2, ease: "easeOut" }}
            className="overflow-hidden"
          >
            <div className="p-5 pt-0 space-y-3">
              {passo.descricao && (
                <p className="text-sm text-muted-foreground pb-2 border-b border-border/50">
                  <span className="font-bold text-foreground">Objetivo:</span> {passo.descricao}
                </p>
              )}
              {passo.tarefas.map(t => (
                <TarefaRow
                  key={t.id}
                  tarefa={t}
                  linkOverride={links[t.id]}
                  isAdmin={isAdmin}
                  onSaveLink={onSaveLink}
                />
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

interface TarefaRowProps {
  tarefa: Tarefa
  linkOverride?: string
  isAdmin: boolean
  onSaveLink: (id: string, url: string) => Promise<void>
}

function TarefaRow({ tarefa, linkOverride, isAdmin, onSaveLink }: TarefaRowProps) {
  const [editingLink, setEditingLink] = useState(false)
  const [linkDraft, setLinkDraft] = useState(linkOverride ?? tarefa.linkPadrao ?? "")
  const [savingLink, setSavingLink] = useState(false)

  const effectiveLink = linkOverride ?? tarefa.linkPadrao ?? ""

  async function handleSave() {
    setSavingLink(true)
    await onSaveLink(tarefa.id, linkDraft)
    setSavingLink(false)
    setEditingLink(false)
  }

  return (
    <div className="p-4 rounded-xl bg-muted/10 border border-border/50 hover:border-primary/20 transition-all">
      <div className="flex items-start gap-3 flex-wrap md:flex-nowrap">
        <div className="flex-1 min-w-0">
          <h4 className="font-semibold text-sm text-foreground">{tarefa.titulo}</h4>
          {tarefa.descricao && <p className="text-xs text-muted-foreground leading-relaxed mt-1">{tarefa.descricao}</p>}
        </div>

        <div className="flex items-center gap-2 shrink-0 w-full md:w-auto">
          {!editingLink ? (
            <>
              {effectiveLink ? (
                <a
                  href={effectiveLink}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1.5 h-9 px-3 rounded-lg bg-primary text-primary-foreground text-[11px] font-bold uppercase tracking-wider hover:bg-primary/90 transition-colors"
                >
                  <ExternalLink className="size-3.5" />
                  Assistir Aula
                </a>
              ) : (
                !isAdmin && <span className="text-[10px] text-muted-foreground italic">Sem link disponível</span>
              )}
              {isAdmin && (
                <Button
                  size="icon"
                  variant="ghost"
                  className="size-9 rounded-lg hover:bg-muted/40"
                  onClick={() => { setLinkDraft(effectiveLink); setEditingLink(true) }}
                  title="Editar link"
                >
                  <Edit3 className="size-3.5 text-muted-foreground" />
                </Button>
              )}
            </>
          ) : (
            <div className="flex items-center gap-1.5 w-full md:w-80">
              <Input
                className="h-9 rounded-lg text-xs"
                placeholder="Cole a URL"
                value={linkDraft}
                onChange={(e) => setLinkDraft(e.target.value)}
                autoFocus
              />
              <Button size="icon" className="size-9 rounded-lg" onClick={handleSave} disabled={savingLink}>
                <Check className="size-4" />
              </Button>
              <Button size="icon" variant="outline" className="size-9 rounded-lg" onClick={() => setEditingLink(false)}>
                <X className="size-4" />
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

interface Conquista {
  id: string
  label: string
  descricao: string
  icon: (props: React.SVGProps<SVGSVGElement>) => JSX.Element
  unlock: (done: number, total: number, pct: number) => boolean
}

const CONQUISTAS: Conquista[] = [
  { id: "inicio",   label: "Primeiros Passos",    descricao: "1ª evidência enviada",    icon: Target,      unlock: (done) => done >= 1 },
  { id: "caminho",  label: "A Caminho",           descricao: "25% da jornada concluída", icon: TrendingUp, unlock: (_d, _t, pct) => pct >= 25 },
  { id: "meio",     label: "Meio Caminho",        descricao: "50% da jornada concluída", icon: Zap,        unlock: (_d, _t, pct) => pct >= 50 },
  { id: "reta",     label: "Reta Final",          descricao: "75% da jornada concluída", icon: Sparkles,   unlock: (_d, _t, pct) => pct >= 75 },
  { id: "completo", label: "Jornada Completa",    descricao: "Todas as evidências enviadas", icon: Trophy, unlock: (done, total) => total > 0 && done >= total },
]

function LockIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg {...props} xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
      <path d="M7 11V7a5 5 0 0 1 10 0v4" />
    </svg>
  )
}

interface ProgressoJornadaCardProps {
  done: number
  total: number
  pct: number
}

function ProgressoJornadaCard({ done, total, pct }: ProgressoJornadaCardProps) {
  const conquistasComStatus = CONQUISTAS.map(c => ({ ...c, desbloqueada: c.unlock(done, total, pct) }))
  const desbloqueadas = conquistasComStatus.filter(c => c.desbloqueada).length
  return (
    <div className="rounded-2xl border border-border bg-card/40 backdrop-blur-sm p-6 md:p-8 space-y-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
        <div className="flex items-start gap-3">
          <div className="bg-primary/10 p-2.5 rounded-xl shrink-0">
            <Sparkles className="size-6 text-primary" />
          </div>
          <div className="flex flex-col gap-1">
            <h2 className="text-xl md:text-2xl font-bold tracking-tight text-foreground leading-tight">Seu Progresso na Jornada</h2>
            <p className="text-xs md:text-sm text-muted-foreground font-medium">Assista às aulas e envie as evidências para avançar.</p>
          </div>
        </div>
        <div className="inline-flex items-center self-start md:self-auto rounded-full bg-primary/10 border border-primary/20 px-3.5 py-1.5 text-[11px] font-bold uppercase tracking-wider text-primary shrink-0">
          {done} de {total} etapas
        </div>
      </div>

      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-sm font-semibold text-muted-foreground">Progresso geral</span>
          <span className="text-2xl md:text-3xl font-bold tracking-tight text-foreground">{pct}%</span>
        </div>
        <div className="h-3 rounded-full bg-muted/50 overflow-hidden">
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${pct}%` }}
            transition={{ duration: 0.8, ease: "easeOut" }}
            className="h-full bg-gradient-to-r from-primary/80 to-primary rounded-full relative"
          >
            {pct > 0 && pct < 100 && (
              <motion.div
                className="absolute inset-0 bg-white/15 rounded-full"
                animate={{ opacity: [0.15, 0.35, 0.15] }}
                transition={{ duration: 1.8, repeat: Infinity, ease: "easeInOut" }}
              />
            )}
          </motion.div>
        </div>
      </div>

      <div className="space-y-4 pt-2 border-t border-border/50">
        <div className="flex items-center justify-between pt-4">
          <h3 className="text-sm font-bold tracking-tight text-foreground">Conquistas</h3>
          <span className="text-[11px] font-semibold text-muted-foreground">{desbloqueadas}/{CONQUISTAS.length} desbloqueadas</span>
        </div>
        <div className="flex items-center gap-3 flex-wrap">
          {conquistasComStatus.map((c, i) => (
            <motion.div
              key={c.id}
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ duration: 0.3, delay: i * 0.08, ease: "easeOut" }}
              className="relative group"
              title={`${c.label}: ${c.descricao}`}
            >
              <div
                className={`size-14 rounded-full flex items-center justify-center transition-all ${
                  c.desbloqueada
                    ? "bg-primary text-primary-foreground shadow-lg shadow-primary/30 ring-2 ring-primary/40"
                    : "bg-muted/40 text-muted-foreground/60 border border-border"
                }`}
              >
                {c.desbloqueada ? <c.icon className="size-6" /> : <LockIcon className="size-5" />}
              </div>
              {c.desbloqueada && (
                <div className="absolute -top-1 -right-1 size-5 rounded-full bg-emerald-500 border-2 border-background flex items-center justify-center">
                  <Check className="size-3 text-white stroke-[3]" />
                </div>
              )}
              <div className="absolute left-1/2 -translate-x-1/2 top-full mt-2 px-2.5 py-1.5 rounded-lg bg-foreground text-background text-[10px] font-semibold whitespace-nowrap opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity z-10 shadow-xl">
                {c.label}
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </div>
  )
}
