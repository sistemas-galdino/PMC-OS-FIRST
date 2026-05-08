import { useEffect, useMemo, useState } from "react"
import { motion } from "framer-motion"
import { supabase } from "@/lib/supabase"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  CheckSquareIcon,
  PlusIcon,
  CalendarIcon,
  FileTextIcon,
  UserCheckIcon,
  Trash2Icon,
} from "@/components/ui/icons"

const TIPO_OPTIONS = [
  { v: "enviar_proximos_passos", l: "Enviar próximos passos" },
  { v: "cobrar_material", l: "Cobrar material" },
  { v: "agendar_reuniao", l: "Agendar reunião" },
  { v: "confirmar_reuniao", l: "Confirmar reunião" },
  { v: "follow_up_whatsapp", l: "Fazer follow-up no WhatsApp" },
  { v: "atualizar_cadastro", l: "Atualizar cadastro" },
  { v: "acompanhar_implementacao", l: "Acompanhar implementação" },
  { v: "validar_entrega", l: "Validar entrega" },
  { v: "cobrar_resposta", l: "Cobrar resposta" },
  { v: "engajar_cliente", l: "Engajar cliente" },
  { v: "atualizar_saude", l: "Atualizar saúde" },
  { v: "atualizar_risco", l: "Atualizar risco" },
  { v: "outro", l: "Outro" },
] as const

const ENTREGA_OPTIONS = [
  { v: "reuniao_galdino", l: "Reunião com Galdino" },
  { v: "reuniao_consultor", l: "Reunião com Consultor" },
  { v: "multiplica_time", l: "Multiplica Time" },
  { v: "multiplica_dono", l: "Multiplica Dono" },
  { v: "multiplica_case", l: "Multiplica Case" },
  { v: "black_crm", l: "Black CRM" },
  { v: "guardiao_ia", l: "Guardião de IA" },
  { v: "trilha_ia", l: "Trilha de IA" },
  { v: "area_membros", l: "Área de Membros" },
  { v: "whatsapp", l: "WhatsApp" },
  { v: "renovacao", l: "Renovação" },
  { v: "financeiro", l: "Financeiro" },
  { v: "outro", l: "Outro" },
] as const

const PRIORIDADE_OPTIONS = [
  { v: "baixa", l: "Baixa" },
  { v: "media", l: "Média" },
  { v: "alta", l: "Alta" },
] as const

const STATUS_OPTIONS = [
  { v: "pendente", l: "Pendente" },
  { v: "em_andamento", l: "Em andamento" },
  { v: "impedido", l: "Impedido" },
  { v: "realizado", l: "Realizado" },
  { v: "atrasado", l: "Atrasado" },
  { v: "cancelado", l: "Cancelado" },
] as const

const RESPONSAVEL_OPTIONS = [
  { v: "Geovana", l: "Geovana" },
  { v: "Francielly", l: "Francielly" },
  { v: "Gabriela", l: "Gabriela" },
  { v: "Fernanda", l: "Fernanda" },
] as const

const SENTINEL_NONE = "__none__"

interface Atividade {
  id: string
  id_cliente: string
  titulo: string
  descricao: string | null
  tipo: string | null
  tipo_outro: string | null
  entrega_relacionada: string | null
  entrega_outro: string | null
  prioridade: "baixa" | "media" | "alta"
  prazo: string | null
  status: "pendente" | "em_andamento" | "impedido" | "realizado" | "atrasado" | "cancelado"
  responsavel_cs: string | null
  observacoes: string | null
  created_at: string
}

const EMPTY_FORM = {
  titulo: "",
  descricao: "",
  tipo: "",
  tipo_outro: "",
  entrega_relacionada: "",
  entrega_outro: "",
  prioridade: "media" as "baixa" | "media" | "alta",
  prazo: "",
  status: "pendente" as Atividade["status"],
  responsavel_cs: "",
  observacoes: "",
}

function formatDate(iso: string | null | undefined): string {
  if (!iso) return "—"
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(iso)
  if (m) return `${m[3]}/${m[2]}/${m[1]}`
  return iso
}

