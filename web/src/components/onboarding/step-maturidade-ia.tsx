import type { FieldErrors, UseFormSetValue, UseFormWatch } from "react-hook-form"
import { Label } from "@/components/ui/label"
import type { OnboardingFormData } from "@/lib/onboarding-schema"

const IA_QUESTIONS = [
  { field: 'ia_kpis' as const, label: 'Você utiliza indicadores (KPIs) acompanhados com IA?' },
  { field: 'ia_dashboard' as const, label: 'Você tem dashboards de acompanhamento com IA?' },
  { field: 'ia_processos' as const, label: 'Você tem processos mapeados com uso de IA?' },
  { field: 'ia_agentes' as const, label: 'Você utiliza agentes de IA?' },
  { field: 'ia_sistema' as const, label: 'Você tem sistemas integrados com IA?' },
]

const INTERESSES_OPTIONS = [
  'IA aplicada ao Comercial/Vendas (prospecção, follow-up, fechamento)',
  'IA aplicada ao Marketing (geração de leads, conteúdo, campanhas)',
  'IA para Automação de Processos',
  'IA para Gestão e Operações',
  'IA para Atendimento ao Cliente',
  'Outro',
]

interface Props {
  errors: FieldErrors<OnboardingFormData>
  setValue: UseFormSetValue<OnboardingFormData>
  watch: UseFormWatch<OnboardingFormData>
}

export function StepMaturidadeIA({ errors, setValue, watch }: Props) {
  const interesses = watch('ia_interesses') || []
  const showOutro = interesses.includes('Outro')

  const toggleInteresse = (item: string) => {
    const current = watch('ia_interesses') || []
    const updated = current.includes(item)
      ? current.filter((i: string) => i !== item)
      : [...current, item]
    setValue('ia_interesses', updated, { shouldValidate: true })
  }

  return (
    <div className="space-y-8">
      {/* Diagnostico */}
      <div className="space-y-2">
        <h3 className="text-sm font-bold text-foreground uppercase tracking-wide">Diagnóstico de Maturidade em IA</h3>
        <p className="text-xs text-muted-foreground">Responda sim ou não para cada pergunta abaixo.</p>
      </div>

      <div className="space-y-4">
        {IA_QUESTIONS.map(({ field, label }) => (
          <div key={field} className="flex items-center justify-between p-4 rounded-xl border border-border/50 bg-card/30">
            <span className="text-sm text-foreground font-medium pr-4">{label}</span>
            <div className="flex gap-2 shrink-0">
              <button
                type="button"
                onClick={() => setValue(field, true, { shouldValidate: true })}
                className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all ${
                  watch(field) === true
                    ? 'bg-primary/10 border border-primary/50 text-primary'
                    : 'bg-muted/10 border border-border text-muted-foreground hover:border-primary/30'
                }`}
              >
                Sim
              </button>
              <button
                type="button"
                onClick={() => setValue(field, false, { shouldValidate: true })}
                className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all ${
                  watch(field) === false
                    ? 'bg-destructive/10 border border-destructive/50 text-destructive'
                    : 'bg-muted/10 border border-border text-muted-foreground hover:border-destructive/30'
                }`}
              >
                Não
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Interesses */}
      <div className="space-y-4">
        <div className="space-y-2">
          <h3 className="text-sm font-bold text-foreground uppercase tracking-wide">Conteúdos de Interesse</h3>
          <p className="text-xs text-muted-foreground">Selecione os temas que mais interessam você. *</p>
        </div>

        <div className="space-y-2">
          {INTERESSES_OPTIONS.map((item) => (
            <button
              key={item}
              type="button"
              onClick={() => toggleInteresse(item)}
              className={`w-full text-left p-3 rounded-xl border text-sm font-medium transition-all ${
                interesses.includes(item)
                  ? 'bg-primary/10 border-primary/50 text-primary'
                  : 'bg-muted/10 border-border text-muted-foreground hover:border-primary/30'
              }`}
            >
              {item}
            </button>
          ))}
          {errors.ia_interesses && <p className="text-xs text-destructive font-medium">{errors.ia_interesses.message}</p>}
        </div>

        {showOutro && (
          <div className="space-y-2">
            <Label className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Descreva qual conteúdo tem interesse</Label>
            <textarea
              value={watch('ia_outro') || ''}
              onChange={(e) => setValue('ia_outro', e.target.value)}
              placeholder="Descreva aqui..."
              className="w-full min-h-[80px] rounded-md bg-muted/10 border border-border px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30 focus-visible:border-primary/50 resize-y"
            />
          </div>
        )}
      </div>
    </div>
  )
}
