import { useEffect, useState } from "react"
import { Chat } from "@/components/agente/chat"
import { ConversationList } from "@/components/agente/conversation-list"
import {
  listarConversas,
  carregarMensagens,
  excluirConversa,
  type ConversaResumo,
  type ChatMessage,
} from "@/lib/agente"

export default function AgentePage() {
  const [conversas, setConversas] = useState<ConversaResumo[]>([])
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [initial, setInitial] = useState<ChatMessage[]>([])
  const [reloadToken, setReloadToken] = useState(0)

  useEffect(() => {
    listarConversas().then(setConversas).catch((e) => console.error("Erro ao listar conversas:", e))
  }, [])

  async function handleSelect(id: string) {
    try {
      const msgs = await carregarMensagens(id)
      setInitial(msgs)
      setSelectedId(id)
      setReloadToken((t) => t + 1)
    } catch (e) {
      console.error("Erro ao abrir conversa:", e)
    }
  }

  function handleNova() {
    setSelectedId(null)
    setInitial([])
    setReloadToken((t) => t + 1)
  }

  // Conversa criada ao enviar a 1a mensagem: nao remonta o Chat (sem bump).
  function handleCreated(c: ConversaResumo) {
    setConversas((prev) => [c, ...prev.filter((x) => x.id !== c.id)])
    setSelectedId(c.id)
  }

  async function handleExcluir(id: string) {
    try {
      await excluirConversa(id)
      setConversas((prev) => prev.filter((x) => x.id !== id))
      if (id === selectedId) handleNova()
    } catch (e) {
      console.error("Erro ao excluir conversa:", e)
    }
  }

  return (
    <div className="flex h-[calc(100vh-8rem)] overflow-hidden rounded-2xl border border-border bg-background/30">
      <ConversationList
        conversas={conversas}
        activeId={selectedId}
        onSelect={handleSelect}
        onNova={handleNova}
        onExcluir={handleExcluir}
      />
      <div className="min-w-0 flex-1">
        <Chat
          key={`chat-${reloadToken}`}
          conversationId={selectedId}
          initialMessages={initial}
          onConversationCreated={handleCreated}
        />
      </div>
    </div>
  )
}
