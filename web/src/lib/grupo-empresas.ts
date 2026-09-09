import { supabase } from "@/lib/supabase"

/**
 * Grupo de empresas: várias empresas do mesmo dono que compartilham as REUNIÕES.
 *
 * O vínculo mora em `grupos_empresas_membros` (só admin escreve) e é lido pela
 * RPC `ids_do_grupo`, que devolve o próprio cliente + as irmãs. As policies de
 * SELECT das tabelas de reunião usam `meus_ids_cliente()`, a versão que olha o
 * login — então o `.in()` do front é só para não pedir menos do que a RLS já
 * deixa ver; sozinho ele não abre nada.
 *
 * Empresa sem grupo devolve `[idCliente]`, ou seja, comportamento idêntico ao
 * `.eq('id_cliente', ...)` de antes.
 */
export async function idsDoGrupo(idCliente: string): Promise<string[]> {
  const { data, error } = await supabase.rpc("ids_do_grupo", { p_id_cliente: idCliente })
  if (error || !data) return [idCliente]
  const ids = (data as Array<string | { ids_do_grupo: string }>).map((r) =>
    typeof r === "string" ? r : r.ids_do_grupo,
  )
  return ids.length ? ids : [idCliente]
}

/**
 * Nome da empresa de origem quando a reunião veio de outra empresa do grupo.
 * Devolve null para as reuniões da própria empresa (nada a sinalizar).
 */
export function empresaDeOutroMembro(
  reuniao: { id_cliente?: string | null; empresa?: string | null; nome_empresa_formatado?: string | null },
  idClienteAtual: string | null | undefined,
): string | null {
  if (!idClienteAtual || !reuniao.id_cliente) return null
  if (String(reuniao.id_cliente) === String(idClienteAtual)) return null
  return reuniao.nome_empresa_formatado?.trim() || reuniao.empresa?.trim() || "Outra empresa do grupo"
}
