import { z } from 'zod'

// Campo numérico digitado e depois apagado chega como "": a coerção o
// converteria em 0, que satisfaz o min(0) e passaria batido. Tratar como não
// informado faz cair na mensagem de campo obrigatório.
const vazioParaIndefinido = (v: unknown) => (v === '' || v === null ? undefined : v)

// Campos dissertativos: mensagem mostra quantos caracteres ainda faltam em vez
// de uma frase fixa, pra pessoa saber o quanto falta digitar.
const minCaracteres = (min: number) =>
  z.string().superRefine((val, ctx) => {
    const faltam = min - val.trim().length
    if (faltam > 0) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: `Faltam ${faltam} caractere${faltam === 1 ? '' : 's'} (mínimo de ${min})`,
      })
    }
  })

export const step1Schema = z.object({
  pais: z.enum(['BR', 'US']).default('BR'),
  nome_completo: z.string().min(3, 'Nome completo é obrigatório'),
  genero: z.string().min(1, 'Selecione o gênero'),
  email: z.string().email('E-mail inválido'),
  data_nascimento: z.string().min(10, 'Data de nascimento é obrigatória'),
  endereco: z.string().min(5, 'Endereço é obrigatório'),
  cep: z.string().min(5, 'CEP/ZIP é obrigatório'),
  whatsapp: z.string().min(10, 'Telefone é obrigatório'),
  estado_civil: z.string().min(1, 'Selecione o estado civil'),
  faixa_etaria: z.string().min(1, 'Selecione a faixa etária'),
  formacao_academica: z.string().min(1, 'Selecione a formação'),
  uf: z.string().min(2, 'Selecione o estado'),
})

export const step2Schema = z.object({
  empresa_nome: z.string().min(2, 'Nome da empresa é obrigatório'),
  nicho: z.string().min(1, 'Selecione o nicho'),
  descricao_negocio: minCaracteres(10),
  site: z.string().optional(),
  instagram: z.string().optional(),
})

export const step3Schema = z.object({
  faturamento_anual: z.preprocess(
    vazioParaIndefinido,
    z.coerce.number({ message: 'Informe o faturamento anual' }).min(0, 'Informe um valor válido'),
  ),
  numero_funcionarios: z.preprocess(
    vazioParaIndefinido,
    z.coerce.number({ message: 'Informe a quantidade' }).int('Use um número inteiro').min(0, 'Informe um valor válido'),
  ),
  numero_gestores: z.preprocess(
    vazioParaIndefinido,
    z.coerce.number({ message: 'Informe a quantidade' }).int('Use um número inteiro').min(0, 'Informe um valor válido'),
  ),
})

export const step4Schema = z.object({
  desafios: minCaracteres(10),
  motivo_nao_superou: minCaracteres(10),
  referencias_posicionamento: z.string().optional(),
  meta_12_meses: z.preprocess(
    vazioParaIndefinido,
    z.coerce.number({ message: 'Informe a meta' }).min(0, 'Informe um valor válido'),
  ),
})

export const step5Schema = z.object({
  expectativas: minCaracteres(10),
  // Campo de linha única (os demais desta etapa são dissertativos e pedem 10):
  // respostas curtas e legítimas como "Preço" precisam passar.
  motivo_impedimento: z.string().min(3, 'Descreva o motivo'),
  como_conheceu: z.string().min(1, 'Selecione como conheceu'),
  motivo_entrada: minCaracteres(10),
  tres_entregas: minCaracteres(10),
  resultado_final: minCaracteres(10),
  expectativa_galdino: minCaracteres(10),
})

export const step6Schema = z.object({
  ia_kpis: z.boolean({ message: 'Responda esta pergunta' }),
  ia_dashboard: z.boolean({ message: 'Responda esta pergunta' }),
  ia_processos: z.boolean({ message: 'Responda esta pergunta' }),
  ia_agentes: z.boolean({ message: 'Responda esta pergunta' }),
  ia_sistema: z.boolean({ message: 'Responda esta pergunta' }),
  ia_interesses: z.array(z.string()).min(1, 'Selecione pelo menos um interesse'),
  ia_outro: z.string().optional(),
})

export const stepSchemas = [step1Schema, step2Schema, step3Schema, step4Schema, step5Schema, step6Schema] as const

export const STEP_TITLES = [
  'Dados do Responsável',
  'Dados do Negócio',
  'Estrutura da Empresa',
  'Diagnóstico Empresarial',
  'Expectativas no PMC',
  'Maturidade em IA',
] as const

export type OnboardingFormData = {
  // Step 1
  pais: 'BR' | 'US'
  nome_completo: string
  genero: string
  email: string
  data_nascimento: string
  endereco: string
  cep: string
  whatsapp: string
  estado_civil: string
  faixa_etaria: string
  formacao_academica: string
  uf: string
  // Step 2
  empresa_nome: string
  nicho: string
  descricao_negocio: string
  site: string
  instagram: string
  // Step 3
  faturamento_anual: string
  numero_funcionarios: string
  numero_gestores: string
  // Step 4
  desafios: string
  motivo_nao_superou: string
  referencias_posicionamento: string
  meta_12_meses: string
  // Step 5
  expectativas: string
  motivo_impedimento: string
  como_conheceu: string
  motivo_entrada: string
  tres_entregas: string
  resultado_final: string
  expectativa_galdino: string
  // Step 6
  ia_kpis: boolean
  ia_dashboard: boolean
  ia_processos: boolean
  ia_agentes: boolean
  ia_sistema: boolean
  ia_interesses: string[]
  ia_outro: string
}
