/**
 * Geração determinística do Mini Relatório Executivo
 * do Perfil do Guardião de IA.
 *
 * Baseado 100% nas respostas/pesos/pilares vindos do banco.
 * Sem IA generativa, sem DISC, sem análise comportamental genérica.
 */

import { aggregatePillarScores } from "./pillars";

export type ReportBand = "abaixo_70" | "entre_70_79" | "acima_80";

export type ReportStatus = {
  band: ReportBand;
  label: string;
  tone: "danger" | "warning" | "success";
};

export type PillarClass = "forte" | "adequado" | "atencao";

export type ReportPillar = {
  key: string;
  label: string;
  pct: number;
  classification: PillarClass;
  analysis: string;
};

export type ExecutiveReport = {
  status: ReportStatus;
  summary: string;
  pillars: ReportPillar[];
  strengths: string[];
  developmentPoints: string[];
  recommendation: string;
  nextSteps: string[];
};

export function getStatus(scorePct: number): ReportStatus {
  if (scorePct >= 80) {
    return {
      band: "acima_80",
      label: "Forte potencial para assumir como Guardião de IA",
      tone: "success",
    };
  }
  if (scorePct >= 70) {
    return {
      band: "entre_70_79",
      label: "Potencial recomendado com pontos de desenvolvimento",
      tone: "warning",
    };
  }
  return {
    band: "abaixo_70",
    label: "Ainda não recomendado para assumir como Guardião de IA",
    tone: "danger",
  };
}

function classifyPillar(pct: number): PillarClass {
  if (pct >= 75) return "forte";
  if (pct >= 60) return "adequado";
  return "atencao";
}

const PILLAR_ANALYSIS: Record<string, { alta: string; media: string; baixa: string }> = {
  curiosidade_implementacao: {
    alta: "A pessoa demonstra boa abertura para tecnologia, com tendência a buscar, testar e aplicar novas ferramentas de forma prática.",
    media: "A pessoa demonstra abertura razoável para tecnologia, mas ainda pode ampliar a iniciativa para testar e aplicar novas ferramentas no dia a dia.",
    baixa: "As respostas indicam que a pessoa ainda pode ter baixa iniciativa para buscar ou testar novas tecnologias, o que pode limitar sua atuação como Guardião de IA.",
  },
  visao_estrategica: {
    alta: "A pessoa demonstra capacidade de conectar o uso da tecnologia com melhoria de processos, produtividade e resultado prático para a empresa.",
    media: "A pessoa demonstra alguma visão de processo, mas ainda pode evoluir para transformar tecnologia em ganho operacional consistente.",
    baixa: "As respostas indicam que a pessoa ainda precisa desenvolver melhor a visão de processo e resultado, principalmente para transformar ferramentas em rotina operacional.",
  },
  protagonismo_engajamento: {
    alta: "A pessoa demonstra potencial para comunicar mudanças, orientar o time e apoiar a adoção de novas práticas dentro da empresa.",
    media: "A pessoa demonstra disposição para se comunicar com o time, mas ainda pode desenvolver mais liderança e influência em momentos de mudança.",
    baixa: "As respostas indicam que a pessoa pode ter dificuldade em engajar o time, explicar mudanças ou liderar pessoas durante o processo de implementação.",
  },
  etica_governanca: {
    alta: "A pessoa demonstra responsabilidade no uso de informações, atenção a regras e preocupação com segurança e governança no uso da IA.",
    media: "A pessoa demonstra cuidado parcial com segurança e governança, mas ainda pode reforçar boas práticas no uso responsável da IA.",
    baixa: "As respostas indicam que a pessoa ainda precisa desenvolver mais atenção à segurança, governança e uso responsável das ferramentas de IA.",
  },
  adaptabilidade_resiliencia: {
    alta: "A pessoa demonstra boa capacidade de lidar com mudanças, testar soluções, ajustar processos e sustentar a evolução da implementação.",
    media: "A pessoa demonstra alguma adaptabilidade, mas ainda pode desenvolver constância para sustentar mudanças no longo prazo.",
    baixa: "As respostas indicam que a pessoa pode ter dificuldade em conduzir mudanças, lidar com resistência ou manter constância na implementação de novas práticas.",
  },
};

function pillarAnalysis(key: string, cls: PillarClass): string {
  const t = PILLAR_ANALYSIS[key];
  if (!t) return "";
  if (cls === "forte") return t.alta;
  if (cls === "adequado") return t.media;
  return t.baixa;
}

