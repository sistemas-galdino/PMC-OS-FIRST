import { useEffect, useMemo, useState } from "react"
import { useSearchParams } from "react-router-dom"
import { motion } from "framer-motion"
import { supabase } from "@/lib/supabase"
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs"
import {
  LayoutDashboardIcon,
  CalendarIcon,
  ClockIcon,
  LinkIcon,
  UserCheckIcon,
} from "@/components/ui/icons"
import { VisaoGeral } from "@/components/central-atendimentos/visao-geral"
import { AgendamentosLista } from "@/components/central-atendimentos/agendamentos-lista"
import { DisponibilidadeConsultores } from "@/components/central-atendimentos/disponibilidade-consultores"
import { LinkPublico } from "@/components/central-atendimentos/link-publico"
import { ConsultorFormDialog } from "@/components/central-atendimentos/consultor-form-dialog"
import { AgendamentoDetalhesDialog } from "@/components/central-atendimentos/agendamento-detalhes-dialog"
import { AreaConsultor } from "@/components/central-atendimentos/area-consultor"
import type {
  Consultor,
  Disponibilidade,
  AgendamentoCentral,
  TabelaDestino,
  ExcecaoConsultor,
  Feriado,
} from "@/lib/atendimentos"
import { FERIADOS_NACIONAIS_BR } from "@/lib/feriados-br"

type Toast = { type: "ok" | "err"; msg: string } | null
type TabKey = "visao-geral" | "agendamentos" | "disponibilidade" | "link-publico" | "area-consultor"

const TABS: { key: TabKey; label: string; icon: typeof LayoutDashboardIcon }[] = [
  { key: "visao-geral", label: "Visão Geral", icon: LayoutDashboardIcon },
  { key: "agendamentos", label: "Agendamentos", icon: CalendarIcon },
  { key: "disponibilidade", label: "Disponibilidade", icon: ClockIcon },
  { key: "link-publico", label: "Link Público", icon: LinkIcon },
  { key: "area-consultor", label: "Área do Consultor", icon: UserCheckIcon },
]

const TABELA_ORIGEM: Record<AgendamentoCentral["origem"], TabelaDestino> = {
  galdino: "reunioes_galdino",
  mentoria: "reunioes_mentoria_new",
  blackcrm: "reunioes_blackcrm",
}

