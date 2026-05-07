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
import { UsersIcon, Sparkles2Icon } from "@/components/ui/icons"

const STATUS_OPTIONS = [
  "Ativo no Programa",
  "Aguardando Início",
  "Onboarding marcado",
  "Pendente de Onboarding",
  "Cliente Cancelado",
  "Desistência de Compra",
] as const

const SAUDE_OPTIONS = [
  { v: "saudavel", l: "Saudável" },
  { v: "atencao", l: "Atenção" },
  { v: "critico", l: "Crítico" },
] as const

const ENGAJAMENTO_OPTIONS = [
  { v: "cliente_novo", l: "Cliente Novo" },
  { v: "ativo_alto", l: "Ativo Alto" },
  { v: "ativo_medio", l: "Ativo Médio" },
  { v: "desengajado", l: "Desengajado" },
  { v: "sem_onboarding", l: "Sem Onboarding" },
  { v: "cancelado", l: "Cancelado" },
  { v: "congelado", l: "Congelado" },
] as const

const CS_OPTIONS = ["Geovana", "Francielly", "Gabriela", "Fernanda"] as const

const SENTINEL_NONE = "__none__"

interface PerfilState {
  codigoCliente: number | null
  nomeEmpresa: string
  nomeCliente: string
  nicho: string
  subnicho: string
  sc: string
  dataEntrada: string // YYYY-MM-DD ou ""
  statusAtual: string
  saudeCliente: string
  nivelEngajamento: string
  emRiscoCancelamento: boolean
  observacoesCs: string
}

const EMPTY: PerfilState = {
  codigoCliente: null,
  nomeEmpresa: "",
  nomeCliente: "",
  nicho: "",
  subnicho: "",
  sc: "",
  dataEntrada: "",
  statusAtual: "",
  saudeCliente: "",
  nivelEngajamento: "",
  emRiscoCancelamento: false,
  observacoesCs: "",
}

