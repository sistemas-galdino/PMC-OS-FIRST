// Tipos e helpers da Vitrine de Cases (segmento "Vitórias dos Clientes").
//
// Duas regras editoriais herdadas do sistema original e que NÃO podem ser
// afrouxadas sem pedido explícito:
//  1. "nicho do cliente" (setor da empresa) e "área impactada" (área do negócio
//     que o case transformou) são coisas diferentes. Nunca fundir os dois nem
//     substituir um pelo outro — os dois filtros ficam visíveis.
//  2. PENDENTE_VALIDACAO é marcador interno. Nunca aparece na tela, em filtro
//     ou como texto editorial.

export const SENTINELA = ['PENDENTE_VALIDACAO', 'N/A', 'NA', 'Sem site']

/** Texto que pode ir pra tela, ou null se for vazio/marcador interno. */
export function exibivel(v: string | null | undefined): string | null {
  if (!v) return null
  const t = v.trim()
  return !t || SENTINELA.includes(t) ? null : t
}

export function listaExibivel(v: string[] | null | undefined): string[] {
  return (v ?? []).map(exibivel).filter((x): x is string => Boolean(x))
}

export type VitrineCliente = {
  id: string
  id_cliente: string | null
  codigo_cliente: number | null
  empresa_nome: string
  cliente_nome: string | null
  nicho: string | null
  subnicho: string | null
  cs_responsavel: string | null
  consultor_responsavel: string | null
  site: string | null
  instagram: string | null
  logo_path: string | null
  logo_display_path: string | null
  logo_status: string
  logo_origem: string | null
  vinculo_status: 'vinculado' | 'pendente' | 'ignorado'
  vinculo_metodo: string | null
  vinculo_candidatos: string | null
  status_cliente: string | null
  observacoes: string | null
  origem_legado_uuid: string | null
}

export type VitrineCase = {
  id: string
  case_id: string
  vitrine_cliente_id: string
  id_cliente: string | null
  codigo_cliente: number | null
  empresa_nome: string | null
  headline_impacto: string | null
  headline_vitrine: string | null
  headline_curta: string | null
  categoria: string | null
  foco_ia: boolean
  ferramenta_card: string | null
  ferramenta_ia: string | null
  resumo_executivo: string | null
  como_era_antes: string | null
  principais_gargalos: string[]
  como_ficou_depois: string | null
  o_que_pmc_transformou: string | null
  principais_ganhos: string[]
  solucao_criada: string | null
  processo_atual: string | null
  resultado_principal: string | null
  status_implementacao: string | null
  status_publicacao: string
  aprovado_vitrine: boolean
  destaque: boolean
  ordem_vitrine: number | null
  arquivado: boolean
  capa_url: string | null
  palavras_chave: string[]
  observacoes: string | null
}

/** Linha da view vitrine_showcase (case + cliente, só o que pode aparecer). */
export type ShowcaseCase = {
  case_id: string
  vitrine_case_id: string
  vitrine_cliente_id: string
  id_cliente: string | null
  codigo_cliente: number | null
  empresa_nome: string
  cliente_nome: string | null
  nicho: string | null
  subnicho: string | null
  cs_responsavel: string | null
  logo_path: string | null
  logo_display_path: string | null
  categoria: string | null
  foco_ia: boolean
  ferramenta_card: string | null
  headline_impacto: string | null
  headline_vitrine: string | null
  resumo_executivo: string | null
  como_era_antes: string | null
  principais_gargalos: string[]
  como_ficou_depois: string | null
  o_que_pmc_transformou: string | null
  principais_ganhos: string[]
  solucao_criada: string | null
  processo_atual: string | null
  resultado_principal: string | null
  capa_url: string | null
  palavras_chave: string[]
  destaque: boolean
  ordem_vitrine: number | null
}

