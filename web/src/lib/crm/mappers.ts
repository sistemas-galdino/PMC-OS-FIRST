import type {
  Atividade,
  AtividadeStatus,
  Cliente,
  ClienteStatus,
  Engajamento,
  GuardiaoEtapa,
  Prioridade,
  Reuniao,
  SituacaoCliente,
  Temperatura,
} from "./types"

/**
 * Tradução entre as linhas do Supabase e os tipos de domínio do CS Manager.
 *
 * Os vocabulários foram conferidos contra os valores REAIS em produção
 * (301 clientes) — o banco grava snake_case minúsculo ("quente", "ativo_alto",
 * "ja_fez") e a UI da Mayara espera rótulos ("Quente", "Engajado", "Já fez").
 * Mapear de cabeça aqui distorceria todos os indicadores da carteira.
 */

// ───────────────────────── Cliente ─────────────────────────

const TEMPERATURA: Record<string, Temperatura> = {
  quente: "Quente",
  morno: "Morno",
  frio: "Frio",
}

// nivel_engajamento tem mais estados no banco do que o enum da UI.
const ENGAJAMENTO: Record<string, Engajamento> = {
  ativo_alto: "Engajado",
  ativo_medio: "Saudável",
  cliente_novo: "Saudável",
  desengajado: "Desengajado",
  congelado: "Em Atenção",
  sem_onboarding: "Em Atenção",
  cancelado: "Crítico",
}

const SAUDE: Record<string, "Saudável" | "Em Atenção" | "Crítico"> = {
  saudavel: "Saudável",
  atencao: "Em Atenção",
  critico: "Crítico",
}

const REUNIAO_STATUS: Record<string, "Já fez" | "Nunca fez" | "Agendada"> = {
  ja_fez: "Já fez",
  agendada: "Agendada",
  nao_agendada: "Nunca fez",
  pendente: "Nunca fez",
}

const GUARDIAO_ETAPA: Record<string, GuardiaoEtapa> = {
  sim: "Atuando",
  nao: "Não definido",
  em_definicao: "Em definição",
  em_implantacao: "Definido",
  sem_informacao: "Não definido",
}

/**
 * Os vocabulários abaixo NÃO são convenção: são CHECK constraints em
 * clientes_entrada_new. Escrever o rótulo da UI ("Em implementação") direto na
 * coluna faz o INSERT/UPDATE ser rejeitado pelo banco. Por isso cada um tem
 * ida e volta, e o `inverter()` garante que os dois lados não saiam de sincronia.
 */
function inverter<T extends string>(m: Record<string, T>): Record<T, string> {
  const out = {} as Record<T, string>
  for (const [db, ui] of Object.entries(m)) if (!(ui in out)) out[ui as T] = db
  return out
}

// CHECK: nao_iniciado | em_andamento | implementado | travado | nao_se_aplica | sem_informacao
const BCRM_IMPL: Record<string, NonNullable<Cliente["bcrm_status_impl"]>> = {
  nao_iniciado: "Não iniciado",
  em_andamento: "Em implementação",
  implementado: "Implementado",
  travado: "Em implementação",
  nao_se_aplica: "Recusado",
  sem_informacao: "Não iniciado",
}
const BCRM_IMPL_INV = inverter(BCRM_IMPL)

// CHECK: nao_se_aplica | ativa | implementada | em_implementacao | cancelada | pausada
const BCRM_CONTA: Record<string, NonNullable<Cliente["bcrm_status_conta"]>> = {
  ativa: "Ativa",
  implementada: "Ativa",
  em_implementacao: "Ativa",
  pausada: "Suspensa",
  cancelada: "Inativa",
  nao_se_aplica: "Inativa",
}
const BCRM_CONTA_INV = inverter(BCRM_CONTA)

// CHECK: participa | nao_participa | participa_parcialmente | pendente
const BCRM_TUTORIA: Record<string, NonNullable<Cliente["bcrm_tutoria"]>> = {
  participa: "Participa",
  participa_parcialmente: "Participa",
  nao_participa: "Não participa",
  pendente: "Não participa",
}
const BCRM_TUTORIA_INV = inverter(BCRM_TUTORIA)

