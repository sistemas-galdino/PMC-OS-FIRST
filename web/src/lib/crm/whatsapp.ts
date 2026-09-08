import { useEffect } from "react"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { supabase } from "@/lib/supabase"

/**
 * Conexão do WhatsApp de cada CS (Evolution API).
 *
 * Cada Sucesso do Cliente conecta o PRÓPRIO número escaneando um QR code. Isso
 * cria, no servidor da Evolution, uma instância Baileys só dela — é por ela que
 * a aba Atendimento lê e responde os grupos da carteira, e por isso a mensagem
 * chega no grupo vinda do número da CS, não de um número genérico.
 *
 * A leitura é da view `crm_whatsapp_instancias_v`, que existe justamente para
 * omitir `webhook_token`: RLS não filtra coluna, e o token é o que autentica o
 * webhook da Evolution. As ações passam pela edge function.
 */

export type StatusInstancia =
  | "criada"
  | "aguardando_qr"
  | "conectando"
  | "conectada"
  | "desconectada"
  | "erro"

export interface InstanciaWhatsapp {
  id: string
  mentor_id: number | null
  instancia: string
  numero: string | null
  status: StatusInstancia
  ultimo_qr: string | null
  ultimo_qr_em: string | null
  pairing_code: string | null
  conectado_em: string | null
  desconectado_em: string | null
  erro: string | null
  backfill_status: "pendente" | "rodando" | "concluido" | "falhou"
}

/** Estados em que ainda faz sentido pedir QR novo. */
const EM_PAREAMENTO: StatusInstancia[] = ["criada", "aguardando_qr", "conectando"]

export const instanciaQueryKey = ["crm", "whatsapp", "minha-instancia"] as const

async function chamar<T>(body: Record<string, unknown>): Promise<T> {
  const { data, error } = await supabase.functions.invoke("crm-whatsapp-instancia", { body })
  if (error) {
    // FunctionsHttpError esconde a mensagem no corpo — mesmo tratamento de
    // lib/crm/ia.ts, senão o usuário vê só "non-2xx status code".
    let msg = error.message
    try {
      const ctx = (error as { context?: { json: () => Promise<{ error?: string }> } }).context
      const corpo = ctx ? await ctx.json() : null
      if (corpo?.error) msg = corpo.error
    } catch {
      /* mantém a original */
    }
    throw new Error(msg)
  }
  const d = data as { error?: string } | null
  if (d?.error) throw new Error(String(d.error))
  return data as T
}

async function fetchMinhaInstancia(): Promise<InstanciaWhatsapp | null> {
  // A RLS da view deixa a coordenação ver TODAS as instâncias, então filtrar
  // pelo próprio mentor_id é o que faz esta tela ser "a minha conexão" mesmo
  // para quem é admin. mentores não tem user_id: quem resolve é a RPC.
  const { data: mentorId, error: errRpc } = await supabase.rpc("crm_meu_mentor_id")
  if (errRpc) throw errRpc
  if (!mentorId) return null

  const { data, error } = await supabase
    .from("crm_whatsapp_instancias_v")
    .select(
      "id, mentor_id, instancia, numero, status, ultimo_qr, ultimo_qr_em, pairing_code, " +
        "conectado_em, desconectado_em, erro, backfill_status",
    )
    .eq("papel", "cs")
    .eq("mentor_id", mentorId)
    .maybeSingle()
  if (error) throw error
  return (data as InstanciaWhatsapp | null) ?? null
}

/**
 * A instância da pessoa logada, com duas camadas de atualização:
 *
 *   1. polling de 20s pedindo QR novo enquanto o pareamento não terminou — a
 *      Evolution rotaciona o QR e é o /instance/connect que devolve o atual;
 *   2. Realtime na tabela, para o CONNECTION_UPDATE virar a tela no instante em
 *      que a CS escaneia, sem ela ficar olhando para um QR já usado.
 */
export function useMinhaInstancia() {
  const qc = useQueryClient()
  const q = useQuery({
    queryKey: instanciaQueryKey,
    queryFn: fetchMinhaInstancia,
    staleTime: 10_000,
  })

  const id = q.data?.id
  useEffect(() => {
    if (!id) return
    const canal = supabase
      .channel(`crm-whatsapp-instancia-${id}`)
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "crm_whatsapp_instancias", filter: `id=eq.${id}` },
        () => qc.invalidateQueries({ queryKey: instanciaQueryKey }),
      )
      .subscribe()
    return () => {
      supabase.removeChannel(canal)
    }
  }, [id, qc])

  return q
}

/** Precisa continuar pedindo QR? */
export function emPareamento(i: InstanciaWhatsapp | null | undefined): boolean {
  return !!i && EM_PAREAMENTO.includes(i.status)
}

export function useAcoesInstancia() {
  const qc = useQueryClient()
  const invalidar = () => qc.invalidateQueries({ queryKey: instanciaQueryKey })

  const conectar = useMutation({
    mutationFn: () => chamar<{ instancia: InstanciaWhatsapp }>({ acao: "criar_conectar" }),
    onSuccess: invalidar,
  })
  const atualizarQr = useMutation({
    mutationFn: () => chamar<{ instancia: InstanciaWhatsapp }>({ acao: "qr" }),
    onSuccess: invalidar,
  })
  const desconectar = useMutation({
    mutationFn: () => chamar<{ instancia: InstanciaWhatsapp }>({ acao: "desconectar" }),
    onSuccess: invalidar,
  })

  return { conectar, atualizarQr, desconectar }
}

/** Envio de mensagem pela instância da CS. Usado pelo ChatComposer. */
export async function enviarMensagem(conversaId: string, texto: string): Promise<void> {
  const { data, error } = await supabase.functions.invoke("crm-whatsapp-enviar", {
    body: { conversa_id: conversaId, texto },
  })
  if (error) {
    let msg = error.message
    try {
      const ctx = (error as { context?: { json: () => Promise<{ error?: string }> } }).context
      const corpo = ctx ? await ctx.json() : null
      if (corpo?.error) msg = corpo.error
    } catch {
      /* mantém a original */
    }
    throw new Error(msg)
  }
  const d = data as { error?: string } | null
  if (d?.error) throw new Error(String(d.error))
}
