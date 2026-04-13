import { z } from 'zod'

export const step1Schema = z.object({
  nome_completo: z.string().min(3, 'Nome completo é obrigatório'),
  genero: z.string().min(1, 'Selecione o gênero'),
  email: z.string().email('E-mail inválido'),
  data_nascimento: z.string().min(10, 'Data de nascimento é obrigatória'),
  endereco: z.string().min(5, 'Endereço é obrigatório'),
  cep: z.string().min(9, 'CEP é obrigatório'),
  whatsapp: z.string().min(14, 'WhatsApp é obrigatório'),
  estado_civil: z.string().min(1, 'Selecione o estado civil'),
  faixa_etaria: z.string().min(1, 'Selecione a faixa etária'),
  formacao_academica: z.string().min(1, 'Selecione a formação'),
  uf: z.string().min(2, 'Selecione o estado'),
})

export const step2Schema = z.object({
  empresa_nome: z.string().min(2, 'Nome da empresa é obrigatório'),
  nicho: z.string().min(1, 'Selecione o nicho'),
  descricao_negocio: z.string().min(10, 'Descreva brevemente seu negócio'),
  site: z.string().optional(),
  instagram: z.string().optional(),
})

export const step3Schema = z.object({
  faturamento_anual: z.coerce.number({ message: 'Informe o faturamento anual' }).min(0, 'Informe um valor válido'),
  numero_funcionarios: z.coerce.number({ message: 'Informe a quantidade' }).int('Use um número inteiro').min(0, 'Informe um valor válido'),
  numero_gestores: z.coerce.number({ message: 'Informe a quantidade' }).int('Use um número inteiro').min(0, 'Informe um valor válido'),
})

export const step4Schema = z.object({
  desafios: z.string().min(10, 'Descreva os desafios'),
  motivo_nao_superou: z.string().min(10, 'Descreva o motivo'),
  referencias_posicionamento: z.string().optional(),
  meta_12_meses: z.string().min(1, 'Informe a meta'),
})

export const step5Schema = z.object({
  expectativas: z.string().min(10, 'Descreva suas expectativas'),
  motivo_impedimento: z.string().optional(),
  como_conheceu: z.string().min(1, 'Selecione como conheceu'),
  motivo_entrada: z.string().min(10, 'Descreva o motivo'),
  tres_entregas: z.string().min(10, 'Descreva as 3 entregas'),
  resultado_final: z.string().min(10, 'Descreva o resultado'),
  expectativa_galdino: z.string().min(10, 'Descreva o que espera'),
})

export const step6Schema = z.object({
  tipo_pessoa: z.enum(['PF', 'PJ'], { message: 'Selecione PF ou PJ' }),
  razao_social: z.string().optional(),
  nacionalidade: z.string().min(2, 'Nacionalidade é obrigatória'),
  email_representante: z.string().email('E-mail inválido'),
  telefone_representante: z.string().min(14, 'Telefone é obrigatório'),
  profissao: z.string().min(2, 'Profissão é obrigatória'),
  cpf: z.string().optional(),
  cnpj: z.string().optional(),
}).superRefine((data, ctx) => {
  if (data.tipo_pessoa === 'PF' && (!data.cpf || data.cpf.length < 14)) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'CPF é obrigatório para Pessoa Física', path: ['cpf'] })
  }
  if (data.tipo_pessoa === 'PJ') {
    if (!data.cnpj || data.cnpj.length < 18) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'CNPJ é obrigatório para Pessoa Jurídica', path: ['cnpj'] })
    }
    if (!data.razao_social || data.razao_social.length < 2) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'Razão Social é obrigatória para Pessoa Jurídica', path: ['razao_social'] })
    }
  }
})

export const step7Schema = z.object({
  ia_kpis: z.boolean({ message: 'Responda esta pergunta' }),
  ia_dashboard: z.boolean({ message: 'Responda esta pergunta' }),
  ia_processos: z.boolean({ message: 'Responda esta pergunta' }),
  ia_agentes: z.boolean({ message: 'Responda esta pergunta' }),
  ia_sistema: z.boolean({ message: 'Responda esta pergunta' }),
  ia_interesses: z.array(z.string()).min(1, 'Selecione pelo menos um interesse'),
  ia_outro: z.string().optional(),
})

export const stepSchemas = [step1Schema, step2Schema, step3Schema, step4Schema, step5Schema, step6Schema, step7Schema] as const

export const STEP_TITLES = [
  'Dados do Responsável',
  'Dados do Negócio',
  'Estrutura da Empresa',
  'Diagnóstico Empresarial',
  'Expectativas no PMC',
  'Dados para Contrato',
  'Maturidade em IA',
] as const

export type OnboardingFormData = {
  // Step 1
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
  tipo_pessoa: 'PF' | 'PJ'
  razao_social: string
  nacionalidade: string
  email_representante: string
  telefone_representante: string
  profissao: string
  cpf: string
  cnpj: string
  // Step 7
  ia_kpis: boolean
  ia_dashboard: boolean
  ia_processos: boolean
  ia_agentes: boolean
  ia_sistema: boolean
  ia_interesses: string[]
  ia_outro: string
}
