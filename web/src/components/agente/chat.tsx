import { useEffect, useRef, useState } from "react"
import { useChat } from "@ai-sdk/react"
import type { Message } from "@ai-sdk/react"
import ReactMarkdown from "react-markdown"
import remarkGfm from "remark-gfm"
import { Button } from "@/components/ui/button"
import { SendIcon } from "@/components/ui/icons"
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

// Texto realmente visível de uma mensagem (content ou as partes de texto).
function textoVisivel(m: Message): string {
  if (m.content && m.content.trim()) return m.content
  const parts = (m as { parts?: Array<{ type: string; text?: string }> }).parts
  if (Array.isArray(parts)) {
    return parts
      .filter((p) => p?.type === "text" && typeof p.text === "string")
      .map((p) => p.text)
      .join("")
  }
  return ""
}

// Descreve, em tempo real, o que o agente está fazendo agora — lendo as
// tool-invocations da última mensagem do assistant. O rótulo alterna sozinho
// conforme o gpt-5.5 encadeia os passos (raciocínio → tool → resultado → texto).
function atividadeAtual(m: Message | undefined, status: string): string {
  if (!m || status === "submitted") return "Interpretando a pergunta…"
  type Part = { type: string; text?: string; toolInvocation?: { state?: string; toolName?: string } }
  const parts = (m as { parts?: Part[] }).parts
  if (Array.isArray(parts) && parts.length) {
    for (let i = parts.length - 1; i >= 0; i--) {
      const p = parts[i]
      if (p?.type === "tool-invocation") {
        const inv = p.toolInvocation
        if (inv?.state !== "result") {
          if (inv?.toolName === "descrever_schema") return "Explorando a estrutura das tabelas…"
          return "Consultando o banco…"
        }
        return "Analisando os resultados…"
      }
      if (p?.type === "text" && p.text?.trim()) return "Escrevendo a resposta…"
    }
  }
  return "Processando…"
}

type ChatProps = {
  conversationId: string | null
  initialMessages: ChatMessage[]
  onConversationCreated: (c: ConversaResumo) => void
  compact?: boolean
}

export function Chat({ conversationId, initialMessages, onConversationCreated, compact }: ChatProps) {
  const [convId, setConvId] = useState<string | null>(conversationId)
  const bottomRef = useRef<HTMLDivElement>(null)

  const { messages, input, setInput, append, status, error, reload } = useChat({
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
  const ultima = messages[messages.length - 1]
  const ultimaAssistant = ultima?.role === "assistant" ? ultima : undefined
  const textoStreamando = ultimaAssistant ? textoVisivel(ultimaAssistant).trim() : ""
  // Mostra o indicador enquanto o agente trabalha e ainda não há texto na tela.
  const mostrarIndicador = ocupado && !textoStreamando

  return (
    <div className="flex h-full flex-col">
      <div className="flex-1 overflow-y-auto px-4 py-6 scrollbar-custom">
        {vazio ? (
          <div className="mx-auto flex h-full max-w-2xl flex-col items-center justify-center gap-6 text-center">
            <div className="flex size-14 items-center justify-center overflow-hidden rounded-2xl shadow-lg shadow-primary/20 ring-1 ring-primary/20">
              <img src="/logo.png" alt="PMC OS" className="size-full object-cover" />
            </div>
            <div>
              <h2 className="text-lg font-bold tracking-tight text-foreground">PMC Brain</h2>
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
            {messages.map((m) => {
              // Não renderiza bolha vazia do assistant (some o "ponto preto" enquanto pensa).
              if (m.role === "assistant" && !textoVisivel(m).trim()) return null
              return <MessageBubble key={m.id} role={m.role} content={textoVisivel(m)} />
            })}
            {mostrarIndicador && (
              <AgentWorkingIndicator label={atividadeAtual(ultimaAssistant, status)} />
            )}
            {error && (
              <div className="rounded-xl border border-destructive/40 bg-destructive/10 px-4 py-3 text-sm text-destructive">
                <p className="font-medium">Erro ao responder</p>
                <p className="mt-1 whitespace-pre-wrap break-words text-xs opacity-90">
                  {error.message}
                </p>
                <button
                  onClick={() => reload()}
                  className="mt-2 rounded-lg border border-destructive/40 px-3 py-1 text-xs font-medium hover:bg-destructive/20"
                >
                  Tentar de novo
                </button>
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
            className="max-h-40 min-h-[44px] flex-1 resize-none rounded-xl border border-border bg-background px-3 py-2.5 text-sm outline-none focus:border-primary/50 focus:ring-2 focus:ring-primary/20 scrollbar-custom"
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

function AgentWorkingIndicator({ label }: { label: string }) {
  return (
    <div className="flex items-center gap-2.5 py-1 text-sm">
      <span className="flex items-end gap-1">
        {[0, 150, 300].map((d) => (
          <span
            key={d}
            className="size-1.5 animate-bounce rounded-full bg-primary"
            style={{ animationDelay: `${d}ms` }}
          />
        ))}
      </span>
      <span className="text-shimmer font-medium">{label}</span>
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
