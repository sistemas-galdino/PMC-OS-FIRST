import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { X } from "lucide-react";
import { Badge } from "@/components/crm/Badge";
import { AlertsPanel } from "@/components/crm/AlertsPanel";
import { ClientDrawerHost } from "@/components/crm/ClientDrawer";
import { Heatmap } from "@/components/crm/Heatmap";
import { IndicadoresCarteira } from "@/components/crm/IndicadoresCarteira";
import { TabelaPorCS } from "@/components/crm/TabelaPorCS";
import { VisaoEstrategica } from "@/components/crm/VisaoEstrategica";
import {
  buildDisplayIdMap,
  diasSemContato,
  isCS,
  isStrategic,
  openCliente,
  proximaAtividade,
  sameDay,
  setVisaoCs,
  useAtividades,
  useClientes,
  useProfile,
} from "@/lib/crm/storage";
import { formatBR, type Period } from "@/lib/crm/format";
import { useCsList } from "@/lib/crm/equipe";
import { type Atividade, type AtividadeStatus, type Cliente, type CSName } from "@/lib/crm/types";

const PERIODS: { id: Period; label: string }[] = [
  { id: "semana", label: "Esta semana" },
  { id: "mes", label: "Este mês" },
  { id: "30dias", label: "Últimos 30 dias" },
];

export default function CrmVisaoGeralPage() {
  const [profile] = useProfile();
  if (isStrategic(profile)) return <VisaoEstrategica />;
  // isCS() olha o papel de quem está logado — `profile` nulo é a coordenação
  // vendo o time inteiro, e não uma CS sem carteira.
  if (isCS(profile)) {
    return (
      <div className="p-10 text-center">
        <div className="bg-card border border-border rounded-lg p-10 max-w-md mx-auto">
          <h2 className="text-lg font-bold">Acesso restrito</h2>
          <p className="text-sm text-muted-foreground mt-2">
            Apenas a coordenadora pode visualizar esta tela.
          </p>
        </div>
      </div>
    );
  }
  return <VisaoGeralPage />;
}

