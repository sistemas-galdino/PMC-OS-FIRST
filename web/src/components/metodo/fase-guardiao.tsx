// Fase 1 — Guardião da IA: quem executa a IA na empresa (1 ou mais guardiões).
import { useEffect, useState } from "react"
import { useNavigate } from "react-router-dom"
import { supabase } from "@/lib/supabase"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import {
  PlusIcon as Plus,
  Edit3Icon as Edit3,
  Trash2Icon as Trash2,
  ShieldCheckIcon as ShieldCheck,
  CheckCircle2Icon as CheckCircle2,
  MessageCircleIcon as MessageCircle,
  UploadIcon as Upload,
  XIcon as X,
  ClockIcon as Clock,
  CalendarIcon as Calendar,
  ChevronRightIcon as ChevronRight,
} from "@/components/ui/icons"
import { FaseHeader } from "./compartilhados"
import { MetodoNotas } from "./metodo-notas"
import { GuiaGuardiao } from "@/components/guardiao/guia-guardiao"

const FOTO_BUCKET = "guardiao-fotos"

interface Guardiao {
  id: string
  nome: string
  cargo: string | null
  setor: string | null
  email: string | null
  whatsapp: string | null
  observacoes: string | null
  principal: boolean
  foto_url: string | null
}

const FORM_VAZIO = { nome: "", cargo: "", setor: "", email: "", whatsapp: "", observacoes: "", principal: false, foto_url: "" }

