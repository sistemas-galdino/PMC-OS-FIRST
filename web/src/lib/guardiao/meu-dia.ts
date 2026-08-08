// Meu Dia — dados do cockpit diário do Guardião.
// Uma carga só para a tela inteira: o dia não pode ter spinner por bloco.
import { supabase } from "@/lib/supabase"
import { ROTINAS, type Tarefa } from "@/lib/guardiao/tarefas"

/** Checklist da Rotina Diária — a fonte é a mesma que alimenta /rotinas. */
export const ROTINA_DIARIA = ROTINAS.find((r) => r.origem === "rotina_diaria")!

export interface DiaFechamento {
  id: string
  data: string
  checklist: number[]
  resp_ontem: string | null
  resp_hoje: string | null
  resp_travou: string | null
  fechado_em: string | null
}

export interface DiaSemana { data: string; dow: number; fechado: boolean; futuro: boolean }
export interface Streak { streak: number; recorde: number; escudo_disponivel: boolean; semana: DiaSemana[] }

export interface Novidade { id: string; tipo: string; titulo: string; texto: string | null; link: string | null; created_at: string }

export interface DadosMeuDia {
  hoje: string
  tarefasHoje: Tarefa[]
  atrasadas: Tarefa[]
  travas: Tarefa[]
  fechamento: DiaFechamento | null
  streak: Streak
  novidades: Novidade[]
  concluidasHoje: number
}

/** Data de hoje no fuso de Brasília — o mesmo que o cron usa no banco. */
export function hojeBRT(): string {
  return new Date().toLocaleDateString("en-CA", { timeZone: "America/Sao_Paulo" })
}

/**
 * Semanas perfeitas: semanas ISO com os 5 dias úteis fechados.
 * Espelha public.semanas_perfeitas(uuid) — as duas precisam concordar, senão
 * os Pontos MC da tela divergem dos do ranking.
 */
export function contarSemanasPerfeitas(datas: string[]): number {
  const porSemana = new Map<string, number>()
  for (const iso of datas) {
    const [y, m, d] = iso.split("-").map(Number)
    const dt = new Date(Date.UTC(y, m - 1, d))
    const dow = dt.getUTCDay()
    if (dow === 0 || dow === 6) continue                       // fim de semana não conta
    const quinta = new Date(dt)                                 // a quinta define o ano ISO
    quinta.setUTCDate(dt.getUTCDate() + 4 - (dow || 7))
    const jan1 = new Date(Date.UTC(quinta.getUTCFullYear(), 0, 1))
    const semana = Math.ceil(((quinta.getTime() - jan1.getTime()) / 86400000 + 1) / 7)
    const chave = `${quinta.getUTCFullYear()}-W${semana}`
    porSemana.set(chave, (porSemana.get(chave) ?? 0) + 1)
  }
  return [...porSemana.values()].filter((n) => n === 5).length
}

const STREAK_VAZIO: Streak = { streak: 0, recorde: 0, escudo_disponivel: true, semana: [] }

export async function carregarMeuDia(clientId: string): Promise<DadosMeuDia> {
  const hoje = hojeBRT()
  // "Desde ontem" = janela de 36h: cobre quem não abriu ontem à tarde.
  const desde = new Date(Date.now() - 36 * 3600 * 1000).toISOString()

  const [tarefasRes, fechRes, streakRes, novRes] = await Promise.all([
    supabase.from("metodo_tarefas").select("*").eq("id_cliente", clientId).neq("status", "concluido"),
    supabase.from("metodo_dia_fechamentos").select("*").eq("id_cliente", clientId).eq("data", hoje).maybeSingle(),
    supabase.rpc("meu_streak"),
    supabase.from("notificacoes").select("id, tipo, titulo, texto, link, created_at")
      .or(`id_cliente.eq.${clientId},id_cliente.is.null`)
      .gte("created_at", desde).order("created_at", { ascending: false }).limit(5),
    ])

  const abertas = (tarefasRes.data ?? []) as Tarefa[]
  const temTrava = (t: Tarefa) => !!t.bloqueio?.trim()

  // Uma tarefa aparece em UM balde só, na ordem de urgência: trava > atrasada > hoje.
  const travas = abertas.filter(temTrava)
  const atrasadas = abertas.filter((t) => !temTrava(t) && t.prazo && t.prazo < hoje)
  const tarefasHoje = abertas.filter((t) => !temTrava(t) && t.prazo === hoje)

  const s = Array.isArray(streakRes.data) ? streakRes.data[0] : streakRes.data
  const streak: Streak = s
    ? { streak: s.streak ?? 0, recorde: s.recorde ?? 0, escudo_disponivel: s.escudo_disponivel ?? true, semana: (s.semana ?? []) as DiaSemana[] }
    : STREAK_VAZIO

  // Pontos de hoje: tarefas concluídas hoje × 10 (a regra que já vale hoje em
  // FONTES_PONTOS). O bônus do fechamento entra quando a Fase C ligar a economia.
  const { count } = await supabase
    .from("metodo_tarefas").select("id", { count: "exact", head: true })
    .eq("id_cliente", clientId).eq("status", "concluido").gte("updated_at", hoje)

  const f = fechRes.data as any
  return {
    hoje,
    tarefasHoje,
    atrasadas,
    travas,
    fechamento: f ? { ...f, checklist: Array.isArray(f.checklist) ? f.checklist : [] } : null,
    streak,
    novidades: (novRes.data ?? []) as Novidade[],
    concluidasHoje: count ?? 0,
  }
}

