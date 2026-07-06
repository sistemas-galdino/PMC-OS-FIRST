import { useCallback, useEffect, useMemo, useState, type ReactNode } from "react";
import { toast } from "sonner";

import {
  BarChart3Icon,
  Building2Icon,
  ChevronRightIcon,
  ClockIcon,
  FileTextIcon,
  MailIcon,
  MessageCircleIcon,
  PhoneIcon,
  ShieldCheckIcon,
  Sparkles2Icon,
  TrophyIcon,
  UsersIcon,
} from "@/components/ui/icons";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import {
  listarResultados,
  getCandidatoCompleto,
  getResultadoDetalhe,
  atualizarStage,
  CANDIDATE_STAGES,
  type CandidateStage,
  type InviteWithResult,
} from "@/lib/guardiao/api";
import { aggregatePillarScores, getVerdict } from "@/lib/guardiao/pillars";
import { Relatorio } from "./relatorio";

/* Rótulos + estilo de cada etapa do funil (kanban / drawer). */
const STAGE_META: Record<CandidateStage, { label: string; icon: string; chipCls: string }> = {
  reprovado_teste: {
    label: "Reprovado no teste",
    icon: "❌",
    chipCls: "border-destructive/40 bg-destructive/10 text-destructive",
  },
  aprovado_teste: {
    label: "Aprovado no teste",
    icon: "✅",
    chipCls: "border-primary/40 bg-primary/10 text-primary",
  },
  envio_case: {
    label: "Envio do case",
    icon: "📝",
    chipCls: "border-sky-500/40 bg-sky-500/10 text-sky-400",
  },
  entrevista: {
    label: "Entrevista",
    icon: "🎙️",
    chipCls: "border-amber-400/40 bg-amber-400/10 text-amber-400",
  },
  negociacao: {
    label: "Negociação",
    icon: "💬",
    chipCls: "border-violet-500/40 bg-violet-500/10 text-violet-400",
  },
  contratado_guardiao: {
    label: "Contratado como Guardião",
    icon: "🛡️",
    chipCls: "border-emerald-600/40 bg-emerald-600/10 text-emerald-400",
  },
};

type TypeFilter = "todos" | "interno" | "externo";