// CHECK: ainda_distante | em_negociacao | confirmada | recusada | em_risco
const RENOVACAO: Record<string, NonNullable<Cliente["renovacao_status"]>> = {
  ainda_distante: "Ainda distante",
  em_risco: "Aproximando",
  em_negociacao: "Em negociação",
  confirmada: "Confirmada",
  recusada: "Perdida",
}
const RENOVACAO_INV = inverter(RENOVACAO)

// CHECK: nao_definido | privado | grupo_individual | grupo_geral | misto
const COM_PREF: Record<string, NonNullable<Cliente["comunicacao_preferencia"]>> = {
  grupo_geral: "Grupo geral",
  grupo_individual: "Grupo individual do cliente",
  privado: "Privado com CS",
  misto: "Grupo individual do cliente",
  nao_definido: "Grupo geral",
}
const COM_PREF_INV = inverter(COM_PREF)

// CHECK: whatsapp | ligacao | audio_whatsapp | mensagem_texto | outro
const COM_CANAL: Record<string, NonNullable<Cliente["comunicacao_canal"]>> = {
  whatsapp: "WhatsApp",
  audio_whatsapp: "WhatsApp",
  mensagem_texto: "WhatsApp",
  ligacao: "Telefone",
  outro: "E-mail",
}
const COM_CANAL_INV = inverter(COM_CANAL)

// CHECK (presenca_treinamentos e frequencia_grupo_whatsapp): alta | media | baixa | nenhuma [| sem_informacao]
const INTENSIDADE: Record<string, "Nenhuma" | "Baixa" | "Média" | "Alta"> = {
  alta: "Alta",
  media: "Média",
  baixa: "Baixa",
  nenhuma: "Nenhuma",
  sem_informacao: "Nenhuma",
}

const FREQUENCIA_WPP: Record<string, "Baixa" | "Média" | "Alta"> = {
  alta: "Alta",
  media: "Média",
  baixa: "Baixa",
}

// Status que significam "ainda não começou o programa" — a pré-jornada que a
// Francielly descreveu ("não tem reunião com Galdino, não iniciou o ciclo").
const STATUS_PRE_JORNADA = new Set([
  "Aguardando Início",
  "Onboarding marcado",
  "Pendente de Onboarding",
  "Congelado",
])
const STATUS_ENCERRADOS = new Set([
  "Cliente Cancelado",
  "Desistência de Compra",
  "Ciclo encerrado",
])

function situacaoDeStatus(row: ClienteRow): SituacaoCliente {
  if (row.situacao) return row.situacao as SituacaoCliente
  const s = row.status_atual ?? ""
  if (STATUS_ENCERRADOS.has(s)) return "Cancelado"
  if (STATUS_PRE_JORNADA.has(s)) return "Não iniciou o programa"
  return "Ativo"
}

function statusComercial(row: ClienteRow): ClienteStatus {
  if (STATUS_ENCERRADOS.has(row.status_atual ?? "")) return "Cancelado"
  if (row.em_risco_cancelamento) return "Em Risco"
  return "Ativo"
}

