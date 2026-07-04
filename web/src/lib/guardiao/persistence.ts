// Persistence layer: maps the in-memory State to/from the normalized guardiao_* tables.
// - TABLE_MAP: collection -> table + camelCase<->snake_case column map (+ date coercion, onConflict).
// - entityToRow / rowToEntity: pure record mappers (jsonb columns pass through as-is).
// - loadAll: bootstraps a full State from all 20 tables for one client.
// - upsertEntity / deleteEntity / saveOs / saveFase: write-through primitives.
//
// id_cliente on EVERY write = the resolved (viewed) client — set via setResolvedClientId,
// never the caller's uid, so admin oversight writes land on the right company.

import { supabase } from "@/lib/supabase";
import type {
  State,
  Fase,
  FaseEstado,
  GuardiaoPerfil,
  ResumoSemana,
  PromptsMetodologia,
  ModoVisualizacao,
} from "./types";
import { PROMPT_PADRAO, PROMPTS_FASE_PADRAO } from "./constants";
import { defaultJornada, defaultGuardiao, emptyResumo } from "./helpers";

// ---------- Resolved (viewed) client ----------
let _resolvedClientId: string | null = null;
export function setResolvedClientId(id: string | null): void {
  _resolvedClientId = id;
}
export function getResolvedClientId(): string | null {
  return _resolvedClientId;
}

// ---------- Collection -> table mapping ----------
export type EntityCollection =
  | "setores"
  | "gargalos"
  | "projetos"
  | "projetoRegistros"
  | "tarefas"
  | "rituais"
  | "exemplosCS"
  | "relatorios"
  | "vitorias"
  | "evidencias"
  | "apoios"
  | "arsenal"
  | "inteligencia"
  | "sugestoesIA"
  | "itensIA"
  | "processosSetor"
  | "tarefasRepetitivas"
  | "feedbacks";

type ColumnMap = Record<string, string>;
interface TableDef {
  table: string;
  columns: ColumnMap; // camelField -> snake_column
  dateCols?: string[]; // snake columns that are date/timestamp -> "" | undefined coerced to null
  onConflict?: string; // upsert conflict target (default: "id")
}

