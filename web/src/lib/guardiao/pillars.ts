/**
 * Mapeamento entre o pillar do banco (não tocamos enum) e o nome
 * apresentado na UI. Atualizado para "Perfil do Guardião" v2.
 *
 * Observação: o pilar conhecimento_ia foi fundido em
 * "Adoção Tecnológica & Execução" conforme decisão do produto.
 */
export const PILLAR_LABEL: Record<string, string> = {
  curiosidade_implementacao: "Adoção às tecnologias",
  conhecimento_ia: "Adoção às tecnologias",
  visao_estrategica: "Visão de processo e resultado",
  protagonismo_engajamento: "Comunicação e liderança",
  etica_governanca: "Segurança e governança",
  adaptabilidade_resiliencia: "Gestão de mudança",
};

export const PILLAR_ORDER = [
  "curiosidade_implementacao",
  "visao_estrategica",
  "protagonismo_engajamento",
  "etica_governanca",
  "adaptabilidade_resiliencia",
] as const;

export function pillarLabel(key: string): string {
  return PILLAR_LABEL[key] ?? key;
}

/**
 * Agrega pillar_scores do banco para os 5 pilares oficiais,
 * fundindo conhecimento_ia em curiosidade_implementacao.
 */
export function aggregatePillarScores(
  raw: Record<string, { pct?: number; points?: number; max?: number; sum?: number; mx?: number }> | null | undefined,
): Array<{ key: string; label: string; pct: number }> {
  if (!raw) return PILLAR_ORDER.map((k) => ({ key: k, label: PILLAR_LABEL[k], pct: 0 }));

  const acc: Record<string, { sum: number; max: number }> = {};
  for (const [k, v] of Object.entries(raw)) {
    const target =
      k === "conhecimento_ia" ? "curiosidade_implementacao" : k;
    if (!PILLAR_ORDER.includes(target as any)) continue;
    acc[target] = acc[target] ?? { sum: 0, max: 0 };
    const points = Number(v?.points ?? v?.sum ?? 0);
    const max = Number(v?.max ?? v?.mx ?? 0);
    acc[target].sum += points;
    acc[target].max += max;
  }

  return PILLAR_ORDER.map((k) => {
    const a = acc[k];
    const pct = a && a.max > 0 ? Math.round((a.sum / a.max) * 1000) / 10 : 0;
    return { key: k, label: PILLAR_LABEL[k], pct };
  });
}

export type Verdict = {
  level: 1 | 2 | 3;
  label: string;
  message: string;
  tone: "success" | "warning" | "danger";
  internalBadge: string;
};

export function getVerdict(scorePct: number): Verdict {
  if (scorePct >= 75) {
    return {
      level: 1,
      label: "Guardião Pronto",
      message:
        "Este candidato tem o perfil para assumir o papel de Guardião da IA. Recomendamos iniciar o processo de formação imediatamente.",
      tone: "success",
      internalBadge: "RECOMENDADO PARA ENTREVISTA",
    };
  }
  if (scorePct >= 50) {
    return {
      level: 2,
      label: "Guardião em Formação",
      message:
        "Este candidato tem potencial, mas precisa de acompanhamento e desenvolvimento em alguns pilares antes de assumir o papel.",
      tone: "warning",
      internalBadge: "POTENCIAL — AVALIAR COM GESTOR",
    };
  }
  return {
    level: 3,
    label: "Perfil a Desenvolver",
    message:
      "Este candidato ainda não está pronto para o papel de Guardião. Recomendamos avaliar outro candidato ou estruturar um plano de desenvolvimento.",
    tone: "danger",
    internalBadge: "NÃO RECOMENDADO NESTE MOMENTO",
  };
}

export function getNextSteps(level: 1 | 2 | 3): string {
  if (level === 1) return "Agende uma sessão com seu CS para iniciar a trilha do Guardião da IA.";
  if (level === 2) return "Compartilhe este resultado com seu CS e defina um plano de acompanhamento personalizado.";
  return "Considere avaliar outro candidato ou agende uma sessão estratégica com Galdino.";
}
