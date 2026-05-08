import { useEffect, useMemo, useState } from "react"
import { motion } from "framer-motion"
import { supabase } from "@/lib/supabase"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
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
import { MessageCircleIcon } from "@/components/ui/icons"

const PREFERENCIA_OPTIONS = [
  { v: "nao_definido", l: "Não definido" },
  { v: "privado", l: "Privado (WhatsApp pessoal)" },
  { v: "grupo_individual", l: "Grupo individual do cliente" },
  { v: "grupo_geral", l: "Grupo geral com o time" },
  { v: "misto", l: "Misto (privado + grupo)" },
] as const

const CANAL_OPTIONS = [
  { v: "whatsapp", l: "WhatsApp" },
  { v: "ligacao", l: "Ligação" },
  { v: "audio_whatsapp", l: "Áudio (WhatsApp)" },
  { v: "mensagem_texto", l: "Mensagem de texto" },
  { v: "outro", l: "Outro" },
] as const

const SENTINEL_NONE = "__none__"

interface ComunicacaoState {
  preferencia: string
  canal: string
  restricoes: string
  resumo: string
}

const EMPTY: ComunicacaoState = {
  preferencia: "",
  canal: "",
  restricoes: "",
  resumo: "",
}

export default function TabComunicacao({ clientId }: { clientId: string }) {
  const [snapshot, setSnapshot] = useState<ComunicacaoState>(EMPTY)
  const [form, setForm] = useState<ComunicacaoState>(EMPTY)
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
        .select("comunicacao_preferencia, comunicacao_canal, comunicacao_restricoes, comunicacao_resumo")
        .eq("id_cliente", clientId)
        .maybeSingle()

      if (cancelled) return
      if (error) {
        setError(error.message)
        setLoading(false)
        return
      }

      const next: ComunicacaoState = {
        preferencia: data?.comunicacao_preferencia ?? "",
        canal: data?.comunicacao_canal ?? "",
        restricoes: data?.comunicacao_restricoes ?? "",
        resumo: data?.comunicacao_resumo ?? "",
      }

      setSnapshot(next)
      setForm(next)
      setLoading(false)
    }

    load().catch((e) => {
      if (cancelled) return
      setError(e?.message || "Erro ao carregar comunicação")
      setLoading(false)
    })

    return () => {
      cancelled = true
    }
  }, [clientId])

  const dirty = useMemo(() => {
    const keys = Object.keys(form) as (keyof ComunicacaoState)[]
    return keys.some((k) => form[k] !== snapshot[k])
  }, [form, snapshot])

  function set<K extends keyof ComunicacaoState>(key: K, value: ComunicacaoState[K]) {
    setForm((f) => ({ ...f, [key]: value }))
  }

  async function handleSave() {
    setSaving(true)
    setError(null)
    setSuccess(false)

    const { error: updateErr } = await supabase
      .from("clientes_entrada_new")
      .update({
        comunicacao_preferencia: form.preferencia || null,
        comunicacao_canal: form.canal || null,
        comunicacao_restricoes: form.restricoes || null,
        comunicacao_resumo: form.resumo || null,
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
            <MessageCircleIcon className="size-4 text-yellow-400" />
            Comunicação ideal com o cliente
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-x-6 gap-y-4">
            <SelectField
              label="Preferência de comunicação"
              value={form.preferencia}
              onChange={(v) => set("preferencia", v)}
              options={PREFERENCIA_OPTIONS}
            />
            <SelectField
              label="Canal preferido"
              value={form.canal}
              onChange={(v) => set("canal", v)}
              options={CANAL_OPTIONS}
            />

            <div className="lg:col-span-2">
              <Field label="Restrições / o que NÃO falar no grupo geral">
                <Textarea
                  value={form.restricoes}
                  onChange={(e) => set("restricoes", e.target.value)}
                  rows={3}
                  placeholder="Ex.: não comentar sobre faturamento no grupo geral..."
                />
              </Field>
            </div>

            <div className="lg:col-span-2">
              <Field label="Resumo da comunicação ideal">
                <Textarea
                  value={form.resumo}
                  onChange={(e) => set("resumo", e.target.value)}
                  rows={4}
                  placeholder="Descreva o contexto e estilo de comunicação que funciona melhor com este cliente..."
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
          Comunicação salva com sucesso.
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
