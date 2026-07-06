import { useEffect, useMemo, useState } from "react";

import {
  AlertTriangleIcon,
  Building2Icon,
  CheckCircle2Icon,
  FileTextIcon,
  UserPlusIcon,
} from "@/components/ui/icons";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { getResultadoDetalhe } from "@/lib/guardiao/api";
import { buildReport, type PillarClass } from "@/lib/guardiao/report";

/**
 * Mini Relatório Executivo do Perfil do Guardião de IA.
 * Componente reusável — aberto a partir de <Resultados>.
 * Determinístico: usa getResultadoDetalhe + buildReport (report.ts).
 */
export function Relatorio({ inviteId }: { inviteId: string }) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<Awaited<ReturnType<typeof getResultadoDetalhe>> | null>(null);

  useEffect(() => {
    let alive = true;
    setLoading(true);
    setError(null);
    getResultadoDetalhe(inviteId)
      .then((d) => {
        if (alive) setData(d);
      })
      .catch((err: any) => {
        if (alive) setError(err?.message ?? "Erro ao carregar resultado");
      })
      .finally(() => {
        if (alive) setLoading(false);
      });
    return () => {
      alive = false;
    };
  }, [inviteId]);

  if (loading) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center">
        <Spinner className="size-6 text-primary" />
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="rounded-xl border border-border bg-card/50 backdrop-blur-md p-8 text-center">
        <AlertTriangleIcon className="mx-auto h-8 w-8 text-destructive" />
        <h1 className="mt-3 text-xl font-bold tracking-tight">Não foi possível abrir o resultado</h1>
        <p className="mt-2 text-sm text-muted-foreground">{error}</p>
      </div>
    );
  }

  const { invite, result, openAnswers } = data as any;

  if (!result) {
    return (
      <div className="rounded-xl border border-border bg-card/50 backdrop-blur-md p-8 text-center">
        <AlertTriangleIcon className="mx-auto h-8 w-8 text-yellow-500" />
        <h1 className="mt-3 text-xl font-bold tracking-tight">Avaliação ainda não concluída</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          {invite.candidate_name || "O candidato"} ainda não enviou as respostas. O relatório aparecerá
          aqui assim que finalizar.
        </p>
      </div>
    );
  }

  return (
    <ReportView invite={invite} result={result} openAnswers={openAnswers ?? []} />
  );
}

