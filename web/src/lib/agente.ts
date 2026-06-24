import { supabase } from "@/lib/supabase"

// Endpoint da Edge Function de chat (Vercel AI SDK + gpt-4o).
export const AGENTE_FN_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/agente-chat`
const ANON = import.meta.env.VITE_SUPABASE_ANON_KEY as string

export type ConversaResumo = { id: string; titulo: string; updated_at: string }
export type ChatMessage = { id: string; role: "user" | "assistant"; content: string }

export async function listarConversas(): Promise<ConversaResumo[]> {
  const { data, error } = await supabase
    .from("agent_conversations")
    .select("id, titulo, updated_at")
    .order("updated_at", { ascending: false })
  if (error) throw error
  return (data ?? []) as ConversaResumo[]
}

export async function criarConversa(primeiraPergunta: string): Promise<ConversaResumo> {
  const { data: sess } = await supabase.auth.getSession()
  const userId = sess.session?.user?.id
  const titulo = (primeiraPergunta.trim() || "Nova conversa").slice(0, 60)
  const { data, error } = await supabase
    .from("agent_conversations")
    .insert({ user_id: userId, titulo })
    .select("id, titulo, updated_at")
    .single()
  if (error) throw error
  return data as ConversaResumo
}

export async function carregarMensagens(conversationId: string): Promise<ChatMessage[]> {
  const { data, error } = await supabase
    .from("agent_messages")
    .select("id, role, content")
    .eq("conversation_id", conversationId)
    .order("created_at", { ascending: true })
  if (error) throw error
  return (data ?? []) as ChatMessage[]
}

export async function excluirConversa(conversationId: string): Promise<void> {
  const { error } = await supabase
    .from("agent_conversations")
    .delete()
    .eq("id", conversationId)
  if (error) throw error
}

// Fetch que injeta sempre o token mais recente (sobrevive a refresh de sessao).
export async function agenteFetch(
  input: RequestInfo | URL,
  init?: RequestInit,
): Promise<Response> {
  const { data } = await supabase.auth.getSession()
  const token = data.session?.access_token
  const headers = {
    ...(init?.headers ?? {}),
    apikey: ANON,
    Authorization: `Bearer ${token ?? ANON}`,
  }
  return fetch(input, { ...init, headers })
}