function todayIso(): string {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`
}

function labelOf(opts: readonly { v: string; l: string }[], v: string | null | undefined): string {
  if (!v) return ""
  return opts.find((o) => o.v === v)?.l ?? v
}

export default function TabAtividades({ clientId }: { clientId: string }) {
  const [empresaNome, setEmpresaNome] = useState<string>("")
  const [atividades, setAtividades] = useState<Atividade[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  const [modalOpen, setModalOpen] = useState(false)
  const [creating, setCreating] = useState(false)
  const [form, setForm] = useState(EMPTY_FORM)

  async function load() {
    setLoading(true)
    const [empresaRes, atividadesRes] = await Promise.all([
      supabase
        .from("clientes_entrada_new")
        .select("nome_empresa_formatado")
        .eq("id_cliente", clientId)
        .maybeSingle(),
      supabase
        .from("cliente_atividades")
        .select("*")
        .eq("id_cliente", clientId)
        .order("created_at", { ascending: false }),
    ])
    if (empresaRes.data) setEmpresaNome(empresaRes.data.nome_empresa_formatado ?? "")
    if (atividadesRes.error) setError(atividadesRes.error.message)
    else setAtividades((atividadesRes.data ?? []) as Atividade[])
    setLoading(false)
  }

  useEffect(() => {
    load().catch((e) => {
      setError(e?.message ?? "Erro ao carregar atividades")
      setLoading(false)
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [clientId])

  function notifyChange() {
    window.dispatchEvent(new Event("atividades:changed"))
  }

  function resetForm() {
    setForm(EMPTY_FORM)
  }

  async function handleCreate() {
    if (!form.titulo.trim()) return
    setCreating(true)
    setError(null)

    const insertPayload = {
      id_cliente: clientId,
      titulo: form.titulo.trim(),
      descricao: form.descricao.trim() || null,
      tipo: form.tipo || null,
      tipo_outro: form.tipo === "outro" ? form.tipo_outro.trim() || null : null,
      entrega_relacionada: form.entrega_relacionada || null,
      entrega_outro: form.entrega_relacionada === "outro" ? form.entrega_outro.trim() || null : null,
      prioridade: form.prioridade,
      prazo: form.prazo || null,
      status: form.status,
      responsavel_cs: form.responsavel_cs || null,
      observacoes: form.observacoes.trim() || null,
    }

    const { error: insertErr } = await supabase
      .from("cliente_atividades")
      .insert(insertPayload)

    if (insertErr) {
      setError(insertErr.message)
      setCreating(false)
      return
    }

    setModalOpen(false)
    resetForm()
    setCreating(false)
    setSuccess("Atividade criada com sucesso.")
    setTimeout(() => setSuccess(null), 3000)
    await load()
    notifyChange()
  }

  async function handleStatusChange(atividade: Atividade, newStatus: Atividade["status"]) {
    const { error: updErr } = await supabase
      .from("cliente_atividades")
      .update({ status: newStatus, updated_at: new Date().toISOString() })
      .eq("id", atividade.id)
    if (updErr) {
      setError(updErr.message)
      return
    }
    await load()
    notifyChange()
  }

  async function handleDelete(atividade: Atividade) {
    if (!confirm(`Excluir atividade "${atividade.titulo}"?`)) return
    const { error: delErr } = await supabase
      .from("cliente_atividades")
      .delete()
      .eq("id", atividade.id)
    if (delErr) {
      setError(delErr.message)
      return
    }
    await load()
    notifyChange()
  }

  if (loading) {
    return (
      <Card className="p-12 flex items-center justify-center hover:translate-y-0">
        <div className="size-10 border-4 border-primary/20 border-t-primary rounded-full animate-spin" />
      </Card>
    )
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="space-y-4"
    >
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <h3 className="flex items-center gap-2 text-base font-bold text-foreground">
          <CheckSquareIcon className="size-4 text-yellow-400" />
          Atividades do cliente
        </h3>
        <Button
          onClick={() => {
            resetForm()
            setModalOpen(true)
          }}
          className="rounded-xl"
        >
          <PlusIcon className="size-4" />
          Nova atividade
        </Button>
      </div>

      {error && (
        <div className="rounded-xl border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm font-medium text-destructive">
          {error}
        </div>
      )}
      {success && (
        <div className="rounded-xl border border-primary/30 bg-primary/10 px-4 py-3 text-sm font-medium text-foreground">
          {success}
        </div>
      )}

      {atividades.length === 0 ? (
        <Card className="p-12 flex flex-col items-center justify-center text-center gap-3 hover:translate-y-0">
          <div className="size-14 rounded-2xl bg-muted/30 border border-border flex items-center justify-center text-muted-foreground">
            <CheckSquareIcon className="size-6" />
          </div>
          <p className="text-sm font-medium text-muted-foreground max-w-md">
            Nenhuma atividade registrada ainda. Clique em "Nova atividade" para começar.
          </p>
        </Card>
      ) : (
        <div className="space-y-3">
          {atividades.map((a) => (
            <AtividadeCard
              key={a.id}
              atividade={a}
              onStatusChange={(s) => handleStatusChange(a, s)}
              onDelete={() => handleDelete(a)}
            />
          ))}
        </div>
      )}

      <Dialog
        open={modalOpen}
        onOpenChange={(o) => {
          setModalOpen(o)
          if (!o) resetForm()
        }}
      >
        <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Nova atividade {empresaNome ? `— ${empresaNome}` : ""}</DialogTitle>
          </DialogHeader>

          <div className="space-y-3">
            <Field label="Título *">
              <Input
                value={form.titulo}
                onChange={(e) => setForm((f) => ({ ...f, titulo: e.target.value }))}
                placeholder="Ex.: Cobrar planilha de mapeamento"
              />
            </Field>

            <Field label="Descrição">
              <Textarea
                value={form.descricao}
                onChange={(e) => setForm((f) => ({ ...f, descricao: e.target.value }))}
                rows={2}
                placeholder="Contexto adicional..."
              />
            </Field>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <SelectField
                label="Tipo"
                value={form.tipo}
                onChange={(v) => setForm((f) => ({ ...f, tipo: v }))}
                options={TIPO_OPTIONS}
              />
              <SelectField
                label="Entrega relacionada"
                value={form.entrega_relacionada}
                onChange={(v) => setForm((f) => ({ ...f, entrega_relacionada: v }))}
                options={ENTREGA_OPTIONS}
              />
            </div>

            {form.tipo === "outro" && (
              <Field label="Especifique o tipo">
                <Input
                  value={form.tipo_outro}
                  onChange={(e) => setForm((f) => ({ ...f, tipo_outro: e.target.value }))}
                />
              </Field>
            )}

            {form.entrega_relacionada === "outro" && (
              <Field label="Especifique a entrega">
                <Input
                  value={form.entrega_outro}
                  onChange={(e) => setForm((f) => ({ ...f, entrega_outro: e.target.value }))}
                />
              </Field>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <Field label="Prioridade">
                <Select
                  value={form.prioridade}
                  onValueChange={(v) =>
                    setForm((f) => ({ ...f, prioridade: v as typeof f.prioridade }))
                  }
                >
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {PRIORIDADE_OPTIONS.map((o) => (
                      <SelectItem key={o.v} value={o.v}>
                        {o.l}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Field>
              <Field label="Prazo">
                <Input
                  type="date"
                  value={form.prazo}
                  onChange={(e) => setForm((f) => ({ ...f, prazo: e.target.value }))}
                />
              </Field>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <Field label="Status">
                <Select
                  value={form.status}
                  onValueChange={(v) =>
                    setForm((f) => ({ ...f, status: v as Atividade["status"] }))
                  }
                >
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {STATUS_OPTIONS.map((o) => (
                      <SelectItem key={o.v} value={o.v}>
                        {o.l}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Field>
              <SelectField
                label="Responsável CS"
                value={form.responsavel_cs}
                onChange={(v) => setForm((f) => ({ ...f, responsavel_cs: v }))}
                options={RESPONSAVEL_OPTIONS}
              />
            </div>

            <Field label="Observações">
              <Textarea
                value={form.observacoes}
                onChange={(e) => setForm((f) => ({ ...f, observacoes: e.target.value }))}
                rows={3}
                placeholder="Notas internas..."
              />
            </Field>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setModalOpen(false)
                resetForm()
              }}
              disabled={creating}
              className="rounded-xl"
            >
              Cancelar
            </Button>
            <Button
              onClick={handleCreate}
              disabled={creating || !form.titulo.trim()}
              className="rounded-xl"
            >
              {creating ? "Criando..." : "Criar atividade"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </motion.div>
  )
}

function AtividadeCard({
  atividade,
  onStatusChange,
  onDelete,
}: {
  atividade: Atividade
  onStatusChange: (s: Atividade["status"]) => void
  onDelete: () => void
}) {
  const tipoLabel = atividade.tipo === "outro"
    ? atividade.tipo_outro || "Outro"
    : labelOf(TIPO_OPTIONS, atividade.tipo)
  const entregaLabel = atividade.entrega_relacionada === "outro"
    ? atividade.entrega_outro || "Outro"
    : labelOf(ENTREGA_OPTIONS, atividade.entrega_relacionada)

  const today = todayIso()
  const isAtrasada =
    atividade.prazo !== null &&
    atividade.prazo < today &&
    !["realizado", "cancelado"].includes(atividade.status)

  const prioridadeColor = useMemo(() => {
    if (atividade.prioridade === "alta") return "bg-destructive/15 text-destructive border-destructive/30"
    if (atividade.prioridade === "media") return "bg-yellow-400/15 text-yellow-400 border-yellow-400/30"
    return "bg-muted/30 text-muted-foreground border-border"
  }, [atividade.prioridade])

  return (
    <Card className="hover:translate-y-0">
      <CardContent className="p-5">
        <div className="flex justify-between gap-4">
          <div className="flex-1 min-w-0 space-y-2">
            <h4 className="text-base font-bold tracking-tight text-foreground">{atividade.titulo}</h4>
            {atividade.descricao && (
              <p className="text-sm text-muted-foreground">{atividade.descricao}</p>
            )}

            <div className="flex flex-wrap items-center gap-3 text-xs">
              {tipoLabel && (
                <span className="inline-flex items-center gap-1 text-muted-foreground">
                  <FileTextIcon className="size-3.5" />
                  {tipoLabel}
                </span>
              )}
              {entregaLabel && (
                <span className="inline-flex items-center rounded-md border border-border bg-muted/20 px-2 py-0.5 text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                  {entregaLabel}
                </span>
              )}
              {atividade.prazo && (
                <span
                  className={`inline-flex items-center gap-1 ${
                    isAtrasada ? "text-destructive font-bold" : "text-muted-foreground"
                  }`}
                >
                  <CalendarIcon className="size-3.5" />
                  {formatDate(atividade.prazo)}
                  {isAtrasada && " (atrasada)"}
                </span>
              )}
              {atividade.responsavel_cs && (
                <span className="inline-flex items-center gap-1 text-muted-foreground">
                  <UserCheckIcon className="size-3.5" />
                  {atividade.responsavel_cs}
                </span>
              )}
            </div>

            {atividade.observacoes && (
              <p className="italic text-xs text-muted-foreground">{atividade.observacoes}</p>
            )}
          </div>

          <div className="flex flex-col items-end gap-2 shrink-0 w-40">
            <span
              className={`inline-flex items-center rounded-md border px-2 py-0.5 text-[10px] font-bold uppercase tracking-widest ${prioridadeColor}`}
            >
              {labelOf(PRIORIDADE_OPTIONS, atividade.prioridade)}
            </span>

            <Select
              value={atividade.status}
              onValueChange={(v) => onStatusChange(v as Atividade["status"])}
            >
              <SelectTrigger className="w-full h-8 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {STATUS_OPTIONS.map((o) => (
                  <SelectItem key={o.v} value={o.v}>
                    {o.l}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Button
              variant="ghost"
              size="sm"
              className="text-destructive hover:text-destructive h-8 px-2"
              onClick={onDelete}
            >
              <Trash2Icon className="size-3.5" />
              Excluir
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
        {label}
      </Label>
      {children}
    </div>
  )
}

function SelectField({
  label,
  value,
  onChange,
  options,
}: {
  label: string
  value: string
  onChange: (v: string) => void
  options: readonly { v: string; l: string }[]
}) {
  return (
    <Field label={label}>
      <Select
        value={value || SENTINEL_NONE}
        onValueChange={(v) => onChange(v === SENTINEL_NONE ? "" : v)}
      >
        <SelectTrigger className="w-full">
          <SelectValue placeholder="Selecionar..." />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value={SENTINEL_NONE}>—</SelectItem>
          {options.map((o) => (
            <SelectItem key={o.v} value={o.v}>
              {o.l}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </Field>
  )
}
