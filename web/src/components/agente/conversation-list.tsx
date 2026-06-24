import { Button } from "@/components/ui/button"
import { PlusIcon, Trash2Icon, MessageSquareIcon } from "@/components/ui/icons"
import type { ConversaResumo } from "@/lib/agente"

type Props = {
  conversas: ConversaResumo[]
  activeId: string | null
  onSelect: (id: string) => void
  onNova: () => void
  onExcluir: (id: string) => void
}

export function ConversationList({ conversas, activeId, onSelect, onNova, onExcluir }: Props) {
  return (
    <div className="flex h-full w-64 shrink-0 flex-col border-r border-border bg-background/30">
      <div className="p-3">
        <Button onClick={onNova} className="w-full justify-start gap-2 rounded-xl" variant="outline">
          <PlusIcon className="size-4" />
          Nova conversa
        </Button>
      </div>
      <div className="flex-1 overflow-y-auto px-2 pb-3">
        {conversas.length === 0 ? (
          <p className="px-3 py-6 text-center text-xs text-muted-foreground">
            Nenhuma conversa ainda.
          </p>
        ) : (
          <div className="space-y-0.5">
            {conversas.map((c) => (
              <div
                key={c.id}
                className={`group flex items-center gap-2 rounded-lg px-2.5 py-2 text-sm transition-colors ${
                  c.id === activeId
                    ? "bg-primary/10 text-primary"
                    : "text-muted-foreground hover:bg-sidebar-accent hover:text-foreground"
                }`}
              >
                <button
                  onClick={() => onSelect(c.id)}
                  className="flex min-w-0 flex-1 items-center gap-2 text-left"
                >
                  <MessageSquareIcon className="size-4 shrink-0" />
                  <span className="truncate">{c.titulo}</span>
                </button>
                <button
                  onClick={() => onExcluir(c.id)}
                  className="shrink-0 text-muted-foreground/60 opacity-0 transition-opacity hover:text-destructive group-hover:opacity-100"
                  title="Excluir conversa"
                >
                  <Trash2Icon className="size-4" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
