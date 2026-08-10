import { useEffect, useMemo, useState, type ReactNode } from "react";
import { Lightbulb, X } from "lucide-react";
import { toast } from "sonner";
import { updateGargalo, createProjeto, useAtividades } from "@/lib/crm/storage";
import type {
  AreaGargalo,
  Gargalo,
  GargaloPrioridade,
  GargaloStatus,
  Projeto,
  TimeExecutor,
} from "@/lib/crm/types";
import { AREAS_GARGALO, GARGALO_PRIORIDADE_LIST, GARGALO_STATUS_LIST, TIMES_EXECUTORES } from "@/lib/crm/types";

export type GargalosView = "painel" | "lista" | "kanban";
export type GargalosOrdem = "recente" | "antiga" | "prioridade";
export type GargalosPeriodo = "todo" | "7d" | "30d" | "90d";

export interface GargalosFiltros {
  area: string;
  status: string;
  prioridade: string;
  periodo: GargalosPeriodo;
  afeta: string;
  view: GargalosView;
  ordem: GargalosOrdem;
}

const AREA_COR: Record<AreaGargalo, string> = {
  Integração: "bg-zinc-500/20 text-zinc-300",
  "Mentores / Reuniões": "bg-sky-500/20 text-sky-300",
  "Conteúdos / Área de Membros": "bg-pink-500/20 text-pink-300",
  "Multiplica Time & Dono": "bg-amber-500/20 text-amber-300",
  "Sucesso do Cliente": "bg-emerald-500/20 text-emerald-300",
  "CRM / Implementação": "bg-red-500/20 text-red-300",
  Outro: "bg-zinc-500/20 text-zinc-300",
};

const STATUS_CONTORNO: Record<GargaloStatus, string> = {
  "Não iniciado": "border-border text-muted-foreground",
  "Em andamento": "border-amber-500/60 text-amber-300",
  "Em teste": "border-sky-500/60 text-sky-300",
  Realizado: "border-emerald-500/60 text-emerald-300",
};

const STATUS_NUMERO: Record<GargaloStatus, string> = {
  "Não iniciado": "text-foreground",
  "Em andamento": "text-amber-300",
  "Em teste": "text-sky-300",
  Realizado: "text-emerald-300",
};

const PRIORIDADE_PESO: Record<string, number> = { Alta: 0, Média: 1, Baixa: 2, Nenhuma: 3 };

function dataCurta(iso: string): string {
  const d = new Date(iso);
  return isNaN(d.getTime()) ? "—" : d.toLocaleDateString("pt-BR");
}

/**
 * O gargalo agora mora no Supabase: qualquer escrita pode falhar (RLS, CHECK
 * de status/prioridade). Sem o toast a CS mudava o status, via a UI voltar
 * sozinha no refetch e não sabia por quê.
 */
function salvarGargalo(id: string, patch: Partial<Gargalo>) {
  void updateGargalo(id, patch).catch((e: unknown) =>
    toast.error(`Não foi possível salvar o gargalo: ${(e as Error).message}`),
  );
}

export function filtrarGargalos(gargalos: Gargalo[], f: GargalosFiltros): Gargalo[] {
  const agora = Date.now();
  const dias = f.periodo === "7d" ? 7 : f.periodo === "30d" ? 30 : f.periodo === "90d" ? 90 : 0;
  const lista = gargalos.filter((g) => {
    if (f.area !== "todas" && g.area !== f.area) return false;
    if (f.status !== "todos" && g.status !== f.status) return false;
    if (f.prioridade !== "todas" && g.prioridade !== f.prioridade) return false;
    if (f.afeta === "sim" && g.afeta_entrega_cliente !== true) return false;
    if (f.afeta === "nao" && g.afeta_entrega_cliente === true) return false;
    if (dias > 0) {
      const t = new Date(g.data).getTime();
      if (isNaN(t) || agora - t > dias * 86400000) return false;
    }
    return true;
  });
  return [...lista].sort((a, b) => {
    if (f.ordem === "prioridade") {
      return (PRIORIDADE_PESO[a.prioridade] ?? 9) - (PRIORIDADE_PESO[b.prioridade] ?? 9);
    }
    const ta = new Date(a.data).getTime() || 0;
    const tb = new Date(b.data).getTime() || 0;
    return f.ordem === "antiga" ? ta - tb : tb - ta;
  });
}

