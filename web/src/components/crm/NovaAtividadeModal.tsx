import { useEffect, useMemo, useState } from "react";
import { X, Search, CheckSquare, Eraser, Filter } from "lucide-react";
import { toast } from "sonner";
import {
  buildDisplayIdMap,
  cicloDoCliente,
  createAtividade,
  createAtividadesLote,
  diaPrograma,
  ENTREGAS_PENDENTES_LIST,
  entregasPendentes,
  isCS,
  proxAcaoHoje,
  proxAcaoSemana,
  proxAcaoVencida,
  proximaEntregaPendente,
  semContatoHaMais,
  statusCiclo,
  STATUS_CICLO_LABEL,
  useAtividades,
  useClientes,
  useProfile,
  CICLOS,
  type CicloLabel,
  type StatusCiclo,
  type EntregaPendente,
} from "@/lib/crm/storage";
import { fromInputDate } from "@/lib/crm/format";
import { useCsList } from "@/lib/crm/equipe";
import {
  ACOES,
  CONSULTORES,
  ENTREGAS,
  ORIGEM_LABELS,
  type Atividade,
  type AtividadeOrigem,
  type AtividadeStatus,
  type AtividadeTipo,
  type CSName,
  type ImplementacaoStatus,
  type Prioridade,
  type Temperatura,
} from "@/lib/crm/types";

const PRIORIDADES: { value: Prioridade; emoji: string; label: string }[] = [
  { value: "Urgente", emoji: "🔴", label: "Urgente" },
  { value: "Médio", emoji: "🟡", label: "Médio" },
  { value: "Normal", emoji: "🟢", label: "Normal" },
];

function tipoFromAcao(acao: string): AtividadeTipo {
  if (acao === "Agendar reunião" || acao === "Confirmar reunião") return "Reunião";
  if (acao === "Fazer follow-up no WhatsApp" || acao === "Aguardar resposta")
    return "Follow-up";
  if (acao === "Cobrar material" || acao === "Engajar cliente") return "Contato";
  return "Outro";
}

export type JanelaTempo =
  | "all"
  | "cp_7"
  | "cp_15"
  | "cp_30"
  | "sem_contato_14"
  | "acao_vencida"
  | "acao_hoje"
  | "acao_semana";

export type PresetFilters = {
  ciclo?: CicloLabel | "all";
  statusCiclo?: StatusCiclo | "all";
  temperatura?: Temperatura | "all";
  entregaPendente?: EntregaPendente | "all";
  implementacao?: ImplementacaoStatus | "all";
  blackCRM?: "all" | "sim" | "nao";
  guardiao?: "all" | "sim" | "nao";
  janela?: JanelaTempo;
  cs?: CSName | "all";
};

