import { useMemo, useState, type ReactNode } from "react";
import {
  AlertTriangle,
  ArrowLeft,
  CheckCircle2,
  CircleDashed,
  ListChecks,
  Plus,
  Search,
  UserX,
} from "lucide-react";
import { toast } from "sonner";
import { useAtividades, updateProjeto, upsertAtividade } from "@/lib/crm/storage";
import type { Atividade, AtividadeStatus, Gargalo, Projeto } from "@/lib/crm/types";
import { NovaAtividadeModal } from "./NovaAtividadeModal";

const VERDE_LIMAO = "#DAFC67";
const VERDE = "#639922";
const LARANJA = "#D85A30";
const AMARELO = "#EF9F27";

type ChipId = "todos" | "Backlog" | "Em andamento" | "Concluído";

const CHIPS: { id: ChipId; label: string }[] = [
  { id: "todos", label: "Todos" },
  { id: "Backlog", label: "Backlog" },
  { id: "Em andamento", label: "Em andamento" },
  { id: "Concluído", label: "Concluídos" },
];

const ESTAGIOS: Projeto["estagio"][] = ["Backlog", "Em andamento", "Concluído"];

function dataCurta(iso?: string) {
  if (!iso) return "";
  const d = iso.slice(0, 10);
  return `${d.slice(8, 10)}/${d.slice(5, 7)}`;
}

