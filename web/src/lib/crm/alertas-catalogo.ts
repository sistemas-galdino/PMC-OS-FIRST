import type { Atividade, Cliente } from "./types";
import {
  areaMembrosAcesso,
  diasAteFechamentoCiclo,
  diasDeJornada,
  diasDesdeUltimaReuniaoConsultor,
  diasNaEtapaGuardiao,
  guardiaoEtapa,
  reunioesConsultorConsumidas,
  temRelogioDeCiclo,
  trimestreAtual,
} from "./jornada";

/**
 * Catálogo de alertas de entrega do programa.
 * Único arquivo editável: cada alerta é apenas leitura do estado ATUAL do
 * cliente — não há histórico nem rastreamento próprio aqui.
 */

// ===== Limiares (editáveis) =====
/** Dias sem reunião com consultor antes de alertar. */
export const LIMIAR_DIAS_SEM_CONSULTOR = 30;
/** Dias sem contato de valor registrado pela CS (o manual define no máximo 14). */
export const LIMIAR_DIAS_SEM_CONTATO = 14;
/** Dias sem acesso registrado à área de membros. */
export const LIMIAR_DIAS_SEM_ACESSO_MEMBROS = 20;
/** Dias restantes até o fechamento do trimestre para abrir a janela de fechamento. */
export const LIMIAR_DIAS_FECHAMENTO_CICLO = 30;

/** Total de reuniões com consultor contratadas no programa. */
export const REUNIOES_CONSULTOR_CONTRATADAS = 21;

export type AlertaEntregaId =
  | "guardiao_pendente"
  | "sem_reuniao_consultor"
  | "sem_reuniao_galdino_trimestre"
  | "sem_contato_valor"
  | "sem_acesso_area_membros"
  | "fechamento_ciclo";

/** Ação (e título da atividade) de fechamento por trimestre. */
export const ACAO_FECHAMENTO_POR_TRIMESTRE: Record<number, string> = {
  1: "Agendar reunião de fechamento do ciclo",
  2: "Organizar o Infográfico da Jornada de Sucesso",
  3: "Organizar o Raio-X de Maturidade em IA",
  4: "Organizar o Dossiê de Transformação",
};

export function acaoFechamentoCiclo(trimestre: number): string {
  return ACAO_FECHAMENTO_POR_TRIMESTRE[trimestre] ?? ACAO_FECHAMENTO_POR_TRIMESTRE[4];
}

export interface AlertaEntrega {
  id: AlertaEntregaId;
  titulo: string;
  contexto: string;
  acao: string;
  /** Há quantos dias o alerta existe (usado para ordenação). */
  idade_dias: number;
}

export interface AlertaContexto {
  /** Atividades do cliente — usadas para o último contato registrado pela CS. */
  atividades?: Atividade[];
  ref?: Date;
}

const DIA_MS = 86400000;

function startOfDay(t: number): number {
  const d = new Date(t);
  d.setHours(0, 0, 0, 0);
  return d.getTime();
}

function parseData(iso?: string): number | null {
  if (!iso) return null;
  const t = new Date(iso).getTime();
  return Number.isNaN(t) ? null : t;
}

/**
 * `guardiao_ia_etapa` é a fonte de verdade.
 * O booleano `guardiao_ia` passa a ser DERIVADO da etapa.
 */
export function guardiaoAtivo(cliente: Cliente): boolean {
  const etapa = guardiaoEtapa(cliente);
  return etapa === "Definido" || etapa === "Atuando";
}

/** Dias desde o último contato registrado pela CS (atividade concluída). */
export function diasDesdeContatoValor(
  cliente: Cliente,
  atividades: Atividade[] = [],
  ref: Date = new Date(),
): number | null {
  const datas = atividades
    .filter((a) => a.cliente_id === cliente.id && a.status === "Concluída")
    .map((a) => parseData(a.data_conclusao))
    .filter((t): t is number => t !== null);
  if (datas.length === 0) return null;
  const ultima = Math.max(...datas);
  return Math.max(0, Math.floor((startOfDay(ref.getTime()) - startOfDay(ultima)) / DIA_MS));
}

/** Houve reunião com Galdino realizada dentro do trimestre atual? */
export function temReuniaoGaldinoNoTrimestre(cliente: Cliente, ref: Date = new Date()): boolean {
  const inicio = parseData(cliente.data_inicio);
  const t = trimestreAtual(cliente, ref);
  if (inicio === null || t === null) return false;
  const inicioTri = startOfDay(inicio) + (t - 1) * 90 * DIA_MS;
  const fimTri = startOfDay(inicio) + t * 90 * DIA_MS;
  return (cliente.ciclo_galdino_reunioes || []).some((r) => {
    if (r.status !== "Realizada") return false;
    const d = parseData(r.data_reuniao);
    return d !== null && d >= inicioTri && d < fimTri;
  });
}

