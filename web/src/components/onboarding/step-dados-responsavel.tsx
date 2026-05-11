import type { UseFormRegister, FieldErrors, UseFormSetValue, UseFormWatch } from "react-hook-form"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { maskPhone, maskCEP, maskDate, maskPhoneUS, maskZipUS } from "@/lib/masks"
import type { OnboardingFormData } from "@/lib/onboarding-schema"
import { cn } from "@/lib/utils"

export const UF_OPTIONS = [
  'AC', 'AL', 'AP', 'AM', 'BA', 'CE', 'DF', 'ES', 'GO', 'MA', 'MT', 'MS',
  'MG', 'PA', 'PB', 'PR', 'PE', 'PI', 'RJ', 'RN', 'RS', 'RO', 'RR', 'SC',
  'SP', 'SE', 'TO'
]

export const US_STATES = [
  'AL', 'AK', 'AZ', 'AR', 'CA', 'CO', 'CT', 'DE', 'DC', 'FL', 'GA', 'HI',
  'ID', 'IL', 'IN', 'IA', 'KS', 'KY', 'LA', 'ME', 'MD', 'MA', 'MI', 'MN',
  'MS', 'MO', 'MT', 'NE', 'NV', 'NH', 'NJ', 'NM', 'NY', 'NC', 'ND', 'OH',
  'OK', 'OR', 'PA', 'RI', 'SC', 'SD', 'TN', 'TX', 'UT', 'VT', 'VA', 'WA',
  'WV', 'WI', 'WY'
]

const ESTADO_CIVIL_OPTIONS = ['Solteiro(a)', 'Casado(a)', 'Divorciado(a)', 'Viúvo(a)', 'União Estável']

const FAIXA_ETARIA_OPTIONS = ['18-25', '26-30', '31-35', '36-40', '41-45', '46-50', '51-55', '56-60', '60+']

const FORMACAO_OPTIONS = [
  'Ensino Médio', 'Ensino Técnico', 'Graduação', 'Pós-Graduação',
  'MBA', 'Mestrado', 'Doutorado', 'Outro'
]

interface Props {
  register: UseFormRegister<OnboardingFormData>
  errors: FieldErrors<OnboardingFormData>
  setValue: UseFormSetValue<OnboardingFormData>
  watch: UseFormWatch<OnboardingFormData>
}

