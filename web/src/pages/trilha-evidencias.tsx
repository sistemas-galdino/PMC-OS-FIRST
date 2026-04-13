import { useEffect, useMemo, useState } from "react"
import { useNavigate } from "react-router-dom"
import { supabase } from "@/lib/supabase"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import {
  ArrowLeftIcon as ArrowLeft,
  UploadIcon as Upload,
  ExternalLinkIcon as ExternalLink,
  CheckCircle2Icon as CheckCircle2,
  CheckIcon as Check,
  Trash2Icon as Trash2,
  AlertTriangleIcon as AlertTriangle,
  MapIcon as Map,
} from "@/components/ui/icons"
import type { Session } from "@supabase/supabase-js"
import { motion } from "framer-motion"
import { PILARES, type Pilar, type Campo } from "@/data/trilha-ia"

const STORAGE_BUCKET = "trilha-evidencias"

interface TrilhaEvidenciasPageProps {
  session?: Session
  clientId?: string
  embedded?: boolean
}

interface EvidenciaRow {
  id: string
  id_cliente: string
  pilar_id: string
  campos: Record<string, string>
  arquivos: Array<{ field_key: string; url: string; name: string }>
  comentario: string | null
  created_at: string
}

export default function TrilhaEvidenciasPage({ session, clientId, embedded }: TrilhaEvidenciasPageProps) {
  const navigate = useNavigate()
  const [resolvedClientId, setResolvedClientId] = useState<string | undefined>(clientId || session?.user?.id)
  const [loading, setLoading] = useState(true)
  const [rows, setRows] = useState<EvidenciaRow[]>([])

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
        .from("cliente_pilar_evidencias")
        .select("*")
        .eq("id_cliente", resolvedClientId)
        .order("created_at", { ascending: true })
      if (!cancelled) {
        setRows((data || []) as EvidenciaRow[])
        setLoading(false)
      }
    }
    fetchRows()
    return () => { cancelled = true }
  }, [resolvedClientId])

  const rowsByPilar = useMemo(() => {
    const map: Record<string, EvidenciaRow[]> = {}
    rows.forEach(r => {
      if (!map[r.pilar_id]) map[r.pilar_id] = []
      map[r.pilar_id].push(r)
    })
    return map
  }, [rows])

  const totals = useMemo(() => {
    const pilaresComEvidencia = PILARES.filter(p => (rowsByPilar[p.id]?.length ?? 0) > 0).length
    return {
      total: PILARES.length,
      done: pilaresComEvidencia,
      pct: Math.round((pilaresComEvidencia / PILARES.length) * 100),
    }
  }, [rowsByPilar])

  function handleSaved(newRow: EvidenciaRow) {
    setRows(prev => [...prev, newRow])
  }

  async function handleDelete(row: EvidenciaRow) {
    if (!confirm("Remover esta evidência?")) return
    await supabase.from("cliente_pilar_evidencias").delete().eq("id", row.id)
    setRows(prev => prev.filter(r => r.id !== row.id))
  }

  if (loading) {
    return (
      <div className="space-y-4">
        {[1, 2, 3].map(i => <div key={i} className="h-60 rounded-2xl bg-card/40 animate-pulse" />)}
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
            <p className="text-muted-foreground font-medium text-sm">Envie as evidências de implementação por pilar</p>
          </div>
        </div>
      </motion.div>

      <div className="flex items-center gap-4 p-5 rounded-2xl border border-border bg-muted/10 sticky top-0 z-20 backdrop-blur-md">
        <div className="flex-1">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground">Progresso Atual</span>
            <span className="text-sm font-bold text-foreground">{totals.done} de {totals.total} pilares enviados</span>
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

      <div className="space-y-6">
        {PILARES.map(pilar => (
          <PilarCard
            key={pilar.id}
            pilar={pilar}
            rows={rowsByPilar[pilar.id] ?? []}
            clientId={resolvedClientId}
            onSaved={handleSaved}
            onDelete={handleDelete}
          />
        ))}
      </div>
    </div>
  )
}

