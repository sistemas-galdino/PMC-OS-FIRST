import { useEffect, useMemo, useState } from "react"
import { motion } from "framer-motion"
import { supabase } from "@/lib/supabase"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
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
import { RefreshCwIcon } from "@/components/ui/icons"
import { useClienteMoeda } from "@/hooks/use-cliente-moeda"
import { currencySymbol } from "@/lib/format-currency"

const STATUS_OPTIONS = [
  { v: "ainda_distante", l: "Ainda distante" },
  { v: "em_negociacao", l: "Em negociação" },
  { v: "confirmada", l: "Confirmada" },
  { v: "recusada", l: "Recusada" },
  { v: "em_risco", l: "Em risco" },
] as const

const SENTINEL_NONE = "__none__"

interface RenovacaoState {
  data: string
  valor: string
  status: string
  observacoes: string
}

const EMPTY: RenovacaoState = {
  data: "",
  valor: "",
  status: "",
  observacoes: "",
}

export default function TabRenovacao({ clientId }: { clientId: string }) {
  const moeda = useClienteMoeda(clientId)
  const moedaSym = currencySymbol(moeda)
  const [snapshot, setSnapshot] = useState<RenovacaoState>(EMPTY)
  const [form, setForm] = useState<RenovacaoState>(EMPTY)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  useEffect(() => {
    let cancelled = false
    setLoading(true)

    async function load() {
      const { data, error } = await supabase
        .from("clientes_entrada_new")
        .select("renovacao_data, renovacao_valor, renovacao_status, renovacao_observacoes")
        .eq("id_cliente", clientId)
        .maybeSingle()

      if (cancelled) return
      if (error) {
        setError(error.message)
        setLoading(false)
        return
      }

      const next: RenovacaoState = {
        data: data?.renovacao_data ?? "",
        valor: data?.renovacao_valor !== null && data?.renovacao_valor !== undefined
          ? String(data.renovacao_valor)
          : "",
        status: data?.renovacao_status ?? "",
        observacoes: data?.renovacao_observacoes ?? "",
      }

      setSnapshot(next)
      setForm(next)
      setLoading(false)
    }

    load().catch((e) => {
      if (cancelled) return
      setError(e?.message || "Erro ao carregar renovação")
      setLoading(false)
    })

    return () => {
      cancelled = true
    }
  }, [clientId])

  const dirty = useMemo(() => {
    const keys = Object.keys(form) as (keyof RenovacaoState)[]
    return keys.some((k) => form[k] !== snapshot[k])
  }, [form, snapshot])

  function set<K extends keyof RenovacaoState>(key: K, value: RenovacaoState[K]) {
    setForm((f) => ({ ...f, [key]: value }))
  }

  async function handleSave() {
    setSaving(true)
    setError(null)
    setSuccess(false)

    const valorNum = form.valor.trim() === "" ? null : Number(form.valor)
    if (form.valor.trim() !== "" && (Number.isNaN(valorNum) || valorNum! < 0)) {
      setError("Valor inválido.")
      setSaving(false)
      return
    }

    const { error: updateErr } = await supabase
      .from("clientes_entrada_new")
      .update({
        renovacao_data: form.data || null,
        renovacao_valor: valorNum,
        renovacao_status: form.status || null,
        renovacao_observacoes: form.observacoes || null,
      })
      .eq("id_cliente", clientId)

    if (updateErr) {
      setError(updateErr.message)
      setSaving(false)
      return
    }

    setSnapshot(form)
    setSuccess(true)
    setSaving(false)
    setTimeout(() => setSuccess(false), 3000)
  }

  function handleDiscard() {
    setForm(snapshot)
    setError(null)
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
            <RefreshCwIcon className="size-4 text-yellow-400" />
            Renovação
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-x-6 gap-y-4">
            <Field label="Data de renovação">
              <Input
                type="date"
                value={form.data}
                onChange={(e) => set("data", e.target.value)}
              />
            </Field>

            <Field label={`Valor (${moedaSym})`}>
              <Input
                type="number"
                min={0}
                step="0.01"
                value={form.valor}
                onChange={(e) => set("valor", e.target.value)}
                placeholder="0,00"
              />
            </Field>

            <div className="lg:col-span-2">
              <SelectField
                label="Status da renovação"
                value={form.status}
                onChange={(v) => set("status", v)}
                options={STATUS_OPTIONS}
              />
            </div>

            <div className="lg:col-span-2">
              <Field label="Observações sobre renovação">
                <Textarea
                  value={form.observacoes}
                  onChange={(e) => set("observacoes", e.target.value)}
                  rows={4}
                  placeholder="Contexto, condições negociadas, próximos passos..."
                />
              </Field>
            </div>
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
          Renovação salva com sucesso.
        </div>
      )}

      <div className="flex justify-end gap-2">
        <Button
          variant="outline"
          onClick={handleDiscard}
          disabled={!dirty || saving}
          className="rounded-xl"
        >
          Descartar
        </Button>
        <Button
          onClick={handleSave}
          disabled={!dirty || saving}
          className="rounded-xl"
        >
          {saving ? "Salvando..." : "Salvar"}
        </Button>
      </div>
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
