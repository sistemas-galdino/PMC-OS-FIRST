import { createAtividade, getAtividades } from "./store";
import { guardiaoAtivo } from "./alertas-catalogo";
import { dataFechamentoCiclo } from "./jornada";
import type { Cliente } from "./types";

/**
 * Fluxo de entregas de finalização de ciclo (T1 a T4).
 * Somente leitura de dados existentes + criação de atividades preparatórias.
 */

export interface EntregaCiclo {
  trimestre: number;
  titulo: string;
  tarefa: string;
  responsavel: string;
  o_que_fazer: string;
  pre_requisito: string;
  comprovacao: string;
  nota?: string;
  /** Atividades que precisam ser feitas ANTES do fechamento do ciclo. */
  preparacao: { titulo: string; dias_antes: number }[];
}

export const ENTREGAS_CICLO: Record<number, EntregaCiclo> = {
  1: {
    trimestre: 1,
    titulo: "Call de fechamento de ciclo com dono + Guardião de IA",
    tarefa: "Call de fechamento de ciclo com dono + Guardião de IA",
    responsavel: "CS da carteira",
    o_que_fazer:
      "Agendar e conduzir call com o dono da empresa e o Guardião de IA para captar depoimentos e as implementações realizadas. Dependendo do contexto do cliente, aplicar as perguntas de estudo de caso do POP de coleta de provas.",
    pre_requisito:
      "Guardião de IA designado. Cliente que chega no D+90 sem Guardião já é flag de risco — a tarefa sobe com alerta, não trava.",
    comprovacao: "Link da gravação + depoimentos captados + lista de implementações registrada.",
    nota:
      "Essa é a tarefa que sustenta todas as outras: é aqui que nasce a matéria-prima do infográfico do T2 e boa parte do Dossiê do T4.",
    preparacao: [
      { titulo: "Confirmar Guardião de IA designado (pré-requisito da call do T1)", dias_antes: 30 },
      { titulo: "Levantar implementações realizadas no T1", dias_antes: 21 },
      { titulo: "Preparar roteiro do POP de coleta de provas / estudo de caso", dias_antes: 14 },
      { titulo: "Agendar call de fechamento com dono + Guardião de IA", dias_antes: 14 },
      { titulo: "Conduzir call e gravar (link da gravação + depoimentos)", dias_antes: 3 },
    ],
  },
  2: {
    trimestre: 2,
    titulo: "Enviar Infográfico de Reconhecimento do 1º trimestre",
    tarefa: "Enviar Infográfico de Reconhecimento do 1º trimestre",
    responsavel: "CS entrega; produção do material precisa de dono definido",
    o_que_fazer:
      "Enviar o infográfico que consolida o 1º trimestre — o primeiro grande pico de valor percebido, ancorado agora com mais contexto da jornada percorrida.",
    pre_requisito: "Call do T1 realizada. Sem ela não existe conteúdo para o infográfico.",
    comprovacao: "Infográfico anexado + confirmação de envio ao cliente.",
    nota:
      "Defasamento intencional: o material é do T1, mas entregue no fecho do T2. Não 'corrigir' isso na automação.",
    preparacao: [
      { titulo: "Confirmar que a call do T1 foi realizada e o material está registrado", dias_antes: 30 },
      { titulo: "Definir dono da produção do infográfico do T1", dias_antes: 30 },
      { titulo: "Enviar insumos (depoimentos + implementações) para a produção", dias_antes: 21 },
      { titulo: "Revisar infográfico com a CS antes do envio", dias_antes: 10 },
      { titulo: "Enviar infográfico ao cliente e confirmar recebimento", dias_antes: 3 },
    ],
  },
  3: {
    trimestre: 3,
    titulo: "Entregar Raio-X de Maturidade em IA",
    tarefa: "Entregar Raio-X de Maturidade em IA",
    responsavel: "CS entrega; diagnóstico produzido com base no assessment do Guardião",
    o_que_fazer:
      "Diagnóstico visual que posiciona a empresa num nível de maturidade e mostra o próximo patamar. Objetivo: provar que ainda há muito a conquistar e transformar o platô em ponto de partida para a escala.",
    pre_requisito: "Assessment do Guardião realizado.",
    comprovacao: "Raio-X anexado + registro do nível de maturidade apurado.",
    preparacao: [
      { titulo: "Aplicar assessment de maturidade com o Guardião de IA", dias_antes: 30 },
      { titulo: "Consolidar respostas e apurar o nível de maturidade", dias_antes: 21 },
      { titulo: "Produzir o Raio-X de Maturidade em IA (visual)", dias_antes: 14 },
      { titulo: "Apresentar o Raio-X ao cliente e registrar o nível apurado", dias_antes: 3 },
    ],
  },
  4: {
    trimestre: 4,
    titulo: "Entregar Dossiê de Transformação",
    tarefa: "Entregar Dossiê de Transformação",
    responsavel: "CS entrega; produção premium com dono definido",
    o_que_fazer:
      "Material que consolida os 12 meses em números de antes e depois, automações ativas, marcos vencidos e depoimentos da equipe. Objetivo: tornar a transformação inegável e marcar o fechamento como rito de passagem.",
    pre_requisito: "T1, T2 e T3 concluídos — o Dossiê é a soma deles.",
    comprovacao: "Dossiê anexado + confirmação de entrega.",
    preparacao: [
      { titulo: "Conferir T1, T2 e T3 concluídos (pré-requisito do Dossiê)", dias_antes: 45 },
      { titulo: "Levantar números de antes e depois + automações ativas", dias_antes: 35 },
      { titulo: "Captar depoimentos finais da equipe do cliente", dias_antes: 28 },
      { titulo: "Definir dono da produção premium do Dossiê", dias_antes: 28 },
      { titulo: "Revisar o Dossiê antes da entrega", dias_antes: 10 },
      { titulo: "Entregar o Dossiê e confirmar recebimento", dias_antes: 3 },
    ],
  },
};

