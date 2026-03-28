import type { UseFormRegister, FieldErrors, UseFormSetValue, UseFormWatch } from "react-hook-form"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import type { OnboardingFormData } from "@/lib/onboarding-schema"

const COMO_CONHECEU_OPTIONS = [
  'Instagram', 'YouTube', 'LinkedIn', 'Indicação de amigo/parceiro',
  'Google', 'Evento presencial', 'Podcast', 'Outro'
]

interface Props {
  register: UseFormRegister<OnboardingFormData>
  errors: FieldErrors<OnboardingFormData>
  setValue: UseFormSetValue<OnboardingFormData>
  watch: UseFormWatch<OnboardingFormData>
}

export function StepExpectativas({ register, errors, setValue, watch }: Props) {
  return (
    <div className="space-y-5">
      <div className="space-y-2">
        <Label className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Expectativas ao entrar no programa *</Label>
        <textarea
          {...register('expectativas')}
          placeholder="O que você espera alcançar participando do PMC..."
          className="w-full min-h-[100px] rounded-md bg-muted/10 border border-border px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30 focus-visible:border-primary/50 resize-y"
        />
        {errors.expectativas && <p className="text-xs text-destructive font-medium">{errors.expectativas.message}</p>}
      </div>

      <div className="space-y-2">
        <Label className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Principal motivo que poderia ter impedido a entrada</Label>
        <Input {...register('motivo_impedimento')} placeholder="O que quase fez você não entrar" className="bg-muted/10 border-border" />
      </div>

      <div className="space-y-2">
        <Label className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Como conheceu o PMC? *</Label>
        <Select value={watch('como_conheceu') || ''} onValueChange={(v) => setValue('como_conheceu', v, { shouldValidate: true })}>
          <SelectTrigger className="bg-muted/10 border-border">
            <SelectValue placeholder="Selecione" />
          </SelectTrigger>
          <SelectContent>
            {COMO_CONHECEU_OPTIONS.map(o => (
              <SelectItem key={o} value={o}>{o}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        {errors.como_conheceu && <p className="text-xs text-destructive font-medium">{errors.como_conheceu.message}</p>}
      </div>

      <div className="space-y-2">
        <Label className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Por que decidiu entrar? *</Label>
        <textarea
          {...register('motivo_entrada')}
          placeholder="O que fez você decidir participar do programa..."
          className="w-full min-h-[100px] rounded-md bg-muted/10 border border-border px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30 focus-visible:border-primary/50 resize-y"
        />
        {errors.motivo_entrada && <p className="text-xs text-destructive font-medium">{errors.motivo_entrada.message}</p>}
      </div>

      <div className="space-y-2">
        <Label className="text-xs font-bold uppercase tracking-widest text-muted-foreground">3 entregas mais importantes para sua decisão *</Label>
        <textarea
          {...register('tres_entregas')}
          placeholder="Quais foram as 3 entregas/benefícios que mais pesaram na sua decisão..."
          className="w-full min-h-[100px] rounded-md bg-muted/10 border border-border px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30 focus-visible:border-primary/50 resize-y"
        />
        {errors.tres_entregas && <p className="text-xs text-destructive font-medium">{errors.tres_entregas.message}</p>}
      </div>

      <div className="space-y-2">
        <Label className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Resultado que deseja alcançar até o final do programa *</Label>
        <textarea
          {...register('resultado_final')}
          placeholder="Qual resultado concreto você quer ter ao final do PMC..."
          className="w-full min-h-[100px] rounded-md bg-muted/10 border border-border px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30 focus-visible:border-primary/50 resize-y"
        />
        {errors.resultado_final && <p className="text-xs text-destructive font-medium">{errors.resultado_final.message}</p>}
      </div>

      <div className="space-y-2">
        <Label className="text-xs font-bold uppercase tracking-widest text-muted-foreground">O que espera que o Galdino ajude nos próximos 3 meses? *</Label>
        <textarea
          {...register('expectativa_galdino')}
          placeholder="Como o Galdino pode contribuir para seus resultados nos próximos 3 meses..."
          className="w-full min-h-[100px] rounded-md bg-muted/10 border border-border px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30 focus-visible:border-primary/50 resize-y"
        />
        {errors.expectativa_galdino && <p className="text-xs text-destructive font-medium">{errors.expectativa_galdino.message}</p>}
      </div>
    </div>
  )
}
