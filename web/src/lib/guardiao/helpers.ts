// Pure selectors/helpers + persistence-agnostic default factories.
// Selectors copied verbatim from IA-Guardian-Hub/src/lib/store.ts.

import type {
  State,
  Fase,
  FaseEstado,
  Jornada,
  GuardiaoPerfil,
  ResumoSemana,
  FrequenciaRepetitiva,
  Vitoria,
  Gargalo,
} from "./types";
import {
  CHECKLIST_FASE,
  EVIDENCIAS_OBRIGATORIAS,
  FASES,
  PROMPT_PADRAO,
  PROMPTS_FASE_PADRAO,
} from "./constants";

// ---------- Default factories ----------
export function defaultJornada(): Jornada {
  const fases = {} as Record<Fase, FaseEstado>;
  ([1, 2, 3, 4, 5, 6, 7] as Fase[]).forEach((n) => {
    fases[n] = {
      status: n === 1 ? "Não iniciada" : n === 7 ? "Não iniciada" : "Bloqueada",
      progresso: 0, observacoes: "", feedbackCS: "", checklist: {},
      setoresEnvolvidos: [], resultadoAlcancado: "", resumoCEO: "", proximaAcao: "",
    };
  });
  return { faseAtual: 1, fases };
}

export function defaultGuardiao(): GuardiaoPerfil {
  return {
    nomePrincipal: "", cargo: "", setor: "", email: "", telefone: "",
    lider: "", ceo: "", reserva: "", modeloEmpresa: "", colaboradores: "",
    maturidade: "", ferramentas: "", dificuldades: "",
    habilidades: { adocao: 3, visao: 3, comunicacao: 3, responsabilidade: 3, mudanca: 3 },
  };
}

export function emptyResumo(): ResumoSemana {
  return {
    setorPrioritario: "", principalGargalo: "", projetoAndamento: "",
    proximaAcao: "", apoioCEO: "", apoioPMC: "",
  };
}

// Empty (pre-hydration) State — replaces the localStorage seed of the source store.
export function emptyState(): State {
  return {
    setores: [],
    gargalos: [],
    projetos: [],
    tarefas: [],
    rituais: [],
    exemplosCS: [],
    resumo: emptyResumo(),
    relatorios: [],
    promptCompleto: PROMPT_PADRAO,
    jornada: defaultJornada(),
    guardiao: defaultGuardiao(),
    evidencias: [],
    apoios: [],
    arsenal: [],
    inteligencia: [],
    modo: "cliente",
    promptsMetodologia: { ...PROMPTS_FASE_PADRAO },
    vitorias: [],
    processosSetor: [],
    tarefasRepetitivas: [],
    sugestoesIA: [],
    itensIA: [],
    feedbacks: [],
  };
}

// ---------- Helpers de jornada ----------
export function progressoFase(s: State, fase: Fase): number {
  const checklist = CHECKLIST_FASE[fase];
  const evidObrig = EVIDENCIAS_OBRIGATORIAS[fase];
  const estado = s.jornada.fases[fase];
  const totalCheck = checklist.length;
  const doneCheck = checklist.filter((c) => estado.checklist[c]).length;
  const totalEv = evidObrig.length;
  const doneEv = evidObrig.filter((tipo) =>
    s.evidencias.some((e) => e.fase === fase && e.tipo === tipo && e.status === "Aprovada")
  ).length;
  const total = totalCheck + totalEv;
  if (total === 0) return estado.status === "Concluída" ? 100 : 0;
  return Math.round(((doneCheck + doneEv) / total) * 100);
}

export function progressoGeral(s: State): number {
  const fases: Fase[] = [1, 2, 3, 4, 5, 6];
  const soma = fases.reduce((acc, f) => acc + progressoFase(s, f), 0);
  return Math.round(soma / fases.length);
}

export function evidenciasFaltantes(s: State, fase: Fase): string[] {
  return EVIDENCIAS_OBRIGATORIAS[fase].filter((tipo) =>
    !s.evidencias.some((e) => e.fase === fase && e.tipo === tipo && e.status === "Aprovada")
  );
}

// ---------- Cálculo de tempo de tarefas repetitivas ----------
export function calcTempoSemana(tempoH: number, freq: FrequenciaRepetitiva, vezes: number): number {
  if (!tempoH) return 0;
  switch (freq) {
    case "Todo dia": return +(tempoH * (vezes || 1) * 5).toFixed(2);
    case "Toda semana": return +(tempoH * (vezes || 1)).toFixed(2);
    case "A cada 15 dias": return +(tempoH * (vezes || 1) / 2).toFixed(2);
    case "Todo mês": return +(tempoH * (vezes || 1) / 4).toFixed(2);
    case "Sob demanda": return +(tempoH * (vezes || 0)).toFixed(2);
  }
}
export function calcTempoMes(tempoH: number, freq: FrequenciaRepetitiva, vezes: number): number {
  if (!tempoH) return 0;
  switch (freq) {
    case "Todo dia": return +(tempoH * (vezes || 1) * 22).toFixed(2);
    case "Toda semana": return +(tempoH * (vezes || 1) * 4).toFixed(2);
    case "A cada 15 dias": return +(tempoH * (vezes || 1) * 2).toFixed(2);
    case "Todo mês": return +(tempoH * (vezes || 1)).toFixed(2);
    case "Sob demanda": return +(tempoH * (vezes || 0)).toFixed(2);
  }
}