/** Colunas de clientes_entrada_new que o CRM lê. */
export interface ClienteRow {
  id_cliente: string
  nome_cliente: string | null
  nome_empresa: string | null
  nome_empresa_formatado: string | null
  status_atual: string | null
  situacao: string | null
  sc: string | null
  data: string | null
  created_at: string | null
  nicho: string | null
  subnicho: string | null
  temperatura_cliente: string | null
  nivel_engajamento: string | null
  saude_cliente: string | null
  em_risco_cancelamento: boolean | null
  observacoes_cs: string | null
  presenca_treinamentos: string | null
  frequencia_grupo_whatsapp: string | null
  reuniao_consultores_status: string | null
  reuniao_galdino_status: string | null
  tem_guardiao_ia: string | null
  guardiao_ia_nome: string | null
  guardiao_ia_telefone: string | null
  guardiao_ia_cargo: string | null
  guardiao_ia_etapa: string | null
  guardiao_ia_etapa_desde: string | null
  tem_conta_blackcrm: string | null
  quantas_contas_blackcrm: number | null
  tem_guardiao_crm: string | null
  guardiao_crm_nome: string | null
  guardiao_crm_telefone: string | null
  nomes_contas_blackcrm: string | null
  blackcrm_status_conta: string | null
  blackcrm_status_implementacao: string | null
  blackcrm_status_impl_desde: string | null
  blackcrm_participa_tutoria: string | null
  blackcrm_tem_vitorias: string | null
  blackcrm_vitorias_descricao: string | null
  renovacao_data: string | null
  renovacao_valor: number | null
  renovacao_status: string | null
  renovacao_observacoes: string | null
  comunicacao_preferencia: string | null
  comunicacao_canal: string | null
  comunicacao_restricoes: string | null
  comunicacao_resumo: string | null
  area_membros_acesso_cliente: boolean | null
  area_membros_acesso_equipe: boolean | null
  area_membros_ultimo_acesso: string | null
  pausado: boolean | null
  pausado_motivo: string | null
  pausado_em: string | null
  pausado_por: string | null
  whatsapp_grupo_id: string | null
  whatsapp_grupo_nome: string | null
  ciclo_galdino_cadencia: number | null
  data_cancelamento: string | null
}

export const CLIENTE_COLUNAS = [
  "id_cliente", "nome_cliente", "nome_empresa", "nome_empresa_formatado",
  "status_atual", "situacao", "sc", "data", "created_at", "nicho", "subnicho",
  "temperatura_cliente", "nivel_engajamento", "saude_cliente",
  "em_risco_cancelamento", "observacoes_cs", "presenca_treinamentos",
  "frequencia_grupo_whatsapp", "reuniao_consultores_status",
  "reuniao_galdino_status", "tem_guardiao_ia", "guardiao_ia_nome",
  "guardiao_ia_telefone", "guardiao_ia_cargo", "guardiao_ia_etapa",
  "guardiao_ia_etapa_desde", "tem_conta_blackcrm", "quantas_contas_blackcrm",
  "tem_guardiao_crm", "guardiao_crm_nome", "guardiao_crm_telefone",
  "nomes_contas_blackcrm", "blackcrm_status_conta",
  "blackcrm_status_implementacao", "blackcrm_status_impl_desde",
  "blackcrm_participa_tutoria", "blackcrm_tem_vitorias",
  "blackcrm_vitorias_descricao", "renovacao_data", "renovacao_valor",
  "renovacao_status", "renovacao_observacoes", "comunicacao_preferencia",
  "comunicacao_canal", "comunicacao_restricoes", "comunicacao_resumo",
  "area_membros_acesso_cliente", "area_membros_acesso_equipe",
  "area_membros_ultimo_acesso", "pausado", "pausado_motivo", "pausado_em",
  "pausado_por", "whatsapp_grupo_id", "whatsapp_grupo_nome",
  "ciclo_galdino_cadencia", "data_cancelamento",
].join(", ")

const simNao = (v: string | null): "Sim" | "Não" | undefined =>
  v === "sim" ? "Sim" : v === "nao" ? "Não" : undefined

