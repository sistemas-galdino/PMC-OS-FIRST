import { useEffect, useState } from "react"
import { useQuery } from "@tanstack/react-query"
import { supabase } from "@/lib/supabase"
import { queryClient } from "@/lib/query-client"
import {
  ATIVIDADE_COLUNAS,
  CLIENTE_COLUNAS,
  anexarHistoricoTemperatura,
  anexarReunioes,
  atividadeToRow,
  clientePatchToRow,
  rowToAtividade,
  rowToCliente,
  rowToReuniao,
  type AtividadeRow,
  type ClienteRow,
  type ReuniaoRow,
  type TempHistRow,
} from "./mappers"
import { criarPreparacaoPadrao } from "./preparacao"
import { useEquipe } from "./equipe"
import type {
  AnotacaoInterna,
  Atividade,
  Cliente,
  Gargalo,
  ManualCS,
  MaterialCliente,
  NotaCliente,
  ProfileName,
  Projeto,
  Reuniao,
  Temperatura,
} from "./types"

/**
 * Camada de dados do CS Manager.
 *
 * O sistema original guardava tudo em localStorage e expunha ~90 funções
 * SÍNCRONAS (getClientes(), createAtividade()…) que os 23 componentes chamam
 * direto. Aqui a fonte é o Supabase, mas a superfície da API é a mesma: os
 * componentes portados não precisam saber que o dado agora é remoto.
 *
 * Como isso funciona: os hooks (useClientes, useAtividades…) usam React Query
 * e publicam o resultado num snapshot de módulo. Os getters síncronos leem
 * desse snapshot. As mutações escrevem no Supabase e invalidam a query,
 * o que refaz o fetch e atualiza o snapshot.
 */

// ───────────────────────── Snapshot ─────────────────────────

interface Snapshot {
  clientes: Cliente[]
  atividades: Atividade[]
  reunioes: Reuniao[]
  projetos: Projeto[]
  gargalos: Gargalo[]
  materiais: MaterialCliente[]
  notas: Record<string, NotaCliente[]>
  anotacoes: Record<string, AnotacaoInterna[]>
  manual: ManualCS | null
}

const snap: Snapshot = {
  clientes: [],
  atividades: [],
  reunioes: [],
  projetos: [],
  gargalos: [],
  materiais: [],
  notas: {},
  anotacoes: {},
  manual: null,
}

export const qk = {
  clientes: ["crm", "clientes"] as const,
  atividades: ["crm", "atividades"] as const,
  reunioes: ["crm", "reunioes"] as const,
  projetos: ["crm", "projetos"] as const,
  gargalos: ["crm", "gargalos"] as const,
  materiais: ["crm", "materiais"] as const,
  manual: ["crm", "manual"] as const,
  notas: (id: string) => ["crm", "notas", id] as const,
  anotacoes: (id: string) => ["crm", "anotacoes", id] as const,
  conversas: ["crm", "conversas"] as const,
  rotinas: ["crm", "rotinas"] as const,
}

function invalidar(...keys: readonly (readonly unknown[])[]) {
  keys.forEach((k) => void queryClient.invalidateQueries({ queryKey: k }))
}

// ───────────────────────── Clientes ─────────────────────────

// PostgREST corta em 1000 linhas por padrão. A carteira tem ~300 hoje, mas
// pedir explicitamente evita o silêncio de truncar quando crescer.
const LIMITE = 5000

async function fetchReunioesRaw(): Promise<ReuniaoRow[]> {
  const { data, error } = await supabase.from("crm_reunioes_v").select("*").limit(LIMITE)
  if (error) throw error
  return (data ?? []) as unknown as ReuniaoRow[]
}

export async function fetchClientes(): Promise<Cliente[]> {
  // Reuniões e histórico de temperatura entram junto porque as regras de
  // negócio leem de dentro do Cliente: o motor de alertas usa
  // consultor_reunioes/ciclo_galdino_reunioes e a Visão Estratégica usa
  // historico_temperatura. Ver anexarReunioes/anexarHistoricoTemperatura.
  const [{ data, error }, reunioes, hist] = await Promise.all([
    supabase.from("clientes_entrada_new").select(CLIENTE_COLUNAS).limit(LIMITE),
    fetchReunioesRaw(),
    supabase
      .from("crm_temperatura_historico")
      .select("id_cliente, temperatura, motivo, observacao, autor, data")
      .order("data", { ascending: true })
      .limit(LIMITE),
  ])
  if (error) throw error
  if (hist.error) throw hist.error
  const clientes = ((data ?? []) as unknown as ClienteRow[]).map(rowToCliente)
  return anexarHistoricoTemperatura(
    anexarReunioes(clientes, reunioes),
    (hist.data ?? []) as unknown as TempHistRow[],
  )
}

