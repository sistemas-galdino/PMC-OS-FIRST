// Taxonomia única de nichos do PMC. Vale para o onboarding do cliente, o
// cadastro manual de empresa e a classificação dos Estudos de Caso — usar a
// mesma lista nos três é o que permite cruzar "estudos do meu nicho" depois.
export const NICHO_OPTIONS = [
  'Agronegócio', 'Alimentação e Bebidas', 'Automotivo', 'Beleza e Estética',
  'Construção Civil', 'Consultoria', 'E-commerce', 'Educação', 'Energia',
  'Engenharia', 'Entretenimento', 'Finanças', 'Imobiliário', 'Indústria',
  'Jurídico', 'Logística', 'Marketing e Publicidade', 'Moda',
  'Pet', 'Saúde', 'Serviços', 'Tecnologia', 'Turismo', 'Varejo', 'Outro',
] as const

export type Nicho = (typeof NICHO_OPTIONS)[number]
