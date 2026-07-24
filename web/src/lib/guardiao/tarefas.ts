// Camada de operação do Guardião — Tarefas + Rotinas/Rituais.
// Tipos, constantes (rótulos/opções) e CRUD sobre metodo_tarefas.
// As 4 cadências (ROTINAS) são fixas: definem checklist, perguntas e entregas.
import { supabase } from "@/lib/supabase"

export interface Tarefa {
  id: string
  id_cliente: string
  titulo: string
  setor: string | null
  projeto: string | null
  responsavel: string | null
  prazo: string | null // date (YYYY-MM-DD)
  prioridade: string
  status: string
  tipo: string | null
  origem: string
  tipo_rotina: string
  bloqueio: string | null
  ref_nome: string | null
  ref_link: string | null
  observacoes: string | null
  created_at: string
  updated_at: string
}

export type TarefaInput = Partial<Omit<Tarefa, "id" | "id_cliente" | "created_at" | "updated_at">> & {
  titulo: string
}

// ---- Opções / rótulos --------------------------------------------------------

export const PRIORIDADES = [
  { chave: "baixa", label: "Baixa" },
  { chave: "media", label: "Média" },
  { chave: "alta", label: "Alta" },
] as const

export const STATUSES = [
  { chave: "a_fazer", label: "A fazer" },
  { chave: "em_andamento", label: "Em andamento" },
  { chave: "concluido", label: "Concluído" },
] as const

export const TIPOS = [
  { chave: "acompanhamento", label: "Acompanhamento" },
  { chave: "projeto", label: "Projeto" },
  { chave: "melhoria", label: "Melhoria" },
  { chave: "correcao", label: "Correção" },
  { chave: "outro", label: "Outro" },
] as const

export const ORIGENS = [
  { chave: "rotina_diaria", label: "Rotina diária" },
  { chave: "rotina_semanal", label: "Rotina semanal" },
  { chave: "rotina_quinzenal", label: "Rotina quinzenal" },
  { chave: "rotina_mensal", label: "Rotina mensal" },
  { chave: "projeto", label: "Projeto" },
  { chave: "reuniao", label: "Reunião" },
  { chave: "avulsa", label: "Avulsa" },
] as const

export const TIPOS_ROTINA = [
  { chave: "nao_se_aplica", label: "Não se aplica" },
  { chave: "diaria", label: "Diária" },
  { chave: "semanal", label: "Semanal" },
  { chave: "quinzenal", label: "Quinzenal" },
  { chave: "mensal", label: "Mensal" },
] as const

const label = (opts: readonly { chave: string; label: string }[]) =>
  Object.fromEntries(opts.map((o) => [o.chave, o.label])) as Record<string, string>

export const PRIORIDADE_LABEL = label(PRIORIDADES)
export const STATUS_LABEL = label(STATUSES)
export const TIPO_LABEL = label(TIPOS)
export const ORIGEM_LABEL = label(ORIGENS)
export const TIPO_ROTINA_LABEL = label(TIPOS_ROTINA)

// Cor por prioridade/status (classes tailwind já usadas no design system)
export const PRIORIDADE_COR: Record<string, string> = {
  baixa: "text-muted-foreground border-border",
  media: "text-amber-400 border-amber-400/30",
  alta: "text-rose-400 border-rose-400/30",
}
export const STATUS_COR: Record<string, string> = {
  a_fazer: "text-muted-foreground border-border",
  em_andamento: "text-primary border-primary/30",
  concluido: "text-emerald-400 border-emerald-400/30",
}

// ---- Rotinas & Rituais (conteúdo fixo das 4 cadências) -----------------------

export interface Cadencia {
  origem: string // chave em ORIGENS (rotina_*)
  tipoRotina: string // chave em TIPOS_ROTINA
  titulo: string
  descricao: string
  checklist: string[]
  perguntasTitulo: string
  perguntas: string[]
}

