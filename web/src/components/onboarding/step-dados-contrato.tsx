import type { UseFormRegister, FieldErrors, UseFormSetValue, UseFormWatch } from "react-hook-form"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { maskCPF, maskCNPJ, maskPhone } from "@/lib/masks"
import type { OnboardingFormData } from "@/lib/onboarding-schema"

interface Props {
  register: UseFormRegister<OnboardingFormData>
  errors: FieldErrors<OnboardingFormData>
  setValue: UseFormSetValue<OnboardingFormData>
  watch: UseFormWatch<OnboardingFormData>
}

export function StepDadosContrato({ register, errors, setValue, watch }: Props) {
  const tipoPessoa = watch('tipo_pessoa')

  return (
    <div className="space-y-5">
      {/* PF / PJ Toggle */}
      <div className="space-y-2">
        <Label className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Contrato emitido em nome de: *</Label>
        <div className="flex gap-3">
          <button
            type="button"
            onClick={() => setValue('tipo_pessoa', 'PF', { shouldValidate: true })}
            className={`flex-1 py-3 rounded-xl border text-sm font-bold transition-all ${
              tipoPessoa === 'PF'
                ? 'bg-primary/10 border-primary/50 text-primary'
                : 'bg-muted/10 border-border text-muted-foreground hover:border-primary/30'
            }`}
          >
            Pessoa Física
          </button>
          <button
            type="button"
            onClick={() => setValue('tipo_pessoa', 'PJ', { shouldValidate: true })}
            className={`flex-1 py-3 rounded-xl border text-sm font-bold transition-all ${
              tipoPessoa === 'PJ'
                ? 'bg-primary/10 border-primary/50 text-primary'
                : 'bg-muted/10 border-border text-muted-foreground hover:border-primary/30'
            }`}
          >
            Pessoa Jurídica
          </button>
        </div>
        {errors.tipo_pessoa && <p className="text-xs text-destructive font-medium">{errors.tipo_pessoa.message}</p>}
      </div>

      {/* Conditional: PJ fields */}
      {tipoPessoa === 'PJ' && (
        <>
          <div className="space-y-2">
            <Label className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Razão Social *</Label>
            <Input {...register('razao_social')} placeholder="Razão Social da empresa" className="bg-muted/10 border-border" />
            {errors.razao_social && <p className="text-xs text-destructive font-medium">{errors.razao_social.message}</p>}
          </div>

          <div className="space-y-2">
            <Label className="text-xs font-bold uppercase tracking-widest text-muted-foreground">CNPJ *</Label>
            <Input
              {...register('cnpj')}
              placeholder="00.000.000/0000-00"
              className="bg-muted/10 border-border"
              onChange={(e) => setValue('cnpj', maskCNPJ(e.target.value), { shouldValidate: true })}
              value={watch('cnpj') || ''}
            />
            {errors.cnpj && <p className="text-xs text-destructive font-medium">{errors.cnpj.message}</p>}
          </div>
        </>
      )}

      {/* CPF - required for PF, optional for PJ */}
      <div className="space-y-2">
        <Label className="text-xs font-bold uppercase tracking-widest text-muted-foreground">
          CPF {tipoPessoa === 'PF' ? '*' : '(opcional)'}
        </Label>
        <Input
          {...register('cpf')}
          placeholder="000.000.000-00"
          className="bg-muted/10 border-border"
          onChange={(e) => setValue('cpf', maskCPF(e.target.value), { shouldValidate: true })}
          value={watch('cpf') || ''}
        />
        {errors.cpf && <p className="text-xs text-destructive font-medium">{errors.cpf.message}</p>}
      </div>

      <div className="space-y-2">
        <Label className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Nacionalidade *</Label>
        <Input {...register('nacionalidade')} placeholder="Brasileira" className="bg-muted/10 border-border" />
        {errors.nacionalidade && <p className="text-xs text-destructive font-medium">{errors.nacionalidade.message}</p>}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        <div className="space-y-2">
          <Label className="text-xs font-bold uppercase tracking-widest text-muted-foreground">E-mail do representante legal *</Label>
          <Input {...register('email_representante')} type="email" placeholder="representante@email.com" className="bg-muted/10 border-border" />
          {errors.email_representante && <p className="text-xs text-destructive font-medium">{errors.email_representante.message}</p>}
        </div>

        <div className="space-y-2">
          <Label className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Telefone do representante *</Label>
          <Input
            {...register('telefone_representante')}
            placeholder="(00) 00000-0000"
            className="bg-muted/10 border-border"
            onChange={(e) => setValue('telefone_representante', maskPhone(e.target.value), { shouldValidate: true })}
            value={watch('telefone_representante') || ''}
          />
          {errors.telefone_representante && <p className="text-xs text-destructive font-medium">{errors.telefone_representante.message}</p>}
        </div>
      </div>

      <div className="space-y-2">
        <Label className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Profissão *</Label>
        <Input {...register('profissao')} placeholder="Sua profissão" className="bg-muted/10 border-border" />
        {errors.profissao && <p className="text-xs text-destructive font-medium">{errors.profissao.message}</p>}
      </div>
    </div>
  )
}
