// In-memory State + useStore(selector) via useSyncExternalStore + the full actions object.
// Same names/signatures/return values as IA-Guardian-Hub/src/lib/store.ts.
// The ONLY behavioral change: each mutation does the identical optimistic local `set(...)`
// THEN a fire-and-forget write-through to Supabase via ./persistence.
// No localStorage, no realtime — source of truth is Supabase, loaded once per mount.

import { useSyncExternalStore, useRef } from "react";
import type {
  State,
  Setor,
  Gargalo,
  Projeto,
  ProjetoTarefa,
  ProjetoRegistro,
  Tarefa,
  Ritual,
  ExemploCS,
  ResumoSemana,
  Relatorio,
  ModoVisualizacao,
  GuardiaoPerfil,
  Fase,
  StatusFase,
  Evidencia,
  StatusEvidencia,
  Apoio,
  StatusApoio,
  ItemArsenal,
  InteligenciaSetor,
  Vitoria,
  ProcessoSetor,
  TarefaRepetitiva,
  SugestaoIA,
  StatusSugestao,
  ItemIANoSetor,
  FeedbackLider,
  StatusFeedbackLider,
} from "./types";
import { TAREFAS_PADRAO, PROMPT_PADRAO, PROMPTS_FASE_PADRAO, TAREFAS_SUGERIDAS_FASE } from "./constants";
import { emptyState, gerarAnalise, calcTempoSemana, calcTempoMes } from "./helpers";
import type { EntityCollection } from "./persistence";
import * as P from "./persistence";

const uid = () => crypto.randomUUID();

// SSR/pre-hydration snapshot — an empty State (no seed, no localStorage).
const EMPTY_STATE: State = emptyState();
let state: State = EMPTY_STATE;

const listeners = new Set<() => void>();
function emit() {
  listeners.forEach((l) => l());
}

export const store = {
  get: () => state,
  set: (updater: (s: State) => State) => { state = updater(state); emit(); },
  subscribe: (l: () => void) => { listeners.add(l); return () => { listeners.delete(l); }; },
  reset: () => { state = emptyState(); emit(); },
  // Hydrate the in-memory State from a freshly loaded Supabase snapshot (no write-through).
  hydrate: (next: State) => { state = next; emit(); },
  // Set the resolved (viewed) client used to stamp id_cliente on every write.
  setResolvedClientId: (id: string | null) => { P.setResolvedClientId(id); },
};

// Write-through helper for entity add/update: re-read the entity from state and upsert it whole.
function persistEntity(collection: EntityCollection, id: string) {
  const list = (state as unknown as Record<string, Array<{ id: string }>>)[collection];
  const ent = list?.find((e) => e.id === id);
  if (ent) void P.upsertEntity(collection, ent as unknown as Record<string, unknown>);
}

function shallowEqual(a: unknown, b: unknown): boolean {
  if (Object.is(a, b)) return true;
  if (Array.isArray(a) && Array.isArray(b)) {
    if (a.length !== b.length) return false;
    for (let i = 0; i < a.length; i++) if (!Object.is(a[i], b[i])) return false;
    return true;
  }
  if (a && b && typeof a === "object" && typeof b === "object") {
    const ka = Object.keys(a as object); const kb = Object.keys(b as object);
    if (ka.length !== kb.length) return false;
    for (const k of ka) if (!Object.is((a as Record<string, unknown>)[k], (b as Record<string, unknown>)[k])) return false;
    return true;
  }
  return false;
}

export function useStore<T>(selector: (s: State) => T): T {
  const cache = useRef<{ state: State | null; value: T }>({ state: null, value: undefined as unknown as T });
  const serverCache = useRef<{ done: boolean; value: T }>({ done: false, value: undefined as unknown as T });
  const getSnapshot = () => {
    if (cache.current.state === state) return cache.current.value;
    const next = selector(state);
    if (cache.current.state !== null && shallowEqual(cache.current.value, next)) {
      cache.current.state = state;
      return cache.current.value;
    }
    cache.current = { state, value: next };
    return next;
  };
  const getServerSnapshot = () => {
    if (!serverCache.current.done) {
      serverCache.current = { done: true, value: selector(EMPTY_STATE) };
    }
    return serverCache.current.value;
  };
  return useSyncExternalStore(store.subscribe, getSnapshot, getServerSnapshot);
}

