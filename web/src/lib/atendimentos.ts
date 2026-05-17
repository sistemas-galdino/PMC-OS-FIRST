export const TABELAS_REUNIAO = ["reunioes_galdino", "reunioes_mentoria_new", "reunioes_blackcrm"] as const
export type TabelaDestino = (typeof TABELAS_REUNIAO)[number]

export const STATUS_AGENDAMENTO = ["pendente_sync", "confirmado", "cancelado", "realizado"] as const
export type StatusAgendamento = (typeof STATUS_AGENDAMENTO)[number]

export const DIAS_SEMANA = [
  { value: 0, label: "Domingo", curto: "Dom" },
  { value: 1, label: "Segunda", curto: "Seg" },
  { value: 2, label: "Terça", curto: "Ter" },
  { value: 3, label: "Quarta", curto: "Qua" },
  { value: 4, label: "Quinta", curto: "Qui" },
  { value: 5, label: "Sexta", curto: "Sex" },
  { value: 6, label: "Sábado", curto: "Sáb" },
] as const

export interface Consultor {
  id: string
  nome: string
  slug: string
  email: string | null
  email_calendar: string
  tabela_destino: TabelaDestino
  tipo_reuniao: "implementacao" | "tutoria" | null
  especialidade: string | null
  descricao: string | null
  avatar_url: string | null
  accent: string
  duracao_padrao_minutos: number
  ativo: boolean
  ordem: number
  created_at: string
  updated_at: string
}

export interface Disponibilidade {
  id: string
  consultor_id: string
  dia_semana: number
  hora_inicio: string
  hora_fim: string
}

export interface AgendamentoCentral {
  id_unico: string
  origem: "galdino" | "mentoria" | "blackcrm"
  id_reuniao: string | null
  data_reuniao: string | null
  horario: string | null
  consultor_nome: string | null
  cliente_email: string | null
  cliente_nome: string | null
  empresa: string | null
  status_agendamento: StatusAgendamento | null
  duracao_minutos: number | null
  link_meet: string | null
  link_gravacao: string | null
  link_geminidoc: string | null
  cliente_telefone: string | null
  id_cliente: string | null
  codigo_cliente: number | null
  observacoes: string | null
  cliente_compareceu: boolean | null
  criado_em: string | null
  atualizado_em: string | null
}

export function slugify(nome: string): string {
  return nome
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
}

export function iniciais(nome: string): string {
  return nome
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map(p => p[0]?.toUpperCase() ?? "")
    .join("")
}

function parseTime(t: string): { h: number; m: number } {
  const [hh, mm] = t.split(":")
  return { h: Number(hh), m: Number(mm ?? 0) }
}

function toHHMM(h: number, m: number): string {
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`
}

export function gerarSlots(
  hora_inicio: string,
  hora_fim: string,
  duracao_minutos: number,
): string[] {
  const ini = parseTime(hora_inicio)
  const fim = parseTime(hora_fim)
  const minIni = ini.h * 60 + ini.m
  const minFim = fim.h * 60 + fim.m
  const slots: string[] = []
  for (let t = minIni; t + duracao_minutos <= minFim; t += duracao_minutos) {
    slots.push(toHHMM(Math.floor(t / 60), t % 60))
  }
  return slots
}

export function slotsDoDia(
  janelas: Disponibilidade[],
  duracao_minutos: number,
): string[] {
  const todos = new Set<string>()
  for (const j of janelas) {
    for (const s of gerarSlots(j.hora_inicio.slice(0, 5), j.hora_fim.slice(0, 5), duracao_minutos)) {
      todos.add(s)
    }
  }
  return Array.from(todos).sort()
}

export function proximasDatasValidas(
  disponibilidade: Disponibilidade[],
  n: number = 12,
  startOffsetDays: number = 1,
): Date[] {
  const diasValidos = new Set(disponibilidade.map(d => d.dia_semana))
  if (diasValidos.size === 0) return []
  const datas: Date[] = []
  const hoje = new Date()
  hoje.setHours(0, 0, 0, 0)
  let offset = startOffsetDays
  while (datas.length < n && offset < 90) {
    const d = new Date(hoje)
    d.setDate(d.getDate() + offset)
    if (diasValidos.has(d.getDay())) datas.push(d)
    offset++
  }
  return datas
}

export function isoData(d: Date): string {
  const yyyy = d.getFullYear()
  const mm = String(d.getMonth() + 1).padStart(2, "0")
  const dd = String(d.getDate()).padStart(2, "0")
  return `${yyyy}-${mm}-${dd}`
}

export function formatarData(iso: string | null): string {
  if (!iso) return "—"
  try {
    return new Date(iso + "T00:00:00").toLocaleDateString("pt-BR")
  } catch {
    return iso
  }
}

export function formatarDataLonga(d: Date): string {
  return d.toLocaleDateString("pt-BR", {
    weekday: "long",
    day: "numeric",
    month: "long",
  })
}

export const STATUS_LABEL: Record<StatusAgendamento, string> = {
  pendente_sync: "Pendente Sync",
  confirmado: "Confirmado",
  cancelado: "Cancelado",
  realizado: "Realizado",
}

export const STATUS_BADGE: Record<StatusAgendamento, string> = {
  pendente_sync: "bg-amber-500/10 border-amber-500/30 text-amber-400",
  confirmado: "bg-primary/10 border-primary/30 text-primary",
  cancelado: "bg-destructive/10 border-destructive/30 text-destructive",
  realizado: "bg-blue-500/10 border-blue-500/30 text-blue-400",
}