function norm(s: string) {
  return s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

/** O estágio agora vai para crm_projetos (CHECK em `estagio`): erro precisa aparecer. */
function salvarProjeto(id: string, patch: Partial<Projeto>) {
  void updateProjeto(id, patch).catch((e: unknown) =>
    toast.error(`Não foi possível salvar o projeto: ${(e as Error).message}`),
  );
}

interface Props {
  projetos: Projeto[];
  gargalos: Gargalo[];
  chip: ChipId;
  busca: string;
  onChip: (c: ChipId) => void;
  onBusca: (q: string) => void;
  abertoId: string | null;
  onAbrir: (id: string | null) => void;
  onVerGargalo: (id: string) => void;
}

export function ProjetosCentral({
  projetos,
  gargalos,
  chip,
  busca,
  onChip,
  onBusca,
  abertoId,
  onAbrir,
  onVerGargalo,
}: Props) {
  const atividades = useAtividades();

  const gargaloDe = useMemo(() => {
    const m = new Map(gargalos.map((g) => [g.id, g]));
    return (id?: string) => (id ? m.get(id) : undefined);
  }, [gargalos]);

  const tarefasDe = useMemo(() => {
    const m = new Map<string, Atividade[]>();
    atividades.forEach((a) => {
      if (!a.projeto_id) return;
      const arr = m.get(a.projeto_id) ?? [];
      arr.push(a);
      m.set(a.projeto_id, arr);
    });
    return m;
  }, [atividades]);

  const aberto = abertoId ? projetos.find((p) => p.id === abertoId) : undefined;

  if (aberto) {
    return (
      <ProjetoDetalhe
        projeto={aberto}
        gargalo={gargaloDe(aberto.gargalo_id)}
        tarefas={tarefasDe.get(aberto.id) ?? []}
        onVoltar={() => onAbrir(null)}
        onVerGargalo={onVerGargalo}
      />
    );
  }

  const q = norm(busca.trim());
  const lista = projetos.filter((p) => {
    if (chip !== "todos" && p.estagio !== chip) return false;
    if (!q) return true;
    const g = gargaloDe(p.gargalo_id);
    const alvo = norm(
      [p.titulo, p.descricao ?? "", p.responsavel ?? "", p.time_executor, g?.problema ?? ""].join(" "),
    );
    return alvo.includes(q);
  });

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3 flex-wrap">
        <div className="flex items-center gap-1.5">
          {CHIPS.map((c) => (
            <button
              key={c.id}
              type="button"
              onClick={() => onChip(c.id)}
              className={`rounded-full px-3 py-1.5 text-xs ${
                chip === c.id
                  ? "bg-primary/15 text-foreground border border-primary/40"
                  : "border border-border text-muted-foreground hover:text-foreground"
              }`}
            >
              {c.label}
            </button>
          ))}
        </div>
        <div className="relative flex-1 min-w-[220px] max-w-sm">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
          <input
            value={busca}
            onChange={(e) => onBusca(e.target.value)}
            placeholder="Buscar por projeto, gargalo ou responsável"
            className="w-full rounded-lg bg-background border border-border pl-8 pr-3 py-1.5 text-xs outline-none focus:border-primary"
          />
        </div>
      </div>

      {lista.length === 0 ? (
        <p className="text-sm text-muted-foreground">Nenhum projeto encontrado.</p>
      ) : (
        <div
          className="grid items-stretch"
          style={{
            gap: 12,
            gridTemplateColumns: "repeat(auto-fill, minmax(240px, 1fr))",
            maxWidth: "calc(4 * 320px)",
          }}
        >
          {lista.map((p) => (
            <ProjetoCard
              key={p.id}
              projeto={p}
              gargalo={gargaloDe(p.gargalo_id)}
              tarefas={tarefasDe.get(p.id) ?? []}
              onClick={() => onAbrir(p.id)}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function contagem(tarefas: Atividade[]) {
  const total = tarefas.length;
  const feitas = tarefas.filter((a) => a.status === "Concluída").length;
  return { total, feitas, pct: total === 0 ? 0 : Math.round((feitas / total) * 100) };
}

function Indicador({ projeto, tarefas }: { projeto: Projeto; tarefas: Atividade[] }) {
  const { total, feitas } = contagem(tarefas);
  let Icon = ListChecks;
  let cor = AMARELO;
  let texto = `${feitas} de ${total} tarefas concluídas`;

  if (projeto.estagio === "Concluído") {
    Icon = CheckCircle2;
    cor = VERDE;
    texto = "Todas as tarefas concluídas";
  } else if (!projeto.responsavel || !projeto.responsavel.trim()) {
    Icon = UserX;
    cor = LARANJA;
    texto = "Sem responsável definido";
  } else if (total === 0 && !projeto.prazo) {
    Icon = CircleDashed;
    cor = LARANJA;
    texto = "Sem tarefas e sem prazo";
  }

  return (
    <div className="flex items-center gap-1.5 text-xs" style={{ color: cor }}>
      <Icon className="h-3.5 w-3.5 shrink-0" />
      <span className="truncate">{texto}</span>
    </div>
  );
}

function ProjetoCard({
  projeto,
  gargalo,
  tarefas,
  onClick,
}: {
  projeto: Projeto;
  gargalo?: Gargalo;
  tarefas: Atividade[];
  onClick: () => void;
}) {
  const { total, pct: pctCalc } = contagem(tarefas);
  const concluido = projeto.estagio === "Concluído";
  const pct = concluido ? 100 : pctCalc;
  const barra = concluido ? VERDE : VERDE_LIMAO;
  const mostrarBarra = concluido || total > 0;
  const timeADefinir = !projeto.responsavel || !projeto.responsavel.trim();

  return (
    <button
      type="button"
      onClick={onClick}
      className="flex h-full flex-col rounded-xl bg-card border border-border p-3 text-left hover:border-primary/40 transition-colors"
    >
      <div className="flex items-start justify-between gap-2">
        <h3 className="text-sm font-medium leading-snug">{projeto.titulo}</h3>
        <span className="shrink-0 rounded-full border border-border px-2 py-0.5 text-[10px] text-muted-foreground">
          {projeto.estagio}
        </span>
      </div>

      <div className="mt-1.5">
        <Indicador projeto={projeto} tarefas={tarefas} />
      </div>

      <p
        className="mt-1.5 text-xs text-muted-foreground line-clamp-2"
        style={{ minHeight: "2rem" }}
      >
        {gargalo ? `Gargalo: ${gargalo.problema}` : "\u00A0"}
      </p>

      <div className="mt-3">
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <span>Progresso</span>
          <span className="tabular-nums">{pct}%</span>
        </div>
        <div className="mt-1 h-1 w-full rounded-full bg-muted/40 overflow-hidden">
          {mostrarBarra && (
            <div className="h-full rounded-full" style={{ width: `${pct}%`, background: barra }} />
          )}
        </div>
      </div>

      <div
        className="mt-auto pt-2.5 flex items-center justify-between gap-2 text-xs text-muted-foreground"
        style={{ borderTop: "0.5px solid rgba(255,255,255,0.09)", marginTop: "auto" }}
      >
        <span className="truncate">
          {projeto.estagio === "Concluído" && projeto.concluido_em
            ? `Concluído ${dataCurta(projeto.concluido_em)}`
            : projeto.prazo
              ? `Prazo ${dataCurta(projeto.prazo)}`
              : "Sem prazo"}
        </span>
        <span className="truncate" style={timeADefinir ? { color: LARANJA } : undefined}>
          {timeADefinir ? projeto.time_executor : projeto.responsavel}
        </span>
      </div>
    </button>
  );
}

// ================= Detalhe =================

type GrupoId = "a_fazer" | "em_andamento" | "travadas" | "concluidas";

const GRUPOS: { id: GrupoId; label: string; cor: string }[] = [
  { id: "a_fazer", label: "A fazer", cor: LARANJA },
  { id: "em_andamento", label: "Em andamento", cor: AMARELO },
  { id: "travadas", label: "Travadas", cor: "#E24B4A" },
  { id: "concluidas", label: "Concluídas", cor: VERDE },
];

const STATUS_OPCOES: AtividadeStatus[] = [
  "Pendente",
  "Em andamento",
  "Aguardando cliente",
  "Aguardando time interno",
  "Impedida",
  "Concluída",
];

function grupoDe(a: Atividade): GrupoId {
  if (a.status === "Concluída") return "concluidas";
  if (a.status === "Impedida") return "travadas";
  if (a.status === "Em andamento") return "em_andamento";
  return "a_fazer";
}

function ProjetoDetalhe({
  projeto,
  gargalo,
  tarefas,
  onVoltar,
  onVerGargalo,
}: {
  projeto: Projeto;
  gargalo?: Gargalo;
  tarefas: Atividade[];
  onVoltar: () => void;
  onVerGargalo: (id: string) => void;
}) {
  const [novaAberta, setNovaAberta] = useState(false);
  const { total, feitas } = contagem(tarefas);
  const sugerirConcluir = total > 0 && feitas === total && projeto.estagio !== "Concluído";

  return (
    <div className="space-y-5">
      <button
        type="button"
        onClick={onVoltar}
        className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-3.5 w-3.5" /> Voltar aos projetos
      </button>

      <div className="rounded-xl bg-card border border-border p-4 space-y-3">
        <div className="flex items-start justify-between gap-3 flex-wrap">
          <div>
            <h2 className="text-lg font-semibold">{projeto.titulo}</h2>
            {projeto.descricao && (
              <p className="mt-1 text-sm text-muted-foreground">{projeto.descricao}</p>
            )}
          </div>
          <label className="flex items-center gap-2 text-xs text-muted-foreground">
            Estágio
            <select
              value={projeto.estagio}
              onChange={(e) => {
                const estagio = e.target.value as Projeto["estagio"];
                salvarProjeto(projeto.id, {
                  estagio,
                  concluido_em:
                    estagio === "Concluído"
                      ? (projeto.concluido_em ?? new Date().toISOString())
                      : undefined,
                });
              }}
              className="rounded-lg bg-background border border-border px-2 py-1.5 text-xs text-foreground outline-none focus:border-primary"
            >
              {ESTAGIOS.map((e) => (
                <option key={e} value={e}>
                  {e}
                </option>
              ))}
            </select>
          </label>
        </div>

        <div className="grid gap-2 sm:grid-cols-2 text-sm">
          <Linha rotulo="Gargalo de origem">
            {gargalo ? (
              <button
                type="button"
                onClick={() => onVerGargalo(gargalo.id)}
                className="text-primary underline underline-offset-2 text-left"
              >
                {gargalo.problema}
              </button>
            ) : (
              <span className="text-muted-foreground">sem gargalo vinculado</span>
            )}
          </Linha>
          <Linha rotulo="Time">{projeto.time_executor}</Linha>
          <Linha rotulo="Responsável">
            {projeto.responsavel || <span style={{ color: LARANJA }}>a definir</span>}
          </Linha>
          <Linha rotulo="Prazo">
            {projeto.prazo ? (
              dataCurta(projeto.prazo)
            ) : (
              <span className="text-muted-foreground">sem prazo</span>
            )}
          </Linha>
        </div>

        {sugerirConcluir && (
          <div
            className="flex items-center gap-2 rounded-lg border px-3 py-2 text-xs"
            style={{ borderColor: "rgba(218,252,103,0.35)", color: VERDE_LIMAO }}
          >
            <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
            Todas as atividades estão concluídas. Deseja mudar o estágio para "Concluído"?
            <button
              type="button"
              onClick={() =>
                salvarProjeto(projeto.id, {
                  estagio: "Concluído",
                  concluido_em: new Date().toISOString(),
                })
              }
              className="ml-auto rounded-md px-2 py-1 font-semibold"
              style={{ background: VERDE_LIMAO, color: "#111111" }}
            >
              Marcar concluído
            </button>
          </div>
        )}
      </div>

      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-base font-medium">Atividades vinculadas</h3>
          <button
            type="button"
            onClick={() => setNovaAberta(true)}
            className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground"
          >
            <Plus className="h-3.5 w-3.5" /> Nova atividade
          </button>
        </div>

        {tarefas.length === 0 ? (
          <p className="text-sm text-muted-foreground">Nenhuma atividade vinculada.</p>
        ) : (
          GRUPOS.map((g) => {
            const itens = tarefas.filter((a) => grupoDe(a) === g.id);
            if (itens.length === 0) return null;
            return (
              <div key={g.id} className="rounded-xl bg-card border border-border p-3">
                <div className="flex items-center gap-2 pb-1.5">
                  <span className="h-2 w-2 rounded-full" style={{ background: g.cor }} />
                  <span className="text-sm font-medium">{g.label}</span>
                  <span className="text-xs text-muted-foreground">{itens.length}</span>
                </div>
                {itens.map((a, i) => (
                  <LinhaTarefa key={a.id} a={a} grupo={g.id} first={i === 0} />
                ))}
              </div>
            );
          })
        )}
      </div>

      {novaAberta && (
        <NovaAtividadeModal
          projetoId={projeto.id}
          defaultTitulo={projeto.titulo}
          onClose={() => setNovaAberta(false)}
        />
      )}
    </div>
  );
}

function Linha({ rotulo, children }: { rotulo: string; children: ReactNode }) {
  return (
    <div className="flex gap-3">
      <span className="w-32 shrink-0 text-xs text-muted-foreground pt-0.5">{rotulo}</span>
      <span className="flex-1 text-sm min-w-0">{children}</span>
    </div>
  );
}

function LinhaTarefa({ a, grupo, first }: { a: Atividade; grupo: GrupoId; first: boolean }) {
  const [pedindoMotivo, setPedindoMotivo] = useState(false);
  const [motivo, setMotivo] = useState(a.motivo_impedimento ?? "");
  const [salvando, setSalvando] = useState(false);

  /**
   * "Quando se coloca que tá travado, tem um campo que deve colocar o motivo do
   * travamento" (coordenação). O banco reforça isso com um CHECK: status
   * 'impedido' sem motivo_impedimento é rejeitado. Por isso a guarda vive aqui
   * também — o select nunca escreve "Impedida" direto, sempre passa pelo campo.
   */
  const aplicar = async (status: AtividadeStatus, motivoTexto?: string) => {
    const texto = (motivoTexto ?? "").trim();
    if (status === "Impedida" && !texto) {
      toast.error("Informe o motivo do impedimento para travar a atividade.");
      return;
    }
    const next: Atividade = { ...a, status };
    if (status === "Concluída") next.data_conclusao = new Date().toISOString();
    else delete next.data_conclusao;
    if (status === "Impedida") next.motivo_impedimento = texto;
    else delete next.motivo_impedimento;

    setSalvando(true);
    try {
      await upsertAtividade(next);
      setPedindoMotivo(false);
    } catch (e) {
      toast.error(`Não foi possível salvar a atividade: ${(e as Error).message}`);
    } finally {
      setSalvando(false);
    }
  };

  return (
    <div style={{ borderTop: first ? "none" : "0.5px solid rgba(255,255,255,0.07)" }}>
      <div className="flex items-center gap-3 py-2 text-sm">
        <div className="flex-1 min-w-0">
          <span className="text-foreground truncate block">{a.titulo}</span>
          {grupo === "travadas" && a.motivo_impedimento && (
            <div className="text-xs text-muted-foreground mt-0.5">
              Motivo: {a.motivo_impedimento}
              {/* Editar o motivo sem sair de "Impedida" — o CHECK do banco
                  garante que ele nunca fica vazio depois. */}
              <button
                type="button"
                onClick={() => {
                  setMotivo(a.motivo_impedimento ?? "");
                  setPedindoMotivo(true);
                }}
                className="ml-2 underline underline-offset-2 hover:text-foreground"
              >
                editar
              </button>
            </div>
          )}
        </div>
        <select
          value={a.status === "Atrasada" ? "Pendente" : a.status}
          onChange={(e) => {
            const v = e.target.value as AtividadeStatus;
            if (v === "Impedida") {
              setMotivo(a.motivo_impedimento ?? "");
              setPedindoMotivo(true);
              return;
            }
            void aplicar(v);
          }}
          className="text-xs bg-transparent rounded-md px-2 h-[28px] text-foreground focus:outline-none focus:border-primary"
          style={{ border: "0.5px solid rgba(255,255,255,0.2)" }}
        >
          {STATUS_OPCOES.map((s) => (
            <option key={s} value={s} className="bg-card">
              {s}
            </option>
          ))}
        </select>
        <span className="w-[70px] text-right shrink-0 text-xs text-muted-foreground tabular-nums">
          {dataCurta(a.data_prevista)}
        </span>
        <span className="w-[120px] text-xs text-muted-foreground truncate shrink-0 text-right">
          {a.responsavel_nome || a.cs_responsavel}
        </span>
      </div>

      {pedindoMotivo && (
        <div className="flex items-center gap-2 pb-2">
          <input
            autoFocus
            value={motivo}
            onChange={(e) => setMotivo(e.target.value)}
            placeholder="Motivo do impedimento (obrigatório)"
            className="flex-1 text-xs bg-transparent rounded-md px-2 h-[28px] text-foreground focus:outline-none focus:border-primary"
            style={{ border: "0.5px solid rgba(255,255,255,0.2)" }}
          />
          <button
            type="button"
            disabled={!motivo.trim() || salvando}
            onClick={() => void aplicar("Impedida", motivo)}
            className="text-xs px-2 h-[28px] rounded-md font-semibold disabled:opacity-40"
            style={{ background: VERDE_LIMAO, color: "#111111" }}
          >
            Salvar
          </button>
          <button
            type="button"
            onClick={() => setPedindoMotivo(false)}
            className="text-xs px-2 h-[28px] rounded-md text-muted-foreground"
            style={{ border: "0.5px solid rgba(255,255,255,0.2)" }}
          >
            Cancelar
          </button>
        </div>
      )}
    </div>
  );
}

export type { ChipId as ProjetosChip };