export function rowToCliente(row: ClienteRow): Cliente {
  const impl = row.blackcrm_status_implementacao
  return {
    id: row.id_cliente,
    nome: row.nome_empresa_formatado || row.nome_empresa || row.nome_cliente || "(sem nome)",
    empresa: row.nome_empresa ?? undefined,
    responsavel_cs: row.sc ?? "",
    status: statusComercial(row),
    situacao: situacaoDeStatus(row),
    temperatura: TEMPERATURA[row.temperatura_cliente ?? ""] ?? "Não definido",
    engajamento: ENGAJAMENTO[row.nivel_engajamento ?? ""] ?? "Saudável",
    // Decisão do David: o relógio do ciclo começa na data de entrada/onboarding.
    // `created_at` é só rede de segurança para linhas sem `data` (ver backfill).
    data_inicio: row.data ?? row.created_at ?? "",
    observacoes: row.observacoes_cs ?? "",

    nicho: row.nicho ?? undefined,
    subnicho: row.subnicho ?? undefined,
    saude: SAUDE[row.saude_cliente ?? ""],
    em_risco_cancelamento: row.em_risco_cancelamento ? "Sim" : "Não",

    presenca_treinamento: INTENSIDADE[row.presenca_treinamentos ?? ""],
    // frequencia_wpp não tem "Nenhuma" no domínio: "sem frequência" e "sem
    // informação" viram ausência de valor, não uma frequência baixa.
    frequencia_wpp: FREQUENCIA_WPP[row.frequencia_grupo_whatsapp ?? ""],
    reuniao_consultores_status: REUNIAO_STATUS[row.reuniao_consultores_status ?? ""],
    reuniao_galdino_status: REUNIAO_STATUS[row.reuniao_galdino_status ?? ""],
    reuniao_galdino: row.reuniao_galdino_status === "ja_fez",

    guardiao_ia: row.tem_guardiao_ia === "sim",
    guardiao_ia_nome: row.guardiao_ia_nome ?? undefined,
    guardiao_ia_telefone: row.guardiao_ia_telefone ?? undefined,
    guardiao_ia_cargo: row.guardiao_ia_cargo ?? undefined,
    guardiao_ia_etapa:
      (row.guardiao_ia_etapa as GuardiaoEtapa) ??
      GUARDIAO_ETAPA[row.tem_guardiao_ia ?? ""] ??
      "Não definido",
    guardiao_ia_etapa_desde: row.guardiao_ia_etapa_desde ?? undefined,

    area_membros_acesso_cliente: row.area_membros_acesso_cliente ?? undefined,
    area_membros_acesso_equipe: row.area_membros_acesso_equipe ?? undefined,
    area_membros_ultimo_acesso: row.area_membros_ultimo_acesso ?? undefined,

    black_crm: row.tem_conta_blackcrm === "sim",
    bcrm_tem_conta: simNao(row.tem_conta_blackcrm),
    bcrm_qtd_contas: row.quantas_contas_blackcrm ?? undefined,
    bcrm_tem_guardiao: simNao(row.tem_guardiao_crm),
    bcrm_guardiao_nome: row.guardiao_crm_nome ?? undefined,
    bcrm_guardiao_telefone: row.guardiao_crm_telefone ?? undefined,
    bcrm_nomes_contas: row.nomes_contas_blackcrm ?? undefined,
    bcrm_status_conta: BCRM_CONTA[row.blackcrm_status_conta ?? ""],
    bcrm_status_impl: BCRM_IMPL[impl ?? ""],
    bcrm_status_impl_desde: row.blackcrm_status_impl_desde ?? undefined,
    bcrm_tutoria: BCRM_TUTORIA[row.blackcrm_participa_tutoria ?? ""],
    bcrm_tem_vitorias: simNao(row.blackcrm_tem_vitorias),
    bcrm_quais_vitorias: row.blackcrm_vitorias_descricao ?? undefined,

    data_renovacao: row.renovacao_data ?? undefined,
    renovacao_valor: row.renovacao_valor ?? undefined,
    renovacao_status: RENOVACAO[row.renovacao_status ?? ""],
    renovacao_obs: row.renovacao_observacoes ?? undefined,

    comunicacao_preferencia: COM_PREF[row.comunicacao_preferencia ?? ""],
    comunicacao_canal: COM_CANAL[row.comunicacao_canal ?? ""],
    comunicacao_restricoes: row.comunicacao_restricoes ?? undefined,
    comunicacao_resumo: row.comunicacao_resumo ?? undefined,
    whatsapp_grupo_id: row.whatsapp_grupo_id ?? undefined,
    whatsapp_grupo_nome: row.whatsapp_grupo_nome ?? undefined,

    ciclo_galdino_cadencia: (row.ciclo_galdino_cadencia as 4 | 6 | 12) ?? undefined,

    pausado: row.pausado ?? false,
    pausado_motivo: row.pausado_motivo ?? undefined,
    pausado_em: row.pausado_em ?? undefined,
    pausado_por: row.pausado_por ?? undefined,
    cancelamento_data: row.data_cancelamento ?? undefined,
  }
}