function ReportView({
  invite,
  result,
  openAnswers,
}: {
  invite: any;
  result: any;
  openAnswers: Array<{ prompt: string; code: string; text: string }>;
}) {
  const pct = Number(result.score_pct ?? 0);
  const type = (invite.guardiao_assessments as any)?.type as "interno" | "externo" | undefined;

  const report = useMemo(
    () => buildReport(invite.candidate_name || "O candidato", pct, result.pillar_scores),
    [invite.candidate_name, pct, result.pillar_scores],
  );

  const dateStr = invite.completed_at
    ? new Date(invite.completed_at).toLocaleDateString("pt-BR")
    : "—";

  const statusTone =
    report.status.tone === "success"
      ? "border-primary/40 bg-primary/10 text-primary"
      : report.status.tone === "warning"
        ? "border-yellow-500/40 bg-yellow-500/10 text-yellow-500"
        : "border-destructive/40 bg-destructive/10 text-destructive";

  return (
    <div className="mx-auto w-full max-w-4xl print:px-0 print:py-0">
      {/* Ações */}
      <div className="mb-4 flex items-center justify-end gap-3 print:hidden">
        <Button variant="outline" size="sm" onClick={() => window.print()}>
          <FileTextIcon /> Imprimir / PDF
        </Button>
      </div>

      {/* PÁGINA 1 */}
      <section className="rounded-xl border border-border bg-card/50 backdrop-blur-md p-6 md:p-8 print:break-after-page print:rounded-none print:border-0">
        <header className="mb-6 flex flex-wrap items-start justify-between gap-4 border-b border-border pb-5">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-widest text-primary">
              Mini Relatório Executivo — Guardião de IA
            </p>
            <h1 className="mt-1 text-2xl font-bold tracking-tight md:text-3xl">
              {invite.candidate_name || "Candidato"}
            </h1>
            <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
              <span className="inline-flex items-center gap-1.5">
                {type === "interno" ? (
                  <Building2Icon className="h-3 w-3" />
                ) : (
                  <UserPlusIcon className="h-3 w-3" />
                )}
                {type === "interno" ? "Colaborador interno" : "Candidato externo"}
              </span>
              <span>Avaliação: {dateStr}</span>
              {invite.candidate_email && <span>{invite.candidate_email}</span>}
            </div>
          </div>
          <div className="text-right">
            <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
              Aderência geral
            </p>
            <p className="text-4xl font-bold tracking-tight text-primary">{pct.toFixed(1)}%</p>
            <div
              className={`mt-2 inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider ${statusTone}`}
            >
              {report.status.tone === "success" ? (
                <CheckCircle2Icon className="h-3 w-3" />
              ) : (
                <AlertTriangleIcon className="h-3 w-3" />
              )}
              {report.status.label}
            </div>
          </div>
        </header>

        {/* Resumo executivo */}
        <div className="mb-6">
          <SectionTitle index="1" title="Resumo executivo" />
          <p className="mt-2 whitespace-pre-line text-sm leading-relaxed text-foreground">
            {report.summary}
          </p>
        </div>

        {/* Resultado por pilar */}
        <div>
          <SectionTitle index="2" title="Resultado por pilar" />
          <div className="mt-3 space-y-3">
            {report.pillars.map((p) => (
              <PillarRow key={p.key} pillar={p} />
            ))}
          </div>
          <p className="mt-3 text-[11px] text-muted-foreground">
            Classificação: <span className="font-semibold text-primary">acima de 75% — ponto forte</span>;{" "}
            <span className="font-semibold text-yellow-500">60% a 74% — adequado, pode desenvolver</span>;{" "}
            <span className="font-semibold text-destructive">abaixo de 60% — ponto de atenção</span>.
          </p>
        </div>
      </section>

      {/* PÁGINA 2 */}
      <section className="mt-6 rounded-xl border border-border bg-card/50 backdrop-blur-md p-6 md:p-8 print:mt-0 print:rounded-none print:border-0">
        <div className="mb-6 grid gap-6 md:grid-cols-2">
          <div>
            <SectionTitle index="3" title="Pontos fortes identificados" />
            {report.strengths.length ? (
              <ul className="mt-2 space-y-2 text-sm text-foreground">
                {report.strengths.map((s, i) => (
                  <li key={i} className="flex gap-2">
                    <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-primary" />
                    <span>{s}</span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="mt-2 text-sm text-muted-foreground">
                As respostas não evidenciaram pontos fortes consistentes nos pilares avaliados.
              </p>
            )}
          </div>

          <div>
            <SectionTitle index="4" title="Pontos a desenvolver" />
            {report.developmentPoints.length ? (
              <ul className="mt-2 space-y-2 text-sm text-foreground">
                {report.developmentPoints.map((s, i) => (
                  <li key={i} className="flex gap-2">
                    <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-yellow-500" />
                    <span>{s}</span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="mt-2 text-sm text-muted-foreground">
                Sem pontos críticos identificados — manter acompanhamento contínuo.
              </p>
            )}
          </div>
        </div>

        <div className="mb-6 rounded-lg border border-primary/30 bg-primary/5 p-5">
          <SectionTitle index="5" title="Recomendação final" />
          <p className="mt-2 text-sm leading-relaxed text-foreground">{report.recommendation}</p>
        </div>

        <div>
          <SectionTitle index="6" title="Próximo passo sugerido" />
          <ul className="mt-2 space-y-2 text-sm text-foreground">
            {report.nextSteps.map((s, i) => (
              <li key={i} className="flex gap-2">
                <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-primary" />
                <span>{s}</span>
              </li>
            ))}
          </ul>
        </div>

        <p className="mt-6 border-t border-border pt-3 text-[10px] leading-relaxed text-muted-foreground">
          Este relatório é uma devolutiva executiva baseada exclusivamente nas respostas, pesos, pontuações
          e pilares da avaliação do Perfil do Guardião de IA. A decisão final deve considerar também
          entrevista, contexto da empresa e validação por case prático.
        </p>
      </section>

      {/* Resposta aberta (não imprime na versão executiva) */}
      {openAnswers && openAnswers.length > 0 && (
        <section className="mt-6 rounded-xl border border-border bg-card/50 backdrop-blur-md p-6 md:p-8 print:hidden">
          <h3 className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
            Resposta aberta do candidato
          </h3>
          <div className="mt-3 space-y-4">
            {openAnswers.map((a, i) => (
              <div key={i} className="rounded-lg border border-border bg-muted/30 p-4">
                <p className="text-sm font-medium text-foreground">{a.prompt}</p>
                <p className="mt-2 whitespace-pre-wrap text-sm leading-relaxed text-muted-foreground">
                  {a.text}
                </p>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}

function SectionTitle({ index, title }: { index: string; title: string }) {
  return (
    <div className="flex items-center gap-2">
      <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-primary/15 text-[10px] font-bold text-primary">
        {index}
      </span>
      <h2 className="text-base font-bold tracking-tight text-foreground">{title}</h2>
    </div>
  );
}

function PillarRow({
  pillar,
}: {
  pillar: { key: string; label: string; pct: number; classification: PillarClass; analysis: string };
}) {
  const tone =
    pillar.classification === "forte"
      ? { dot: "bg-primary", text: "text-primary", label: "Ponto forte" }
      : pillar.classification === "adequado"
        ? { dot: "bg-yellow-500", text: "text-yellow-500", label: "Adequado" }
        : { dot: "bg-destructive", text: "text-destructive", label: "Ponto de atenção" };

  return (
    <div className="rounded-md border border-border bg-muted/20 p-3">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <span className={`h-2 w-2 rounded-full ${tone.dot}`} />
          <span className="text-sm font-semibold text-foreground">{pillar.label}</span>
          <span className={`text-[10px] font-bold uppercase tracking-wider ${tone.text}`}>
            · {tone.label}
          </span>
        </div>
        <span className="text-sm font-bold tracking-tight text-primary">{pillar.pct.toFixed(1)}%</span>
      </div>
      <Progress value={Math.min(100, pillar.pct)} className="mt-2 h-1.5" />
      {pillar.analysis && (
        <p className="mt-2 text-xs leading-relaxed text-muted-foreground">{pillar.analysis}</p>
      )}
    </div>
  );
}
