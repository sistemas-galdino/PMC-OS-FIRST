import { useEffect, useState, useMemo } from "react"
import { useNavigate } from "react-router-dom"
import { supabase } from "@/lib/supabase"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
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
  CheckCircle2Icon as CheckCircle2,
  ClockIcon as Clock,
  CircleIcon as Circle,
} from "@/components/ui/icons"
import type { Session } from "@supabase/supabase-js"
import { motion, AnimatePresence } from "framer-motion"
import { TRILHA_IA, type Passo, type Tarefa } from "@/data/trilha-ia"
import TrilhaEvidenciasPage from "@/pages/trilha-evidencias"

interface TrilhasPageProps {
  session?: Session
  clientId?: string
  embedded?: boolean
}

interface EvidenciaRow {
  tarefa_id: string
  concluida: boolean
  comentario: string | null
  evidencia_link: string | null
  evidencia_url: string | null
}

interface LinkRow { tarefa_id: string; link_url: string }

export default function TrilhasPage({ session, clientId, embedded }: TrilhasPageProps) {
  const navigate = useNavigate()
  const [resolvedClientId, setResolvedClientId] = useState<string | undefined>(clientId || session?.user?.id)
  const [isAdmin, setIsAdmin] = useState(false)
  const [loading, setLoading] = useState(true)
  const [evidencias, setEvidencias] = useState<Record<string, EvidenciaRow>>({})
  const [links, setLinks] = useState<Record<string, string>>({})
  const [openPassoId, setOpenPassoId] = useState<string | null>(null)
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
        supabase.from("cliente_trilha_evidencias").select("tarefa_id,concluida,comentario,evidencia_link,evidencia_url").eq("id_cliente", resolvedClientId),
        supabase.from("trilha_links").select("tarefa_id,link_url"),
        supabase.auth.getSession(),
      ])
      if (cancelled) return
      const evMap: Record<string, EvidenciaRow> = {}
      ;(evData || []).forEach((r: EvidenciaRow) => { evMap[r.tarefa_id] = r })
      setEvidencias(evMap)
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
    let total = 0
    let done = 0
    TRILHA_IA.passos.forEach(p => {
      p.tarefas.forEach(t => {
        total++
        if (evidencias[t.id]?.concluida) done++
      })
    })
    return { total, done, pct: total > 0 ? Math.round((done / total) * 100) : 0 }
  }, [evidencias])

  // Auto-open the first passo that isn't fully complete
  useEffect(() => {
    if (openPassoId) return
    const firstIncomplete = TRILHA_IA.passos.find(p =>
      p.tarefas.some(t => !evidencias[t.id]?.concluida)
    )
    setOpenPassoId(firstIncomplete?.id ?? TRILHA_IA.passos[0].id)
  }, [evidencias, openPassoId])

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

      {/* Progress pill */}
      <div className="flex items-center gap-4 p-5 rounded-2xl border border-border bg-muted/10">
        <div className="flex-1">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground">Progresso da Trilha</span>
            <span className="text-sm font-bold text-foreground">{totals.done} de {totals.total} tarefas concluídas</span>
          </div>
          <div className="h-2 rounded-full bg-muted overflow-hidden">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${totals.pct}%` }}
              transition={{ duration: 0.6, ease: "easeOut" }}
              className="h-full bg-primary rounded-full"
            />
          </div>
        </div>
        <div className="text-3xl font-bold tracking-tight text-primary shrink-0">{totals.pct}%</div>
      </div>

      {/* Passos */}
      <div className="space-y-4">
        {TRILHA_IA.passos.map((passo) => (
          <PassoCard
            key={passo.id}
            passo={passo}
            open={openPassoId === passo.id}
            onToggle={() => setOpenPassoId(openPassoId === passo.id ? null : passo.id)}
            evidencias={evidencias}
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
  evidencias: Record<string, EvidenciaRow>
  links: Record<string, string>
  isAdmin: boolean
  onSaveLink: (id: string, url: string) => Promise<void>
}

function PassoCard({ passo, open, onToggle, evidencias, links, isAdmin, onSaveLink }: PassoCardProps) {
  const doneCount = passo.tarefas.filter(t => evidencias[t.id]?.concluida).length
  const total = passo.tarefas.length
  const allDone = doneCount === total && total > 0

  return (
    <div className={`rounded-2xl border transition-all ${allDone ? "border-primary/40 bg-primary/[0.03]" : "border-border bg-card/20"}`}>
      <button
        type="button"
        onClick={onToggle}
        className="w-full flex items-center gap-4 p-5 text-left hover:bg-muted/10 transition-colors rounded-2xl"
      >
        <div className={`size-11 rounded-xl flex items-center justify-center font-bold text-lg shrink-0 ${allDone ? "bg-primary text-primary-foreground" : "bg-primary/10 text-primary border border-primary/20"}`}>
          {allDone ? <CheckCircle2 className="size-6" /> : passo.numero}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h3 className="font-bold text-base text-foreground">Passo {passo.numero} — {passo.titulo}</h3>
          </div>
          {passo.descricao && <p className="text-xs text-muted-foreground mt-1 line-clamp-1">{passo.descricao}</p>}
        </div>
        <div className="flex items-center gap-3 shrink-0">
          <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
            {doneCount}/{total}
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
                  {passo.descricao}
                </p>
              )}
              {passo.tarefas.map(t => (
                <TarefaRow
                  key={t.id}
                  tarefa={t}
                  ev={evidencias[t.id]}
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
  ev?: EvidenciaRow
  linkOverride?: string
  isAdmin: boolean
  onSaveLink: (id: string, url: string) => Promise<void>
}

function TarefaRow({ tarefa, ev, linkOverride, isAdmin, onSaveLink }: TarefaRowProps) {
  const [editingLink, setEditingLink] = useState(false)
  const [linkDraft, setLinkDraft] = useState(linkOverride ?? tarefa.linkPadrao ?? "")
  const [savingLink, setSavingLink] = useState(false)

  const effectiveLink = linkOverride ?? tarefa.linkPadrao ?? ""
  const concluida = ev?.concluida ?? false
  const started = !!ev && (ev.comentario || ev.evidencia_link || ev.evidencia_url)

  const status = concluida ? "concluida" : started ? "em_andamento" : "nao_iniciada"
  const statusConfig = {
    concluida: { label: "Concluída", icon: CheckCircle2, className: "bg-primary/10 text-primary border-primary/30" },
    em_andamento: { label: "Em andamento", icon: Clock, className: "bg-amber-500/10 text-amber-400 border-amber-500/30" },
    nao_iniciada: { label: "Não iniciada", icon: Circle, className: "bg-muted/30 text-muted-foreground border-border" },
  }[status]

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
          <div className="flex items-center gap-2 flex-wrap mb-1">
            <h4 className="font-semibold text-sm text-foreground">{tarefa.titulo}</h4>
            <Badge variant="outline" className={`text-[9px] font-bold uppercase tracking-wider rounded-md px-2 py-0.5 border ${statusConfig.className}`}>
              <statusConfig.icon className="size-3 mr-1" />
              {statusConfig.label}
            </Badge>
          </div>
          {tarefa.descricao && <p className="text-xs text-muted-foreground leading-relaxed">{tarefa.descricao}</p>}
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
                  Começar
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