const TEMPERATURA_INV: Record<string, string | null> = {
  Quente: "quente",
  Morno: "morno",
  Frio: "frio",
  "Em Risco": "frio",
  "Não definido": null,
}

/** Campos do domínio que voltam para colunas de clientes_entrada_new. */
export function clientePatchToRow(patch: Partial<Cliente>): Record<string, unknown> {
  const out: Record<string, unknown> = {}
  if (patch.temperatura !== undefined) out.temperatura_cliente = TEMPERATURA_INV[patch.temperatura] ?? null
  if (patch.observacoes !== undefined) out.observacoes_cs = patch.observacoes
  if (patch.situacao !== undefined) out.situacao = patch.situacao
  if (patch.responsavel_cs !== undefined) out.sc = patch.responsavel_cs
  if (patch.pausado !== undefined) out.pausado = patch.pausado
  if (patch.pausado_motivo !== undefined) out.pausado_motivo = patch.pausado_motivo
  if (patch.pausado_em !== undefined) out.pausado_em = patch.pausado_em
  if (patch.pausado_por !== undefined) out.pausado_por = patch.pausado_por
  if (patch.guardiao_ia_etapa !== undefined) out.guardiao_ia_etapa = patch.guardiao_ia_etapa
  if (patch.guardiao_ia_etapa_desde !== undefined) out.guardiao_ia_etapa_desde = patch.guardiao_ia_etapa_desde
  if (patch.guardiao_ia_nome !== undefined) out.guardiao_ia_nome = patch.guardiao_ia_nome
  if (patch.guardiao_ia_telefone !== undefined) out.guardiao_ia_telefone = patch.guardiao_ia_telefone
  if (patch.guardiao_ia_cargo !== undefined) out.guardiao_ia_cargo = patch.guardiao_ia_cargo
  // Todos estes passam por tradução inversa: o valor da UI não é aceito pelos
  // CHECK constraints da tabela.
  if (patch.bcrm_status_impl !== undefined)
    out.blackcrm_status_implementacao = patch.bcrm_status_impl ? BCRM_IMPL_INV[patch.bcrm_status_impl] : null
  if (patch.bcrm_status_conta !== undefined)
    out.blackcrm_status_conta = patch.bcrm_status_conta ? BCRM_CONTA_INV[patch.bcrm_status_conta] : null
  if (patch.bcrm_tutoria !== undefined)
    out.blackcrm_participa_tutoria = patch.bcrm_tutoria ? BCRM_TUTORIA_INV[patch.bcrm_tutoria] : null
  if (patch.bcrm_status_impl_desde !== undefined) out.blackcrm_status_impl_desde = patch.bcrm_status_impl_desde
  if (patch.renovacao_status !== undefined)
    out.renovacao_status = patch.renovacao_status ? RENOVACAO_INV[patch.renovacao_status] : null
  if (patch.comunicacao_preferencia !== undefined)
    out.comunicacao_preferencia = patch.comunicacao_preferencia ? COM_PREF_INV[patch.comunicacao_preferencia] : null
  if (patch.comunicacao_canal !== undefined)
    out.comunicacao_canal = patch.comunicacao_canal ? COM_CANAL_INV[patch.comunicacao_canal] : null
  if (patch.renovacao_obs !== undefined) out.renovacao_observacoes = patch.renovacao_obs
  if (patch.data_renovacao !== undefined) out.renovacao_data = patch.data_renovacao
  if (patch.comunicacao_resumo !== undefined) out.comunicacao_resumo = patch.comunicacao_resumo
  if (patch.whatsapp_grupo_id !== undefined) out.whatsapp_grupo_id = patch.whatsapp_grupo_id
  if (patch.whatsapp_grupo_nome !== undefined) out.whatsapp_grupo_nome = patch.whatsapp_grupo_nome
  if (patch.area_membros_acesso_cliente !== undefined) out.area_membros_acesso_cliente = patch.area_membros_acesso_cliente
  if (patch.area_membros_acesso_equipe !== undefined) out.area_membros_acesso_equipe = patch.area_membros_acesso_equipe
  return out
}

