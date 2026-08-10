import { supabase } from "@/lib/supabase"
import { acaoFechamentoCiclo, LIMIAR_DIAS_FECHAMENTO_CICLO } from "./alertas-catalogo"
import { dataFechamentoCiclo, diasAteFechamentoCiclo, trimestreAtual } from "./jornada"
import { createAtividade, getAtividades } from "./store"
import type { Atividade, Cliente } from "./types"

/**
 * Criação automática da atividade de fechamento de ciclo.
 *
 * "a gente pode criar alertas que estão próximos de fechar esse ciclo para que
 *  isso se crie automático" (Mayara). A trava de duplicidade é o ponto
 * sensível: uma vez criada a atividade para cliente+trimestre, ela não volta —
 * mesmo que a CS conclua ou apague. No original a trava era uma chave de
 * localStorage, o que significa que cada navegador tinha a sua e a atividade
 * seria recriada em outra máquina. Aqui é a tabela crm_fechamento_ciclo, com
 * PK (id_cliente, trimestre): a trava passa a valer para o time inteiro.
 */

const DIA_MS = 86400000

export interface RegistroFechamento {
  atividade_id: string
  criado_em: string
}

/** chave = `${clienteId}:T${trimestre}` */
export type RegistroFechamentoMap = Record<string, RegistroFechamento>

export function fechamentoKey(clienteId: string, trimestre: number): string {
  return `${clienteId}:T${trimestre}`
}

export async function lerRegistros(): Promise<RegistroFechamentoMap> {
  const { data, error } = await supabase
    .from("crm_fechamento_ciclo")
    .select("id_cliente, trimestre, atividade_id, criado_em")
  if (error) throw error
  const out: RegistroFechamentoMap = {}
  for (const r of data ?? []) {
    out[fechamentoKey(r.id_cliente as string, r.trimestre as number)] = {
      atividade_id: (r.atividade_id as string) ?? "",
      criado_em: r.criado_em as string,
    }
  }
  return out
}

/** Data prevista da atividade: uma semana antes do fechamento do ciclo. */
function dataPrevista(cliente: Cliente, ref: Date): string {
  const fechamentoISO = dataFechamentoCiclo(cliente, ref)
  if (!fechamentoISO) return ref.toISOString().slice(0, 10)
  return new Date(new Date(`${fechamentoISO}T00:00:00`).getTime() - 7 * DIA_MS)
    .toISOString()
    .slice(0, 10)
}

function novaAtividade(cliente: Cliente, tri: number, ref: Date): Omit<Atividade, "id"> {
  return {
    cliente_id: cliente.id,
    cs_responsavel: cliente.responsavel_cs,
    titulo: acaoFechamentoCiclo(tri),
    tipo: "Outro",
    prioridade: "Médio",
    descricao: `Fechamento do T${tri} do cliente ${cliente.nome}.`,
    data_prevista: dataPrevista(cliente, ref),
    status: "Pendente",
    origem: "checkpoint_ciclo",
    origem_label: `Fechamento de ciclo · T${tri}`,
  }
}

/**
 * Reserva a vaga do fechamento para cliente + trimestre.
 *
 * Retorna false quando alguém já reservou. É um INSERT puro de propósito: a PK
 * (id_cliente, trimestre) faz o próprio banco decidir quem chegou primeiro.
 *
 * A ordem importa. Antes, a atividade era criada e só depois registrada, com um
 * upsert que ignorava conflito — o que significa que duas execuções concorrentes
 * criavam duas atividades e só a segunda gravação do registro era descartada.
 * Foi exatamente o que aconteceu no DEV: toda atividade de fechamento nasceu
 * duplicada. Reservar primeiro transforma a checagem num compare-and-swap.
 */
async function reservar(clienteId: string, trimestre: number): Promise<boolean> {
  const { error } = await supabase
    .from("crm_fechamento_ciclo")
    .insert({ id_cliente: clienteId, trimestre })
  if (!error) return true
  // 23505 = unique_violation: outra execução chegou primeiro.
  if (error.code === "23505") return false
  throw error
}

async function anotarAtividade(clienteId: string, trimestre: number, atividadeId: string) {
  await supabase
    .from("crm_fechamento_ciclo")
    .update({ atividade_id: atividadeId })
    .eq("id_cliente", clienteId)
    .eq("trimestre", trimestre)
}

/**
 * Garante a atividade de fechamento para cada cliente dentro da janela de
 * 30 dias. Roda ao carregar a aba de Alertas.
 */
export async function garantirAtividadesFechamentoCiclo(
  clientes: Cliente[],
  ref: Date = new Date(),
): Promise<RegistroFechamentoMap> {
  const registros = await lerRegistros()
  const atividades = getAtividades()

  for (const cliente of clientes) {
    const tri = trimestreAtual(cliente, ref)
    const faltam = diasAteFechamentoCiclo(cliente, ref)
    if (tri === null || faltam === null) continue
    if (faltam > LIMIAR_DIAS_FECHAMENTO_CICLO || faltam < 0) continue

    const key = fechamentoKey(cliente.id, tri)
    if (registros[key]) continue

    const rotulo = `Fechamento de ciclo · T${tri}`
    const jaExiste = atividades.some(
      (a) => a.cliente_id === cliente.id && a.origem_label === rotulo,
    )

    // Reserva primeiro: se outra execução já pegou a vaga, não cria nada.
    const minha = await reservar(cliente.id, tri)
    if (!minha) {
      registros[key] = { atividade_id: "", criado_em: new Date().toISOString() }
      continue
    }
    if (jaExiste) {
      registros[key] = { atividade_id: "", criado_em: new Date().toISOString() }
      continue
    }

    const nova = await createAtividade(novaAtividade(cliente, tri, ref))
    await anotarAtividade(cliente.id, tri, nova.id)
    registros[key] = { atividade_id: nova.id, criado_em: new Date().toISOString() }
  }

  return registros
}

/**
 * Criação em lote (manual) das atividades de fechamento de ciclo.
 * Mesmas regras da automática, inclusive a trava por cliente + trimestre.
 * Retorna quantas foram criadas.
 */
export async function criarAtividadesFechamentoLote(
  clientes: Cliente[],
  trimestre: number,
  ref: Date = new Date(),
): Promise<number> {
  const registros = await lerRegistros()
  const atividades = getAtividades()
  let criadas = 0

  for (const cliente of clientes) {
    const key = fechamentoKey(cliente.id, trimestre)
    if (registros[key]) continue

    const rotulo = `Fechamento de ciclo · T${trimestre}`
    const jaExiste = atividades.some(
      (a) => a.cliente_id === cliente.id && a.origem_label === rotulo,
    )

    const minha = await reservar(cliente.id, trimestre)
    if (!minha || jaExiste) continue

    const nova = await createAtividade(novaAtividade(cliente, trimestre, ref))
    await anotarAtividade(cliente.id, trimestre, nova.id)
    criadas += 1
  }

  return criadas
}