export default function CentralAtendimentosPage() {
  const [sp, setSp] = useSearchParams()
  const tab = (sp.get("tab") as TabKey | null) ?? "visao-geral"

  const [consultores, setConsultores] = useState<Consultor[]>([])
  const [disponibilidade, setDisponibilidade] = useState<Disponibilidade[]>([])
  const [excecoes, setExcecoes] = useState<ExcecaoConsultor[]>([])
  const [feriados, setFeriados] = useState<Feriado[]>([])
  const [agendamentos, setAgendamentos] = useState<AgendamentoCentral[]>([])
  const [loading, setLoading] = useState(true)
  const [toast, setToast] = useState<Toast>(null)

  const [consultorDialogOpen, setConsultorDialogOpen] = useState(false)
  const [editConsultor, setEditConsultor] = useState<Consultor | null>(null)
  const [agendamentoDialogOpen, setAgendamentoDialogOpen] = useState(false)
  const [selectedAgendamento, setSelectedAgendamento] = useState<AgendamentoCentral | null>(null)

  useEffect(() => {
    if (!toast) return
    const t = setTimeout(() => setToast(null), 3500)
    return () => clearTimeout(t)
  }, [toast])

  async function refresh() {
    const [{ data: cs }, { data: ds }, { data: ags }, { data: exs }, { data: fs }] = await Promise.all([
      supabase.from("consultores_atendimento").select("*").order("ordem", { ascending: true }),
      supabase.from("consultores_disponibilidade").select("*"),
      supabase.from("agendamentos_central").select("*").order("data_reuniao", { ascending: false }),
      supabase.from("consultores_excecoes").select("*"),
      supabase.from("feriados").select("*").order("data", { ascending: true }),
    ])
    setConsultores((cs as Consultor[]) ?? [])
    setDisponibilidade((ds as Disponibilidade[]) ?? [])
    setAgendamentos((ags as AgendamentoCentral[]) ?? [])
    setExcecoes((exs as ExcecaoConsultor[]) ?? [])
    setFeriados((fs as Feriado[]) ?? [])
    setLoading(false)
  }

  useEffect(() => {
    refresh()
  }, [])

  function setTab(k: TabKey) {
    const next = new URLSearchParams(sp)
    next.set("tab", k)
    setSp(next, { replace: true })
  }

  async function saveConsultor(id: string | null, payload: Partial<Consultor>) {
    if (id) {
      const { error } = await supabase.from("consultores_atendimento").update(payload).eq("id", id)
      if (error) {
        setToast({ type: "err", msg: "Erro ao salvar consultor" })
        return
      }
      setToast({ type: "ok", msg: "Consultor atualizado" })
    } else {
      const { error } = await supabase.from("consultores_atendimento").insert(payload)
      if (error) {
        setToast({ type: "err", msg: "Erro ao criar consultor: " + error.message })
        return
      }
      setToast({ type: "ok", msg: "Consultor criado" })
    }
    await refresh()
    setConsultorDialogOpen(false)
  }

  async function toggleConsultorAtivo(consultor: Consultor) {
    const prev = consultores
    setConsultores(cs => cs.map(c => (c.id === consultor.id ? { ...c, ativo: !c.ativo } : c)))
    const { error } = await supabase
      .from("consultores_atendimento")
      .update({ ativo: !consultor.ativo })
      .eq("id", consultor.id)
    if (error) {
      setConsultores(prev)
      setToast({ type: "err", msg: "Erro ao atualizar status" })
    }
  }

  async function saveDisponibilidade(consultorId: string, janelas: Omit<Disponibilidade, "id" | "consultor_id">[]) {
    const { error: delErr } = await supabase
      .from("consultores_disponibilidade")
      .delete()
      .eq("consultor_id", consultorId)
    if (delErr) {
      setToast({ type: "err", msg: "Erro ao limpar disponibilidade" })
      return
    }
    if (janelas.length > 0) {
      const { error: insErr } = await supabase
        .from("consultores_disponibilidade")
        .insert(janelas.map(j => ({ ...j, consultor_id: consultorId })))
      if (insErr) {
        setToast({ type: "err", msg: "Erro ao salvar disponibilidade" })
        return
      }
    }
    setToast({ type: "ok", msg: "Disponibilidade salva" })
    await refresh()
  }

  async function addExcecoes(payloads: Omit<ExcecaoConsultor, "id" | "created_at">[]) {
    if (payloads.length === 0) return
    const { error } = await supabase.from("consultores_excecoes").insert(payloads)
    if (error) {
      setToast({ type: "err", msg: "Erro ao salvar exceção: " + error.message })
      return
    }
    const n = payloads.length
    setToast({
      type: "ok",
      msg: n === 1 ? "Exceção adicionada" : `${n} exceções adicionadas`,
    })
    await refresh()
  }

  async function removeExcecao(id: string) {
    const { error } = await supabase.from("consultores_excecoes").delete().eq("id", id)
    if (error) {
      setToast({ type: "err", msg: "Erro ao remover exceção" })
      return
    }
    setToast({ type: "ok", msg: "Exceção removida" })
    await refresh()
  }

  async function addFeriado(payload: Omit<Feriado, "id" | "created_at">) {
    const { error } = await supabase.from("feriados").insert(payload)
    if (error) {
      setToast({
        type: "err",
        msg: error.code === "23505" ? "Já existe feriado nessa data" : "Erro ao salvar feriado",
      })
      return
    }
    setToast({ type: "ok", msg: "Feriado adicionado" })
    await refresh()
  }

  async function removeFeriado(id: string) {
    const { error } = await supabase.from("feriados").delete().eq("id", id)
    if (error) {
      setToast({ type: "err", msg: "Erro ao remover feriado" })
      return
    }
    setToast({ type: "ok", msg: "Feriado removido" })
    await refresh()
  }

  async function importFeriadosNacionais(ano: number) {
    const oficiais = FERIADOS_NACIONAIS_BR[ano] ?? []
    const datasCadastradas = new Set(feriados.map(f => f.data))
    const novos = oficiais
      .filter(f => !datasCadastradas.has(f.data))
      .map(f => ({ data: f.data, nome: f.nome, tipo: "nacional" as const }))
    if (novos.length === 0) {
      setToast({ type: "ok", msg: `Feriados de ${ano} já estão cadastrados` })
      return
    }
    const { error } = await supabase.from("feriados").insert(novos)
    if (error) {
      setToast({ type: "err", msg: "Erro ao importar feriados: " + error.message })
      return
    }
    setToast({ type: "ok", msg: `${novos.length} feriado${novos.length !== 1 ? "s" : ""} importado${novos.length !== 1 ? "s" : ""}` })
    await refresh()
  }

  async function updateAgendamento(ag: AgendamentoCentral, patch: Partial<AgendamentoCentral>) {
    const cancelando =
      patch.status_agendamento === "cancelado" && ag.status_agendamento !== "cancelado"

    if (cancelando) {
      const { data, error: fnErr } = await supabase.functions.invoke("cancelar-agendamento", {
        body: { origem: ag.origem, id_unico: ag.id_unico },
      })
      if (fnErr) {
        setToast({ type: "err", msg: "Erro ao cancelar agendamento" })
        return
      }
      const outrosUpdates: Record<string, unknown> = {}
      if (patch.observacoes !== undefined) outrosUpdates.observacoes = patch.observacoes
      if (patch.cliente_compareceu !== undefined) outrosUpdates.cliente_compareceu = patch.cliente_compareceu
      if (Object.keys(outrosUpdates).length > 0) {
        await supabase.from(TABELA_ORIGEM[ag.origem]).update(outrosUpdates).eq("id_unico", ag.id_unico)
      }
      const gcalErro = (data as { gcal_erro?: string | null } | null)?.gcal_erro
      setToast({
        type: "ok",
        msg: gcalErro
          ? "Agendamento cancelado (atenção: evento no Google Calendar pode não ter sido removido)"
          : "Agendamento cancelado",
      })
      await refresh()
      setAgendamentoDialogOpen(false)
      return
    }

    const tabela = TABELA_ORIGEM[ag.origem]
    const allowed: Record<string, unknown> = {}
    if (patch.status_agendamento !== undefined) allowed.status_agendamento = patch.status_agendamento
    if (patch.observacoes !== undefined) allowed.observacoes = patch.observacoes
    if (patch.cliente_compareceu !== undefined) allowed.cliente_compareceu = patch.cliente_compareceu
    const { error } = await supabase.from(tabela).update(allowed).eq("id_unico", ag.id_unico)
    if (error) {
      setToast({ type: "err", msg: "Erro ao atualizar agendamento" })
      return
    }
    setToast({ type: "ok", msg: "Agendamento atualizado" })
    await refresh()
    setAgendamentoDialogOpen(false)
  }

  // Exclui um agendamento pela agenda do consultor: apaga o evento no Google
  // Calendar e marca a linha como cancelado (reusa a edge function de cancelamento).
  async function excluirAgendamento(ag: AgendamentoCentral): Promise<boolean> {
    const { data, error: fnErr } = await supabase.functions.invoke("cancelar-agendamento", {
      body: { origem: ag.origem, id_unico: ag.id_unico },
    })
    if (fnErr) {
      setToast({ type: "err", msg: "Erro ao excluir agendamento" })
      return false
    }
    const gcalErro = (data as { gcal_erro?: string | null } | null)?.gcal_erro
    setToast({
      type: "ok",
      msg: gcalErro
        ? "Agendamento excluído (atenção: o evento no Google Calendar pode não ter sido removido)"
        : "Agendamento excluído",
    })
    await refresh()
    return true
  }

  const consultoresAtivos = useMemo(() => consultores.filter(c => c.ativo), [consultores])

  if (loading) {
    return (
      <div className="space-y-6 animate-pulse pb-10">
        <div className="h-16 w-2/3 rounded-xl bg-card/40" />
        <div className="h-12 w-full rounded-xl bg-card/40" />
        <div className="grid gap-4 md:grid-cols-3">
          {[1, 2, 3].map(i => (
            <div key={i} className="h-40 rounded-2xl bg-card/40" />
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-8 pb-10">
      {toast && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className={`fixed top-6 right-6 z-50 rounded-xl border px-5 py-3 text-sm font-semibold shadow-2xl ${
            toast.type === "ok"
              ? "border-primary/30 bg-primary/10 text-primary"
              : "border-destructive/30 bg-destructive/10 text-destructive"
          }`}
        >
          {toast.msg}
        </motion.div>
      )}

      <motion.div
        initial={{ opacity: 0, x: -20 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.6 }}
        className="flex flex-col gap-3 border-l-4 border-primary pl-8 py-2"
      >
        <h1 className="text-4xl lg:text-5xl font-bold tracking-tight text-foreground">Central de Atendimentos</h1>
        <p className="text-muted-foreground font-medium text-sm">
          Agende reuniões com os consultores PMC direto pelo sistema. Os eventos vão pro Google Calendar do consultor e do cliente, e o convite chega por email.
        </p>
      </motion.div>

      <Tabs value={tab} onValueChange={v => setTab(v as TabKey)}>
        <TabsList className="w-full flex-wrap h-auto p-1">
          {TABS.map(t => {
            const Icon = t.icon
            return (
              <TabsTrigger key={t.key} value={t.key} className="flex-1 min-w-[160px]">
                <Icon className="size-4" />
                {t.label}
              </TabsTrigger>
            )
          })}
        </TabsList>

        <TabsContent value="visao-geral" className="mt-6">
          <VisaoGeral consultores={consultores} agendamentos={agendamentos} />
        </TabsContent>

        <TabsContent value="agendamentos" className="mt-6">
          <AgendamentosLista
            agendamentos={agendamentos}
            consultores={consultores}
            onOpenDetails={ag => {
              setSelectedAgendamento(ag)
              setAgendamentoDialogOpen(true)
            }}
          />
        </TabsContent>

        <TabsContent value="disponibilidade" className="mt-6">
          <DisponibilidadeConsultores
            consultores={consultores}
            disponibilidade={disponibilidade}
            excecoes={excecoes}
            feriados={feriados}
            onNovo={() => {
              setEditConsultor(null)
              setConsultorDialogOpen(true)
            }}
            onEditar={c => {
              setEditConsultor(c)
              setConsultorDialogOpen(true)
            }}
            onToggleAtivo={toggleConsultorAtivo}
            onSaveDisponibilidade={saveDisponibilidade}
            onAddExcecoes={addExcecoes}
            onRemoveExcecao={removeExcecao}
            onAddFeriado={addFeriado}
            onRemoveFeriado={removeFeriado}
            onImportFeriadosNacionais={importFeriadosNacionais}
          />
        </TabsContent>

        <TabsContent value="link-publico" className="mt-6">
          <LinkPublico consultores={consultoresAtivos} />
        </TabsContent>

        <TabsContent value="area-consultor" className="mt-6">
          <AreaConsultor consultores={consultoresAtivos} agendamentos={agendamentos} onExcluir={excluirAgendamento} />
        </TabsContent>
      </Tabs>

      <ConsultorFormDialog
        open={consultorDialogOpen}
        consultor={editConsultor}
        onClose={() => setConsultorDialogOpen(false)}
        onSave={saveConsultor}
      />

      <AgendamentoDetalhesDialog
        open={agendamentoDialogOpen}
        agendamento={selectedAgendamento}
        onClose={() => setAgendamentoDialogOpen(false)}
        onSave={updateAgendamento}
      />
    </div>
  )
}