export function StepDadosResponsavel({ register, errors, setValue, watch }: Props) {
  const pais = (watch('pais') as 'BR' | 'US') || 'BR'
  const isUS = pais === 'US'
  return (
    <div className="space-y-5">
      <div className="space-y-2">
        <Label className="text-xs font-bold uppercase tracking-widest text-muted-foreground">País *</Label>
        <div className="grid grid-cols-2 gap-3">
          {([
            { value: 'BR' as const, flag: '🇧🇷', label: 'Brasil', sub: 'BRL · R$' },
            { value: 'US' as const, flag: '🇺🇸', label: 'Estados Unidos', sub: 'USD · $' },
          ]).map((opt) => {
            const selected = pais === opt.value
            return (
              <button
                key={opt.value}
                type="button"
                onClick={() => setValue('pais', opt.value, { shouldValidate: true })}
                aria-pressed={selected}
                className={cn(
                  "group relative flex items-center gap-3 rounded-xl border-2 px-4 py-3 text-left transition-all",
                  selected
                    ? "border-primary bg-primary/10 shadow-lg shadow-primary/10"
                    : "border-border bg-muted/10 hover:border-primary/40 hover:bg-muted/20"
                )}
              >
                <span className="text-3xl leading-none" aria-hidden>{opt.flag}</span>
                <span className="flex flex-1 flex-col">
                  <span className={cn("text-sm font-bold", selected ? "text-foreground" : "text-muted-foreground")}>{opt.label}</span>
                  <span className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">{opt.sub}</span>
                </span>
                {selected && (
                  <svg className="size-5 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                )}
              </button>
            )
          })}
        </div>
      </div>

      <div className="space-y-2">
        <Label className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Nome completo do responsável legal *</Label>
        <Input {...register('nome_completo')} placeholder="Nome completo" className="bg-muted/10 border-border" />
        {errors.nome_completo && <p className="text-xs text-destructive font-medium">{errors.nome_completo.message}</p>}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        <div className="space-y-2">
          <Label className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Gênero *</Label>
          <Select value={watch('genero') || ''} onValueChange={(v) => setValue('genero', v, { shouldValidate: true })}>
            <SelectTrigger className="bg-muted/10 border-border">
              <SelectValue placeholder="Selecione" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="Feminino">Feminino</SelectItem>
              <SelectItem value="Masculino">Masculino</SelectItem>
            </SelectContent>
          </Select>
          {errors.genero && <p className="text-xs text-destructive font-medium">{errors.genero.message}</p>}
        </div>

        <div className="space-y-2">
          <Label className="text-xs font-bold uppercase tracking-widest text-muted-foreground">E-mail principal *</Label>
          <Input {...register('email')} type="email" placeholder="seu@email.com" className="bg-muted/10 border-border" />
          {errors.email && <p className="text-xs text-destructive font-medium">{errors.email.message}</p>}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        <div className="space-y-2">
          <Label className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Data de nascimento *</Label>
          <Input
            {...register('data_nascimento')}
            placeholder="DD/MM/AAAA"
            className="bg-muted/10 border-border"
            onChange={(e) => setValue('data_nascimento', maskDate(e.target.value), { shouldValidate: true })}
            value={watch('data_nascimento') || ''}
          />
          {errors.data_nascimento && <p className="text-xs text-destructive font-medium">{errors.data_nascimento.message}</p>}
        </div>

        <div className="space-y-2">
          <Label className="text-xs font-bold uppercase tracking-widest text-muted-foreground">{isUS ? 'Phone *' : 'WhatsApp com DDD *'}</Label>
          <Input
            {...register('whatsapp')}
            placeholder={isUS ? '(123) 456-7890' : '(00) 00000-0000'}
            className="bg-muted/10 border-border"
            onChange={(e) => setValue('whatsapp', (isUS ? maskPhoneUS : maskPhone)(e.target.value), { shouldValidate: true })}
            value={watch('whatsapp') || ''}
          />
          {errors.whatsapp && <p className="text-xs text-destructive font-medium">{errors.whatsapp.message}</p>}
        </div>
      </div>

      <div className="space-y-2">
        <Label className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Endereço completo *</Label>
        <Input
          {...register('endereco')}
          placeholder={isUS ? 'Street, number, city, state' : 'Rua, número, bairro, cidade'}
          className="bg-muted/10 border-border"
        />
        {errors.endereco && <p className="text-xs text-destructive font-medium">{errors.endereco.message}</p>}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        <div className="space-y-2">
          <Label className="text-xs font-bold uppercase tracking-widest text-muted-foreground">{isUS ? 'ZIP code *' : 'CEP *'}</Label>
          <Input
            {...register('cep')}
            placeholder={isUS ? '12345' : '00000-000'}
            className="bg-muted/10 border-border"
            onChange={(e) => setValue('cep', (isUS ? maskZipUS : maskCEP)(e.target.value), { shouldValidate: true })}
            value={watch('cep') || ''}
          />
          {errors.cep && <p className="text-xs text-destructive font-medium">{errors.cep.message}</p>}
        </div>

        <div className="space-y-2">
          <Label className="text-xs font-bold uppercase tracking-widest text-muted-foreground">{isUS ? 'State *' : 'Estado (UF) *'}</Label>
          <Select value={watch('uf') || ''} onValueChange={(v) => setValue('uf', v, { shouldValidate: true })}>
            <SelectTrigger className="bg-muted/10 border-border">
              <SelectValue placeholder="Selecione" />
            </SelectTrigger>
            <SelectContent>
              {(isUS ? US_STATES : UF_OPTIONS).map(uf => (
                <SelectItem key={uf} value={uf}>{uf}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          {errors.uf && <p className="text-xs text-destructive font-medium">{errors.uf.message}</p>}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        <div className="space-y-2">
          <Label className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Estado civil *</Label>
          <Select value={watch('estado_civil') || ''} onValueChange={(v) => setValue('estado_civil', v, { shouldValidate: true })}>
            <SelectTrigger className="bg-muted/10 border-border">
              <SelectValue placeholder="Selecione" />
            </SelectTrigger>
            <SelectContent>
              {ESTADO_CIVIL_OPTIONS.map(o => (
                <SelectItem key={o} value={o}>{o}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          {errors.estado_civil && <p className="text-xs text-destructive font-medium">{errors.estado_civil.message}</p>}
        </div>

        <div className="space-y-2">
          <Label className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Faixa etária *</Label>
          <Select value={watch('faixa_etaria') || ''} onValueChange={(v) => setValue('faixa_etaria', v, { shouldValidate: true })}>
            <SelectTrigger className="bg-muted/10 border-border">
              <SelectValue placeholder="Selecione" />
            </SelectTrigger>
            <SelectContent>
              {FAIXA_ETARIA_OPTIONS.map(o => (
                <SelectItem key={o} value={o}>{o}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          {errors.faixa_etaria && <p className="text-xs text-destructive font-medium">{errors.faixa_etaria.message}</p>}
        </div>

        <div className="space-y-2">
          <Label className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Formação *</Label>
          <Select value={watch('formacao_academica') || ''} onValueChange={(v) => setValue('formacao_academica', v, { shouldValidate: true })}>
            <SelectTrigger className="bg-muted/10 border-border">
              <SelectValue placeholder="Selecione" />
            </SelectTrigger>
            <SelectContent>
              {FORMACAO_OPTIONS.map(o => (
                <SelectItem key={o} value={o}>{o}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          {errors.formacao_academica && <p className="text-xs text-destructive font-medium">{errors.formacao_academica.message}</p>}
        </div>
      </div>
    </div>
  )
}