export const TABLE_MAP: Record<EntityCollection, TableDef> = {
  setores: {
    table: "guardiao_setores",
    columns: {
      id: "id", nome: "nome", lider: "lider", guardiao: "guardiao", prioridade: "prioridade",
      status: "status", frequencia: "frequencia", objetivo: "objetivo", observacoes: "observacoes",
      quantidadePessoas: "quantidade_pessoas", time: "time", faseAtual: "fase_atual",
      validacaoLider: "validacao_lider", validacaoCEO: "validacao_ceo", resumoCEO: "resumo_ceo",
      diagnostico: "diagnostico",
    },
  },
  gargalos: {
    table: "guardiao_gargalos",
    columns: {
      id: "id", setorId: "setor_id", processo: "processo", descricao: "descricao",
      ondeTrava: "onde_trava", quemExecuta: "quem_executa", tempo: "tempo", pessoas: "pessoas",
      ferramentas: "ferramentas", planilha: "planilha", retrabalho: "retrabalho",
      dependencia: "dependencia", riscoErro: "risco_erro", impactos: "impactos",
      frequencia: "frequencia", prioridade: "prioridade", status: "status", analiseIA: "analise_ia",
      ligadoReceita: "ligado_receita", ligadoEntrega: "ligado_entrega",
    },
  },
  projetos: {
    table: "guardiao_projetos",
    columns: {
      id: "id", nome: "nome", tipoProjeto: "tipo_projeto", setorId: "setor_id", lider: "lider",
      guardiao: "guardiao", gargaloId: "gargalo_id", problema: "problema", solucao: "solucao",
      tipoEntrega: "tipo_entrega", meta: "meta", prazo: "prazo", status: "status",
      resultadoEsperado: "resultado_esperado", resultadoAlcancado: "resultado_alcancado",
      horasEconomizadas: "horas_economizadas", evidencias: "evidencias", observacoes: "observacoes",
      precisaApoio: "precisa_apoio", tipoApoio: "tipo_apoio", consultor: "consultor",
      tarefasPadrao: "tarefas_padrao", faseOrigem: "fase_origem", updatedAt: "updated_at",
    },
  },
  projetoRegistros: {
    table: "guardiao_projeto_registros",
    columns: {
      id: "id", projetoId: "projeto_id", data: "data", autor: "autor", tipo: "tipo", texto: "texto",
    },
    dateCols: ["data"],
  },
  tarefas: {
    table: "guardiao_tarefas",
    columns: {
      id: "id", titulo: "titulo", descricao: "descricao", setorId: "setor_id",
      projetoId: "projeto_id", gargaloId: "gargalo_id", lider: "lider", responsavel: "responsavel",
      prazo: "prazo", horario: "horario", prioridade: "prioridade", status: "status", tipo: "tipo",
      origem: "origem", tipoRotina: "tipo_rotina", recorrencia: "recorrencia",
      observacoes: "observacoes", resultadoEsperado: "resultado_esperado",
      resultadoAlcancado: "resultado_alcancado", evidencia: "evidencia", fase: "fase",
      processo: "processo", evidenciaNecessaria: "evidencia_necessaria",
    },
    dateCols: ["prazo"],
  },
  rituais: {
    table: "guardiao_rituais",
    columns: {
      id: "id", data: "data", tipo: "tipo", setorId: "setor_id", lider: "lider",
      status: "status", observacoes: "observacoes",
    },
    dateCols: ["data"],
  },
  exemplosCS: {
    table: "guardiao_exemplos_cs",
    columns: {
      id: "id", titulo: "titulo", dor: "dor", processoAntes: "processo_antes",
      solucaoIA: "solucao_ia", ganhoLider: "ganho_lider", status: "status",
    },
  },
  relatorios: {
    table: "guardiao_relatorios",
    columns: {
      id: "id", periodo: "periodo", conteudo: "conteudo", criadoEm: "created_at",
    },
  },
  vitorias: {
    table: "guardiao_vitorias",
    columns: {
      id: "id", titulo: "titulo", data: "data", setorId: "setor_id", setorNome: "setor_nome",
      fase: "fase", guardiao: "guardiao", liderSetor: "lider_setor", tipos: "tipos",
      gargaloDescricao: "gargalo_descricao", ondeTravava: "onde_travava", comoEraAntes: "como_era_antes",
      tempoAntes: "tempo_antes", impactoAntes: "impacto_antes", solucaoDescricao: "solucao_descricao",
      tipoSolucao: "tipo_solucao", nomeSolucao: "nome_solucao", linkSolucao: "link_solucao",
      faseSolucao: "fase_solucao", setorBeneficiado: "setor_beneficiado", quemUsaHoje: "quem_usa_hoje",
      reducaoHoras: "reducao_horas", horasDia: "horas_dia", horasSemana: "horas_semana",
      horasMes: "horas_mes", ganhoEficiencia: "ganho_eficiencia", percentualEficiencia: "percentual_eficiencia",
      reducaoCusto: "reducao_custo", valorCustoEconomizado: "valor_custo_economizado",
      aumentoReceita: "aumento_receita", valorReceita: "valor_receita", melhoriaDecisao: "melhoria_decisao",
      resumoVitoria: "resumo_vitoria", teveApoioPMC: "teve_apoio_pmc", apoioQuem: "apoio_quem",
      apoioDecisivo: "apoio_decisivo", apoioDescricao: "apoio_descricao", apoioLink: "apoio_link",
      evidencias: "evidencias", observacoes: "observacoes", status: "status",
      noRelatorioCEO: "no_relatorio_ceo", resumoCEO: "resumo_ceo", criadoEm: "created_at",
    },
    dateCols: ["data"],
  },
  evidencias: {
    table: "guardiao_evidencias",
    columns: {
      id: "id", fase: "fase", setorId: "setor_id", tipo: "tipo", titulo: "titulo", link: "link",
      responsavel: "responsavel", data: "data", status: "status", observacaoCS: "observacao_cs",
    },
    dateCols: ["data"],
  },
  apoios: {
    table: "guardiao_apoios",
    columns: {
      id: "id", fase: "fase", setorId: "setor_id", tipo: "tipo", descricao: "descricao",
      prioridade: "prioridade", consultorSugerido: "consultor_sugerido", linkAgenda: "link_agenda",
      status: "status", criadoEm: "created_at",
    },
  },
  arsenal: {
    table: "guardiao_arsenal",
    columns: {
      id: "id", categoria: "categoria", objetivo: "objetivo", setorId: "setor_id",
      descricao: "descricao", resultadoEsperado: "resultado_esperado", consultorSugerido: "consultor_sugerido",
      linkAgenda: "link_agenda", status: "status", evidencia: "evidencia", projetoId: "projeto_id",
      criadoEm: "created_at",
    },
  },
  inteligencia: {
    table: "guardiao_inteligencia",
    columns: {
      setorId: "setor_id", indicadores: "indicadores", ondeEstaoDados: "onde_estao_dados",
      existePlanilha: "existe_planilha", existeDashboard: "existe_dashboard",
      apresentaIndicadores: "apresenta_indicadores", frequenciaAnalise: "frequencia_analise",
      meta: "meta", indicadorPrincipal: "indicador_principal", dashboardLink: "dashboard_link",
      planoAcao: "plano_acao",
    },
    onConflict: "id_cliente,setor_id",
  },
  sugestoesIA: {
    table: "guardiao_sugestoes_ia",
    columns: {
      id: "id", setorId: "setor_id", tipo: "tipo", titulo: "titulo", texto: "texto",
      prioridade: "prioridade", faseSugerida: "fase_sugerida", status: "status", criadoEm: "created_at",
    },
  },
  itensIA: {
    table: "guardiao_itens_ia",
    columns: {
      id: "id", setorId: "setor_id", nome: "nome", tipo: "tipo", fase: "fase",
      responsavel: "responsavel", status: "status", resultadoEsperado: "resultado_esperado",
      resultadoAlcancado: "resultado_alcancado", link: "link", criadoEm: "created_at",
    },
  },
  processosSetor: {
    table: "guardiao_processos_setor",
    columns: {
      id: "id", setorId: "setor_id", nome: "nome", descricao: "descricao",
      quemExecuta: "quem_executa", ferramentas: "ferramentas", temPlanilha: "tem_planilha",
      geraIndicador: "gera_indicador", impacto: "impacto", fase: "fase", criadoEm: "created_at",
    },
  },
  tarefasRepetitivas: {
    table: "guardiao_tarefas_repetitivas",
    columns: {
      id: "id", setorId: "setor_id", nome: "nome", descricao: "descricao", quemExecuta: "quem_executa",
      cargo: "cargo", qtdPessoas: "qtd_pessoas", frequencia: "frequencia",
      tempoPorExecucao: "tempo_por_execucao", vezesPorPeriodo: "vezes_por_periodo",
      tempoSemana: "tempo_semana", tempoMes: "tempo_mes", flagPlanilha: "flag_planilha",
      flagCopiaCola: "flag_copia_cola", flagBuscaManual: "flag_busca_manual",
      flagRespostaRepetitiva: "flag_resposta_repetitiva", flagDados: "flag_dados",
      flagComunicacao: "flag_comunicacao", flagDecisaoLider: "flag_decisao_lider",
      impactos: "impactos", criadoEm: "created_at",
    },
  },
  feedbacks: {
    table: "guardiao_feedbacks",
    columns: {
      id: "id", titulo: "titulo", setorId: "setor_id", liderDestinatario: "lider_destinatario",
      fase: "fase", projetoId: "projeto_id", gargaloId: "gargalo_id", descricao: "descricao",
      proximaAcao: "proxima_acao", prazo: "prazo", prioridade: "prioridade", status: "status",
      guardiao: "guardiao", criadoEm: "created_at", atualizadoEm: "updated_at",
    },
    dateCols: ["prazo"],
  },
};

