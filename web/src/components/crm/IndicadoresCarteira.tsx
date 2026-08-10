import { useMemo, useState } from "react";
import {
  buildDisplayIdMap,
  cicloDoCliente,
  openCliente,
  proxRenovacao,
  proximaAtividade,
  temReuniaoConsultor,
  temReuniaoGaldino,
  useAtividades,
} from "@/lib/crm/storage";
import type { Atividade, Cliente, CSName, Temperatura } from "@/lib/crm/types";
import { useCsList } from "@/lib/crm/equipe";
import type { CicloLabel } from "@/lib/crm/storage";
import { CICLOS } from "@/lib/crm/storage";
import { formatBR } from "@/lib/crm/format";
import { NovaAtividadeModal } from "@/components/crm/NovaAtividadeModal";
import { Plus } from "lucide-react";

type FilterKey =
  | "all"
  | "quente" | "morno" | "frio" | "sem_proxima_acao"
  | "com_bcrm" | "sem_bcrm"
  | "com_guardiao" | "sem_guardiao"
  | "membros_ativo" | "membros_pendente"
  | "consultor_sim" | "consultor_nao"
  | "galdino_sim" | "galdino_nao"
  | "ciclo_novo" | "ciclo_90" | "ciclo_180" | "ciclo_270" | "ciclo_pre_renov" | "ciclo_pos"
  | "ciclo_sem_data"
  | "prox_renov" | "fora_renov"
  | "case_op" | "case_nao"
  | "vitoria_sim" | "vitoria_nao";

const TEMP_LBL: Record<Temperatura, string> = {
  Quente: "🔥 Quente",
  Morno: "🌤 Morno",
  Frio: "❄️ Frio",
  "Em Risco": "🚨 Em Risco",
  "Não definido": "Sem definição",
};

function flagBadge(on: boolean | undefined, onLabel = "Sim", offLabel = "Não") {
  return (
    <span
      className={`inline-block px-2 py-0.5 rounded-full text-[11px] font-semibold border ${
        on
          ? "bg-status-green/15 text-status-green border-status-green/40"
          : "bg-status-red/15 text-status-red border-status-red/40"
      }`}
    >
      {on ? onLabel : offLabel}
    </span>
  );
}

