import { useEffect, useMemo, useState } from "react"
import { useNavigate, useParams } from "react-router-dom"
import { motion } from "framer-motion"
import { supabase } from "@/lib/supabase"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { ArrowLeftIcon, ArrowUpRightIcon, AlertCircleIcon } from "@/components/ui/icons"
import { PublicoLayout } from "@/components/atendimento-publico/publico-layout"
import { ConsultorCard } from "@/components/atendimento-publico/consultor-card"
import { Stepper } from "@/components/atendimento-publico/stepper"
import { StepData } from "@/components/atendimento-publico/step-data"
import { StepHorario } from "@/components/atendimento-publico/step-horario"
import { StepIdentificacao, type IdentificacaoForm } from "@/components/atendimento-publico/step-identificacao"
import { StepConfirmacao } from "@/components/atendimento-publico/step-confirmacao"
import { StepSucesso } from "@/components/atendimento-publico/step-sucesso"
import type { Consultor, Disponibilidade } from "@/lib/atendimentos"

const STEPS = ["Data", "Horário", "Você", "Confirmação"]

const initialIdent: IdentificacaoForm = {
  nome: "",
  email: "",
  empresa: "",
  telefone: "",
  observacoes: "",
}

export default function AtendimentoPublicoPage() {
  const { slug } = useParams<{ slug?: string }>()
  const navigate = useNavigate()

  const [consultores, setConsultores] = useState<Consultor[]>([])
  const [consultor, setConsultor] = useState<Consultor | null>(null)
  const [disponibilidade, setDisponibilidade] = useState<Disponibilidade[]>([])
  const [loading, setLoading] = useState(true)
  const [erroFatal, setErroFatal] = useState<string | null>(null)

  const [step, setStep] = useState(0)
  const [dataEscolhida, setDataEscolhida] = useState<string | null>(null)
  const [horarioEscolhido, setHorarioEscolhido] = useState<string | null>(null)
  const [ident, setIdent] = useState<IdentificacaoForm>(initialIdent)
  const [slotsOcupados, setSlotsOcupados] = useState<string[]>([])
  const [submitting, setSubmitting] = useState(false)
  const [erro, setErro] = useState<string | null>(null)
  const [sucesso, setSucesso] = useState(false)

  useEffect(() => {
    async function load() {
      setLoading(true)
      if (slug) {
        const { data: c, error: cErr } = await supabase
          .from("consultores_atendimento")
          .select("*")
          .eq("slug", slug)
          .eq("ativo", true)
          .maybeSingle()

        if (cErr || !c) {
          setErroFatal("Consultor não encontrado ou indisponível.")
          setLoading(false)
          return
        }

        const { data: d } = await supabase
          .from("consultores_disponibilidade")
          .select("*")
          .eq("consultor_id", c.id)

        setConsultor(c as Consultor)
        setDisponibilidade((d as Disponibilidade[]) ?? [])
      } else {
        const { data: cs } = await supabase
          .from("consultores_atendimento")
          .select("*")
          .eq("ativo", true)
          .order("ordem", { ascending: true })
        setConsultores((cs as Consultor[]) ?? [])
      }
      setLoading(false)
    }
    load()
  }, [slug])

  useEffect(() => {
    if (!consultor || !dataEscolhida) {
      setSlotsOcupados([])
      return
    }
    async function fetchOcupados() {
      const { data } = await supabase
        .from("agendamentos_central")
        .select("horario")
        .eq("consultor_nome", consultor!.nome)
        .eq("data_reuniao", dataEscolhida!)
        .neq("status_agendamento", "cancelado")
      setSlotsOcupados(((data as { horario: string | null }[] | null) ?? []).map(r => r.horario ?? "").filter(Boolean))
    }
    fetchOcupados()
  }, [consultor, dataEscolhida])

  async function submeter() {
    if (!consultor || !dataEscolhida || !horarioEscolhido) return
    if (!ident.nome.trim() || !ident.email.trim()) {
      setErro("Nome e email são obrigatórios")
      return
    }
    setSubmitting(true)
    setErro(null)
    try {
      const { error: fnErr } = await supabase.functions.invoke("criar-agendamento", {
        body: {
          slug: consultor.slug,
          data: dataEscolhida,
          horario: horarioEscolhido,
          cliente_nome: ident.nome.trim(),
          cliente_email: ident.email.trim(),
          cliente_empresa: ident.empresa.trim() || null,
          cliente_telefone: ident.telefone.trim() || null,
          observacoes: ident.observacoes.trim() || null,
        },
      })
      if (fnErr) {
        setErro("Não foi possível confirmar o agendamento: " + (fnErr.message ?? "erro desconhecido"))
        setSubmitting(false)
        return
      }
      setSucesso(true)
    } catch (e: any) {
      setErro("Erro inesperado: " + (e?.message ?? String(e)))
    } finally {
      setSubmitting(false)
    }
  }

  function avancar() {
    if (step === 0 && !dataEscolhida) return
    if (step === 1 && !horarioEscolhido) return
    if (step === 2 && (!ident.nome.trim() || !ident.email.trim())) {
      setErro("Preencha nome e email")
      return
    }
    setErro(null)
    setStep(s => s + 1)
  }

  function voltar() {
    setErro(null)
    setStep(s => Math.max(0, s - 1))
  }

  const canAdvance = useMemo(() => {
    if (step === 0) return !!dataEscolhida
    if (step === 1) return !!horarioEscolhido
    if (step === 2) return !!ident.nome.trim() && !!ident.email.trim()
    return true
  }, [step, dataEscolhida, horarioEscolhido, ident])

  if (loading) {
    return (
      <PublicoLayout title="Carregando...">
        <div className="space-y-3 animate-pulse">
          <div className="h-12 w-full rounded-xl bg-card/40" />
          <div className="h-40 w-full rounded-xl bg-card/40" />
        </div>
      </PublicoLayout>
    )
  }

  if (erroFatal) {
    return (
      <PublicoLayout title="Ops">
        <Card className="p-8 text-center space-y-4">
          <AlertCircleIcon className="size-12 text-destructive mx-auto" />
          <p className="text-base">{erroFatal}</p>
          <Button onClick={() => navigate("/atendimento")} variant="outline">Ver todos os consultores</Button>
        </Card>
      </PublicoLayout>
    )
  }

  if (!slug) {
    return (
      <PublicoLayout
        pretitle="PMC OS"
        title="Agende seu atendimento"
        subtitle="Escolha um consultor para iniciar uma conversa estratégica. Selecione abaixo quem mais se alinha com o desafio da sua empresa."
      >
        <div className="grid gap-3 md:grid-cols-2">
          {consultores.map(c => (
            <ConsultorCard
              key={c.id}
              consultor={c}
              onClick={() => navigate(`/atendimento/${c.slug}`)}
            />
          ))}
        </div>
        {consultores.length === 0 && (
          <Card className="p-8 text-center">
            <p className="text-sm text-muted-foreground">Nenhum consultor disponível no momento.</p>
          </Card>
        )}
      </PublicoLayout>
    )
  }

  if (sucesso && consultor && dataEscolhida && horarioEscolhido) {
    return (
      <PublicoLayout>
        <StepSucesso
          consultor={consultor}
          data={dataEscolhida}
          horario={horarioEscolhido}
          email={ident.email}
          onVoltar={() => navigate("/atendimento")}
        />
      </PublicoLayout>
    )
  }

  if (!consultor) return null

  return (
    <PublicoLayout
      pretitle={consultor.especialidade ?? "Atendimento"}
      title={`Agende com ${consultor.nome}`}
      subtitle={consultor.descricao ?? `Escolha a melhor data e horário para conversar com ${consultor.nome}.`}
    >
      <div className="space-y-8">
        <Button variant="ghost" size="sm" onClick={() => navigate("/atendimento")} className="gap-2 -ml-2">
          <ArrowLeftIcon className="size-4" />
          <span className="text-xs font-bold uppercase tracking-widest">Trocar consultor</span>
        </Button>

        <Stepper steps={STEPS} current={step} />

        <motion.div
          key={step}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
          className="space-y-4"
        >
          {step === 0 && (
            <StepData
              disponibilidade={disponibilidade}
              value={dataEscolhida}
              onChange={v => {
                setDataEscolhida(v)
                setHorarioEscolhido(null)
              }}
            />
          )}

          {step === 1 && dataEscolhida && (
            <StepHorario
              disponibilidade={disponibilidade}
              duracao_minutos={consultor.duracao_padrao_minutos}
              data={dataEscolhida}
              slotsOcupados={slotsOcupados}
              value={horarioEscolhido}
              onChange={setHorarioEscolhido}
            />
          )}

          {step === 2 && (
            <StepIdentificacao value={ident} onChange={setIdent} />
          )}

          {step === 3 && dataEscolhida && horarioEscolhido && (
            <StepConfirmacao
              consultor={consultor}
              data={dataEscolhida}
              horario={horarioEscolhido}
              identificacao={ident}
            />
          )}
        </motion.div>

        {erro && (
          <div className="rounded-xl border border-destructive/30 bg-destructive/10 p-4 text-sm text-destructive">
            {erro}
          </div>
        )}

        <div className="flex items-center justify-between pt-2">
          <Button
            variant="outline"
            onClick={voltar}
            disabled={step === 0}
            className="gap-2"
          >
            <ArrowLeftIcon className="size-4" />
            Voltar
          </Button>

          {step < 3 ? (
            <Button onClick={avancar} disabled={!canAdvance} className="gap-2" size="lg">
              Continuar
              <ArrowUpRightIcon className="size-4" />
            </Button>
          ) : (
            <Button onClick={submeter} disabled={submitting} size="lg" className="gap-2">
              {submitting ? "Confirmando..." : "Confirmar agendamento"}
            </Button>
          )}
        </div>
      </div>
    </PublicoLayout>
  )
}
