import { useState } from "react"
import { createPortal } from "react-dom"
import { useNavigate } from "react-router-dom"
import { Sheet, SheetContent, SheetTitle } from "@/components/ui/sheet"
import { Button } from "@/components/ui/button"
import { Chat } from "./chat"
import {
  BotIcon,
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
      {/* Portal pro body: garante position:fixed relativo à viewport, sem ser preso
          pelo backdrop-filter do SidebarInset (que fazia o botão sumir ao rolar). */}
      {createPortal(
        <button
          onClick={abrir}
          title="Agente do Programa"
          className="group fixed bottom-6 right-6 z-50 flex size-14 items-center justify-center rounded-full bg-background shadow-2xl shadow-primary/30 ring-2 ring-primary/30 transition-transform hover:scale-105"
        >
          <img
            src="/logo.png"
            alt="PMC OS"
            className="size-full rounded-full object-cover"
          />
          {/* Selo de bot, indicando o assistente de IA do sistema */}
          <span className="absolute -bottom-0.5 -right-0.5 flex size-6 items-center justify-center rounded-full bg-primary text-primary-foreground ring-2 ring-background">
            <BotIcon className="size-3.5" />
          </span>
        </button>,
        document.body,
      )}

      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent
          side="right"
          showCloseButton={false}
          className="flex w-full flex-col gap-0 p-0 sm:max-w-md"
        >
          <div className="flex items-center justify-between border-b border-border px-4 py-3">
            <SheetTitle className="flex items-center gap-2 text-sm font-semibold">
              <BotIcon className="size-4 text-primary" />
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