// Singleton column maps (guardiao_os / guardiao_fases).
const OS_COLUMNS: ColumnMap = {
  guardiao: "guardiao", resumo: "resumo", promptCompleto: "prompt_completo",
  promptsMetodologia: "prompts_metodologia", modo: "modo", faseAtual: "fase_atual",
};
const FASE_COLUMNS: ColumnMap = {
  status: "status", progresso: "progresso", observacoes: "observacoes", feedbackCS: "feedback_cs",
  checklist: "checklist", setoresEnvolvidos: "setores_envolvidos", resultadoAlcancado: "resultado_alcancado",
  resumoCEO: "resumo_ceo", proximaAcao: "proxima_acao", dataInicio: "data_inicio",
  prazoPrevisto: "prazo_previsto", concluidaEm: "concluida_em",
};
const FASE_DATE_COLS = new Set(["data_inicio", "prazo_previsto", "concluida_em"]);

type AnyRecord = Record<string, unknown>;

function projectToRow(columns: ColumnMap, dateCols: Set<string>, entity: AnyRecord): AnyRecord {
  const row: AnyRecord = {};
  for (const camel in columns) {
    if (!(camel in entity)) continue;
    const col = columns[camel];
    const v = entity[camel];
    if (dateCols.has(col)) {
      row[col] = v ? v : null; // date/timestamp columns: "" | undefined -> null
      continue;
    }
    if (v === undefined) continue; // omit undefined (avoids nulling NOT NULL jsonb defaults)
    row[col] = v;
  }
  return row;
}

