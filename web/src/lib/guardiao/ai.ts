// AI wrappers over Supabase Edge Functions (guardiao-*).
// Return the same shapes the source app's server functions produced
// (IA-Guardian-Hub/src/lib/ai.functions.ts). The edge functions are deployed later;
// these wrappers can exist now and are the single call surface the pages use.

import { supabase } from "@/lib/supabase";

async function invokeGuardiao<TReq extends Record<string, unknown>, TRes>(
  name: string,
  body: TReq,
): Promise<TRes> {
  const { data, error } = await supabase.functions.invoke(name, { body });
  if (error) throw error;
  return data as TRes;
}

/* ============== 1. Diagnóstico de gargalo ============== */

export type DiagnosticoGargaloInput = {
  processo: string;
  descricao?: string;
  ondeTrava?: string;
  quemExecuta?: string;
  tempo?: string;
  ferramentas?: string;
  impactos?: string[];
  frequencia?: string;
  setorNome?: string;
  faseAtual?: number;
};

export type DiagnosticoGargaloOutput = {
  analiseIA: string;
  causaRaiz: string;
  tipoSolucao: "Sistema" | "Automação" | "Copiloto de IA" | "Reorganização de processo" | "Treinamento";
  prioridade: "Alta" | "Média" | "Baixa";
  tarefasSugeridas: string[];
};

export function diagnosticarGargalo(input: DiagnosticoGargaloInput): Promise<DiagnosticoGargaloOutput> {
  return invokeGuardiao<DiagnosticoGargaloInput, DiagnosticoGargaloOutput>("guardiao-diagnosticar-gargalo", input);
}

/* ============== 2. Relatório CEO inteligente ============== */

export type RelatorioCEOInput = {
  periodo: string;
  empresa?: string;
  guardiao?: string;
  faseAtual?: number;
  snapshot: string;
};

export type RelatorioCEOOutput = { text: string };

export function gerarRelatorioCEOIA(input: RelatorioCEOInput): Promise<RelatorioCEOOutput> {
  return invokeGuardiao<RelatorioCEOInput, RelatorioCEOOutput>("guardiao-relatorio-ceo", input);
}

/* ============== 3. Próximo passo por fase ============== */

export type ProximaAcaoFaseInput = {
  faseNum: number;
  titulo: string;
  objetivo?: string;
  status?: string;
  progresso?: number;
  checklistPendente?: string[];
  evidenciasFaltantes?: string[];
  tarefasPendentes?: string[];
  setoresEnvolvidos?: string[];
  resultadoAlcancado?: string;
};

export type ProximaAcaoFaseOutput = { text: string };

export function sugerirProximaAcaoFase(input: ProximaAcaoFaseInput): Promise<ProximaAcaoFaseOutput> {
  return invokeGuardiao<ProximaAcaoFaseInput, ProximaAcaoFaseOutput>("guardiao-proxima-acao-fase", input);
}

/* ============== 4. Sugestões estratégicas por setor ============== */

export type SugestaoSetorInput = {
  setorNome: string;
  liderNome?: string;
  guardiaoNome?: string;
  quantidadePessoas?: number;
  faseAtual?: number;
  time?: Array<{ nome: string; cargo: string; funcao: string }>;
  processos?: Array<{
    nome: string;
    descricao?: string;
    quemExecuta?: string;
    ferramentas?: string;
    temPlanilha?: boolean;
    impacto?: string;
  }>;
  tarefasRepetitivas?: Array<{
    nome: string;
    frequencia: string;
    tempoSemana?: number;
    tempoMes?: number;
    impactos?: string[];
  }>;
  gargalos?: Array<{
    processo: string;
    prioridade?: string;
    tempo?: string;
    impactos?: string[];
  }>;
};

export type SugestaoSetorItem = {
  nome: string;
  descricao: string;
  faseSugerida: number;
  prioridade: string;
};

export type SugestaoSetorOutput = {
  diagnostico: string;
  principaisGargalos: string[];
  tarefasMaiorImpacto: string[];
  melhorias: SugestaoSetorItem[];
  sistemasSugeridos: SugestaoSetorItem[];
  agentesSugeridos: SugestaoSetorItem[];
  automacoesSugeridas: SugestaoSetorItem[];
  proximaAcao: string;
  resumoCEO: string;
};

export function sugerirParaSetor(input: SugestaoSetorInput): Promise<SugestaoSetorOutput> {
  return invokeGuardiao<SugestaoSetorInput, SugestaoSetorOutput>("guardiao-sugerir-setor", input);
}