export const ROTINAS: Cadencia[] = [
  {
    origem: "rotina_diaria",
    tipoRotina: "diaria",
    titulo: "Rotina Diária",
    descricao: "Manter a máquina rodando, identificar travas e acompanhar o uso da IA nos setores.",
    checklist: [
      "Checar automações do dia anterior",
      "Verificar dados atualizados",
      "Identificar travas do dia",
      "Falar com líderes prioritários",
      "Atualizar status dos projetos",
      "Registrar aprendizados",
      "Fazer o cheque rápido com as lideranças",
    ],
    perguntasTitulo: "Perguntas obrigatórias",
    perguntas: ["O que a IA fez ontem?", "O que será aplicado hoje?", "Onde travou?"],
  },
  {
    origem: "rotina_semanal",
    tipoRotina: "semanal",
    titulo: "Rotina Semanal",
    descricao: "Transformar gargalos da semana em projetos, testes, prompts, fluxos ou sistemas.",
    checklist: [
      "Realizar reunião com líder do setor",
      "Mapear maior perda de tempo da semana",
      "Identificar processo repetitivo",
      "Transformar gargalo em projeto",
      "Atualizar tarefas",
      "Validar próximos passos",
      "Preparar resumo para o CEO",
    ],
    perguntasTitulo: "Entrega semanal",
    perguntas: [
      "Gargalos identificados",
      "Projetos em andamento",
      "Sistemas sugeridos",
      "Resultados iniciais",
      "Travamentos que precisam de decisão",
    ],
  },
  {
    origem: "rotina_quinzenal",
    tipoRotina: "quinzenal",
    titulo: "Rotina Quinzenal",
    descricao: "Disseminar boas práticas, apresentar resultados e reforçar a cultura de IA com os líderes.",
    checklist: [
      "Reunir líderes ou setores envolvidos",
      "Apresentar boas práticas de IA",
      "Mostrar sistemas ou automações criadas",
      "Compartilhar aprendizados",
      "Levantar resistências do time",
      "Escolher próximo setor piloto",
      "Atualizar plano de implementação",
    ],
    perguntasTitulo: "Entrega quinzenal",
    perguntas: [
      "Workshop prático de resultados",
      "Exemplos reais aplicados",
      "Próximas oportunidades de IA por setor",
    ],
  },
  {
    origem: "rotina_mensal",
    tipoRotina: "mensal",
    titulo: "Rotina Mensal",
    descricao: "Medir resultados, diagnosticar evolução e recalibrar metas com o CEO ou diretoria.",
    checklist: [
      "Consolidar resultados do mês",
      "Medir horas economizadas",
      "Medir automações implantadas",
      "Medir sistemas criados",
      "Avaliar gargalos resolvidos",
      "Apresentar relatório mensal para CEO",
      "Recalibrar metas",
      "Definir próximos setores",
    ],
    perguntasTitulo: "Entrega mensal",
    perguntas: [
      "Diagnóstico de evolução da IA",
      "Relatório para CEO",
      "Próximos projetos pilotos",
      "Plano de expansão por setor",
    ],
  },
]

// ---- CRUD --------------------------------------------------------------------

export async function listarTarefas(clientId: string): Promise<Tarefa[]> {
  const { data, error } = await supabase
    .from("metodo_tarefas")
    .select("*")
    .eq("id_cliente", clientId)
    .order("created_at", { ascending: false })
  if (error) throw error
  return (data ?? []) as Tarefa[]
}

export async function criarTarefa(clientId: string, input: TarefaInput): Promise<Tarefa> {
  const { data, error } = await supabase
    .from("metodo_tarefas")
    .insert({ ...limpar(input), id_cliente: clientId })
    .select("*")
    .single()
  if (error) throw error
  return data as Tarefa
}

export async function atualizarTarefa(id: string, patch: Partial<TarefaInput>): Promise<void> {
  const { error } = await supabase
    .from("metodo_tarefas")
    .update({ ...limpar(patch), updated_at: new Date().toISOString() })
    .eq("id", id)
  if (error) throw error
}

export async function excluirTarefa(id: string): Promise<void> {
  const { error } = await supabase.from("metodo_tarefas").delete().eq("id", id)
  if (error) throw error
}

// Normaliza strings vazias em null (colunas nullable), preservando os campos not-null.
function limpar<T extends Record<string, any>>(obj: T): T {
  const out: Record<string, any> = {}
  for (const [k, v] of Object.entries(obj)) {
    out[k] = typeof v === "string" && v.trim() === "" ? null : v
  }
  return out as T
}

// Fontes para os selects de contexto (Setor ← metodo_areas; Projeto ← metodo_sistemas)
export async function fontesContexto(clientId: string): Promise<{ setores: string[]; projetos: string[] }> {
  const [{ data: areas }, { data: sistemas }] = await Promise.all([
    supabase.from("metodo_areas").select("nome").eq("id_cliente", clientId).order("nome"),
    supabase.from("metodo_sistemas").select("nome").eq("id_cliente", clientId).order("nome"),
  ])
  const uniq = (arr: (string | null)[]) => [...new Set(arr.filter((x): x is string => !!x && x.trim() !== ""))]
  return { setores: uniq((areas ?? []).map((a) => a.nome)), projetos: uniq((sistemas ?? []).map((s) => s.nome)) }
}
