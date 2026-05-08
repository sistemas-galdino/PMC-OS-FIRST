import { useEffect, useState } from "react"
import { motion } from "framer-motion"
import { supabase } from "@/lib/supabase"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { XIcon, AlertTriangleIcon } from "@/components/ui/icons"

const MOTIVOS = [
  { v: "financeiro", l: "Financeiro" },
  { v: "falta_tempo", l: "Falta de tempo" },
  { v: "nao_viu_valor", l: "Não viu valor" },
  { v: "problemas_internos", l: "Problemas internos" },
  { v: "nao_se_adaptou", l: "Não se adaptou à mentoria" },
  { v: "falta_implementacao", l: "Falta de implementação" },
  { v: "problema_equipe", l: "Problema com equipe" },
  { v: "expectativa_desalinhada", l: "Expectativa desalinhada" },
  { v: "outro", l: "Outro" },
] as const

const RESPONSABILIDADE_OPTIONS = [
  { v: "cliente", l: "Cliente" },
  { v: "programa", l: "Programa" },
  { v: "comunicacao", l: "Comunicação" },
  { v: "operacional", l: "Operacional" },
  { v: "nao_identificado", l: "Não identificado" },
] as const

const SENTINEL_NONE = "__none__"

interface CancelamentoState {
  motivos: string[]
  responsabilidade: string
  tentativaReversao: boolean
  resumo: string
  dataCancelamento: string
}

