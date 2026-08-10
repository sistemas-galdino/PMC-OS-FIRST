import type { Atividade, Cliente, SituacaoCliente } from "./types"
import { situacaoCliente } from "./jornada"

/**
 * Funções DERIVADAS: recebem os arrays já carregados e não tocam em
 * persistência. Copiadas praticamente na íntegra do storage.ts do CS Manager
 * original — é aqui que mora a regra de negócio que a Mayara desenhou
 * (ciclos, entregas pendentes, janelas de checkpoint), então mudar qualquer
 * limiar aqui muda o comportamento que o time já validou.
 */

/**
 * Dias desde uma data ISO. Retorna -1 quando não há data válida.
 *
 * No original isto devolvia NaN, que era inofensivo com os 20 clientes
 * semeados (todos tinham data). Com dados reais é diferente: 103 clientes
 * ativos em produção estão sem data de entrada, e NaN faz toda comparação
 * de ciclo virar false — o cliente cairia silenciosamente em "Ano 2".
 * O -1 explícito faz esses clientes aparecerem como "Sem data de entrada",
 * que é o que a CS precisa ver até o backfill rodar.
 */
function diasDesdeStr(iso?: string): number {
  if (!iso) return -1
  const t = new Date(iso).getTime()
  if (Number.isNaN(t)) return -1
  return Math.floor((Date.now() - t) / 86400000)
}

export function diasSemContato(clienteId: string, atividades: Atividade[]): number | null {
  const concl = atividades
    .filter((a) => a.cliente_id === clienteId && a.status === "Concluída" && a.data_conclusao)
    .map((a) => new Date(a.data_conclusao!).getTime())
    .sort((a, b) => b - a);
  if (concl.length === 0) return null;
  return Math.floor((Date.now() - concl[0]) / (1000 * 60 * 60 * 24));
}

export function proximaAtividade(clienteId: string, atividades: Atividade[]): Atividade | null {
  const futuras = atividades
    .filter(
      (a) =>
        a.cliente_id === clienteId &&
        (a.status === "Pendente" || a.status === "Em andamento" || a.status === "Atrasada"),
    )
    .sort((a, b) => new Date(a.data_prevista).getTime() - new Date(b.data_prevista).getTime());
  return futuras[0] || null;
}

