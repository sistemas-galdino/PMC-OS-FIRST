import { useEffect, useMemo, useRef, useState } from "react"
import { useNavigate } from "react-router-dom"
import { supabase } from "@/lib/supabase"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Checkbox } from "@/components/ui/checkbox"
import {
  ArrowLeftIcon as ArrowLeft,
  LinkIcon as LinkI,
  UploadIcon as Upload,
  ExternalLinkIcon as ExternalLink,
  CheckCircle2Icon as CheckCircle2,
  ClockIcon as Clock,
  CircleIcon as Circle,
  MapIcon as Map,
} from "@/components/ui/icons"
import type { Session } from "@supabase/supabase-js"
import { motion } from "framer-motion"
import { TRILHA_IA, type Passo, type Tarefa } from "@/data/trilha-ia"

const STORAGE_BUCKET = "trilha-evidencias"

interface TrilhaEvidenciasPageProps {
  session?: Session
  clientId?: string
  embedded?: boolean
}

interface EvidenciaRow {
  tarefa_id: string
  comentario: string | null
  evidencia_link: string | null
  evidencia_url: string | null
  concluida: boolean
}

export default function TrilhaEvidenciasPage({ session, clientId, embedded }: TrilhaEvidenciasPageProps) {
  const navigate = useNavigate()
  const [resolvedClientId, setResolvedClientId] = useState<string | undefined>(clientId || session?.user?.id)
  const [loading, setLoading] = useState(true)
  const [rows, setRows] = useState<Record<string, EvidenciaRow>>({})

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
    async function fetchRows() {
      const { data } = await supabase
        .from("cliente_trilha_evidencias")
        .select("tarefa_id,comentario,evidencia_link,evidencia_url,concluida")
        .eq("id_cliente", resolvedClientId)
      if (cancelled) return
      const map: Record<string, EvidenciaRow> = {}
      ;(data || []).forEach((r: EvidenciaRow) => { map[r.tarefa_id] = r })
      setRows(map)
      setLoading(false)
    }
    fetchRows()
    return () => { cancelled = true }
  }, [resolvedClientId])

  const totals = useMemo(() => {
    let total = 0
    let done = 0
    TRILHA_IA.passos.forEach(p => p.tarefas.forEach(t => {
      total++
      if (rows[t.id]?.concluida) done++
    }))
    return { total, done, pct: total > 0 ? Math.round((done / total) * 100) : 0 }
  }, [rows])

  async function upsertRow(tarefaId: string, patch: Partial<EvidenciaRow>) {
    if (!resolvedClientId) return
    const current = rows[tarefaId] ?? { tarefa_id: tarefaId, comentario: null, evidencia_link: null, evidencia_url: null, concluida: false }
    const next: EvidenciaRow = { ...current, ...patch }
    setRows(prev => ({ ...prev, [tarefaId]: next }))
    await supabase.from("cliente_trilha_evidencias").upsert({
      id_cliente: resolvedClientId,
      tarefa_id: tarefaId,
      comentario: next.comentario,
      evidencia_link: next.evidencia_link,
      evidencia_url: next.evidencia_url,
      concluida: next.concluida,
      updated_at: new Date().toISOString(),
    })
  }

  if (loading) {
    return (
      <div className="space-y-4">
        {[1, 2, 3].map(i => <div key={i} className="h-40 rounded-2xl bg-card/40 animate-pulse" />)}
      </div>
    )
  }

  return (
    <div className="space-y-8 pb-10">
      <motion.div
        initial={{ opacity: 0, x: -20 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.6 }}
        className="flex flex-col gap-4"
      >
        {!embedded && (
          <Button
            variant="outline"
            size="sm"
            className="h-9 gap-2 rounded-xl w-fit"
            onClick={() => navigate("/trilhas")}
          >
            <ArrowLeft className="size-4" />
            <span className="font-bold text-xs uppercase tracking-wider">Voltar à Trilha</span>
          </Button>
        )}
        <div className="flex items-center gap-5 border-l-4 border-primary pl-8 py-2">
          <div className="bg-primary/10 p-3.5 rounded-2xl shrink-0">
            <Map className="size-8 text-primary" />
          </div>
          <div className="flex flex-col gap-2">
            <h1 className="text-3xl lg:text-4xl font-bold tracking-tight text-foreground">Evidências</h1>
            <p className="text-muted-foreground font-medium text-sm">{TRILHA_IA.titulo}</p>
          </div>
        </div>
      </motion.div>

      <div className="flex items-center gap-4 p-5 rounded-2xl border border-border bg-muted/10 sticky top-0 z-20 backdrop-blur-md">
        <div className="flex-1">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground">Progresso Atual</span>
            <span className="text-sm font-bold text-foreground">{totals.done} de {totals.total}</span>
          </div>
          <div className="h-2 rounded-full bg-muted overflow-hidden">
            <motion.div
              animate={{ width: `${totals.pct}%` }}
              transition={{ duration: 0.5, ease: "easeOut" }}
              className="h-full bg-primary rounded-full"
            />
          </div>
        </div>
        <div className="text-3xl font-bold tracking-tight text-primary shrink-0">{totals.pct}%</div>
      </div>

      <div className="space-y-8">
        {TRILHA_IA.passos.map(passo => (
          <PassoSection key={passo.id} passo={passo} rows={rows} onUpsert={upsertRow} clientId={resolvedClientId} />
        ))}
      </div>
    </div>
  )
}