// ---------- Pure record mappers ----------
export function entityToRow(collection: EntityCollection, entity: AnyRecord, idCliente: string): AnyRecord {
  const def = TABLE_MAP[collection];
  const row = projectToRow(def.columns, new Set(def.dateCols ?? []), entity);
  row.id_cliente = idCliente;
  return row;
}

export function rowToEntity(collection: EntityCollection, row: AnyRecord): AnyRecord {
  const def = TABLE_MAP[collection];
  const out: AnyRecord = {};
  for (const camel in def.columns) {
    const col = def.columns[camel];
    if (row[col] !== undefined) out[camel] = row[col];
  }
  return out;
}

// ---------- Write-through primitives ----------
export async function upsertEntity(collection: EntityCollection, entity: AnyRecord): Promise<void> {
  const idCliente = getResolvedClientId();
  if (!idCliente) {
    console.warn(`[guardiao] upsertEntity(${collection}) sem cliente resolvido — ignorado.`);
    return;
  }
  const def = TABLE_MAP[collection];
  const row = entityToRow(collection, entity, idCliente);
  const { error } = await supabase.from(def.table).upsert(row, { onConflict: def.onConflict ?? "id" });
  if (error) console.error(`[guardiao] upsert ${def.table}:`, error);
}

export async function deleteEntity(collection: EntityCollection, id: string): Promise<void> {
  const idCliente = getResolvedClientId();
  if (!idCliente) {
    console.warn(`[guardiao] deleteEntity(${collection}) sem cliente resolvido — ignorado.`);
    return;
  }
  const def = TABLE_MAP[collection];
  const { error } = await supabase.from(def.table).delete().eq("id", id).eq("id_cliente", idCliente);
  if (error) console.error(`[guardiao] delete ${def.table}:`, error);
}

// ---------- Singleton writers ----------
type OsPatch = Partial<{
  guardiao: GuardiaoPerfil;
  resumo: ResumoSemana;
  promptCompleto: string;
  promptsMetodologia: PromptsMetodologia;
  modo: ModoVisualizacao;
  faseAtual: Fase;
}>;

