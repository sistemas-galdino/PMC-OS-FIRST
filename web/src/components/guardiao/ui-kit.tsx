import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

export function PageHeader({ title, subtitle, action }: { title: string; subtitle?: string; action?: ReactNode }) {
  return (
    <div className="flex items-end justify-between gap-4 flex-wrap mb-6">
      <div>
        <h2 className="text-2xl font-semibold tracking-tight">{title}</h2>
        {subtitle && <p className="text-sm text-muted-foreground mt-1">{subtitle}</p>}
      </div>
      {action}
    </div>
  );
}

export function StatCard({ label, value, hint }: { label: string; value: ReactNode; hint?: string }) {
  return (
    <div className="rounded-lg border card-glass p-5">
      <div className="text-xs uppercase tracking-wider text-muted-foreground">{label}</div>
      <div className="mt-2 text-3xl font-semibold text-primary">{value}</div>
      {hint && <div className="mt-1 text-xs text-muted-foreground">{hint}</div>}
    </div>
  );
}

export function Badge({ children, tone = "default" }: { children: ReactNode; tone?: "default" | "neon" | "warn" | "ok" }) {
  const map = {
    default: "bg-secondary text-foreground border-border",
    neon: "bg-primary/15 text-primary border-primary/30",
    warn: "bg-amber-500/15 text-amber-300 border-amber-500/30",
    ok: "bg-emerald-500/15 text-emerald-300 border-emerald-500/30",
  } as const;
  return (
    <span className={cn("inline-flex items-center px-2 py-0.5 rounded-md text-[11px] border", map[tone])}>
      {children}
    </span>
  );
}

export function FaseBadge({ fase, titulo }: { fase?: number | null; titulo?: string }) {
  if (!fase) return null;
  const f = String(fase).padStart(2, "0");
  return (
    <span
      title={titulo ? `Fase ${f} — ${titulo}` : `Fase ${f}`}
      className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] border bg-primary/10 text-primary border-primary/40 font-medium"
    >
      <span className="h-1.5 w-1.5 rounded-full bg-primary shadow-[0_0_6px_var(--primary)]" />
      Fase {f}{titulo ? ` · ${titulo}` : ""}
    </span>
  );
}

export function EmptyState({ title, hint }: { title: string; hint?: string }) {
  return (
    <div className="rounded-lg border card-glass p-10 text-center">
      <div className="text-base font-medium">{title}</div>
      {hint && <div className="text-sm text-muted-foreground mt-1">{hint}</div>}
    </div>
  );
}

export function FaseRegua({ atual }: { atual?: number | null }) {
  const fases = [1, 2, 3, 4, 5, 6, 7] as const;
  return (
    <div className="flex items-center gap-1 flex-wrap">
      {fases.map((n, i) => {
        const ativa = atual === n;
        const passada = !!atual && atual > n;
        return (
          <div key={n} className="flex items-center gap-1">
            <div
              title={`Fase 0${n}`}
              className={cn(
                "px-2 py-0.5 rounded-md text-[10px] border font-medium transition",
                ativa
                  ? "bg-primary/20 text-primary border-primary/60 shadow-[0_0_8px_var(--primary)]"
                  : passada
                  ? "bg-secondary text-foreground/70 border-border"
                  : "bg-transparent text-muted-foreground border-border/50"
              )}
            >
              0{n}
            </div>
            {i < fases.length - 1 && (
              <div className={cn("h-px w-3", passada ? "bg-primary/60" : "bg-border/50")} />
            )}
          </div>
        );
      })}
    </div>
  );
}
