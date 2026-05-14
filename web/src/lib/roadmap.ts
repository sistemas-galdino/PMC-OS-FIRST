// Tipos e constantes da aba "Roadmap de Sistemas".

export type Fase =
  | "ideacao"
  | "planejamento"
  | "desenvolvimento"
  | "testes"
  | "implantacao"
  | "concluido"

export type Valor = "alto" | "medio" | "baixo"
export type Complexidade = "alta" | "media" | "baixa"
export type StatusGeral = "planejamento" | "em_andamento" | "pausado" | "concluido"

export interface RoadmapLink {
  nome: string
  url: string
}

export interface RoadmapProjeto {
  id: string
  visao_geral: string | null
  objetivo_estrategico: string | null
  status_geral: StatusGeral
  proxima_entrega_data: string | null
  proxima_entrega_descricao: string | null
  created_at: string
  updated_at: string
}

export interface RoadmapItem {
  id: string
  nome: string
  valor: Valor
  complexidade: Complexidade
  fase: Fase
  prazo: string | null
  responsavel: string | null
  observacoes: string | null
  marco_kickoff: boolean
  marco_kickoff_data: string | null
  marco_mvp: boolean
  marco_mvp_data: string | null
  marco_teste: boolean
  marco_teste_data: string | null
  marco_feito: boolean
  marco_feito_data: string | null
  links: RoadmapLink[]
  ordem: number
  created_at: string
  updated_at: string
}

export const FASES: { value: Fase; label: string }[] = [
  { value: "ideacao", label: "Ideação" },
  { value: "planejamento", label: "Planejamento" },
  { value: "desenvolvimento", label: "Desenvolvimento" },
  { value: "testes", label: "Testes" },
  { value: "implantacao", label: "Implantação" },
  { value: "concluido", label: "Concluído" },
]

export const VALORES: { value: Valor; label: string }[] = [
  { value: "alto", label: "Alto" },
  { value: "medio", label: "Médio" },
  { value: "baixo", label: "Baixo" },
]

export const COMPLEXIDADES: { value: Complexidade; label: string }[] = [
  { value: "alta", label: "Alta" },
  { value: "media", label: "Média" },
  { value: "baixa", label: "Baixa" },
]

export const STATUS_GERAL: { value: StatusGeral; label: string }[] = [
  { value: "planejamento", label: "Planejamento" },
  { value: "em_andamento", label: "Em Andamento" },
  { value: "pausado", label: "Pausado" },
  { value: "concluido", label: "Concluído" },
]

export const MARCOS: {
  key: "kickoff" | "mvp" | "teste" | "feito"
  label: string
  doneField: keyof RoadmapItem
  dataField: keyof RoadmapItem
}[] = [
  { key: "kickoff", label: "KickOff", doneField: "marco_kickoff", dataField: "marco_kickoff_data" },
  { key: "mvp", label: "MVP", doneField: "marco_mvp", dataField: "marco_mvp_data" },
  { key: "teste", label: "Teste", doneField: "marco_teste", dataField: "marco_teste_data" },
  { key: "feito", label: "Feito", doneField: "marco_feito", dataField: "marco_feito_data" },
]

const VALOR_SCORE: Record<Valor, number> = { alto: 3, medio: 2, baixo: 1 }
const COMPLEX_SCORE: Record<Complexidade, number> = { alta: 3, media: 2, baixa: 1 }

// Prioridade automática: alto impacto + baixa complexidade sobe no ranking.
export function calcRoi(valor: Valor, complexidade: Complexidade): number {
  return VALOR_SCORE[valor] / COMPLEX_SCORE[complexidade]
}

export function faseLabel(fase: Fase): string {
  return FASES.find(f => f.value === fase)?.label ?? fase
}

export function valorLabel(valor: Valor): string {
  return VALORES.find(v => v.value === valor)?.label ?? valor
}

export function complexidadeLabel(c: Complexidade): string {
  return COMPLEXIDADES.find(x => x.value === c)?.label ?? c
}

export function statusGeralLabel(s: StatusGeral): string {
  return STATUS_GERAL.find(x => x.value === s)?.label ?? s
}

// Classes de badge por fase (identidade do sistema: primary/muted/border).
export const FASE_BADGE: Record<Fase, string> = {
  ideacao: "bg-muted/40 text-muted-foreground border-border",
  planejamento: "bg-primary/5 text-primary border-primary/20",
  desenvolvimento: "bg-primary/10 text-primary border-primary/30",
  testes: "bg-primary/15 text-primary border-primary/40",
  implantacao: "bg-primary/20 text-primary border-primary/50",
  concluido: "bg-primary text-primary-foreground border-primary",
}

export const VALOR_BADGE: Record<Valor, string> = {
  alto: "bg-primary/15 text-primary border-primary/40",
  medio: "bg-primary/5 text-primary border-primary/20",
  baixo: "bg-muted/40 text-muted-foreground border-border",
}