const STRENGTH_BY_PILLAR: Record<string, string> = {
  curiosidade_implementacao: "Boa abertura para aprender e testar novas tecnologias.",
  visao_estrategica: "Capacidade de conectar ferramentas com melhoria de processos e resultados.",
  protagonismo_engajamento: "Potencial para apoiar o time e influenciar a adoção de novas práticas.",
  etica_governanca: "Responsabilidade no uso de informações e atenção à segurança e governança.",
  adaptabilidade_resiliencia: "Boa capacidade de lidar com mudanças e sustentar a evolução da implementação.",
};

const DEV_BY_PILLAR_LOW: Record<string, string> = {
  curiosidade_implementacao: "Aumentar a iniciativa para buscar e testar soluções de IA de forma autônoma.",
  visao_estrategica: "Melhorar a visão de processo para transformar ferramentas em rotina prática.",
  protagonismo_engajamento: "Desenvolver maior capacidade de comunicação e influência sobre o time.",
  etica_governanca: "Fortalecer a atenção à segurança, governança e uso responsável da IA.",
  adaptabilidade_resiliencia: "Construir mais constância para conduzir mudanças e ajustar rota quando necessário.",
};

const DEV_BY_PILLAR_MID: Record<string, string> = {
  curiosidade_implementacao: "Ampliar a iniciativa para propor e testar novas soluções de IA na rotina.",
  visao_estrategica: "Desenvolver mais clareza para conectar IA a indicadores e ganhos operacionais.",
  protagonismo_engajamento: "Fortalecer a comunicação com o time durante mudanças de processo.",
  etica_governanca: "Criar maior disciplina para documentar aprendizados e padrões de uso da IA.",
  adaptabilidade_resiliencia: "Melhorar a constância na implementação e no acompanhamento de novas práticas.",
};

function joinNamesPt(names: string[]): string {
  if (names.length === 0) return "";
  if (names.length === 1) return names[0];
  if (names.length === 2) return `${names[0]} e ${names[1]}`;
  return `${names.slice(0, -1).join(", ")} e ${names[names.length - 1]}`;
}