// ───────────────────────── Atividade ─────────────────────────

const STATUS_DB_TO_UI: Record<string, AtividadeStatus> = {
  pendente: "Pendente",
  em_andamento: "Em andamento",
  aguardando_cliente: "Aguardando cliente",
  aguardando_time: "Aguardando time interno",
  realizado: "Concluída",
  impedido: "Impedida",
  atrasado: "Atrasada",
  cancelado: "Pendente",
}
const STATUS_UI_TO_DB: Record<AtividadeStatus, string> = {
  Pendente: "pendente",
  "Em andamento": "em_andamento",
  "Aguardando cliente": "aguardando_cliente",
  "Aguardando time interno": "aguardando_time",
  Concluída: "realizado",
  Impedida: "impedido",
  Atrasada: "atrasado",
}

const PRIO_DB_TO_UI: Record<string, Prioridade> = {
  alta: "Urgente",
  media: "Médio",
  baixa: "Normal",
}
const PRIO_UI_TO_DB: Record<Prioridade, string> = {
  Urgente: "alta",
  Médio: "media",
  Normal: "baixa",
}

export interface AtividadeRow {
  id: string
  id_cliente: string | null
  titulo: string
  descricao: string | null
  tipo: string | null
  entrega_relacionada: string | null
  entrega_detalhe: string | null
  acao: string | null
  acao_detalhe: string | null
  prioridade: string
  prazo: string | null
  hora: string | null
  status: string
  responsavel_cs: string | null
  responsavel_tipo: string
  responsavel_nome: string | null
  dependencia_nome: string | null
  motivo_impedimento: string | null
  status_desde: string | null
  data_conclusao: string | null
  origem: string | null
  origem_label: string | null
  batch_id: string | null
  projeto_id: string | null
  pulou_proxima: boolean
  created_at: string
}

export const ATIVIDADE_COLUNAS = [
  "id", "id_cliente", "titulo", "descricao", "tipo", "entrega_relacionada",
  "entrega_detalhe", "acao", "acao_detalhe", "prioridade", "prazo", "hora",
  "status", "responsavel_cs", "responsavel_tipo", "responsavel_nome",
  "dependencia_nome", "motivo_impedimento", "status_desde", "data_conclusao",
  "origem", "origem_label", "batch_id", "projeto_id", "pulou_proxima",
  "created_at",
].join(", ")

/** `prazo` é date e `hora` é time; a UI trabalha com um ISO só. */
function juntarPrazo(prazo: string | null, hora: string | null): string {
  if (!prazo) return ""
  return new Date(`${prazo}T${hora ?? "12:00:00"}`).toISOString()
}

export function rowToAtividade(row: AtividadeRow): Atividade {
  return {
    id: row.id,
    cliente_id: row.id_cliente ?? "",
    cs_responsavel: row.responsavel_cs ?? "",
    titulo: row.titulo,
    tipo: (row.tipo as Atividade["tipo"]) ?? "Outro",
    prioridade: PRIO_DB_TO_UI[row.prioridade] ?? "Normal",
    descricao: row.descricao ?? "",
    entrega: row.entrega_relacionada ?? undefined,
    entrega_detalhe: row.entrega_detalhe ?? undefined,
    acao: row.acao ?? undefined,
    acao_detalhe: row.acao_detalhe ?? undefined,
    data_prevista: juntarPrazo(row.prazo, row.hora),
    hora: row.hora ? row.hora.slice(0, 5) : undefined,
    status: STATUS_DB_TO_UI[row.status] ?? "Pendente",
    data_conclusao: row.data_conclusao ?? undefined,
    pulou_proxima: row.pulou_proxima,
    batch_id: row.batch_id ?? undefined,
    origem: (row.origem as Atividade["origem"]) ?? undefined,
    origem_label: row.origem_label ?? undefined,
    motivo_impedimento: row.motivo_impedimento ?? undefined,
    status_desde: row.status_desde ?? undefined,
    dependencia_nome: row.dependencia_nome ?? undefined,
    responsavel_tipo: (row.responsavel_tipo as Atividade["responsavel_tipo"]) ?? "CS",
    responsavel_nome: row.responsavel_nome ?? undefined,
    projeto_id: row.projeto_id ?? undefined,
  }
}

