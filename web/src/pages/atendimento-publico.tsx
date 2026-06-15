import { useEffect, useMemo, useState } from "react"
import { useNavigate, useParams } from "react-router-dom"
import { motion } from "framer-motion"
import { supabase } from "@/lib/supabase"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { ArrowLeftIcon, ArrowUpRightIcon, AlertCircleIcon } from "@/components/ui/icons"
import { Spinner } from "@/components/ui/spinner"
import { PublicoLayout } from "@/components/atendimento-publico/publico-layout"
import { ConsultorCard } from "@/components/atendimento-publico/consultor-card"
import { Stepper } from "@/components/atendimento-publico/stepper"
import { StepData } from "@/components/atendimento-publico/step-data"
import { StepHorario } from "@/components/atendimento-publico/step-horario"
import { StepIdentificacao, type IdentificacaoForm } from "@/components/atendimento-publico/step-identificacao"
import { StepConfirmacao } from "@/components/atendimento-publico/step-confirmacao"
import { StepSucesso } from "@/components/atendimento-publico/step-sucesso"
import { mapaOcupadosPorData, isoData, HORIZONTE_DIAS } from "@/lib/atendimentos"
import type { Consultor, Disponibilidade, ExcecaoConsultor, Feriado } from "@/lib/atendimentos"

const STEPS = ["Data", "Horário", "Você", "Confirmação"]

const initialIdent: IdentificacaoForm = {
  nome: "",
  email: "",
  codigo_cliente: "",
  telefone: "",
  observacoes: "",
}

function codigoValido(s: string): boolean {
  const trimmed = s.trim()
  if (!trimmed) return false
  const n = Number(trimmed)
  return Number.isInteger(n) && n > 0
}

