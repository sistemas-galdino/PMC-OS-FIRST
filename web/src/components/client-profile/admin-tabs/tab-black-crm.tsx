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
import { Sparkles2Icon } from "@/components/ui/icons"

const TEM_CONTA_OPTIONS = [
  { v: "sim", l: "Sim" },
  { v: "nao", l: "Não" },
  { v: "em_definicao", l: "Em definição" },
  { v: "em_implantacao", l: "Em implantação" },
  { v: "sem_informacao", l: "Sem informação" },
] as const

const TEM_GUARDIAO_CRM_OPTIONS = [
  { v: "sim", l: "Sim" },
  { v: "nao", l: "Não" },
  { v: "pendente", l: "Pendente" },
] as const

const STATUS_CONTA_OPTIONS = [
  { v: "nao_se_aplica", l: "Não se aplica" },
  { v: "ativa", l: "Ativa" },
  { v: "implementada", l: "Implementada" },
  { v: "em_implementacao", l: "Em implementação" },
  { v: "cancelada", l: "Cancelada" },
  { v: "pausada", l: "Pausada" },
] as const

const STATUS_IMPLEMENTACAO_OPTIONS = [
  { v: "nao_iniciado", l: "Não iniciado" },
  { v: "em_andamento", l: "Em andamento" },
  { v: "implementado", l: "Implementado" },
  { v: "travado", l: "Travado" },
  { v: "nao_se_aplica", l: "Não se aplica" },
  { v: "sem_informacao", l: "Sem informação" },
] as const

const PARTICIPA_TUTORIA_OPTIONS = [
  { v: "participa", l: "Participa" },
  { v: "nao_participa", l: "Não participa" },
  { v: "participa_parcialmente", l: "Participa parcialmente" },
  { v: "pendente", l: "Pendente" },
] as const

const TEM_VITORIAS_OPTIONS = [
  { v: "sim", l: "Sim" },
  { v: "nao", l: "Não" },
  { v: "pendente", l: "Pendente" },
] as const

const SENTINEL_NONE = "__none__"

interface BlackCRMState {
  temConta: string
  quantasContas: number
  temGuardiao: string
  guardiaoNome: string
  guardiaoTelefone: string
  nomesContas: string
  statusConta: string
  statusImplementacao: string
  participaTutoria: string
  temVitorias: string
  vitoriasDescricao: string
}

const EMPTY: BlackCRMState = {
  temConta: "",
  quantasContas: 0,
  temGuardiao: "",
  guardiaoNome: "",
  guardiaoTelefone: "",
  nomesContas: "",
  statusConta: "",
  statusImplementacao: "",
  participaTutoria: "",
  temVitorias: "",
  vitoriasDescricao: "",
}

