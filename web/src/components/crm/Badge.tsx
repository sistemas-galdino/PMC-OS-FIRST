import type {
  AtividadeStatus,
  ClienteStatus,
  Engajamento,
  Temperatura,
} from "@/lib/crm/types";

const map: Record<string, string> = {
  Ativo: "bg-status-green/15 text-status-green border-status-green/30",
  Cancelado: "bg-status-gray/15 text-[color:var(--status-gray)] border-status-gray/30",
  "Em Risco": "bg-status-red/15 text-status-red border-status-red/30",
  Engajado: "bg-status-green/15 text-status-green border-status-green/30",
  Saudável: "bg-status-green/15 text-status-green border-status-green/30",
  "Em Atenção": "bg-status-yellow/15 text-status-yellow border-status-yellow/30",
  Desengajado: "bg-status-gray/15 text-[color:var(--status-gray)] border-status-gray/30",
  Crítico: "bg-status-red/15 text-status-red border-status-red/30",
  Pendente: "bg-status-yellow/15 text-status-yellow border-status-yellow/30",
  "Em andamento": "bg-status-blue/15 text-status-blue border-status-blue/30",
  Concluída: "bg-status-green/15 text-status-green border-status-green/30",
  Impedida: "bg-status-yellow/15 text-status-yellow border-status-yellow/30",
  Atrasada: "bg-status-red/15 text-status-red border-status-red/30",
  Quente: "bg-status-green/15 text-status-green border-status-green/30",
  Morno: "bg-status-yellow/15 text-status-yellow border-status-yellow/30",
  Frio: "bg-status-red/15 text-status-red border-status-red/30",
  "Não definido": "bg-status-gray/15 text-[color:var(--status-gray)] border-status-gray/30",
};

const tempIcon: Record<Temperatura, string> = {
  Quente: "🔥",
  Morno: "🌤",
  Frio: "❄️",
  "Em Risco": "🚨",
  "Não definido": "⚙️",
};

export function Badge({
  value,
}: {
  value: ClienteStatus | Engajamento | AtividadeStatus | Temperatura | string;
}) {
  const cls = map[value] || "bg-card border-border text-muted-foreground";
  const icon = tempIcon[value as Temperatura];
  return (
    <span
      className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium border ${cls}`}
    >
      {icon && <span>{icon}</span>}
      {value}
    </span>
  );
}
