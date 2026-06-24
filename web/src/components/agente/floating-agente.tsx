import { useState } from "react"
import { useNavigate } from "react-router-dom"
import { Sheet, SheetContent, SheetTitle } from "@/components/ui/sheet"
import { Button } from "@/components/ui/button"
import { Chat } from "./chat"
import {
  Sparkles2Icon as Sparkles,
  PlusIcon,
  ExternalLinkIcon,
  XIcon,
} from "@/components/ui/icons"
import { carregarMensagens, type ChatMessage, type ConversaResumo } from "@/lib/agente"

export function FloatingAgente() {
  const navigate = useNavigate()
  const [open, setOpen] = useState(false)
  const [convId, setConvId] = useState<string | null>(null)
  const [initial, setInitial] = useState<ChatMessage[]>([])
  const [chatKey, setChatKey] = useState(0)

  async function abrir() {
    if (convId) {
      try {
        setInitial(await carregarMensagens(convId))
      } catch (e) {
        console.error("Erro ao carregar conversa:", e)
      }
    }
    setOpen(true)
  }

  function nova() {
    setConvId(null)
    setInitial([])
    setChatKey((k) => k + 1)
  }

  return (
    <>
      <button
        onClick={abrir}
        title="Agente do Programa"
        className="fixed bottom-6 right-6 z-40 flex size-14 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-2xl shadow-primary/30 transition-transform hover:scale-105"
      >
        <Sparkles className="size-6" />
      </button>

      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent
          side="right"
          showCloseButton={false}
          className="flex w-full flex-col gap-0 p-0 sm:max-w-md"
        >
          <div className="flex items-center justify-between border-b border-border px-4 py-3">
            <SheetTitle className="flex items-center gap-2 text-sm font-semibold">
              <Sparkles className="size-4 text-primary" />
              Agente
            </SheetTitle>
            <div className="flex items-center gap-1">
              <Button variant="ghost" size="icon-sm" onClick={nova} title="Nova conversa">
                <PlusIcon className="size-4" />
              </Button>
              <Button
                variant="ghost"
                size="icon-sm"
                onClick={() => {
                  setOpen(false)
                  navigate("/agente")
                }}
                title="Abrir em tela cheia"
              >
                <ExternalLinkIcon className="size-4" />
              </Button>
              <Button variant="ghost" size="icon-sm" onClick={() => setOpen(false)} title="Fechar">
                <XIcon className="size-4" />
              </Button>
            </div>
          </div>
          <div className="min-h-0 flex-1">
            <Chat
              key={chatKey}
              conversationId={convId}
              initialMessages={initial}
              onConversationCreated={(c: ConversaResumo) => setConvId(c.id)}
              compact
            />
          </div>
        </SheetContent>
      </Sheet>
    </>
  )
}
