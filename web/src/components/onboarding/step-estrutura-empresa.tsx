import type { FieldErrors, UseFormSetValue, UseFormWatch } from "react-hook-form"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import type { OnboardingFormData } from "@/lib/onboarding-schema"

interface Props {
  errors: FieldErrors<OnboardingFormData>
  setValue: UseFormSetValue<OnboardingFormData>
  watch: UseFormWatch<OnboardingFormData>
}

export function StepEstruturaEmpresa({ errors, setValue, watch }: Props) {
  return (
    <div className="space-y-5">
      <div className="space-y-2">
        <Label className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Faturamento anual (R$) *</Label>
        <Input
          type="number"
          min={0}
          step="any"
          inputMode="numeric"
          placeholder="Ex: 500000"
          className="bg-muted/10 border-border"
          value={(watch('faturamento_anual') as any) ?? ''}
          onChange={(e) => setValue('faturamento_anual', e.target.value as any, { shouldValidate: true })}
        />
        <p className="text-[11px] text-muted-foreground font-medium">Valor em reais, sem pontos ou vírgulas. Ex: 500000 para R$ 500 mil.</p>
        {errors.faturamento_anual && <p className="text-xs text-destructive font-medium">{errors.faturamento_anual.message}</p>}
      </div>

      <div className="space-y-2">
        <Label className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Quantidade de funcionários *</Label>
        <Input
          type="number"
          min={0}
          step={1}
          inputMode="numeric"
          placeholder="Ex: 10"
          className="bg-muted/10 border-border"
          value={(watch('numero_funcionarios') as any) ?? ''}
          onChange={(e) => setValue('numero_funcionarios', e.target.value as any, { shouldValidate: true })}
        />
        {errors.numero_funcionarios && <p className="text-xs text-destructive font-medium">{errors.numero_funcionarios.message}</p>}
      </div>

      <div className="space-y-2">
        <Label className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Quantidade de gestores *</Label>
        <Input
          type="number"
          min={0}
          step={1}
          inputMode="numeric"
          placeholder="Ex: 2"
          className="bg-muted/10 border-border"
          value={(watch('numero_gestores') as any) ?? ''}
          onChange={(e) => setValue('numero_gestores', e.target.value as any, { shouldValidate: true })}
        />
        {errors.numero_gestores && <p className="text-xs text-destructive font-medium">{errors.numero_gestores.message}</p>}
      </div>
    </div>
  )
}