export function buildReport(
  candidateName: string,
  scorePct: number,
  pillarScoresRaw: any,
): ExecutiveReport {
  const name = (candidateName || "O candidato").trim();
  const pct = Math.round(Number(scorePct || 0) * 10) / 10;
  const status = getStatus(pct);

  const aggregated = aggregatePillarScores(pillarScoresRaw);
  const pillars: ReportPillar[] = aggregated.map((p) => {
    const cls = classifyPillar(p.pct);
    return {
      key: p.key,
      label: p.label,
      pct: p.pct,
      classification: cls,
      analysis: pillarAnalysis(p.key, cls),
    };
  });

  const sortedDesc = [...pillars].sort((a, b) => b.pct - a.pct);
  const sortedAsc = [...pillars].sort((a, b) => a.pct - b.pct);

  const strongPillars = pillars.filter((p) => p.classification === "forte");
  const weakPillars = pillars.filter((p) => p.classification === "atencao");

  // Fallback: se não houver pilares "fortes", pega os 2 maiores.
  const strengthsSource = strongPillars.length ? strongPillars : sortedDesc.slice(0, 2);
  // Fallback: se não houver pilares "atenção", pega os 2 menores.
  const devSource = weakPillars.length ? weakPillars : sortedAsc.slice(0, 2);

  const strengths = strengthsSource
    .map((p) => STRENGTH_BY_PILLAR[p.key])
    .filter(Boolean)
    .slice(0, 4);

  const devTable = status.band === "abaixo_70" ? DEV_BY_PILLAR_LOW : DEV_BY_PILLAR_MID;
  const developmentPoints = devSource
    .map((p) => devTable[p.key])
    .filter(Boolean)
    .slice(0, 4);

  const fortesNomes = joinNamesPt(strengthsSource.map((p) => p.label.toLowerCase()));
  const baixosNomes = joinNamesPt(devSource.map((p) => p.label.toLowerCase()));

  // Resumo executivo
  let summary = "";
  if (status.band === "abaixo_70") {
    summary =
      `Com base nas respostas da avaliação, ${name} apresentou uma aderência de ${pct}% ao perfil esperado para o Guardião de IA. ` +
      `Esse resultado indica que, neste momento, a pessoa ainda não demonstra consistência suficiente nos pilares essenciais para liderar a implementação de IA dentro da empresa. ` +
      `Apesar de apresentar alguns pontos positivos${fortesNomes ? ` em ${fortesNomes}` : ""}, as respostas indicam oportunidades de desenvolvimento em ${baixosNomes || "alguns pilares"}. ` +
      `O ideal é que essa pessoa seja acompanhada, treinada e reavaliada futuramente, ou que participe do processo em uma função de apoio, e não como responsável principal.`;
  } else if (status.band === "entre_70_79") {
    summary =
      `Com base nas respostas da avaliação, ${name} apresentou uma aderência de ${pct}% ao perfil esperado para o Guardião de IA. ` +
      `Esse resultado indica que a pessoa possui potencial para atuar no papel, principalmente se tiver clareza de responsabilidades, acompanhamento inicial e validação prática por meio de um case. ` +
      `As respostas demonstram boa aderência em ${fortesNomes || "alguns pilares importantes"}, mas ainda existem pontos de atenção em ${baixosNomes || "outros pilares"}, que precisam ser observados antes da decisão final.`;
  } else {
    summary =
      `Com base nas respostas da avaliação, ${name} apresentou uma aderência de ${pct}% ao perfil esperado para o Guardião de IA. ` +
      `Esse resultado indica forte potencial para assumir o papel de Guardião de IA dentro da empresa. ` +
      `As respostas demonstram boa combinação entre abertura para tecnologia, visão prática, responsabilidade, capacidade de execução e potencial para conduzir mudanças${fortesNomes ? `, com destaque para ${fortesNomes}` : ""}. ` +
      `Recomendamos que a pessoa avance para uma etapa prática, como apresentação de um case ou entrevista final.`;
  }

  // Recomendação final
  let recommendation = "";
  if (status.band === "abaixo_70") {
    recommendation =
      `Neste momento, não recomendamos que ${name} assuma como Guardião principal de IA. ` +
      `As respostas indicam que ainda existem lacunas importantes em pilares essenciais para o papel, especialmente em ${baixosNomes || "alguns pilares"}. ` +
      `A pessoa pode participar como apoio no processo de implementação, mas recomendamos desenvolvimento, acompanhamento e uma nova avaliação antes de assumir a liderança da frente de IA.`;
  } else if (status.band === "entre_70_79") {
    recommendation =
      `${name} possui potencial para seguir no processo, mas recomendamos validação prática antes da decisão final. ` +
      `As respostas indicam boa aderência em ${fortesNomes || "alguns pilares"}, mas ainda existem pontos de atenção em ${baixosNomes || "outros pilares"}. ` +
      `O ideal é aplicar um case prático relacionado à rotina da empresa para avaliar raciocínio, organização, execução, comunicação e capacidade de transformar IA em processo.`;
  } else {
    recommendation =
      `${name} possui forte potencial para assumir o papel de Guardião de IA. ` +
      `As respostas indicam consistência nos principais pilares avaliados${fortesNomes ? `, especialmente em ${fortesNomes}` : ""}. ` +
      `Recomendamos avançar para entrevista final e case prático, validando sua capacidade de transformar esse potencial em execução dentro da realidade da empresa.`;
  }

  // Próximos passos
  let nextSteps: string[] = [];
  if (status.band === "abaixo_70") {
    nextSteps = [
      "Não avançar para contratação ou escolha imediata como Guardião principal.",
      "Indicar treinamento e desenvolvimento nos pilares com menor pontuação.",
      "Permitir participação como apoio no processo de implementação.",
      "Reavaliar futuramente após plano de desenvolvimento.",
    ];
  } else if (status.band === "entre_70_79") {
    nextSteps = [
      "Enviar case prático relacionado à rotina da empresa.",
      "Fazer entrevista de validação focada nos pilares de atenção.",
      "Avaliar maturidade na execução, não apenas no discurso.",
      "Observar de perto os pilares com menor pontuação antes da decisão final.",
    ];
  } else {
    nextSteps = [
      "Avançar para entrevista final.",
      "Aplicar case prático conectado à realidade da empresa.",
      "Considerar a pessoa como forte candidata ao papel de Guardião.",
      "Validar alinhamento com a cultura e a rotina da empresa.",
    ];
  }

  return {
    status,
    summary,
    pillars,
    strengths,
    developmentPoints,
    recommendation,
    nextSteps,
  };
}