export async function saveOs(patch: OsPatch): Promise<void> {
  const idCliente = getResolvedClientId();
  if (!idCliente) {
    console.warn("[guardiao] saveOs sem cliente resolvido — ignorado.");
    return;
  }
  const row: AnyRecord = { id_cliente: idCliente };
  const p = patch as AnyRecord;
  for (const camel in OS_COLUMNS) {
    if (!(camel in p)) continue;
    const v = p[camel];
    if (v === undefined) continue;
    row[OS_COLUMNS[camel]] = v;
  }
  const { error } = await supabase.from("guardiao_os").upsert(row, { onConflict: "id_cliente" });
  if (error) console.error("[guardiao] saveOs:", error);
}

export async function saveFase(fase: number, patch: Partial<FaseEstado>): Promise<void> {
  const idCliente = getResolvedClientId();
  if (!idCliente) {
    console.warn("[guardiao] saveFase sem cliente resolvido — ignorado.");
    return;
  }
  const row: AnyRecord = { id_cliente: idCliente, fase };
  const p = patch as AnyRecord;
  for (const camel in FASE_COLUMNS) {
    if (!(camel in p)) continue;
    const col = FASE_COLUMNS[camel];
    const v = p[camel];
    if (FASE_DATE_COLS.has(col)) {
      row[col] = v ? v : null;
      continue;
    }
    if (v === undefined) continue;
    row[col] = v;
  }
  const { error } = await supabase.from("guardiao_fases").upsert(row, { onConflict: "id_cliente,fase" });
  if (error) console.error("[guardiao] saveFase:", error);
}

