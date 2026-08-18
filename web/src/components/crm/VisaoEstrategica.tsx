import { useMemo } from "react";
import {
  buildDisplayIdMap,
  openCliente,
  proximaAtividade,
  semDataDeEntrada,
  useAtividades,
  useClientes,
} from "@/lib/crm/storage";
import { useCsList } from "@/lib/crm/equipe";
import { type Atividade, type Cliente, type Temperatura } from "@/lib/crm/types";
import { IndicadoresCarteira } from "@/components/crm/IndicadoresCarteira";

const TEMP_ORDER: Temperatura[] = ["Quente", "Morno", "Frio", "Em Risco", "Não definido"];
const TEMP_COLOR: Record<Temperatura, string> = {
  Quente: "text-status-green",
  Morno: "text-status-yellow",
  Frio: "text-[#60A5FA]",
  "Em Risco": "text-status-red",
  "Não definido": "text-muted-foreground",
};
const TEMP_BG: Record<Temperatura, string> = {
  Quente: "bg-status-green",
  Morno: "bg-status-yellow",
  Frio: "bg-[#60A5FA]",
  "Em Risco": "bg-status-red",
  "Não definido": "bg-muted",
};
const TEMP_RANK: Record<Temperatura, number> = {
  Quente: 3,
  Morno: 2,
  Frio: 1,
  "Em Risco": 0,
  "Não definido": 1,
};

function lastTempChange(c: Cliente): { from?: Temperatura; to: Temperatura; data?: string; motivo?: string; observacao?: string } | null {
  const h = c.historico_temperatura || [];
  if (h.length === 0) return null;
  const last = h[h.length - 1];
  const prev = h.length >= 2 ? h[h.length - 2].temp : undefined;
  return { from: prev, to: last.temp, data: last.data, motivo: last.motivo, observacao: last.observacao };
}

/**
 * Dias restantes até o aniversário do contrato. Devolve null quando o cliente
 * não tem data de entrada: o original fazia `diasDesde(...) ?? 0`, o que
 * transformava a ausência de data num "dia 0" e colocaria os ~103 clientes sem
 * data numa janela de renovação inventada.
 */
function diasAteRenovacao(c: Cliente): number | null {
  if (semDataDeEntrada(c)) return null;
  const dias = Math.floor((Date.now() - new Date(c.data_inicio).getTime()) / 86400000);
  if (!Number.isFinite(dias)) return null;
  return 365 - (dias % 365);
}