export function useClientes(): Cliente[] {
  // Carrega o time junto. CS_LIST/PROFILE_LIST são live bindings preenchidas
  // por useEquipe(), e várias telas (Visão Geral, Heatmap, Desempenho por CS)
  // consomem essas listas sem chamar useProfile — nessas telas o time nunca
  // chegava e a seção ficava presa em "Carregando o time…". Toda tela do CRM
  // usa clientes, então este é o ponto que garante os dois juntos.
  useEquipe()
  const { data } = useQuery({ queryKey: qk.clientes, queryFn: fetchClientes })
  if (data) snap.clientes = data
  return data ?? snap.clientes
}

export function getClientes(): Cliente[] {
  return snap.clientes
}

export function carteiraAtiva(clientes: Cliente[]): Cliente[] {
  return clientes.filter((c) => c.status !== "Cancelado" && !c.pausado)
}

export async function upsertCliente(c: Cliente) {
  const { error } = await supabase
    .from("clientes_entrada_new")
    .update(clientePatchToRow(c))
    .eq("id_cliente", c.id)
  if (error) throw error
  invalidar(qk.clientes)
}

export async function updateCliente(id: string, patch: Partial<Cliente>) {
  const row = clientePatchToRow(patch)
  if (Object.keys(row).length === 0) return
  const { error } = await supabase
    .from("clientes_entrada_new")
    .update(row)
    .eq("id_cliente", id)
  if (error) throw error
  invalidar(qk.clientes)
}

export async function updateClienteTemperatura(
  id: string,
  temp: Temperatura,
  autor?: ProfileName,
  motivo?: string,
  observacao?: string,
) {
  await updateCliente(id, { temperatura: temp })
  // O histórico é o que permite responder "por que esse cliente esfriou?"
  const { error } = await supabase.from("crm_temperatura_historico").insert({
    id_cliente: id,
    temperatura: temp,
    motivo: motivo ?? null,
    observacao: observacao ?? null,
    autor: autor ?? null,
  })
  if (error) throw error
}

export async function setClientePausado(
  id: string,
  pausado: boolean,
  motivo?: string,
  autor?: ProfileName,
) {
  await updateCliente(id, {
    pausado,
    pausado_motivo: pausado ? motivo : undefined,
    pausado_em: pausado ? new Date().toISOString() : undefined,
    pausado_por: pausado ? autor : undefined,
  })
}

// ───────────────────────── Notas e anotações ─────────────────────────

export function useNotas(clienteId: string | null): NotaCliente[] {
  const { data } = useQuery({
    queryKey: qk.notas(clienteId ?? ""),
    enabled: !!clienteId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("crm_cliente_notas")
        .select("id, texto, autor, criado_em")
        .eq("id_cliente", clienteId)
        .order("criado_em", { ascending: false })
      if (error) throw error
      return (data ?? []) as NotaCliente[]
    },
  })
  if (clienteId && data) snap.notas[clienteId] = data
  return data ?? (clienteId ? snap.notas[clienteId] ?? [] : [])
}

export async function addNota(clienteId: string, texto: string, autor: ProfileName) {
  const { error } = await supabase
    .from("crm_cliente_notas")
    .insert({ id_cliente: clienteId, texto, autor })
  if (error) throw error
  invalidar(qk.notas(clienteId))
}

export function useAnotacoesInternas(clienteId: string | null): AnotacaoInterna[] {
  const { data } = useQuery({
    queryKey: qk.anotacoes(clienteId ?? ""),
    enabled: !!clienteId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("crm_anotacoes_internas")
        .select("id, texto, autor, imagens, fixada, criado_em, atualizado_em")
        .eq("id_cliente", clienteId)
        .order("fixada", { ascending: false })
        .order("criado_em", { ascending: false })
      if (error) throw error
      return (data ?? []) as AnotacaoInterna[]
    },
  })
  if (clienteId && data) snap.anotacoes[clienteId] = data
  return data ?? (clienteId ? snap.anotacoes[clienteId] ?? [] : [])
}

