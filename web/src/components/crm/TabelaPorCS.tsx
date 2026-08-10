import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { setVisaoCs, useAtividades, useClientes, useReunioes } from "@/lib/crm/storage";
import { useCsList } from "@/lib/crm/equipe";
import { type Atividade, type CSName } from "@/lib/crm/types";

type Periodo = "semana" | "mes";

function periodRange(p: Periodo): [number, number] {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  if (p === "semana") {
    const day = today.getDay();
    const monday = new Date(today.getTime() - ((day + 6) % 7) * 86400000);
    return [monday.getTime(), monday.getTime() + 7 * 86400000];
  }
  return [
    new Date(now.getFullYear(), now.getMonth(), 1).getTime(),
    new Date(now.getFullYear(), now.getMonth() + 1, 1).getTime(),
  ];
}

function inRange(iso: string | undefined, r: [number, number]) {
  if (!iso) return false;
  const t = new Date(iso).getTime();
  return !isNaN(t) && t >= r[0] && t < r[1];
}

function isAtrasada(a: Atividade) {
  return (
    a.status !== "Concluída" &&
    new Date(a.data_prevista).getTime() < Date.now() - 86400000
  );
}

/** Tabela de desempenho por CS (movida da Torre de comando para a Visão Geral). */
export function TabelaPorCS() {
  const clientes = useClientes();
  const atividades = useAtividades();
  const reunioes = useReunioes();
  const navigate = useNavigate();
  // Lista reativa: o time chega do banco depois do 1º render.
  const csList = useCsList();
  const [periodo, setPeriodo] = useState<Periodo>("semana");
  const range = useMemo(() => periodRange(periodo), [periodo]);

  const linhas = useMemo(
    () =>
      csList.map((cs) => {
        const carteira = clientes.filter(
          (c) => c.responsavel_cs === cs && c.status === "Ativo",
        );
        const ats = atividades.filter((a) => a.cs_responsavel === cs);
        const concluidas = ats.filter(
          (a) => a.status === "Concluída" && inRange(a.data_conclusao, range),
        );
        const atrasadas = ats.filter(isAtrasada);
        const travadas = ats.filter((a) => a.status === "Impedida");
        const tocados = new Set<string>();
        concluidas.forEach((a) => a.cliente_id && tocados.add(a.cliente_id));
        reunioes
          .filter(
            (r) =>
              r.cs_responsavel === cs &&
              r.status === "Realizada" &&
              inRange(r.data, range) &&
              r.cliente_id,
          )
          .forEach((r) => tocados.add(r.cliente_id!));
        const carteiraIds = new Set(carteira.map((c) => c.id));
        const tocada = [...tocados].filter((id) => carteiraIds.has(id)).length;
        return {
          cs,
          carteira: carteira.length,
          concluidas: concluidas.length,
          atrasadas: atrasadas.length,
          travadas: travadas.length,
          tocada,
        };
      }),
    // csList na dependência: sem ela as linhas ficavam presas na lista vazia
    // do 1º render e a tabela nunca saía de "Carregando o time…".
    [clientes, atividades, reunioes, range, csList],
  );

  // No original o Meu Dia recebia a CS por query string. Aqui o recorte de
  // carteira é a "visão em foco" da sessão (sessao.setVisaoCs), então trocar a
  // visão antes de navegar é o que faz o Meu Dia abrir na carteira daquela CS.
  const irParaCS = (cs: CSName) => {
    setVisaoCs(cs);
    navigate("/crm/meu-dia");
  };

  return (
    <section>
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-xs font-bold uppercase tracking-[0.15em] text-muted-foreground">
          Desempenho por CS
        </h2>
        <div className="inline-flex bg-card border border-border rounded-xl p-1">
          {(["semana", "mes"] as Periodo[]).map((p) => (
            <button
              key={p}
              onClick={() => setPeriodo(p)}
              className={`px-3 py-1.5 text-xs rounded-lg transition-colors ${
                periodo === p
                  ? "bg-primary text-primary-foreground font-semibold"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {p === "semana" ? "Semana" : "Mês"}
            </button>
          ))}
        </div>
      </div>

      <div className="bg-card border border-border rounded-xl overflow-hidden">
        <div className="grid grid-cols-6 px-5 py-3 text-[11px] text-muted-foreground uppercase tracking-wider">
          <span>CS</span>
          <span className="text-right">Carteira</span>
          <span className="text-right">Concluídas</span>
          <span className="text-right">Atrasadas</span>
          <span className="text-right">Travadas</span>
          <span className="text-right">Tocada</span>
        </div>
        {linhas.length === 0 && (
          <div className="px-5 py-6 text-xs text-muted-foreground border-t border-border/60">
            Carregando o time…
          </div>
        )}
        {linhas.map((l) => (
          <button
            key={l.cs}
            onClick={() => irParaCS(l.cs)}
            className="w-full grid grid-cols-6 px-5 py-3.5 text-sm text-left border-t border-border/60 hover:bg-secondary/40 transition-colors"
            style={{ borderTopWidth: "0.5px" }}
          >
            <span className="font-semibold">{l.cs}</span>
            <span className="text-right">{l.carteira}</span>
            <span className="text-right">{l.concluidas}</span>
            <span
              className={`text-right ${l.atrasadas > 0 ? "text-[#E24B4A] font-semibold" : "text-muted-foreground"}`}
            >
              {l.atrasadas}
            </span>
            <span
              className={`text-right ${l.travadas > 0 ? "text-[#E24B4A] font-semibold" : "text-muted-foreground"}`}
            >
              {l.travadas}
            </span>
            <span className="text-right">
              {l.tocada} / {l.carteira}
            </span>
          </button>
        ))}
      </div>
    </section>
  );
}
