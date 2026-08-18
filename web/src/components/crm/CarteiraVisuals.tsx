import { useMemo } from "react";
import {
  PieChart,
  Pie,
  Cell,
  Tooltip as RTooltip,
  ResponsiveContainer,
} from "recharts";
import {
  Cpu,
  Bot,
  CalendarCheck,
  Headphones,
  Star,
  RefreshCw,
} from "lucide-react";
import {
  cicloDoCliente,
  diaPrograma,
  proxRenovacao,
  semDataDeEntrada,
  situacaoDe,
  temRelogioDeCiclo,
  temReuniaoConsultor,
  temReuniaoGaldino,
} from "@/lib/crm/storage";
import type { Cliente, SituacaoCliente, Temperatura } from "@/lib/crm/types";

export type EntregaKey =
  | "bcrm"
  | "guardiao"
  | "galdino"
  | "consultor"
  | "vitoria"
  | "renov";

export type CicloKey =
  | "inicio"
  | "t1"
  | "t2"
  | "t3"
  | "pre"
  | "renovacao"
  | "nao_renovado";

export const CICLO_DEFS: {
  key: CicloKey;
  label: string;
  sub: string;
  range?: [number, number];
}[] = [
  { key: "inicio", label: "Início do programa", sub: "30d", range: [0, 30] },
  { key: "t1", label: "T1", sub: "90d", range: [31, 90] },
  { key: "t2", label: "T2", sub: "180d", range: [91, 180] },
  { key: "t3", label: "T3", sub: "270d", range: [181, 270] },
  { key: "pre", label: "Pré-renovação", sub: "360d", range: [271, 360] },
  { key: "renovacao", label: "Renovação", sub: "manual" },
  { key: "nao_renovado", label: "Ciclo não renovado", sub: "manual" },
];

/** Só clientes com situação "Ativo" entram na régua de ciclos. */
export function cicloKeyOf(c: Cliente): CicloKey | null {
  if (!temRelogioDeCiclo(c)) return null;
  const d = diaPrograma(c);
  for (const def of CICLO_DEFS) {
    if (def.range && d >= def.range[0] && d <= def.range[1]) return def.key;
  }
  return "pre";
}

const TEMP_DEF: { temp: Temperatura; label: string; color: string }[] = [
  { temp: "Quente", label: "🔥 Quente", color: "#22C55E" },
  { temp: "Morno", label: "🌤 Morno", color: "#EAB308" },
  { temp: "Frio", label: "❄️ Frio", color: "#60A5FA" },
  { temp: "Em Risco", label: "🚨 Em Risco", color: "#EF4444" },
];

