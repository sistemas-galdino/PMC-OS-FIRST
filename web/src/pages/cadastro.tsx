import { useEffect, useState } from "react"
import { useNavigate, useSearchParams } from "react-router-dom"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { supabase } from "@/lib/supabase"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { OnboardingLayout } from "@/components/layout/onboarding-layout"
import { StepDadosResponsavel } from "@/components/onboarding/step-dados-responsavel"
import { StepDadosNegocio } from "@/components/onboarding/step-dados-negocio"
import { StepEstruturaEmpresa } from "@/components/onboarding/step-estrutura-empresa"
import { StepDiagnostico } from "@/components/onboarding/step-diagnostico"
import { StepExpectativas } from "@/components/onboarding/step-expectativas"
import { StepMaturidadeIA } from "@/components/onboarding/step-maturidade-ia"
import { stepSchemas, type OnboardingFormData } from "@/lib/onboarding-schema"
import { camposFaltando, chavesFaltando, etapasFaltando } from "@/lib/onboarding-completude"
import { motion, AnimatePresence } from "framer-motion"
import type { Session } from "@supabase/supabase-js"

interface Props {
  session: Session
}

export default function CadastroPage({ session }: Props) {
  const navigate = useNavigate()
  const [sp] = useSearchParams()
  // Link que o CS envia pra quem enviou o formulário com perguntas em branco
  // (/cadastro?revisar=1). Sem ele quem já enviou é devolvido pra home.
  const querRevisar = sp.get("revisar") === "1"
  const [currentStep, setCurrentStep] = useState(1)
  const [saving, setSaving] = useState(false)
  const [loading, setLoading] = useState(true)
  const [submitted, setSubmitted] = useState(false)
  // Modo revisão: só as etapas que têm pergunta em branco, e o status continua
  // 'enviado' no fim (o cliente não volta pra fila de "Em andamento").
  const [modoRevisao, setModoRevisao] = useState(false)
  const [etapasRevisao, setEtapasRevisao] = useState<number[]>([])
  const [faltantesIniciais, setFaltantesIniciais] = useState<Set<string>>(new Set())
  const [labelsFaltando, setLabelsFaltando] = useState<string[]>([])
  const [nadaFaltando, setNadaFaltando] = useState(false)

  const form = useForm<OnboardingFormData>({
    // Valida contra o schema da etapa atual. Sem este resolver o trigger() do
    // handleNext sempre respondia "válido" e NENHUM campo era exigido de fato —
    // os asteriscos dos rótulos eram decorativos.
    resolver: zodResolver(stepSchemas[currentStep - 1]) as never,
    defaultValues: {
      pais: 'BR',
      ia_interesses: [],
      ia_kpis: undefined,
      ia_dashboard: undefined,
      ia_processos: undefined,
      ia_agentes: undefined,
      ia_sistema: undefined,
    },
  })

  const { register, setValue, watch, formState: { errors }, trigger, getValues } = form

  // Load existing data from DB for resume
  useEffect(() => {
    async function loadOnboarding() {
      const userId = session.user.id
      const { data } = await supabase
        .from('cliente_onboarding')
        .select('*')
        .eq('id_cliente', userId)
        .maybeSingle()

      if (data) {
        const jaEnviou = data.status === 'enviado'
        if (jaEnviou && !querRevisar) {
          navigate('/', { replace: true })
          return
        }

        // Populate form with saved data
        const skipFields = new Set(['id', 'id_cliente', 'step_atual', 'status', 'created_at', 'updated_at', 'enviado_em', 'nivel_ia'])
        for (const [key, value] of Object.entries(data)) {
          if (value !== null && value !== undefined && !skipFields.has(key)) {
            setValue(key as keyof OnboardingFormData, value as any)
          }
        }

        if (jaEnviou) {
          const etapas = etapasFaltando(data)
          setModoRevisao(true)
          setFaltantesIniciais(chavesFaltando(data))
          setLabelsFaltando(camposFaltando(data).map((c) => c.label))
          if (etapas.length === 0) {
            setNadaFaltando(true)
          } else {
            setEtapasRevisao(etapas)
            setCurrentStep(etapas[0])
          }
        } else {
          setCurrentStep(data.step_atual || 1)
        }
      }
      setLoading(false)
    }

    loadOnboarding()
  }, [session, navigate, setValue, querRevisar])

  // Em revisão o cliente pula direto pras etapas com buraco; no fluxo normal a
  // sequência é 1→6 como sempre.
  const proximaEtapa = (): number | null => {
    if (modoRevisao) {
      const i = etapasRevisao.indexOf(currentStep)
      return i >= 0 && i < etapasRevisao.length - 1 ? etapasRevisao[i + 1] : null
    }
    return currentStep < 6 ? currentStep + 1 : null
  }

  const etapaAnterior = (): number | null => {
    if (modoRevisao) {
      const i = etapasRevisao.indexOf(currentStep)
      return i > 0 ? etapasRevisao[i - 1] : null
    }
    return currentStep > 1 ? currentStep - 1 : null
  }

  const saveCurrentStep = async (nextStep: number) => {
    setSaving(true)
    const userId = session.user.id
    const values = getValues()

    const { error } = await supabase
      .from('cliente_onboarding')
      .update({
        ...values,
        // step_atual só faz sentido pra quem ainda está preenchendo: em revisão
        // o formulário já foi enviado e o ponteiro de retomada não deve mudar.
        ...(modoRevisao ? {} : { step_atual: nextStep }),
        updated_at: new Date().toISOString(),
      })
      .eq('id_cliente', userId)

    setSaving(false)
    if (error) {
      console.error('Error saving:', error)
      return false
    }
    return true
  }

  const handleNext = async () => {
    const schema = stepSchemas[currentStep - 1]
    const fields = Object.keys(schema.shape || {}) as (keyof OnboardingFormData)[]
    const valid = await trigger(fields)
    if (!valid) return

    const proxima = proximaEtapa()
    if (proxima === null) {
      await handleSubmit()
      return
    }

    const saved = await saveCurrentStep(proxima)
    if (saved) {
      setCurrentStep(proxima)
    }
  }

  const handleBack = () => {
    const anterior = etapaAnterior()
    if (anterior !== null) {
      setCurrentStep(anterior)
    }
  }

  const handleSubmit = async () => {
    setSaving(true)
    const userId = session.user.id
    const values = getValues()

    // Compute nivel_ia
    const allYes = values.ia_kpis && values.ia_dashboard && values.ia_processos && values.ia_agentes && values.ia_sistema
    const nivel_ia = allYes ? 1 : 2

    // Update onboarding record. Em revisão o status e a data original de envio
    // ficam intactos — foi complemento de respostas, não um novo envio.
    const { error: onboardingError } = await supabase
      .from('cliente_onboarding')
      .update({
        ...values,
        nivel_ia,
        ...(modoRevisao
          ? {}
          : { status: 'enviado', enviado_em: new Date().toISOString() }),
        updated_at: new Date().toISOString(),
      })
      .eq('id_cliente', userId)

    if (onboardingError) {
      console.error('Error submitting:', onboardingError)
      setSaving(false)
      return
    }

    if (modoRevisao) {
      // Só as métricas cuja resposta estava em branco: um upsert cheio
      // sobrescreveria metas que o cliente já ajustou no painel.
      const metas: Record<string, unknown> = {}
      if (faltantesIniciais.has('faturamento_anual')) {
        metas.faturamento_anual_objetivo = Number(values.faturamento_anual) || 0
      }
      if (faltantesIniciais.has('numero_funcionarios') || faltantesIniciais.has('numero_gestores')) {
        const func = Number(values.numero_funcionarios) || 0
        const gest = Number(values.numero_gestores) || 0
        metas.numero_funcionarios = func
        metas.numero_gestores = gest
        metas.colaboradores_total = func + gest
      }
      if (faltantesIniciais.has('meta_12_meses')) metas.meta_2026 = Number(values.meta_12_meses) || 0
      if (faltantesIniciais.has('desafios')) metas.principais_desafios = values.desafios ?? null
      if (faltantesIniciais.has('expectativa_galdino')) metas.como_ajudar = values.expectativa_galdino ?? null
      if (faltantesIniciais.has('resultado_final')) metas.resultados_esperados = values.resultado_final ?? null
      if (faltantesIniciais.has('tres_entregas')) metas.entregas_decisivas = values.tres_entregas ?? null

      if (Object.keys(metas).length > 0) {
        await supabase.from('cliente_metas').update(metas).eq('id_cliente', userId)
      }

      setSaving(false)
      setSubmitted(true)
      return
    }

    // Update client status + país. Moeda via RPC (SECURITY DEFINER) só se US.
    await supabase
      .from('clientes_entrada_new')
      .update({ status_atual: 'Ativo no Programa', pais: values.pais ?? 'BR' })
      .eq('id_cliente', userId)

    if (values.pais === 'US') {
      await supabase.rpc('update_minha_moeda', { nova_moeda: 'USD' })
    }

    // Seed dashboard metrics from onboarding answers
    const faturamento = Number(values.faturamento_anual) || 0
    const funcionarios = Number(values.numero_funcionarios) || 0
    const gestores = Number(values.numero_gestores) || 0
    const meta12m = Number(values.meta_12_meses) || 0
    await supabase
      .from('cliente_metas')
      .upsert(
        {
          id_cliente: userId,
          faturamento_anual_objetivo: faturamento,
          colaboradores_total: funcionarios + gestores,
          numero_funcionarios: funcionarios,
          numero_gestores: gestores,
          meta_2026: meta12m,
          principais_desafios: values.desafios ?? null,
          como_ajudar: values.expectativa_galdino ?? null,
          resultados_esperados: values.resultado_final ?? null,
          entregas_decisivas: values.tres_entregas ?? null,
        },
        { onConflict: 'id_cliente' }
      )

    setSaving(false)
    setSubmitted(true)
  }

  if (loading) {
    return (
      <OnboardingLayout currentStep={1}>
        <div className="flex items-center justify-center py-20">
          <div className="size-10 border-4 border-primary/20 border-t-primary rounded-full animate-spin" />
        </div>
      </OnboardingLayout>
    )
  }

  // Abriu o link de revisão mas não há pergunta em branco: melhor dizer isso do
  // que abrir 6 etapas de formulário sem motivo.
  if (nadaFaltando) {
    return (
      <OnboardingLayout currentStep={6}>
        <Card className="border-border bg-card/50 backdrop-blur-xl shadow-2xl">
          <CardContent className="py-16 px-8 text-center space-y-6">
            <h2 className="text-2xl font-bold text-foreground">Seu formulário já está completo</h2>
            <p className="text-muted-foreground font-medium max-w-md mx-auto leading-relaxed">
              Todas as perguntas do onboarding foram respondidas. Não há nada pendente do seu lado.
            </p>
            <Button
              onClick={() => { window.location.href = '/' }}
              className="mt-4 font-bold shadow-xl shadow-primary/20"
              size="lg"
            >
              Acessar o Sistema
            </Button>
          </CardContent>
        </Card>
      </OnboardingLayout>
    )
  }

  if (submitted) {
    return (
      <OnboardingLayout currentStep={6}>
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.6 }}
        >
          <Card className="border-border bg-card/50 backdrop-blur-xl shadow-2xl">
            <CardContent className="py-16 px-8 text-center space-y-6">
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ delay: 0.2, type: "spring", stiffness: 200 }}
                className="size-20 bg-primary/10 border-2 border-primary/30 rounded-full flex items-center justify-center mx-auto"
              >
                <svg className="size-10 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
              </motion.div>
              <h2 className="text-2xl font-bold text-foreground">
                {modoRevisao ? 'Respostas Atualizadas!' : 'Cadastro Concluído!'}
              </h2>
              <p className="text-muted-foreground font-medium max-w-md mx-auto leading-relaxed">
                {modoRevisao
                  ? 'Recebemos as respostas que faltavam. Seu onboarding está completo — obrigado por complementar.'
                  : 'Recebemos suas informações com sucesso. Nosso time irá analisar os dados para dar sequência ao seu onboarding no PMC.'}
              </p>
              <Button
                onClick={() => { window.location.href = '/' }}
                className="mt-4 font-bold shadow-xl shadow-primary/20"
                size="lg"
              >
                Acessar o Sistema
              </Button>
            </CardContent>
          </Card>
        </motion.div>
      </OnboardingLayout>
    )
  }

  return (
    <OnboardingLayout currentStep={currentStep}>
      <AnimatePresence mode="wait">
        <motion.div
          key={currentStep}
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -20 }}
          transition={{ duration: 0.3 }}
        >
          {modoRevisao && (
            <div className="mb-4 rounded-2xl border border-primary/30 bg-primary/5 p-5">
              <p className="text-sm font-bold text-foreground">
                {labelsFaltando.length === 1
                  ? 'Faltou 1 resposta no seu onboarding'
                  : `Faltaram ${labelsFaltando.length} respostas no seu onboarding`}
              </p>
              <p className="text-xs text-muted-foreground mt-1.5 leading-relaxed">
                Já trouxemos tudo o que você respondeu. Você só passa pelas etapas que têm
                pergunta em aberto — {etapasRevisao.length === 1 ? 'é 1 etapa' : `são ${etapasRevisao.length} etapas`}.
              </p>
              <p className="text-xs text-muted-foreground mt-2.5">
                <span className="font-semibold text-foreground/80">Em aberto:</span>{' '}
                {labelsFaltando.join(' · ')}
              </p>
            </div>
          )}

          <Card className="border-border bg-card/50 backdrop-blur-xl shadow-2xl">
            <CardContent className="p-6 md:p-8">
              {currentStep === 1 && <StepDadosResponsavel register={register} errors={errors} setValue={setValue} watch={watch} />}
              {currentStep === 2 && <StepDadosNegocio register={register} errors={errors} setValue={setValue} watch={watch} />}
              {currentStep === 3 && <StepEstruturaEmpresa errors={errors} setValue={setValue} watch={watch} />}
              {currentStep === 4 && <StepDiagnostico register={register} errors={errors} />}
              {currentStep === 5 && <StepExpectativas register={register} errors={errors} setValue={setValue} watch={watch} />}
              {currentStep === 6 && <StepMaturidadeIA errors={errors} setValue={setValue} watch={watch} />}
            </CardContent>
          </Card>

          {/* Navigation */}
          <div className="flex items-center justify-between mt-6">
            <Button
              variant="outline"
              onClick={handleBack}
              disabled={etapaAnterior() === null || saving}
              className="font-bold"
            >
              Voltar
            </Button>
            <Button
              onClick={handleNext}
              disabled={saving}
              className="font-bold shadow-xl shadow-primary/20 min-w-[180px]"
            >
              {saving ? (
                <div className="flex items-center gap-2">
                  <div className="size-4 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin" />
                  Salvando...
                </div>
              ) : proximaEtapa() !== null ? (
                'Salvar e Continuar'
              ) : modoRevisao ? (
                'Enviar Respostas'
              ) : (
                'Finalizar Cadastro'
              )}
            </Button>
          </div>
        </motion.div>
      </AnimatePresence>
    </OnboardingLayout>
  )
}
