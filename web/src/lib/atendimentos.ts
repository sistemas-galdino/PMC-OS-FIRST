export const TABELAS_REUNIAO = ["reunioes_galdino", "reunioes_mentoria_new", "reunioes_blackcrm"] as const
export type TabelaDestino = (typeof TABELAS_REUNIAO)[number]

export const STATUS_AGENDAMENTO = ["pendente_sync", "confirmado", "cancelado", "realizado"] as const
export type StatusAgendamento = (typeof STATUS_AGENDAMENTO)[number]

// Caixas Workspace válidas pra serem organizador/origem do evento Google Calendar.
// Todas têm Domain-Wide Delegation configurada pro Service Account do PMC OS.
// Mantido sincronizado com a whitelist da edge function criar-agendamento.
export const EMAILS_CALENDAR_VALIDOS = [
  "dono@rafaelgaldino.com.br",
  "consultor@rafaelgaldino.com.br",
  "consultores@rafaelgaldino.com.br",
  "especialistablackcrm@rafaelgaldino.com.br",
  "mentor@rafaelgaldino.com.br",
] as const
export type EmailCalendar = (typeof EMAILS_CALENDAR_VALIDOS)[number]

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
  nomes_match: string[] | null
  created_at: string
  updated_at: string
}

// Nomes que identificam o consultor nas reuniões (nome + aliases). As reuniões
// guardam o nome do mentor/responsável, que às vezes difere do cadastro (ex.: Léo
// vs Leonardo) — usar isto pra casar a agenda do consultor com as reuniões dele.
export function nomesDoConsultor(c: Pick<Consultor, "nome" | "nomes_match">): string[] {
  return [c.nome, ...(c.nomes_match ?? [])]
}

export interface Disponibilidade {
  id: string
  consultor_id: string
  dia_semana: number
  hora_inicio: string
  hora_fim: string
}

export interface ExcecaoConsultor {
  id: string
  consultor_id: string
  data: string // YYYY-MM-DD
  tipo: "bloqueio" | "extra"
  hora_inicio: string | null // null = bloqueio dia inteiro
  hora_fim: string | null
  motivo: string | null
  created_at?: string
}

