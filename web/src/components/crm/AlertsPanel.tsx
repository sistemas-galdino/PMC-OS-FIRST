import { useMemo, useState } from "react";
import { AlertTriangle, Clock, Thermometer, UserX, X } from "lucide-react";
import {
  diasSemContato,
  isCS,
  openCliente,
  proximaAtividade,
  useAtividades,
  useClientes,
  useProfile,
} from "@/lib/crm/storage";
import { formatBR } from "@/lib/crm/format";
import type { Cliente, CSName } from "@/lib/crm/types";

type AlertKey = "risco" | "morno" | "atrasada" | "orfao";

const MORNO_LIMITE_DIAS = 7;

export function AlertsPanel() {
  const [profile] = useProfile();
  const clientes = useClientes();
  const atividades = useAtividades();
  const [open, setOpen] = useState<AlertKey | null>(null);

  // `profile` nulo é a coordenação vendo o time inteiro — não é "nenhuma CS".
  // Só quando a pessoa logada é uma CS o painel passa a ser a carteira dela.
  const csName: CSName | null = isCS(profile) ? (profile as CSName) : null;

  const visClientes = useMemo(
    () => (csName ? clientes.filter((c) => c.responsavel_cs === csName) : clientes),
    [clientes, csName],
  );
  const visAtv = useMemo(
    () => (csName ? atividades.filter((a) => a.cs_responsavel === csName) : atividades),
    [atividades, csName],
  );

  const risco = useMemo(
    () => visClientes.filter((c) => c.status === "Em Risco" && !proximaAtividade(c.id, atividades)),
    [visClientes, atividades],
  );

  const mornos = useMemo(
    () =>
      visClientes.filter((c) => {
        if (c.temperatura !== "Morno") return false;
        const d = diasSemContato(c.id, atividades);
        return d !== null && d > MORNO_LIMITE_DIAS;
      }),
    [visClientes, atividades],
  );

  const atrasadas = useMemo(() => {
    const now = Date.now();
    return visAtv.filter((a) => {
      if (a.status === "Atrasada") return true;
      if (a.status === "Pendente" || a.status === "Em andamento") {
        return new Date(a.data_prevista).getTime() < now - 86400000;
      }
      return false;
    });
  }, [visAtv]);

  const orfaos = useMemo(
    () => visClientes.filter((c) => c.status === "Ativo" && !proximaAtividade(c.id, atividades)),
    [visClientes, atividades],
  );

  const cards: Array<{
    key: AlertKey;
    icon: typeof AlertTriangle;
    label: string;
    count: number;
    tone: string;
    border: string;
  }> = [
    {
      key: "risco",
      icon: AlertTriangle,
      label: "Em Risco sem ação",
      count: risco.length,
      tone: "text-status-red",
      border: "hover:border-status-red/60",
    },
    {
      key: "morno",
      icon: Thermometer,
      label: `Mornos >${MORNO_LIMITE_DIAS}d sem contato`,
      count: mornos.length,
      tone: "text-status-yellow",
      border: "hover:border-status-yellow/60",
    },
    {
      key: "atrasada",
      icon: Clock,
      label: "Atividades atrasadas",
      count: atrasadas.length,
      tone: "text-status-red",
      border: "hover:border-status-red/60",
    },
    {
      key: "orfao",
      icon: UserX,
      label: "Ativos sem próxima ação",
      count: orfaos.length,
      tone: "text-status-yellow",
      border: "hover:border-status-yellow/60",
    },
  ];

  const aberto = open ? cards.find((c) => c.key === open) : undefined;

  return (
    <>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {cards.map((c) => {
          const Icon = c.icon;
          const active = c.count > 0;
          return (
            <button
              key={c.key}
              disabled={!active}
              onClick={() => setOpen(c.key)}
              className={`bg-card border border-border rounded-lg p-4 text-left transition-all ${
                active ? `${c.border} cursor-pointer` : "opacity-50 cursor-default"
              }`}
            >
              <div className="flex items-center justify-between">
                <Icon className={`h-4 w-4 ${active ? c.tone : "text-muted-foreground"}`} />
                <span className={`text-3xl font-black tabular-nums ${active ? c.tone : "text-muted-foreground"}`}>
                  {c.count}
                </span>
              </div>
              <div className="text-xs text-muted-foreground mt-2 font-medium leading-tight">
                {c.label}
              </div>
            </button>
          );
        })}
      </div>

      {open && aberto && (
        <AlertDrawer
          onClose={() => setOpen(null)}
          title={aberto.label}
          tone={aberto.tone}
        >
          {open === "atrasada" ? (
            <ul className="divide-y divide-border">
              {atrasadas.map((a) => {
                const cli = clientes.find((c) => c.id === a.cliente_id);
                return (
                  <li key={a.id} className="py-3 flex items-center gap-3">
                    <div className="flex-1 min-w-0">
                      <button
                        onClick={() => {
                          if (cli) openCliente(cli.id);
                          setOpen(null);
                        }}
                        className="font-semibold text-sm hover:text-primary text-left truncate block w-full"
                      >
                        {cli?.nome || "—"}
                      </button>
                      <div className="text-xs text-muted-foreground mt-0.5">
                        {a.tipo} · {formatBR(a.data_prevista)}{a.hora ? ` ${a.hora}` : ""} · {a.cs_responsavel}
                      </div>
                    </div>
                  </li>
                );
              })}
            </ul>
          ) : (
            <ClienteList
              items={
                open === "risco" ? risco : open === "morno" ? mornos : orfaos
              }
              clientes={clientes}
              atividades={atividades}
              onPick={() => setOpen(null)}
            />
          )}
        </AlertDrawer>
      )}
    </>
  );
}

function ClienteList({
  items,
  atividades,
  onPick,
}: {
  items: Cliente[];
  clientes: Cliente[];
  atividades: ReturnType<typeof useAtividades>;
  onPick: () => void;
}) {
  if (items.length === 0)
    return <div className="text-sm text-muted-foreground py-6 text-center">Nenhum item.</div>;
  return (
    <ul className="divide-y divide-border">
      {items.map((c) => {
        const d = diasSemContato(c.id, atividades);
        return (
          <li key={c.id} className="py-3 flex items-center justify-between gap-3">
            <button
              onClick={() => {
                openCliente(c.id);
                onPick();
              }}
              className="text-left flex-1 min-w-0"
            >
              <div className="font-semibold text-sm hover:text-primary truncate">{c.nome}</div>
              <div className="text-xs text-muted-foreground mt-0.5">
                {c.responsavel_cs} · {c.status} · {c.temperatura}
                {d !== null && <> · {d}d sem contato</>}
              </div>
            </button>
          </li>
        );
      })}
    </ul>
  );
}

function AlertDrawer({
  title,
  tone,
  onClose,
  children,
}: {
  title: string;
  tone: string;
  onClose: () => void;
  children: React.ReactNode;
}) {
  return (
    <div className="fixed inset-0 z-40 flex justify-end" onClick={onClose}>
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
      <div
        className="relative w-full max-w-md bg-card border-l border-border h-full overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="sticky top-0 bg-card border-b border-border p-4 flex items-center justify-between z-10">
          <h3 className={`font-bold ${tone}`}>{title}</h3>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground">
            <X className="h-5 w-5" />
          </button>
        </div>
        <div className="p-4">{children}</div>
      </div>
    </div>
  );
}