export default function TabPerfil({ clientId }: { clientId: string }) {
  const [snapshot, setSnapshot] = useState<PerfilState>(EMPTY)
  const [form, setForm] = useState<PerfilState>(EMPTY)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  useEffect(() => {
    let cancelled = false
    setLoading(true)

    async function load() {
      const [entradaRes, infoRes] = await Promise.all([
        supabase
          .from("clientes_entrada_new")
          .select(
            "codigo_cliente, nome_empresa_formatado, nome_cliente_formatado, nicho, subnicho, sc, status_atual, saude_cliente, nivel_engajamento, em_risco_cancelamento, observacoes_cs"
          )
          .eq("id_cliente", clientId)
          .maybeSingle(),
        supabase
          .from("cliente_informacoes_empresa")
          .select("data_entrada")
          .eq("id_cliente", clientId)
          .maybeSingle(),
      ])

      if (cancelled) return

      const entrada = entradaRes.data
      const info = infoRes.data

      const next: PerfilState = {
        codigoCliente: entrada?.codigo_cliente ?? null,
        nomeEmpresa: entrada?.nome_empresa_formatado ?? "",
        nomeCliente: entrada?.nome_cliente_formatado ?? "",
        nicho: entrada?.nicho ?? "",
        subnicho: entrada?.subnicho ?? "",
        sc: entrada?.sc ?? "",
        dataEntrada: info?.data_entrada ?? "",
        statusAtual: entrada?.status_atual ?? "",
        saudeCliente: entrada?.saude_cliente ?? "",
        nivelEngajamento: entrada?.nivel_engajamento ?? "",
        emRiscoCancelamento: !!entrada?.em_risco_cancelamento,
        observacoesCs: entrada?.observacoes_cs ?? "",
      }

      setSnapshot(next)
      setForm(next)
      setLoading(false)
    }

    load().catch((e) => {
      if (cancelled) return
      setError(e?.message || "Erro ao carregar perfil")
      setLoading(false)
    })

    return () => {
      cancelled = true
    }
  }, [clientId])

  const dirty = useMemo(() => {
    const keys = Object.keys(form) as (keyof PerfilState)[]
    return keys.some((k) => form[k] !== snapshot[k])
  }, [form, snapshot])

  function set<K extends keyof PerfilState>(key: K, value: PerfilState[K]) {
    setForm((f) => ({ ...f, [key]: value }))
  }

  async function handleSave() {
    setSaving(true)
    setError(null)
    setSuccess(false)

    const { error: entradaErr } = await supabase
      .from("clientes_entrada_new")
      .update({
        nome_empresa_formatado: form.nomeEmpresa || null,
        nome_cliente_formatado: form.nomeCliente || null,
        nicho: form.nicho || null,
        subnicho: form.subnicho || null,
        sc: form.sc || null,
        status_atual: form.statusAtual || null,
        saude_cliente: form.saudeCliente || null,
        nivel_engajamento: form.nivelEngajamento || null,
        em_risco_cancelamento: form.emRiscoCancelamento,
        observacoes_cs: form.observacoesCs || null,
      })
      .eq("id_cliente", clientId)

    if (entradaErr) {
      setError(entradaErr.message)
      setSaving(false)
      return
    }

    if (form.dataEntrada !== snapshot.dataEntrada) {
      const { error: infoErr } = await supabase
        .from("cliente_informacoes_empresa")
        .upsert(
          {
            id_cliente: clientId,
            data_entrada: form.dataEntrada || null,
          },
          { onConflict: "id_cliente" }
        )
      if (infoErr) {
        setError(infoErr.message)
        setSaving(false)
        return
      }
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
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Cadastro */}
        <Card className="hover:translate-y-0">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <UsersIcon className="size-4 text-muted-foreground" />
              Cadastro
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <Field label="ID do cliente">
              <Input
                value={form.codigoCliente !== null ? String(form.codigoCliente) : ""}
                readOnly
                disabled
                className="bg-muted/20"
              />
            </Field>
            <Field label="Empresa">
              <Input
                value={form.nomeEmpresa}
                onChange={(e) => set("nomeEmpresa", e.target.value)}
              />
            </Field>
            <Field label="Contato">
              <Input
                value={form.nomeCliente}
                onChange={(e) => set("nomeCliente", e.target.value)}
              />
            </Field>
            <Field label="Nicho">
              <Input
                value={form.nicho}
                onChange={(e) => set("nicho", e.target.value)}
              />
            </Field>
            <Field label="Subnicho">
              <Input
                value={form.subnicho}
                onChange={(e) => set("subnicho", e.target.value)}
              />
            </Field>
            <Field label="CS Responsável">
              <Select
                value={form.sc || SENTINEL_NONE}
                onValueChange={(v) => set("sc", v === SENTINEL_NONE ? "" : v)}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Selecionar..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={SENTINEL_NONE}>Não atribuído</SelectItem>
                  {CS_OPTIONS.map((cs) => (
                    <SelectItem key={cs} value={cs}>
                      {cs}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
            <Field label="Data de entrada">
              <Input
                type="date"
                value={form.dataEntrada || ""}
                onChange={(e) => set("dataEntrada", e.target.value)}
              />
            </Field>
          </CardContent>
        </Card>

        {/* Estado */}
        <Card className="hover:translate-y-0">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Sparkles2Icon className="size-4 text-muted-foreground" />
              Estado
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <Field label="Status do cliente">
              <Select
                value={form.statusAtual || SENTINEL_NONE}
                onValueChange={(v) =>
                  set("statusAtual", v === SENTINEL_NONE ? "" : v)
                }
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Selecionar..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={SENTINEL_NONE}>—</SelectItem>
                  {STATUS_OPTIONS.map((s) => (
                    <SelectItem key={s} value={s}>
                      {s}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
            <Field label="Saúde do cliente">
              <Select
                value={form.saudeCliente || SENTINEL_NONE}
                onValueChange={(v) =>
                  set("saudeCliente", v === SENTINEL_NONE ? "" : v)
                }
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Selecionar..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={SENTINEL_NONE}>—</SelectItem>
                  {SAUDE_OPTIONS.map((o) => (
                    <SelectItem key={o.v} value={o.v}>
                      {o.l}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
            <Field label="Engajamento">
              <Select
                value={form.nivelEngajamento || SENTINEL_NONE}
                onValueChange={(v) =>
                  set("nivelEngajamento", v === SENTINEL_NONE ? "" : v)
                }
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Selecionar..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={SENTINEL_NONE}>—</SelectItem>
                  {ENGAJAMENTO_OPTIONS.map((o) => (
                    <SelectItem key={o.v} value={o.v}>
                      {o.l}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
            <Field label="Em risco de cancelamento">
              <Select
                value={form.emRiscoCancelamento ? "sim" : "nao"}
                onValueChange={(v) => set("emRiscoCancelamento", v === "sim")}
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
            <Field label="Estado atual (observação rápida)">
              <Textarea
                value={form.observacoesCs}
                onChange={(e) => set("observacoesCs", e.target.value)}
                rows={4}
              />
            </Field>
          </CardContent>
        </Card>
      </div>

      {error && (
        <div className="rounded-xl border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm font-medium text-destructive">
          {error}
        </div>
      )}
      {success && (
        <div className="rounded-xl border border-primary/30 bg-primary/10 px-4 py-3 text-sm font-medium text-foreground">
          Perfil salvo com sucesso.
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
