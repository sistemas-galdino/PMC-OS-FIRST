import { useEffect, useState } from "react"
import { supabase } from "@/lib/supabase"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  TrophyIcon as Trophy,
  PlusIcon as Plus,
  Trash2Icon as Trash2,
  Edit3Icon as Edit3,
  CalendarIcon as Calendar,
  LinkIcon as LinkI,
  UploadIcon as Upload,
  TrendingUpIcon as TrendingUp,
  ExternalLinkIcon as ExternalLink,
} from "@/components/ui/icons"
import type { Session } from "@supabase/supabase-js"
import { motion, AnimatePresence } from "framer-motion"

interface Vitoria {
  id: string
  id_cliente: string
  titulo: string
  area: string
  origem: string
  gargalo_antes: string
  o_que_fez: string
  como_esta_agora: string
  valor_antes: number | null
  valor_depois: number | null
  qtd_antes: number | null
  qtd_depois: number | null
  data_vitoria: string
  evidencia_link: string | null
  evidencia_url: string | null
  created_at?: string
}

interface VitoriasPageProps {
  session?: Session
  clientId?: string
}

const AREAS = ["Vendas", "Marketing", "Gestão", "Financeiro", "Produto", "Operações", "Pessoas", "Outros"]
const ORIGENS = ["Mentoria", "Reunião com consultor", "Material do programa", "Networking", "Execução própria", "Outros"]

const STORAGE_BUCKET = "vitorias-evidencias"

const emptyForm = {
  titulo: "",
  area: "",
  origem: "",
  gargalo_antes: "",
  o_que_fez: "",
  como_esta_agora: "",
  valor_antes: "",
  valor_depois: "",
  qtd_antes: "",
  qtd_depois: "",
  data_vitoria: new Date().toISOString().slice(0, 10),
  evidencia_link: "",
}