export async function addAnotacaoInterna(
  clienteId: string,
  texto: string,
  autor: ProfileName,
  imagens?: string[],
) {
  const { error } = await supabase
    .from("crm_anotacoes_internas")
    .insert({ id_cliente: clienteId, texto, autor, imagens: imagens ?? [] })
  if (error) throw error
  invalidar(qk.anotacoes(clienteId))
}

export async function updateAnotacaoInterna(
  clienteId: string,
  notaId: string,
  patch: Partial<AnotacaoInterna>,
) {
  const { error } = await supabase
    .from("crm_anotacoes_internas")
    .update({
      ...(patch.texto !== undefined ? { texto: patch.texto } : {}),
      ...(patch.imagens !== undefined ? { imagens: patch.imagens } : {}),
      ...(patch.fixada !== undefined ? { fixada: patch.fixada } : {}),
      atualizado_em: new Date().toISOString(),
    })
    .eq("id", notaId)
  if (error) throw error
  invalidar(qk.anotacoes(clienteId))
}

export async function removeAnotacaoInterna(clienteId: string, notaId: string) {
  const { error } = await supabase.from("crm_anotacoes_internas").delete().eq("id", notaId)
  if (error) throw error
  invalidar(qk.anotacoes(clienteId))
}

// ───────────────────────── Atividades ─────────────────────────

export async function fetchAtividades(): Promise<Atividade[]> {
  const { data, error } = await supabase
    .from("cliente_atividades")
    .select(ATIVIDADE_COLUNAS)
    .order("prazo", { ascending: true })
    .limit(LIMITE)
  if (error) throw error
  return ((data ?? []) as unknown as AtividadeRow[]).map(rowToAtividade)
}

export function useAtividades(): Atividade[] {
  const { data } = useQuery({ queryKey: qk.atividades, queryFn: fetchAtividades })
  if (data) snap.atividades = data
  return data ?? snap.atividades
}

export function getAtividades(): Atividade[] {
  return snap.atividades
}

export async function createAtividade(data: Omit<Atividade, "id">): Promise<Atividade> {
  const { data: row, error } = await supabase
    .from("cliente_atividades")
    .insert(atividadeToRow(data))
    .select(ATIVIDADE_COLUNAS)
    .single()
  if (error) throw error
  invalidar(qk.atividades)
  return rowToAtividade(row as unknown as AtividadeRow)
}

/** Cria várias de uma vez (seleção em massa de clientes) sob um mesmo batch_id. */
export async function createAtividadesLote(
  itens: Omit<Atividade, "id">[],
): Promise<Atividade[]> {
  if (itens.length === 0) return []
  const batch = crypto.randomUUID()
  const rows = itens.map((i) => ({ ...atividadeToRow(i), batch_id: batch }))
  const { data, error } = await supabase
    .from("cliente_atividades")
    .insert(rows)
    .select(ATIVIDADE_COLUNAS)
  if (error) throw error
  invalidar(qk.atividades)
  return ((data ?? []) as unknown as AtividadeRow[]).map(rowToAtividade)
}

export async function upsertAtividade(a: Atividade) {
  const { error } = await supabase
    .from("cliente_atividades")
    .update(atividadeToRow(a))
    .eq("id", a.id)
  if (error) throw error
  invalidar(qk.atividades)
}

export async function updateAtividade(id: string, patch: Partial<Atividade>) {
  const { error } = await supabase
    .from("cliente_atividades")
    .update(atividadeToRow(patch))
    .eq("id", id)
  if (error) throw error
  invalidar(qk.atividades)
}

export async function deleteAtividade(id: string) {
  const { error } = await supabase.from("cliente_atividades").delete().eq("id", id)
  if (error) throw error
  invalidar(qk.atividades)
}

export async function concluirAtividade(id: string) {
  // data_conclusao e status_desde são preenchidos pelo trigger no banco.
  await updateAtividade(id, { status: "Concluída" })
}

export async function pularProxima(id: string) {
  const { error } = await supabase
    .from("cliente_atividades")
    .update({ pulou_proxima: true })
    .eq("id", id)
  if (error) throw error
  invalidar(qk.atividades)
}

export function atividadesDoProjeto(projetoId: string, atividades?: Atividade[]): Atividade[] {
  return (atividades ?? snap.atividades).filter((a) => a.projeto_id === projetoId)
}

// ───────────────────────── Reuniões ─────────────────────────

