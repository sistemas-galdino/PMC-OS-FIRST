import type { ItemPreparacao, PreparacaoResponsavel, Reuniao } from "./types";

type Modelo = {
  descricao: string;
  responsavel: PreparacaoResponsavel;
  acao_label?: string;
};

/** Tipo de responsável externo da reunião do cliente com terceiros */
export type TipoPreparacao = "consultor_primeira" | "consultor_demais" | "david" | "galdino";

export const CHECKLIST_PADRAO: Record<TipoPreparacao, Modelo[]> = {
  consultor_primeira: [
    { descricao: "Relatório enviado ao consultor", responsavel: "CS", acao_label: "Enviar" },
    { descricao: "Contexto do cliente compartilhado", responsavel: "CS", acao_label: "Enviar" },
    { descricao: "Cliente confirmou presença", responsavel: "Cliente", acao_label: "Confirmar" },
  ],
  consultor_demais: [
    { descricao: "Cliente enviou o material solicitado", responsavel: "Cliente", acao_label: "Cobrar" },
    { descricao: "Consultor alinhado com o suporte", responsavel: "Consultor", acao_label: "Confirmar" },
  ],
  david: [
    { descricao: "Cliente enviou o material", responsavel: "Cliente", acao_label: "Cobrar" },
    { descricao: "Acesso liberado", responsavel: "Interno", acao_label: "Confirmar" },
  ],
  galdino: [
    { descricao: "Pauta do ciclo preenchida", responsavel: "CS", acao_label: "Enviar" },
    { descricao: "Cliente ciente da pauta", responsavel: "Cliente", acao_label: "Confirmar" },
  ],
};

function novoId() {
  return `prep_${Math.random().toString(36).slice(2, 10)}`;
}

/** Resolve qual checklist usar a partir do responsável externo e do número da reunião */
export function resolverTipoPreparacao(
  responsavelExterno?: string,
  numeroReuniao?: number,
): TipoPreparacao {
  const nome = (responsavelExterno ?? "").trim().toLowerCase();
  if (nome === "galdino") return "galdino";
  if (nome === "david") return "david";
  return (numeroReuniao ?? 1) <= 1 ? "consultor_primeira" : "consultor_demais";
}

/** Gera os itens de preparação padrão para uma reunião de cliente com terceiro */
export function criarPreparacaoPadrao(
  responsavelExterno?: string,
  numeroReuniao?: number,
): ItemPreparacao[] {
  const tipo = resolverTipoPreparacao(responsavelExterno, numeroReuniao);
  return CHECKLIST_PADRAO[tipo].map((m) => ({
    id: novoId(),
    descricao: m.descricao,
    responsavel: m.responsavel,
    status: "Pendente" as const,
    acao_label: m.acao_label,
  }));
}

/** Item em branco para a CS adicionar manualmente */
export function novoItemPreparacao(
  descricao = "",
  responsavel: PreparacaoResponsavel = "CS",
): ItemPreparacao {
  return { id: novoId(), descricao, responsavel, status: "Pendente" };
}

/** Garante preparação nas reuniões sem CS que ainda não têm checklist */
export function garantirPreparacao(r: Reuniao): Reuniao {
  if (r.participacao_cs !== "Nao participa") return r;
  if (r.preparacao && r.preparacao.length > 0) return r;
  return { ...r, preparacao: criarPreparacaoPadrao(r.responsavel_externo, r.numero_reuniao) };
}