export function atividadeToRow(a: Partial<Atividade>): Record<string, unknown> {
  const out: Record<string, unknown> = {}
  if (a.cliente_id !== undefined) out.id_cliente = a.cliente_id || null
  if (a.cs_responsavel !== undefined) out.responsavel_cs = a.cs_responsavel
  if (a.titulo !== undefined) out.titulo = a.titulo
  if (a.tipo !== undefined) out.tipo = a.tipo
  if (a.prioridade !== undefined) out.prioridade = PRIO_UI_TO_DB[a.prioridade]
  if (a.descricao !== undefined) out.descricao = a.descricao
  if (a.entrega !== undefined) out.entrega_relacionada = a.entrega
  if (a.entrega_detalhe !== undefined) out.entrega_detalhe = a.entrega_detalhe
  if (a.acao !== undefined) out.acao = a.acao
  if (a.acao_detalhe !== undefined) out.acao_detalhe = a.acao_detalhe
  if (a.data_prevista !== undefined) {
    const d = new Date(a.data_prevista)
    out.prazo = isNaN(d.getTime()) ? null : d.toISOString().slice(0, 10)
  }
  if (a.hora !== undefined) out.hora = a.hora ? `${a.hora}:00` : null
  if (a.status !== undefined) out.status = STATUS_UI_TO_DB[a.status]
  if (a.pulou_proxima !== undefined) out.pulou_proxima = a.pulou_proxima
  if (a.batch_id !== undefined) out.batch_id = a.batch_id ?? null
  if (a.origem !== undefined) out.origem = a.origem
  if (a.origem_label !== undefined) out.origem_label = a.origem_label
  if (a.motivo_impedimento !== undefined) out.motivo_impedimento = a.motivo_impedimento
  if (a.dependencia_nome !== undefined) out.dependencia_nome = a.dependencia_nome
  if (a.responsavel_tipo !== undefined) out.responsavel_tipo = a.responsavel_tipo
  if (a.responsavel_nome !== undefined) out.responsavel_nome = a.responsavel_nome
  if (a.projeto_id !== undefined) out.projeto_id = a.projeto_id ?? null
  return out
}

// ───────────────────────── Reunião ─────────────────────────

export interface ReuniaoRow {
  ref: string
  origem: string
  id_cliente: string | null
  empresa: string | null
  responsavel_externo: string | null
  tipo: string
  subtipo: string
  data: string | null
  hora_inicio: string | null
  duracao_minutos: number | null
  link_reuniao: string | null
  status_agendamento: string | null
  cliente_compareceu: boolean | null
  resumo: string | null
  link_gravacao: string | null
  tem_transcricao: boolean
}

const STATUS_REUNIAO: Record<string, Reuniao["status"]> = {
  agendado: "Agendada",
  agendada: "Agendada",
  realizado: "Realizada",
  realizada: "Realizada",
  cancelado: "Cancelada",
  cancelada: "Cancelada",
}

function statusDaReuniao(row: ReuniaoRow): Reuniao["status"] {
  const passou = row.data ? new Date(`${row.data}T23:59:59`) < new Date() : false
  return (
    STATUS_REUNIAO[(row.status_agendamento ?? "").toLowerCase()] ??
    (passou ? "Realizada" : "Agendada")
  )
}

