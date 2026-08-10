import { useMemo, useState } from "react";
import { X, CalendarPlus, SkipForward } from "lucide-react";
import { toast } from "sonner";
import { createAtividade, pularProxima } from "@/lib/crm/storage";
import { fromInputDate } from "@/lib/crm/format";
import {
  ACOES,
  CONSULTORES,
  ENTREGAS,
  type AtividadeStatus,
  type AtividadeTipo,
  type Cliente,
  type CSName,
  type Prioridade,
} from "@/lib/crm/types";

function addBusinessDays(date: Date, days: number): Date {
  const d = new Date(date);
  let added = 0;
  while (added < days) {
    d.setDate(d.getDate() + 1);
    const wd = d.getDay();
    if (wd !== 0 && wd !== 6) added++;
  }
  return d;
}

function tipoFromAcao(acao: string): AtividadeTipo {
  if (acao === "Agendar reunião" || acao === "Confirmar reunião") return "Reunião";
  if (acao === "Fazer follow-up no WhatsApp" || acao === "Aguardar resposta")
    return "Follow-up";
  if (acao === "Cobrar material" || acao === "Engajar cliente") return "Contato";
  return "Outro";
}

const PRIORIDADES: { value: Prioridade; emoji: string; label: string }[] = [
  { value: "Urgente", emoji: "🔴", label: "Urgente" },
  { value: "Médio", emoji: "🟡", label: "Médio" },
  { value: "Normal", emoji: "🟢", label: "Normal" },
];

