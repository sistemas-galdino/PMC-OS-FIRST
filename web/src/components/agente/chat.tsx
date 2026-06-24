import { useEffect, useRef, useState } from "react"
import { useChat } from "@ai-sdk/react"
import type { Message } from "@ai-sdk/react"
import ReactMarkdown from "react-markdown"
import remarkGfm from "remark-gfm"
import { Button } from "@/components/ui/button"
import { SendIcon, Sparkles2Icon as Sparkles } from "@/components/ui/icons"
import {
  AGENTE_FN_URL,
  agenteFetch,
  criarConversa,
  type ChatMessage,
  type ConversaResumo,
} from "@/lib/agente"

const SUGESTOES = [
  "Quantas reuniões temos agendadas esta semana?",
  "Quais clientes estão com status cancelado?",
  "Liste as reuniões do consultor Maxsuell Lopes nos próximos 15 dias",
  "Quantos clientes ativos existem por CS responsável?",
]

type ChatProps = {
  conversationId: string | null
  initialMessages: ChatMessage[]
  onConversationCreated: (c: ConversaResumo) => void
  compact?: boolean
}

export function Chat({ conversationId, initialMessages, onConversationCreated, compact }: ChatProps) {
  const [convId, setConvId] = useState<string | null>(conversationId)
  const bottomRef = useRef<HTMLDivElement>(null)

  const { messages, input, setInput, append, status } = useChat({
    api: AGENTE_FN_URL,
    fetch: agenteFetch,
    initialMessages: initialMessages.map((m) => ({
      id: m.id,
      role: m.role,
      content: m.content,
    })) as Message[],
  })

  const ocupado = status === "submitted" || status === "streaming"

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [messages, status])

  async function enviar(texto: string) {
    const text = texto.trim()
    if (!text || ocupado) return
    let id = convId
    if (!id) {
      try {
        const c = await criarConversa(text)
        id = c.id
        setConvId(id)
        onConversationCreated(c)
      } catch (e) {
        console.error("Erro ao criar conversa:", e)
        return
      }
    }
    setInput("")
    append({ role: "user", content: text }, { body: { conversationId: id } })
  }

  const vazio = messages.length === 0

  return (
    <div className="flex h-full flex-col">
      <div className="flex-1 overflow-y-auto px-4 py-6">
        {vazio ? (
          <div className="mx-auto flex h-full max-w-2xl flex-col items-center justify-center gap-6 text-center">
            <div className="flex size-14 items-center justify-center rounded-2xl bg-primary/10 text-primary shadow-lg shadow-primary/10">
              <Sparkles className="size-7" />
            </div>
            <div>
              <h2 className="text-lg font-bold tracking-tight text-foreground">Agente do Programa</h2>
              <p className="mt-1 text-sm text-muted-foreground">
                Pergunte qualquer coisa sobre reuniões, clientes e agendamentos. Acesso somente leitura.
              </p>
            </div>
            <div className="grid w-full gap-2 sm:grid-cols-2">
              {SUGESTOES.map((s) => (
                <button
                  key={s}
                  onClick={() => enviar(s)}
                  className="rounded-xl border border-border bg-background/40 px-4 py-3 text-left text-sm text-muted-foreground transition-colors hover:border-primary/40 hover:text-foreground"
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
        ) : (
          <div className={`mx-auto flex flex-col gap-5 ${compact ? "max-w-full" : "max-w-3xl"}`}>
            {messages.map((m) => (
              <MessageBubble key={m.id} role={m.role} content={m.content} />
            ))}
            {status === "submitted" && (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <span className="size-2 animate-pulse rounded-full bg-primary" />
                Consultando o banco…
              </div>
            )}
            <div ref={bottomRef} />
          </div>
        )}
      </div>

      <form
        onSubmit={(e) => {
          e.preventDefault()
          enviar(input)
        }}
        className="border-t border-border bg-background/40 p-3"
      >
        <div className="mx-auto flex max-w-3xl items-end gap-2">
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault()
                enviar(input)
              }
            }}
            rows={1}
            placeholder="Pergunte sobre reuniões, clientes, agendamentos…"
            className="max-h-40 min-h-[44px] flex-1 resize-none rounded-xl border border-border bg-background px-3 py-2.5 text-sm outline-none focus:border-primary/50 focus:ring-2 focus:ring-primary/20"
          />
          <Button
            type="submit"
            size="icon"
            disabled={ocupado || !input.trim()}
            className="size-11 shrink-0 rounded-xl"
          >
            <SendIcon className="size-4" />
          </Button>
        </div>
      </form>
    </div>
  )
}

function MessageBubble({ role, content }: { role: string; content: string }) {
  if (role === "user") {
    return (
      <div className="flex justify-end">
        <div className="max-w-[85%] whitespace-pre-wrap rounded-2xl bg-primary px-4 py-2.5 text-sm text-primary-foreground">
          {content}
        </div>
      </div>
    )
  }
  if (role !== "assistant") return null
  return (
    <div className="flex justify-start">
      <div className="max-w-[90%] rounded-2xl border border-border bg-background/60 px-4 py-3 text-sm leading-relaxed text-foreground">
        <ReactMarkdown
          remarkPlugins={[remarkGfm]}
          components={{
            a: (p) => <a {...p} target="_blank" rel="noreferrer" className="text-primary underline" />,
            table: (p) => (
              <div className="my-2 overflow-x-auto">
                <table {...p} className="w-full border-collapse text-xs" />
              </div>
            ),
            th: (p) => <th {...p} className="border border-border bg-muted/40 px-2 py-1 text-left" />,
            td: (p) => <td {...p} className="border border-border px-2 py-1" />,
            code: (p) => <code {...p} className="rounded bg-muted px-1 py-0.5 text-xs" />,
            ul: (p) => <ul {...p} className="my-1 list-disc space-y-1 pl-5" />,
            ol: (p) => <ol {...p} className="my-1 list-decimal space-y-1 pl-5" />,
            p: (p) => <p {...p} className="my-1" />,
          }}
        >
          {content}
        </ReactMarkdown>
      </div>
    </div>
  )
}