// ---------- CRUD ----------
export const actions = {
  // Setores
  addSetor: (s: Omit<Setor, "id">): Setor => {
    const novo: Setor = { ...s, id: uid() };
    store.set((st) => ({ ...st, setores: [...st.setores, novo] }));
    void P.upsertEntity("setores", novo as unknown as Record<string, unknown>);
    return novo;
  },
  updateSetor: (id: string, p: Partial<Setor>) => {
    store.set((st) => ({ ...st, setores: st.setores.map((x) => x.id === id ? { ...x, ...p } : x) }));
    persistEntity("setores", id);
  },
  removeSetor: (id: string) => {
    store.set((st) => ({ ...st, setores: st.setores.filter((x) => x.id !== id) }));
    void P.deleteEntity("setores", id);
  },

  // Gargalos
  addGargalo: (g: Omit<Gargalo, "id" | "analiseIA"> & { analiseIA?: string }) => {
    const analise = g.analiseIA ?? gerarAnalise(g);
    const novo: Gargalo = { ...g, id: uid(), analiseIA: analise };
    store.set((st) => ({ ...st, gargalos: [...st.gargalos, novo] }));
    void P.upsertEntity("gargalos", novo as unknown as Record<string, unknown>);
    return novo;
  },
  updateGargalo: (id: string, p: Partial<Gargalo>) => {
    store.set((st) => ({ ...st, gargalos: st.gargalos.map((x) => x.id === id ? { ...x, ...p } : x) }));
    persistEntity("gargalos", id);
  },
  removeGargalo: (id: string) => {
    store.set((st) => ({ ...st, gargalos: st.gargalos.filter((x) => x.id !== id) }));
    void P.deleteEntity("gargalos", id);
  },

  // Projetos
  addProjeto: (p: Omit<Projeto, "id" | "tarefasPadrao"> & { tarefasPadrao?: ProjetoTarefa[] }) => {
    const novo: Projeto = {
      ...p, id: uid(),
      tarefasPadrao: p.tarefasPadrao ?? TAREFAS_PADRAO.map((t) => ({ ...t })),
      registros: [], updatedAt: new Date().toISOString(),
    };
    store.set((st) => ({ ...st, projetos: [...st.projetos, novo] }));
    void P.upsertEntity("projetos", novo as unknown as Record<string, unknown>);
    return novo;
  },
  updateProjeto: (id: string, p: Partial<Projeto>) => {
    store.set((st) => ({
      ...st, projetos: st.projetos.map((x) => x.id === id ? { ...x, ...p, updatedAt: new Date().toISOString() } : x),
    }));
    persistEntity("projetos", id);
  },
  removeProjeto: (id: string) => {
    store.set((st) => ({ ...st, projetos: st.projetos.filter((x) => x.id !== id) }));
    void P.deleteEntity("projetos", id);
  },
  addRegistro: (projetoId: string, r: Omit<ProjetoRegistro, "id" | "data">) => {
    const registro: ProjetoRegistro = { ...r, id: uid(), data: new Date().toISOString() };
    store.set((st) => ({
      ...st, projetos: st.projetos.map((x) => x.id === projetoId ? {
        ...x, updatedAt: new Date().toISOString(),
        registros: [registro, ...(x.registros ?? [])],
      } : x),
    }));
    void P.upsertEntity("projetoRegistros", { ...registro, projetoId } as unknown as Record<string, unknown>);
  },
  removeRegistro: (projetoId: string, registroId: string) => {
    store.set((st) => ({
      ...st, projetos: st.projetos.map((x) => x.id === projetoId ? {
        ...x, registros: (x.registros ?? []).filter((r) => r.id !== registroId),
      } : x),
    }));
    void P.deleteEntity("projetoRegistros", registroId);
  },

  // Tarefas
  addTarefa: (t: Omit<Tarefa, "id">) => {
    const nova: Tarefa = { ...t, id: uid() };
    store.set((st) => ({ ...st, tarefas: [...st.tarefas, nova] }));
    void P.upsertEntity("tarefas", nova as unknown as Record<string, unknown>);
  },
  updateTarefa: (id: string, p: Partial<Tarefa>) => {
    store.set((st) => ({ ...st, tarefas: st.tarefas.map((x) => x.id === id ? { ...x, ...p } : x) }));
    persistEntity("tarefas", id);
  },
  removeTarefa: (id: string) => {
    store.set((st) => ({ ...st, tarefas: st.tarefas.filter((x) => x.id !== id) }));
    void P.deleteEntity("tarefas", id);
  },

  // Rituais
  addRitual: (r: Omit<Ritual, "id">) => {
    const novo: Ritual = { ...r, id: uid() };
    store.set((st) => ({ ...st, rituais: [...st.rituais, novo] }));
    void P.upsertEntity("rituais", novo as unknown as Record<string, unknown>);
  },
  updateRitual: (id: string, p: Partial<Ritual>) => {
    store.set((st) => ({ ...st, rituais: st.rituais.map((x) => x.id === id ? { ...x, ...p } : x) }));
    persistEntity("rituais", id);
  },
  removeRitual: (id: string) => {
    store.set((st) => ({ ...st, rituais: st.rituais.filter((x) => x.id !== id) }));
    void P.deleteEntity("rituais", id);
  },

  // Exemplos CS
  addExemploCS: (e: Omit<ExemploCS, "id">) => {
    const novo: ExemploCS = { ...e, id: uid() };
    store.set((st) => ({ ...st, exemplosCS: [...(st.exemplosCS ?? []), novo] }));
    void P.upsertEntity("exemplosCS", novo as unknown as Record<string, unknown>);
  },
  updateExemploCS: (id: string, p: Partial<ExemploCS>) => {
    store.set((st) => ({ ...st, exemplosCS: (st.exemplosCS ?? []).map((x) => x.id === id ? { ...x, ...p } : x) }));
    persistEntity("exemplosCS", id);
  },
  removeExemploCS: (id: string) => {
    store.set((st) => ({ ...st, exemplosCS: (st.exemplosCS ?? []).filter((x) => x.id !== id) }));
    void P.deleteEntity("exemplosCS", id);
  },

  // Resumo, relatórios, prompt
  setResumo: (r: Partial<ResumoSemana>) => {
    store.set((st) => ({ ...st, resumo: { ...st.resumo, ...r } }));
    void P.saveOs({ resumo: state.resumo });
  },
  addRelatorio: (r: Omit<Relatorio, "id" | "criadoEm">) => {
    const novo: Relatorio = { ...r, id: uid(), criadoEm: new Date().toISOString() };
    store.set((st) => ({ ...st, relatorios: [novo, ...st.relatorios] }));
    void P.upsertEntity("relatorios", novo as unknown as Record<string, unknown>);
  },
  updateRelatorio: (id: string, p: Partial<Relatorio>) => {
    store.set((st) => ({ ...st, relatorios: st.relatorios.map((x) => x.id === id ? { ...x, ...p } : x) }));
    persistEntity("relatorios", id);
  },
  removeRelatorio: (id: string) => {
    store.set((st) => ({ ...st, relatorios: st.relatorios.filter((x) => x.id !== id) }));
    void P.deleteEntity("relatorios", id);
  },
  setPrompt: (texto: string) => {
    store.set((st) => ({ ...st, promptCompleto: texto }));
    void P.saveOs({ promptCompleto: texto });
  },
  resetPrompt: () => {
    store.set((st) => ({ ...st, promptCompleto: PROMPT_PADRAO }));
    void P.saveOs({ promptCompleto: PROMPT_PADRAO });
  },

  // --------- Novas ações ---------
  setModo: (modo: ModoVisualizacao) => {
    store.set((st) => ({ ...st, modo }));
    void P.saveOs({ modo });
  },
  updateGuardiao: (p: Partial<GuardiaoPerfil>) => {
    store.set((st) => ({
      ...st,
      guardiao: { ...st.guardiao, ...p,
        habilidades: { ...st.guardiao.habilidades, ...(p.habilidades ?? {}) } },
    }));
    void P.saveOs({ guardiao: state.guardiao });
  },

  // Jornada
  setFaseStatus: (fase: Fase, status: StatusFase) => {
    store.set((st) => {
      const fases = { ...st.jornada.fases, [fase]: { ...st.jornada.fases[fase], status,
        concluidaEm: status === "Concluída" ? new Date().toISOString() : st.jornada.fases[fase].concluidaEm } };
      // desbloquear próxima
      if (status === "Concluída" && fase < 6) {
        const prox = (fase + 1) as Fase;
        if (fases[prox].status === "Bloqueada") fases[prox] = { ...fases[prox], status: "Não iniciada" };
      }
      const faseAtual = status === "Concluída" && fase < 7 ? Math.min(6, fase + 1) as Fase : st.jornada.faseAtual;
      return { ...st, jornada: { ...st.jornada, fases, faseAtual } };
    });
    void P.saveFase(fase, state.jornada.fases[fase]);
    if (status === "Concluída" && fase < 6) {
      const prox = (fase + 1) as Fase;
      void P.saveFase(prox, state.jornada.fases[prox]);
    }
    void P.saveOs({ faseAtual: state.jornada.faseAtual });
  },
  setFaseAtual: (fase: Fase) => {
    store.set((st) => ({ ...st, jornada: { ...st.jornada, faseAtual: fase } }));
    void P.saveOs({ faseAtual: fase });
  },
  setChecklist: (fase: Fase, item: string, done: boolean) => {
    store.set((st) => {
      const f = st.jornada.fases[fase];
      const checklist = { ...f.checklist, [item]: done };
      const novoStatus: StatusFase = f.status === "Bloqueada" ? "Bloqueada"
        : Object.values(checklist).some(Boolean) && f.status === "Não iniciada" ? "Em andamento" : f.status;
      return { ...st, jornada: { ...st.jornada, fases: { ...st.jornada.fases, [fase]: { ...f, checklist, status: novoStatus } } } };
    });
    void P.saveFase(fase, state.jornada.fases[fase]);
  },
  setObservacoesFase: (fase: Fase, observacoes: string) => {
    store.set((st) => ({
      ...st, jornada: { ...st.jornada, fases: { ...st.jornada.fases,
        [fase]: { ...st.jornada.fases[fase], observacoes } } },
    }));
    void P.saveFase(fase, { observacoes });
  },
  setFeedbackCS: (fase: Fase, feedbackCS: string) => {
    store.set((st) => ({
      ...st, jornada: { ...st.jornada, fases: { ...st.jornada.fases,
        [fase]: { ...st.jornada.fases[fase], feedbackCS } } },
    }));
    void P.saveFase(fase, { feedbackCS });
  },
  setResultadoFase: (fase: Fase, resultadoAlcancado: string) => {
    store.set((st) => ({
      ...st, jornada: { ...st.jornada, fases: { ...st.jornada.fases,
        [fase]: { ...st.jornada.fases[fase], resultadoAlcancado } } },
    }));
    void P.saveFase(fase, { resultadoAlcancado });
  },
  setResumoCEOFase: (fase: Fase, resumoCEO: string) => {
    store.set((st) => ({
      ...st, jornada: { ...st.jornada, fases: { ...st.jornada.fases,
        [fase]: { ...st.jornada.fases[fase], resumoCEO } } },
    }));
    void P.saveFase(fase, { resumoCEO });
  },
  setProximaAcaoFase: (fase: Fase, proximaAcao: string) => {
    store.set((st) => ({
      ...st, jornada: { ...st.jornada, fases: { ...st.jornada.fases,
        [fase]: { ...st.jornada.fases[fase], proximaAcao } } },
    }));
    void P.saveFase(fase, { proximaAcao });
  },
  toggleSetorFase: (fase: Fase, setorId: string) => {
    store.set((st) => {
      const f = st.jornada.fases[fase];
      const has = f.setoresEnvolvidos.includes(setorId);
      const setoresEnvolvidos = has ? f.setoresEnvolvidos.filter((x) => x !== setorId) : [...f.setoresEnvolvidos, setorId];
      return { ...st, jornada: { ...st.jornada, fases: { ...st.jornada.fases, [fase]: { ...f, setoresEnvolvidos } } } };
    });
    void P.saveFase(fase, { setoresEnvolvidos: state.jornada.fases[fase].setoresEnvolvidos });
  },
  criarTarefasSugeridas: (fase: Fase, setorId?: string) => {
    const sugestoes = TAREFAS_SUGERIDAS_FASE[fase];
    const st0 = store.get();
    const existentes = new Set(st0.tarefas.filter((t) => t.fase === fase).map((t) => t.titulo));
    const novas: Tarefa[] = sugestoes
      .filter((s) => !existentes.has(s))
      .map((titulo) => ({
        id: uid(), titulo, responsavel: st0.guardiao.nomePrincipal || "",
        prazo: "", prioridade: "Média", status: "A fazer", tipo: "Acompanhamento",
        origem: "Criada manualmente", tipoRotina: "Não se aplica",
        recorrencia: "Sem recorrência", observacoes: "",
        fase, setorId,
      }));
    store.set((st) => ({ ...st, tarefas: [...st.tarefas, ...novas] }));
    novas.forEach((n) => void P.upsertEntity("tarefas", n as unknown as Record<string, unknown>));
  },
  criarTarefaDoChecklist: (fase: Fase, item: string, setorId?: string) => {
    const st0 = store.get();
    const ja = st0.tarefas.some((t) => t.fase === fase && t.titulo === item);
    if (ja) return;
    const nova: Tarefa = {
      id: uid(), titulo: item, responsavel: st0.guardiao.nomePrincipal || "",
      prazo: "", prioridade: "Média", status: "A fazer", tipo: "Acompanhamento",
      origem: "Criada manualmente", tipoRotina: "Não se aplica",
      recorrencia: "Sem recorrência", observacoes: "",
      fase, setorId, processo: item,
    };
    store.set((st) => {
      const ja2 = st.tarefas.some((t) => t.fase === fase && t.titulo === item);
      if (ja2) return st;
      return { ...st, tarefas: [...st.tarefas, nova] };
    });
    void P.upsertEntity("tarefas", nova as unknown as Record<string, unknown>);
  },

  // Evidências
  addEvidencia: (e: Omit<Evidencia, "id" | "data" | "status"> & { status?: StatusEvidencia }) => {
    const nova: Evidencia = { ...e, id: uid(), data: new Date().toISOString(), status: e.status ?? "Pendente" };
    store.set((st) => ({ ...st, evidencias: [nova, ...st.evidencias] }));
    void P.upsertEntity("evidencias", nova as unknown as Record<string, unknown>);
    return nova;
  },
  updateEvidencia: (id: string, p: Partial<Evidencia>) => {
    store.set((st) => ({ ...st, evidencias: st.evidencias.map((x) => x.id === id ? { ...x, ...p } : x) }));
    persistEntity("evidencias", id);
  },
  removeEvidencia: (id: string) => {
    store.set((st) => ({ ...st, evidencias: st.evidencias.filter((x) => x.id !== id) }));
    void P.deleteEntity("evidencias", id);
  },
  aprovarEvidencia: (id: string, observacaoCS = "") => {
    store.set((st) => ({ ...st, evidencias: st.evidencias.map((x) => x.id === id ? { ...x, status: "Aprovada", observacaoCS } : x) }));
    persistEntity("evidencias", id);
  },
  pedirAjusteEvidencia: (id: string, observacaoCS: string) => {
    store.set((st) => ({ ...st, evidencias: st.evidencias.map((x) => x.id === id ? { ...x, status: "Ajustar", observacaoCS } : x) }));
    persistEntity("evidencias", id);
  },

  // Apoio
  addApoio: (a: Omit<Apoio, "id" | "criadoEm" | "status"> & { status?: StatusApoio }) => {
    const novo: Apoio = { ...a, id: uid(), criadoEm: new Date().toISOString(), status: a.status ?? "Solicitado" };
    store.set((st) => ({ ...st, apoios: [novo, ...st.apoios] }));
    void P.upsertEntity("apoios", novo as unknown as Record<string, unknown>);
    return novo;
  },
  updateApoio: (id: string, p: Partial<Apoio>) => {
    store.set((st) => ({ ...st, apoios: st.apoios.map((x) => x.id === id ? { ...x, ...p } : x) }));
    persistEntity("apoios", id);
  },
  removeApoio: (id: string) => {
    store.set((st) => ({ ...st, apoios: st.apoios.filter((x) => x.id !== id) }));
    void P.deleteEntity("apoios", id);
  },

  // Arsenal
  addArsenal: (a: Omit<ItemArsenal, "id" | "criadoEm" | "status"> & { status?: StatusApoio }) => {
    const novo: ItemArsenal = { ...a, id: uid(), criadoEm: new Date().toISOString(), status: a.status ?? "Solicitado" };
    store.set((st) => ({ ...st, arsenal: [novo, ...st.arsenal] }));
    void P.upsertEntity("arsenal", novo as unknown as Record<string, unknown>);
    return novo;
  },
  updateArsenal: (id: string, p: Partial<ItemArsenal>) => {
    store.set((st) => ({ ...st, arsenal: st.arsenal.map((x) => x.id === id ? { ...x, ...p } : x) }));
    persistEntity("arsenal", id);
  },
  removeArsenal: (id: string) => {
    store.set((st) => ({ ...st, arsenal: st.arsenal.filter((x) => x.id !== id) }));
    void P.deleteEntity("arsenal", id);
  },

  // Inteligência
  upsertInteligencia: (setorId: string, p: Partial<InteligenciaSetor>) => {
    store.set((st) => {
      const exists = st.inteligencia.find((x) => x.setorId === setorId);
      const base: InteligenciaSetor = exists ?? {
        setorId, indicadores: "", ondeEstaoDados: "", existePlanilha: false, existeDashboard: false,
        apresentaIndicadores: false, frequenciaAnalise: "", meta: "", indicadorPrincipal: "",
        dashboardLink: "", planoAcao: "",
      };
      const next = { ...base, ...p };
      return { ...st, inteligencia: exists
        ? st.inteligencia.map((x) => x.setorId === setorId ? next : x)
        : [...st.inteligencia, next] };
    });
    const found = state.inteligencia.find((x) => x.setorId === setorId);
    if (found) void P.upsertEntity("inteligencia", found as unknown as Record<string, unknown>);
  },

  // Prompts metodologia
  setPromptFase: (fase: Fase, texto: string) => {
    store.set((st) => ({ ...st, promptsMetodologia: { ...st.promptsMetodologia, [fase]: texto } }));
    void P.saveOs({ promptsMetodologia: state.promptsMetodologia });
  },
  resetPromptFase: (fase: Fase) => {
    store.set((st) => ({ ...st, promptsMetodologia: { ...st.promptsMetodologia, [fase]: PROMPTS_FASE_PADRAO[fase] } }));
    void P.saveOs({ promptsMetodologia: state.promptsMetodologia });
  },

  // Vitórias
  addVitoria: (v: Omit<Vitoria, "id" | "criadoEm">) => {
    const nova: Vitoria = { ...v, id: uid(), criadoEm: new Date().toISOString() };
    store.set((st) => ({ ...st, vitorias: [nova, ...(st.vitorias ?? [])] }));
    void P.upsertEntity("vitorias", nova as unknown as Record<string, unknown>);
    return nova;
  },
  updateVitoria: (id: string, p: Partial<Vitoria>) => {
    store.set((st) => ({ ...st, vitorias: (st.vitorias ?? []).map((x) => x.id === id ? { ...x, ...p } : x) }));
    persistEntity("vitorias", id);
  },
  removeVitoria: (id: string) => {
    store.set((st) => ({ ...st, vitorias: (st.vitorias ?? []).filter((x) => x.id !== id) }));
    void P.deleteEntity("vitorias", id);
  },
  toggleVitoriaRelatorioCEO: (id: string) => {
    store.set((st) => ({ ...st, vitorias: (st.vitorias ?? []).map((x) => x.id === id ? { ...x, noRelatorioCEO: !x.noRelatorioCEO } : x) }));
    persistEntity("vitorias", id);
  },

  // Processos do setor
  addProcessoSetor: (p: Omit<ProcessoSetor, "id" | "criadoEm">) => {
    const novo: ProcessoSetor = { ...p, id: uid(), criadoEm: new Date().toISOString() };
    store.set((st) => ({ ...st, processosSetor: [...(st.processosSetor ?? []), novo] }));
    void P.upsertEntity("processosSetor", novo as unknown as Record<string, unknown>);
    return novo;
  },
  updateProcessoSetor: (id: string, p: Partial<ProcessoSetor>) => {
    store.set((st) => ({ ...st, processosSetor: (st.processosSetor ?? []).map((x) => x.id === id ? { ...x, ...p } : x) }));
    persistEntity("processosSetor", id);
  },
  removeProcessoSetor: (id: string) => {
    store.set((st) => ({ ...st, processosSetor: (st.processosSetor ?? []).filter((x) => x.id !== id) }));
    void P.deleteEntity("processosSetor", id);
  },

  // Tarefas repetitivas
  addTarefaRepetitiva: (t: Omit<TarefaRepetitiva, "id" | "criadoEm" | "tempoSemana" | "tempoMes"> & { tempoSemana?: number; tempoMes?: number }) => {
    const tempoSemana = t.tempoSemana ?? calcTempoSemana(t.tempoPorExecucao, t.frequencia, t.vezesPorPeriodo);
    const tempoMes = t.tempoMes ?? calcTempoMes(t.tempoPorExecucao, t.frequencia, t.vezesPorPeriodo);
    const novo: TarefaRepetitiva = { ...t, tempoSemana, tempoMes, id: uid(), criadoEm: new Date().toISOString() };
    store.set((st) => ({ ...st, tarefasRepetitivas: [...(st.tarefasRepetitivas ?? []), novo] }));
    void P.upsertEntity("tarefasRepetitivas", novo as unknown as Record<string, unknown>);
    return novo;
  },
  updateTarefaRepetitiva: (id: string, p: Partial<TarefaRepetitiva>) => {
    store.set((st) => ({
      ...st, tarefasRepetitivas: (st.tarefasRepetitivas ?? []).map((x) => {
        if (x.id !== id) return x;
        const merged = { ...x, ...p };
        merged.tempoSemana = calcTempoSemana(merged.tempoPorExecucao, merged.frequencia, merged.vezesPorPeriodo);
        merged.tempoMes = calcTempoMes(merged.tempoPorExecucao, merged.frequencia, merged.vezesPorPeriodo);
        return merged;
      }),
    }));
    persistEntity("tarefasRepetitivas", id);
  },
  removeTarefaRepetitiva: (id: string) => {
    store.set((st) => ({ ...st, tarefasRepetitivas: (st.tarefasRepetitivas ?? []).filter((x) => x.id !== id) }));
    void P.deleteEntity("tarefasRepetitivas", id);
  },

  // Sugestões IA
  addSugestaoIA: (s: Omit<SugestaoIA, "id" | "criadoEm" | "status"> & { status?: StatusSugestao }) => {
    const nova: SugestaoIA = { ...s, id: uid(), criadoEm: new Date().toISOString(), status: s.status ?? "Aberta" };
    store.set((st) => ({ ...st, sugestoesIA: [nova, ...(st.sugestoesIA ?? [])] }));
    void P.upsertEntity("sugestoesIA", nova as unknown as Record<string, unknown>);
    return nova;
  },
  addSugestoesIABatch: (setorId: string, lote: Array<Omit<SugestaoIA, "id" | "setorId" | "criadoEm" | "status">>) => {
    const novas = lote.map<SugestaoIA>((s) => ({
      ...s, setorId, id: uid(), status: "Aberta", criadoEm: new Date().toISOString(),
    }));
    store.set((st) => ({ ...st, sugestoesIA: [...novas, ...(st.sugestoesIA ?? [])] }));
    novas.forEach((n) => void P.upsertEntity("sugestoesIA", n as unknown as Record<string, unknown>));
    return novas;
  },
  updateSugestaoIA: (id: string, p: Partial<SugestaoIA>) => {
    store.set((st) => ({ ...st, sugestoesIA: (st.sugestoesIA ?? []).map((x) => x.id === id ? { ...x, ...p } : x) }));
    persistEntity("sugestoesIA", id);
  },
  removeSugestaoIA: (id: string) => {
    store.set((st) => ({ ...st, sugestoesIA: (st.sugestoesIA ?? []).filter((x) => x.id !== id) }));
    void P.deleteEntity("sugestoesIA", id);
  },

  // Itens IA já em uso no setor
  addItemIA: (i: Omit<ItemIANoSetor, "id" | "criadoEm">) => {
    const novo: ItemIANoSetor = { ...i, id: uid(), criadoEm: new Date().toISOString() };
    store.set((st) => ({ ...st, itensIA: [novo, ...(st.itensIA ?? [])] }));
    void P.upsertEntity("itensIA", novo as unknown as Record<string, unknown>);
    return novo;
  },
  updateItemIA: (id: string, p: Partial<ItemIANoSetor>) => {
    store.set((st) => ({ ...st, itensIA: (st.itensIA ?? []).map((x) => x.id === id ? { ...x, ...p } : x) }));
    persistEntity("itensIA", id);
  },
  removeItemIA: (id: string) => {
    store.set((st) => ({ ...st, itensIA: (st.itensIA ?? []).filter((x) => x.id !== id) }));
    void P.deleteEntity("itensIA", id);
  },

  // Feedbacks para o líder
  addFeedbackLider: (f: Omit<FeedbackLider, "id" | "criadoEm" | "atualizadoEm" | "status"> & { status?: StatusFeedbackLider }) => {
    const novo: FeedbackLider = {
      ...f, id: uid(),
      status: f.status ?? "Enviado",
      criadoEm: new Date().toISOString(),
      atualizadoEm: new Date().toISOString(),
    };
    store.set((st) => ({ ...st, feedbacks: [novo, ...(st.feedbacks ?? [])] }));
    void P.upsertEntity("feedbacks", novo as unknown as Record<string, unknown>);
    return novo;
  },
  updateFeedbackLider: (id: string, p: Partial<FeedbackLider>) => {
    store.set((st) => ({ ...st, feedbacks: (st.feedbacks ?? []).map((x) => x.id === id ? { ...x, ...p, atualizadoEm: new Date().toISOString() } : x) }));
    persistEntity("feedbacks", id);
  },
  removeFeedbackLider: (id: string) => {
    store.set((st) => ({ ...st, feedbacks: (st.feedbacks ?? []).filter((x) => x.id !== id) }));
    void P.deleteEntity("feedbacks", id);
  },
};

// Re-export the persistence-agnostic surface so `@/lib/guardiao/store` matches the
// original single-file module's public API (types + constants + helpers).
export * from "./types";
export * from "./constants";
export * from "./helpers";