function PassoSection({
  passo,
  rows,
  onUpsert,
  clientId,
}: {
  passo: Passo
  rows: Record<string, EvidenciaRow>
  onUpsert: (id: string, patch: Partial<EvidenciaRow>) => Promise<void>
  clientId: string | undefined
}) {
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <div className="size-8 rounded-lg bg-primary/10 text-primary border border-primary/20 flex items-center justify-center font-bold text-sm shrink-0">
          {passo.numero}
        </div>
        <h2 className="text-lg font-bold text-foreground">Passo {passo.numero} — {passo.titulo}</h2>
      </div>
      <div className="space-y-3 pl-11">
        {passo.tarefas.map(t => (
          <TarefaEvidenciaCard key={t.id} tarefa={t} row={rows[t.id]} onUpsert={onUpsert} clientId={clientId} />
        ))}
      </div>
    </div>
  )
}

function TarefaEvidenciaCard({
  tarefa,
  row,
  onUpsert,
  clientId,
}: {
  tarefa: Tarefa
  row?: EvidenciaRow
  onUpsert: (id: string, patch: Partial<EvidenciaRow>) => Promise<void>
  clientId: string | undefined
}) {
  const [comentario, setComentario] = useState(row?.comentario ?? "")
  const [link, setLink] = useState(row?.evidencia_link ?? "")
  const [file, setFile] = useState<File | null>(null)
  const [saving, setSaving] = useState(false)
  const [uploadError, setUploadError] = useState<string | null>(null)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Sync local state when the row changes from parent (e.g. after upsert on another tarefa)
  useEffect(() => {
    setComentario(row?.comentario ?? "")
    setLink(row?.evidencia_link ?? "")
  }, [row?.tarefa_id, row?.comentario, row?.evidencia_link])

  // Debounced comentário autosave
  function onComentarioChange(v: string) {
    setComentario(v)
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => {
      onUpsert(tarefa.id, { comentario: v || null })
    }, 1200)
  }

  async function uploadFile(): Promise<string | null> {
    if (!file || !clientId) return null
    const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_")
    const path = `${clientId}/${Date.now()}-${crypto.randomUUID()}-${safeName}`
    const { error } = await supabase.storage.from(STORAGE_BUCKET).upload(path, file, {
      contentType: file.type || undefined,
      upsert: false,
    })
    if (error) {
      setUploadError(`Falha no upload: ${error.message}`)
      return null
    }
    const { data } = supabase.storage.from(STORAGE_BUCKET).getPublicUrl(path)
    return data.publicUrl
  }

  async function handleSubmit() {
    setSaving(true)
    setUploadError(null)
    let evidenciaUrl = row?.evidencia_url ?? null
    if (file) {
      const uploaded = await uploadFile()
      if (uploaded) evidenciaUrl = uploaded
    }
    await onUpsert(tarefa.id, {
      comentario: comentario || null,
      evidencia_link: link.trim() || null,
      evidencia_url: evidenciaUrl,
      concluida: true,
    })
    setFile(null)
    setSaving(false)
  }

  async function toggleConcluida(v: boolean) {
    await onUpsert(tarefa.id, { concluida: v })
  }

  const concluida = row?.concluida ?? false
  const started = !!row && (row.comentario || row.evidencia_link || row.evidencia_url)
  const status = concluida ? "concluida" : started ? "em_andamento" : "nao_iniciada"
  const statusConfig = {
    concluida: { label: "Concluída", icon: CheckCircle2, className: "bg-primary/10 text-primary border-primary/30" },
    em_andamento: { label: "Em andamento", icon: Clock, className: "bg-amber-500/10 text-amber-400 border-amber-500/30" },
    nao_iniciada: { label: "Não iniciada", icon: Circle, className: "bg-muted/30 text-muted-foreground border-border" },
  }[status]

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className={`rounded-2xl border p-5 transition-all ${concluida ? "border-primary/30 bg-primary/[0.03]" : "border-border bg-card/20 hover:border-primary/20"}`}
    >
      <div className="flex items-start justify-between gap-4 mb-4 flex-wrap">
        <div className="flex-1 min-w-0">
          <h3 className="font-bold text-base text-foreground">{tarefa.titulo}</h3>
          {tarefa.descricao && <p className="text-xs text-muted-foreground mt-1">{tarefa.descricao}</p>}
        </div>
        <Badge variant="outline" className={`text-[9px] font-bold uppercase tracking-wider rounded-md px-2 py-0.5 border ${statusConfig.className} shrink-0`}>
          <statusConfig.icon className="size-3 mr-1" />
          {statusConfig.label}
        </Badge>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <div className="space-y-2">
          <Label className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">Comentário</Label>
          <Textarea
            placeholder="Descreva o que você fez nesta tarefa..."
            value={comentario}
            onChange={(e) => onComentarioChange(e.target.value)}
          />
          <p className="text-[10px] text-muted-foreground italic">Autosalva ao parar de digitar.</p>
        </div>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">Evidência (link)</Label>
            <div className="relative">
              <LinkI className="absolute left-3.5 top-3 size-4 text-muted-foreground pointer-events-none" />
              <Input
                className="h-10 rounded-xl pl-10"
                placeholder="Cole um link (vídeo, doc, planilha...)"
                value={link}
                onChange={(e) => setLink(e.target.value)}
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">Anexar arquivo</Label>
            <label className="flex items-center justify-center gap-2 h-10 px-4 rounded-xl border border-dashed border-border bg-muted/10 hover:bg-muted/20 hover:border-primary/30 transition-all cursor-pointer text-xs text-muted-foreground">
              <Upload className="size-4" />
              <span className="font-semibold truncate">{file ? file.name : "Imagem, PDF ou documento"}</span>
              <input
                type="file"
                className="hidden"
                accept="image/*,application/pdf,.doc,.docx"
                onChange={(e) => setFile(e.target.files?.[0] ?? null)}
              />
            </label>
            {row?.evidencia_url && !file && (
              <a href={row.evidencia_url} target="_blank" rel="noreferrer" className="text-[11px] text-primary hover:underline inline-flex items-center gap-1">
                <ExternalLink className="size-3" /> Arquivo enviado
              </a>
            )}
            {uploadError && <p className="text-[11px] text-destructive">{uploadError}</p>}
          </div>
        </div>
      </div>

      <div className="flex items-center justify-between gap-3 mt-5 pt-4 border-t border-border/50 flex-wrap">
        <label className="flex items-center gap-2 cursor-pointer">
          <Checkbox
            checked={concluida}
            onCheckedChange={(v) => toggleConcluida(!!v)}
          />
          <span className="text-xs font-bold uppercase tracking-wider text-foreground">Marcar como concluída</span>
        </label>
        <Button
          className="h-10 gap-2 rounded-xl px-5"
          onClick={handleSubmit}
          disabled={saving || (!comentario.trim() && !link.trim() && !file && !row?.evidencia_url)}
        >
          <CheckCircle2 className="size-4" />
          <span className="font-bold uppercase tracking-wider text-[11px]">{saving ? "Enviando..." : "Enviar Evidência"}</span>
        </Button>
      </div>
    </motion.div>
  )
}
