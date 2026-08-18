import { useEffect, useMemo, useState } from "react";
import { Badge } from "@/components/crm/Badge";
import { ClientDrawerHost } from "@/components/crm/ClientDrawer";
import {
  SaudeCarteira,
  EntregasPrograma,
  cicloKeyOf,
  entregaMatches,
  type CicloKey,
  type EntregaKey,
} from "@/components/crm/CarteiraVisuals";
import {
  buildDisplayIdMap,
  carteiraAtiva,
  cicloDoCliente,
  diaPrograma,
  diasSemContato,
  isCS,
  openCliente,
  proximaAtividade,
  semDataDeEntrada,
  situacaoDe,
  useAtividades,
  useClientes,
  useProfile,
} from "@/lib/crm/storage";
import { formatBR } from "@/lib/crm/format";
import { useCsList } from "@/lib/crm/equipe";
import {
  type ClienteStatus,
  type CSName,
  type SituacaoCliente,
  type Temperatura,
} from "@/lib/crm/types";
import { Search, Clock } from "lucide-react";

/**
 * "Sem data de entrada" não é um marco da jornada, é uma pendência de cadastro
 * (103 clientes ativos em produção estão assim). Ele não entra em CICLO_DEFS
 * para não distorcer a régua, mas precisa ser filtrável — senão esses clientes
 * ficam invisíveis para a CS.
 */
type CicloFiltro = CicloKey | "sem_data" | "all";

