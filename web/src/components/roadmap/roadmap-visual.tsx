import { useState } from "react"
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  useDraggable,
  useDroppable,
  useSensor,
  useSensors,
} from "@dnd-kit/core"
import type { DragEndEvent, DragStartEvent } from "@dnd-kit/core"
import { Badge } from "@/components/ui/badge"
import { Edit3Icon } from "@/components/ui/icons"
import { cn } from "@/lib/utils"
import {
  FASES,
  MARCOS,
  FASE_BADGE,
  VALOR_BADGE,
  calcRoi,
  valorLabel,
} from "@/lib/roadmap"
import type { RoadmapItem, Fase } from "@/lib/roadmap"

interface Props {
  itens: RoadmapItem[]
  onMoveItem: (id: string, fase: Fase) => void
  onEditItem: (item: RoadmapItem) => void
}

function CardConteudo({ item }: { item: RoadmapItem }) {
  const marcosAtivos = MARCOS.filter(m => item[m.doneField as keyof RoadmapItem])
  return (
    <>
      <p className="pr-6 text-sm font-bold leading-snug text-foreground">{item.nome}</p>
      <Badge variant="outline" className={cn("mt-2 border text-[9px]", FASE_BADGE[item.fase])}>
        {FASES.find(f => f.value === item.fase)?.label}
      </Badge>
      {marcosAtivos.length > 0 && (
        <div className="mt-2 flex flex-wrap gap-1">
          {marcosAtivos.map(m => (
            <span
              key={m.key}
              className="rounded-full border border-primary/30 bg-primary/10 px-1.5 py-0.5 text-[8px] font-bold uppercase tracking-wider text-primary"
            >
              {m.label}
            </span>
          ))}
        </div>
      )}
      <div className="mt-2.5 flex items-center gap-2">
        <Badge variant="outline" className={cn("border text-[9px]", VALOR_BADGE[item.valor])}>
          {valorLabel(item.valor)}
        </Badge>
        <span className="text-[10px] font-semibold tabular-nums text-muted-foreground">
          ROI {calcRoi(item.valor, item.complexidade).toFixed(1)}
        </span>
      </div>
      {item.responsavel && (
        <p className="mt-2 text-[10px] font-medium text-muted-foreground">
          {item.responsavel}
        </p>
      )}
    </>
  )
}

function KanbanCard({
  item,
  onEditItem,
}: {
  item: RoadmapItem
  onEditItem: (item: RoadmapItem) => void
}) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({ id: item.id })
  return (
    <div
      ref={setNodeRef}
      {...listeners}
      {...attributes}
      className={cn(
        "relative cursor-grab rounded-xl border border-border bg-card p-3 shadow-sm transition-shadow hover:border-primary/40 active:cursor-grabbing",
        isDragging && "opacity-40"
      )}
    >
      <button
        type="button"
        onPointerDown={e => e.stopPropagation()}
        onClick={() => onEditItem(item)}
        className="absolute right-2 top-2 text-muted-foreground transition-colors hover:text-primary"
        aria-label="Editar item"
      >
        <Edit3Icon className="size-3.5" />
      </button>
      <CardConteudo item={item} />
    </div>
  )
}

function KanbanColumn({
  fase,
  label,
  itens,
  onEditItem,
}: {
  fase: Fase
  label: string
  itens: RoadmapItem[]
  onEditItem: (item: RoadmapItem) => void
}) {
  const { setNodeRef, isOver } = useDroppable({ id: fase })
  return (
    <div
      ref={setNodeRef}
      className={cn(
        "flex w-64 shrink-0 flex-col rounded-2xl border border-border bg-muted/10 transition-colors",
        isOver && "border-primary/50 bg-primary/5"
      )}
    >
      <header className="border-b border-border/60 px-3 py-2.5">
        <h3 className="text-xs font-bold uppercase tracking-wider text-foreground">{label}</h3>
        <p className="text-[10px] font-medium text-muted-foreground">
          {itens.length} {itens.length === 1 ? "item" : "itens"}
        </p>
      </header>
      <div className="flex min-h-[120px] flex-col gap-2 p-2.5">
        {itens.map(item => (
          <KanbanCard key={item.id} item={item} onEditItem={onEditItem} />
        ))}
      </div>
    </div>
  )
}

export function RoadmapVisual({ itens, onMoveItem, onEditItem }: Props) {
  const [activeId, setActiveId] = useState<string | null>(null)
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } })
  )

  const activeItem = activeId ? itens.find(i => i.id === activeId) ?? null : null

  function handleDragStart(e: DragStartEvent) {
    setActiveId(e.active.id as string)
  }

  function handleDragEnd(e: DragEndEvent) {
    setActiveId(null)
    const { active, over } = e
    if (!over) return
    const item = itens.find(i => i.id === active.id)
    if (!item) return
    const novaFase = over.id as Fase
    if (item.fase !== novaFase) onMoveItem(item.id, novaFase)
  }

  return (
    <DndContext
      sensors={sensors}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
      onDragCancel={() => setActiveId(null)}
    >
      <div className="flex gap-3 overflow-x-auto pb-2">
        {FASES.map(f => (
          <KanbanColumn
            key={f.value}
            fase={f.value}
            label={f.label}
            itens={itens
              .filter(i => i.fase === f.value)
              .sort((a, b) => a.ordem - b.ordem)}
            onEditItem={onEditItem}
          />
        ))}
      </div>
      <DragOverlay>
        {activeItem ? (
          <div className="w-60 rounded-xl border border-primary/50 bg-card p-3 shadow-xl">
            <CardConteudo item={activeItem} />
          </div>
        ) : null}
      </DragOverlay>
    </DndContext>
  )
}