export function SaudeCarteira({
  clientes,
  clientesTodos,
  tempActive,
  cicloActive,
  situacaoActive = "all",
  onTempClick,
  onCicloClick,
  onSituacaoClick,
}: {
  clientes: Cliente[];
  clientesTodos?: Cliente[];
  tempActive: Temperatura | "all";
  cicloActive: CicloKey | "all";
  situacaoActive?: SituacaoCliente | "all";
  onTempClick: (t: Temperatura) => void;
  onCicloClick: (k: CicloKey) => void;
  onSituacaoClick?: (s: SituacaoCliente) => void;
}) {
  const foraDaRegua = useMemo(() => {
    let naoIniciou = 0;
    let cancelado = 0;
    (clientesTodos ?? clientes).forEach((c) => {
      const s = situacaoDe(c);
      if (s === "Não iniciou o programa") naoIniciou++;
      else if (s === "Cancelado") cancelado++;
    });
    return { naoIniciou, cancelado };
  }, [clientes, clientesTodos]);

  const tempCounts = useMemo(() => {
    const m: Record<string, number> = { Quente: 0, Morno: 0, Frio: 0, "Em Risco": 0 };
    clientes.forEach((c) => {
      if (situacaoDe(c) !== "Ativo") return;
      if (m[c.temperatura] !== undefined) m[c.temperatura]++;
    });
    return m;
  }, [clientes]);

  type Slice = {
    name: string;
    label: string;
    value: number;
    color: string;
    temp?: Temperatura;
    situacao?: SituacaoCliente;
  };

  const slices: Slice[] = [
    ...TEMP_DEF.map((d) => ({
      name: d.label,
      label: d.label.split(" ")[0],
      temp: d.temp,
      value: tempCounts[d.temp] || 0,
      color: d.color,
    })),
    {
      name: "Não iniciou o programa",
      label: "Não iniciou",
      situacao: "Não iniciou o programa" as SituacaoCliente,
      value: foraDaRegua.naoIniciou,
      color: "#71717A",
    },
    {
      name: "Cancelado",
      label: "Cancelado",
      situacao: "Cancelado" as SituacaoCliente,
      value: foraDaRegua.cancelado,
      color: "#EF4444",
    },
  ];

  const total = slices.reduce((s, d) => s + d.value, 0);
  const pieData = slices.filter((d) => d.value > 0);

  const cicloCounts = useMemo(() => {
    const m: Record<CicloKey, number> = {
      inicio: 0,
      t1: 0,
      t2: 0,
      t3: 0,
      pre: 0,
      renovacao: 0,
      nao_renovado: 0,
    };
    clientes.forEach((c) => {
      const k = cicloKeyOf(c);
      if (k) m[k]++;
    });
    return m;
  }, [clientes]);

  // Clientes ativos sem data de entrada não têm relógio de ciclo: ficam fora de
  // todos os marcos acima. Sem esta contagem eles sumiriam da tela em vez de
  // aparecer como a pendência de cadastro que são.
  const semData = useMemo(
    () => clientes.filter((c) => situacaoDe(c) === "Ativo" && semDataDeEntrada(c)).length,
    [clientes],
  );

  return (
    <div className="bg-card border border-border rounded-lg p-5">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Donut */}
        <div>
          <h3 className="text-sm font-bold mb-3">Temperatura da Carteira</h3>
          <div className="relative h-[220px]">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={pieData.length ? pieData : [{ name: "—", value: 1, color: "#27272a" }]}
                  dataKey="value"
                  innerRadius="65%"
                  outerRadius="90%"
                  paddingAngle={2}
                  stroke="none"
                  animationDuration={600}
                  onClick={(d) => {
                    // O recharts tipa o payload da fatia como PieSectorDataItem;
                    // os campos que interessam aqui são os do nosso Slice.
                    const s = d as unknown as { temp?: Temperatura; situacao?: SituacaoCliente };
                    if (s?.temp) onTempClick(s.temp);
                    else if (s?.situacao) onSituacaoClick?.(s.situacao);
                  }}
                >
                  {(pieData.length ? pieData : [{ color: "#27272a" }]).map((entry, i) => (
                    <Cell
                      key={i}
                      fill={entry.color}
                      style={{ cursor: "pointer", outline: "none" }}
                    />
                  ))}
                </Pie>
                {pieData.length > 0 && (
                  <RTooltip
                    contentStyle={{
                      background: "hsl(var(--card))",
                      border: "1px solid hsl(var(--border))",
                      borderRadius: 8,
                      fontSize: 12,
                    }}
                    formatter={(v, _n, p) => {
                      const n = Number(v);
                      const nome = (p as { payload?: { name?: string } })?.payload?.name;
                      return [`${n} (${total ? Math.round((n / total) * 100) : 0}%)`, nome];
                    }}
                  />
                )}
              </PieChart>
            </ResponsiveContainer>
            <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
              <div className="text-3xl font-bold tabular-nums">{total}</div>
              <div className="text-[11px] uppercase tracking-wider text-muted-foreground">
                clientes
              </div>
            </div>
          </div>
          <div className="flex flex-wrap justify-center gap-x-4 gap-y-1 mt-2 text-xs">
            {slices.map((d) => {
              const active = d.temp
                ? tempActive === d.temp
                : d.situacao
                  ? situacaoActive === d.situacao
                  : false;
              return (
                <button
                  key={d.name}
                  onClick={() =>
                    d.temp ? onTempClick(d.temp) : d.situacao && onSituacaoClick?.(d.situacao)
                  }
                  className={`inline-flex items-center gap-1.5 hover:text-foreground transition-colors ${
                    active ? "text-foreground font-semibold" : "text-muted-foreground"
                  }`}
                >
                  <span
                    className="inline-block h-2 w-2 rounded-full"
                    style={{ background: d.color }}
                  />
                  {d.label} {d.value}
                </button>
              );
            })}
          </div>
          {(tempActive !== "all" || situacaoActive !== "all") && (
            <div className="text-center mt-2">
              <button
                onClick={() => {
                  if (tempActive !== "all") onTempClick(tempActive as Temperatura);
                  if (situacaoActive !== "all") onSituacaoClick?.(situacaoActive as SituacaoCliente);
                }}
                className="text-[11px] text-primary hover:underline"
              >
                Limpar filtro
              </button>
            </div>
          )}
        </div>

        {/* Ciclos timeline */}
        <div>
          <h3 className="text-sm font-bold mb-3">Distribuição por Ciclo</h3>

          <div className="relative pt-8 pb-2">
            {/* line */}
            <div className="absolute left-4 right-4 top-[58px] h-px bg-border" />
            <div className="grid grid-cols-7 gap-1 relative">
              {CICLO_DEFS.map((def) => {
                const count = cicloCounts[def.key];
                const active = cicloActive === def.key;
                const badgeColor =
                  count === 0
                    ? "bg-muted text-muted-foreground"
                    : count <= 2
                      ? "bg-status-yellow/20 text-status-yellow border border-status-yellow/40"
                      : "bg-status-green/20 text-status-green border border-status-green/40";
                return (
                  <button
                    key={def.key}
                    onClick={() => onCicloClick(def.key)}
                    className="flex flex-col items-center group"
                    title={`${def.label}: ${count} cliente(s)`}
                  >
                    <span
                      className={`text-[11px] font-bold px-2 py-0.5 rounded-full min-w-[28px] text-center ${badgeColor}`}
                    >
                      {count}
                    </span>
                    <span className="mt-3 relative">
                      <span
                        className={`block h-3 w-3 rounded-full border-2 transition-colors ${
                          active
                            ? "bg-primary border-primary"
                            : "bg-card border-muted-foreground/40 group-hover:border-primary"
                        }`}
                      />
                    </span>
                    <span className="text-[10px] text-muted-foreground mt-2">{def.sub}</span>
                    <span
                      className={`text-[11px] mt-0.5 ${active ? "text-primary font-semibold" : "text-foreground"}`}
                    >
                      {def.label}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
          {semData > 0 && (
            <div className="text-[11px] text-muted-foreground text-center mt-1">
              {semData} cliente(s) ativo(s) sem data de entrada — fora da régua de ciclos.
            </div>
          )}
          {cicloActive !== "all" && (
            <div className="text-center mt-2">
              <button
                onClick={() => onCicloClick(cicloActive as CicloKey)}
                className="text-[11px] text-primary hover:underline"
              >
                Limpar filtro de ciclo
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ===================================================================

function entregaFlag(c: Cliente, k: EntregaKey): boolean {
  switch (k) {
    case "bcrm":
      return !!c.black_crm;
    case "guardiao":
      return !!c.guardiao_ia;
    case "galdino":
      return temReuniaoGaldino(c);
    case "consultor":
      return temReuniaoConsultor(c);
    case "vitoria":
      return !!c.vitoria_registrada;
    case "renov":
      return proxRenovacao(c);
  }
}

export function entregaMatches(
  c: Cliente,
  k: EntregaKey,
  side: "com" | "sem",
): boolean {
  const f = entregaFlag(c, k);
  return side === "com" ? f : !f;
}

const CARDS: {
  key: EntregaKey;
  title: string;
  icon: typeof Cpu;
  comLabel: string;
  semLabel: string;
  highlight?: boolean;
}[] = [
  { key: "bcrm", title: "Black CRM", icon: Cpu, comLabel: "com Black CRM", semLabel: "sem Black CRM" },
  { key: "guardiao", title: "Guardião de IA", icon: Bot, comLabel: "com Guardião", semLabel: "sem Guardião" },
  { key: "galdino", title: "Próx. Reunião c/ Galdino", icon: CalendarCheck, comLabel: "com reunião", semLabel: "sem reunião" },
  { key: "consultor", title: "Reunião com Consultor", icon: Headphones, comLabel: "com reunião", semLabel: "sem reunião" },
  { key: "vitoria", title: "Vitórias", icon: Star, comLabel: "com vitória", semLabel: "sem vitória" },
  { key: "renov", title: "Renovação (próx. trimestre)", icon: RefreshCw, comLabel: "renovam", semLabel: "fora da janela", highlight: true },
];

export function EntregasPrograma({
  clientes,
  active,
  onToggle,
}: {
  clientes: Cliente[];
  active: { key: EntregaKey; side: "com" | "sem" } | null;
  onToggle: (key: EntregaKey, side: "com" | "sem") => void;
}) {
  const total = clientes.length;

  return (
    <div className="bg-card border border-border rounded-lg p-5">
      <div>
        <h3 className="text-sm font-bold">Entregas do Programa</h3>
        <p className="text-xs text-muted-foreground">
          Status das principais entregas na carteira
        </p>
      </div>
      <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-3 gap-3 mt-4">
        {CARDS.map((card) => {
          const com = clientes.filter((c) => entregaFlag(c, card.key)).length;
          const sem = total - com;
          const isActiveCom = active?.key === card.key && active.side === "com";
          const isActiveSem = active?.key === card.key && active.side === "sem";
          const Icon = card.icon;
          const highlight = card.highlight && com > 0;

          return (
            <div
              key={card.key}
              className={`border rounded-lg p-3 transition-colors ${
                isActiveCom || isActiveSem
                  ? "border-primary bg-primary/5"
                  : "border-border bg-background"
              } ${highlight ? "ring-1 ring-status-yellow/40" : ""}`}
            >
              <div className="flex items-center gap-2 mb-2">
                <Icon className="h-4 w-4 text-primary" />
                <span className="text-xs font-semibold">{card.title}</span>
              </div>

              <div className="flex gap-1.5">
                <button
                  onClick={() => onToggle(card.key, "com")}
                  className={`flex-1 text-[11px] px-2 py-1 rounded-md border ${
                    isActiveCom
                      ? "bg-status-green/30 text-status-green border-status-green/60 font-semibold"
                      : "bg-status-green/10 text-status-green border-status-green/30 hover:bg-status-green/20"
                  }`}
                >
                  {com} {card.comLabel}
                </button>
                <button
                  onClick={() => onToggle(card.key, "sem")}
                  className={`flex-1 text-[11px] px-2 py-1 rounded-md border ${
                    isActiveSem
                      ? "bg-status-red/30 text-status-red border-status-red/60 font-semibold"
                      : "bg-status-red/10 text-status-red border-status-red/30 hover:bg-status-red/20"
                  }`}
                >
                  {sem} {card.semLabel}
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// Small utility for inline cliente cycle bar (used by drawer)
export function CicloProgressBar({ cliente }: { cliente: Cliente }) {
  const ativo = temRelogioDeCiclo(cliente);
  const dia = Math.min(360, Math.max(0, diaPrograma(cliente)));
  const pct = ativo ? Math.round((dia / 360) * 100) : 0;
  const currentKey = cicloKeyOf(cliente);
  return (
    <div className="bg-background border border-border rounded-lg p-3">
      <div className="flex items-center justify-between mb-2">
        {CICLO_DEFS.filter((d) => d.range).map((def) => {
          const active = def.key === currentKey;
          return (
            <div key={def.key} className="flex flex-col items-center flex-1">
              <span
                className={`block h-2.5 w-2.5 rounded-full ${active ? "" : "bg-muted-foreground/30"}`}
                style={active ? { background: "#DAFC67" } : undefined}
              />
              <span
                className={`text-[9px] mt-1 ${active ? "text-foreground font-semibold" : "text-muted-foreground"}`}
              >
                {def.sub}
              </span>
            </div>
          );
        })}
      </div>
      <div className="h-1 rounded-full overflow-hidden bg-[#2A2A2A]">
        <div className="h-full" style={{ width: `${pct}%`, background: "#DAFC67" }} />
      </div>
      <div className="text-[11px] text-muted-foreground mt-1.5">
        {ativo
          ? `Dia ${Math.min(360, diaPrograma(cliente))} de 360 · ${cicloDoCliente(cliente)}`
          : // Sem relógio de ciclo o rótulo é a situação; quando a causa é a
            // falta de data de entrada, dizer isso é mais útil que "Ativo".
            semDataDeEntrada(cliente)
            ? cicloDoCliente(cliente)
            : situacaoDe(cliente)}
      </div>
    </div>
  );
}