function PilarCard({
  pilar,
  rows,
  clientId,
  onSaved,
  onDelete,
}: {
  pilar: Pilar
  rows: EvidenciaRow[]
  clientId: string | undefined
  onSaved: (row: EvidenciaRow) => void
  onDelete: (row: EvidenciaRow) => void
}) {
  const hasRows = rows.length > 0
  const disabled = !pilar.permiteMultiplas && hasRows

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className={`rounded-2xl border overflow-hidden transition-all ${hasRows ? "border-primary/30 bg-primary/[0.02]" : "border-border bg-card/20"}`}
    >
      {/* Header */}
      <div className="p-5 border-b border-border/50 bg-muted/5">
        <div className="flex items-center gap-3">
          <div className="bg-primary/10 p-2 rounded-lg">
            <Map className="size-5 text-primary" />
          </div>
          <div className="flex-1">
            <h3 className="font-bold text-lg text-foreground">{pilar.titulo}</h3>
            <p className="text-xs text-muted-foreground mt-0.5">{pilar.subtitulo}</p>
          </div>
          {hasRows && (
            <div className="flex items-center gap-1.5 px-3 py-1 rounded-lg bg-primary/10 border border-primary/30 text-primary text-[10px] font-bold uppercase tracking-wider">
              <CheckCircle2 className="size-3" />
              {rows.length} enviada{rows.length > 1 ? "s" : ""}
            </div>
          )}
        </div>
      </div>

      <div className="grid md:grid-cols-[380px_1fr] gap-0">
        {/* LEFT — O que enviar + exemplo */}
        <div className="p-5 bg-muted/5 border-r border-border/50 space-y-4">
          <div>
            <h4 className="text-xs font-bold uppercase tracking-wider text-foreground mb-3">O que enviar:</h4>
            <ul className="space-y-2">
              {pilar.oQueEnviar.map((item, i) => (
                <li key={i} className="flex items-start gap-2 text-xs text-foreground/90 leading-relaxed">
                  <CheckCircle2 className="size-3.5 mt-0.5 text-primary shrink-0" />
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </div>

          {pilar.permiteMultiplas && (
            <div className="flex items-start gap-2 p-3 rounded-lg bg-muted/30 border border-border text-[11px] text-muted-foreground">
              <span>📌 Você pode enviar mais de uma evidência para este pilar.</span>
            </div>
          )}

          <div className="rounded-lg bg-muted/20 border border-border p-3 space-y-1">
            <div className="flex items-center gap-1 text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
              <span>💡</span> Exemplo de comentário:
            </div>
            <p className="text-[11px] text-muted-foreground italic leading-relaxed">
              {pilar.exemploComentario}
            </p>
          </div>

          <div className="flex items-center gap-1.5 text-[10px] font-bold text-amber-400">
            <AlertTriangle className="size-3" />
            Todos os campos são obrigatórios.
          </div>
        </div>

        {/* RIGHT — Form + lista */}
        <div className="p-5 space-y-5">
          {hasRows && (
            <div className="space-y-2">
              <Label className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">Evidências enviadas</Label>
              <div className="space-y-2">
                {rows.map((row, i) => (
                  <EvidenciaListItem key={row.id} row={row} pilar={pilar} index={i + 1} onDelete={onDelete} />
                ))}
              </div>
            </div>
          )}

          {!disabled && (
            <PilarForm pilar={pilar} clientId={clientId} onSaved={onSaved} showHeader={hasRows} />
          )}
        </div>
      </div>
    </motion.div>
  )
}

function EvidenciaListItem({
  row,
  pilar,
  index,
  onDelete,
}: {
  row: EvidenciaRow
  pilar: Pilar
  index: number
  onDelete: (row: EvidenciaRow) => void
}) {
  const primeiroCampoText = pilar.campos.find(c => c.tipo === "text")?.key
  const titulo = primeiroCampoText ? row.campos[primeiroCampoText] : `Evidência #${index}`
  return (
    <div className="flex items-center justify-between gap-2 p-3 rounded-xl border border-primary/20 bg-primary/[0.03]">
      <div className="flex items-center gap-2 min-w-0">
        <div className="size-7 rounded-md bg-primary/10 text-primary font-bold text-xs flex items-center justify-center shrink-0">
          {index}
        </div>
        <div className="min-w-0">
          <p className="text-xs font-bold text-foreground truncate">{titulo || `Evidência #${index}`}</p>
          {row.arquivos?.[0]?.url && (
            <a href={row.arquivos[0].url} target="_blank" rel="noreferrer" className="text-[10px] text-primary hover:underline inline-flex items-center gap-0.5">
              <ExternalLink className="size-2.5" /> arquivo
            </a>
          )}
        </div>
      </div>
      <Button variant="ghost" size="icon" className="size-8 rounded-lg hover:bg-destructive/10 hover:text-destructive shrink-0" onClick={() => onDelete(row)}>
        <Trash2 className="size-3.5" />
      </Button>
    </div>
  )
}

function PilarForm({
  pilar,
  clientId,
  onSaved,
  showHeader,
}: {
  pilar: Pilar
  clientId: string | undefined
  onSaved: (row: EvidenciaRow) => void
  showHeader: boolean
}) {
  const initialValues = useMemo(() => {
    const v: Record<string, string> = {}
    pilar.campos.forEach(c => { v[c.key] = "" })
    return v
  }, [pilar.campos])

  const [values, setValues] = useState<Record<string, string>>(initialValues)
  const [files, setFiles] = useState<Record<string, File | null>>({})
  const [comentario, setComentario] = useState("")
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  function isValid(): boolean {
    for (const c of pilar.campos) {
      if (c.obrigatorio) {
        if (c.tipo === "file") {
          if (!files[c.key]) return false
        } else {
          if (!values[c.key]?.trim()) return false
        }
      }
    }
    return !!comentario.trim()
  }

  async function uploadOne(key: string, file: File): Promise<{ field_key: string; url: string; name: string } | null> {
    if (!clientId) return null
    const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_")
    const path = `${clientId}/${Date.now()}-${crypto.randomUUID()}-${safeName}`
    const { error: upErr } = await supabase.storage.from(STORAGE_BUCKET).upload(path, file, {
      contentType: file.type || undefined,
      upsert: false,
    })
    if (upErr) {
      setError(`Falha no upload de ${file.name}: ${upErr.message}`)
      return null
    }
    const { data } = supabase.storage.from(STORAGE_BUCKET).getPublicUrl(path)
    return { field_key: key, url: data.publicUrl, name: file.name }
  }

  async function handleSubmit() {
    if (!clientId || !isValid()) return
    setSaving(true)
    setError(null)

    const uploaded: Array<{ field_key: string; url: string; name: string }> = []
    for (const [key, file] of Object.entries(files)) {
      if (!file) continue
      const res = await uploadOne(key, file)
      if (res) uploaded.push(res)
      else { setSaving(false); return }
    }

    const payload = {
      id_cliente: clientId,
      pilar_id: pilar.id,
      campos: values,
      arquivos: uploaded,
      comentario: comentario.trim(),
    }

    const { data, error: dbErr } = await supabase
      .from("cliente_pilar_evidencias")
      .insert(payload)
      .select()
      .single()

    if (dbErr || !data) {
      setError(dbErr?.message || "Falha ao salvar evidência")
      setSaving(false)
      return
    }

    onSaved(data as EvidenciaRow)
    setValues(initialValues)
    setFiles({})
    setComentario("")
    setSaving(false)
  }

  return (
    <div className="space-y-4">
      {showHeader && (
        <Label className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
          {pilar.permiteMultiplas ? "Adicionar nova evidência" : "Nova evidência"}
        </Label>
      )}

      {pilar.campos.map(campo => (
        <CampoField
          key={campo.key}
          campo={campo}
          value={values[campo.key] || ""}
          file={files[campo.key] || null}
          onValueChange={(v) => setValues(prev => ({ ...prev, [campo.key]: v }))}
          onFileChange={(f) => setFiles(prev => ({ ...prev, [campo.key]: f }))}
        />
      ))}

      <div className="space-y-2">
        <Label className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
          Comentário / Depoimento <span className="text-primary">*</span>
        </Label>
        <Textarea
          placeholder={pilar.exemploComentario}
          value={comentario}
          onChange={(e) => setComentario(e.target.value)}
          className="min-h-[110px]"
        />
        {pilar.comentarioHelp && (
          <p className="text-[10px] text-muted-foreground italic">{pilar.comentarioHelp}</p>
        )}
      </div>

      {error && <p className="text-[11px] text-destructive">{error}</p>}

      <Button
        className="w-full h-11 gap-2 rounded-xl"
        onClick={handleSubmit}
        disabled={saving || !isValid()}
      >
        <Check className="size-4" />
        <span className="font-bold uppercase tracking-wider text-[11px]">
          {saving ? "Enviando..." : "Enviar Evidência"}
        </span>
      </Button>
    </div>
  )
}

function CampoField({
  campo,
  value,
  file,
  onValueChange,
  onFileChange,
}: {
  campo: Campo
  value: string
  file: File | null
  onValueChange: (v: string) => void
  onFileChange: (f: File | null) => void
}) {
  const labelNode = (
    <Label className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
      {campo.label}
      {campo.opcional && <span className="text-muted-foreground/70 font-normal normal-case ml-1">(opcional)</span>}
      {campo.obrigatorio && <span className="text-primary ml-1">*</span>}
    </Label>
  )

  if (campo.tipo === "textarea") {
    return (
      <div className="space-y-2">
        {labelNode}
        <Textarea placeholder={campo.placeholder} value={value} onChange={(e) => onValueChange(e.target.value)} />
      </div>
    )
  }

  if (campo.tipo === "file") {
    return (
      <div className="space-y-2">
        {labelNode}
        <label className="flex items-center justify-center gap-2 h-11 px-4 rounded-xl border border-dashed border-border bg-muted/10 hover:bg-muted/20 hover:border-primary/30 transition-all cursor-pointer text-xs text-muted-foreground">
          <Upload className="size-4" />
          <span className="font-semibold truncate">{file ? file.name : "Escolher arquivo"}</span>
          <input
            type="file"
            className="hidden"
            accept="image/*,application/pdf,.doc,.docx"
            onChange={(e) => onFileChange(e.target.files?.[0] ?? null)}
          />
        </label>
      </div>
    )
  }

  return (
    <div className="space-y-2">
      {labelNode}
      <Input
        type={campo.tipo === "url" ? "url" : "text"}
        className="h-11 rounded-xl"
        placeholder={campo.placeholder}
        value={value}
        onChange={(e) => onValueChange(e.target.value)}
      />
    </div>
  )
}