export function sameDay(isoA: string, isoB: string): boolean {
  const a = new Date(isoA);
  const b = new Date(isoB);
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

// ============= Display IDs ("#001", "#002"...) =============
// Stable: based on data_inicio ascending, fallback to id alphabetical.
export function buildDisplayIdMap(clientes: Cliente[]): Map<string, string> {
  const sorted = [...clientes].sort((a, b) => {
    const ta = new Date(a.data_inicio).getTime();
    const tb = new Date(b.data_inicio).getTime();
    if (ta !== tb) return ta - tb;
    return a.id.localeCompare(b.id);
  });
  const m = new Map<string, string>();
  sorted.forEach((c, i) => m.set(c.id, `#${String(i + 1).padStart(3, "0")}`));
  return m;
}

export function clienteDisplayId(id: string, clientes: Cliente[]): string {
  return buildDisplayIdMap(clientes).get(id) || "#---";
}


export function semProximaAcao(clienteId: string, atividades: Atividade[]): boolean {
  return !proximaAtividade(clienteId, atividades);
}
export function reuniaoRecente(c: Cliente, dias = 30): boolean {
  if (!c.ultima_reuniao_consultor) return false;
  const d = (Date.now() - new Date(c.ultima_reuniao_consultor).getTime()) / 86400000;
  return d <= dias;
}
export function temReuniaoGaldino(c: Cliente): boolean {
  if (typeof c.reuniao_galdino === "boolean") return c.reuniao_galdino;
  // O original inventava um valor determinístico (h32(id) % 10 > 6) para os
  // clientes semeados que não tinham o campo. Com dados reais isso produziria
  // "já fez reunião com Galdino" falso — e é justamente essa informação que
  // decide se o ciclo do cliente começou. Sem dado, assume que não fez.
  return false;
}
export function temReuniaoConsultor(c: Cliente): boolean {
  if (c.reunioes_consultores) return c.reunioes_consultores === "ativo";
  return !!c.ultima_reuniao_consultor;
}
export function proxRenovacao(c: Cliente): boolean {
  if (c.proximo_renovacao) return true;
  if (!c.data_renovacao) return false;
  const d = (new Date(c.data_renovacao).getTime() - Date.now()) / 86400000;
  return d >= 0 && d <= 60;
}

// ============= Ciclo do cliente =============
export type CicloLabel =
  | "Sem data de entrada"
  | "Cliente Novo · 30 dias"
  | "Ciclo 90 dias"
  | "Ciclo 180 dias"
  | "Ciclo 270 dias"
  | "Pré-Renovação"
  | "Pós-Programa"
  | "Ano 2";

export const CICLOS: CicloLabel[] = [
  "Cliente Novo · 30 dias",
  "Ciclo 90 dias",
  "Ciclo 180 dias",
  "Ciclo 270 dias",
  "Pré-Renovação",
  "Pós-Programa",
  "Ano 2",
  // Fica por último de propósito: é uma pendência de cadastro, não uma fase
  // da jornada. Some sozinho conforme o backfill/cadastro preenche as datas.
  "Sem data de entrada",
];

/**
 * Situação do cliente no programa. Registros antigos assumem "Ativo",
 * exceto quando o status já for "Cancelado".
 */
export function situacaoDe(c: Cliente): SituacaoCliente {
  return situacaoCliente(c);
}

/** true quando o cliente não tem data de entrada registrada. */
export function semDataDeEntrada(c: Cliente): boolean {
  return diasDesdeStr(c.data_inicio) < 0;
}

/**
 * Só clientes com situação "Ativo" E com data de entrada têm relógio de ciclo.
 * Sem data não dá para dizer em que trimestre o cliente está, e alertar sobre
 * fechamento de um ciclo que não sabemos ter começado gera exatamente o
 * ruído que a Mayara pediu para evitar.
 */
export function temRelogioDeCiclo(c: Cliente): boolean {
  return situacaoDe(c) === "Ativo" && !semDataDeEntrada(c);
}

export function diaPrograma(c: Cliente): number {
  return diasDesdeStr(c.data_inicio);
}

export function cicloDoCliente(c: Cliente): CicloLabel {
  const d = diaPrograma(c);
  if (d < 0) return "Sem data de entrada";
  if (d <= 30) return "Cliente Novo · 30 dias";
  if (d <= 90) return "Ciclo 90 dias";
  if (d <= 180) return "Ciclo 180 dias";
  if (d <= 270) return "Ciclo 270 dias";
  if (d <= 360) return "Pré-Renovação";
  if (d <= 405) return "Pós-Programa";
  return "Ano 2";
}

export type StatusCiclo = "em_dia" | "atencao" | "atrasado" | "critico" | "sem_info";
export const STATUS_CICLO_LABEL: Record<StatusCiclo, string> = {
  em_dia: "Em dia",
  atencao: "Atenção",
  atrasado: "Atrasado",
  critico: "Crítico",
  sem_info: "Sem informação",
};

export function statusCiclo(c: Cliente, ativ: Atividade[]): StatusCiclo {
  const list = ativ.filter((a) => a.cliente_id === c.id);
  if (list.length === 0) return "sem_info";
  const atras = list.filter(
    (a) =>
      (a.status === "Pendente" || a.status === "Em andamento") &&
      new Date(a.data_prevista).getTime() < Date.now() - 86400000,
  ).length;
  const flagAtrasada = list.some((a) => a.status === "Atrasada");
  if (atras > 2) return "critico";
  if (atras > 0 || flagAtrasada) return "atrasado";
  const sem = diasSemContato(c.id, ativ);
  if (sem !== null && sem > 14) return "atencao";
  if (!proximaAtividade(c.id, ativ)) return "atencao";
  return "em_dia";
}

// ============= Entregas pendentes =============
export type EntregaPendente =
  | "Acesso ao sistema"
  | "Área de Membros"
  | "Onboarding"
  | "Reunião com Galdino"
  | "Reunião com consultor"
  | "Black CRM"
  | "Black SDR"
  | "Guardião de IA"
  | "Infográfico 30 dias"
  | "Infográfico 90 dias"
  | "Raio-X de Maturidade"
  | "Dossiê de Transformação"
  | "Sessão de Visão 2.0"
  | "Depoimento"
  | "Case";

export const ENTREGAS_PENDENTES_LIST: EntregaPendente[] = [
  "Acesso ao sistema",
  "Área de Membros",
  "Onboarding",
  "Reunião com Galdino",
  "Reunião com consultor",
  "Black CRM",
  "Black SDR",
  "Guardião de IA",
  "Infográfico 30 dias",
  "Infográfico 90 dias",
  "Raio-X de Maturidade",
  "Dossiê de Transformação",
  "Sessão de Visão 2.0",
  "Depoimento",
  "Case",
];

export function entregasPendentes(c: Cliente): EntregaPendente[] {
  const out: EntregaPendente[] = [];
  const d = diaPrograma(c);
  if (d <= 14 && c.area_membros !== "ativo") out.push("Acesso ao sistema");
  if (c.area_membros !== "ativo") out.push("Área de Membros");
  if (d <= 30) out.push("Onboarding");
  if (!c.black_crm) out.push("Black CRM");
  if (!c.black_sdr) out.push("Black SDR");
  if (!c.guardiao_ia) out.push("Guardião de IA");
  if (!reuniaoRecente(c, 60)) out.push("Reunião com consultor");
  if (d >= 20 && d <= 45) out.push("Infográfico 30 dias");
  if (d >= 80 && d <= 105) out.push("Infográfico 90 dias");
  if (d >= 90 && d <= 180) out.push("Raio-X de Maturidade");
  if (d >= 240 && d <= 320) out.push("Dossiê de Transformação");
  if (d >= 300) out.push("Sessão de Visão 2.0");
  if (proxRenovacao(c) && !c.vitoria_registrada) out.push("Depoimento");
  if (c.oportunidade_case && !c.vitoria_registrada) out.push("Case");
  return out;
}

export function proximaEntregaPendente(c: Cliente): EntregaPendente | null {
  return entregasPendentes(c)[0] || null;
}

// ============= Janela de tempo =============
export function semContatoHaMais(c: Cliente, ativ: Atividade[], dias: number): boolean {
  const s = diasSemContato(c.id, ativ);
  return s === null || s > dias;
}
export function proxAcaoHoje(c: Cliente, ativ: Atividade[]): boolean {
  const p = proximaAtividade(c.id, ativ);
  if (!p) return false;
  return sameDay(p.data_prevista, new Date().toISOString());
}
export function proxAcaoSemana(c: Cliente, ativ: Atividade[]): boolean {
  const p = proximaAtividade(c.id, ativ);
  if (!p) return false;
  const diff = (new Date(p.data_prevista).getTime() - Date.now()) / 86400000;
  return diff >= 0 && diff <= 7;
}
export function proxAcaoVencida(c: Cliente, ativ: Atividade[]): boolean {
  const p = proximaAtividade(c.id, ativ);
  if (!p) return false;
  return new Date(p.data_prevista).getTime() < Date.now() - 86400000;
}
export function checkpointProx(c: Cliente, dentroDias: number): boolean {
  const d = diaPrograma(c);
  const marcos = [30, 90, 180, 270, 360];
  return marcos.some((m) => m - d > 0 && m - d <= dentroDias);
}


// ============= Manual de CS =============