export function NextActionModal({
  cliente,
  cs,
  concluidaId,
  defaultStatus,
  onClose,
}: {
  cliente: Cliente;
  cs: CSName;
  concluidaId: string;
  /** A próxima ação nasce "Pendente"; outro status é caso especial do chamador. */
  defaultStatus?: AtividadeStatus;
  onClose: () => void;
}) {
  const defaultDate = addBusinessDays(new Date(), 3).toISOString().slice(0, 10);
  const [step, setStep] = useState<"ask" | "form">("ask");
  const [entrega, setEntrega] = useState<string>("");
  const [entregaOutro, setEntregaOutro] = useState("");
  const [consultor, setConsultor] = useState("");
  const [acao, setAcao] = useState<string>("");
  const [acaoOutro, setAcaoOutro] = useState("");
  const [prioridade, setPrioridade] = useState<Prioridade>("Normal");
  const [data, setData] = useState(defaultDate);
  const [hora, setHora] = useState("");
  const [descricao, setDescricao] = useState("");
  const [motivoImpedimento, setMotivoImpedimento] = useState("");
  const [salvando, setSalvando] = useState(false);

  const status: AtividadeStatus = defaultStatus || "Pendente";
  // CHECK no banco rejeita status 'impedido' sem motivo — exigimos antes de enviar.
  const exigeMotivo = status === "Impedida";
  const motivoValid = !exigeMotivo || motivoImpedimento.trim().length > 0;

  const titulo = useMemo(() => {
    const a = acao === "Outro" ? acaoOutro.trim() : acao;
    let e = entrega === "Outro" ? entregaOutro.trim() : entrega;
    if (entrega === "Reunião com Consultor" && consultor)
      e = `Reunião com Consultor (${consultor})`;
    if (!a && !e) return "";
    return `${a || "—"} · ${e || "—"}`;
  }, [acao, acaoOutro, entrega, entregaOutro, consultor]);

  const entregaValid =
    !!entrega &&
    (entrega !== "Outro" || entregaOutro.trim().length > 0) &&
    (entrega !== "Reunião com Consultor" || !!consultor);
  const acaoValid = !!acao && (acao !== "Outro" || acaoOutro.trim().length > 0);
  const valid = entregaValid && acaoValid && motivoValid;

  async function agendar() {
    if (salvando) return;
    if (exigeMotivo && !motivoImpedimento.trim()) {
      toast.error("Atividade impedida exige o motivo do impedimento.");
      return;
    }
    if (!valid) return;
    const entregaDet =
      entrega === "Outro"
        ? entregaOutro.trim()
        : entrega === "Reunião com Consultor"
          ? consultor
          : undefined;
    const acaoDet = acao === "Outro" ? acaoOutro.trim() : undefined;
    setSalvando(true);
    try {
      await createAtividade({
        cliente_id: cliente.id,
        cs_responsavel: cs,
        titulo,
        tipo: tipoFromAcao(acao),
        prioridade,
        descricao,
        entrega,
        entrega_detalhe: entregaDet,
        acao,
        acao_detalhe: acaoDet,
        data_prevista: fromInputDate(data),
        hora: hora || undefined,
        status,
        motivo_impedimento: exigeMotivo ? motivoImpedimento.trim() : undefined,
      });
      onClose();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Não foi possível criar a atividade.");
    } finally {
      setSalvando(false);
    }
  }

  async function pular() {
    try {
      await pularProxima(concluidaId);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Não foi possível pular a próxima ação.");
    }
    onClose();
  }

  return (
    <div
      className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div
        className="bg-card border border-border rounded-lg p-6 w-full max-w-lg space-y-4 max-h-[92vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="text-[11px] uppercase tracking-wider text-status-green font-bold">
              ✓ Atividade concluída
            </div>
            <h3 className="text-lg font-bold mt-1">
              {step === "ask"
                ? "Você quer criar uma nova tarefa para esse cliente?"
                : "Nova tarefa para esse cliente"}
            </h3>
            <p className="text-sm text-muted-foreground">
              Cliente: <span className="font-semibold text-foreground">{cliente.nome}</span>
            </p>
          </div>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground">
            <X className="h-5 w-5" />
          </button>
        </div>

        {step === "ask" ? (
          <>
            <p className="text-sm text-muted-foreground">
              Selecione a atividade abaixo ou pule por enquanto.
            </p>
            <div className="flex flex-wrap justify-end gap-2 pt-2">
              <button
                onClick={() => void pular()}
                className="inline-flex items-center gap-1.5 px-4 py-2 text-sm rounded-lg border border-border text-muted-foreground hover:text-foreground"
              >
                <SkipForward className="h-3.5 w-3.5" /> Pular por agora
              </button>
              <button
                onClick={() => setStep("form")}
                className="inline-flex items-center gap-1.5 px-4 py-2 text-sm font-semibold rounded-lg bg-primary text-primary-foreground hover:bg-primary/90"
              >
                <CalendarPlus className="h-3.5 w-3.5" /> Sim, criar nova tarefa
              </button>
            </div>
          </>
        ) : (
        <>

        <div>
          <label className="block text-[10px] uppercase tracking-wider text-muted-foreground mb-1 font-semibold">
            Entrega *
          </label>
          <select
            value={entrega}
            onChange={(e) => setEntrega(e.target.value)}
            className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm"
          >
            <option value="">Selecione a entrega…</option>
            {ENTREGAS.map((e) => (
              <option key={e} value={e}>
                {e}
              </option>
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
              className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm"
            >
              <option value="">Selecione…</option>
              {CONSULTORES.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
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
              className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm"
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
            className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm"
          >
            <option value="">Selecione a ação…</option>
            {ACOES.map((a) => (
              <option key={a} value={a}>
                {a}
              </option>
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
              className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm"
            />
          </div>
        )}

        {titulo && (
          <div className="rounded-lg px-3 py-2 text-xs bg-background border border-border">
            <span className="text-muted-foreground">Título gerado: </span>
            <span className="font-bold text-primary">{titulo}</span>
          </div>
        )}

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
              className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm"
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
                  className={`py-2 rounded-lg text-xs font-semibold border ${
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
              Data
            </label>
            <input
              type="date"
              value={data}
              onChange={(e) => setData(e.target.value)}
              className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm"
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
              className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm"
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
            className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm"
          />
        </div>

        <div className="flex flex-wrap justify-end gap-2 pt-2">
          <button
            onClick={() => void pular()}
            className="inline-flex items-center gap-1.5 px-4 py-2 text-sm rounded-lg border border-border text-muted-foreground hover:text-foreground"
          >
            <SkipForward className="h-3.5 w-3.5" /> Pular por agora
          </button>
          <button
            onClick={() => void agendar()}
            disabled={!valid || salvando}
            className="inline-flex items-center gap-1.5 px-4 py-2 text-sm font-semibold rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
          >
            <CalendarPlus className="h-3.5 w-3.5" />{" "}
            {salvando ? "Agendando…" : "Agendar próxima ação"}
          </button>
        </div>
        </>
        )}
      </div>

    </div>
  );
}
