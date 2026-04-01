import type { UseFormRegister, FieldErrors, UseFormSetValue, UseFormWatch } from "react-hook-form"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import type { OnboardingFormData } from "@/lib/onboarding-schema"

export const NICHO_OPTIONS = [
  'Agronegócio', 'Alimentação e Bebidas', 'Automotivo', 'Beleza e Estética',
  'Construção Civil', 'Consultoria', 'E-commerce', 'Educação', 'Energia',
  'Engenharia', 'Entretenimento', 'Finanças', 'Imobiliário', 'Indústria',
  'Jurídico', 'Logística', 'Marketing e Publicidade', 'Moda',
  'Pet', 'Saúde', 'Serviços', 'Tecnologia', 'Turismo', 'Varejo', 'Outro'
]

interface Props {
  register: UseFormRegister<OnboardingFormData>
  errors: FieldErrors<OnboardingFormData>
  setValue: UseFormSetValue<OnboardingFormData>
  watch: UseFormWatch<OnboardingFormData>
}

export function StepDadosNegocio({ register, errors, setValue, watch }: Props) {
  return (
    <div className="space-y-5">
      <div className="space-y-2">
        <Label className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Nome da empresa *</Label>
        <Input {...register('empresa_nome')} placeholder="Nome da empresa" className="bg-muted/10 border-border" />
        {errors.empresa_nome && <p className="text-xs text-destructive font-medium">{errors.empresa_nome.message}</p>}
      </div>

      <div className="space-y-2">
        <Label className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Nicho de atuação *</Label>
        <Select value={watch('nicho') || ''} onValueChange={(v) => setValue('nicho', v, { shouldValidate: true })}>
          <SelectTrigger className="bg-muted/10 border-border">
            <SelectValue placeholder="Selecione o nicho" />
          </SelectTrigger>
          <SelectContent>
            {NICHO_OPTIONS.map(n => (
              <SelectItem key={n} value={n}>{n}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        {errors.nicho && <p className="text-xs text-destructive font-medium">{errors.nicho.message}</p>}
      </div>

      <div className="space-y-2">
        <Label className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Descreva brevemente seu negócio *</Label>
        <textarea
          {...register('descricao_negocio')}
          placeholder="Conte sobre o que sua empresa faz, quem são seus clientes e como você gera receita..."
          className="w-full min-h-[120px] rounded-md bg-muted/10 border border-border px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30 focus-visible:border-primary/50 resize-y"
        />
        {errors.descricao_negocio && <p className="text-xs text-destructive font-medium">{errors.descricao_negocio.message}</p>}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        <div className="space-y-2">
          <Label className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Site</Label>
          <Input {...register('site')} placeholder="https://seusite.com.br" className="bg-muted/10 border-border" />
        </div>

        <div className="space-y-2">
          <Label className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Instagram</Label>
          <Input {...register('instagram')} placeholder="@suaempresa" className="bg-muted/10 border-border" />
        </div>
      </div>
    </div>
  )
}