// ---------- Full load ----------
export async function loadAll(idCliente: string): Promise<State> {
  const q = (t: string) => supabase.from(t).select("*").eq("id_cliente", idCliente);

  const [
    osRes, fasesRes, setoresRes, processosRes, tarefasRepRes, gargalosRes, projetosRes,
    registrosRes, tarefasRes, rituaisRes, exemplosRes, relatoriosRes, vitoriasRes,
    evidenciasRes, apoiosRes, arsenalRes, inteligenciaRes, sugestoesRes, itensRes, feedbacksRes,
  ] = await Promise.all([
    supabase.from("guardiao_os").select("*").eq("id_cliente", idCliente).maybeSingle(),
    q("guardiao_fases"),
    q("guardiao_setores"),
    q("guardiao_processos_setor"),
    q("guardiao_tarefas_repetitivas"),
    q("guardiao_gargalos"),
    q("guardiao_projetos"),
    q("guardiao_projeto_registros").order("created_at", { ascending: false }),
    q("guardiao_tarefas"),
    q("guardiao_rituais"),
    q("guardiao_exemplos_cs"),
    q("guardiao_relatorios"),
    q("guardiao_vitorias"),
    q("guardiao_evidencias"),
    q("guardiao_apoios"),
    q("guardiao_arsenal"),
    q("guardiao_inteligencia"),
    q("guardiao_sugestoes_ia"),
    q("guardiao_itens_ia"),
    q("guardiao_feedbacks"),
  ]);

  const rows = (res: { data: unknown }): AnyRecord[] => ((res?.data ?? []) as AnyRecord[]);
  const mapRows = (res: { data: unknown }, c: EntityCollection): AnyRecord[] =>
    rows(res).map((r) => rowToEntity(c, r));

  const osRow = ((osRes as { data: unknown }).data ?? null) as AnyRecord | null;

  // Jornada from guardiao_os.fase_atual + guardiao_fases rows.
  const jornada = defaultJornada();
  for (const r of rows(fasesRes)) {
    const f = Number(r.fase) as Fase;
    if (f < 1 || f > 7) continue;
    jornada.fases[f] = {
      status: (r.status as FaseEstado["status"]) ?? jornada.fases[f].status,
      progresso: (r.progresso as number) ?? 0,
      observacoes: (r.observacoes as string) ?? "",
      feedbackCS: (r.feedback_cs as string) ?? "",
      concluidaEm: (r.concluida_em as string) ?? undefined,
      checklist: (r.checklist as Record<string, boolean>) ?? {},
      setoresEnvolvidos: (r.setores_envolvidos as string[]) ?? [],
      resultadoAlcancado: (r.resultado_alcancado as string) ?? "",
      resumoCEO: (r.resumo_ceo as string) ?? "",
      proximaAcao: (r.proxima_acao as string) ?? "",
      dataInicio: (r.data_inicio as string) ?? undefined,
      prazoPrevisto: (r.prazo_previsto as string) ?? undefined,
    };
  }
  jornada.faseAtual = (osRow?.fase_atual as Fase) ?? 1;

  // Singletons from guardiao_os (defaults when null/empty).
  const guardiaoRaw = (osRow?.guardiao && typeof osRow.guardiao === "object"
    ? (osRow.guardiao as Partial<GuardiaoPerfil>)
    : {});
  const guardiao: GuardiaoPerfil = {
    ...defaultGuardiao(),
    ...guardiaoRaw,
    habilidades: {
      ...defaultGuardiao().habilidades,
      ...((guardiaoRaw as { habilidades?: Partial<GuardiaoPerfil["habilidades"]> }).habilidades ?? {}),
    },
  };

  const resumoRaw = (osRow?.resumo && typeof osRow.resumo === "object"
    ? (osRow.resumo as Partial<ResumoSemana>)
    : {});
  const resumo: ResumoSemana = { ...emptyResumo(), ...resumoRaw };

  const pmRaw = (osRow?.prompts_metodologia && typeof osRow.prompts_metodologia === "object"
    ? (osRow.prompts_metodologia as Partial<PromptsMetodologia>)
    : {});
  const promptsMetodologia: PromptsMetodologia = Object.keys(pmRaw).length
    ? { ...PROMPTS_FASE_PADRAO, ...pmRaw }
    : { ...PROMPTS_FASE_PADRAO };

  const promptCompleto: string = (osRow?.prompt_completo as string) ?? PROMPT_PADRAO;
  const modo: ModoVisualizacao = (osRow?.modo as ModoVisualizacao) ?? "cliente";

  // Projetos with their registros attached (registros live in a separate table).
  const registrosByProjeto = new Map<string, AnyRecord[]>();
  for (const r of rows(registrosRes)) {
    const pid = String(r.projeto_id ?? "");
    if (!pid) continue;
    const list = registrosByProjeto.get(pid) ?? [];
    list.push(rowToEntity("projetoRegistros", r));
    registrosByProjeto.set(pid, list);
  }
  const projetos = rows(projetosRes).map((r) => {
    const p = rowToEntity("projetos", r);
    p.registros = registrosByProjeto.get(String(r.id)) ?? [];
    return p;
  });

  return {
    setores: mapRows(setoresRes, "setores"),
    gargalos: mapRows(gargalosRes, "gargalos"),
    projetos,
    tarefas: mapRows(tarefasRes, "tarefas"),
    rituais: mapRows(rituaisRes, "rituais"),
    exemplosCS: mapRows(exemplosRes, "exemplosCS"),
    resumo,
    relatorios: mapRows(relatoriosRes, "relatorios"),
    promptCompleto,
    jornada,
    guardiao,
    evidencias: mapRows(evidenciasRes, "evidencias"),
    apoios: mapRows(apoiosRes, "apoios"),
    arsenal: mapRows(arsenalRes, "arsenal"),
    inteligencia: mapRows(inteligenciaRes, "inteligencia"),
    modo,
    promptsMetodologia,
    vitorias: mapRows(vitoriasRes, "vitorias"),
    processosSetor: mapRows(processosRes, "processosSetor"),
    tarefasRepetitivas: mapRows(tarefasRepRes, "tarefasRepetitivas"),
    sugestoesIA: mapRows(sugestoesRes, "sugestoesIA"),
    itensIA: mapRows(itensRes, "itensIA"),
    feedbacks: mapRows(feedbacksRes, "feedbacks"),
  } as unknown as State;
}