/** Grava o rascunho do checklist. Não fecha o dia — fechado_em segue nulo. */
export async function salvarChecklist(clientId: string, checklist: number[]): Promise<void> {
  const { error } = await supabase.from("metodo_dia_fechamentos").upsert(
    { id_cliente: clientId, data: hojeBRT(), checklist, updated_at: new Date().toISOString() },
    { onConflict: "id_cliente,data" },
  )
  if (error) throw error
}

/** O ritual: marca fechado_em. Só a partir daqui o dia conta no streak. */
export async function fecharDia(
  clientId: string,
  respostas: { resp_ontem: string; resp_hoje: string; resp_travou: string },
  checklist: number[],
): Promise<void> {
  const { error } = await supabase.from("metodo_dia_fechamentos").upsert(
    {
      id_cliente: clientId,
      data: hojeBRT(),
      checklist,
      ...respostas,
      fechado_em: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    },
    { onConflict: "id_cliente,data" },
  )
  if (error) throw error
}

/**
 * A próxima ação — o coração do bloco AGORA.
 * Prioridade fixa: trava parada > tarefa atrasada > rotina não aberta > tarefa de hoje.
 * Decidir "por onde começo" é o que mata o hábito; aqui a decisão já vem tomada.
 */
export interface ProximaAcao { titulo: string; contexto: string; rotulo: string; destino: string; tom: "trava" | "atraso" | "rotina" | "hoje" | "livre" }

export function proximaAcao(d: DadosMeuDia): ProximaAcao {
  const feitos = d.fechamento?.checklist.length ?? 0

  if (d.travas.length > 0) {
    const t = d.travas[0]
    return {
      titulo: t.bloqueio || t.titulo,
      contexto: `${t.titulo}${t.setor ? ` · ${t.setor}` : ""}`,
      rotulo: "Resolver a trava",
      destino: "/tarefas?status=a_fazer",
      tom: "trava",
    }
  }
  if (d.atrasadas.length > 0) {
    const t = d.atrasadas[0]
    return {
      titulo: t.titulo,
      contexto: `Venceu em ${formatarData(t.prazo!)}${t.setor ? ` · ${t.setor}` : ""}`,
      rotulo: "Retomar agora",
      destino: "/tarefas",
      tom: "atraso",
    }
  }
  if (feitos === 0) {
    return {
      titulo: "Abrir a rotina do dia",
      contexto: `${ROTINA_DIARIA.checklist.length} itens · ${ROTINA_DIARIA.descricao}`,
      rotulo: "Começar a rotina",
      destino: "#rotina",
      tom: "rotina",
    }
  }
  if (d.tarefasHoje.length > 0) {
    const t = d.tarefasHoje[0]
    return {
      titulo: t.titulo,
      contexto: t.setor ? `Para hoje · ${t.setor}` : "Para hoje",
      rotulo: "Executar",
      destino: "/tarefas",
      tom: "hoje",
    }
  }
  return {
    titulo: feitos >= ROTINA_DIARIA.checklist.length ? "Rotina completa — feche o dia" : "Terminar a rotina do dia",
    contexto: `${feitos}/${ROTINA_DIARIA.checklist.length} itens concluídos`,
    rotulo: feitos >= ROTINA_DIARIA.checklist.length ? "Fechar o dia" : "Continuar",
    destino: "#rotina",
    tom: "livre",
  }
}

export function formatarData(iso: string): string {
  const [y, m, d] = iso.split("-")
  return `${d}/${m}/${y}`
}

export function saudacao(): string {
  const h = Number(new Date().toLocaleString("en-US", { timeZone: "America/Sao_Paulo", hour: "2-digit", hour12: false }))
  if (h < 12) return "Bom dia"
  if (h < 18) return "Boa tarde"
  return "Boa noite"
}

export function dataPorExtenso(iso: string): string {
  const [y, m, d] = iso.split("-").map(Number)
  const dt = new Date(y, m - 1, d)
  const dia = dt.toLocaleDateString("pt-BR", { weekday: "long" })
  const mes = dt.toLocaleDateString("pt-BR", { month: "long" })
  return `${dia.charAt(0).toUpperCase()}${dia.slice(1)} · ${d} de ${mes}`
}
