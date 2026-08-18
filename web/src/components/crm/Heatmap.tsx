import { useMemo } from "react";
import { useCsList } from "@/lib/crm/equipe";
import { type CSName, type Atividade } from "@/lib/crm/types";

const WD = ["Seg", "Ter", "Qua", "Qui", "Sex", "Sáb", "Dom"];

const LINHA_VAZIA = [0, 0, 0, 0, 0, 0, 0];

function startOfWeekMon(): Date {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  const dow = d.getDay(); // 0=Dom
  const diff = (dow + 6) % 7; // dias desde segunda
  d.setDate(d.getDate() - diff);
  return d;
}

export function Heatmap({ atividades }: { atividades: Atividade[] }) {
  // Lista reativa: o time chega do banco depois do 1º render.
  const csList = useCsList();
  const start = useMemo(() => startOfWeekMon(), []);
  const days = useMemo(() => {
    return Array.from({ length: 7 }).map((_, i) => {
      const d = new Date(start);
      d.setDate(start.getDate() + i);
      return d;
    });
  }, [start]);

  const matrix: Record<CSName, number[]> = useMemo(() => {
    const m: Record<string, number[]> = {};
    csList.forEach((cs) => (m[cs] = new Array(7).fill(0)));
    atividades.forEach((a) => {
      if (a.status !== "Concluída" || !a.data_conclusao) return;
      const dc = new Date(a.data_conclusao);
      const diff = Math.floor((dc.getTime() - start.getTime()) / 86400000);
      if (diff < 0 || diff > 6) return;
      if (m[a.cs_responsavel]) m[a.cs_responsavel][diff]++;
    });
    return m as Record<CSName, number[]>;
    // csList precisa estar aqui: sem ela a matriz ficava presa na lista vazia.
  }, [atividades, start, csList]);

  const max = Math.max(
    1,
    ...Object.values(matrix).flat(),
  );

  function bg(v: number) {
    if (v === 0) return "bg-background border border-border";
    const intensity = Math.min(1, v / max);
    // 5 levels
    if (intensity > 0.8) return "bg-primary text-primary-foreground";
    if (intensity > 0.6) return "bg-primary/80 text-primary-foreground";
    if (intensity > 0.4) return "bg-primary/60";
    if (intensity > 0.2) return "bg-primary/40";
    return "bg-primary/20";
  }

  const isToday = (d: Date) => {
    const t = new Date();
    return d.getDate() === t.getDate() && d.getMonth() === t.getMonth();
  };

  return (
    <div className="bg-card border border-border rounded-lg p-4 overflow-x-auto">
      <div className="min-w-[480px]">
        <div className="grid grid-cols-[100px_repeat(7,1fr)] gap-1.5 mb-2">
          <div />
          {days.map((d, i) => (
            <div
              key={i}
              className={`text-center text-[10px] font-semibold uppercase tracking-wider ${
                isToday(d) ? "text-primary" : "text-muted-foreground"
              }`}
            >
              {WD[i]} <span className="opacity-60 tabular-nums">{d.getDate()}</span>
            </div>
          ))}
        </div>
        {csList.length === 0 && (
          <div className="text-xs text-muted-foreground py-6 text-center">
            Carregando o time…
          </div>
        )}
        {csList.map((cs) => (
          <div key={cs} className="grid grid-cols-[100px_repeat(7,1fr)] gap-1.5 mb-1.5">
            <div className="text-xs font-semibold flex items-center">{cs}</div>
            {/* Fallback defensivo: se a matriz e a lista ficarem fora de sincronia
                por um render, o .map() abaixo quebraria a tela. */}
            {(matrix[cs] ?? LINHA_VAZIA).map((v, i) => (
              <div
                key={i}
                title={`${cs} · ${WD[i]}: ${v} concluída${v === 1 ? "" : "s"}`}
                className={`h-10 rounded-md flex items-center justify-center text-xs font-bold tabular-nums transition-colors ${bg(v)}`}
              >
                {v > 0 ? v : ""}
              </div>
            ))}
          </div>
        ))}
        <div className="mt-3 flex items-center gap-2 text-[10px] text-muted-foreground">
          Menos
          <span className="h-3 w-4 rounded bg-background border border-border" />
          <span className="h-3 w-4 rounded bg-primary/20" />
          <span className="h-3 w-4 rounded bg-primary/40" />
          <span className="h-3 w-4 rounded bg-primary/60" />
          <span className="h-3 w-4 rounded bg-primary" />
          Mais
        </div>
      </div>
    </div>
  );
}
