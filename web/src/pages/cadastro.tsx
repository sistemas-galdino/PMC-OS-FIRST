import { useEffect, useState } from "react"
import { useNavigate } from "react-router-dom"
import { useForm } from "react-hook-form"
import { supabase } from "@/lib/supabase"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { OnboardingLayout } from "@/components/layout/onboarding-layout"
import { StepDadosResponsavel } from "@/components/onboarding/step-dados-responsavel"
import { StepDadosNegocio } from "@/components/onboarding/step-dados-negocio"
import { StepEstruturaEmpresa } from "@/components/onboarding/step-estrutura-empresa"
import { StepDiagnostico } from "@/components/onboarding/step-diagnostico"
import { StepExpectativas } from "@/components/onboarding/step-expectativas"
import { StepDadosContrato } from "@/components/onboarding/step-dados-contrato"
import { StepMaturidadeIA } from "@/components/onboarding/step-maturidade-ia"
import { stepSchemas, type OnboardingFormData } from "@/lib/onboarding-schema"
import { motion, AnimatePresence } from "framer-motion"
import type { Session } from "@supabase/supabase-js"

interface Props {
  session: Session
}

export default function CadastroPage({ session }: Props) {
  const navigate = useNavigate()
  const [currentStep, setCurrentStep] = useState(1)
  const [saving, setSaving] = useState(false)
  const [loading, setLoading] = useState(true)
  const [submitted, setSubmitted] = useState(false)

  const form = useForm<OnboardingFormData>({
    defaultValues: {
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
        if (data.status === 'enviado') {
          navigate('/', { replace: true })
          return
        }
        setCurrentStep(data.step_atual || 1)
        // Populate form with saved data
        const skipFields = new Set(['id', 'id_cliente', 'step_atual', 'status', 'created_at', 'updated_at', 'enviado_em', 'nivel_ia'])
        for (const [key, value] of Object.entries(data)) {
          if (value !== null && value !== undefined && !skipFields.has(key)) {
            setValue(key as keyof OnboardingFormData, value as any)
          }
        }
      }
      setLoading(false)
    }

    loadOnboarding()
  }, [session, navigate, setValue])

  const saveCurrentStep = async (nextStep: number) => {
    setSaving(true)
    const userId = session.user.id
    const values = getValues()

    const { error } = await supabase
      .from('cliente_onboarding')
      .update({
        ...values,
        step_atual: nextStep,
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

    // For step 6 with superRefine, validate differently
    if (currentStep === 6) {
      const values = getValues()
      const step6Data = {
        tipo_pessoa: values.tipo_pessoa,
        razao_social: values.razao_social,
        nacionalidade: values.nacionalidade,
        email_representante: values.email_representante,
        telefone_representante: values.telefone_representante,
        profissao: values.profissao,
        cpf: values.cpf,
        cnpj: values.cnpj,
      }
      const result = stepSchemas[5].safeParse(step6Data)
      if (!result.success) {
        for (const issue of result.error.issues) {
          const path = issue.path[0] as keyof OnboardingFormData
          form.setError(path, { message: issue.message })
        }
        return
      }
    } else {
      const valid = await trigger(fields)
      if (!valid) return
    }

    if (currentStep === 7) {
      await handleSubmit()
      return
    }

    const saved = await saveCurrentStep(currentStep + 1)
    if (saved) {
      setCurrentStep(currentStep + 1)
    }
  }

  const handleBack = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1)
    }
  }

  const handleSubmit = async () => {
    setSaving(true)
    const userId = session.user.id
    const values = getValues()

    // Compute nivel_ia
    const allYes = values.ia_kpis && values.ia_dashboard && values.ia_processos && values.ia_agentes && values.ia_sistema
    const nivel_ia = allYes ? 1 : 2

    // Update onboarding record
    const { error: onboardingError } = await supabase
      .from('cliente_onboarding')
      .update({
        ...values,
        nivel_ia,
        status: 'enviado',
        enviado_em: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('id_cliente', userId)

    if (onboardingError) {
      console.error('Error submitting:', onboardingError)
      setSaving(false)
      return
    }

    // Update client status
    await supabase
      .from('clientes_entrada_new')
      .update({ status_atual: 'Ativo no Programa' })
      .eq('id_cliente', userId)

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

  if (submitted) {
    return (
      <OnboardingLayout currentStep={7}>
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
              <h2 className="text-2xl font-bold text-foreground">Cadastro Concluído!</h2>
              <p className="text-muted-foreground font-medium max-w-md mx-auto leading-relaxed">
                Recebemos suas informações com sucesso. Nosso time irá analisar os dados para dar sequência ao seu onboarding no PMC.
              </p>
              <Button
                onClick={() => navigate('/', { replace: true })}
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
          <Card className="border-border bg-card/50 backdrop-blur-xl shadow-2xl">
            <CardContent className="p-6 md:p-8">
              {currentStep === 1 && <StepDadosResponsavel register={register} errors={errors} setValue={setValue} watch={watch} />}
              {currentStep === 2 && <StepDadosNegocio register={register} errors={errors} setValue={setValue} watch={watch} />}
              {currentStep === 3 && <StepEstruturaEmpresa errors={errors} setValue={setValue} watch={watch} />}
              {currentStep === 4 && <StepDiagnostico register={register} errors={errors} />}
              {currentStep === 5 && <StepExpectativas register={register} errors={errors} setValue={setValue} watch={watch} />}
              {currentStep === 6 && <StepDadosContrato register={register} errors={errors} setValue={setValue} watch={watch} />}
              {currentStep === 7 && <StepMaturidadeIA errors={errors} setValue={setValue} watch={watch} />}
            </CardContent>
          </Card>

          {/* Navigation */}
          <div className="flex items-center justify-between mt-6">
            <Button
              variant="outline"
              onClick={handleBack}
              disabled={currentStep === 1 || saving}
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
              ) : currentStep === 7 ? 'Finalizar Cadastro' : 'Salvar e Continuar'}
            </Button>
          </div>
        </motion.div>
      </AnimatePresence>
    </OnboardingLayout>
  )
}