export type VitrineEvidencia = {
  id: string
  vitrine_case_id: string
  tipo: 'print' | 'link' | 'video' | 'documento'
  arquivo_path: string | null
  url_externa: string | null
  legenda: string | null
  principal: boolean
  aprovada: boolean
  dados_sensiveis_verificados: boolean
  created_at: string
}

export type VitrineCaptura = {
  id: string
  vitrine_case_id: string
  cs_responsavel: string | null
  reuniao_mencionada: string | null
  mentor_consultor: string | null
  gravacao_url: string | null
  o_que_capturar: string | null
  minuto_exato: string | null
  trecho_para_localizar: string | null
  dados_a_ocultar: string | null
  legenda_sugerida: string | null
  status: string
}

export type VitrineOportunidade = {
  id: string
  vitrine_cliente_id: string | null
  id_cliente: string | null
  empresa_nome: string | null
  descricao_projeto: string | null
  status_atual: string | null
  resultado_esperado: string | null
  reuniao_nome: string | null
  reuniao_data: string | null
  gravacao_url: string | null
  proxima_validacao: string | null
  cs_responsavel: string | null
  observacoes: string | null
}

/**
 * Resolve a URL da logo. Caminho começando com '/' é arquivo estático do app
 * (o acervo importado do sistema antigo); qualquer outro é objeto no bucket
 * público vitrine-logos (upload feito pela tela).
 * Prefere a cópia de display: ela tem margem recortada e encaixe uniforme.
 */
export function urlLogo(
  cliente: Pick<VitrineCliente, 'logo_path' | 'logo_display_path'>,
  urlBucket: (path: string) => string
): string | null {
  const p = cliente.logo_display_path || cliente.logo_path
  if (!p) return null
  return p.startsWith('/') ? p : urlBucket(p)
}

const PALAVRAS_IGNORADAS = new Set([
  'de', 'da', 'do', 'das', 'dos', 'e', 'ltda', 'sa', 's.a', 'me', 'eireli', 'epp', 'the',
])

/** Iniciais pra quando não há logo. Marcas curtas (≤4) usam a palavra inteira. */
export function iniciais(nome: string): string {
  const palavras = nome
    .replace(/[^\p{L}\p{N}\s]/gu, ' ')
    .split(/\s+/)
    .filter((p) => p && !PALAVRAS_IGNORADAS.has(p.toLowerCase()))
  if (!palavras.length) return nome.slice(0, 2).toUpperCase()
  if (palavras.length === 1) {
    const p = palavras[0]
    return (p.length <= 4 ? p : p.slice(0, 2)).toUpperCase()
  }
  return (palavras[0][0] + palavras[1][0]).toUpperCase()
}

/** Empresa em caixa alta; nome de pessoa preserva a capitalização original. */
export const nomeEmpresa = (v: string) => v.toUpperCase()

/**
 * Ordem da vitrine: destaque primeiro, depois ordem_vitrine (nulls no fim),
 * depois alfabética. Mesma regra do sistema original.
 */
export function ordenarVitrine<T extends { destaque: boolean; ordem_vitrine: number | null; empresa_nome: string }>(
  cases: T[]
): T[] {
  return [...cases].sort((a, b) => {
    if (a.destaque !== b.destaque) return a.destaque ? -1 : 1
    const oa = a.ordem_vitrine ?? Number.MAX_SAFE_INTEGER
    const ob = b.ordem_vitrine ?? Number.MAX_SAFE_INTEGER
    if (oa !== ob) return oa - ob
    return a.empresa_nome.localeCompare(b.empresa_nome, 'pt-BR')
  })
}

/** Opções de um filtro, já sem marcador interno e ordenadas. */
export function opcoesFiltro(valores: (string | null)[]): string[] {
  return [...new Set(valores.map(exibivel).filter((x): x is string => Boolean(x)))].sort((a, b) =>
    a.localeCompare(b, 'pt-BR')
  )
}

export function normalizar(v: string): string {
  return v.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim()
}