export function GargalosCentral({
  gargalos,
  projetos,
  filtros,
  onFiltros,
  abrirId,
  onAbrirProjeto,
}: {
  gargalos: Gargalo[];
  projetos: Projeto[];
  filtros: GargalosFiltros;
  onFiltros: (patch: Partial<GargalosFiltros>) => void;
  abrirId?: string | null;
  onAbrirProjeto?: (id: string) => void;
}) {
  const [abertoId, setAbertoId] = useState<string | null>(null);

  useEffect(() => {
    if (abrirId) setAbertoId(abrirId);
  }, [abrirId]);

  const filtrados = useMemo(() => filtrarGargalos(gargalos, filtros), [gargalos, filtros]);
  const aberto = abertoId ? gargalos.find((g) => g.id === abertoId) : undefined;

  const contagem = useMemo(() => {
    const base = { total: gargalos.length } as Record<string, number>;
    for (const s of GARGALO_STATUS_LIST) base[s] = gargalos.filter((g) => g.status === s).length;
    return base;
  }, [gargalos]);

  return (
    <div className="space-y-4">
      {/* Filtros */}
      <div className="flex flex-wrap items-center gap-2">
        <Seletor
          value={filtros.area}
          onChange={(v) => onFiltros({ area: v })}
          options={[["todas", "Todas as áreas"], ...AREAS_GARGALO.map((a) => [a, a] as [string, string])]}
        />
        <Seletor
          value={filtros.status}
          onChange={(v) => onFiltros({ status: v })}
          options={[
            ["todos", "Todos os status"],
            ...GARGALO_STATUS_LIST.map((s) => [s, s] as [string, string]),
          ]}
        />
        <Seletor
          value={filtros.prioridade}
          onChange={(v) => onFiltros({ prioridade: v })}
          options={[
            ["todas", "Todas as prioridades"],
            ["Alta", "Alta"],
            ["Média", "Média"],
            ["Baixa", "Baixa"],
            ["Nenhuma", "Nenhuma"],
          ]}
        />
        <Seletor
          value={filtros.periodo}
          onChange={(v) => onFiltros({ periodo: v as GargalosPeriodo })}
          options={[
            ["todo", "Todo período"],
            ["7d", "Últimos 7 dias"],
            ["30d", "Últimos 30 dias"],
            ["90d", "Últimos 90 dias"],
          ]}
        />
        <Seletor
          value={filtros.afeta}
          onChange={(v) => onFiltros({ afeta: v })}
          options={[
            ["todos", "Afeta entrega: todos"],
            ["sim", "Afeta entrega: sim"],
            ["nao", "Afeta entrega: não"],
          ]}
        />
      </div>

      {/* Alternador de visualização */}
      <div className="inline-flex rounded-lg border border-border p-0.5">
        {(
          [
            ["painel", "Painel"],
            ["lista", "Lista"],
            ["kanban", "Kanban"],
          ] as [GargalosView, string][]
        ).map(([v, label]) => (
          <button
            key={v}
            onClick={() => onFiltros({ view: v })}
            className={`rounded-md px-3 py-1.5 text-xs ${
              filtros.view === v
                ? "bg-primary text-primary-foreground"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Painel de status */}
      <div className="grid gap-3 grid-cols-2 sm:grid-cols-3 lg:grid-cols-5">
        <CardStatus
          rotulo="Total"
          valor={contagem.total}
          ativo={filtros.status === "todos"}
          onClick={() => onFiltros({ status: "todos" })}
        />
        {GARGALO_STATUS_LIST.map((s) => (
          <CardStatus
            key={s}
            rotulo={s}
            valor={contagem[s] ?? 0}
            cor={STATUS_NUMERO[s]}
            ativo={filtros.status === s}
            onClick={() => onFiltros({ status: filtros.status === s ? "todos" : s })}
          />
        ))}
      </div>

      {/* Cabeçalho da lista */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <h2 className="text-sm font-medium">Todos os registros ({filtrados.length})</h2>
        <Seletor
          value={filtros.ordem}
          onChange={(v) => onFiltros({ ordem: v as GargalosOrdem })}
          options={[
            ["recente", "Data (recente)"],
            ["antiga", "Data (antiga)"],
            ["prioridade", "Prioridade"],
          ]}
        />
      </div>

      {filtrados.length === 0 && (
        <p className="text-sm text-muted-foreground">Nenhum registro nestes filtros.</p>
      )}

      {filtros.view === "lista" ? (
        <Tabela gargalos={filtrados} onOpen={setAbertoId} />
      ) : filtros.view === "kanban" ? (
        <Kanban gargalos={filtrados} onOpen={setAbertoId} />
      ) : (
        <div
          className="grid gap-3 items-stretch"
          style={{ gridTemplateColumns: "repeat(auto-fill, minmax(240px, 1fr))" }}
        >
          {filtrados.map((g) => (
            <GargaloCard key={g.id} g={g} onOpen={() => setAbertoId(g.id)} />
          ))}
        </div>
      )}

      {aberto && (
        <GargaloDetalhe
          g={aberto}
          projeto={aberto.projeto_id ? projetos.find((p) => p.id === aberto.projeto_id) : undefined}
          onClose={() => setAbertoId(null)}
          onAbrirProjeto={onAbrirProjeto}
        />
      )}
    </div>
  );
}

function CardStatus({
  rotulo,
  valor,
  cor,
  ativo,
  onClick,
}: {
  rotulo: string;
  valor: number;
  cor?: string;
  ativo?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={`rounded-xl border bg-card px-3 py-2.5 text-left ${
        ativo ? "border-primary" : "border-border hover:border-muted-foreground/40"
      }`}
    >
      <div className={`text-[22px] leading-tight font-semibold ${cor ?? "text-foreground"}`}>{valor}</div>
      <div className="text-[12px] text-muted-foreground">{rotulo}</div>
    </button>
  );
}

function GargaloCard({ g, onOpen, compacto }: { g: Gargalo; onOpen: () => void; compacto?: boolean }) {
  return (
    <article
      onClick={onOpen}
      className="flex cursor-pointer flex-col rounded-xl border border-border bg-card p-3 hover:border-muted-foreground/40"
    >
      <div className="flex flex-wrap items-center gap-1">
        <span className={`rounded-md px-1.5 py-0.5 text-[10px] ${AREA_COR[g.area]}`}>{g.area}</span>
        <span
          className={`rounded-md border px-1.5 py-0.5 text-[10px] ${STATUS_CONTORNO[g.status]}`}
        >
          {g.status}
        </span>
        {g.prioridade === "Alta" && (
          <span className="rounded-md bg-red-500/20 px-1.5 py-0.5 text-[10px] text-red-300">Alta</span>
        )}
        {g.afeta_entrega_cliente && (
          <span className="rounded-md bg-amber-500/20 px-1.5 py-0.5 text-[10px] text-amber-300">
            Afeta entrega
          </span>
        )}
      </div>

      <h3 className="mt-2 text-[14px] font-medium leading-snug">{g.problema}</h3>

      {g.solucao && (
        <p className="mt-1.5 flex flex-1 items-start gap-1.5 text-[12px] text-muted-foreground">
          <Lightbulb className="mt-0.5 h-3.5 w-3.5 shrink-0" />
          <span>{g.solucao}</span>
        </p>
      )}

      {!compacto && (
        <footer className="mt-auto border-t border-border pt-2 text-[12px] text-muted-foreground">
          {dataCurta(g.data)} · {g.quem_vai_executar}
          {g.pessoas_atribuidas && g.pessoas_atribuidas.length > 0
            ? ` · ${g.pessoas_atribuidas.join(", ")}`
            : ""}
        </footer>
      )}
    </article>
  );
}

function Tabela({ gargalos, onOpen }: { gargalos: Gargalo[]; onOpen: (id: string) => void }) {
  return (
    <div className="overflow-x-auto rounded-xl border border-border">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-border text-left text-xs text-muted-foreground">
            <th className="px-3 py-2 font-normal">Problema</th>
            <th className="px-3 py-2 font-normal">Área</th>
            <th className="px-3 py-2 font-normal">Status</th>
            <th className="px-3 py-2 font-normal">Prioridade</th>
            <th className="px-3 py-2 font-normal">Quem executa</th>
            <th className="px-3 py-2 font-normal">Data</th>
          </tr>
        </thead>
        <tbody>
          {gargalos.map((g) => (
            <tr
              key={g.id}
              onClick={() => onOpen(g.id)}
              className="cursor-pointer border-b border-border last:border-0 hover:bg-muted/30"
            >
              <td className="px-3 py-2">{g.problema}</td>
              <td className="px-3 py-2">
                <span className={`rounded-md px-1.5 py-0.5 text-[11px] ${AREA_COR[g.area]}`}>{g.area}</span>
              </td>
              <td className="px-3 py-2">
                <span className={`rounded-md border px-1.5 py-0.5 text-[11px] ${STATUS_CONTORNO[g.status]}`}>
                  {g.status}
                </span>
              </td>
              <td className="px-3 py-2 text-muted-foreground">{g.prioridade}</td>
              <td className="px-3 py-2 text-muted-foreground">{g.quem_vai_executar}</td>
              <td className="px-3 py-2 text-muted-foreground">{dataCurta(g.data)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function Kanban({ gargalos, onOpen }: { gargalos: Gargalo[]; onOpen: (id: string) => void }) {
  const [sobre, setSobre] = useState<GargaloStatus | null>(null);
  return (
    <div className="grid gap-3 md:grid-cols-4">
      {GARGALO_STATUS_LIST.map((s) => {
        const itens = gargalos.filter((g) => g.status === s);
        return (
          <div
            key={s}
            onDragOver={(e) => {
              e.preventDefault();
              setSobre(s);
            }}
            onDragLeave={() => setSobre((cur) => (cur === s ? null : cur))}
            onDrop={(e) => {
              e.preventDefault();
              setSobre(null);
              const id = e.dataTransfer.getData("text/plain");
              if (id) salvarGargalo(id, { status: s });
            }}
            className={`rounded-xl border p-2 ${sobre === s ? "border-primary" : "border-border"}`}
          >
            <div className="mb-2 flex items-center justify-between px-1 text-xs text-muted-foreground">
              <span>{s}</span>
              <span>{itens.length}</span>
            </div>
            <div className="space-y-2">
              {itens.map((g) => (
                <div
                  key={g.id}
                  draggable
                  onDragStart={(e) => e.dataTransfer.setData("text/plain", g.id)}
                >
                  <GargaloCard g={g} onOpen={() => onOpen(g.id)} compacto />
                </div>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}

function GargaloDetalhe({
  g,
  projeto,
  onClose,
  onAbrirProjeto,
}: {
  g: Gargalo;
  projeto?: Projeto;
  onClose: () => void;
  onAbrirProjeto?: (id: string) => void;
}) {
  const [modal, setModal] = useState(false);
  const atividades = useAtividades();

  const tarefas = projeto ? atividades.filter((a) => a.projeto_id === projeto.id) : [];
  const feitas = tarefas.filter((a) => a.status === "Concluída").length;
  const pct =
    projeto?.estagio === "Concluído"
      ? 100
      : tarefas.length === 0
        ? 0
        : Math.round((feitas / tarefas.length) * 100);

  // Criar o projeto e vinculá-lo ao gargalo são duas escritas: se a segunda
  // falhar o projeto existe órfão, então o erro precisa aparecer.
  const criar = async (dados: { titulo: string; descricao: string; time: TimeExecutor }) => {
    try {
      const p = await createProjeto({
        titulo: dados.titulo,
        descricao: dados.descricao || undefined,
        gargalo_id: g.id,
        estagio: "Backlog",
        time_executor: dados.time,
      });
      await updateGargalo(g.id, { projeto_id: p.id });
      setModal(false);
    } catch (e) {
      toast.error(`Não foi possível criar o projeto: ${(e as Error).message}`);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/60" onClick={onClose}>
      <aside
        onClick={(e) => e.stopPropagation()}
        className="h-full w-full max-w-md overflow-y-auto border-l border-border bg-card"
      >
        <header className="flex items-start justify-between gap-3 border-b border-border px-4 py-3">
          <h2 className="text-base font-medium leading-snug">{g.problema}</h2>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground">
            <X className="h-4 w-4" />
          </button>
        </header>

        <div className="space-y-4 p-4">
          <div className="flex flex-wrap items-center gap-1.5">
            <span className={`rounded-md px-1.5 py-0.5 text-[11px] ${AREA_COR[g.area]}`}>
              {g.area === "Outro" && g.area_outro ? g.area_outro : g.area}
            </span>
            <span className={`rounded-md border px-1.5 py-0.5 text-[11px] ${STATUS_CONTORNO[g.status]}`}>
              {g.status}
            </span>
            <span className="rounded-md border border-border px-1.5 py-0.5 text-[11px] text-muted-foreground">
              {g.prioridade}
            </span>
            {g.afeta_entrega_cliente && (
              <span className="rounded-md bg-amber-500/20 px-1.5 py-0.5 text-[11px] text-amber-300">
                Afeta entrega
              </span>
            )}
          </div>

          <section>
            <h3 className="text-xs uppercase tracking-wide text-muted-foreground">Problema</h3>
            <p className="mt-1 text-sm">{g.problema}</p>
            {g.detalhes_problema && (
              <p className="mt-1 text-sm text-muted-foreground">{g.detalhes_problema}</p>
            )}
          </section>

          <section>
            <h3 className="text-xs uppercase tracking-wide text-muted-foreground">Solução</h3>
            <p className="mt-1 flex items-start gap-1.5 text-sm">
              <Lightbulb className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
              <span>{g.solucao || "Solução não definida"}</span>
            </p>
            {g.detalhes_solucao && (
              <p className="mt-1 pl-6 text-sm text-muted-foreground">{g.detalhes_solucao}</p>
            )}
          </section>

          <dl className="grid grid-cols-2 gap-x-3 gap-y-3 border-t border-border pt-3">
            <Dado rotulo="Quem trouxe">
              {g.quem_trouxe === "Outro" && g.quem_trouxe_outro ? g.quem_trouxe_outro : g.quem_trouxe}
            </Dado>
            <Dado rotulo="Registrado por">{g.registrado_por}</Dado>
            <Dado rotulo="Quem vai executar">
              {g.quem_vai_executar === "Outro" && g.quem_vai_executar_outro
                ? g.quem_vai_executar_outro
                : g.quem_vai_executar}
            </Dado>
            <Dado rotulo="Data">{dataCurta(g.data)}</Dado>
            <Dado rotulo="Status">
              <select
                value={g.status}
                onChange={(e) => salvarGargalo(g.id, { status: e.target.value as GargaloStatus })}
                className="w-full rounded-lg border border-border bg-background px-2 py-1.5 text-sm outline-none focus:border-primary"
              >
                {GARGALO_STATUS_LIST.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            </Dado>
            <Dado rotulo="Prioridade">
              <select
                value={g.prioridade}
                onChange={(e) =>
                  salvarGargalo(g.id, { prioridade: e.target.value as GargaloPrioridade })
                }
                className="w-full rounded-lg border border-border bg-background px-2 py-1.5 text-sm outline-none focus:border-primary"
              >
                {GARGALO_PRIORIDADE_LIST.map((p) => (
                  <option key={p} value={p}>
                    {p}
                  </option>
                ))}
              </select>
            </Dado>
          </dl>

          <div className="border-t border-border pt-3">
            {projeto ? (
              <button
                type="button"
                onClick={() => onAbrirProjeto?.(projeto.id)}
                className="w-full rounded-xl border border-border bg-background p-3 text-left hover:border-muted-foreground/40"
              >
                <div className="flex items-start justify-between gap-2">
                  <span className="text-sm font-medium">{projeto.titulo}</span>
                  <span className="rounded-md border border-border px-1.5 py-0.5 text-[11px] text-muted-foreground">
                    {projeto.estagio}
                  </span>
                </div>
                <div className="mt-2 flex items-center justify-between text-[12px] text-muted-foreground">
                  <span>Progresso</span>
                  <span>{pct}%</span>
                </div>
                <div className="mt-1 h-1 w-full rounded-full bg-border">
                  <div
                    className="h-1 rounded-full"
                    style={{
                      width: `${pct}%`,
                      backgroundColor: projeto.estagio === "Concluído" ? "#639922" : "#DAFC67",
                    }}
                  />
                </div>
              </button>
            ) : (
              <button
                onClick={() => setModal(true)}
                className="rounded-lg bg-primary px-3 py-2 text-sm font-medium text-primary-foreground"
              >
                Virar projeto
              </button>
            )}
          </div>
        </div>
      </aside>

      {modal && (
        <VirarProjetoModal
          g={g}
          onClose={() => setModal(false)}
          onCriar={(d) => void criar(d)}
        />
      )}
    </div>
  );
}

function VirarProjetoModal({
  g,
  onClose,
  onCriar,
}: {
  g: Gargalo;
  onClose: () => void;
  onCriar: (d: { titulo: string; descricao: string; time: TimeExecutor }) => void;
}) {
  const [titulo, setTitulo] = useState(g.solucao || g.problema);
  const [descricao, setDescricao] = useState(g.detalhes_solucao ?? "");
  const [time, setTime] = useState<TimeExecutor>(g.quem_vai_executar);

  return (
    <div
      className="fixed inset-0 z-[60] flex items-start justify-center overflow-y-auto bg-black/60 p-6"
      onClick={(e) => {
        e.stopPropagation();
        onClose();
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-md rounded-xl border border-border bg-card"
      >
        <header className="flex items-center justify-between border-b border-border px-4 py-3">
          <h2 className="text-sm font-medium">Virar projeto</h2>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground">
            <X className="h-4 w-4" />
          </button>
        </header>

        <div className="space-y-3 p-4">
          <label className="block space-y-1">
            <span className="text-xs text-muted-foreground">Título do projeto</span>
            <input
              value={titulo}
              onChange={(e) => setTitulo(e.target.value)}
              className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary"
            />
          </label>

          <label className="block space-y-1">
            <span className="text-xs text-muted-foreground">Descrição</span>
            <textarea
              value={descricao}
              onChange={(e) => setDescricao(e.target.value)}
              rows={3}
              className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary"
            />
          </label>

          <label className="block space-y-1">
            <span className="text-xs text-muted-foreground">Time</span>
            <select
              value={time}
              onChange={(e) => setTime(e.target.value as TimeExecutor)}
              className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary"
            >
              {TIMES_EXECUTORES.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
          </label>

          <div className="grid grid-cols-2 gap-3">
            <label className="block space-y-1">
              <span className="text-xs text-muted-foreground">Responsável</span>
              <input
                disabled
                placeholder="A definir pelo time"
                className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-muted-foreground"
              />
            </label>
            <label className="block space-y-1">
              <span className="text-xs text-muted-foreground">Prazo</span>
              <input
                disabled
                placeholder="A definir"
                className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-muted-foreground"
              />
            </label>
          </div>
          <p className="text-[11px] text-muted-foreground">
            Responsável e prazo ficam em branco: o time recebe no backlog e define depois.
          </p>
        </div>

        <footer className="flex items-center justify-end gap-2 border-t border-border px-4 py-3">
          <button
            onClick={onClose}
            className="rounded-lg border border-border px-3 py-2 text-sm text-muted-foreground hover:text-foreground"
          >
            Cancelar
          </button>
          <button
            onClick={() => onCriar({ titulo: titulo.trim(), descricao: descricao.trim(), time })}
            disabled={titulo.trim().length < 3}
            className="rounded-lg bg-primary px-3 py-2 text-sm font-medium text-primary-foreground disabled:opacity-40"
          >
            Criar projeto
          </button>
        </footer>
      </div>
    </div>
  );
}

function Dado({ rotulo, children }: { rotulo: string; children: ReactNode }) {
  return (
    <div className="space-y-1">
      <dt className="text-xs text-muted-foreground">{rotulo}</dt>
      <dd className="text-sm">{children}</dd>
    </div>
  );
}

function Seletor({
  value,
  onChange,
  options,
}: {
  value: string;
  onChange: (v: string) => void;
  options: [string, string][];
}) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="rounded-lg border border-border bg-card px-3 py-1.5 text-xs outline-none focus:border-primary"
    >
      {options.map(([v, label]) => (
        <option key={v} value={v}>
          {label}
        </option>
      ))}
    </select>
  );
}