export async function fetchReunioes(): Promise<Reuniao[]> {
  const [rows, clientes, preps] = await Promise.all([
    fetchReunioesRaw(),
    snap.clientes.length ? Promise.resolve(snap.clientes) : fetchClientes(),
    supabase
      .from("crm_reuniao_preparacao")
      .select("reuniao_ref, origem, participacao_cs, numero_reuniao, itens"),
  ])
  if (preps.error) throw preps.error

  // A view não sabe quem é a CS: isso vive em clientes_entrada_new.sc.
  const csPorCliente = new Map(clientes.map((c) => [c.id, c.responsavel_cs]))

  // O que a CS edita em volta da reunião (participa ou não, checklist, número
  // da reunião) mora em crm_reuniao_preparacao — a reunião em si vem do Google
  // Calendar e é somente leitura. Sem juntar as duas pontas aqui, marcar
  // "Confirmado" no checklist voltava a pendente no próximo fetch, e a seção
  // "Suas reuniões" ficava permanentemente vazia.
  const porRef = new Map(
    (preps.data ?? []).map((p) => [`${p.origem}:${p.reuniao_ref}`, p]),
  )

  return rows.map((r) => {
    const base = rowToReuniao(r, csPorCliente.get(r.id_cliente ?? "") ?? "")
    const prep = porRef.get(base.id)
    if (!prep) return base
    return {
      ...base,
      participacao_cs: (prep.participacao_cs as Reuniao["participacao_cs"]) ?? base.participacao_cs,
      numero_reuniao: (prep.numero_reuniao as number | null) ?? undefined,
      preparacao: (prep.itens as Reuniao["preparacao"]) ?? undefined,
    }
  })
}

export function useReunioes(): Reuniao[] {
  const { data } = useQuery({ queryKey: qk.reunioes, queryFn: fetchReunioes })
  if (data) snap.reunioes = data
  return data ?? snap.reunioes
}

export function getReunioes(): Reuniao[] {
  return snap.reunioes
}

/**
 * Checklist de preparação da reunião. A reunião em si vem do Google Calendar
 * e é somente leitura aqui; o que a CS edita é o processo em volta dela.
 */
export async function salvarPreparacao(reuniao: Reuniao) {
  const [origem, ref] = reuniao.id.split(":")
  const itens = reuniao.preparacao ?? criarPreparacaoPadrao(reuniao.responsavel_externo, reuniao.numero_reuniao)
  const { error } = await supabase.from("crm_reuniao_preparacao").upsert(
    {
      reuniao_ref: ref,
      origem,
      id_cliente: reuniao.cliente_id ?? null,
      cs_responsavel: reuniao.cs_responsavel,
      participacao_cs: reuniao.participacao_cs ?? "Participa",
      responsavel_externo: reuniao.responsavel_externo ?? null,
      numero_reuniao: reuniao.numero_reuniao ?? null,
      itens,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "reuniao_ref,origem" },
  )
  if (error) throw error
  invalidar(qk.reunioes)
}

// ───────────────────────── Gargalos e projetos ─────────────────────────

export function useGargalos(): Gargalo[] {
  const { data } = useQuery({
    queryKey: qk.gargalos,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("crm_gargalos")
        .select("*")
        .order("data", { ascending: false })
      if (error) throw error
      return (data ?? []) as unknown as Gargalo[]
    },
  })
  if (data) snap.gargalos = data
  return data ?? snap.gargalos
}

export function getGargalos(): Gargalo[] {
  return snap.gargalos
}

export async function createGargalo(data: Omit<Gargalo, "id">): Promise<Gargalo> {
  const { data: row, error } = await supabase.from("crm_gargalos").insert(data).select().single()
  if (error) throw error
  invalidar(qk.gargalos)
  return row as unknown as Gargalo
}

export async function updateGargalo(id: string, patch: Partial<Gargalo>) {
  const { error } = await supabase
    .from("crm_gargalos")
    .update({ ...patch, updated_at: new Date().toISOString() })
    .eq("id", id)
  if (error) throw error
  invalidar(qk.gargalos)
}

export async function removeGargalo(id: string) {
  const { error } = await supabase.from("crm_gargalos").delete().eq("id", id)
  if (error) throw error
  invalidar(qk.gargalos)
}

export function useProjetos(): Projeto[] {
  const { data } = useQuery({
    queryKey: qk.projetos,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("crm_projetos")
        .select("*")
        .order("criado_em", { ascending: false })
      if (error) throw error
      return (data ?? []) as unknown as Projeto[]
    },
  })
  if (data) snap.projetos = data
  return data ?? snap.projetos
}

