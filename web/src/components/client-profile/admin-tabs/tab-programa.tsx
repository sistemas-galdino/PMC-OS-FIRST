import { useEffect, useMemo, useState } from "react"
import { motion } from "framer-motion"
import { supabase } from "@/lib/supabase"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { BriefcaseIcon, Sparkles2Icon, MessageCircleIcon } from "@/components/ui/icons"

const TEM_GUARDIAO_OPTIONS = [
  { v: "sim", l: "Sim" },
  { v: "nao", l: "Não" },
  { v: "em_definicao", l: "Em definição" },
  { v: "em_implantacao", l: "Em implantação" },
  { v: "sem_informacao", l: "Sem informação" },
] as const

const PRESENCA_OPTIONS = [
  { v: "alta", l: "Alta" },
  { v: "media", l: "Média" },
  { v: "baixa", l: "Baixa" },
  { v: "nenhuma", l: "Nenhuma" },
] as const

const REUNIAO_STATUS_OPTIONS = [
  { v: "ja_fez", l: "Já fez" },
  { v: "pendente", l: "Pendente" },
  { v: "agendada", l: "Agendada" },
  { v: "nao_agendada", l: "Não agendada" },
  { v: "sem_informacao", l: "Sem informação" },
] as const

const FREQUENCIA_OPTIONS = [
  { v: "alta", l: "Alta" },
  { v: "media", l: "Média" },
  { v: "baixa", l: "Baixa" },
  { v: "nenhuma", l: "Nenhuma" },
  { v: "sem_informacao", l: "Sem informação" },
] as const

const SENTINEL_NONE = "__none__"

interface ProgramaState {
  temGuardiao: string
  presencaTreinamentos: string
  reuniaoConsultores: string
  reuniaoGaldino: string
  frequenciaWhatsapp: string
  guardiaoNome: string
  guardiaoTelefone: string
  guardiaoCargo: string
}

const EMPTY: ProgramaState = {
  temGuardiao: "",
  presencaTreinamentos: "",
  reuniaoConsultores: "",
  reuniaoGaldino: "",
  frequenciaWhatsapp: "",
  guardiaoNome: "",
  guardiaoTelefone: "",
  guardiaoCargo: "",
}

function whatsappLink(raw: string): string | null {
  const digits = raw.replace(/\D/g, "")
  if (digits.length < 10) return null
  // Já vem com DDI? Se já começa com 55 e tem 12-13 dígitos, mantém.
  const number = digits.startsWith("55") ? digits : `55${digits}`
  return `https://wa.me/${number}`
}