/**
 * Distribui as reuniões da view crm_reunioes_v dentro de cada Cliente.
 *
 * Isto NÃO é enfeite: o catálogo de alertas e as funções de jornada
 * (reunioesConsultorConsumidas, temReuniaoGaldinoNoTrimestre,
 * diasDesdeUltimaReuniaoConsultor) leem exclusivamente desses dois arrays.
 * No sistema original eles eram digitados à mão dentro do cliente; aqui a
 * fonte real são as reuniões sincronizadas do Google Calendar.
 *
 * Sem este passo, "Sem reunião com Galdino no trimestre" dispararia para todos
 * os clientes ativos e "Sem reunião com consultor" não dispararia para nenhum.
 */
export function anexarReunioes(clientes: Cliente[], reunioes: ReuniaoRow[]): Cliente[] {
  const porCliente = new Map<string, ReuniaoRow[]>()
  for (const r of reunioes) {
    if (!r.id_cliente) continue
    const lista = porCliente.get(r.id_cliente)
    if (lista) lista.push(r)
    else porCliente.set(r.id_cliente, [r])
  }

  return clientes.map((c) => {
    const rs = porCliente.get(c.id)
    if (!rs) return c

    const galdino = rs
      .filter((r) => r.origem === "galdino")
      .map((r) => ({
        id: `${r.origem}:${r.ref}`,
        data_reuniao: r.data ?? undefined,
        status: statusDaReuniao(r) as "Agendada" | "Realizada" | "Cancelada",
      }))

    // Black CRM é suporte de produto, não reunião de consultoria — fica de fora
    // da contagem das 21 reuniões contratadas.
    const consultor = rs
      .filter((r) => r.origem === "mentoria" || r.origem === "central")
      .map((r) => ({
        id: `${r.origem}:${r.ref}`,
        consultor: r.responsavel_externo ?? "Consultor",
        data: r.data ?? "",
        status: statusDaReuniao(r),
      }))

    const ultima = (lista: { data?: string; status: string }[]) =>
      lista
        .filter((x) => x.status === "Realizada" && x.data)
        .map((x) => x.data as string)
        .sort()
        .pop()

    return {
      ...c,
      ciclo_galdino_reunioes: galdino,
      consultor_reunioes: consultor,
      ultima_reuniao_galdino: ultima(galdino.map((g) => ({ data: g.data_reuniao, status: g.status }))),
      ultima_reuniao_consultor: ultima(consultor),
      // A coluna reuniao_galdino_status é preenchida à mão pelo time e vive
      // desatualizada; havendo reunião realizada de verdade, ela ganha.
      reuniao_galdino: galdino.some((g) => g.status === "Realizada") || c.reuniao_galdino,
    }
  })
}

export function rowToReuniao(row: ReuniaoRow, csResponsavel: string): Reuniao {
  const passou = row.data ? new Date(`${row.data}T23:59:59`) < new Date() : false
  return {
    // `ref` já é único por tabela de origem, mas o mesmo id pode existir em
    // duas origens — o prefixo garante unicidade na lista unificada.
    id: `${row.origem}:${row.ref}`,
    cliente_id: row.id_cliente ?? undefined,
    cs_responsavel: csResponsavel,
    titulo: `${row.subtipo} · ${row.empresa ?? "Cliente"}`,
    tipo: "Cliente",
    subtipo: (row.subtipo as Reuniao["subtipo"]) ?? "Outro",
    data: row.data ?? "",
    hora_inicio: row.hora_inicio ? row.hora_inicio.slice(0, 5) : "",
    duracao_minutos: row.duracao_minutos ?? 60,
    link_reuniao: row.link_reuniao ?? undefined,
    resumo: row.resumo ?? undefined,
    origem: "Google Calendar",
    status:
      STATUS_REUNIAO[(row.status_agendamento ?? "").toLowerCase()] ??
      (passou ? "Realizada" : "Agendada"),
    participacao_cs: "Nao participa",
    responsavel_externo: row.responsavel_externo ?? undefined,
  }
}