export default function VitoriasPage({ session, clientId }: VitoriasPageProps) {
  const [resolvedClientId, setResolvedClientId] = useState<string | undefined>(clientId || session?.user?.id)
  const [vitorias, setVitorias] = useState<Vitoria[]>([])
  const [loading, setLoading] = useState(true)
  const [showSheet, setShowSheet] = useState(false)
  const [editing, setEditing] = useState<Vitoria | null>(null)
  const [saving, setSaving] = useState(false)
  const [uploadError, setUploadError] = useState<string | null>(null)
  const [form, setForm] = useState(emptyForm)
  const [file, setFile] = useState<File | null>(null)

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
    async function fetchVitorias() {
      const { data } = await supabase
        .from("cliente_vitorias")
        .select("*")
        .eq("id_cliente", resolvedClientId)
        .order("data_vitoria", { ascending: false })
      setVitorias(data || [])
      setLoading(false)
    }
    fetchVitorias()
  }, [resolvedClientId])

  function openNew() {
    setEditing(null)
    setForm(emptyForm)
    setFile(null)
    setUploadError(null)
    setShowSheet(true)
  }

  function openEdit(v: Vitoria) {
    setEditing(v)
    setForm({
      titulo: v.titulo,
      area: v.area,
      origem: v.origem,
      gargalo_antes: v.gargalo_antes,
      o_que_fez: v.o_que_fez,
      como_esta_agora: v.como_esta_agora,
      valor_antes: v.valor_antes != null ? String(v.valor_antes) : "",
      valor_depois: v.valor_depois != null ? String(v.valor_depois) : "",
      qtd_antes: v.qtd_antes != null ? String(v.qtd_antes) : "",
      qtd_depois: v.qtd_depois != null ? String(v.qtd_depois) : "",
      data_vitoria: v.data_vitoria,
      evidencia_link: v.evidencia_link ?? "",
    })
    setFile(null)
    setUploadError(null)
    setShowSheet(true)
  }

  async function handleDelete(v: Vitoria) {
    if (!confirm("Excluir esta vitória?")) return
    await supabase.from("cliente_vitorias").delete().eq("id", v.id)
    setVitorias(prev => prev.filter(x => x.id !== v.id))
  }

  function isValid(): boolean {
    return !!(form.titulo && form.area && form.origem && form.gargalo_antes && form.o_que_fez && form.como_esta_agora && form.data_vitoria)
  }

  async function uploadFile(): Promise<string | null> {
    if (!file || !resolvedClientId) return null
    const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_")
    const path = `${resolvedClientId}/${Date.now()}-${crypto.randomUUID()}-${safeName}`
    const { error } = await supabase.storage.from(STORAGE_BUCKET).upload(path, file, {
      contentType: file.type || undefined,
      upsert: false,
    })
    if (error) {
      setUploadError(`Falha no upload: ${error.message}. A vitória será salva sem o arquivo.`)
      return null
    }
    const { data } = supabase.storage.from(STORAGE_BUCKET).getPublicUrl(path)
    return data.publicUrl
  }

  async function handleSave() {
    if (!resolvedClientId || !isValid()) return
    setSaving(true)
    setUploadError(null)

    let evidencia_url: string | null = editing?.evidencia_url ?? null
    if (file) {
      const uploaded = await uploadFile()
      if (uploaded) evidencia_url = uploaded
    }

    const payload = {
      titulo: form.titulo.trim(),
      area: form.area,
      origem: form.origem,
      gargalo_antes: form.gargalo_antes.trim(),
      o_que_fez: form.o_que_fez.trim(),
      como_esta_agora: form.como_esta_agora.trim(),
      valor_antes: form.valor_antes === "" ? null : Number(form.valor_antes),
      valor_depois: form.valor_depois === "" ? null : Number(form.valor_depois),
      qtd_antes: form.qtd_antes === "" ? null : Number(form.qtd_antes),
      qtd_depois: form.qtd_depois === "" ? null : Number(form.qtd_depois),
      data_vitoria: form.data_vitoria,
      evidencia_link: form.evidencia_link.trim() || null,
      evidencia_url,
    }

    if (editing) {
      const { data, error } = await supabase
        .from("cliente_vitorias")
        .update(payload)
        .eq("id", editing.id)
        .select()
        .single()
      if (!error && data) {
        setVitorias(prev => prev.map(x => x.id === editing.id ? data : x))
        setShowSheet(false)
      }
    } else {
      const { data, error } = await supabase
        .from("cliente_vitorias")
        .insert([{ id_cliente: resolvedClientId, ...payload }])
        .select()
        .single()
      if (!error && data) {
        setVitorias(prev => [data, ...prev])
        setShowSheet(false)
      }
    }
    setSaving(false)
  }

  const container = {
    hidden: { opacity: 0 },
    show: { opacity: 1, transition: { staggerChildren: 0.08 } },
  }
  const itemV = {
    hidden: { y: 15, opacity: 0 },
    show: { y: 0, opacity: 1, transition: { duration: 0.4, ease: "easeOut" as const } },
  }

  if (loading) {
    return (
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {[1, 2, 3].map(i => <Card key={i} className="h-56 animate-pulse bg-card/40" />)}
      </div>
    )
  }

  const hasVitorias = vitorias.length > 0

  return (
    <div className="space-y-10 pb-10">
      <motion.div
        initial={{ opacity: 0, x: -20 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.6 }}
        className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between border-l-4 border-primary pl-8 py-2"
      >
        <div className="flex items-center gap-5">
          <div className="bg-primary/10 p-3.5 rounded-2xl">
            <Trophy className="size-8 text-primary" />
          </div>
          <div className="flex flex-col gap-2">
            <h1 className="text-4xl lg:text-5xl font-bold tracking-tight text-foreground">Central de Vitórias</h1>
            <p className="text-muted-foreground font-medium text-sm">Registre e acompanhe sua evolução dentro do programa.</p>
          </div>
        </div>
        {hasVitorias && (
          <Button className="h-12 gap-2 rounded-xl px-6 shadow-xl shadow-primary/10" onClick={openNew}>
            <Plus className="size-5" />
            <span className="font-bold uppercase tracking-wider text-[11px]">Nova Vitória</span>
          </Button>
        )}
      </motion.div>

      <AnimatePresence mode="popLayout">
        {!hasVitorias ? (
          <motion.div
            key="empty"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="rounded-2xl border-2 border-dashed border-border p-16 text-center bg-muted/5"
          >
            <div className="bg-primary/10 size-20 mx-auto rounded-2xl flex items-center justify-center mb-6">
              <Trophy className="size-10 text-primary" />
            </div>
            <p className="text-xl font-bold text-foreground mb-2">Você ainda não registrou nenhuma vitória</p>
            <p className="text-sm text-muted-foreground mb-8">Comece registrando sua primeira conquista no programa</p>
            <Button className="h-12 gap-2 rounded-xl px-8 shadow-xl shadow-primary/10" onClick={openNew}>
              <Plus className="size-5" />
              <span className="font-bold uppercase tracking-wider text-[11px]">Registrar Primeira Vitória</span>
            </Button>
          </motion.div>
        ) : (
          <motion.div
            key="grid"
            variants={container}
            initial="hidden"
            animate="show"
            className="grid gap-6 md:grid-cols-2 lg:grid-cols-3"
          >
            {vitorias.map((v) => <VitoriaCard key={v.id} v={v} onEdit={openEdit} onDelete={handleDelete} itemV={itemV} />)}
          </motion.div>
        )}
      </AnimatePresence>

      <Dialog open={showSheet} onOpenChange={(open) => { if (!open) setShowSheet(false) }}>
        <DialogContent className="p-0 flex flex-col bg-background border border-border sm:max-w-4xl max-h-[90vh]">
          <DialogHeader className="p-6 border-b border-border">
            <div className="flex items-center gap-3">
              <div className="bg-primary/10 p-2 rounded-lg">
                <Trophy className="size-5 text-primary" />
              </div>
              <DialogTitle className="text-lg font-bold text-foreground">
                {editing ? "Editar Vitória" : "Registrar Nova Vitória"}
              </DialogTitle>
            </div>
          </DialogHeader>

          <div className="flex-1 overflow-y-auto p-6">
            <div className="grid gap-6 md:grid-cols-2">
              {/* Column 1: identification + narrative */}
              <div className="space-y-5">
                <Field label="Qual foi a sua vitória?" required>
                  <Input
                    className="h-11 rounded-xl"
                    placeholder="Ex: Fechei 5 novos clientes essa semana"
                    value={form.titulo}
                    onChange={(e) => setForm(p => ({ ...p, titulo: e.target.value }))}
                  />
                </Field>

                <div className="grid grid-cols-2 gap-3">
                  <Field label="Área" required>
                    <Select value={form.area} onValueChange={(v) => setForm(p => ({ ...p, area: v }))}>
                      <SelectTrigger className="h-11 rounded-xl border-border bg-background">
                        <SelectValue placeholder="Selecione" />
                      </SelectTrigger>
                      <SelectContent>
                        {AREAS.map(a => <SelectItem key={a} value={a}>{a}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </Field>
                  <Field label="Origem" required>
                    <Select value={form.origem} onValueChange={(v) => setForm(p => ({ ...p, origem: v }))}>
                      <SelectTrigger className="h-11 rounded-xl border-border bg-background">
                        <SelectValue placeholder="Selecione" />
                      </SelectTrigger>
                      <SelectContent>
                        {ORIGENS.map(o => <SelectItem key={o} value={o}>{o}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </Field>
                </div>

                <Field label="Qual era o gargalo antes?" required>
                  <Textarea
                    placeholder="Ex: Não tinha vendas previsíveis"
                    value={form.gargalo_antes}
                    onChange={(e) => setForm(p => ({ ...p, gargalo_antes: e.target.value }))}
                  />
                </Field>

                <Field label="O que você fez para chegar nesse resultado?" required>
                  <Textarea
                    placeholder="Ex: Estruturei um funil de vendas"
                    value={form.o_que_fez}
                    onChange={(e) => setForm(p => ({ ...p, o_que_fez: e.target.value }))}
                  />
                </Field>

                <Field label="Como está agora?" required>
                  <Textarea
                    placeholder="Ex: Estou fechando vendas toda semana"
                    value={form.como_esta_agora}
                    onChange={(e) => setForm(p => ({ ...p, como_esta_agora: e.target.value }))}
                  />
                </Field>
              </div>

              {/* Column 2: numbers + meta + evidence */}
              <div className="space-y-5">
                <div className="p-5 rounded-2xl bg-muted/10 border border-border/50 space-y-4">
                  <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Adicionar números (opcional)</Label>
                  <div className="grid grid-cols-2 gap-3">
                    <NumField label="Valor antes (R$)" value={form.valor_antes} onChange={(v) => setForm(p => ({ ...p, valor_antes: v }))} />
                    <NumField label="Valor depois (R$)" value={form.valor_depois} onChange={(v) => setForm(p => ({ ...p, valor_depois: v }))} />
                    <NumField label="Qtd antes" value={form.qtd_antes} onChange={(v) => setForm(p => ({ ...p, qtd_antes: v }))} />
                    <NumField label="Qtd depois" value={form.qtd_depois} onChange={(v) => setForm(p => ({ ...p, qtd_depois: v }))} />
                  </div>
                </div>

                <Field label="Data da vitória" required>
                  <div className="relative">
                    <Calendar className="absolute left-3.5 top-3.5 size-4 text-muted-foreground pointer-events-none" />
                    <Input
                      type="date"
                      className="h-11 rounded-xl pl-10"
                      value={form.data_vitoria}
                      onChange={(e) => setForm(p => ({ ...p, data_vitoria: e.target.value }))}
                    />
                  </div>
                </Field>

                <Field label="Evidência (opcional)">
                  <div className="relative">
                    <LinkI className="absolute left-3.5 top-3.5 size-4 text-muted-foreground pointer-events-none" />
                    <Input
                      className="h-11 rounded-xl pl-10"
                      placeholder="Cole um link ou descreva a evidência"
                      value={form.evidencia_link}
                      onChange={(e) => setForm(p => ({ ...p, evidencia_link: e.target.value }))}
                    />
                  </div>
                </Field>

                <div className="space-y-2">
                  <label className="flex items-center justify-center gap-2 h-11 px-4 rounded-xl border border-dashed border-border bg-muted/10 hover:bg-muted/20 hover:border-primary/30 transition-all cursor-pointer text-sm text-muted-foreground">
                    <Upload className="size-4" />
                    <span className="font-semibold truncate">{file ? file.name : "Anexar arquivo (imagem, PDF, documento...)"}</span>
                    <input
                      type="file"
                      className="hidden"
                      accept="image/*,application/pdf,.doc,.docx"
                      onChange={(e) => setFile(e.target.files?.[0] ?? null)}
                    />
                  </label>
                  {editing?.evidencia_url && !file && (
                    <a href={editing.evidencia_url} target="_blank" rel="noreferrer" className="text-[11px] text-primary hover:underline flex items-center gap-1">
                      <ExternalLink className="size-3" /> Arquivo atual
                    </a>
                  )}
                  {uploadError && <p className="text-[11px] text-destructive">{uploadError}</p>}
                </div>
              </div>
            </div>
          </div>

          <DialogFooter className="p-6 border-t border-border flex-row justify-end gap-3">
            <Button
              variant="outline"
              className="h-11 rounded-xl font-bold uppercase tracking-wider text-xs px-6"
              onClick={() => setShowSheet(false)}
            >
              Cancelar
            </Button>
            <Button
              disabled={saving || !isValid()}
              className="h-11 rounded-xl font-bold uppercase tracking-wider text-xs gap-2 px-8"
              onClick={handleSave}
            >
              <Trophy className="size-4" />
              {saving ? "Salvando..." : (editing ? "Salvar Alterações" : "Registrar Vitória")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

function Field({ label, required, children }: { label: string; required?: boolean; children: React.ReactNode }) {
  return (
    <div className="space-y-2">
      <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
        {label}{required && <span className="text-primary ml-1">*</span>}
      </Label>
      {children}
    </div>
  )
}

function NumField({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <div className="space-y-1.5">
      <Label className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">{label}</Label>
      <Input
        type="number"
        className="h-10 rounded-lg"
        placeholder="0"
        value={value}
        onChange={(e) => onChange(e.target.value)}
      />
    </div>
  )
}

function Textarea(props: React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  const { className = "", ...rest } = props
  return (
    <textarea
      {...rest}
      className={`flex min-h-[88px] w-full rounded-xl border border-border bg-background px-3 py-2.5 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30 focus-visible:border-primary/50 disabled:cursor-not-allowed disabled:opacity-50 resize-y ${className}`}
    />
  )
}

function VitoriaCard({ v, onEdit, onDelete, itemV }: { v: Vitoria; onEdit: (v: Vitoria) => void; onDelete: (v: Vitoria) => void; itemV: any }) {
  const valorDelta = v.valor_antes != null && v.valor_depois != null ? v.valor_depois - v.valor_antes : null
  const valorPct = v.valor_antes != null && v.valor_antes !== 0 && v.valor_depois != null
    ? ((v.valor_depois - v.valor_antes) / Math.abs(v.valor_antes)) * 100
    : null
  const qtdDelta = v.qtd_antes != null && v.qtd_depois != null ? v.qtd_depois - v.qtd_antes : null

  return (
    <motion.div variants={itemV} layout>
      <Card className="group h-full flex flex-col hover:border-primary/30 transition-all duration-300">
        <CardHeader className="bg-muted/10 pb-5 border-b border-border/50">
          <div className="flex justify-between items-start gap-2">
            <div className="flex flex-wrap items-center gap-1.5">
              <Badge variant="outline" className="rounded-lg px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider bg-primary/10 border-primary/20 text-primary">
                {v.area}
              </Badge>
              <Badge variant="outline" className="rounded-lg px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider bg-muted/20 border-border text-muted-foreground">
                {v.origem}
              </Badge>
            </div>
            <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
              <Button variant="ghost" size="icon" className="size-8 rounded-lg hover:bg-muted/50" onClick={() => onEdit(v)}>
                <Edit3 className="size-3.5 text-muted-foreground" />
              </Button>
              <Button variant="ghost" size="icon" className="size-8 rounded-lg hover:bg-destructive/10 hover:text-destructive" onClick={() => onDelete(v)}>
                <Trash2 className="size-3.5" />
              </Button>
            </div>
          </div>
          <CardTitle className="mt-3 text-lg font-bold tracking-tight text-foreground line-clamp-2">
            {v.titulo}
          </CardTitle>
          <div className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
            <Calendar className="size-3 text-primary/60" />
            {new Date(v.data_vitoria + "T00:00:00").toLocaleDateString("pt-BR")}
          </div>
        </CardHeader>
        <CardContent className="pt-5 space-y-4 flex-1 flex flex-col">
          <p className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">Resultado</p>
          <p className="text-sm text-foreground/80 leading-relaxed line-clamp-3">
            {v.como_esta_agora}
          </p>

          {(valorDelta !== null || qtdDelta !== null) && (
            <div className="grid grid-cols-2 gap-2">
              {valorDelta !== null && (
                <div className="p-3 rounded-xl bg-primary/5 border border-primary/20">
                  <div className="flex items-center gap-1 text-[9px] font-bold uppercase tracking-widest text-muted-foreground mb-1">
                    <TrendingUp className="size-3 text-primary" /> Valor
                  </div>
                  <p className="text-sm font-bold text-foreground">R$ {v.valor_antes} → R$ {v.valor_depois}</p>
                  {valorPct !== null && (
                    <p className="text-[10px] font-bold text-primary mt-0.5">{valorPct >= 0 ? "+" : ""}{valorPct.toFixed(0)}%</p>
                  )}
                </div>
              )}
              {qtdDelta !== null && (
                <div className="p-3 rounded-xl bg-muted/20 border border-border">
                  <div className="flex items-center gap-1 text-[9px] font-bold uppercase tracking-widest text-muted-foreground mb-1">
                    <TrendingUp className="size-3 text-primary" /> Quantidade
                  </div>
                  <p className="text-sm font-bold text-foreground">{v.qtd_antes} → {v.qtd_depois}</p>
                  <p className="text-[10px] font-bold text-primary mt-0.5">{qtdDelta >= 0 ? "+" : ""}{qtdDelta}</p>
                </div>
              )}
            </div>
          )}

          <div className="mt-auto pt-2 flex flex-wrap gap-2">
            {v.evidencia_link && (
              <a
                href={/^https?:\/\//.test(v.evidencia_link) ? v.evidencia_link : undefined}
                target={/^https?:\/\//.test(v.evidencia_link) ? "_blank" : undefined}
                rel="noreferrer"
                className={`inline-flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-lg border ${/^https?:\/\//.test(v.evidencia_link) ? "bg-primary/5 border-primary/20 text-primary hover:bg-primary/10" : "bg-muted/20 border-border text-muted-foreground cursor-default"}`}
              >
                <LinkI className="size-3" /> Evidência
              </a>
            )}
            {v.evidencia_url && (
              <a
                href={v.evidencia_url}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-lg border bg-muted/20 border-border text-muted-foreground hover:bg-primary/5 hover:text-primary hover:border-primary/20"
              >
                <ExternalLink className="size-3" /> Arquivo
              </a>
            )}
          </div>
        </CardContent>
      </Card>
    </motion.div>
  )
}