export default function AtendimentoPublicoPage() {
  const { slug } = useParams<{ slug?: string }>()
  const navigate = useNavigate()

  const [consultores, setConsultores] = useState<Consultor[]>([])
  const [consultor, setConsultor] = useState<Consultor | null>(null)
  const [disponibilidade, setDisponibilidade] = useState<Disponibilidade[]>([])
  const [excecoes, setExcecoes] = useState<ExcecaoConsultor[]>([])
  const [feriados, setFeriados] = useState<Feriado[]>([])
  const [loading, setLoading] = useState(true)
  const [erroFatal, setErroFatal] = useState<string | null>(null)

  const [step, setStep] = useState(0)
  const [dataEscolhida, setDataEscolhida] = useState<string | null>(null)
  const [horarioEscolhido, setHorarioEscolhido] = useState<string | null>(null)
  const [ident, setIdent] = useState<IdentificacaoForm>(initialIdent)
  const [ocupadosPorData, setOcupadosPorData] = useState<Map<string, Set<string>>>(new Map())
  const [submitting, setSubmitting] = useState(false)
  const [erro, setErro] = useState<string | null>(null)
  const [sucesso, setSucesso] = useState(false)

  useEffect(() => {
    async function load() {
      setLoading(true)
      if (slug) {
        const { data: c, error: cErr } = await supabase
          .from("consultores_atendimento")
          // Só colunas públicas: anon não tem grant em email/email_calendar/
          // tabela_destino/nomes_match (ver migration 20260609_hardening_link_publico).
          .select("id,nome,slug,especialidade,descricao,avatar_url,accent,duracao_padrao_minutos,ordem,ativo,tipo_reuniao")
          .eq("slug", slug)
          .eq("ativo", true)
          .maybeSingle()

        if (cErr || !c) {
          setErroFatal("Consultor não encontrado ou indisponível.")
          setLoading(false)
          return
        }

        const hoje = new Date().toISOString().slice(0, 10)
        const hojeLocal = new Date()
        hojeLocal.setHours(0, 0, 0, 0)
        const ateLocal = new Date(hojeLocal)
        ateLocal.setDate(ateLocal.getDate() + HORIZONTE_DIAS)
        const [{ data: d }, { data: exs }, { data: fs }, { data: ocup }] = await Promise.all([
          supabase
            .from("consultores_disponibilidade")
            .select("*")
            .eq("consultor_id", c.id),
          supabase
            .from("consultores_excecoes")
            // Sem a coluna 'motivo' (anon não tem grant nela).
            .select("id,consultor_id,data,tipo,hora_inicio,hora_fim")
            .eq("consultor_id", c.id)
            .gte("data", hoje),
          supabase
            .from("feriados")
            .select("*")
            .gte("data", hoje),
          // Ocupação da janela inteira (RPC SECURITY DEFINER): o link público é
          // anônimo e não lê reuniões direto (RLS). Devolve só (data, horário) do
          // consultor (nome + aliases), pra esconder horários ocupados E datas lotadas.
          supabase.rpc("horarios_ocupados_consultor_intervalo", {
            p_slug: c.slug,
            p_from: isoData(hojeLocal),
            p_to: isoData(ateLocal),
          }),
        ])

        setConsultor(c as Consultor)
        setDisponibilidade((d as Disponibilidade[]) ?? [])
        setExcecoes((exs as ExcecaoConsultor[]) ?? [])
        setFeriados((fs as Feriado[]) ?? [])
        setOcupadosPorData(
          mapaOcupadosPorData(
            (ocup as { data_reuniao: string | null; horario: string | null }[] | null) ?? [],
          ),
        )
      } else {
        const { data: cs } = await supabase
          .from("consultores_atendimento")
          .select("id,nome,slug,especialidade,descricao,avatar_url,accent,duracao_padrao_minutos,ordem,ativo,tipo_reuniao")
          .eq("ativo", true)
          .order("ordem", { ascending: true })
        setConsultores((cs as Consultor[]) ?? [])
      }
      setLoading(false)
    }
    load()
  }, [slug])

  // Horários ocupados da data selecionada, derivados do mapa carregado no load().
  const slotsOcupadosData = useMemo(
    () => (dataEscolhida ? Array.from(ocupadosPorData.get(dataEscolhida) ?? []) : []),
    [ocupadosPorData, dataEscolhida],
  )

  async function submeter() {
    if (!consultor || !dataEscolhida || !horarioEscolhido) return
    if (!ident.nome.trim() || !ident.email.trim()) {
      setErro("Nome e email são obrigatórios")
      return
    }
    if (!codigoValido(ident.codigo_cliente)) {
      setErro("Informe o código da empresa (número inteiro)")
      return
    }
    setSubmitting(true)
    setErro(null)
    try {
      // fetch direto (em vez de supabase.functions.invoke): o invoke consome o corpo
      // da resposta de erro, então a UI mostrava "non-2xx" genérico em vez da mensagem
      // real. Aqui lemos o JSON nós mesmos e exibimos body.error.
      const baseUrl = import.meta.env.VITE_SUPABASE_URL
      const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY
      const res = await fetch(`${baseUrl}/functions/v1/criar-agendamento`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          apikey: anonKey,
          Authorization: `Bearer ${anonKey}`,
        },
        body: JSON.stringify({
          slug: consultor.slug,
          data: dataEscolhida,
          horario: horarioEscolhido,
          cliente_nome: ident.nome.trim(),
          cliente_email: ident.email.trim(),
          codigo_cliente: Number(ident.codigo_cliente.trim()),
          cliente_telefone: ident.telefone.trim() || null,
          observacoes: ident.observacoes.trim() || null,
        }),
      })
      const json = await res.json().catch(() => ({} as { error?: string }))
      if (!res.ok) {
        setErro(json.error ?? "Não foi possível concluir o agendamento. Tente de novo.")
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
    if (step === 2) {
      if (!ident.nome.trim() || !ident.email.trim()) {
        setErro("Preencha nome e email")
        return
      }
      if (!codigoValido(ident.codigo_cliente)) {
        setErro("Informe o código da empresa (número inteiro)")
        return
      }
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
    if (step === 2) return !!ident.nome.trim() && !!ident.email.trim() && codigoValido(ident.codigo_cliente)
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
              excecoes={excecoes}
              feriados={feriados}
              duracao_minutos={consultor.duracao_padrao_minutos}
              ocupadosPorData={ocupadosPorData}
              value={dataEscolhida}
              horario={horarioEscolhido}
              onSelecionarData={iso => {
                setErro(null)
                setDataEscolhida(iso)
                setHorarioEscolhido(null)
                setStep(1)
              }}
              onSelecionarHorario={(iso, slot) => {
                setErro(null)
                setDataEscolhida(iso)
                setHorarioEscolhido(slot)
                setStep(2)
              }}
            />
          )}

          {step === 1 && dataEscolhida && (
            <StepHorario
              disponibilidade={disponibilidade}
              excecoes={excecoes}
              feriados={feriados}
              duracao_minutos={consultor.duracao_padrao_minutos}
              data={dataEscolhida}
              slotsOcupados={slotsOcupadosData}
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
              {submitting ? (
                <>
                  <Spinner className="size-4" />
                  Confirmando...
                </>
              ) : "Confirmar agendamento"}
            </Button>
          )}
        </div>
      </div>
    </PublicoLayout>
  )
}