export default function CrmClientesPage() {
  const clientes = useClientes();
  const atividades = useAtividades();
  const [profile] = useProfile();
  // Lista reativa: o time chega do banco depois do 1º render.
  const csList = useCsList();
  const csLocked: CSName | null = isCS(profile) ? (profile as CSName) : null;

  const [q, setQ] = useState("");
  const [csSel, setCsSel] = useState<CSName | "all">("all");
  const [statusF, setStatusF] = useState<ClienteStatus | "all">("all");
  const [tempF, setTempF] = useState<Temperatura | "all">("all");
  const [cicloF, setCicloF] = useState<CicloFiltro>("all");
  const [situacaoF, setSituacaoF] = useState<SituacaoCliente | "all">("all");
  const [entregaF, setEntregaF] = useState<{ key: EntregaKey; side: "com" | "sem" } | null>(null);

  // Preferência de visualização, não dado de negócio: pode ficar no localStorage.
  const [viewMode, setViewMode] = useState<"lista" | "cards">(() => {
    if (typeof window === "undefined") return "cards";
    return (localStorage.getItem("pmc.clientes.view") as "lista" | "cards") || "cards";
  });
  useEffect(() => {
    if (typeof window !== "undefined") localStorage.setItem("pmc.clientes.view", viewMode);
  }, [viewMode]);

  const cs = csLocked || csSel;
  const idMap = useMemo(() => buildDisplayIdMap(clientes), [clientes]);

  // Escopo da CS para os visuais
  const scoped = useMemo(
    () =>
      clientes
        .filter((c) => (cs === "all" ? true : c.responsavel_cs === cs))
        .filter((c) => (statusF === "all" ? true : c.status === statusF)),
    [clientes, cs, statusF],
  );

  const list = useMemo(
    () =>
      scoped
        .filter((c) => (tempF === "all" ? true : c.temperatura === tempF))
        .filter((c) =>
          cicloF === "all"
            ? true
            : cicloF === "sem_data"
              ? semDataDeEntrada(c)
              : cicloKeyOf(c) === cicloF,
        )
        .filter((c) => (situacaoF === "all" ? true : situacaoDe(c) === situacaoF))
        .filter((c) => (entregaF ? entregaMatches(c, entregaF.key, entregaF.side) : true))
        .filter((c) => {
          const ql = q.toLowerCase();
          if (!ql) return true;
          const id = (idMap.get(c.id) || "").toLowerCase();
          return (
            id.includes(ql) ||
            c.nome.toLowerCase().includes(ql) ||
            (c.empresa || "").toLowerCase().includes(ql)
          );
        }),
    [scoped, tempF, cicloF, situacaoF, entregaF, q, idMap],
  );

  const semDataCount = useMemo(() => scoped.filter(semDataDeEntrada).length, [scoped]);

  const anyFilter =
    !!q ||
    statusF !== "all" ||
    tempF !== "all" ||
    cicloF !== "all" ||
    situacaoF !== "all" ||
    !!entregaF ||
    csSel !== "all";

  function clearFilters() {
    setQ("");
    setStatusF("all");
    setTempF("all");
    setCicloF("all");
    setSituacaoF("all");
    setEntregaF(null);
    if (!csLocked) setCsSel("all");
  }

  function toggleTemp(t: Temperatura) {
    setTempF((prev) => (prev === t ? "all" : t));
  }
  function toggleCiclo(k: CicloKey) {
    setCicloF((prev) => (prev === k ? "all" : k));
  }
  function toggleSituacao(s: SituacaoCliente) {
    setSituacaoF((prev) => (prev === s ? "all" : s));
  }
  function toggleEntrega(key: EntregaKey, side: "com" | "sem") {
    setEntregaF((prev) => (prev?.key === key && prev.side === side ? null : { key, side }));
  }

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Clientes</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Carteira e entregas do programa · {list.length} de {scoped.length} clientes
          </p>
        </div>
        <div className="flex items-center gap-2">
          {anyFilter && (
            <button
              onClick={clearFilters}
              className="text-xs text-muted-foreground hover:text-foreground border border-border rounded-lg px-3 py-2"
            >
              Limpar filtros
            </button>
          )}
          <div className="inline-flex bg-card border border-border rounded-lg p-1">
            <button
              onClick={() => setViewMode("cards")}
              className={`px-3 py-1.5 text-xs rounded-md transition-colors ${viewMode === "cards" ? "bg-primary text-primary-foreground font-semibold" : "text-muted-foreground hover:text-foreground"}`}
            >
              ⊞ Cards
            </button>
            <button
              onClick={() => setViewMode("lista")}
              className={`px-3 py-1.5 text-xs rounded-md transition-colors ${viewMode === "lista" ? "bg-primary text-primary-foreground font-semibold" : "text-muted-foreground hover:text-foreground"}`}
            >
              ≡ Lista
            </button>
          </div>
        </div>
      </header>

      {/* Bloco 1 — indicadores excluem clientes pausados */}
      <SaudeCarteira
        clientes={carteiraAtiva(scoped)}
        clientesTodos={scoped}
        tempActive={tempF}
        // A régua só conhece os marcos do ciclo; "sem_data" vive fora dela.
        cicloActive={cicloF === "sem_data" ? "all" : cicloF}
        situacaoActive={situacaoF}
        onTempClick={toggleTemp}
        onCicloClick={toggleCiclo}
        onSituacaoClick={toggleSituacao}
      />

      {/* Bloco 2 */}
      <EntregasPrograma clientes={carteiraAtiva(scoped)} active={entregaF} onToggle={toggleEntrega} />

      {/* Bloco 3 - filtros + lista */}
      <div className="bg-card border border-border rounded-lg p-4 flex flex-wrap gap-3 items-center">
        <div className="relative flex-1 min-w-[220px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Buscar por ID, nome ou empresa..."
            className="w-full bg-background border border-border rounded-lg pl-10 pr-3 py-2 text-sm focus:outline-none focus:border-primary"
          />
        </div>
        <Pills
          value={tempF}
          onChange={setTempF}
          options={[
            ["all", "Todas"],
            ["Quente", "🔥 Quente"],
            ["Morno", "🌤 Morno"],
            ["Frio", "❄️ Frio"],
            ["Em Risco", "🚨 Em Risco"],
          ]}
        />
        <Pills
          value={statusF}
          onChange={setStatusF}
          options={[
            ["all", "Todos"],
            ["Ativo", "Ativo"],
            ["Em Risco", "Em Risco"],
            ["Cancelado", "Cancelado"],
          ]}
        />
        <select
          value={cicloF}
          onChange={(e) => setCicloF(e.target.value as CicloFiltro)}
          className="bg-background border border-border rounded-lg px-3 py-2 text-sm"
        >
          <option value="all">Todos os ciclos</option>
          <option value="inicio">Início do programa (30d)</option>
          <option value="t1">T1 (90d)</option>
          <option value="t2">T2 (180d)</option>
          <option value="t3">T3 (270d)</option>
          <option value="pre">Pré-renovação (360d)</option>
          <option value="renovacao">Renovação</option>
          <option value="nao_renovado">Ciclo não renovado</option>
          <option value="sem_data">Sem data de entrada ({semDataCount})</option>
        </select>
        {!csLocked && (
          <select
            value={csSel}
            onChange={(e) => setCsSel(e.target.value as CSName | "all")}
            className="bg-background border border-border rounded-lg px-3 py-2 text-sm"
          >
            <option value="all">Todas as CS</option>
            {csList.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        )}
      </div>

      {viewMode === "cards" ? (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
          {list.map((c) => {
            const prox = proximaAtividade(c.id, atividades);
            const atrasadas = atividades.filter(
              (a) =>
                a.cliente_id === c.id &&
                a.status !== "Concluída" &&
                new Date(a.data_prevista).getTime() < Date.now() - 86400000,
            ).length;
            return (
              <ClienteCard
                key={c.id}
                c={c}
                prox={prox}
                atrasadas={atrasadas}
                hideCS={!!csLocked}
              />
            );
          })}
          {list.length === 0 && (
            <div className="col-span-full bg-card border border-border rounded-lg p-10 text-center text-muted-foreground">
              Nenhum cliente encontrado.
            </div>
          )}
        </div>
      ) : (
        <ClientesTable
          list={list}
          idMap={idMap}
          atividades={atividades}
          hideCS={!!csLocked}
        />
      )}

      {/* A ficha do cliente é aberta de qualquer lugar via openCliente(id).
          No original o Host vivia no AppShell; sem ele, esta página o hospeda. */}
      <ClientDrawerHost />
    </div>
  );
}