export function VisaoEstrategica() {
  // Lista reativa: o time chega do banco depois do 1º render.
  const csList = useCsList();
  const clientes = useClientes();
  const atividades = useAtividades();
  const idMap = useMemo(() => buildDisplayIdMap(clientes), [clientes]);

  const ativos = useMemo(() => clientes.filter((c) => c.status === "Ativo"), [clientes]);

  const tempCounts = useMemo(() => {
    const m: Record<Temperatura, number> = {
      Quente: 0, Morno: 0, Frio: 0, "Em Risco": 0, "Não definido": 0,
    };
    ativos.forEach((c) => { m[c.temperatura]++; });
    return m;
  }, [ativos]);

  const piorando = useMemo(() => {
    return ativos
      .map((c) => ({ c, chg: lastTempChange(c) }))
      .filter(({ chg }) => chg && chg.from && TEMP_RANK[chg.to] < TEMP_RANK[chg.from])
      .sort((a, b) => new Date(b.chg!.data || 0).getTime() - new Date(a.chg!.data || 0).getTime());
  }, [ativos]);

  const melhorando = useMemo(() => {
    return ativos
      .map((c) => ({ c, chg: lastTempChange(c) }))
      .filter(({ chg }) => chg && chg.from && TEMP_RANK[chg.to] > TEMP_RANK[chg.from])
      .sort((a, b) => new Date(b.chg!.data || 0).getTime() - new Date(a.chg!.data || 0).getTime());
  }, [ativos]);

  const renovacao = useMemo(() => {
    return ativos
      .map((c) => ({ c, restante: diasAteRenovacao(c) }))
      .filter((x): x is { c: Cliente; restante: number } => x.restante !== null && x.restante <= 60)
      .sort((a, b) => a.restante - b.restante);
  }, [ativos]);

  const implementacaoTravada = useMemo(() => {
    return ativos.filter((c) => {
      const acts = atividades.filter((a) => a.cliente_id === c.id);
      return acts.some((a) => a.entrega === "Implementação" && (a.status === "Atrasada" || a.status === "Impedida"));
    });
  }, [ativos, atividades]);

  const oportunidadeCase = useMemo(() => {
    return ativos.filter((c) => {
      const chg = lastTempChange(c);
      return c.temperatura === "Quente" && (chg?.from === "Morno" || chg?.from === "Frio" || chg?.from === "Em Risco");
    });
  }, [ativos]);

  const prioritarios = useMemo(() => {
    return ativos
      .filter((c) => c.temperatura === "Em Risco" || c.temperatura === "Frio" || c.status === "Em Risco")
      .map((c) => {
        const prox = proximaAtividade(c.id, atividades);
        const chg = lastTempChange(c);
        return { c, prox, chg };
      })
      .sort((a, b) => TEMP_RANK[a.c.temperatura] - TEMP_RANK[b.c.temperatura]);
  }, [ativos, atividades]);

  const motivosRanking = useMemo(() => {
    const map = new Map<string, number>();
    ativos.forEach((c) => {
      const h = c.historico_temperatura || [];
      h.forEach((t) => {
        if (t.motivo && TEMP_RANK[t.temp] <= 1) {
          map.set(t.motivo, (map.get(t.motivo) || 0) + 1);
        }
      });
    });
    return Array.from(map.entries()).sort((a, b) => b[1] - a[1]).slice(0, 10);
  }, [ativos]);

  const movimentosRecomendados = useMemo(() => {
    const map = new Map<string, number>();
    atividades
      .filter((a) => a.status === "Pendente" || a.status === "Em andamento" || a.status === "Atrasada")
      .forEach((a) => {
        const key = a.entrega || a.acao || a.tipo;
        if (key) map.set(key, (map.get(key) || 0) + 1);
      });
    return Array.from(map.entries()).sort((a, b) => b[1] - a[1]);
  }, [atividades]);

  // Evolução mensal da carteira (últimos 6 meses)
  const evolucaoMensal = useMemo(() => {
    const now = new Date();
    const months: { key: string; label: string; ref: Date }[] = [];
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const next = new Date(now.getFullYear(), now.getMonth() - i + 1, 1);
      months.push({
        key: `${d.getFullYear()}-${d.getMonth()}`,
        label: d.toLocaleDateString("pt-BR", { month: "short", year: "2-digit" }),
        ref: next, // snapshot no fim do mês
      });
    }
    return months.map(({ label, ref }) => {
      const cnt: Record<Temperatura, number> = {
        Quente: 0, Morno: 0, Frio: 0, "Em Risco": 0, "Não definido": 0,
      };
      ativos.forEach((c) => {
        const h = (c.historico_temperatura || []).filter(
          (t) => new Date(t.data).getTime() < ref.getTime(),
        );
        const temp: Temperatura = h.length ? h[h.length - 1].temp : c.temperatura;
        cnt[temp]++;
      });
      const score = cnt.Quente * 2 + cnt.Morno - cnt.Frio - cnt["Em Risco"] * 2;
      return { label, cnt, score };
    });
  }, [ativos]);

  const queda = piorando.length;
  const evolucao = melhorando.length;

  function decisaoSugerida(c: Cliente, prox: Atividade | null, chg: ReturnType<typeof lastTempChange>): string {
    if (c.temperatura === "Em Risco") return "Escalar para coordenação · reunião com Galdino";
    if (chg?.motivo?.includes("Implementação")) return "Destravar implementação";
    if (chg?.motivo?.includes("inadimplente")) return "Tratar financeiro";
    if (chg?.motivo?.includes("reclamou")) return "Tratar insatisfação";
    if (chg?.motivo?.includes("sem resposta")) return "Reengajamento ativo";
    if (chg?.motivo?.includes("plano de ação")) return "Revisar plano de ação";
    if (!prox) return "Definir próxima ação";
    return "Manter acompanhamento pela CS";
  }

  return (
    <div className="p-8 space-y-10">
      <header>
        <h1 className="text-2xl font-bold">Visão Estratégica da Carteira</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Indicadores de saúde, riscos, oportunidades e próximos movimentos dos clientes.
        </p>
      </header>

      <IndicadoresCarteira clientes={clientes} showCSFilter hideCSColumn={false} />


      {/* BLOCO 1 — Resumo Executivo */}
      <section>
        <h2 className="text-xs font-bold uppercase tracking-[0.15em] text-muted-foreground mb-3">
          Resumo executivo da carteira
        </h2>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
          <KPI label="Ativos" value={ativos.length} color="text-primary" />
          <KPI label="Quentes" value={tempCounts.Quente} color="text-status-green" />
          <KPI label="Mornos" value={tempCounts.Morno} color="text-status-yellow" />
          <KPI label="Frios" value={tempCounts.Frio} color="text-[#60A5FA]" />
          <KPI label="Em risco" value={tempCounts["Em Risco"]} color="text-status-red" />
          <KPI label="Em queda" value={queda} color="text-status-red" />
          <KPI label="Em evolução" value={evolucao} color="text-status-green" />
          <KPI label="Próx. renovação" value={renovacao.length} color="text-primary" />
          <KPI label="Possíveis cases" value={oportunidadeCase.length} color="text-status-green" />
          <KPI label="Implem. travada" value={implementacaoTravada.length} color="text-status-yellow" />
        </div>
      </section>

      {/* BLOCO 2 — Saúde por Temperatura */}
      <section>
        <h2 className="text-xs font-bold uppercase tracking-[0.15em] text-muted-foreground mb-3">
          Saúde da carteira por temperatura
        </h2>
        <div className="bg-card border border-border rounded-lg p-5 space-y-3">
          {TEMP_ORDER.map((t) => {
            const n = tempCounts[t];
            const pct = ativos.length ? Math.round((n / ativos.length) * 100) : 0;
            return (
              <div key={t} className="space-y-1">
                <div className="flex items-center justify-between text-xs">
                  <span className={`font-semibold ${TEMP_COLOR[t]}`}>{t}</span>
                  <span className="text-muted-foreground">{n} · {pct}%</span>
                </div>
                <div className="h-2 bg-background rounded-full overflow-hidden">
                  <div className={`h-full ${TEMP_BG[t]}`} style={{ width: `${pct}%` }} />
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* BLOCO 3 — Evolução mensal da carteira */}
      <section>
        <h2 className="text-xs font-bold uppercase tracking-[0.15em] text-muted-foreground mb-3">
          Evolução da carteira · últimos 6 meses
        </h2>
        <div className="bg-card border border-border rounded-lg overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-background/50 text-xs uppercase tracking-wider text-muted-foreground">
              <tr>
                <Th>Mês</Th>
                <Th>Quentes</Th>
                <Th>Mornos</Th>
                <Th>Frios</Th>
                <Th>Em risco</Th>
                <Th>Saldo</Th>
              </tr>
            </thead>
            <tbody>
              {evolucaoMensal.map((m, i) => {
                const prev = i > 0 ? evolucaoMensal[i - 1].score : m.score;
                const delta = m.score - prev;
                const tag =
                  delta > 0 ? { t: "Melhorando", cl: "text-status-green" }
                  : delta < 0 ? { t: "Piorando", cl: "text-status-red" }
                  : { t: "Estável", cl: "text-muted-foreground" };
                return (
                  <tr key={m.label} className="border-t border-border">
                    <Td className="font-semibold capitalize">{m.label}</Td>
                    <Td className="text-status-green font-semibold">{m.cnt.Quente}</Td>
                    <Td className="text-status-yellow font-semibold">{m.cnt.Morno}</Td>
                    <Td className="text-[#60A5FA] font-semibold">{m.cnt.Frio}</Td>
                    <Td className="text-status-red font-semibold">{m.cnt["Em Risco"]}</Td>
                    <Td className={`font-bold ${tag.cl}`}>
                      {tag.t}{delta !== 0 && <span className="ml-1 text-xs">({delta > 0 ? "+" : ""}{delta})</span>}
                    </Td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>



      {/* BLOCO 4 — Prioritários para decisão */}
      <section>
        <h2 className="text-xs font-bold uppercase tracking-[0.15em] text-muted-foreground mb-3">
          Clientes prioritários para decisão
        </h2>
        <div className="bg-card border border-border rounded-lg overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-background/50 text-xs uppercase tracking-wider text-muted-foreground">
              <tr>
                <Th>Cliente</Th>
                <Th>CS</Th>
                <Th>Temp.</Th>
                <Th>Motivo</Th>
                <Th>Próxima ação</Th>
                <Th>Decisão necessária</Th>
              </tr>
            </thead>
            <tbody>
              {prioritarios.length === 0 && <EmptyRow cols={6} text="Nenhum cliente exigindo decisão estratégica." />}
              {prioritarios.slice(0, 15).map(({ c, prox, chg }) => (
                <tr key={c.id} className="border-t border-border hover:bg-background/40 cursor-pointer" onClick={() => openCliente(c.id)}>
                  <Td>
                    <span className="font-mono text-primary mr-2">{idMap.get(c.id)}</span>
                    <span className="font-semibold">{c.nome}</span>
                    {c.empresa && <div className="text-[11px] text-muted-foreground">{c.empresa}</div>}
                  </Td>
                  <Td className="text-muted-foreground">{c.responsavel_cs}</Td>
                  <Td className={`font-semibold ${TEMP_COLOR[c.temperatura]}`}>{c.temperatura}</Td>
                  <Td className="text-muted-foreground text-xs">{chg?.motivo || "—"}</Td>
                  <Td className="text-xs">{prox ? `${prox.acao || prox.titulo}` : <span className="text-status-red">Sem ação</span>}</Td>
                  <Td className="text-xs font-medium">{decisaoSugerida(c, prox, chg)}</Td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* BLOCO 5 / 6 — Pioraram & Melhoraram */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <section>
          <h2 className="text-xs font-bold uppercase tracking-[0.15em] text-muted-foreground mb-3">
            Clientes que perderam força
          </h2>
          <div className="bg-card border border-border rounded-lg overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-background/50 text-xs uppercase tracking-wider text-muted-foreground">
                <tr><Th>Cliente</Th><Th>CS</Th><Th>Movimento</Th><Th>Motivo</Th></tr>
              </thead>
              <tbody>
                {piorando.length === 0 && <EmptyRow cols={4} text="Nenhuma queda registrada." />}
                {piorando.slice(0, 10).map(({ c, chg }) => (
                  <tr key={c.id} className="border-t border-border hover:bg-background/40 cursor-pointer" onClick={() => openCliente(c.id)}>
                    <Td>
                      <span className="font-mono text-primary mr-1.5 text-xs">{idMap.get(c.id)}</span>
                      <span className="font-semibold">{c.nome}</span>
                    </Td>
                    <Td className="text-muted-foreground text-xs">{c.responsavel_cs}</Td>
                    <Td className="text-xs">
                      <span className={TEMP_COLOR[chg!.from!]}>{chg!.from}</span>
                      <span className="text-muted-foreground mx-1">→</span>
                      <span className={TEMP_COLOR[chg!.to]}>{chg!.to}</span>
                    </Td>
                    <Td className="text-xs text-muted-foreground">{chg?.motivo || "—"}</Td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <section>
          <h2 className="text-xs font-bold uppercase tracking-[0.15em] text-muted-foreground mb-3">
            Clientes em evolução
          </h2>
          <div className="bg-card border border-border rounded-lg overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-background/50 text-xs uppercase tracking-wider text-muted-foreground">
                <tr><Th>Cliente</Th><Th>CS</Th><Th>Movimento</Th><Th>Possível case</Th></tr>
              </thead>
              <tbody>
                {melhorando.length === 0 && <EmptyRow cols={4} text="Nenhuma evolução registrada." />}
                {melhorando.slice(0, 10).map(({ c, chg }) => {
                  const isCase = c.temperatura === "Quente";
                  return (
                    <tr key={c.id} className="border-t border-border hover:bg-background/40 cursor-pointer" onClick={() => openCliente(c.id)}>
                      <Td>
                        <span className="font-mono text-primary mr-1.5 text-xs">{idMap.get(c.id)}</span>
                        <span className="font-semibold">{c.nome}</span>
                      </Td>
                      <Td className="text-muted-foreground text-xs">{c.responsavel_cs}</Td>
                      <Td className="text-xs">
                        <span className={TEMP_COLOR[chg!.from!]}>{chg!.from}</span>
                        <span className="text-muted-foreground mx-1">→</span>
                        <span className={TEMP_COLOR[chg!.to]}>{chg!.to}</span>
                      </Td>
                      <Td className="text-xs">{isCase ? <span className="text-status-green font-semibold">Sim</span> : <span className="text-muted-foreground">—</span>}</Td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </section>
      </div>

      {/* BLOCO 7 — Renovações */}
      <section>
        <h2 className="text-xs font-bold uppercase tracking-[0.15em] text-muted-foreground mb-3">
          Clientes próximos da renovação
        </h2>
        <div className="bg-card border border-border rounded-lg overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-background/50 text-xs uppercase tracking-wider text-muted-foreground">
              <tr><Th>Cliente</Th><Th>CS</Th><Th>Dias restantes</Th><Th>Temperatura</Th><Th>Prioridade</Th></tr>
            </thead>
            <tbody>
              {renovacao.length === 0 && <EmptyRow cols={5} text="Nenhuma renovação nos próximos 60 dias." />}
              {renovacao.slice(0, 15).map(({ c, restante }) => {
                let pri = "Sem informação suficiente";
                let priCl = "text-muted-foreground";
                if (c.temperatura === "Quente") { pri = "Alta oportunidade"; priCl = "text-status-green"; }
                else if (c.temperatura === "Morno") { pri = "Atenção"; priCl = "text-status-yellow"; }
                else if (c.temperatura === "Frio" || c.temperatura === "Em Risco") { pri = "Risco"; priCl = "text-status-red"; }
                return (
                  <tr key={c.id} className="border-t border-border hover:bg-background/40 cursor-pointer" onClick={() => openCliente(c.id)}>
                    <Td>
                      <span className="font-mono text-primary mr-1.5 text-xs">{idMap.get(c.id)}</span>
                      <span className="font-semibold">{c.nome}</span>
                    </Td>
                    <Td className="text-muted-foreground text-xs">{c.responsavel_cs}</Td>
                    <Td className="text-xs font-semibold">{restante} dias</Td>
                    <Td className={`text-xs font-semibold ${TEMP_COLOR[c.temperatura]}`}>{c.temperatura}</Td>
                    <Td className={`text-xs font-semibold ${priCl}`}>{pri}</Td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>

      {/* BLOCO 8 / 9 — Motivos & Movimentos */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <section>
          <h2 className="text-xs font-bold uppercase tracking-[0.15em] text-muted-foreground mb-3">
            Principais motivos de queda
          </h2>
          <div className="bg-card border border-border rounded-lg p-5 space-y-2">
            {motivosRanking.length === 0 && <div className="text-xs text-muted-foreground italic">Nenhum motivo registrado.</div>}
            {motivosRanking.map(([m, n]) => {
              const max = motivosRanking[0][1];
              const pct = Math.round((n / max) * 100);
              return (
                <div key={m} className="space-y-1">
                  <div className="flex items-center justify-between text-xs">
                    <span>{m}</span>
                    <span className="font-bold text-status-red">{n}</span>
                  </div>
                  <div className="h-1.5 bg-background rounded-full overflow-hidden">
                    <div className="h-full bg-status-red/70" style={{ width: `${pct}%` }} />
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        <section>
          <h2 className="text-xs font-bold uppercase tracking-[0.15em] text-muted-foreground mb-3">
            Próximos movimentos recomendados
          </h2>
          <div className="bg-card border border-border rounded-lg p-5 space-y-2">
            {movimentosRecomendados.length === 0 && <div className="text-xs text-muted-foreground italic">Nenhum movimento em aberto.</div>}
            {movimentosRecomendados.slice(0, 12).map(([m, n]) => {
              const max = movimentosRecomendados[0][1];
              const pct = Math.round((n / max) * 100);
              return (
                <div key={m} className="space-y-1">
                  <div className="flex items-center justify-between text-xs">
                    <span>{m}</span>
                    <span className="font-bold text-primary">{n}</span>
                  </div>
                  <div className="h-1.5 bg-background rounded-full overflow-hidden">
                    <div className="h-full bg-primary/70" style={{ width: `${pct}%` }} />
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      </div>

      {/* BLOCO 10 — Saúde da carteira por CS */}
      <section>
        <h2 className="text-xs font-bold uppercase tracking-[0.15em] text-muted-foreground mb-3">
          Saúde da carteira por CS
        </h2>
        {csList.length === 0 && (
          <div className="text-xs text-muted-foreground">Carregando o time…</div>
        )}
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-3">
          {csList.map((cs) => {
            const list = ativos.filter((c) => c.responsavel_cs === cs);
            const cnt = { Quente: 0, Morno: 0, Frio: 0, "Em Risco": 0, "Não definido": 0 } as Record<Temperatura, number>;
            list.forEach((c) => cnt[c.temperatura]++);
            const melhor = list.filter((c) => {
              const chg = lastTempChange(c);
              return chg && chg.from && TEMP_RANK[chg.to] > TEMP_RANK[chg.from];
            }).length;
            const pior = list.filter((c) => {
              const chg = lastTempChange(c);
              return chg && chg.from && TEMP_RANK[chg.to] < TEMP_RANK[chg.from];
            }).length;
            const renov = list.filter((c) => {
              const r = diasAteRenovacao(c);
              return r !== null && r <= 60;
            }).length;
            const travada = list.filter((c) =>
              atividades.some((a) => a.cliente_id === c.id && a.entrega === "Implementação" && (a.status === "Atrasada" || a.status === "Impedida")),
            ).length;
            const semAcao = list.filter((c) => !proximaAtividade(c.id, atividades)).length;
            return (
              <div key={cs} className="bg-card border border-border rounded-lg p-4 space-y-2">
                <div className="font-bold text-sm">{cs}</div>
                <div className="text-[11px] text-muted-foreground">{list.length} clientes ativos</div>
                <div className="grid grid-cols-2 gap-x-3 gap-y-1 text-[11px] mt-2">
                  <Line label="Quentes" value={cnt.Quente} cl="text-status-green" />
                  <Line label="Mornos" value={cnt.Morno} cl="text-status-yellow" />
                  <Line label="Frios" value={cnt.Frio} cl="text-[#60A5FA]" />
                  <Line label="Em risco" value={cnt["Em Risco"]} cl="text-status-red" />
                  <Line label="Evoluindo" value={melhor} cl="text-status-green" />
                  <Line label="Em queda" value={pior} cl="text-status-red" />
                  <Line label="Renovação" value={renov} cl="text-primary" />
                  <Line label="Implem. travada" value={travada} cl="text-status-yellow" />
                  <Line label="Sem próx. ação" value={semAcao} cl="text-muted-foreground" />
                </div>
              </div>
            );
          })}
        </div>
      </section>
    </div>
  );
}

function KPI({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div className="bg-card border border-border rounded-lg p-4">
      <div className={`text-3xl font-black ${color}`}>{value}</div>
      <div className="text-[10px] uppercase tracking-wider text-muted-foreground mt-1">{label}</div>
    </div>
  );
}
function Th({ children }: { children: React.ReactNode }) {
  return <th className="text-left px-4 py-3">{children}</th>;
}
function Td({ children, className }: { children: React.ReactNode; className?: string }) {
  return <td className={`px-4 py-3 ${className || ""}`}>{children}</td>;
}
function EmptyRow({ cols, text }: { cols: number; text: string }) {
  return (
    <tr><td colSpan={cols} className="px-4 py-8 text-center text-muted-foreground text-xs">{text}</td></tr>
  );
}
function Line({ label, value, cl }: { label: string; value: number; cl: string }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-muted-foreground">{label}</span>
      <span className={`font-bold ${cl}`}>{value}</span>
    </div>
  );
}