export function labelPreparacao(trimestre: number, titulo: string): string {
  return `Preparação de ciclo · T${trimestre} · ${titulo}`;
}

/** Pré-requisito atendido? (checagem leve, só para sinalizar risco) */
export function preRequisitoOk(cliente: Cliente, trimestre: number): boolean {
  if (trimestre === 1) return guardiaoAtivo(cliente);
  return true;
}

const DIA_MS = 86400000;

function dataPrevista(cliente: Cliente, diasAntes: number, ref: Date): string {
  const fech = dataFechamentoCiclo(cliente, ref);
  const base = fech ? new Date(`${fech}T00:00:00`).getTime() : ref.getTime();
  const alvo = Math.max(base - diasAntes * DIA_MS, ref.getTime());
  return new Date(alvo).toISOString().slice(0, 10);
}

/** Quantas atividades preparatórias do trimestre já existem para o cliente. */
export function contarPreparacaoExistente(clienteId: string, trimestre: number): number {
  const entrega = ENTREGAS_CICLO[trimestre];
  if (!entrega) return 0;
  const atividades = getAtividades();
  return entrega.preparacao.filter((p) =>
    atividades.some((a) => a.cliente_id === clienteId && a.origem_label === labelPreparacao(trimestre, p.titulo)),
  ).length;
}

/**
 * Cria as atividades preparatórias do trimestre para os clientes informados.
 * Trava de duplicidade por origem_label. Retorna quantas foram criadas.
 */
export async function criarPreparacaoCicloLote(
  clientes: Cliente[],
  trimestre: number,
  ref: Date = new Date(),
): Promise<number> {
  const entrega = ENTREGAS_CICLO[trimestre];
  if (!entrega) return 0;
  const atividades = getAtividades();
  let criadas = 0;

  for (const cliente of clientes) {
    for (const p of entrega.preparacao) {
      const label = labelPreparacao(trimestre, p.titulo);
      const jaExiste = atividades.some((a) => a.cliente_id === cliente.id && a.origem_label === label);
      if (jaExiste) continue;
      await createAtividade({
        cliente_id: cliente.id,
        cs_responsavel: cliente.responsavel_cs,
        titulo: p.titulo,
        tipo: "Outro",
        prioridade: "Médio",
        descricao: `Preparação para o fechamento do T${trimestre} · ${entrega.tarefa}. Comprovação: ${entrega.comprovacao}`,
        data_prevista: dataPrevista(cliente, p.dias_antes, ref),
        status: "Pendente",
        origem: "checkpoint_ciclo",
        origem_label: label,
      });
      criadas += 1;
    }
  }

  return criadas;
}