function todayIso(): string {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`
}

const EMPTY: CancelamentoState = {
  motivos: [],
  responsabilidade: "",
  tentativaReversao: false,
  resumo: "",
  dataCancelamento: todayIso(),
}

export default function TabCancelamento({ clientId }: { clientId: string }) {
  const [empresaNome, setEmpresaNome] = useState<string>("")
  const [form, setForm] = useState<CancelamentoState>(EMPTY)
  const [hasExisting, setHasExisting] = useState(false)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  useEffect(() => {
    let cancelled = false
    setLoading(true)

    async function load() {
      const [empresaRes, cancelRes] = await Promise.all([
        supabase
          .from("clientes_entrada_new")
          .select("nome_empresa_formatado")
          .eq("id_cliente", clientId)
          .maybeSingle(),
        supabase
          .from("cliente_cancelamento")
          .select("*")
          .eq("id_cliente", clientId)
          .maybeSingle(),
      ])

      if (cancelled) return
      if (empresaRes.data) setEmpresaNome(empresaRes.data.nome_empresa_formatado ?? "")

      if (cancelRes.error && cancelRes.error.code !== "PGRST116") {
        setError(cancelRes.error.message)
        setLoading(false)
        return
      }

      if (cancelRes.data) {
        const next: CancelamentoState = {
          motivos: (cancelRes.data.motivos as string[]) ?? [],
          responsabilidade: cancelRes.data.responsabilidade ?? "",
          tentativaReversao: !!cancelRes.data.tentativa_reversao,
          resumo: cancelRes.data.resumo_ocorrido ?? "",
          dataCancelamento: cancelRes.data.data_cancelamento ?? todayIso(),
        }
        setForm(next)
        setHasExisting(true)
      }
      setLoading(false)
    }

    load().catch((e) => {
      if (cancelled) return
      setError(e?.message || "Erro ao carregar cancelamento")
      setLoading(false)
    })

    return () => {
      cancelled = true
    }
  }, [clientId])

  function toggleMotivo(v: string) {
    setForm((f) => ({
      ...f,
      motivos: f.motivos.includes(v) ? f.motivos.filter((m) => m !== v) : [...f.motivos, v],
    }))
  }

  async function handleRegistrar() {
    const empresaLabel = empresaNome ? ` de ${empresaNome}` : ""
    const action = hasExisting ? "Atualizar" : "Registrar"
    if (!confirm(`${action} cancelamento${empresaLabel}? Isso vai marcar o cliente como cancelado.`)) {
      return
    }

    setSaving(true)
    setError(null)
    setSuccess(false)

    const upsertPayload = {
      id_cliente: clientId,
      motivos: form.motivos,
      responsabilidade: form.responsabilidade || null,
      tentativa_reversao: form.tentativaReversao,
      resumo_ocorrido: form.resumo || null,
      data_cancelamento: form.dataCancelamento || todayIso(),
      updated_at: new Date().toISOString(),
    }

    const { error: upErr } = await supabase
      .from("cliente_cancelamento")
      .upsert(upsertPayload, { onConflict: "id_cliente" })

    if (upErr) {
      setError(upErr.message)
      setSaving(false)
      return
    }

    const { error: clienteErr } = await supabase
      .from("clientes_entrada_new")
      .update({
        status_atual: "Cliente Cancelado",
        nivel_engajamento: "cancelado",
        temperatura_cliente: "frio",
      })
      .eq("id_cliente", clientId)

    if (clienteErr) {
      setError(`Cancelamento salvo, mas falhou ao atualizar status do cliente: ${clienteErr.message}`)
      setSaving(false)
      return
    }

    setHasExisting(true)
    setSuccess(true)
    setSaving(false)
    setTimeout(() => setSuccess(false), 3000)
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
      className="space-y-6"
    >
      <Card className="hover:translate-y-0">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <span className="inline-flex size-6 items-center justify-center rounded-full bg-destructive/15 text-destructive">
              <XIcon className="size-3.5" />
            </span>
            Estrutura de cancelamento
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-2">
            <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
              Motivos (selecione todos que se aplicam)
            </Label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {MOTIVOS.map((m) => {
                const checked = form.motivos.includes(m.v)
                return (
                  <label
                    key={m.v}
                    className="flex items-center gap-2 rounded-md border border-border bg-muted/10 px-3 py-2 text-sm cursor-pointer hover:bg-muted/20 transition-colors"
                  >
                    <Checkbox checked={checked} onCheckedChange={() => toggleMotivo(m.v)} />
                    {m.l}
                  </label>
                )
              })}
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-x-6 gap-y-4">
            <SelectField
              label="Responsabilidade do cancelamento"
              value={form.responsabilidade}
              onChange={(v) => setForm((f) => ({ ...f, responsabilidade: v }))}
              options={RESPONSABILIDADE_OPTIONS}
            />

            <Field label="Tentativa de reversão">
              <Select
                value={form.tentativaReversao ? "sim" : "nao"}
                onValueChange={(v) =>
                  setForm((f) => ({ ...f, tentativaReversao: v === "sim" }))
                }
              >
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="nao">Não</SelectItem>
                  <SelectItem value="sim">Sim</SelectItem>
                </SelectContent>
              </Select>
            </Field>

            <div className="lg:col-span-2">
              <Field label="Resumo do ocorrido / contexto">
                <Textarea
                  value={form.resumo}
                  onChange={(e) => setForm((f) => ({ ...f, resumo: e.target.value }))}
                  rows={4}
                  placeholder="Descreva o que aconteceu, decisões tomadas, sinais que o cliente deu..."
                />
              </Field>
            </div>

            <Field label="Data do cancelamento">
              <Input
                type="date"
                value={form.dataCancelamento}
                onChange={(e) => setForm((f) => ({ ...f, dataCancelamento: e.target.value }))}
              />
            </Field>
          </div>
        </CardContent>
      </Card>

      {error && (
        <div className="rounded-xl border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm font-medium text-destructive">
          {error}
        </div>
      )}
      {success && (
        <div className="rounded-xl border border-primary/30 bg-primary/10 px-4 py-3 text-sm font-medium text-foreground">
          {hasExisting ? "Registro de cancelamento atualizado." : "Cancelamento registrado."}
        </div>
      )}

      {!hasExisting && (
        <div className="rounded-xl border border-yellow-400/30 bg-yellow-400/10 px-4 py-3 text-xs text-muted-foreground flex items-start gap-2">
          <AlertTriangleIcon className="size-4 text-yellow-400 shrink-0 mt-0.5" />
          <span>
            Ao registrar, o cliente será marcado como <strong>Cliente Cancelado</strong>, com nível de engajamento <strong>cancelado</strong> e temperatura <strong>frio</strong>.
          </span>
        </div>
      )}

      <Button
        onClick={handleRegistrar}
        disabled={saving}
        className="w-full rounded-xl bg-destructive text-destructive-foreground hover:bg-destructive/90"
      >
        {saving
          ? "Registrando..."
          : hasExisting
          ? "Atualizar registro de cancelamento"
          : "Registrar cancelamento"}
      </Button>
    </motion.div>
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
