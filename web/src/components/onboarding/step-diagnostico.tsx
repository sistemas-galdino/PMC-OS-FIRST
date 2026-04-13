import type { UseFormRegister, FieldErrors } from "react-hook-form"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import type { OnboardingFormData } from "@/lib/onboarding-schema"

interface Props {
  register: UseFormRegister<OnboardingFormData>
  errors: FieldErrors<OnboardingFormData>
}

export function StepDiagnostico({ register, errors }: Props) {
  return (
    <div className="space-y-5">
      <div className="space-y-2">
        <Label className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Quais são os 2 principais desafios da sua empresa hoje? *</Label>
        <textarea
          {...register('desafios')}
          placeholder="Descreva os dois principais desafios que sua empresa enfrenta atualmente..."
          className="w-full min-h-[120px] rounded-md bg-muted/10 border border-border px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30 focus-visible:border-primary/50 resize-y"
        />
        {errors.desafios && <p className="text-xs text-destructive font-medium">{errors.desafios.message}</p>}
      </div>

      <div className="space-y-2">
        <Label className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Por que você ainda não conseguiu superá-los? *</Label>
        <textarea
          {...register('motivo_nao_superou')}
          placeholder="O que tem impedido você de superar esses desafios..."
          className="w-full min-h-[120px] rounded-md bg-muted/10 border border-border px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30 focus-visible:border-primary/50 resize-y"
        />
        {errors.motivo_nao_superou && <p className="text-xs text-destructive font-medium">{errors.motivo_nao_superou.message}</p>}
      </div>

      <div className="space-y-2">
        <Label className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Referências de posicionamento de marca</Label>
        <Input {...register('referencias_posicionamento')} placeholder="Marcas ou empresas que são referência para você" className="bg-muted/10 border-border" />
      </div>

      <div className="space-y-2">
        <Label className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Meta de faturamento para os próximos 12 meses *</Label>
        <Input
          type="number"
          min={0}
          step="any"
          inputMode="numeric"
          {...register('meta_12_meses')}
          placeholder="Ex: 2000000"
          className="bg-muted/10 border-border"
        />
        <p className="text-[11px] text-muted-foreground font-medium">Valor em reais, sem pontos ou vírgulas. Ex: 2000000 para R$ 2 milhões.</p>
        {errors.meta_12_meses && <p className="text-xs text-destructive font-medium">{errors.meta_12_meses.message}</p>}
      </div>
    </div>
  )
}
