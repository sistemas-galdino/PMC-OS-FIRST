import { useCsList } from "@/lib/crm/equipe";
import { type CSName } from "@/lib/crm/types";
import { isCS, useProfile } from "@/lib/crm/storage";
import type { Period } from "@/lib/crm/format";

const periods: { id: Period; label: string }[] = [
  { id: "hoje", label: "Hoje" },
  { id: "semana", label: "Esta semana" },
  { id: "mes", label: "Este mês" },
  { id: "30dias", label: "Últimos 30 dias" },
];

export function PeriodToggle({
  value,
  onChange,
}: {
  value: Period;
  onChange: (p: Period) => void;
}) {
  return (
    <div className="inline-flex bg-card border border-border rounded-xl p-1">
      {periods.map((p) => (
        <button
          key={p.id}
          onClick={() => onChange(p.id)}
          className={`px-4 py-2 text-sm rounded-lg transition-colors ${
            value === p.id
              ? "bg-primary text-primary-foreground font-semibold"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          {p.label}
        </button>
      ))}
    </div>
  );
}

export function CSFilter({
  value,
  onChange,
}: {
  value: CSName | "all";
  onChange: (v: CSName | "all") => void;
}) {
  const [profile] = useProfile();
  // Lista reativa: o time chega do banco depois do 1º render.
  const csList = useCsList();
  const locked = isCS(profile);
  // If CS profile, lock to own name
  const effective = locked ? (profile as CSName) : value;

  return (
    <select
      value={effective}
      disabled={locked}
      onChange={(e) => onChange(e.target.value as CSName | "all")}
      className="bg-card border border-border rounded-xl px-4 py-2.5 text-sm disabled:opacity-70 disabled:cursor-not-allowed focus:outline-none focus:border-primary"
    >
      <option value="all">Todas as CS</option>
      {csList.map((c) => (
        <option key={c} value={c}>
          {c}
        </option>
      ))}
    </select>
  );
}

export function useEffectiveCS(selected: CSName | "all"): CSName | "all" {
  const [profile] = useProfile();
  if (isCS(profile)) return profile;
  return selected;
}