export function IndicadoresCarteira({
  clientes,
  showCSFilter,
  hideCSColumn,
  hideTable,
}: {
  clientes: Cliente[];
  showCSFilter: boolean;
  hideCSColumn: boolean;
  hideTable?: boolean;
}) {
  const atividades = useAtividades();
  // Lista reativa: o time chega do banco depois do 1º render.
  const csList = useCsList();
  const [csF, setCsF] = useState<CSName | "all">("all");
  const [tempF, setTempF] = useState<Temperatura | "all">("all");
  const [bcrm, setBcrm] = useState<"all" | "sim" | "nao">("all");
  const [guardiao, setGuardiao] = useState<"all" | "sim" | "nao">("all");
  const [membros, setMembros] = useState<"all" | "ativo" | "pendente">("all");
  const [consultor, setConsultor] = useState<"all" | "sim" | "nao">("all");
  const [galdino, setGaldino] = useState<"all" | "sim" | "nao">("all");
  const [cicloF, setCicloF] = useState<CicloLabel | "all">("all");
  const [renov, setRenov] = useState<"all" | "prox" | "fora">("all");
  const [caseF, setCaseF] = useState<"all" | "op" | "sem">("all");
  const [activeCard, setActiveCard] = useState<FilterKey>("all");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [bulkOpen, setBulkOpen] = useState(false);

  const idMap = useMemo(() => buildDisplayIdMap(clientes), [clientes]);

  const scope = useMemo(() => {
    return clientes.filter((c) => {
      if (showCSFilter && csF !== "all" && c.responsavel_cs !== csF) return false;
      if (tempF !== "all" && c.temperatura !== tempF) return false;
      if (bcrm !== "all" && !!c.black_crm !== (bcrm === "sim")) return false;
      if (guardiao !== "all" && !!c.guardiao_ia !== (guardiao === "sim")) return false;
      if (membros !== "all" && ((c.area_membros === "ativo") !== (membros === "ativo"))) return false;
      if (consultor !== "all" && temReuniaoConsultor(c) !== (consultor === "sim")) return false;
      if (galdino !== "all" && temReuniaoGaldino(c) !== (galdino === "sim")) return false;
      if (cicloF !== "all" && cicloDoCliente(c) !== cicloF) return false;
      if (renov === "prox" && !proxRenovacao(c)) return false;
      if (renov === "fora" && proxRenovacao(c)) return false;
      if (caseF === "op" && !c.oportunidade_case) return false;
      if (caseF === "sem" && c.oportunidade_case) return false;
      return true;
    });
  }, [clientes, showCSFilter, csF, tempF, bcrm, guardiao, membros, consultor, galdino, cicloF, renov, caseF]);

  const filtered = useMemo(
    () => scope.filter((c) => matchCard(c, activeCard, atividades)),
    [scope, activeCard, atividades],
  );

  const cnt = useMemo(() => {
    const get = (k: FilterKey) => scope.filter((c) => matchCard(c, k, atividades)).length;
    return {
      total: scope.length,
      quente: get("quente"),
      morno: get("morno"),
      frio: get("frio"),
      sem_proxima_acao: get("sem_proxima_acao"),
      com_bcrm: get("com_bcrm"),
      sem_bcrm: get("sem_bcrm"),
      com_guardiao: get("com_guardiao"),
      sem_guardiao: get("sem_guardiao"),
      membros_ativo: get("membros_ativo"),
      membros_pendente: get("membros_pendente"),
      consultor_sim: get("consultor_sim"),
      consultor_nao: get("consultor_nao"),
      galdino_sim: get("galdino_sim"),
      galdino_nao: get("galdino_nao"),
      ciclo_novo: get("ciclo_novo"),
      ciclo_90: get("ciclo_90"),
      ciclo_180: get("ciclo_180"),
      ciclo_270: get("ciclo_270"),
      ciclo_pre_renov: get("ciclo_pre_renov"),
      ciclo_pos: get("ciclo_pos"),
      ciclo_sem_data: get("ciclo_sem_data"),
      prox_renov: get("prox_renov"),
      fora_renov: get("fora_renov"),
      case_op: get("case_op"),
      case_nao: get("case_nao"),
      vitoria_sim: get("vitoria_sim"),
      vitoria_nao: get("vitoria_nao"),
    };
  }, [scope, atividades]);

  return (
    <section className="space-y-5">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h2 className="text-xs font-bold uppercase tracking-[0.15em] text-muted-foreground">
          Indicadores da Carteira
        </h2>
        <div className="text-xs text-muted-foreground">
          {scope.length} clientes no escopo
        </div>
      </div>

      {/* Filtros enxutos */}
      <div className="bg-card border border-border rounded-lg p-3 flex flex-wrap gap-2 items-center">
        {showCSFilter && (
          <Select label="CS" value={csF} onChange={(v) => setCsF(v as CSName | "all")} options={[["all", "Todas"], ...csList.map((c) => [c, c] as [string, string])]} />
        )}
        <Select label="Temperatura" value={tempF} onChange={(v) => setTempF(v as Temperatura | "all")} options={[["all", "Todas"], ["Quente", "Quente"], ["Morno", "Morno"], ["Frio", "Frio"]]} />
        <Select label="Black CRM" value={bcrm} onChange={(v) => setBcrm(v as typeof bcrm)} options={[["all", "Todos"], ["sim", "Com"], ["nao", "Sem"]]} />
        <Select label="Guardião" value={guardiao} onChange={(v) => setGuardiao(v as typeof guardiao)} options={[["all", "Todos"], ["sim", "Com"], ["nao", "Sem"]]} />
        <Select label="Membros" value={membros} onChange={(v) => setMembros(v as typeof membros)} options={[["all", "Todos"], ["ativo", "Ativo"], ["pendente", "Pendente"]]} />
        <Select label="Consultor" value={consultor} onChange={(v) => setConsultor(v as typeof consultor)} options={[["all", "Todos"], ["sim", "Com"], ["nao", "Sem"]]} />
        <Select label="Galdino" value={galdino} onChange={(v) => setGaldino(v as typeof galdino)} options={[["all", "Todos"], ["sim", "Com"], ["nao", "Sem"]]} />
        <Select label="Ciclo" value={cicloF} onChange={(v) => setCicloF(v as CicloLabel | "all")} options={[["all", "Todos"], ...CICLOS.map((c) => [c, c] as [string, string])]} />
        <Select label="Renovação" value={renov} onChange={(v) => setRenov(v as typeof renov)} options={[["all", "Todos"], ["prox", "Próximos"], ["fora", "Fora da janela"]]} />
        <Select label="Case" value={caseF} onChange={(v) => setCaseF(v as typeof caseF)} options={[["all", "Todos"], ["op", "Oportunidade"], ["sem", "Sem"]]} />
        {activeCard !== "all" && (
          <button
            onClick={() => setActiveCard("all")}
            className="ml-auto text-xs px-3 py-1.5 rounded-md border border-border hover:border-primary"
          >
            Limpar card
          </button>
        )}
      </div>

      {/* Bloco 1 — Resumo da carteira */}
      <CardGroup title="Resumo da carteira">
        <Card label="Total" value={cnt.total} k="all" active={activeCard} onClick={setActiveCard} />
        <Card label="Quentes" value={cnt.quente} k="quente" tone="green" active={activeCard} onClick={setActiveCard} />
        <Card label="Mornos" value={cnt.morno} k="morno" tone="yellow" active={activeCard} onClick={setActiveCard} />
        <Card label="Frios" value={cnt.frio} k="frio" tone="blue" active={activeCard} onClick={setActiveCard} />
        <Card label="Sem próxima ação" value={cnt.sem_proxima_acao} k="sem_proxima_acao" tone="yellow" active={activeCard} onClick={setActiveCard} />
      </CardGroup>

      {/* Bloco 2 — Entregas do programa */}
      <CardGroup title="Entregas do programa">
        <Card label="Com Black CRM" value={cnt.com_bcrm} k="com_bcrm" tone="green" active={activeCard} onClick={setActiveCard} />
        <Card label="Sem Black CRM" value={cnt.sem_bcrm} k="sem_bcrm" tone="red" active={activeCard} onClick={setActiveCard} />
        <Card label="Com Guardião" value={cnt.com_guardiao} k="com_guardiao" tone="green" active={activeCard} onClick={setActiveCard} />
        <Card label="Sem Guardião" value={cnt.sem_guardiao} k="sem_guardiao" tone="red" active={activeCard} onClick={setActiveCard} />
        <Card label="Membros ativos" value={cnt.membros_ativo} k="membros_ativo" tone="green" active={activeCard} onClick={setActiveCard} />
        <Card label="Membros pendente" value={cnt.membros_pendente} k="membros_pendente" tone="red" active={activeCard} onClick={setActiveCard} />
        <Card label="Com reun. consultor" value={cnt.consultor_sim} k="consultor_sim" tone="green" active={activeCard} onClick={setActiveCard} />
        <Card label="Sem reun. consultor" value={cnt.consultor_nao} k="consultor_nao" tone="red" active={activeCard} onClick={setActiveCard} />
        <Card label="Com reun. Galdino" value={cnt.galdino_sim} k="galdino_sim" tone="green" active={activeCard} onClick={setActiveCard} />
        <Card label="Sem reun. Galdino" value={cnt.galdino_nao} k="galdino_nao" tone="red" active={activeCard} onClick={setActiveCard} />
      </CardGroup>

      {/* Bloco 3 — Ciclos */}
      <CardGroup title="Ciclos">
        <Card label="Novo · 30 dias" value={cnt.ciclo_novo} k="ciclo_novo" tone="blue" active={activeCard} onClick={setActiveCard} />
        <Card label="Ciclo 90 dias" value={cnt.ciclo_90} k="ciclo_90" active={activeCard} onClick={setActiveCard} />
        <Card label="Ciclo 180 dias" value={cnt.ciclo_180} k="ciclo_180" active={activeCard} onClick={setActiveCard} />
        <Card label="Ciclo 270 dias" value={cnt.ciclo_270} k="ciclo_270" active={activeCard} onClick={setActiveCard} />
        <Card label="Pré-renovação" value={cnt.ciclo_pre_renov} k="ciclo_pre_renov" tone="yellow" active={activeCard} onClick={setActiveCard} />
        <Card label="Pós-programa" value={cnt.ciclo_pos} k="ciclo_pos" tone="muted" active={activeCard} onClick={setActiveCard} />
        {/* Card que não existia no original: sem ele, os clientes sem data de
            entrada sumiriam da soma dos ciclos sem explicação (são ~103 em
            produção). É pendência de cadastro, por isso vem por último. */}
        <Card label="Sem data de entrada" value={cnt.ciclo_sem_data} k="ciclo_sem_data" tone="muted" active={activeCard} onClick={setActiveCard} />
      </CardGroup>

      {/* Bloco 4 — Renovação e Case */}
      <CardGroup title="Renovação e case">
        <Card label="Próximos renovação" value={cnt.prox_renov} k="prox_renov" tone="yellow" active={activeCard} onClick={setActiveCard} />
        <Card label="Fora da janela" value={cnt.fora_renov} k="fora_renov" tone="muted" active={activeCard} onClick={setActiveCard} />
        <Card label="Oportunidade de case" value={cnt.case_op} k="case_op" tone="green" active={activeCard} onClick={setActiveCard} />
        <Card label="Sem case identificado" value={cnt.case_nao} k="case_nao" tone="muted" active={activeCard} onClick={setActiveCard} />
        <Card label="Com vitória" value={cnt.vitoria_sim} k="vitoria_sim" tone="green" active={activeCard} onClick={setActiveCard} />
        <Card label="Sem vitória" value={cnt.vitoria_nao} k="vitoria_nao" tone="muted" active={activeCard} onClick={setActiveCard} />
      </CardGroup>

      {/* Tabela */}
      {!hideTable && (
      <div>
        <div className="flex items-center justify-between mb-2 gap-2 flex-wrap">
          <h3 className="text-xs font-bold uppercase tracking-[0.15em] text-muted-foreground">
            Clientes filtrados · {filtered.length}
          </h3>
          <div className="flex items-center gap-2">
            {selected.size > 0 && (
              <>
                <span className="text-[11px] text-primary font-semibold">
                  {selected.size} selecionado{selected.size === 1 ? "" : "s"}
                </span>
                <button
                  onClick={() => setSelected(new Set())}
                  className="text-[11px] px-2 py-1 rounded-md border border-border text-muted-foreground hover:border-primary"
                >
                  Limpar
                </button>
              </>
            )}
            <button
              onClick={() => setBulkOpen(true)}
              disabled={selected.size === 0 && filtered.length === 0}
              className="text-xs px-3 py-1.5 rounded-lg bg-primary text-primary-foreground font-semibold hover:bg-primary/90 inline-flex items-center gap-1 disabled:opacity-50"
            >
              <Plus className="h-3.5 w-3.5" /> Criar atividade para {selected.size > 0 ? "selecionados" : "filtrados"}
            </button>
          </div>
        </div>
        <div className="bg-card border border-border rounded-lg overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-background/50 text-[11px] uppercase tracking-wider text-muted-foreground">
              <tr>
                <th className="px-3 py-2.5 w-8">
                  <input
                    type="checkbox"
                    checked={filtered.length > 0 && filtered.every((c) => selected.has(c.id))}
                    onChange={(e) => {
                      const n = new Set(selected);
                      if (e.target.checked) filtered.forEach((c) => n.add(c.id));
                      else filtered.forEach((c) => n.delete(c.id));
                      setSelected(n);
                    }}
                  />
                </th>
                <th className="text-left px-3 py-2.5">Cliente</th>
                <th className="text-left px-3 py-2.5">Empresa</th>
                {!hideCSColumn && <th className="text-left px-3 py-2.5">CS</th>}
                <th className="text-left px-3 py-2.5">Temp.</th>
                <th className="text-left px-3 py-2.5">Ciclo</th>
                <th className="text-left px-3 py-2.5">B.CRM</th>

                <th className="text-left px-3 py-2.5">Guardião</th>
                <th className="text-left px-3 py-2.5">Membros</th>
                <th className="text-left px-3 py-2.5">Consultor</th>
                <th className="text-left px-3 py-2.5">Galdino</th>
                <th className="text-left px-3 py-2.5">Renov.</th>
                <th className="text-left px-3 py-2.5">Case</th>
                <th className="text-left px-3 py-2.5">Próx. ação</th>
                <th className="text-left px-3 py-2.5">Prazo</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 && (
                <tr><td colSpan={hideCSColumn ? 13 : 14} className="px-4 py-8 text-center text-muted-foreground text-xs">Nenhum cliente.</td></tr>
              )}
              {filtered.map((c) => {
                const prox = proximaAtividade(c.id, atividades);
                const isSel = selected.has(c.id);
                return (
                  <tr key={c.id} className="border-t border-border hover:bg-background/40">
                    <td className="px-3 py-2.5">
                      <input
                        type="checkbox"
                        checked={isSel}
                        onChange={(e) => {
                          const n = new Set(selected);
                          if (e.target.checked) n.add(c.id);
                          else n.delete(c.id);
                          setSelected(n);
                        }}
                        onClick={(e) => e.stopPropagation()}
                      />
                    </td>
                    <td className="px-3 py-2.5 cursor-pointer" onClick={() => openCliente(c.id)}>
                      <span className="font-mono text-primary text-xs mr-1.5">{idMap.get(c.id)}</span>
                      <span className="font-semibold">{c.nome}</span>
                    </td>
                    <td className="px-3 py-2.5 text-xs text-muted-foreground">{c.empresa || "—"}</td>
                    {!hideCSColumn && <td className="px-3 py-2.5 text-xs text-muted-foreground">{c.responsavel_cs}</td>}
                    <td className="px-3 py-2.5 text-xs">{TEMP_LBL[c.temperatura]}</td>
                    <td className="px-3 py-2.5 text-xs text-muted-foreground">{cicloDoCliente(c)}</td>
                    <td className="px-3 py-2.5">{flagBadge(c.black_crm)}</td>
                    <td className="px-3 py-2.5">{flagBadge(c.guardiao_ia)}</td>
                    <td className="px-3 py-2.5">{flagBadge(c.area_membros === "ativo", "Ativo", "Pend.")}</td>
                    <td className="px-3 py-2.5">{flagBadge(temReuniaoConsultor(c))}</td>
                    <td className="px-3 py-2.5">{flagBadge(temReuniaoGaldino(c))}</td>
                    <td className="px-3 py-2.5 text-xs">{proxRenovacao(c) ? <span className="text-status-yellow font-semibold">Próx.</span> : <span className="text-muted-foreground">—</span>}</td>
                    <td className="px-3 py-2.5">{flagBadge(!!c.oportunidade_case)}</td>
                    <td className="px-3 py-2.5 text-xs text-muted-foreground">{prox ? (prox.acao || prox.titulo) : <span className="text-status-yellow">Sem ação</span>}</td>
                    <td className="px-3 py-2.5 text-xs text-muted-foreground">{prox ? formatBR(prox.data_prevista) : "—"}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
      )}

      {bulkOpen && (
        <NovaAtividadeModal
          defaultClienteIds={
            selected.size > 0 ? Array.from(selected) : filtered.map((c) => c.id)
          }
          origem="manual_lote"
          origemLabel="Manual em lote — Indicadores da Carteira"
          onClose={() => {
            setBulkOpen(false);
            setSelected(new Set());
          }}
        />
      )}
    </section>
  );
}

function matchCard(c: Cliente, k: FilterKey, atividades: Atividade[]): boolean {
  switch (k) {
    case "all": return true;
    case "quente": return c.temperatura === "Quente";
    case "morno": return c.temperatura === "Morno";
    case "frio": return c.temperatura === "Frio";
    case "sem_proxima_acao": return !proximaAtividade(c.id, atividades);
    case "com_bcrm": return !!c.black_crm;
    case "sem_bcrm": return !c.black_crm;
    case "com_guardiao": return !!c.guardiao_ia;
    case "sem_guardiao": return !c.guardiao_ia;
    case "membros_ativo": return c.area_membros === "ativo";
    case "membros_pendente": return c.area_membros !== "ativo";
    case "consultor_sim": return temReuniaoConsultor(c);
    case "consultor_nao": return !temReuniaoConsultor(c);
    case "galdino_sim": return temReuniaoGaldino(c);
    case "galdino_nao": return !temReuniaoGaldino(c);
    case "ciclo_novo": return cicloDoCliente(c) === "Cliente Novo · 30 dias";
    case "ciclo_90": return cicloDoCliente(c) === "Ciclo 90 dias";
    case "ciclo_180": return cicloDoCliente(c) === "Ciclo 180 dias";
    case "ciclo_270": return cicloDoCliente(c) === "Ciclo 270 dias";
    case "ciclo_pre_renov": return cicloDoCliente(c) === "Pré-Renovação";
    case "ciclo_pos": return cicloDoCliente(c) === "Pós-Programa" || cicloDoCliente(c) === "Ano 2";
    case "ciclo_sem_data": return cicloDoCliente(c) === "Sem data de entrada";
    case "prox_renov": return proxRenovacao(c);
    case "fora_renov": return !proxRenovacao(c);
    case "case_op": return !!c.oportunidade_case;
    case "case_nao": return !c.oportunidade_case;
    case "vitoria_sim": return !!c.vitoria_registrada;
    case "vitoria_nao": return !c.vitoria_registrada;
  }
}

function CardGroup({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <div className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground mb-2">{title}</div>
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-2">
        {children}
      </div>
    </div>
  );
}

function Card({
  label, value, k, tone, active, onClick,
}: {
  label: string; value: number; k: FilterKey;
  tone?: "green" | "yellow" | "red" | "blue" | "muted";
  active: FilterKey; onClick: (k: FilterKey) => void;
}) {
  const color =
    tone === "green" ? "text-status-green"
    : tone === "yellow" ? "text-status-yellow"
    : tone === "red" ? "text-status-red"
    : tone === "blue" ? "text-[#60A5FA]"
    : tone === "muted" ? "text-muted-foreground"
    : "text-primary";
  const isActive = active === k;
  return (
    <button
      onClick={() => onClick(isActive ? "all" : k)}
      className={`text-left bg-card border rounded-lg p-3 transition-colors hover:border-primary ${
        isActive ? "border-primary ring-1 ring-primary" : "border-border"
      }`}
    >
      <div className={`text-2xl font-black ${color}`}>{value}</div>
      <div className="text-[10px] uppercase tracking-wider text-muted-foreground mt-1 leading-tight">{label}</div>
    </button>
  );
}

function Select({
  label, value, onChange, options,
}: {
  label: string; value: string; onChange: (v: string) => void; options: [string, string][];
}) {
  return (
    <label className="text-[11px] text-muted-foreground inline-flex items-center gap-1.5">
      <span className="uppercase tracking-wider">{label}</span>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="bg-background border border-border rounded-md px-2 py-1 text-xs text-foreground"
      >
        {options.map(([v, l]) => (
          <option key={v} value={v}>{l}</option>
        ))}
      </select>
    </label>
  );
}