export interface Feriado {
  id: string
  data: string
  nome: string
  tipo: "nacional" | "customizado"
  created_at?: string
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

// Status "efetivo" da reunião, derivado de data + comparecimento — porque as reuniões
// sincronizadas do Google Calendar não têm `status_agendamento` (esse só é setado pelo
// fluxo de booking do link público). Mesma lógica do StatusBadgeToggle.
export type StatusEfetivo = "agendada" | "realizada" | "faltou" | "cancelado"

export function statusEfetivo(
  a: Pick<AgendamentoCentral, "data_reuniao" | "cliente_compareceu" | "status_agendamento">,
): StatusEfetivo {
  if (a.status_agendamento === "cancelado") return "cancelado"
  if (a.data_reuniao && a.data_reuniao > isoData(new Date())) return "agendada"
  if (a.cliente_compareceu === false) return "faltou"
  return "realizada"
}

export const STATUS_EFETIVO_LIST = ["agendada", "realizada", "faltou", "cancelado"] as const

export const STATUS_EFETIVO_LABEL: Record<StatusEfetivo, string> = {
  agendada: "Agendada",
  realizada: "Realizada",
  faltou: "Faltou",
  cancelado: "Cancelado",
}

export const STATUS_EFETIVO_BADGE: Record<StatusEfetivo, string> = {
  agendada: "bg-amber-500/10 border-amber-500/30 text-amber-400",
  realizada: "bg-primary/10 border-primary/30 text-primary",
  faltou: "bg-destructive/10 border-destructive/30 text-destructive",
  cancelado: "bg-muted/20 border-border text-muted-foreground",
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

function hhmm(t: string): string {
  return t.slice(0, 5)
}

// Combina as 3 camadas (semanal → +extras → −bloqueios → ∅ feriado)
// pra produzir os slots ofertáveis numa data específica.
export function slotsDisponiveisNaData(opts: {
  data: Date
  janelas: Disponibilidade[]
  excecoes: ExcecaoConsultor[]
  feriados: Set<string> // datas ISO YYYY-MM-DD
  duracao_minutos: number
  // No dia de HOJE, esconde a janela semanal (só oferta avulsos/extras) e
  // descarta horários que já passaram. Não afeta datas futuras nem o admin.
  apenasAvulsoHoje?: boolean
}): string[] {
  const { data, janelas, excecoes, feriados, duracao_minutos, apenasAvulsoHoje = false } = opts
  const iso = isoData(data)
  if (feriados.has(iso)) return []

  const excecoesDia = excecoes.filter(e => e.data === iso)
  const bloqDiaTodo = excecoesDia.some(e => e.tipo === "bloqueio" && !e.hora_inicio)
  if (bloqDiaTodo) return []

  const hojeRef = new Date()
  hojeRef.setHours(0, 0, 0, 0)
  const ehHoje = apenasAvulsoHoje && iso === isoData(hojeRef)

  const dia = data.getDay()
  // Hoje só oferta avulso: a janela semanal de hoje fica escondida.
  const janelasSemanais = ehHoje ? [] : janelas.filter(j => j.dia_semana === dia)
  const janelasExtra = excecoesDia.filter(e => e.tipo === "extra" && e.hora_inicio && e.hora_fim)

  const slots = new Set<string>()
  for (const j of janelasSemanais) {
    for (const s of gerarSlots(hhmm(j.hora_inicio), hhmm(j.hora_fim), duracao_minutos)) {
      slots.add(s)
    }
  }
  for (const e of janelasExtra) {
    for (const s of gerarSlots(hhmm(e.hora_inicio!), hhmm(e.hora_fim!), duracao_minutos)) {
      slots.add(s)
    }
  }

  const bloqueios = excecoesDia.filter(e => e.tipo === "bloqueio" && e.hora_inicio && e.hora_fim)
  for (const slot of Array.from(slots)) {
    for (const b of bloqueios) {
      if (slot >= hhmm(b.hora_inicio!) && slot < hhmm(b.hora_fim!)) {
        slots.delete(slot)
        break
      }
    }
  }

  let resultado = Array.from(slots).sort()
  // Hoje: descarta avulsos cujo horário já passou (não dá pra agendar no passado).
  if (ehHoje) {
    const agora = new Date()
    const nowHHMM = toHHMM(agora.getHours(), agora.getMinutes())
    resultado = resultado.filter(s => s >= nowHHMM)
  }
  return resultado
}

// Janela máxima (em dias a partir de hoje) que o link público oferta pra agendar.
export const HORIZONTE_DIAS = 120

// Converte as linhas do RPC horarios_ocupados_consultor_intervalo num mapa
// dataISO ("AAAA-MM-DD") → conjunto de horários "HH:MM" ocupados.
export function mapaOcupadosPorData(
  rows: { data_reuniao: string | null; horario: string | null }[],
): Map<string, Set<string>> {
  const mapa = new Map<string, Set<string>>()
  for (const r of rows) {
    if (!r.data_reuniao || !r.horario) continue
    const dia = r.data_reuniao.slice(0, 10)
    if (!mapa.has(dia)) mapa.set(dia, new Set())
    mapa.get(dia)!.add(r.horario.slice(0, 5))
  }
  return mapa
}

export function proximasDatasValidas(opts: {
  disponibilidade: Disponibilidade[]
  excecoes?: ExcecaoConsultor[]
  feriados?: Set<string>
  n?: number
  startOffsetDays?: number
  ocupadosPorData?: Map<string, Set<string>>
  duracao_minutos?: number
  // Inclui HOJE (1º da lista) quando houver horário avulso livre — nunca pela
  // janela semanal. Avulsos já passados não contam (ver slotsDisponiveisNaData).
  incluirHojeAvulso?: boolean
}): Date[] {
  const {
    disponibilidade,
    excecoes = [],
    feriados = new Set<string>(),
    n = 12,
    startOffsetDays = 1,
    ocupadosPorData,
    duracao_minutos,
    incluirHojeAvulso = false,
  } = opts

  const diasComJanelaSemanal = new Set(disponibilidade.map(d => d.dia_semana))
  const datasComExtra = new Set(
    excecoes.filter(e => e.tipo === "extra").map(e => e.data),
  )
  const datasBloqueadasFullDay = new Set(
    excecoes.filter(e => e.tipo === "bloqueio" && !e.hora_inicio).map(e => e.data),
  )

  if (diasComJanelaSemanal.size === 0 && datasComExtra.size === 0) return []

  const datas: Date[] = []
  const hoje = new Date()
  hoje.setHours(0, 0, 0, 0)

  // HOJE entra (como 1º card) só via avulso livre — nunca pela janela semanal.
  if (incluirHojeAvulso && duracao_minutos != null) {
    const hojeIso = isoData(hoje)
    if (
      datasComExtra.has(hojeIso) &&
      !feriados.has(hojeIso) &&
      !datasBloqueadasFullDay.has(hojeIso)
    ) {
      const ocup = ocupadosPorData?.get(hojeIso) ?? new Set<string>()
      const livres = slotsDisponiveisNaData({
        data: hoje,
        janelas: disponibilidade,
        excecoes,
        feriados,
        duracao_minutos,
        apenasAvulsoHoje: true,
      }).filter(s => !ocup.has(s))
      if (livres.length > 0) datas.push(hoje)
    }
  }

  let offset = startOffsetDays
  while (datas.length < n && offset < HORIZONTE_DIAS) {
    const d = new Date(hoje)
    d.setDate(d.getDate() + offset)
    const iso = isoData(d)
    offset++
    if (feriados.has(iso)) continue
    if (datasBloqueadasFullDay.has(iso)) continue
    const temSemanal = diasComJanelaSemanal.has(d.getDay())
    const temExtra = datasComExtra.has(iso)
    if (!temSemanal && !temExtra) continue
    // Com a ocupação em mãos, escondemos datas sem nenhum horário livre.
    if (ocupadosPorData && duracao_minutos != null) {
      const ocup = ocupadosPorData.get(iso) ?? new Set<string>()
      const livres = slotsDisponiveisNaData({
        data: d,
        janelas: disponibilidade,
        excecoes,
        feriados,
        duracao_minutos,
      }).filter(s => !ocup.has(s))
      if (livres.length === 0) continue
    }
    datas.push(d)
  }
  return datas
}

export function isoData(d: Date): string {
  const yyyy = d.getFullYear()
  const mm = String(d.getMonth() + 1).padStart(2, "0")
  const dd = String(d.getDate()).padStart(2, "0")
  return `${yyyy}-${mm}-${dd}`
}

// Soma (ou subtrai, com n negativo) dias a uma data, sem mutar a original.
export function addDias(d: Date, n: number): Date {
  const r = new Date(d)
  r.setDate(r.getDate() + n)
  return r
}

// Volta pro domingo da semana de `d` (início de semana à brasileira, igual ao
// Google Agenda: DOM…SÁB), zerando as horas.
export function inicioDaSemana(d: Date): Date {
  const r = new Date(d.getFullYear(), d.getMonth(), d.getDate())
  r.setDate(r.getDate() - r.getDay())
  return r
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

// Gera 42 células (6 semanas × 7 dias) que cobrem o mês de refMonth,
// começando no domingo da semana onde cai o dia 1.
export function diasDoMes(refMonth: Date): Date[] {
  const first = new Date(refMonth.getFullYear(), refMonth.getMonth(), 1)
  const firstDayOfWeek = first.getDay()
  const ultimoDia = new Date(first.getFullYear(), first.getMonth() + 1, 0).getDate()
  const cells: Date[] = []
  for (let i = 0; i < firstDayOfWeek; i++) {
    const d = new Date(first)
    d.setDate(d.getDate() - (firstDayOfWeek - i))
    cells.push(d)
  }
  for (let d = 1; d <= ultimoDia; d++) {
    cells.push(new Date(first.getFullYear(), first.getMonth(), d))
  }
  while (cells.length < 42) {
    const last = cells[cells.length - 1]
    const next = new Date(last)
    next.setDate(next.getDate() + 1)
    cells.push(next)
  }
  return cells.slice(0, 42)
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
