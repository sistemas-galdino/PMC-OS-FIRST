import { useCallback, useEffect, useMemo, useState } from "react";
import {
  DndContext,
  DragOverlay,
  KeyboardSensor,
  PointerSensor,
  closestCorners,
  useDraggable,
  useDroppable,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragStartEvent,
} from "@dnd-kit/core";
import { CSS } from "@dnd-kit/utilities";
import { toast } from "sonner";

import { ChevronRightIcon, TrophyIcon } from "@/components/ui/icons";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Spinner } from "@/components/ui/spinner";
import {
  listarRanking,
  atualizarStage,
  CANDIDATE_STAGES,
  type CandidateStage,
  type InviteWithResult,
} from "@/lib/guardiao/api";
import { Relatorio } from "./relatorio";

const STAGE_META: Record<CandidateStage, { label: string; icon: string; headerCls: string }> = {
  reprovado_teste: { label: "Reprovado no teste", icon: "❌", headerCls: "bg-destructive text-white" },
  aprovado_teste: { label: "Aprovado no teste", icon: "✅", headerCls: "bg-primary text-primary-foreground" },
  envio_case: { label: "Envio do case", icon: "📝", headerCls: "bg-sky-500 text-white" },
  entrevista: { label: "Entrevista", icon: "🎙️", headerCls: "bg-amber-400 text-black" },
  negociacao: { label: "Negociação", icon: "💬", headerCls: "bg-violet-500 text-white" },
  contratado_guardiao: { label: "Contratado como Guardião", icon: "🛡️", headerCls: "bg-emerald-600 text-white" },
};

/** Etapa efetiva de um candidato (aplica fallback por score quando o stage é nulo/inválido). */
function resolveStage(row: InviteWithResult): CandidateStage {
  const raw = row.stage as CandidateStage | null | undefined;
  if (raw && CANDIDATE_STAGES.includes(raw)) return raw;
  return Number(row.result?.score_pct ?? 0) >= 70 ? "aprovado_teste" : "reprovado_teste";
}

export function Ranking({
  clientId,
}: {
  clientId?: string;
  adminView?: boolean;
}) {
  const [rows, setRows] = useState<InviteWithResult[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [reportId, setReportId] = useState<string | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor),
  );

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      setRows(await listarRanking(clientId));
    } catch (err: any) {
      toast.error("Erro ao carregar ranking", { description: err?.message });
    } finally {
      setLoading(false);
    }
  }, [clientId]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const grouped = useMemo(() => {
    const map = new Map<CandidateStage, InviteWithResult[]>();
    CANDIDATE_STAGES.forEach((s) => map.set(s, []));
    rows.forEach((r) => map.get(resolveStage(r))!.push(r));
    return map;
  }, [rows]);

  const activeRow = activeId ? rows.find((r) => r.id === activeId) ?? null : null;

  async function moveTo(id: string, stage: CandidateStage) {
    const current = rows.find((r) => r.id === id);
    if (!current || resolveStage(current) === stage) return;
    const prevStage = current.stage as CandidateStage | null | undefined;
    // Atualização otimista
    setRows((prev) => prev.map((r) => (r.id === id ? { ...r, stage } : r)));
    try {
      await atualizarStage(id, stage);
      toast.success("Etapa atualizada");
    } catch (err: any) {
      setRows((prev) => prev.map((r) => (r.id === id ? { ...r, stage: prevStage ?? null } : r)));
      toast.error("Não foi possível mover", { description: err?.message });
    }
  }

  function onDragStart(e: DragStartEvent) {
    setActiveId(String(e.active.id));
  }

  function onDragEnd(e: DragEndEvent) {
    setActiveId(null);
    const overId = e.over?.id;
    if (!overId) return;
    const stage = String(overId) as CandidateStage;
    if (!CANDIDATE_STAGES.includes(stage)) return;
    moveTo(String(e.active.id), stage);
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center rounded-xl border border-border bg-card/50 backdrop-blur-md px-6 py-16">
        <Spinner className="size-6 text-primary" />
      </div>
    );
  }

  if (rows.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center rounded-xl border border-border bg-card/50 backdrop-blur-md px-6 py-16 text-center">
        <TrophyIcon className="h-8 w-8 text-primary" />
        <h2 className="mt-4 text-lg font-bold tracking-tight">Nenhum candidato ainda</h2>
        <p className="mt-1 max-w-md text-sm text-muted-foreground">
          Quando alguém concluir a avaliação, vai aparecer aqui para ser movido pelas etapas do funil.
        </p>
      </div>
    );
  }

  return (
    <div>
      <p className="mb-3 flex items-center gap-1.5 text-[11px] text-muted-foreground">
        <ChevronRightIcon className="h-3 w-3" /> Arraste os cards para mover o candidato entre as etapas.
      </p>

      <DndContext
        sensors={sensors}
        collisionDetection={closestCorners}
        onDragStart={onDragStart}
        onDragEnd={onDragEnd}
        onDragCancel={() => setActiveId(null)}
      >
        <div className="overflow-x-auto pb-2">
          <div className="flex min-w-max gap-2.5">
            {CANDIDATE_STAGES.map((stage) => (
              <Column
                key={stage}
                stage={stage}
                items={grouped.get(stage) ?? []}
                onOpen={setReportId}
              />
            ))}
          </div>
        </div>

        <DragOverlay>
          {activeRow ? <CardBody row={activeRow} dragging /> : null}
        </DragOverlay>
      </DndContext>

      {/* Relatório completo */}
      <Dialog open={!!reportId} onOpenChange={(v) => !v && setReportId(null)}>
        <DialogContent className="max-h-[90vh] w-full max-w-[calc(100%-2rem)] overflow-y-auto bg-background sm:max-w-4xl">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold tracking-tight">Relatório executivo</DialogTitle>
          </DialogHeader>
          {reportId && <Relatorio inviteId={reportId} />}
        </DialogContent>
      </Dialog>
    </div>
  );
}