export function getProjetos(): Projeto[] {
  return snap.projetos
}

export async function createProjeto(
  data: Omit<Projeto, "id" | "criado_em"> & { criado_em?: string },
): Promise<Projeto> {
  const { data: row, error } = await supabase.from("crm_projetos").insert(data).select().single()
  if (error) throw error
  invalidar(qk.projetos)
  return row as unknown as Projeto
}

export async function updateProjeto(id: string, patch: Partial<Projeto>) {
  const { error } = await supabase
    .from("crm_projetos")
    .update({ ...patch, updated_at: new Date().toISOString() })
    .eq("id", id)
  if (error) throw error
  invalidar(qk.projetos, qk.atividades)
}

export async function removeProjeto(id: string) {
  const { error } = await supabase.from("crm_projetos").delete().eq("id", id)
  if (error) throw error
  invalidar(qk.projetos, qk.atividades)
}

// ───────────────────────── Materiais ─────────────────────────

export function useMateriais(): MaterialCliente[] {
  const { data } = useQuery({
    queryKey: qk.materiais,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("crm_materiais")
        .select("*")
        .order("data", { ascending: false })
      if (error) throw error
      return (data ?? []).map((m) => ({ ...m, cliente_id: m.id_cliente })) as unknown as MaterialCliente[]
    },
  })
  if (data) snap.materiais = data
  return data ?? snap.materiais
}

export function getMateriais(): MaterialCliente[] {
  return snap.materiais
}

export async function addMaterial(data: Omit<MaterialCliente, "id">): Promise<MaterialCliente> {
  const { cliente_id, ...resto } = data
  const { data: row, error } = await supabase
    .from("crm_materiais")
    .insert({ ...resto, id_cliente: cliente_id })
    .select()
    .single()
  if (error) throw error
  invalidar(qk.materiais)
  return { ...(row as Record<string, unknown>), cliente_id } as unknown as MaterialCliente
}

export async function updateMaterial(id: string, patch: Partial<MaterialCliente>) {
  const { cliente_id, ...resto } = patch
  const { error } = await supabase
    .from("crm_materiais")
    .update({ ...resto, ...(cliente_id ? { id_cliente: cliente_id } : {}), updated_at: new Date().toISOString() })
    .eq("id", id)
  if (error) throw error
  invalidar(qk.materiais)
}

export async function removeMaterial(id: string) {
  const { error } = await supabase.from("crm_materiais").delete().eq("id", id)
  if (error) throw error
  invalidar(qk.materiais)
}

// ───────────────────────── Manual de CS ─────────────────────────

const MANUAL_VAZIO: ManualCS = {
  nome: "Manual de CS",
  link: "",
  descricao: "",
  atualizado_em: new Date().toISOString(),
  responsavel: "",
  status: "ativo",
}

export function useManual(): ManualCS {
  const { data } = useQuery({
    queryKey: qk.manual,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("crm_manual")
        .select("*")
        .order("ordem")
        .limit(1)
        .maybeSingle()
      if (error) throw error
      return (data as unknown as ManualCS | null) ?? MANUAL_VAZIO
    },
  })
  if (data) snap.manual = data
  return data ?? snap.manual ?? MANUAL_VAZIO
}

export function getManual(): ManualCS {
  return snap.manual ?? MANUAL_VAZIO
}

export async function setManual(m: ManualCS) {
  const { error } = await supabase
    .from("crm_manual")
    .upsert({ ...m, atualizado_em: new Date().toISOString() })
  if (error) throw error
  invalidar(qk.manual)
}

// ───────────────────────── Cliente selecionado (drawer) ─────────────────────────

// O drawer de cliente é aberto de qualquer lugar da árvore (tabelas, alertas,
// busca). No original isso era um pub/sub em cima do localStorage; aqui é o
// mesmo pub/sub, só que puramente em memória.
let clienteSelecionado: string | null = null
const listeners = new Set<() => void>()

export function openCliente(id: string | null) {
  clienteSelecionado = id
  listeners.forEach((l) => l())
}

export function useSelectedClienteId(): string | null {
  const [id, setId] = useState<string | null>(clienteSelecionado)
  useEffect(() => {
    const l = () => setId(clienteSelecionado)
    listeners.add(l)
    return () => {
      listeners.delete(l)
    }
  }, [])
  return id
}