/** Avalia todos os alertas de entrega para um cliente. */
export function alertasEntrega(cliente: Cliente, ctx: AlertaContexto = {}): AlertaEntrega[] {
  const ref = ctx.ref ?? new Date();
  const out: AlertaEntrega[] = [];

  // Sem relógio de ciclo: cliente que não iniciou o programa ou cancelado
  // não gera alerta.
  if (!temRelogioDeCiclo(cliente)) return out;

  // 1. Guardião pendente
  const etapa = guardiaoEtapa(cliente);
  if (etapa === "Não definido" || etapa === "Em definição") {
    const dias = diasNaEtapaGuardiao(cliente, ref);
    out.push({
      id: "guardiao_pendente",
      titulo: "Guardião pendente",
      contexto: dias === null ? etapa : `${etapa} há ${dias} dias`,
      acao: "Cobrar definição do Guardião",
      idade_dias: dias ?? 0,
    });
  }

  // 2. Sem reunião com consultor
  const diasConsultor = diasDesdeUltimaReuniaoConsultor(cliente, ref);
  if (diasConsultor !== null && diasConsultor > LIMIAR_DIAS_SEM_CONSULTOR) {
    out.push({
      id: "sem_reuniao_consultor",
      titulo: "Sem reunião com consultor",
      contexto: `há ${diasConsultor} dias · ${reunioesConsultorConsumidas(cliente)} de ${REUNIOES_CONSULTOR_CONTRATADAS} reuniões contratadas`,
      acao: "Agendar reunião com consultor",
      idade_dias: diasConsultor,
    });
  }

  // 3. Sem reunião com Galdino no trimestre
  const tri = trimestreAtual(cliente, ref);
  if (tri !== null && !temReuniaoGaldinoNoTrimestre(cliente, ref)) {
    const faltam = diasAteFechamentoCiclo(cliente, ref);
    out.push({
      id: "sem_reuniao_galdino_trimestre",
      titulo: "Sem reunião com Galdino no trimestre",
      contexto: `T${tri} fecha em ${faltam ?? 0} dias`,
      acao: "Agendar reunião com Galdino",
      idade_dias: Math.max(0, 90 - (faltam ?? 90)),
    });
  }

  // 4. Sem contato de valor
  const diasContato = diasDesdeContatoValor(cliente, ctx.atividades ?? [], ref);
  const diasSemContato = diasContato ?? diasDeJornada(cliente, ref);
  if (diasSemContato !== null && diasSemContato > LIMIAR_DIAS_SEM_CONTATO) {
    out.push({
      id: "sem_contato_valor",
      titulo: "Sem contato de valor",
      contexto: `há ${diasSemContato} dias · o manual define no máximo ${LIMIAR_DIAS_SEM_CONTATO}`,
      acao: "Fazer contato de valor",
      idade_dias: diasSemContato,
    });
  }

  // 5. Sem acesso à área de membros
  const acesso = areaMembrosAcesso(cliente);
  const diasAcesso = acesso.dias_desde_ultimo_acesso;
  const semAcessoEquipe = !acesso.equipe;
  const semAcessoCliente = !acesso.cliente;
  const acessoVelho = diasAcesso !== null && diasAcesso > LIMIAR_DIAS_SEM_ACESSO_MEMBROS;
  if (semAcessoCliente || semAcessoEquipe || acessoVelho) {
    const contexto = semAcessoEquipe
      ? "equipe sem acesso"
      : semAcessoCliente
        ? "cliente sem acesso"
        : `sem acesso há ${diasAcesso} dias`;
    out.push({
      id: "sem_acesso_area_membros",
      titulo: "Sem acesso à área de membros",
      contexto,
      acao: "Liberar ou reativar acesso",
      idade_dias: diasAcesso ?? 0,
    });
  }

  // 6. Fechamento de ciclo (janela de 30 dias antes do fechamento do trimestre)
  const faltamFech = diasAteFechamentoCiclo(cliente, ref);
  if (tri !== null && faltamFech !== null && faltamFech <= LIMIAR_DIAS_FECHAMENTO_CICLO && faltamFech >= 0) {
    out.push({
      id: "fechamento_ciclo",
      titulo: `Fechamento do T${tri} em ${faltamFech} dias`,
      contexto: `T${tri} · fecha em ${faltamFech} dias`,
      acao: acaoFechamentoCiclo(tri),
      idade_dias: LIMIAR_DIAS_FECHAMENTO_CICLO - faltamFech,
    });
  }

  return out;
}
