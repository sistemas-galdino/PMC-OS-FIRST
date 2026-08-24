// Fonte única do que conta como "pergunta respondida" no onboarding.
//
// Existe porque `status='enviado'` não garante formulário completo: a validação
// por etapa só foi ativada em 2026-07-31 (commit 457ba2c), então a maioria das
// respostas antigas foi enviada com buracos, e o banco não tem NOT NULL nem
// CHECK em nenhuma coluna de resposta.
//
// Espelha os schemas de `onboarding-schema.ts` — só entram aqui os campos que o
// zod exige. Ficam de fora os opcionais (site, instagram,
// referencias_posicionamento, ia_outro), o `pais` (NOT NULL DEFAULT 'BR') e as
// colunas da etapa "Dados para Contrato", removida do formulário em 00127c5
// (tipo_pessoa, cpf, cnpj, razao_social, nacionalidade, profissao,
// email_representante, telefone_representante) — elas são nulas em quase todo
// mundo e não são pergunta em aberto. Mesmo caso de `motivo_impedimento`
// ("principal motivo que poderia ter impedido a entrada"), retirada do
// formulário em 2026-08-24: a coluna e as respostas antigas continuam no banco,
// mas ninguém mais responde, então não pode contar como lacuna.

export interface CampoObrigatorio {
  key: string
  label: string
  /** Etapa do formulário (1 a 6), pra mandar o cliente direto ao buraco. */
  etapa: number
  /** `false` é resposta válida em booleano; array vazio não é resposta. */
  tipo: "texto" | "boolean" | "array"
}

// Rótulos idênticos aos de STEP_FIELDS em respostas-onboarding.tsx, pro admin
// ler a mesma pergunta nos dois lugares.
export const CAMPOS_OBRIGATORIOS: CampoObrigatorio[] = [
  { key: "nome_completo", label: "Nome Completo", etapa: 1, tipo: "texto" },
  { key: "genero", label: "Gênero", etapa: 1, tipo: "texto" },
  { key: "email", label: "E-mail", etapa: 1, tipo: "texto" },
  { key: "data_nascimento", label: "Data de Nascimento", etapa: 1, tipo: "texto" },
  { key: "whatsapp", label: "WhatsApp / Telefone", etapa: 1, tipo: "texto" },
  { key: "endereco", label: "Endereço", etapa: 1, tipo: "texto" },
  { key: "cep", label: "CEP / ZIP", etapa: 1, tipo: "texto" },
  { key: "uf", label: "Estado (UF)", etapa: 1, tipo: "texto" },
  { key: "estado_civil", label: "Estado Civil", etapa: 1, tipo: "texto" },
  { key: "faixa_etaria", label: "Faixa Etária", etapa: 1, tipo: "texto" },
  { key: "formacao_academica", label: "Formação Acadêmica", etapa: 1, tipo: "texto" },

  { key: "empresa_nome", label: "Empresa", etapa: 2, tipo: "texto" },
  { key: "nicho", label: "Nicho", etapa: 2, tipo: "texto" },
  { key: "descricao_negocio", label: "Descrição do Negócio", etapa: 2, tipo: "texto" },

  { key: "faturamento_anual", label: "Faturamento Anual", etapa: 3, tipo: "texto" },
  { key: "numero_funcionarios", label: "Nº de Funcionários", etapa: 3, tipo: "texto" },
  { key: "numero_gestores", label: "Nº de Gestores", etapa: 3, tipo: "texto" },

  { key: "desafios", label: "2 Principais Desafios", etapa: 4, tipo: "texto" },
  { key: "motivo_nao_superou", label: "Por que ainda não superou", etapa: 4, tipo: "texto" },
  { key: "meta_12_meses", label: "Meta de Faturamento 12m", etapa: 4, tipo: "texto" },

  { key: "expectativas", label: "Expectativas ao Entrar", etapa: 5, tipo: "texto" },
  { key: "como_conheceu", label: "Como Conheceu o PMC", etapa: 5, tipo: "texto" },
  { key: "motivo_entrada", label: "Por que Decidiu Entrar", etapa: 5, tipo: "texto" },
  { key: "tres_entregas", label: "3 Entregas Mais Importantes", etapa: 5, tipo: "texto" },
  { key: "resultado_final", label: "Resultado Final Desejado", etapa: 5, tipo: "texto" },
  { key: "expectativa_galdino", label: "O que Espera do Galdino (3m)", etapa: 5, tipo: "texto" },

  { key: "ia_kpis", label: "Usa IA para KPIs?", etapa: 6, tipo: "boolean" },
  { key: "ia_dashboard", label: "Usa IA em Dashboards?", etapa: 6, tipo: "boolean" },
  { key: "ia_processos", label: "Processos mapeados com IA?", etapa: 6, tipo: "boolean" },
  { key: "ia_agentes", label: "Usa Agentes de IA?", etapa: 6, tipo: "boolean" },
  { key: "ia_sistema", label: "Sistemas integrados com IA?", etapa: 6, tipo: "boolean" },
  { key: "ia_interesses", label: "Conteúdos de Interesse", etapa: 6, tipo: "array" },
]

/** Shape mínimo aceito: qualquer objeto com as colunas de `cliente_onboarding`. */
export type RespostasOnboarding = Record<string, unknown>

function respondeu(valor: unknown, tipo: CampoObrigatorio["tipo"]): boolean {
  if (valor === null || valor === undefined) return false
  // "Não" é resposta: só null/undefined significa pergunta em branco.
  if (tipo === "boolean") return typeof valor === "boolean"
  if (tipo === "array") return Array.isArray(valor) && valor.length > 0
  return String(valor).trim() !== ""
}

/** Perguntas obrigatórias que ficaram em branco, na ordem do formulário. */
export function camposFaltando(row: RespostasOnboarding): CampoObrigatorio[] {
  return CAMPOS_OBRIGATORIOS.filter((c) => !respondeu(row[c.key], c.tipo))
}

/** Etapas (1-6) com pelo menos uma pergunta em branco, em ordem crescente. */
export function etapasFaltando(row: RespostasOnboarding): number[] {
  const etapas = new Set(camposFaltando(row).map((c) => c.etapa))
  return [...etapas].sort((a, b) => a - b)
}

/** Chaves das perguntas em branco — útil pra saber o que mudou na revisão. */
export function chavesFaltando(row: RespostasOnboarding): Set<string> {
  return new Set(camposFaltando(row).map((c) => c.key))
}

/** Rota que o cliente abre pra completar o que ficou em branco. */
export const LINK_REVISAO_ONBOARDING = "/cadastro?revisar=1"