function ClienteCard({
  c,
  prox,
  atrasadas,
  hideCS,
}: {
  c: ReturnType<typeof useClientes>[number];
  prox: ReturnType<typeof proximaAtividade>;
  atrasadas: number;
  hideCS: boolean;
}) {
  return (
    <button
      type="button"
      onClick={() => openCliente(c.id)}
      className="text-left bg-card border border-border rounded-lg p-4 hover:border-primary/60 transition-colors group"
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <div className="font-bold text-sm truncate">{c.empresa || c.nome}</div>
          <div className="text-xs text-muted-foreground truncate mt-0.5">{c.nome}</div>
        </div>
        <span className="text-muted-foreground group-hover:text-primary transition-colors shrink-0">
          ›
        </span>
      </div>
      <div className="flex items-center gap-1.5 mt-2.5 flex-wrap">
        {!hideCS && c.responsavel_cs && (
          <span className="text-[10px] px-2 py-0.5 rounded-full border border-border text-muted-foreground">
            {c.responsavel_cs}
          </span>
        )}
        <Badge value={c.status} />
        {c.pausado && (
          <span
            className="text-[10px] px-2 py-0.5 rounded-full bg-muted text-muted-foreground border border-border"
            title={c.pausado_motivo || "Pausado"}
          >
            ⏸ Pausado
          </span>
        )}
        {semDataDeEntrada(c) && (
          <span className="text-[10px] px-2 py-0.5 rounded-full bg-status-yellow/10 text-status-yellow border border-status-yellow/30">
            Sem data de entrada
          </span>
        )}
        {c.status !== "Cancelado" && (
          prox ? (
            <span className="text-[10px] px-2 py-0.5 rounded-full bg-status-green/10 text-status-green border border-status-green/30">
              {formatBR(prox.data_prevista)}
            </span>
          ) : (
            <span className="text-[10px] px-2 py-0.5 rounded-full bg-status-yellow/10 text-status-yellow border border-status-yellow/30">
              Sem próx. ação
            </span>
          )
        )}
        {atrasadas > 0 && (
          <span className="text-[10px] px-2 py-0.5 rounded-full bg-status-red/10 text-status-red border border-status-red/30">
            {atrasadas} atrasada{atrasadas > 1 ? "s" : ""}
          </span>
        )}
      </div>
    </button>
  );
}