export function FaseGuardiao({ clientId, assessmentUrl }: {
  clientId: string
  assessmentUrl?: string
}) {
  const navigate = useNavigate()
  const [guardioes, setGuardioes] = useState<Guardiao[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editando, setEditando] = useState<Guardiao | null>(null)
  const [form, setForm] = useState(FORM_VAZIO)
  const [file, setFile] = useState<File | null>(null)
  const [salvando, setSalvando] = useState(false)
  const [uploadErro, setUploadErro] = useState<string | null>(null)

  async function fetchGuardioes() {
    const { data } = await supabase
      .from("metodo_guardioes")
      .select("*")
      .eq("id_cliente", clientId)
      .order("principal", { ascending: false })
      .order("created_at")
    setGuardioes(data ?? [])
    setLoading(false)
  }

  useEffect(() => { fetchGuardioes() }, [clientId]) // eslint-disable-line react-hooks/exhaustive-deps

  function abrirNovo() {
    setEditando(null)
    setForm(FORM_VAZIO)
    setFile(null)
    setUploadErro(null)
    setShowForm(true)
  }

  function abrirEdicao(g: Guardiao) {
    setEditando(g)
    setForm({
      nome: g.nome, cargo: g.cargo ?? "", setor: g.setor ?? "", email: g.email ?? "",
      whatsapp: g.whatsapp ?? "", observacoes: g.observacoes ?? "", principal: g.principal,
      foto_url: g.foto_url ?? "",
    })
    setFile(null)
    setUploadErro(null)
    setShowForm(true)
  }

  async function uploadFoto(): Promise<string | null> {
    if (!file) return null
    const safe = file.name.replace(/[^a-zA-Z0-9._-]/g, "_")
    const path = `${clientId}/${Date.now()}-${crypto.randomUUID()}-${safe}`
    const { error } = await supabase.storage.from(FOTO_BUCKET).upload(path, file, {
      contentType: file.type || undefined,
      upsert: false,
    })
    if (error) {
      setUploadErro(`Falha no upload da foto: ${error.message}. O guardião será salvo sem a foto.`)
      return null
    }
    const { data } = supabase.storage.from(FOTO_BUCKET).getPublicUrl(path)
    return data.publicUrl
  }

  async function salvar() {
    if (!form.nome.trim()) return
    setSalvando(true)
    setUploadErro(null)
    let foto_url: string | null = form.foto_url || null
    if (file) {
      const uploaded = await uploadFoto()
      if (uploaded) foto_url = uploaded
    }
    const payload = {
      id_cliente: clientId,
      nome: form.nome.trim(),
      cargo: form.cargo.trim() || null,
      setor: form.setor.trim() || null,
      email: form.email.trim() || null,
      whatsapp: form.whatsapp.trim() || null,
      observacoes: form.observacoes.trim() || null,
      principal: form.principal,
      foto_url,
      updated_at: new Date().toISOString(),
    }
    const { error } = editando
      ? await supabase.from("metodo_guardioes").update(payload).eq("id", editando.id)
      : await supabase.from("metodo_guardioes").insert(payload)
    setSalvando(false)
    if (!error) {
      setShowForm(false)
      fetchGuardioes()
    }
  }

  async function excluir(id: string) {
    await supabase.from("metodo_guardioes").delete().eq("id", id)
    fetchGuardioes()
  }

  return (
    <div className="space-y-8">
      <FaseHeader numero={1} titulo="Guardião da IA" subtitulo="Quem executa a IA na sua empresa">
        <Button
          variant="ghost"
          className="h-10 gap-2 rounded-xl font-semibold text-xs text-muted-foreground hover:text-foreground"
          onClick={() => (assessmentUrl ? window.open(assessmentUrl, "_blank") : navigate("/guardiao"))}
        >
          <ShieldCheck className="size-4" />
          Avaliar perfil
        </Button>
        <Button className="h-10 gap-2 rounded-xl font-bold text-xs uppercase tracking-wider" onClick={abrirNovo}>
          <Plus className="size-4" />
          Cadastrar Guardião
        </Button>
      </FaseHeader>

      {guardioes.length > 0 && (
        <p className="text-[15px] font-medium text-muted-foreground leading-relaxed max-w-3xl">
          O Guardião é a ponte entre a tecnologia e a estratégia: ele executa a IA para que você fique no
          comando do negócio. A empresa pode ter mais de um.
        </p>
      )}

      {/* Seção: guardiões cadastrados */}
      <section className="space-y-3">
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div className="flex items-center gap-2">
            <h3 className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground">Guardiões</h3>
            {guardioes.length > 0 && (
              <Badge className="rounded-lg bg-primary/10 text-primary border-primary/20 px-2 py-0 text-[10px] font-bold">
                {guardioes.length}
              </Badge>
            )}
          </div>
          {guardioes.length > 0 && (
            <span className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-primary">
              <CheckCircle2 className="size-3.5" />
              Fase iniciada
            </span>
          )}
        </div>

      {loading ? (
        <div className="h-32 rounded-2xl bg-card/40 animate-pulse" />
      ) : guardioes.length === 0 ? (
        // Ainda não escolheu o guardião → traz o guia completo de como encontrar.
        <GuiaGuardiao
          onIr={(tab) => navigate(`/guardiao?tab=${tab}`)}
          slotAcoes={
            <div className="grid gap-3 sm:grid-cols-2">
              <button
                onClick={() => (assessmentUrl ? window.open(assessmentUrl, "_blank") : navigate("/guardiao?tab=convites"))}
                className="flex items-center gap-3 rounded-xl border border-primary/30 bg-primary/5 p-3.5 text-left hover:bg-primary/10 transition-colors"
              >
                <ShieldCheck className="size-5 text-primary shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-[13px] font-bold text-foreground">Ainda não sei quem é</p>
                  <p className="text-[12px] font-medium text-muted-foreground">Fazer o teste do Guardião</p>
                </div>
                <ChevronRight className="size-4 text-primary shrink-0" />
              </button>
              <button
                onClick={abrirNovo}
                className="flex items-center gap-3 rounded-xl border border-border p-3.5 text-left hover:border-primary/30 transition-colors"
              >
                <Plus className="size-5 text-muted-foreground shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-[13px] font-bold text-foreground">Já sei quem é</p>
                  <p className="text-[12px] font-medium text-muted-foreground">Cadastrar o guardião direto</p>
                </div>
                <ChevronRight className="size-4 text-muted-foreground shrink-0" />
              </button>
            </div>
          }
        />
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {guardioes.map((g) => (
            <Card key={g.id} className="group">
              <CardContent className="p-5">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-start gap-4 min-w-0">
                    {g.foto_url ? (
                      <img
                        src={g.foto_url}
                        alt={g.nome}
                        className="size-11 rounded-xl object-cover ring-1 ring-primary/30 shrink-0"
                      />
                    ) : (
                      <div className="bg-primary/10 p-2.5 rounded-xl shrink-0">
                        <ShieldCheck className="size-5 text-primary" />
                      </div>
                    )}
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="text-sm font-bold tracking-tight text-foreground">{g.nome}</p>
                        {g.principal && (
                          <Badge className="rounded-lg bg-primary/10 text-primary border-primary/20 px-2 py-0 text-[10px] font-bold">
                            PRINCIPAL
                          </Badge>
                        )}
                      </div>
                      {(g.cargo || g.setor) && (
                        <p className="text-[11px] font-medium text-muted-foreground">
                          {[g.cargo, g.setor].filter(Boolean).join(" · ")}
                        </p>
                      )}
                      {g.email && <p className="text-[11px] font-medium text-muted-foreground truncate">{g.email}</p>}
                      {g.observacoes && (
                        <p className="text-[12px] font-medium text-muted-foreground/80 mt-2 line-clamp-2">{g.observacoes}</p>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                    {g.whatsapp && (
                      <Button
                        variant="ghost" size="sm" className="size-8 p-0 rounded-lg"
                        onClick={() => window.open(`https://wa.me/${g.whatsapp!.replace(/\D/g, "")}`, "_blank")}
                      >
                        <MessageCircle className="size-4" />
                      </Button>
                    )}
                    <Button variant="ghost" size="sm" className="size-8 p-0 rounded-lg" onClick={() => abrirEdicao(g)}>
                      <Edit3 className="size-4" />
                    </Button>
                    <Button
                      variant="ghost" size="sm"
                      className="size-8 p-0 rounded-lg text-muted-foreground hover:text-destructive"
                      onClick={() => excluir(g.id)}
                    >
                      <Trash2 className="size-4" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
      </section>

      {/* Seção: rotina dos primeiros 30 dias */}
      <section className="space-y-3">
        <h3 className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground">
          Rotina do Guardião — primeiros 30 dias
        </h3>
        <div className="grid gap-4 md:grid-cols-2">
          <Card>
            <CardContent className="p-5 space-y-2.5">
              <span className="inline-flex items-center gap-1.5 rounded-lg bg-primary/10 border border-primary/20 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-primary">
                <Clock className="size-3.5" />
                Diário · 15 min
              </span>
              <p className="text-sm font-bold tracking-tight text-foreground">Reunião rápida em pé</p>
              <p className="text-[12px] font-medium text-muted-foreground leading-relaxed">
                Cada pessoa responde: <strong className="text-foreground">o que usou de IA ontem?</strong> e <strong className="text-foreground">o que vai usar de IA hoje?</strong>
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-5 space-y-2.5">
              <span className="inline-flex items-center gap-1.5 rounded-lg bg-primary/10 border border-primary/20 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-primary">
                <Calendar className="size-3.5" />
                Semanal · 45 min
              </span>
              <p className="text-sm font-bold tracking-tight text-foreground">Melhores boas práticas</p>
              <p className="text-[12px] font-medium text-muted-foreground leading-relaxed">
                Apresentação das melhores práticas de IA da semana. Use o <strong className="text-foreground">NotebookLM</strong> para montar a apresentação.
              </p>
            </CardContent>
          </Card>
        </div>
        <MetodoNotas
          clientId={clientId}
          chave="guardiao"
          titulo="Melhorias da rotina"
          placeholder="Anote aqui as melhorias, ajustes e ideias que surgirem na rotina do Guardião — o que funcionou, o que testar, o que padronizar…"
        />
      </section>

      <Dialog open={showForm} onOpenChange={setShowForm}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{editando ? "Editar Guardião" : "Cadastrar Guardião"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            {/* Foto do guardião */}
            <div className="flex items-center gap-4">
              {(() => {
                const preview = file ? URL.createObjectURL(file) : form.foto_url
                return preview ? (
                  <img src={preview} alt="Foto do guardião" className="size-16 rounded-2xl object-cover ring-1 ring-primary/30 shrink-0" />
                ) : (
                  <div className="size-16 rounded-2xl bg-primary/10 flex items-center justify-center shrink-0">
                    <ShieldCheck className="size-7 text-primary" />
                  </div>
                )
              })()}
              <div className="flex items-center gap-2">
                <label className="inline-flex items-center gap-2 h-9 px-3 rounded-xl border border-border text-xs font-bold uppercase tracking-wider cursor-pointer hover:border-primary/30 hover:bg-primary/5 transition-colors">
                  <Upload className="size-3.5" />
                  {file || form.foto_url ? "Trocar foto" : "Enviar foto"}
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => { setFile(e.target.files?.[0] ?? null); setUploadErro(null) }}
                  />
                </label>
                {(file || form.foto_url) && (
                  <Button
                    variant="ghost" size="sm"
                    className="h-9 gap-1.5 rounded-xl text-xs font-bold text-muted-foreground hover:text-destructive"
                    onClick={() => { setFile(null); setForm((p) => ({ ...p, foto_url: "" })) }}
                  >
                    <X className="size-3.5" />
                    Remover
                  </Button>
                )}
              </div>
            </div>
            {uploadErro && <p className="text-[12px] font-medium text-destructive">{uploadErro}</p>}
            <div className="space-y-2">
              <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Nome *</Label>
              <Input className="h-11 rounded-xl" value={form.nome} onChange={(e) => setForm((p) => ({ ...p, nome: e.target.value }))} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Cargo</Label>
                <Input className="h-11 rounded-xl" value={form.cargo} onChange={(e) => setForm((p) => ({ ...p, cargo: e.target.value }))} />
              </div>
              <div className="space-y-2">
                <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Setor</Label>
                <Input className="h-11 rounded-xl" placeholder="Comercial, Marketing, Operações..." value={form.setor} onChange={(e) => setForm((p) => ({ ...p, setor: e.target.value }))} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">WhatsApp</Label>
                <Input className="h-11 rounded-xl" placeholder="5511999999999" value={form.whatsapp} onChange={(e) => setForm((p) => ({ ...p, whatsapp: e.target.value }))} />
              </div>
              <div className="space-y-2">
                <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">E-mail</Label>
                <Input type="email" className="h-11 rounded-xl" value={form.email} onChange={(e) => setForm((p) => ({ ...p, email: e.target.value }))} />
              </div>
            </div>
            <div className="space-y-2">
              <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Observações</Label>
              <Textarea className="rounded-xl min-h-20" value={form.observacoes} onChange={(e) => setForm((p) => ({ ...p, observacoes: e.target.value }))} />
            </div>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                className="accent-[var(--color-primary)] size-4"
                checked={form.principal}
                onChange={(e) => setForm((p) => ({ ...p, principal: e.target.checked }))}
              />
              <span className="text-[13px] font-medium text-foreground">Guardião principal</span>
            </label>
          </div>
          <DialogFooter>
            <Button
              disabled={salvando || !form.nome.trim()}
              className="w-full h-11 rounded-xl font-bold uppercase tracking-wider text-xs"
              onClick={salvar}
            >
              {salvando ? "Salvando..." : "Salvar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