export function inferirFaseDoTexto(texto: string, fallback: Fase = 4): Fase {
  const t = texto.toLowerCase();
  if (/marketing|comercial|tráfego|trafego|crm|receita|lucro|posicionamento|campanha/.test(t)) return 7;
  if (/sistema|mvp|plataforma|painel interno/.test(t)) return 6;
  if (/agente|copiloto|rotina|skill|prompt recorrente/.test(t)) return 5;
  if (/protótipo|prototipo|teste|fluxo|automação simples|automacao simples/.test(t)) return 4;
  if (/gargalo|processo travado|tarefa repetitiva/.test(t)) return 3;
  if (/indicador|dashboard|dado|análise|analise|plano de ação|plano de acao/.test(t)) return 2;
  return fallback;
}

export function resumoVitoriaParaCEO(v: Vitoria, setorNome?: string): string {
  const fase = FASES.find((f) => f.num === v.fase);
  const horas = v.reducaoHoras
    ? `${v.horasSemana ? `${v.horasSemana} horas/semana` : ""}${v.horasSemana && v.horasMes ? " · " : ""}${v.horasMes ? `${v.horasMes} horas/mês` : ""}`.trim() || "horas economizadas"
    : "sem redução de horas registrada";
  const efic = v.ganhoEficiencia && v.percentualEficiencia ? `${v.percentualEficiencia}% de eficiência operacional` : "ganho qualitativo de eficiência";
  const apoio = v.teveApoioPMC ? `apoio de ${v.apoioQuem.join(", ") || "PMC"}${v.apoioDecisivo.length ? `, por meio de ${v.apoioDecisivo.join(", ")}` : ""}` : "sem apoio direto do PMC";
  const setor = setorNome ?? v.setorNome ?? "—";
  return `Na ${fase ? `Fase 0${fase.num} — ${fase.titulo}` : "fase informada"}, no setor ${setor}, identificamos o gargalo: ${v.gargaloDescricao || "—"}. A partir disso, foi implementada a solução ${v.nomeSolucao || v.solucaoDescricao || "—"}, que gerou ${v.resumoVitoria || "resultado relevante"}. A vitória resultou em ${horas}, ganho estimado de ${efic} e melhoria em ${v.setorBeneficiado || setor}. Essa entrega contou com ${apoio}.`;
}

// ---------- Sugestão automática ----------
export function gerarAnalise(g: Omit<Gargalo, "id" | "analiseIA">): string {
  const sug: string[] = [];
  const txt = (g.descricao + " " + g.processo + " " + g.ondeTrava).toLowerCase();
  if (g.planilha && (g.frequencia.includes("dia") || g.frequencia.includes("semana"))) {
    sug.push("Dashboard, relatório automático ou sistema de acompanhamento.");
  }
  if (txt.includes("mensag") || txt.includes("comunica") || txt.includes("e-mail") || txt.includes("whats")) {
    sug.push("Prompt, automação de mensagem, agente ou checklist.");
  }
  if (g.retrabalho || txt.includes("manual") || txt.includes("etapa")) {
    sug.push("Automação, sistema interno ou integração entre ferramentas.");
  }
  if (g.impactos.includes("Decisão do dono")) {
    sug.push("Painel executivo, relatório automático ou central de indicadores.");
  }
  if (g.impactos.includes("Atendimento") || txt.includes("cliente")) {
    sug.push("Agente de atendimento, base de respostas ou follow-up automático.");
  }
  const impacto = g.impactos.length >= 3 ? "Alto" : g.impactos.length === 2 ? "Médio" : "Baixo";
  const esforco = g.retrabalho && g.dependencia ? "Alto" : g.planilha ? "Médio" : "Baixo";
  const prio = impacto === "Alto" ? "Fazer agora" : impacto === "Médio" ? "Planejar" : "Deixar para depois";
  return `Diagnóstico: o processo "${g.processo}" trava em "${g.ondeTrava || "etapas manuais"}" e impacta ${g.impactos.join(", ") || "a operação"}.
Sugestão: padronizar e automatizar com IA, eliminando dependência de planilhas.
Tipo de solução recomendada: ${sug[0] ?? "Sistema interno ou automação."}
Primeiro passo: marcar reunião com ${g.quemExecuta || "o líder do setor"}.
Impacto estimado: ${impacto}. Esforço: ${esforco}. Prioridade: ${prio}.
Outras possibilidades:
${sug.slice(1).map((s) => " - " + s).join("\n") || " - —"}`;
}