export default function TabBlackCRM({ clientId }: { clientId: string }) {
  const [snapshot, setSnapshot] = useState<BlackCRMState>(EMPTY)
  const [form, setForm] = useState<BlackCRMState>(EMPTY)
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
          "tem_conta_blackcrm, quantas_contas_blackcrm, tem_guardiao_crm, guardiao_crm_nome, guardiao_crm_telefone, nomes_contas_blackcrm, blackcrm_status_conta, blackcrm_status_implementacao, blackcrm_participa_tutoria, blackcrm_tem_vitorias, blackcrm_vitorias_descricao"
        )
        .eq("id_cliente", clientId)
        .maybeSingle()

      if (cancelled) return
      if (error) {
        setError(error.message)
        setLoading(false)
        return
      }

      const next: BlackCRMState = {
        temConta: data?.tem_conta_blackcrm ?? "",
        quantasContas: data?.quantas_contas_blackcrm ?? 0,
        temGuardiao: data?.tem_guardiao_crm ?? "",
        guardiaoNome: data?.guardiao_crm_nome ?? "",
        guardiaoTelefone: data?.guardiao_crm_telefone ?? "",
        nomesContas: data?.nomes_contas_blackcrm ?? "",
        statusConta: data?.blackcrm_status_conta ?? "",
        statusImplementacao: data?.blackcrm_status_implementacao ?? "",
        participaTutoria: data?.blackcrm_participa_tutoria ?? "",
        temVitorias: data?.blackcrm_tem_vitorias ?? "",
        vitoriasDescricao: data?.blackcrm_vitorias_descricao ?? "",
      }

      setSnapshot(next)
      setForm(next)
      setLoading(false)
    }

    load().catch((e) => {
      if (cancelled) return
      setError(e?.message || "Erro ao carregar Black CRM")
      setLoading(false)
    })

    return () => {
      cancelled = true
    }
  }, [clientId])

  const dirty = useMemo(() => {
    const keys = Object.keys(form) as (keyof BlackCRMState)[]
    return keys.some((k) => form[k] !== snapshot[k])
  }, [form, snapshot])

  function set<K extends keyof BlackCRMState>(key: K, value: BlackCRMState[K]) {
    setForm((f) => ({ ...f, [key]: value }))
  }

  async function handleSave() {
    setSaving(true)
    setError(null)
    setSuccess(false)

    const { error: updateErr } = await supabase
      .from("clientes_entrada_new")
      .update({
        tem_conta_blackcrm: form.temConta || null,
        quantas_contas_blackcrm: form.quantasContas,
        tem_guardiao_crm: form.temGuardiao || null,
        guardiao_crm_nome: form.guardiaoNome || null,
        guardiao_crm_telefone: form.guardiaoTelefone || null,
        nomes_contas_blackcrm: form.nomesContas || null,
        blackcrm_status_conta: form.statusConta || null,
        blackcrm_status_implementacao: form.statusImplementacao || null,
        blackcrm_participa_tutoria: form.participaTutoria || null,
        blackcrm_tem_vitorias: form.temVitorias || null,
        blackcrm_vitorias_descricao: form.vitoriasDescricao || null,
        // Sincroniza tem_crm legado (boolean) usado em outros lugares.
        tem_crm: form.temConta === "sim",
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
            <Sparkles2Icon className="size-4 text-yellow-400" />
            Black CRM
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-x-6 gap-y-4">
            <SelectField
              label="Tem conta na Black CRM?"
              value={form.temConta}
              onChange={(v) => set("temConta", v)}
              options={TEM_CONTA_OPTIONS}
            />
            <Field label="Quantas contas?">
              <Input
                type="number"
                min={0}
                value={form.quantasContas}
                onChange={(e) =>
                  set("quantasContas", Math.max(0, parseInt(e.target.value || "0", 10) || 0))
                }
              />
            </Field>

            <SelectField
              label="Tem guardião do CRM?"
              value={form.temGuardiao}
              onChange={(v) => set("temGuardiao", v)}
              options={TEM_GUARDIAO_CRM_OPTIONS}
            />
            <div />

            <Field label="Nome do guardião">
              <Input
                value={form.guardiaoNome}
                onChange={(e) => set("guardiaoNome", e.target.value)}
                placeholder="Nome da pessoa responsável"
              />
            </Field>
            <Field label="Telefone do guardião">
              <Input
                value={form.guardiaoTelefone}
                onChange={(e) => set("guardiaoTelefone", e.target.value)}
                placeholder="(11) 99999-9999"
              />
            </Field>

            <div className="lg:col-span-2">
              <Field label="Nome(s) da(s) conta(s) na Black CRM">
                <Input
                  value={form.nomesContas}
                  onChange={(e) => set("nomesContas", e.target.value)}
                  placeholder="Ex.: Conta Principal, Filial SP, Comercial..."
                />
              </Field>
            </div>

            <SelectField
              label="Status da conta"
              value={form.statusConta}
              onChange={(v) => set("statusConta", v)}
              options={STATUS_CONTA_OPTIONS}
            />
            <SelectField
              label="Status de implementação"
              value={form.statusImplementacao}
              onChange={(v) => set("statusImplementacao", v)}
              options={STATUS_IMPLEMENTACAO_OPTIONS}
            />

            <SelectField
              label="Participa de tutoria?"
              value={form.participaTutoria}
              onChange={(v) => set("participaTutoria", v)}
              options={PARTICIPA_TUTORIA_OPTIONS}
            />
            <SelectField
              label="Cliente tem vitórias com CRM?"
              value={form.temVitorias}
              onChange={(v) => set("temVitorias", v)}
              options={TEM_VITORIAS_OPTIONS}
            />

            <div className="lg:col-span-2">
              <Field label="Quais vitórias?">
                <Textarea
                  value={form.vitoriasDescricao}
                  onChange={(e) => set("vitoriasDescricao", e.target.value)}
                  rows={4}
                  placeholder="Descreva as vitórias do cliente com a Black CRM..."
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
          Black CRM salvo com sucesso.
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