/* ===================== Coluna (droppable) ===================== */

function Column({
  stage,
  items,
  onOpen,
}: {
  stage: CandidateStage;
  items: InviteWithResult[];
  onOpen: (id: string) => void;
}) {
  const meta = STAGE_META[stage];
  const { setNodeRef, isOver } = useDroppable({ id: stage });

  return (
    <div
      ref={setNodeRef}
      className={`flex w-56 shrink-0 flex-col rounded-xl border bg-muted/20 transition ${
        isOver ? "border-primary ring-2 ring-primary/40" : "border-border"
      } ${stage === "reprovado_teste" ? "opacity-90" : ""}`}
    >
      <div className={`flex items-center justify-between rounded-t-xl px-3 py-2 ${meta.headerCls}`}>
        <span className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider">
          <span>{meta.icon}</span>
          {meta.label}
        </span>
        <span className="rounded-full bg-black/25 px-1.5 py-0.5 text-[10px] font-bold">{items.length}</span>
      </div>

      <div className="flex max-h-[70vh] flex-1 flex-col gap-1.5 overflow-y-auto p-2">
        {items.length === 0 ? (
          <div className="flex h-16 items-center justify-center rounded-md border border-dashed border-border text-[10px] text-muted-foreground">
            Solte um card aqui
          </div>
        ) : (
          items.map((row) => <DraggableCard key={row.id} row={row} onOpen={onOpen} />)
        )}
      </div>
    </div>
  );
}

/* ===================== Card (draggable) ===================== */

function DraggableCard({ row, onOpen }: { row: InviteWithResult; onOpen: (id: string) => void }) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({ id: row.id });

  return (
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Translate.toString(transform), opacity: isDragging ? 0.4 : 1 }}
      {...attributes}
      {...listeners}
      onClick={() => onOpen(row.id)}
    >
      <CardBody row={row} />
    </div>
  );
}

function CardBody({ row, dragging }: { row: InviteWithResult; dragging?: boolean }) {
  const pct = Number(row.result?.score_pct ?? 0);
  return (
    <div
      className={`cursor-pointer rounded-lg border border-border bg-card/50 backdrop-blur-md p-2 transition hover:border-primary/50 ${
        dragging ? "border-primary/60 shadow-lg shadow-primary/10" : ""
      }`}
    >
      <div className="flex items-start justify-between gap-2">
        <p className="truncate text-sm font-semibold text-foreground">{row.candidate_name}</p>
        <span className="text-sm font-bold leading-none tracking-tight text-primary">{pct.toFixed(0)}%</span>
      </div>
      <p className="mt-0.5 truncate text-[11px] text-muted-foreground">
        {row.candidate_email || row.candidate_whatsapp || "—"}
      </p>
    </div>
  );
}