function ClientesTable({
  list,
  idMap,
  atividades,
  hideCS,
}: {
  list: ReturnType<typeof useClientes>;
  idMap: Map<string, string>;
  atividades: ReturnType<typeof useAtividades>;
  hideCS: boolean;
}) {
  if (list.length === 0) {
    return (
      <div className="bg-card border border-border rounded-lg p-10 text-center text-muted-foreground">
        Nenhum cliente encontrado.
      </div>
    );
  }
  return (
    <div className="bg-card border border-border rounded-lg overflow-x-auto">
      <table className="w-full text-sm">
        <thead className="bg-background/60 text-[11px] uppercase tracking-wider text-muted-foreground">
          <tr className="text-left">
            <th className="px-3 py-2 font-semibold">#</th>
            <th className="px-3 py-2 font-semibold">Cliente</th>
            <th className="px-3 py-2 font-semibold">Empresa</th>
            {!hideCS && <th className="px-3 py-2 font-semibold">CS</th>}
            <th className="px-3 py-2 font-semibold">Temp</th>
            <th className="px-3 py-2 font-semibold">Ciclo</th>
            <th className="px-3 py-2 font-semibold text-center">B.CRM</th>
            <th className="px-3 py-2 font-semibold text-center">Guard.</th>
            <th className="px-3 py-2 font-semibold">Últ. contato</th>
            <th className="px-3 py-2 font-semibold">Próx. ação</th>
            <th className="px-3 py-2 font-semibold">Status</th>
          </tr>
        </thead>
        <tbody>
          {list.map((c, i) => {
            const dias = diasSemContato(c.id, atividades);
            const prox = proximaAtividade(c.id, atividades);
            // diaPrograma devolve -1 quando não há data de entrada; o cálculo
            // manual do original virava NaN e imprimia "NaNd".
            const diaProg = diaPrograma(c);
            const cicloShort = cicloDoCliente(c)
              .replace("Cliente Novo · 30 dias", "Início")
              .replace("Ciclo 90 dias", "T1")
              .replace("Ciclo 180 dias", "T2")
              .replace("Ciclo 270 dias", "T3")
              .replace("Pré-Renovação", "Pré-renovação")
              .replace("Pós-Programa", "Pré-renovação")
              .replace("Sem data de entrada", "Sem data");
            const zebra = i % 2 === 0 ? "bg-[#1A1A1A]" : "bg-[#161616]";
            const contatoColor =
              dias === null
                ? "text-muted-foreground"
                : dias <= 7
                  ? "text-status-green"
                  : dias <= 13
                    ? "text-status-yellow"
                    : "text-status-red";
            return (
              <tr
                key={c.id}
                onClick={() => openCliente(c.id)}
                className={`${zebra} cursor-pointer hover:bg-primary/5 border-b border-border/40 last:border-b-0`}
              >
                <td className="px-3 py-2 font-mono text-[11px] tabular-nums text-primary">
                  {idMap.get(c.id)}
                </td>
                <td className="px-3 py-2 font-semibold">{c.nome}</td>
                <td className="px-3 py-2 text-muted-foreground">{c.empresa || "—"}</td>
                {!hideCS && (
                  <td className="px-3 py-2 text-muted-foreground">{c.responsavel_cs || "—"}</td>
                )}
                <td className="px-3 py-2">
                  <Badge value={c.temperatura} />
                </td>
                <td className="px-3 py-2">
                  <span className="text-[11px] px-2 py-0.5 rounded-full border border-border text-muted-foreground">
                    {cicloShort}
                    {diaProg >= 0 ? ` · ${diaProg}d` : ""}
                  </span>
                </td>
                <td className="px-3 py-2 text-center">
                  {c.black_crm ? (
                    <span className="text-status-green">✅</span>
                  ) : (
                    <span className="text-status-red">❌</span>
                  )}
                </td>
                <td className="px-3 py-2 text-center">
                  {c.guardiao_ia ? (
                    <span className="text-status-green">✅</span>
                  ) : (
                    <span className="text-status-red">❌</span>
                  )}
                </td>
                <td className="px-3 py-2">
                  <span className={`text-xs ${contatoColor}`}>
                    {dias === null ? "—" : dias === 0 ? "hoje" : `${dias}d`}
                  </span>
                </td>
                <td className="px-3 py-2 text-xs">
                  {prox ? (
                    <span className="truncate inline-block max-w-[160px]">
                      {formatBR(prox.data_prevista)} · {prox.tipo}
                    </span>
                  ) : (
                    <span className="text-status-yellow inline-flex items-center gap-1">
                      <Clock className="h-3 w-3" /> sem
                    </span>
                  )}
                </td>
                <td className="px-3 py-2">
                  <Badge value={c.status} />
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function Pills<T extends string>({
  value,
  onChange,
  options,
}: {
  value: T | "all";
  onChange: (v: T | "all") => void;
  options: [T | "all", string][];
}) {
  return (
    <div className="inline-flex bg-background border border-border rounded-lg p-1 flex-wrap">
      {options.map(([k, label]) => (
        <button
          key={k}
          onClick={() => onChange(k)}
          className={`px-3 py-1.5 text-xs rounded-md transition-colors ${
            value === k
              ? "bg-primary text-primary-foreground font-semibold"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          {label}
        </button>
      ))}
    </div>
  );
}