function VisaoGeralPage() {
  const clientes = useClientes();
  const atividades = useAtividades();
  const [period, setPeriod] = useState<Period>("semana");

  // Mornos sem ação (lista)
  const mornos = useMemo(() => {
    return clientes
      .filter((c) => c.temperatura === "Morno")
      .map((c) => {
        const acts = atividades.filter(
          (a) => a.cliente_id === c.id && (a.status === "Pendente" || a.status === "Em andamento" || a.status === "Atrasada"),
        );
        const hasUrgente = acts.some((a) => a.prioridade === "Urgente");
        return {
          c,
          dias: diasSemContato(c.id, atividades),
          prox: proximaAtividade(c.id, atividades),
          hasUrgente,
        };
      })
      .filter(({ dias }) => dias !== null && dias > 5)
      .sort((a, b) => (b.dias ?? 0) - (a.dias ?? 0));
  }, [clientes, atividades]);

  const total = clientes.length;
  const ativos = clientes.filter((c) => c.status === "Ativo").length;
  const risco = clientes.filter((c) => c.status === "Em Risco").length;
  const mornosSemAcao = clientes.filter(
    (c) => c.temperatura === "Morno" && !proximaAtividade(c.id, atividades),
  ).length;

  return (
    <div className="p-8 space-y-8">
      <header>
        <h1 className="text-2xl font-bold">Visão Geral</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Indicadores consolidados do time de Customer Success
        </p>
      </header>

      <AlertsPanel />

      <IndicadoresCarteira clientes={clientes} showCSFilter hideCSColumn={false} />

      {/* Painel de status em tempo real (hoje) */}
      <StatusPanel atividades={atividades} clientes={clientes} />

      <TabelaPorCS />

      {/* Heatmap */}
      <section>
        <h2 className="text-xs font-bold uppercase tracking-[0.15em] text-muted-foreground mb-3">
          Heatmap semanal · atividades concluídas
        </h2>
        <Heatmap atividades={atividades} />
      </section>

      {/* Mornos */}
      <section>
        <h2 className="text-xs font-bold uppercase tracking-[0.15em] text-muted-foreground mb-3">
          Clientes mornos que precisam de ação
        </h2>
        <div className="bg-card border border-border rounded-lg overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-background/50 text-xs uppercase tracking-wider text-muted-foreground">
              <tr>
                <th className="text-left px-4 py-3">Cliente</th>
                <th className="text-left px-4 py-3">CS</th>
                <th className="text-left px-4 py-3">Prioridade</th>
                <th className="text-left px-4 py-3">Dias sem contato</th>
                <th className="text-left px-4 py-3">Próxima ação</th>
              </tr>
            </thead>
            <tbody>
              {mornos.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-4 py-8 text-center text-muted-foreground">
                    Nenhum cliente morno em alerta.
                  </td>
                </tr>
              )}
              {mornos.map(({ c, dias, prox, hasUrgente }) => {
                const danger = (dias ?? 0) > 10;
                return (
                  <tr
                    key={c.id}
                    className={`border-t border-border cursor-pointer hover:bg-background/40 ${
                      !prox
                        ? danger
                          ? "bg-status-red/10"
                          : "bg-status-yellow/10"
                        : ""
                    }`}
                    onClick={() => openCliente(c.id)}
                  >
                    <td className="px-4 py-3 font-medium">{c.nome}</td>
                    <td className="px-4 py-3 text-muted-foreground">{c.responsavel_cs}</td>
                    <td className="px-4 py-3">
                      {hasUrgente ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold border bg-status-red/15 text-status-red border-status-red/40">
                          🔴 Urgente
                        </span>
                      ) : (
                        <span className="text-xs text-muted-foreground">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <span className={danger ? "text-status-red font-bold" : "text-status-yellow font-semibold"}>
                        {dias} dias
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      {prox ? (
                        <span className="text-muted-foreground">
                          {formatBR(prox.data_prevista)} · {prox.tipo}
                        </span>
                      ) : (
                        <Badge value="Sem ação" />
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>

      {/* Carteira geral */}
      <section>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-xs font-bold uppercase tracking-[0.15em] text-muted-foreground">
            Carteira geral
          </h2>
          <div className="inline-flex bg-card border border-border rounded-lg p-1">
            {PERIODS.map((p) => (
              <button
                key={p.id}
                onClick={() => setPeriod(p.id)}
                className={`px-3 py-1.5 text-xs rounded-md ${
                  period === p.id
                    ? "bg-primary text-primary-foreground font-semibold"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {p.label}
              </button>
            ))}
          </div>
        </div>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <BigNumber label="Total de clientes" value={total} color="text-primary" />
          <BigNumber label="Ativos" value={ativos} color="text-status-green" />
          <BigNumber label="Em Risco" value={risco} color="text-status-red" />
          <BigNumber label="Mornos sem ação" value={mornosSemAcao} color="text-status-yellow" />
        </div>
      </section>

      {/* A ficha do cliente é aberta de vários pontos desta tela (mornos,
          alertas, painel de hoje), então o host do drawer mora aqui. */}
      <ClientDrawerHost />
    </div>
  );
}

function BigNumber({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div className="bg-card border border-border rounded-lg p-5">
      <div className={`text-4xl font-black ${color}`}>{value}</div>
      <div className="text-xs uppercase tracking-wider text-muted-foreground mt-2">{label}</div>
    </div>
  );
}

// ============= Status Panel (hoje) =============

const ST_BAR: Record<AtividadeStatus, string> = {
  Pendente: "bg-[#6B7280]",
  "Em andamento": "bg-[#60A5FA]",
  "Aguardando cliente": "bg-[#A78BFA]",
  "Aguardando time interno": "bg-[#F59E0B]",
  Concluída: "bg-[#22C55E]",
  Atrasada: "bg-[#EF4444]",
  Impedida: "bg-[#F97316]",
};
const ST_TXT: Record<AtividadeStatus, string> = {
  Pendente: "text-[#9CA3AF]",
  "Em andamento": "text-[#60A5FA]",
  "Aguardando cliente": "text-[#A78BFA]",
  "Aguardando time interno": "text-[#F59E0B]",
  Concluída: "text-[#22C55E]",
  Atrasada: "text-[#EF4444]",
  Impedida: "text-[#F97316]",
};

function eff(a: Atividade): AtividadeStatus {
  if (a.status === "Concluída" || a.status === "Atrasada" || a.status === "Impedida")
    return a.status;
  const t = new Date(a.data_prevista).getTime();
  if ((a.status === "Pendente" || a.status === "Em andamento") && t < Date.now() - 86400000)
    return "Atrasada";
  return a.status;
}

function StatusPanel({
  atividades,
  clientes,
}: {
  atividades: Atividade[];
  clientes: Cliente[];
}) {
  const navigate = useNavigate();
  // Lista reativa: o time chega do banco depois do 1º render.
  const csList = useCsList();
  const today = new Date();
  const [detail, setDetail] = useState<Atividade | null>(null);
  const idMap = useMemo(() => buildDisplayIdMap(clientes), [clientes]);

  const hoje = useMemo(
    () => atividades.filter((a) => sameDay(a.data_prevista, today.toISOString())),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [atividades],
  );

  function countsOf(list: Atividade[]) {
    const c: Record<AtividadeStatus, number> = {
      Pendente: 0,
      "Em andamento": 0,
      "Aguardando cliente": 0,
      "Aguardando time interno": 0,
      Concluída: 0,
      Atrasada: 0,
      Impedida: 0,
    };
    list.forEach((a) => {
      c[eff(a)]++;
    });
    return c;
  }
  const totals = countsOf(hoje);
  const total = hoje.length;

  // O original abria o Meu Dia da CS por query string (`?cs=`). Aqui o recorte
  // de carteira é a "visão em foco" da sessão, então trocamos a visão antes de
  // navegar; `view=readonly` continua sendo lido pela TarefasPage.
  const abrirMeuDiaDe = (cs: CSName) => {
    setVisaoCs(cs);
    navigate("/crm/meu-dia?view=readonly");
  };

  return (
    <section className="space-y-3">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <h2 className="text-xs font-bold uppercase tracking-[0.15em] text-muted-foreground">
          Painel de hoje · status em tempo real
        </h2>
        <div className="text-xs text-muted-foreground">
          <span className="font-bold text-foreground">{total}</span> no total ·{" "}
          <span className="text-[#22C55E] font-semibold">✅ {totals["Concluída"]}</span> ·{" "}
          <span className="text-[#60A5FA] font-semibold">🔵 {totals["Em andamento"]}</span> ·{" "}
          <span className="text-[#EF4444] font-semibold">⚠️ {totals["Atrasada"]}</span> ·{" "}
          <span className="text-muted-foreground">⬜ {totals["Pendente"]}</span>
        </div>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-3">
        {csList.map((cs) => {
          const acts = hoje.filter((a) => a.cs_responsavel === cs);
          const cnt = countsOf(acts);
          const conc = cnt["Concluída"];
          const totalCs = acts.length;
          const pct = totalCs ? Math.round((conc / totalCs) * 100) : 0;
          const blocks = 8;
          const filled = Math.round((pct / 100) * blocks);
          const focus = acts.filter((a) => {
            const e = eff(a);
            return e === "Em andamento" || e === "Atrasada";
          });
          return (
            <div key={cs} className="bg-card border border-border rounded-lg p-4">
              <button
                onClick={() => abrirMeuDiaDe(cs)}
                className="font-bold text-sm hover:text-primary"
                title={`Abrir Meu Dia de ${cs} (somente leitura)`}
              >
                {cs}
              </button>
              <div className="mt-2 grid grid-cols-4 gap-1 text-[11px] font-bold">
                <div className="text-[#EF4444]">🔴 {cnt["Atrasada"]}</div>
                <div className="text-[#60A5FA]">🔵 {cnt["Em andamento"]}</div>
                <div className="text-[#9CA3AF]">⬜ {cnt["Pendente"]}</div>
                <div className="text-[#22C55E]">✅ {cnt["Concluída"]}</div>
              </div>
              <div className="mt-3 font-mono text-[10px] tabular-nums">
                <span className="text-primary">{"█".repeat(filled)}</span>
                <span className="text-muted-foreground/40">{"░".repeat(blocks - filled)}</span>
                <span className="ml-2 text-muted-foreground">
                  {conc}/{totalCs || 0} concluídas ({pct}%)
                </span>
              </div>
              <div className="mt-3 space-y-1.5">
                {focus.length === 0 && (
                  <div className="text-[11px] text-muted-foreground italic">
                    Sem atividades em andamento ou atrasadas.
                  </div>
                )}
                {focus.map((a) => {
                  const e = eff(a);
                  const cli = clientes.find((c) => c.id === a.cliente_id);
                  return (
                    <button
                      key={a.id}
                      onClick={() => setDetail(a)}
                      className="w-full text-left flex items-stretch bg-background border border-border rounded-md overflow-hidden hover:border-primary"
                    >
                      <div className={`w-1 ${ST_BAR[e]}`} />
                      <div className="flex-1 px-2.5 py-1.5">
                        <div className="text-xs font-semibold truncate">{a.titulo}</div>
                        <div className="text-[10px] text-muted-foreground truncate">
                          {cli && (
                            <span className="font-mono font-bold text-primary mr-1">
                              {idMap.get(cli.id)}
                            </span>
                          )}
                          {cli?.nome || "—"} ·{" "}
                          <span className={ST_TXT[e]}>{e}</span>
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>

      {detail && (
        <DetailSheet
          atividade={detail}
          clientes={clientes}
          onClose={() => setDetail(null)}
        />
      )}
    </section>
  );
}

function DetailSheet({
  atividade,
  clientes,
  onClose,
}: {
  atividade: Atividade;
  clientes: Cliente[];
  onClose: () => void;
}) {
  const cli = clientes.find((c) => c.id === atividade.cliente_id);
  const idMap = buildDisplayIdMap(clientes);
  const e = eff(atividade);
  return (
    <div className="fixed inset-0 z-40 flex justify-end" onClick={onClose}>
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
      <div
        className="relative w-full max-w-md bg-card border-l border-border h-full overflow-y-auto"
        onClick={(ev) => ev.stopPropagation()}
      >
        <div className="p-5 border-b border-border flex items-start justify-between gap-3">
          <div>
            <div className="text-[10px] uppercase tracking-wider text-muted-foreground">
              Detalhe da atividade · leitura
            </div>
            <h3 className="text-lg font-bold mt-1">{atividade.titulo}</h3>
          </div>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground">
            <X className="h-5 w-5" />
          </button>
        </div>
        <div className="p-5 space-y-3 text-sm">
          <Row label="Status">
            <span
              className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-xs font-bold ${ST_TXT[e]}`}
              style={{ borderColor: "currentColor" }}
            >
              {e}
            </span>
          </Row>
          <Row label="Cliente">
            <button
              onClick={() => cli && openCliente(cli.id)}
              className="font-semibold hover:text-primary"
            >
              {cli && (
                <span className="font-mono text-primary mr-1.5">
                  {idMap.get(cli.id)}
                </span>
              )}
              {cli?.nome || "—"}
              {cli?.empresa && <span className="text-muted-foreground"> · {cli.empresa}</span>}
            </button>
          </Row>
          <Row label="CS responsável">{atividade.cs_responsavel}</Row>
          {atividade.entrega && <Row label="Entrega">{atividade.entrega_detalhe ? `${atividade.entrega} (${atividade.entrega_detalhe})` : atividade.entrega}</Row>}
          {atividade.acao && <Row label="Ação">{atividade.acao === "Outro" ? atividade.acao_detalhe || "Outro" : atividade.acao}</Row>}
          <Row label="Prioridade">{atividade.prioridade}</Row>
          <Row label="Data">{formatBR(atividade.data_prevista)}{atividade.hora ? ` · ${atividade.hora}` : ""}</Row>
          {atividade.descricao && (
            <div>
              <div className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold mb-1">
                Descrição
              </div>
              <div className="text-sm text-foreground/90 bg-background border border-border rounded-lg p-3">
                {atividade.descricao}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-3 border-b border-border/60 pb-2">
      <span className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">
        {label}
      </span>
      <span className="text-sm text-right">{children}</span>
    </div>
  );
}
