import type { FieldErrors, UseFormSetValue, UseFormWatch } from "react-hook-form"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import type { OnboardingFormData } from "@/lib/onboarding-schema"

const FATURAMENTO_OPTIONS = [
  'Até R$ 100 mil', 'R$ 100 mil - R$ 500 mil', 'R$ 500 mil - R$ 1 milhão',
  'R$ 1 milhão - R$ 5 milhões', 'R$ 5 milhões - R$ 10 milhões',
  'R$ 10 milhões - R$ 30 milhões', 'R$ 30 milhões - R$ 100 milhões',
  'Acima de R$ 100 milhões'
]

const FUNCIONARIOS_OPTIONS = [
  'Nenhum (somente eu)', '1 a 5', '6 a 15', '16 a 30', '31 a 50',
  '51 a 100', '101 a 300', 'Mais de 300'
]

const GESTORES_OPTIONS = [
  'Nenhum', '1 a 2', '3 a 5', '6 a 10', 'Mais de 10'
]

interface Props {
  errors: FieldErrors<OnboardingFormData>
  setValue: UseFormSetValue<OnboardingFormData>
  watch: UseFormWatch<OnboardingFormData>
}

export function StepEstruturaEmpresa({ errors, setValue, watch }: Props) {
  return (
    <div className="space-y-5">
      <div className="space-y-2">
        <Label className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Faturamento anual *</Label>
        <Select value={watch('faturamento_anual') || ''} onValueChange={(v) => setValue('faturamento_anual', v, { shouldValidate: true })}>
          <SelectTrigger className="bg-muted/10 border-border">
            <SelectValue placeholder="Selecione a faixa de faturamento" />
          </SelectTrigger>
          <SelectContent>
            {FATURAMENTO_OPTIONS.map(o => (
              <SelectItem key={o} value={o}>{o}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        {errors.faturamento_anual && <p className="text-xs text-destructive font-medium">{errors.faturamento_anual.message}</p>}
      </div>

      <div className="space-y-2">
        <Label className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Quantidade de funcionários *</Label>
        <Select value={watch('numero_funcionarios') || ''} onValueChange={(v) => setValue('numero_funcionarios', v, { shouldValidate: true })}>
          <SelectTrigger className="bg-muted/10 border-border">
            <SelectValue placeholder="Selecione a quantidade" />
          </SelectTrigger>
          <SelectContent>
            {FUNCIONARIOS_OPTIONS.map(o => (
              <SelectItem key={o} value={o}>{o}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        {errors.numero_funcionarios && <p className="text-xs text-destructive font-medium">{errors.numero_funcionarios.message}</p>}
      </div>

      <div className="space-y-2">
        <Label className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Quantidade de gestores *</Label>
        <Select value={watch('numero_gestores') || ''} onValueChange={(v) => setValue('numero_gestores', v, { shouldValidate: true })}>
          <SelectTrigger className="bg-muted/10 border-border">
            <SelectValue placeholder="Selecione a quantidade" />
          </SelectTrigger>
          <SelectContent>
            {GESTORES_OPTIONS.map(o => (
              <SelectItem key={o} value={o}>{o}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        {errors.numero_gestores && <p className="text-xs text-destructive font-medium">{errors.numero_gestores.message}</p>}
      </div>
    </div>
  )
}
