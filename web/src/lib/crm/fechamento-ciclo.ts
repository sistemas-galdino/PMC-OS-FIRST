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

async function registrar(clienteId: string, trimestre: number, atividadeId: string | null) {
  // ON CONFLICT DO NOTHING: se duas abas rodarem ao mesmo tempo, a segunda
  // não sobrescreve nem estoura.
  await supabase
    .from("crm_fechamento_ciclo")
    .upsert(
      { id_cliente: clienteId, trimestre, atividade_id: atividadeId },
      { onConflict: "id_cliente,trimestre", ignoreDuplicates: true },
    )
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
    if (jaExiste) {
      await registrar(cliente.id, tri, null)
      registros[key] = { atividade_id: "", criado_em: new Date().toISOString() }
      continue
    }

    const nova = await createAtividade(novaAtividade(cliente, tri, ref))
    await registrar(cliente.id, tri, nova.id)
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
    if (jaExiste) {
      await registrar(cliente.id, trimestre, null)
      continue
    }

    const nova = await createAtividade(novaAtividade(cliente, trimestre, ref))
    await registrar(cliente.id, trimestre, nova.id)
    criadas += 1
  }

  return criadas
}