export default function TabPrograma({ clientId }: { clientId: string }) {
  const [snapshot, setSnapshot] = useState<ProgramaState>(EMPTY)
  const [form, setForm] = useState<ProgramaState>(EMPTY)
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
        .select(
          "tem_guardiao_ia, presenca_treinamentos, reuniao_consultores_status, reuniao_galdino_status, frequencia_grupo_whatsapp, guardiao_ia_nome, guardiao_ia_telefone, guardiao_ia_cargo"
        )
        .eq("id_cliente", clientId)
        .maybeSingle()

      if (cancelled) return
      if (error) {
        setError(error.message)
        setLoading(false)
        return
      }

      const next: ProgramaState = {
        temGuardiao: data?.tem_guardiao_ia ?? "",
        presencaTreinamentos: data?.presenca_treinamentos ?? "",
        reuniaoConsultores: data?.reuniao_consultores_status ?? "",
        reuniaoGaldino: data?.reuniao_galdino_status ?? "",
        frequenciaWhatsapp: data?.frequencia_grupo_whatsapp ?? "",
        guardiaoNome: data?.guardiao_ia_nome ?? "",
        guardiaoTelefone: data?.guardiao_ia_telefone ?? "",
        guardiaoCargo: data?.guardiao_ia_cargo ?? "",
      }

      setSnapshot(next)
      setForm(next)
      setLoading(false)
    }

    load().catch((e) => {
      if (cancelled) return
      setError(e?.message || "Erro ao carregar aba Programa")
      setLoading(false)
    })

    return () => {
      cancelled = true
    }
  }, [clientId])

  const dirty = useMemo(() => {
    const keys = Object.keys(form) as (keyof ProgramaState)[]
    return keys.some((k) => form[k] !== snapshot[k])
  }, [form, snapshot])

  function set<K extends keyof ProgramaState>(key: K, value: ProgramaState[K]) {
    setForm((f) => ({ ...f, [key]: value }))
  }

  async function handleSave() {
    setSaving(true)
    setError(null)
    setSuccess(false)

    const { error: updateErr } = await supabase
      .from("clientes_entrada_new")
      .update({
        tem_guardiao_ia: form.temGuardiao || null,
        presenca_treinamentos: form.presencaTreinamentos || null,
        reuniao_consultores_status: form.reuniaoConsultores || null,
        reuniao_galdino_status: form.reuniaoGaldino || null,
        frequencia_grupo_whatsapp: form.frequenciaWhatsapp || null,
        guardiao_ia_nome: form.guardiaoNome || null,
        guardiao_ia_telefone: form.guardiaoTelefone || null,
        guardiao_ia_cargo: form.guardiaoCargo || null,
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

  const waLink = whatsappLink(form.guardiaoTelefone)

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
            <BriefcaseIcon className="size-4 text-muted-foreground" />
            Programa
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-x-6 gap-y-4">
            <SelectField
              label="Tem Guardião de IA"
              value={form.temGuardiao}
              onChange={(v) => set("temGuardiao", v)}
              options={TEM_GUARDIAO_OPTIONS}
            />
            <SelectField
              label="Presença em treinamentos"
              value={form.presencaTreinamentos}
              onChange={(v) => set("presencaTreinamentos", v)}
              options={PRESENCA_OPTIONS}
            />
            <SelectField
              label="Reunião com consultores"
              value={form.reuniaoConsultores}
              onChange={(v) => set("reuniaoConsultores", v)}
              options={REUNIAO_STATUS_OPTIONS}
            />
            <SelectField
              label="Reunião com Galdino"
              value={form.reuniaoGaldino}
              onChange={(v) => set("reuniaoGaldino", v)}
              options={REUNIAO_STATUS_OPTIONS}
            />
            <SelectField
              label="Frequência grupo WhatsApp"
              value={form.frequenciaWhatsapp}
              onChange={(v) => set("frequenciaWhatsapp", v)}
              options={FREQUENCIA_OPTIONS}
            />
          </div>
        </CardContent>
      </Card>

      <Card className="hover:translate-y-0">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Sparkles2Icon className="size-4 text-yellow-400" />
            Guardião de IA
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-x-6 gap-y-4">
            <Field label="Nome">
              <Input
                value={form.guardiaoNome}
                onChange={(e) => set("guardiaoNome", e.target.value)}
                placeholder="Nome do responsável"
              />
            </Field>
            <Field label="Telefone">
              <div className="flex gap-2">
                <Input
                  value={form.guardiaoTelefone}
                  onChange={(e) => set("guardiaoTelefone", e.target.value)}
                  placeholder="DDD + número"
                  className="flex-1"
                />
                <a
                  href={waLink || undefined}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-disabled={!waLink}
                  onClick={(e) => {
                    if (!waLink) e.preventDefault()
                  }}
                  className={`inline-flex items-center justify-center gap-2 rounded-lg px-3 h-9 text-xs font-bold uppercase tracking-wider transition-all whitespace-nowrap ${
                    waLink
                      ? "bg-emerald-500 text-white hover:bg-emerald-600 cursor-pointer"
                      : "bg-muted/30 text-muted-foreground cursor-not-allowed pointer-events-none"
                  }`}
                  title={waLink ? "Abrir WhatsApp" : "Telefone inválido"}
                >
                  <MessageCircleIcon className="size-4" />
                  WhatsApp
                </a>
              </div>
            </Field>
            <Field label="Cargo">
              <Input
                value={form.guardiaoCargo}
                onChange={(e) => set("guardiaoCargo", e.target.value)}
                placeholder="Cargo no time"
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
          Programa salvo com sucesso.
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