export function Resultados({
  clientId,
}: {
  clientId?: string;
  adminView?: boolean;
  session?: any;
}) {
  const [rows, setRows] = useState<InviteWithResult[]>([]);
  const [loading, setLoading] = useState(true);
  const [typeFilter, setTypeFilter] = useState<TypeFilter>("todos");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [reportId, setReportId] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      setRows(await listarResultados(clientId));
    } catch (err: any) {
      toast.error("Erro ao carregar resultados", { description: err?.message });
    } finally {
      setLoading(false);
    }
  }, [clientId]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const filtered = useMemo(() => {
    if (typeFilter === "todos") return rows;
    return rows.filter((row) => (row.guardiao_assessments as any)?.type === typeFilter);
  }, [rows, typeFilter]);

  const completed = useMemo(() => filtered.filter((row) => row.result), [filtered]);
  const pending = filtered.length - completed.length;
  const media = completed.length
    ? Math.round(
        completed.reduce((sum, row) => sum + Number(row.result?.score_pct ?? 0), 0) / completed.length,
      )
    : 0;

  const FILTERS: { key: TypeFilter; label: string; icon: ReactNode }[] = [
    { key: "todos", label: "Todos", icon: <BarChart3Icon className="h-3.5 w-3.5" /> },
    { key: "interno", label: "Internos", icon: <Building2Icon className="h-3.5 w-3.5" /> },
    { key: "externo", label: "Externos", icon: <UsersIcon className="h-3.5 w-3.5" /> },
  ];

  return (
    <div className="space-y-5">
      {/* Filtro interno/externo */}
      <div className="inline-flex gap-1 rounded-lg border border-border bg-muted/20 p-1">
        {FILTERS.map((f) => {
          const active = typeFilter === f.key;
          return (
            <button
              key={f.key}
              type="button"
              onClick={() => setTypeFilter(f.key)}
              className={`inline-flex items-center gap-1.5 rounded-md px-3.5 py-1.5 text-xs font-bold uppercase tracking-wider transition ${
                active
                  ? "bg-primary text-primary-foreground shadow"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground"
              }`}
            >
              {f.icon}
              {f.label}
            </button>
          );
        })}
      </div>

      {loading ? (
        <div className="flex items-center justify-center rounded-xl border border-border bg-card/50 backdrop-blur-md px-6 py-16">
          <Spinner className="size-6 text-primary" />
        </div>
      ) : completed.length > 0 ? (
        <>
          {/* Métricas */}
          <div className="grid gap-3 sm:grid-cols-3">
            <MetricCard icon={<TrophyIcon className="h-4 w-4" />} label="Concluídas" value={completed.length} />
            <MetricCard icon={<ClockIcon className="h-4 w-4" />} label="Pendentes" value={pending} />
            <MetricCard icon={<BarChart3Icon className="h-4 w-4" />} label="Média geral" value={`${media}%`} />
          </div>

          {/* Tabela de respondentes */}
          <div className="overflow-hidden rounded-xl border border-border bg-card/50 backdrop-blur-md">
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent">
                  <TableHead className="px-4 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                    Respondente
                  </TableHead>
                  <TableHead className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                    Pontuação
                  </TableHead>
                  <TableHead className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                    Veredicto
                  </TableHead>
                  <TableHead className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                    Tipo
                  </TableHead>
                  <TableHead className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                    Data
                  </TableHead>
                  <TableHead className="w-10" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {completed.map((row) => {
                  const pct = Number(row.result?.score_pct ?? 0);
                  const v = getVerdict(pct);
                  const toneCls =
                    v.tone === "success"
                      ? "border-primary/40 bg-primary/10 text-primary"
                      : v.tone === "warning"
                        ? "border-yellow-500/40 bg-yellow-500/10 text-yellow-500"
                        : "border-destructive/40 bg-destructive/10 text-destructive";
                  const type = (row.guardiao_assessments as any)?.type as string | undefined;
                  return (
                    <TableRow
                      key={row.id}
                      onClick={() => setSelectedId(row.id)}
                      className="cursor-pointer"
                    >
                      <TableCell className="px-4 py-3">
                        <p className="font-medium text-foreground">{row.candidate_name ?? "Sem nome"}</p>
                        <p className="text-xs text-muted-foreground">
                          {row.candidate_email ||
                            row.candidate_whatsapp ||
                            (row.guardiao_assessments as any)?.title}
                        </p>
                      </TableCell>
                      <TableCell className="text-sm font-semibold text-primary">{pct.toFixed(1)}%</TableCell>
                      <TableCell>
                        <span
                          className={`inline-flex w-fit items-center rounded-full border px-2.5 py-0.5 text-[11px] font-semibold uppercase tracking-wider ${toneCls}`}
                        >
                          {v.label}
                        </span>
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        {type === "interno" ? "Interno" : type === "externo" ? "Externo" : "—"}
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        {row.completed_at ? new Date(row.completed_at).toLocaleDateString("pt-BR") : "—"}
                      </TableCell>
                      <TableCell>
                        <ChevronRightIcon className="h-4 w-4 text-muted-foreground" />
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        </>
      ) : (
        <div className="flex flex-col items-center justify-center rounded-xl border border-border bg-card/50 backdrop-blur-md px-6 py-16 text-center">
          <div className="flex h-14 w-14 items-center justify-center rounded-full bg-primary/15 ring-1 ring-primary/30">
            <BarChart3Icon className="h-6 w-6 text-primary" />
          </div>
          <h2 className="mt-5 text-xl font-bold tracking-tight">Nenhum resultado ainda</h2>
          <p className="mt-2 max-w-md text-sm text-muted-foreground">
            Quando seus convidados completarem a avaliação, os resultados aparecerão aqui automaticamente.
          </p>
          <div className="mt-6 flex items-center gap-2 text-xs text-muted-foreground">
            <Sparkles2Icon className="h-3.5 w-3.5 text-primary" />
            Crie um convite e envie o link público para o respondente
          </div>
        </div>
      )}

      {/* Drawer de detalhe */}
      <CandidateDrawer
        inviteId={selectedId}
        onClose={() => setSelectedId(null)}
        onOpenReport={(id) => setReportId(id)}
        onLocalStage={(id, stage) =>
          setRows((prev) => prev.map((r) => (r.id === id ? { ...r, stage } : r)))
        }
      />

      {/* Relatório completo (Dialog) */}
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

/* ===================== Drawer ===================== */

function CandidateDrawer({
  inviteId,
  onClose,
  onOpenReport,
  onLocalStage,
}: {
  inviteId: string | null;
  onClose: () => void;
  onOpenReport: (id: string) => void;
  onLocalStage: (id: string, stage: CandidateStage) => void;
}) {
  const [full, setFull] = useState<Awaited<ReturnType<typeof getCandidatoCompleto>> | null>(null);
  const [detail, setDetail] = useState<Awaited<ReturnType<typeof getResultadoDetalhe>> | null>(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!inviteId) {
      setFull(null);
      setDetail(null);
      return;
    }
    let alive = true;
    setLoading(true);
    Promise.all([getCandidatoCompleto(inviteId), getResultadoDetalhe(inviteId)])
      .then(([f, d]) => {
        if (!alive) return;
        setFull(f);
        setDetail(d);
      })
      .catch((err: any) => toast.error("Erro ao carregar candidato", { description: err?.message }))
      .finally(() => {
        if (alive) setLoading(false);
      });
    return () => {
      alive = false;
    };
  }, [inviteId]);

  async function setStage(stage: CandidateStage) {
    if (!inviteId) return;
    setSaving(true);
    try {
      await atualizarStage(inviteId, stage);
      onLocalStage(inviteId, stage);
      setFull((prev) => (prev ? { ...prev, invite: { ...prev.invite, stage } } : prev));
      toast.success("Etapa atualizada");
    } catch (err: any) {
      toast.error("Não foi possível atualizar", { description: err?.message });
    } finally {
      setSaving(false);
    }
  }

  const open = !!inviteId;
  const invite = full?.invite;
  const pct = Number(full?.result?.score_pct ?? 0);
  const pillars = aggregatePillarScores(full?.result?.pillar_scores as any);
  const currentStage = (invite?.stage as CandidateStage) ?? "aprovado_teste";
  const openAnswers = detail?.openAnswers ?? [];

  return (
    <Sheet open={open} onOpenChange={(v) => !v && onClose()}>
      <SheetContent className="w-full overflow-y-auto bg-background sm:max-w-xl">
        <SheetHeader>
          <SheetTitle className="text-xl font-bold tracking-tight">
            {invite?.candidate_name ?? "Candidato"}
          </SheetTitle>
        </SheetHeader>

        {loading || !full ? (
          <div className="flex items-center justify-center py-20">
            <Spinner className="size-6 text-primary" />
          </div>
        ) : (
          <div className="space-y-6 px-4 pb-8">
            {/* Contato */}
            <section className="rounded-lg border border-border bg-muted/30 p-4 text-sm">
              <div className="flex flex-col gap-1.5 text-muted-foreground">
                {invite.candidate_email && (
                  <span className="inline-flex items-center gap-2">
                    <MailIcon className="h-3.5 w-3.5 text-primary" /> {invite.candidate_email}
                  </span>
                )}
                {invite.candidate_whatsapp && (
                  <span className="inline-flex items-center gap-2">
                    <PhoneIcon className="h-3.5 w-3.5 text-primary" /> {invite.candidate_whatsapp}
                  </span>
                )}
                {invite.candidate_whatsapp && (
                  <a
                    href={`https://wa.me/${String(invite.candidate_whatsapp).replace(/\D/g, "")}`}
                    target="_blank"
                    rel="noreferrer"
                    className="mt-1 inline-flex w-fit items-center gap-1 text-xs text-primary hover:underline"
                  >
                    <MessageCircleIcon className="h-3 w-3" /> Abrir conversa no WhatsApp
                  </a>
                )}
              </div>
            </section>

            {/* Ver relatório completo */}
            <Button className="w-full" onClick={() => invite && onOpenReport(invite.id)}>
              <FileTextIcon /> Ver relatório completo
            </Button>

            {/* Score por pilar */}
            <section className="rounded-lg border border-border bg-muted/30 p-5">
              <div className="mb-4 flex items-center justify-between">
                <div className="inline-flex items-center gap-2 text-sm font-semibold">
                  <ShieldCheckIcon className="h-4 w-4 text-primary" /> Score por Pilar
                </div>
                <span className="text-2xl font-bold tracking-tight text-primary">{pct.toFixed(0)}%</span>
              </div>
              <div className="space-y-3">
                {pillars.map((p) => (
                  <div key={p.key}>
                    <div className="mb-1 flex items-center justify-between text-xs">
                      <span className="text-foreground">{p.label}</span>
                      <span className="font-semibold text-primary">{p.pct.toFixed(0)}%</span>
                    </div>
                    <Progress value={Math.min(100, p.pct)} className="h-1.5" />
                  </div>
                ))}
              </div>
            </section>

            {/* Resposta aberta */}
            {openAnswers.length > 0 && (
              <section className="rounded-lg border border-border bg-muted/30 p-5">
                <h3 className="mb-3 text-sm font-semibold">Resposta aberta</h3>
                <div className="space-y-3">
                  {openAnswers.map((a, i) => (
                    <div key={i} className="text-sm">
                      <p className="text-xs font-medium text-muted-foreground">{a.prompt}</p>
                      <p className="mt-1 whitespace-pre-wrap text-foreground">{a.text}</p>
                    </div>
                  ))}
                </div>
              </section>
            )}

            {/* Respostas completas */}
            <section className="rounded-lg border border-border bg-muted/30 p-5">
              <h3 className="mb-3 text-sm font-semibold">Respostas completas</h3>
              <div className="space-y-4">
                {full.responses.map((r, i) => (
                  <div key={i} className="text-sm">
                    <p className="text-xs font-medium text-muted-foreground">{r.prompt}</p>
                    <p className="mt-1 text-foreground">→ {r.answer}</p>
                  </div>
                ))}
                {full.responses.length === 0 && (
                  <p className="text-xs text-muted-foreground">Sem respostas registradas.</p>
                )}
              </div>
            </section>

            {/* Mover para etapa */}
            <section className="rounded-lg border border-primary/30 bg-primary/5 p-5">
              <div className="mb-3 flex items-center gap-2 text-sm font-semibold">
                <ShieldCheckIcon className="h-4 w-4 text-primary" /> Mover para etapa
              </div>
              <div className="flex flex-wrap gap-2">
                {CANDIDATE_STAGES.map((s) => {
                  const meta = STAGE_META[s];
                  const active = currentStage === s;
                  return (
                    <button
                      key={s}
                      disabled={saving}
                      onClick={() => setStage(s)}
                      className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-[11px] font-semibold uppercase tracking-wider transition disabled:opacity-60 ${
                        active
                          ? "border-primary bg-primary/15 text-primary"
                          : `${meta.chipCls} hover:opacity-80`
                      }`}
                    >
                      <span>{meta.icon}</span>
                      {meta.label}
                    </button>
                  );
                })}
              </div>
            </section>
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}

function MetricCard({
  icon,
  label,
  value,
}: {
  icon: ReactNode;
  label: string;
  value: ReactNode;
}) {
  return (
    <div className="rounded-xl border border-border bg-card/50 backdrop-blur-md p-4">
      <div className="flex items-center gap-2 text-xs uppercase tracking-wider text-muted-foreground">
        {icon}
        {label}
      </div>
      <p className="mt-2 text-2xl font-bold tracking-tight text-foreground">{value}</p>
    </div>
  );
}
