import { motion } from "framer-motion"
import { BackgroundShader } from "@/components/ui/background-shader"
import { TrendingUpIcon as TrendingUp } from "@/components/ui/icons"
import { STEP_TITLES } from "@/lib/onboarding-schema"

interface OnboardingLayoutProps {
  children: React.ReactNode
  currentStep: number
  totalSteps?: number
}

export function OnboardingLayout({ children, currentStep, totalSteps = 6 }: OnboardingLayoutProps) {
  const progress = (currentStep / totalSteps) * 100

  return (
    <div className="min-h-screen bg-background relative">
      <BackgroundShader />
      <div className="relative z-10 flex flex-col items-center px-4 py-8 md:py-12">
        {/* Logo */}
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: 0.5 }}
          className="flex size-14 items-center justify-center rounded-2xl bg-primary text-primary-foreground shadow-2xl shadow-primary/20 mb-6"
        >
          <TrendingUp className="size-7" />
        </motion.div>

        {/* Title */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1, duration: 0.5 }}
          className="text-center mb-8 max-w-lg"
        >
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-foreground mb-2">
            Bem-vindo ao Programa Multiplicador de Crescimento
          </h1>
          <p className="text-sm text-muted-foreground font-medium leading-relaxed">
            Preencha as informações abaixo com atenção. Esses dados serão utilizados para personalizar sua jornada e para a emissão do contrato.
          </p>
        </motion.div>

        {/* Progress Bar */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2, duration: 0.5 }}
          className="w-full max-w-2xl mb-8"
        >
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold uppercase tracking-widest text-muted-foreground">
              Etapa {currentStep} de {totalSteps}
            </span>
            <span className="text-xs font-bold text-primary">
              {STEP_TITLES[currentStep - 1]}
            </span>
          </div>
          <div className="h-2 bg-muted/20 rounded-full overflow-hidden border border-border/30">
            <motion.div
              className="h-full bg-primary rounded-full"
              initial={{ width: 0 }}
              animate={{ width: `${progress}%` }}
              transition={{ duration: 0.5, ease: "easeOut" }}
            />
          </div>
        </motion.div>

        {/* Content */}
        <div className="w-full max-w-2xl">
          {children}
        </div>

        {/* Footer */}
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
          className="text-center mt-12 text-[11px] text-muted-foreground font-medium uppercase tracking-[0.3em]"
        >
          PMC OS — Black Eagle
        </motion.p>
      </div>
    </div>
  )
}
