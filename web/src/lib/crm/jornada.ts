import type { Cliente, SituacaoCliente } from "./types";

/**
 * Funções DERIVADAS da jornada do cliente.
 * Nada aqui é persistido: trimestre, fechamento de ciclo e contagem de
 * reuniões são sempre calculados a partir de campos já existentes
 * (data_inicio, consultor_reunioes, ciclo_galdino_reunioes).
 */

const DIA_MS = 86400000;

function parseData(iso?: string): number | null {
  if (!iso) return null;
  const t = new Date(iso).getTime();
  return Number.isNaN(t) ? null : t;
}

function startOfDay(t: number): number {
  const d = new Date(t);
  d.setHours(0, 0, 0, 0);
  return d.getTime();
}

/**
 * Situação do cliente no programa. Registros antigos assumem "Ativo",
 * exceto quando o status já for "Cancelado".
 */
export function situacaoCliente(cliente: Cliente): SituacaoCliente {
  if (cliente.situacao) return cliente.situacao;
  return cliente.status === "Cancelado" ? "Cancelado" : "Ativo";
}

/** Só clientes com situação "Ativo" têm relógio de ciclo. */
export function temRelogioDeCiclo(cliente: Cliente): boolean {
  return situacaoCliente(cliente) === "Ativo";
}

/** Dias corridos desde data_inicio (null se não houver data válida). */
export function diasDeJornada(cliente: Cliente, ref: Date = new Date()): number | null {
  const inicio = parseData(cliente.data_inicio);
  if (inicio === null) return null;
  return Math.max(0, Math.floor((startOfDay(ref.getTime()) - startOfDay(inicio)) / DIA_MS));
}

/** Duração total do programa em dias (4 trimestres). */
export const DIAS_PROGRAMA = 360;

/** Cliente com mais de 360 dias de jornada: pós-programa (sem trimestre/ciclo). */
export function isPosPrograma(cliente: Cliente, ref: Date = new Date()): boolean {
  const dias = diasDeJornada(cliente, ref);
  return dias !== null && dias > DIAS_PROGRAMA;
}

/**
 * Trimestre atual do cliente: 1 (0–89d), 2 (90–179d), 3 (180–269d), 4 (270–360d).
 * Após 360 dias o cliente é pós-programa: retorna null. Null sem data_inicio.
 */
export function trimestreAtual(cliente: Cliente, ref: Date = new Date()): number | null {
  if (!temRelogioDeCiclo(cliente)) return null;
  const dias = diasDeJornada(cliente, ref);
  if (dias === null) return null;
  if (dias > DIAS_PROGRAMA) return null;
  return Math.min(4, Math.floor(dias / 90) + 1);
}


/** Dia de fechamento do ciclo atual (90, 180, 270, 360, ...). */
export function diaFechamentoCiclo(cliente: Cliente, ref: Date = new Date()): number | null {
  const t = trimestreAtual(cliente, ref);
  return t === null ? null : t * 90;
}

/** Dias restantes até o fechamento do ciclo atual. */
export function diasAteFechamentoCiclo(cliente: Cliente, ref: Date = new Date()): number | null {
  const dias = diasDeJornada(cliente, ref);
  const alvo = diaFechamentoCiclo(cliente, ref);
  if (dias === null || alvo === null) return null;
  return alvo - dias;
}

/** Data prevista de fechamento do ciclo atual (ISO yyyy-mm-dd). */
export function dataFechamentoCiclo(cliente: Cliente, ref: Date = new Date()): string | null {
  const inicio = parseData(cliente.data_inicio);
  const alvo = diaFechamentoCiclo(cliente, ref);
  if (inicio === null || alvo === null) return null;
  return new Date(startOfDay(inicio) + alvo * DIA_MS).toISOString().slice(0, 10);
}

/** Total de reuniões com consultor efetivamente consumidas (status "Realizada"). */
export function reunioesConsultorConsumidas(cliente: Cliente): number {
  return (cliente.consultor_reunioes || []).filter((r) => r.status === "Realizada").length;
}

/** Total de reuniões com Galdino realizadas. */
export function reunioesGaldinoConsumidas(cliente: Cliente): number {
  return (cliente.ciclo_galdino_reunioes || []).filter((r) => r.status === "Realizada").length;
}

function diasDesde(iso: string | undefined, ref: Date): number | null {
  const t = parseData(iso);
  if (t === null) return null;
  return Math.max(0, Math.floor((startOfDay(ref.getTime()) - startOfDay(t)) / DIA_MS));
}

function ultimaData(datas: Array<string | undefined>): string | undefined {
  const validas = datas.filter((d): d is string => parseData(d) !== null);
  if (validas.length === 0) return undefined;
  return validas.sort((a, b) => parseData(b)! - parseData(a)!)[0];
}

/** Dias desde a última reunião realizada com consultor (null se nunca houve). */
export function diasDesdeUltimaReuniaoConsultor(
  cliente: Cliente,
  ref: Date = new Date(),
): number | null {
  const ultima = ultimaData(
    (cliente.consultor_reunioes || []).filter((r) => r.status === "Realizada").map((r) => r.data),
  );
  return diasDesde(ultima ?? cliente.ultima_reuniao_consultor, ref);
}

/** Dias desde a última reunião realizada com Galdino (null se nunca houve). */
export function diasDesdeUltimaReuniaoGaldino(
  cliente: Cliente,
  ref: Date = new Date(),
): number | null {
  const ultima = ultimaData(
    (cliente.ciclo_galdino_reunioes || [])
      .filter((r) => r.status === "Realizada")
      .map((r) => r.data_reuniao),
  );
  return diasDesde(ultima ?? cliente.ultima_reuniao_galdino, ref);
}

// ===== Leituras tolerantes a registros antigos =====

export function bcrmStatus(cliente: Cliente) {
  return cliente.bcrm_status_impl ?? "Não iniciado";
}

/** Black CRM recusado é escolha válida — não deve gerar alerta. */
export function bcrmGeraAlerta(cliente: Cliente): boolean {
  const s = bcrmStatus(cliente);
  return s !== "Recusado" && s !== "Ativo" && s !== "Implementado";
}

export function guardiaoEtapa(cliente: Cliente) {
  if (cliente.guardiao_ia_etapa) return cliente.guardiao_ia_etapa;
  return cliente.guardiao_ia ? "Atuando" : "Não definido";
}

/** Dias na etapa atual do Guardião de IA (null se não registrado). */
export function diasNaEtapaGuardiao(cliente: Cliente, ref: Date = new Date()): number | null {
  return diasDesde(cliente.guardiao_ia_etapa_desde, ref);
}

export function areaMembrosAcesso(cliente: Cliente) {
  const legado = cliente.area_membros === "ativo";
  return {
    cliente: cliente.area_membros_acesso_cliente ?? legado,
    equipe: cliente.area_membros_acesso_equipe ?? false,
    ultimo_acesso: cliente.area_membros_ultimo_acesso,
    dias_desde_ultimo_acesso: diasDesde(cliente.area_membros_ultimo_acesso, ref_now()),
  };
}

function ref_now() {
  return new Date();
}