export function NovaAtividadeModal({
  defaultDate,
  defaultClienteId,
  defaultClienteIds,
  defaultAcao,
  defaultEntrega,
  defaultTitulo,
  defaultTipo,
  defaultDescricao,
  defaultPrioridade,
  defaultStatus,
  presetFilters,
  origem,
  origemLabel,
  projetoId,
  onClose,
}: {
  defaultDate?: string;
  defaultClienteId?: string;
  defaultClienteIds?: string[];
  defaultAcao?: string;
  defaultEntrega?: string;
  defaultTitulo?: string;
  defaultTipo?: AtividadeTipo;
  defaultDescricao?: string;
  defaultPrioridade?: Prioridade;
  /** Atividade nasce "Pendente"; outro status é caso especial do chamador. */
  defaultStatus?: AtividadeStatus;
  presetFilters?: PresetFilters;
  origem?: AtividadeOrigem;
  origemLabel?: string;
  projetoId?: string;
  onClose: () => void;
}) {
  const clientes = useClientes();
  const atividades = useAtividades();
  const [profile] = useProfile();
  // Lista reativa: o time chega do banco depois do 1º render.
  const csList = useCsList();
  const lockedCS = isCS(profile) ? (profile as CSName) : null;
  const idMap = useMemo(() => buildDisplayIdMap(clientes), [clientes]);

  const baseVisiveis = useMemo(
    () =>
      (lockedCS ? clientes.filter((c) => c.responsavel_cs === lockedCS) : clientes).filter(
        (c) => c.status !== "Cancelado",
      ),
    [clientes, lockedCS],
  );

  const today = new Date().toISOString().slice(0, 10);
  const initialIds = defaultClienteIds && defaultClienteIds.length > 0
    ? defaultClienteIds
    : defaultClienteId
      ? [defaultClienteId]
      : [];
  const [selecionados, setSelecionados] = useState<Set<string>>(() => new Set(initialIds));
  const [tipoTarefa, setTipoTarefa] = useState<"cliente" | "geral">("cliente");
  const [tituloGeral, setTituloGeral] = useState<string>(defaultTitulo || "");
  const [entrega, setEntrega] = useState<string>(defaultEntrega || "");
  const [entregaOutro, setEntregaOutro] = useState("");
  const [consultor, setConsultor] = useState<string>("");
  const [acao, setAcao] = useState<string>(defaultAcao || "");
  const [acaoOutro, setAcaoOutro] = useState("");
  const [prioridade, setPrioridade] = useState<Prioridade>(defaultPrioridade || "Normal");
  const [data, setData] = useState(defaultDate || today);
  const [hora, setHora] = useState("");
  const [descricao, setDescricao] = useState(defaultDescricao || "");
  const [motivoImpedimento, setMotivoImpedimento] = useState("");
  const [query, setQuery] = useState("");
  const [showFilters, setShowFilters] = useState(!!presetFilters);
  const [salvando, setSalvando] = useState(false);
  const cliPre = clientes.find((c) => c.id === defaultClienteId);
  // O original caía num nome fixo ("Danielly"). Aqui o time vem do banco e
  // chega vazio no 1º render, então começa vazio e é semeado pelo efeito abaixo.
  const [cs, setCs] = useState<CSName>(lockedCS || cliPre?.responsavel_cs || "");

  useEffect(() => {
    if (cs) return;
    const inicial =
      lockedCS || cliPre?.responsavel_cs || baseVisiveis[0]?.responsavel_cs || csList[0] || "";
    if (inicial) setCs(inicial);
    // csList na dependência: o efeito precisa rodar de novo quando o time chega.
  }, [cs, lockedCS, cliPre, baseVisiveis, csList]);

  const status: AtividadeStatus = defaultStatus || "Pendente";
  // O banco tem um CHECK que rejeita status 'impedido' sem motivo. Exigimos aqui
  // para a CS ver a regra em vez de levar um erro cru do PostgREST.
  const exigeMotivo = status === "Impedida";
  const motivoValid = !exigeMotivo || motivoImpedimento.trim().length > 0;

  // ----- Filters state (pre-populated from presetFilters) -----
  const [fCiclo, setFCiclo] = useState<CicloLabel | "all">(presetFilters?.ciclo || "all");
  const [fStatus, setFStatus] = useState<StatusCiclo | "all">(presetFilters?.statusCiclo || "all");
  const [fTemp, setFTemp] = useState<Temperatura | "all">(presetFilters?.temperatura || "all");
  const [fEntPend, setFEntPend] = useState<EntregaPendente | "all">(presetFilters?.entregaPendente || "all");
  const [fImpl, setFImpl] = useState<ImplementacaoStatus | "all">(presetFilters?.implementacao || "all");
  const [fBcrm, setFBcrm] = useState<"all" | "sim" | "nao">(presetFilters?.blackCRM || "all");
  const [fGuard, setFGuard] = useState<"all" | "sim" | "nao">(presetFilters?.guardiao || "all");
  const [fJanela, setFJanela] = useState<JanelaTempo>(presetFilters?.janela || "all");
  const [fCs, setFCs] = useState<CSName | "all">(presetFilters?.cs || "all");

  function limparFiltros() {
    setFCiclo("all");
    setFStatus("all");
    setFTemp("all");
    setFEntPend("all");
    setFImpl("all");
    setFBcrm("all");
    setFGuard("all");
    setFJanela("all");
    setFCs("all");
  }

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return baseVisiveis.filter((c) => {
      // CS filter (só para quem coordena)
      if (!lockedCS && fCs !== "all" && c.responsavel_cs !== fCs) return false;
      if (fCiclo !== "all" && cicloDoCliente(c) !== fCiclo) return false;
      if (fStatus !== "all" && statusCiclo(c, atividades) !== fStatus) return false;
      if (fTemp !== "all" && c.temperatura !== fTemp) return false;
      if (fImpl !== "all" && c.implementacao !== fImpl) return false;
      if (fBcrm !== "all" && !!c.black_crm !== (fBcrm === "sim")) return false;
      if (fGuard !== "all" && !!c.guardiao_ia !== (fGuard === "sim")) return false;
      if (fEntPend !== "all" && !entregasPendentes(c).includes(fEntPend)) return false;
      if (fJanela !== "all") {
        const d = diaPrograma(c);
        const proximoCp = [30, 90, 180, 270, 360].map((m) => m - d).find((x) => x > 0) ?? 9999;
        if (fJanela === "cp_7" && proximoCp > 7) return false;
        if (fJanela === "cp_15" && proximoCp > 15) return false;
        if (fJanela === "cp_30" && proximoCp > 30) return false;
        if (fJanela === "sem_contato_14" && !semContatoHaMais(c, atividades, 14)) return false;
        if (fJanela === "acao_vencida" && !proxAcaoVencida(c, atividades)) return false;
        if (fJanela === "acao_hoje" && !proxAcaoHoje(c, atividades)) return false;
        if (fJanela === "acao_semana" && !proxAcaoSemana(c, atividades)) return false;
      }
      if (q) {
        const id = (idMap.get(c.id) || "").toLowerCase();
        const match =
          id.includes(q) ||
          c.nome.toLowerCase().includes(q) ||
          (c.empresa || "").toLowerCase().includes(q) ||
          c.responsavel_cs.toLowerCase().includes(q) ||
          cicloDoCliente(c).toLowerCase().includes(q) ||
          c.temperatura.toLowerCase().includes(q) ||
          c.status.toLowerCase().includes(q);
        if (!match) return false;
      }
      return true;
    });
  }, [baseVisiveis, query, idMap, lockedCS, fCs, fCiclo, fStatus, fTemp, fImpl, fBcrm, fGuard, fEntPend, fJanela, atividades]);

  function toggle(id: string) {
    setSelecionados((prev) => {
      const n = new Set(prev);
      if (n.has(id)) n.delete(id);
      else n.add(id);
      return n;
    });
  }
  function selectAllFiltered() {
    setSelecionados((prev) => {
      const n = new Set(prev);
      filtered.forEach((c) => n.add(c.id));
      return n;
    });
  }
  function clearSel() {
    setSelecionados(new Set());
  }

  const count = selecionados.size;

  const tituloAuto = useMemo(() => {
    const a = acao === "Outro" ? acaoOutro.trim() : acao;
    let e = entrega === "Outro" ? entregaOutro.trim() : entrega;
    if (entrega === "Reunião com Consultor" && consultor)
      e = `Reunião com Consultor (${consultor})`;
    if (!a && !e) return defaultTitulo || "";
    return `${a || "—"} · ${e || "—"}`;
  }, [acao, acaoOutro, entrega, entregaOutro, consultor, defaultTitulo]);

  const entregaValid =
    !!entrega &&
    (entrega !== "Outro" || entregaOutro.trim().length > 0) &&
    (entrega !== "Reunião com Consultor" || !!consultor);
  const acaoValid = !!acao && (acao !== "Outro" || acaoOutro.trim().length > 0);
  const valid =
    (tipoTarefa === "geral"
      ? tituloGeral.trim().length > 0 && !!data
      : count > 0 && entregaValid && acaoValid && !!data) && motivoValid;

  async function save() {
    if (salvando) return;
    if (exigeMotivo && !motivoImpedimento.trim()) {
      toast.error("Atividade impedida exige o motivo do impedimento.");
      return;
    }
    if (!valid) return;
    setSalvando(true);
    const motivo = exigeMotivo ? motivoImpedimento.trim() : undefined;
    try {
      if (tipoTarefa === "geral") {
        // Tarefa sem cliente: o banco aceita id_cliente NULL (o mapper converte "" em null).
        await createAtividade({
          cliente_id: "",
          cs_responsavel: lockedCS || cs,
          titulo: tituloGeral.trim(),
          tipo: defaultTipo || "Outro",
          prioridade,
          descricao,
          data_prevista: fromInputDate(data),
          hora: hora || undefined,
          status,
          motivo_impedimento: motivo,
          origem: origem || "manual_individual",
          origem_label: origemLabel || "Tarefa geral",
          projeto_id: projetoId,
        });
        onClose();
        return;
      }

      const tipo: AtividadeTipo = defaultTipo || tipoFromAcao(acao);
      const finalOrigem: AtividadeOrigem =
        origem || (count > 1 ? "manual_lote" : "manual_individual");
      const finalOrigemLabel = origemLabel || ORIGEM_LABELS[finalOrigem];
      const entregaDet =
        entrega === "Outro"
          ? entregaOutro.trim()
          : entrega === "Reunião com Consultor"
            ? consultor
            : undefined;
      const acaoDet = acao === "Outro" ? acaoOutro.trim() : undefined;

      const itens: Omit<Atividade, "id">[] = Array.from(selecionados).map((cid) => {
        const cliente = clientes.find((c) => c.id === cid);
        return {
          cliente_id: cid,
          cs_responsavel: lockedCS || cliente?.responsavel_cs || cs,
          titulo: tituloAuto,
          tipo,
          prioridade,
          descricao,
          entrega,
          entrega_detalhe: entregaDet,
          acao,
          acao_detalhe: acaoDet,
          data_prevista: fromInputDate(data),
          hora: hora || undefined,
          status,
          motivo_impedimento: motivo,
          origem: finalOrigem,
          origem_label: finalOrigemLabel,
          projeto_id: projetoId,
        };
      });

      // Um único insert agrupa tudo sob o mesmo batch_id — é assim que a tela
      // de atividades reconhece "criadas juntas". Com um cliente só não há lote.
      if (itens.length > 1) await createAtividadesLote(itens);
      else if (itens.length === 1) await createAtividade(itens[0]);
      onClose();
    } catch (e) {
      toast.error(
        e instanceof Error ? e.message : "Não foi possível criar a atividade.",
      );
    } finally {
      setSalvando(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div
        className="bg-card border border-border rounded-lg p-6 w-full max-w-2xl space-y-4 max-h-[92vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-bold">Nova atividade</h3>
            {origemLabel && (
              <div className="text-[11px] text-primary font-semibold mt-0.5">
                Origem: {origemLabel}
              </div>
            )}
          </div>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground">
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Tipo de tarefa */}
        <div className="inline-flex bg-background border border-border rounded-lg p-1 w-full">
          {(["cliente", "geral"] as const).map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => setTipoTarefa(t)}
              className={`flex-1 px-3 py-1.5 text-xs font-semibold rounded-md transition-colors ${
                tipoTarefa === t
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {t === "cliente" ? "Vinculada a cliente(s)" : "Tarefa geral (sem cliente)"}
            </button>
          ))}
        </div>

        {tipoTarefa === "geral" && (
          <div>
            <label className="block text-[10px] uppercase tracking-wider text-muted-foreground mb-1 font-semibold">
              Título da tarefa *
            </label>
            <input
              value={tituloGeral}
              onChange={(e) => setTituloGeral(e.target.value)}
              placeholder="Ex.: Revisar rotinas da semana, preparar reunião interna…"
              className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-primary"
            />
          </div>
        )}

        {tipoTarefa === "cliente" && (<>
        {/* 1. Cliente(s) */}
        <div>
          <div className="flex items-center justify-between mb-1">
            <label className="block text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">
              Cliente(s) *
            </label>
            <span className="text-[11px] font-bold text-primary">
              {count} cliente{count === 1 ? "" : "s"} selecionado{count === 1 ? "" : "s"}
            </span>
          </div>

          <div className="flex items-center gap-2 mb-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Buscar por ID, nome, empresa, CS, ciclo, status…"
                className="w-full bg-background border border-border rounded-lg pl-8 pr-3 py-1.5 text-xs focus:outline-none focus:border-primary"
              />
            </div>
            <button
              type="button"
              onClick={() => setShowFilters((v) => !v)}
              className={`inline-flex items-center gap-1 text-[11px] px-2 py-1.5 rounded-md border ${
                showFilters ? "border-primary text-primary" : "border-border text-muted-foreground"
              }`}
            >
              <Filter className="h-3 w-3" /> Filtros
            </button>
          </div>

          {showFilters && (
            <div className="rounded-lg p-2 mb-2 flex flex-wrap gap-1.5 bg-background border border-border">
              {!lockedCS && (
                <MiniSelect label="CS" value={fCs} onChange={(v) => setFCs(v as CSName | "all")}
                  options={[["all", "Todas"], ...csList.map((c) => [c, c] as [string, string])]} />
              )}
              <MiniSelect label="Ciclo" value={fCiclo} onChange={(v) => setFCiclo(v as CicloLabel | "all")}
                options={[["all", "Todos"], ...CICLOS.map((c) => [c, c] as [string, string])]} />
              <MiniSelect label="Status ciclo" value={fStatus} onChange={(v) => setFStatus(v as StatusCiclo | "all")}
                options={[["all", "Todos"], ["em_dia", "Em dia"], ["atencao", "Atenção"], ["atrasado", "Atrasado"], ["critico", "Crítico"], ["sem_info", "Sem info"]]} />
              <MiniSelect label="Temperatura" value={fTemp} onChange={(v) => setFTemp(v as Temperatura | "all")}
                options={[["all", "Todas"], ["Quente", "Quente"], ["Morno", "Morno"], ["Frio", "Frio"], ["Em Risco", "Em Risco"], ["Não definido", "Sem def."]]} />
              <MiniSelect label="Entrega pendente" value={fEntPend} onChange={(v) => setFEntPend(v as EntregaPendente | "all")}
                options={[["all", "Todas"], ...ENTREGAS_PENDENTES_LIST.map((e) => [e, e] as [string, string])]} />
              <MiniSelect label="Implementação" value={fImpl} onChange={(v) => setFImpl(v as ImplementacaoStatus | "all")}
                options={[["all", "Todas"], ["nao_iniciada", "Não iniciada"], ["em_andamento", "Em andamento"], ["travada", "Travada"], ["concluida", "Concluída"]]} />
              <MiniSelect label="Black CRM" value={fBcrm} onChange={(v) => setFBcrm(v as "all" | "sim" | "nao")}
                options={[["all", "Todos"], ["sim", "Com"], ["nao", "Sem"]]} />
              <MiniSelect label="Guardião" value={fGuard} onChange={(v) => setFGuard(v as "all" | "sim" | "nao")}
                options={[["all", "Todos"], ["sim", "Com"], ["nao", "Sem"]]} />
              <MiniSelect label="Janela" value={fJanela} onChange={(v) => setFJanela(v as JanelaTempo)}
                options={[
                  ["all", "Todas"],
                  ["cp_7", "Checkpoint ≤ 7d"],
                  ["cp_15", "Checkpoint ≤ 15d"],
                  ["cp_30", "Checkpoint ≤ 30d"],
                  ["sem_contato_14", "Sem contato > 14d"],
                  ["acao_vencida", "Ação vencida"],
                  ["acao_hoje", "Ação hoje"],
                  ["acao_semana", "Ação esta semana"],
                ]} />
              <button
                type="button"
                onClick={limparFiltros}
                className="ml-auto text-[10px] px-2 py-1 rounded-md border border-border text-muted-foreground hover:border-primary"
              >
                Limpar filtros
              </button>
            </div>
          )}

          <div className="flex items-center gap-2 mb-2">
            <button
              type="button"
              onClick={selectAllFiltered}
              className="inline-flex items-center gap-1 text-[11px] px-2 py-1 rounded-md border border-border hover:border-primary"
            >
              <CheckSquare className="h-3 w-3" /> Selecionar todos filtrados ({filtered.length})
            </button>
            <button
              type="button"
              onClick={clearSel}
              className="inline-flex items-center gap-1 text-[11px] px-2 py-1 rounded-md border border-border hover:border-primary text-muted-foreground"
            >
              <Eraser className="h-3 w-3" /> Remover todos
            </button>
          </div>
          <div className="rounded-lg p-2 max-h-64 overflow-y-auto space-y-1.5 bg-background border border-border">
            {filtered.length === 0 && (
              <div className="text-xs text-muted-foreground px-2 py-3 w-full text-center">
                Nenhum cliente corresponde aos filtros.
              </div>
            )}
            {filtered.map((c) => {
              const active = selecionados.has(c.id);
              const id = idMap.get(c.id) || "#---";
              const ciclo = cicloDoCliente(c);
              const dia = diaPrograma(c);
              const st = statusCiclo(c, atividades);
              const entP = proximaEntregaPendente(c);
              return (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => toggle(c.id)}
                  className={`w-full text-left flex flex-wrap items-center gap-x-2 gap-y-1 px-3 py-2 rounded-md transition-all bg-card border ${
                    active ? "border-primary" : "border-border"
                  }`}
                >
                  <span className={`h-3.5 w-3.5 rounded border flex items-center justify-center ${active ? "bg-primary border-primary" : "border-muted-foreground"}`}>
                    {active && <span className="text-[10px] text-primary-foreground">✓</span>}
                  </span>
                  <span className={`text-xs font-mono font-bold tabular-nums ${active ? "text-primary" : "text-muted-foreground"}`}>{id}</span>
                  <span className={`text-sm font-semibold ${active ? "text-foreground" : "text-foreground/80"}`}>{c.nome}</span>
                  {c.empresa && (
                    <span className="text-xs text-muted-foreground">· {c.empresa}</span>
                  )}
                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-background/70 text-muted-foreground">
                    {ciclo} · Dia {dia}
                  </span>
                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-background/70 text-muted-foreground">
                    {c.temperatura}
                  </span>
                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-background/70 text-muted-foreground">
                    {STATUS_CICLO_LABEL[st]}
                  </span>
                  {entP && (
                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-status-yellow/15 text-status-yellow">
                      Pend.: {entP}
                    </span>
                  )}
                  {!lockedCS && (
                    <span className="text-[10px] text-muted-foreground ml-auto">{c.responsavel_cs}</span>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* 2. Entrega */}
        <div>
          <label className="block text-[10px] uppercase tracking-wider text-muted-foreground mb-1 font-semibold">
            Entrega *
          </label>
          <select
            value={entrega}
            onChange={(e) => setEntrega(e.target.value)}
            className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-primary"
          >
            <option value="">Selecione a entrega…</option>
            {ENTREGAS.map((e) => (
              <option key={e} value={e}>{e}</option>
            ))}
          </select>
        </div>

        {entrega === "Reunião com Consultor" && (
          <div>
            <label className="block text-[10px] uppercase tracking-wider text-muted-foreground mb-1 font-semibold">
              Selecione o consultor *
            </label>
            <select
              value={consultor}
              onChange={(e) => setConsultor(e.target.value)}
              className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-primary"
            >
              <option value="">Selecione…</option>
              {CONSULTORES.map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </div>
        )}
        {entrega === "Outro" && (
          <div>
            <label className="block text-[10px] uppercase tracking-wider text-muted-foreground mb-1 font-semibold">
              Especifique a entrega *
            </label>
            <input
              value={entregaOutro}
              onChange={(e) => setEntregaOutro(e.target.value)}
              placeholder="Especifique a entrega..."
              className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-primary"
            />
          </div>
        )}

        <div>
          <label className="block text-[10px] uppercase tracking-wider text-muted-foreground mb-1 font-semibold">
            Ação *
          </label>
          <select
            value={acao}
            onChange={(e) => setAcao(e.target.value)}
            className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-primary"
          >
            <option value="">Selecione a ação…</option>
            {ACOES.map((a) => (
              <option key={a} value={a}>{a}</option>
            ))}
          </select>
        </div>

        {acao === "Outro" && (
          <div>
            <label className="block text-[10px] uppercase tracking-wider text-muted-foreground mb-1 font-semibold">
              Descreva a ação *
            </label>
            <input
              value={acaoOutro}
              onChange={(e) => setAcaoOutro(e.target.value)}
              placeholder="Descreva a ação..."
              className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-primary"
            />
          </div>
        )}

        {tituloAuto && (
          <div className="rounded-lg px-3 py-2 text-xs bg-background border border-border">
            <span className="text-muted-foreground">Título gerado: </span>
            <span className="font-bold text-primary">{tituloAuto}</span>
          </div>
        )}
        </>)}

        {exigeMotivo && (
          <div>
            <label className="block text-[10px] uppercase tracking-wider text-muted-foreground mb-1 font-semibold">
              Motivo do impedimento *
            </label>
            <textarea
              value={motivoImpedimento}
              onChange={(e) => setMotivoImpedimento(e.target.value)}
              rows={2}
              placeholder="O que está travando essa atividade?"
              className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-primary"
            />
            <p className="text-[11px] text-status-yellow mt-1">
              Atividade impedida só é salva com o motivo preenchido.
            </p>
          </div>
        )}

        <div>
          <label className="block text-[10px] uppercase tracking-wider text-muted-foreground mb-1 font-semibold">
            Prioridade *
          </label>
          <div className="grid grid-cols-3 gap-1.5">
            {PRIORIDADES.map((p) => {
              const active = prioridade === p.value;
              return (
                <button
                  key={p.value}
                  type="button"
                  onClick={() => setPrioridade(p.value)}
                  className={`py-2 rounded-lg text-xs font-semibold border transition-all ${
                    active
                      ? "bg-primary text-primary-foreground border-primary"
                      : "bg-background border-border text-foreground/80 hover:border-primary/50"
                  }`}
                >
                  <span className="mr-1">{p.emoji}</span>
                  {p.label}
                </button>
              );
            })}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-[10px] uppercase tracking-wider text-muted-foreground mb-1 font-semibold">
              Data *
            </label>
            <input
              type="date"
              value={data}
              onChange={(e) => setData(e.target.value)}
              className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-primary"
            />
          </div>
          <div>
            <label className="block text-[10px] uppercase tracking-wider text-muted-foreground mb-1 font-semibold">
              Horário
            </label>
            <input
              type="time"
              value={hora}
              onChange={(e) => setHora(e.target.value)}
              className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-primary"
            />
          </div>
        </div>

        <div>
          <label className="block text-[10px] uppercase tracking-wider text-muted-foreground mb-1 font-semibold">
            Observações
          </label>
          <textarea
            value={descricao}
            onChange={(e) => setDescricao(e.target.value)}
            rows={2}
            placeholder="Observações adicionais..."
            className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-primary"
          />
        </div>

        {!lockedCS && (
          <div>
            <label className="block text-[10px] uppercase tracking-wider text-muted-foreground mb-1 font-semibold">
              CS responsável padrão (cada atividade fica com o CS do cliente)
            </label>
            <select
              value={cs}
              onChange={(e) => setCs(e.target.value as CSName)}
              className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm"
            >
              {/* A lista do time chega do banco depois do 1º render; sem ela o
                  select ficaria sem nenhuma opção correspondente ao valor. */}
              {cs === "" && <option value="">Selecione…</option>}
              {csList.map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </div>
        )}

        <div className="flex justify-end gap-2 pt-2">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm rounded-lg border border-border hover:border-primary"
          >
            Cancelar
          </button>
          <button
            onClick={() => void save()}
            disabled={!valid || salvando}
            className="px-5 py-2 text-sm font-semibold rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {salvando
              ? "Criando…"
              : count > 1
                ? `Criar ${count} atividades`
                : "Criar atividade"}
          </button>
        </div>
      </div>
    </div>
  );
}

function MiniSelect({
  label, value, onChange, options,
}: {
  label: string; value: string; onChange: (v: string) => void; options: [string, string][];
}) {
  return (
    <label className="text-[10px] text-muted-foreground inline-flex items-center gap-1">
      <span className="uppercase tracking-wider">{label}</span>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="bg-background border border-border rounded-md px-1.5 py-1 text-[11px] text-foreground"
      >
        {options.map(([v, l]) => (
          <option key={v} value={v}>{l}</option>
        ))}
      </select>
    </label>
  );
}
