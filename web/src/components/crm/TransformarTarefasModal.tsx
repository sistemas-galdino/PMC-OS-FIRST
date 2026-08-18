import { useMemo, useState, type ReactNode } from "react";
import { X, Plus, Trash2, Check, User, Users, ClipboardPaste, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { createAtividade, createAtividadesLote, useClientes } from "@/lib/crm/storage";
import type { Atividade, AtividadeTipo, CSName, Prioridade } from "@/lib/crm/types";
import { ACOES } from "@/lib/crm/types";
import { analisarTranscricao, type AnaliseTranscricao } from "@/lib/crm/ia";

type Lado = "cs" | "cliente";

interface DraftTarefa {
  id: string;
  lado: Lado;
  titulo: string;
  acao: string;
  /** p/ lado cliente: nome do responsável (ex: "Guardião da IA — João"). Vazio = usa o padrão do cliente. */
  responsavel: string;
  cliente_id: string;
  data_prevista: string;
  hora: string;
  prioridade: Prioridade;
  /** Prazo citado na reunião em texto livre ("até sexta"). Só dica, nunca vira data sozinho. */
  prazoSugerido?: string;
}

export interface PassoExtraido {
  texto: string;
  responsavel?: string;
}

export interface PassosSeparados {
  cs: PassoExtraido[];
  cliente: PassoExtraido[];
}

const PRIORIDADES: Prioridade[] = ["Urgente", "Médio", "Normal"];

/** Extrai itens dos blocos "## Próximos passos — CS" e "## Próximos passos — Cliente".
 *  Compatível com o formato antigo "## Próximos passos" (tudo vira CS).
 */
export function extrairProximosPassosSeparados(md: string): PassosSeparados {
  const out: PassosSeparados = { cs: [], cliente: [] };
  if (!md) return out;
  const lines = md.split(/\r?\n/);
  let bucket: Lado | null = null;
  for (const raw of lines) {
    const line = raw.trim();
    const h = line.match(/^##\s+(.+)$/);
    if (h) {
      const t = h[1].toLowerCase();
      if (/próximos\s+passos/.test(t)) {
        if (/cliente/.test(t)) bucket = "cliente";
        else bucket = "cs";
      } else {
        bucket = null;
      }
      continue;
    }
    if (!bucket) continue;
    if (!line || line === "—") continue;
    const m = line.match(/^(?:[-*]\s+(?:\[[ xX]\]\s+)?|\d+\.\s+)(.+)$/);
    if (!m) continue;
    const raw2 = m[1].trim();
    if (bucket === "cliente") {
      const respMatch = raw2.match(/respons[áa]vel\s*:\s*([^—\-·]+)/i);
      const responsavel = respMatch?.[1]?.trim();
      const texto = raw2
        .replace(/—?\s*respons[áa]vel\s*:\s*[^—\-·]+/i, "")
        .trim();
      out.cliente.push({ texto: texto || raw2, responsavel });
    } else {
      out.cs.push({ texto: raw2 });
    }
  }
  return out;
}

/** Mantido para compat com callers antigos. */
export function extrairProximosPassos(md: string): string[] {
  const s = extrairProximosPassosSeparados(md);
  return [...s.cs.map((p) => p.texto), ...s.cliente.map((p) => p.texto)];
}

function uid() {
  return Math.random().toString(36).slice(2, 10);
}

function todayISO(offsetDays = 1) {
  const d = new Date();
  d.setDate(d.getDate() + offsetDays);
  d.setHours(12, 0, 0, 0);
  return d.toISOString();
}

function toDateInputValue(iso: string) {
  const d = new Date(iso);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function fromDateInputValue(v: string, hora: string): string {
  const [y, m, day] = v.split("-").map((x) => parseInt(x, 10));
  const [hh, mm] = (hora || "12:00").split(":").map((x) => parseInt(x, 10) || 0);
  const d = new Date(y, (m || 1) - 1, day || 1, hh, mm, 0, 0);
  return d.toISOString();
}

export function TransformarTarefasModal({
  passos,
  passosSeparados,
  transcricaoInicial,
  clienteIdDefault,
  csResponsavel,
  reuniaoTitulo,
  onClose,
}: {
  /** legado: lista única — cai tudo em CS */
  passos?: string[];
  passosSeparados?: PassosSeparados;
  /** Transcrição já registrada da reunião: abre o painel de IA preenchido. */
  transcricaoInicial?: string;
  clienteIdDefault: string | null;
  csResponsavel: CSName;
  reuniaoTitulo: string;
  onClose: () => void;
}) {
  const clientes = useClientes();
  const clienteDefault = clientes.find((c) => c.id === clienteIdDefault) ?? null;
  const guardiaoDefault = clienteDefault?.guardiao_ia
    ? clienteDefault.guardiao_ia_nome?.trim()
      ? `Guardião da IA — ${clienteDefault.guardiao_ia_nome.trim()}`
      : "Guardião da IA"
    : clienteDefault?.nome ?? "Cliente";

  // Os rascunhos são semeados uma única vez. Como a lista de clientes agora
  // chega do banco depois do 1º render, o responsável do lado cliente fica
  // vazio aqui e só é resolvido na hora de exibir/salvar (respDe) — se fosse
  // congelado na semeadura viraria sempre "Cliente".
  const initial: DraftTarefa[] = useMemo(() => {
    const src: PassosSeparados =
      passosSeparados ??
      (passos ? { cs: passos.map((t) => ({ texto: t })), cliente: [] } : { cs: [], cliente: [] });
    const cs = src.cs.map<DraftTarefa>((p) => ({
      id: uid(),
      lado: "cs",
      titulo: p.texto,
      acao: "",
      responsavel: csResponsavel,
      cliente_id: clienteIdDefault ?? "",
      data_prevista: todayISO(1),
      hora: "",
      prioridade: "Normal",
    }));
    const cli = src.cliente.map<DraftTarefa>((p) => ({
      id: uid(),
      lado: "cliente",
      titulo: p.texto,
      acao: "",
      responsavel: p.responsavel?.trim() || "",
      cliente_id: clienteIdDefault ?? "",
      data_prevista: todayISO(2),
      hora: "",
      prioridade: "Normal",
    }));
    return [...cs, ...cli];
  }, [passos, passosSeparados, clienteIdDefault, csResponsavel]);

  const [rascunhos, setRascunhos] = useState<DraftTarefa[]>(initial);
  const [tab, setTab] = useState<Lado>("cs");
  const [salvando, setSalvando] = useState(false);
  // Dois caminhos para chegar aos rascunhos: colar a ata já organizada, ou
  // colar a transcrição bruta e deixar a IA separar. Os dois desembocam no
  // mesmo lugar — esta lista editável —, porque nada vira tarefa sem alguém
  // conferir. Essa foi a exigência da reunião de 05/08/2026.
  const [colando, setColando] = useState(initial.length === 0 || !!transcricaoInicial);
  const [modoEntrada, setModoEntrada] = useState<"ata" | "transcricao">(
    transcricaoInicial ? "transcricao" : "ata",
  );
  const [textoColado, setTextoColado] = useState(transcricaoInicial ?? "");
  const [analisando, setAnalisando] = useState(false);
  const [resumoIA, setResumoIA] = useState<AnaliseTranscricao | null>(null);

  function respDe(r: DraftTarefa) {
    return r.responsavel || guardiaoDefault;
  }

  const clientesOrdenados = useMemo(
    () => [...clientes].sort((a, b) => a.nome.localeCompare(b.nome)),
    [clientes],
  );

  const csCount = rascunhos.filter((r) => r.lado === "cs").length;
  const cliCount = rascunhos.filter((r) => r.lado === "cliente").length;
  const visiveis = rascunhos.filter((r) => r.lado === tab);

  function atualizar(id: string, patch: Partial<DraftTarefa>) {
    setRascunhos((cur) => cur.map((r) => (r.id === id ? { ...r, ...patch } : r)));
  }

  function remover(id: string) {
    setRascunhos((cur) => cur.filter((r) => r.id !== id));
  }

  function adicionar() {
    setRascunhos((cur) => [
      ...cur,
      {
        id: uid(),
        lado: tab,
        titulo: "",
        acao: "",
        responsavel: tab === "cs" ? csResponsavel : "",
        cliente_id: clienteIdDefault ?? "",
        data_prevista: todayISO(1),
        hora: "",
        prioridade: "Normal",
      },
    ]);
  }

  /** Converte o texto colado em rascunhos editáveis — nada é gravado aqui. */
  function extrairDoTexto() {
    const src = extrairProximosPassosSeparados(textoColado);
    if (src.cs.length === 0 && src.cliente.length === 0) {
      toast.error(
        'Nenhum item encontrado. Use os blocos "## Próximos passos — CS" e "## Próximos passos — Cliente" com itens em lista.',
      );
      return;
    }
    const novos: DraftTarefa[] = [
      ...src.cs.map<DraftTarefa>((p) => ({
        id: uid(),
        lado: "cs",
        titulo: p.texto,
        acao: "",
        responsavel: csResponsavel,
        cliente_id: clienteIdDefault ?? "",
        data_prevista: todayISO(1),
        hora: "",
        prioridade: "Normal",
      })),
      ...src.cliente.map<DraftTarefa>((p) => ({
        id: uid(),
        lado: "cliente",
        titulo: p.texto,
        acao: "",
        responsavel: p.responsavel?.trim() || "",
        cliente_id: clienteIdDefault ?? "",
        data_prevista: todayISO(2),
        hora: "",
        prioridade: "Normal",
      })),
    ];
    setRascunhos((cur) => [...cur, ...novos]);
    setTextoColado("");
    setColando(false);
    setTab(src.cs.length > 0 ? "cs" : "cliente");
    toast.success(`${novos.length} item${novos.length === 1 ? "" : "s"} para revisar.`);
  }

  /** Manda a transcrição para a IA e transforma o retorno em rascunhos. Nada é gravado. */
  async function analisarComIA() {
    const bruto = textoColado.trim();
    if (bruto.length < 40 || analisando) return;
    setAnalisando(true);
    try {
      const r = await analisarTranscricao({
        transcricao: bruto,
        titulo: reuniaoTitulo,
        cliente: clienteDefault?.nome,
        csNome: csResponsavel,
      });
      setResumoIA(r);
      if (!r.reuniao_realizada) {
        toast.error(r.motivo_nao_realizada || "A IA não identificou uma reunião nesse texto.");
        return;
      }
      const novos: DraftTarefa[] = [
        ...r.passos.cs.map<DraftTarefa>((p) => ({
          id: uid(),
          lado: "cs",
          titulo: p.texto,
          acao: "",
          responsavel: csResponsavel,
          cliente_id: clienteIdDefault ?? "",
          data_prevista: todayISO(1),
          hora: "",
          prioridade: "Normal",
          prazoSugerido: p.prazo,
        })),
        ...r.passos.cliente.map<DraftTarefa>((p) => ({
          id: uid(),
          lado: "cliente",
          titulo: p.texto,
          acao: "",
          responsavel: p.responsavel?.trim() || "",
          cliente_id: clienteIdDefault ?? "",
          data_prevista: todayISO(2),
          hora: "",
          prioridade: "Normal",
          prazoSugerido: p.prazo,
        })),
      ];
      if (novos.length === 0) {
        toast.error("A IA não encontrou próximos passos nessa transcrição.");
        return;
      }
      setRascunhos((cur) => [...cur, ...novos]);
      setTextoColado("");
      setColando(false);
      setTab(r.passos.cs.length > 0 ? "cs" : "cliente");
      toast.success(`${novos.length} item${novos.length === 1 ? "" : "s"} para revisar.`);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Não foi possível analisar a transcrição.");
    } finally {
      setAnalisando(false);
    }
  }

  async function submeter() {
    if (salvando) return;
    const validos = rascunhos.filter((r) => r.titulo.trim() && r.cliente_id);
    if (validos.length === 0) {
      toast.error("Preencha ao menos um título e selecione o cliente.");
      return;
    }
    const itens: Omit<Atividade, "id">[] = validos.map((r) => {
      const descricaoParts = [
        `Origem: reunião "${reuniaoTitulo}"`,
        r.lado === "cliente" ? `Responsável (lado cliente): ${respDe(r)}` : null,
        r.acao ? `Ação: ${r.acao}` : null,
      ].filter(Boolean);
      return {
        cliente_id: r.cliente_id,
        cs_responsavel: csResponsavel,
        titulo: r.titulo.trim(),
        tipo: "Follow-up" as AtividadeTipo,
        prioridade: r.prioridade,
        descricao: descricaoParts.join(" · "),
        acao: r.acao || undefined,
        data_prevista: r.data_prevista,
        hora: r.hora || undefined,
        status: "Pendente" as const,
        origem: "proxima_acao_recomendada" as const,
        origem_label: `Reunião · ${reuniaoTitulo}${r.lado === "cliente" ? " · lado cliente" : ""}`,
      };
    });
    setSalvando(true);
    try {
      // As tarefas de uma mesma reunião nascem agrupadas: o lote compartilha
      // batch_id, o que permite depois ver "o que saiu daquela reunião".
      if (itens.length > 1) await createAtividadesLote(itens);
      else await createAtividade(itens[0]);
      toast.success(
        `${validos.length} tarefa${validos.length > 1 ? "s" : ""} criada${validos.length > 1 ? "s" : ""}.`,
      );
      onClose();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Não foi possível criar as tarefas.");
    } finally {
      setSalvando(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-black/60"
      onClick={onClose}
    >
      <div
        className="w-full max-w-3xl max-h-[85vh] flex flex-col rounded-xl border border-border bg-card"
        onClick={(e) => e.stopPropagation()}
      >
        <header className="flex items-center justify-between p-4 border-b border-border">
          <div>
            <h2 className="text-[16px] font-medium text-foreground">
              Próximos passos → Tarefas
            </h2>
            <p className="text-[12px] text-muted-foreground mt-0.5">
              Revise cada tarefa, ajuste prazo e responsável. O título vem preenchido pela IA e pode ser editado.
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1 text-muted-foreground hover:text-foreground"
            aria-label="Fechar"
          >
            <X className="h-4 w-4" />
          </button>
        </header>

        {/* Tabs CS vs Cliente */}
        <div className="flex items-center gap-1 px-4 pt-3 border-b border-border">
          <TabBtn
            active={tab === "cs"}
            onClick={() => setTab("cs")}
            icon={<User className="h-3.5 w-3.5" />}
            label={`Tarefas ${csResponsavel} (CS)`}
            count={csCount}
          />
          <TabBtn
            active={tab === "cliente"}
            onClick={() => setTab("cliente")}
            icon={<Users className="h-3.5 w-3.5" />}
            label="Tarefas do Cliente"
            count={cliCount}
          />
          <button
            onClick={() => setColando((v) => !v)}
            className={`ml-auto mb-1.5 inline-flex items-center gap-1.5 px-3 py-1.5 text-[12px] rounded-md border ${
              colando ? "border-primary text-primary" : "border-border text-muted-foreground"
            }`}
          >
            <ClipboardPaste className="h-3.5 w-3.5" /> Colar próximos passos
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {colando && (
            <div className="rounded-lg border border-border p-3 space-y-2 bg-background">
              <div className="flex items-center gap-1.5">
                {(
                  [
                    ["ata", "Ata já organizada"],
                    ["transcricao", "Transcrição bruta (IA)"],
                  ] as const
                ).map(([k, label]) => (
                  <button
                    key={k}
                    onClick={() => setModoEntrada(k)}
                    className={`px-2.5 py-1 rounded-full text-[11px] border transition-colors ${
                      modoEntrada === k
                        ? "bg-primary text-primary-foreground border-primary font-semibold"
                        : "border-border text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>

              {modoEntrada === "ata" ? (
                <p className="text-[12px] text-muted-foreground">
                  Cole aqui os próximos passos da ata. Blocos reconhecidos:{" "}
                  <span className="text-foreground">## Próximos passos — CS</span> e{" "}
                  <span className="text-foreground">## Próximos passos — Cliente</span>, com itens
                  em lista (- ou 1.).
                </p>
              ) : (
                <p className="text-[12px] text-muted-foreground">
                  Cole a transcrição da reunião. A IA separa o que é da CS e o que é do cliente e
                  devolve <span className="text-foreground">rascunhos</span> — nada é criado até
                  você revisar e salvar.
                </p>
              )}

              <textarea
                value={textoColado}
                onChange={(e) => setTextoColado(e.target.value)}
                rows={6}
                placeholder={
                  modoEntrada === "ata"
                    ? "## Próximos passos — CS\n- Cobrar material do diagnóstico\n\n## Próximos passos — Cliente\n- Subir base no CRM — Responsável: João"
                    : "Cole aqui a transcrição da reunião, do jeito que veio da gravação."
                }
                className="w-full bg-card border border-border rounded-lg p-2 text-sm"
              />
              <div className="flex justify-end">
                {modoEntrada === "ata" ? (
                  <button
                    onClick={extrairDoTexto}
                    disabled={!textoColado.trim()}
                    className="inline-flex items-center gap-1.5 text-[12px] px-3 py-1.5 rounded-md border border-border hover:border-primary disabled:opacity-50"
                  >
                    <Plus className="h-3.5 w-3.5" /> Extrair itens para revisão
                  </button>
                ) : (
                  <button
                    onClick={analisarComIA}
                    disabled={textoColado.trim().length < 40 || analisando}
                    className="inline-flex items-center gap-1.5 text-[12px] px-3 py-1.5 rounded-md border border-border hover:border-primary disabled:opacity-50"
                  >
                    <Sparkles className="h-3.5 w-3.5" />
                    {analisando ? "Analisando…" : "Analisar com IA"}
                  </button>
                )}
              </div>
            </div>
          )}

          {resumoIA && resumoIA.resumo && (
            <div className="rounded-lg border border-border bg-background p-3 space-y-2">
              <div className="text-[10px] uppercase tracking-wider text-muted-foreground">
                Resumo da reunião (pela IA)
              </div>
              <p className="text-[13px] whitespace-pre-wrap">{resumoIA.resumo}</p>
              {resumoIA.decisoes.length > 0 && (
                <div>
                  <div className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1">
                    Decisões
                  </div>
                  <ul className="text-[12px] list-disc pl-4 space-y-0.5">
                    {resumoIA.decisoes.map((d, i) => (
                      <li key={i}>{d}</li>
                    ))}
                  </ul>
                </div>
              )}
              {resumoIA.pendencias.length > 0 && (
                <div>
                  <div className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1">
                    Pendências / riscos
                  </div>
                  <ul className="text-[12px] list-disc pl-4 space-y-0.5">
                    {resumoIA.pendencias.map((d, i) => (
                      <li key={i}>{d}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}
          {visiveis.length === 0 && (
            <div className="text-[13px] text-muted-foreground text-center py-6">
              Nada por aqui. Cole os próximos passos acima ou clique em "Adicionar item" para criar manualmente.
            </div>
          )}
          {visiveis.map((r, i) => (
            <div
              key={r.id}
              className="rounded-lg border border-border p-3 space-y-2 bg-background"
            >
              <div className="flex items-start gap-2">
                <span className="text-[11px] text-muted-foreground mt-2 w-5 text-right">
                  {i + 1}.
                </span>
                <div className="flex-1 space-y-2">
                  <div>
                    <label className="block text-[10px] uppercase tracking-wider text-muted-foreground mb-1">
                      Título
                    </label>
                    <textarea
                      value={r.titulo}
                      onChange={(e) => atualizar(r.id, { titulo: e.target.value })}
                      rows={2}
                      placeholder="Título da tarefa"
                      className="w-full bg-card border border-border rounded-md p-2 text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] uppercase tracking-wider text-muted-foreground mb-1">
                      Ação
                    </label>
                    <input
                      list="acoes-transformar"
                      value={r.acao}
                      onChange={(e) => atualizar(r.id, { acao: e.target.value })}
                      placeholder="Ex.: Cobrar material, Agendar reunião…"
                      className="w-full bg-card border border-border rounded-md px-2 py-1.5 text-sm"
                    />
                  </div>
                </div>
                <button
                  onClick={() => remover(r.id)}
                  className="p-1.5 text-muted-foreground hover:text-status-red"
                  title="Remover"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-2 pl-7">
                <label className="flex flex-col gap-1">
                  <span className="text-[10px] uppercase tracking-wider text-muted-foreground">
                    Cliente
                  </span>
                  <select
                    value={r.cliente_id}
                    onChange={(e) => atualizar(r.id, { cliente_id: e.target.value })}
                    className="bg-card border border-border rounded-md px-2 py-1.5 text-[12px]"
                  >
                    <option value="">— selecionar —</option>
                    {clientesOrdenados.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.nome}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="flex flex-col gap-1">
                  <span className="text-[10px] uppercase tracking-wider text-muted-foreground">
                    Prazo
                  </span>
                  <input
                    type="date"
                    value={toDateInputValue(r.data_prevista)}
                    onChange={(e) =>
                      atualizar(r.id, {
                        data_prevista: fromDateInputValue(e.target.value, r.hora),
                      })
                    }
                    className="bg-card border border-border rounded-md px-2 py-1.5 text-[12px]"
                  />
                  {r.prazoSugerido && (
                    // Prazo em texto livre ("até sexta") não vira data sozinho —
                    // a CS lê e decide. Converter no chute erraria em silêncio.
                    <span className="text-[10px] text-muted-foreground">
                      citado: {r.prazoSugerido}
                    </span>
                  )}
                </label>
                <label className="flex flex-col gap-1">
                  <span className="text-[10px] uppercase tracking-wider text-muted-foreground">
                    Hora (opcional)
                  </span>
                  <input
                    type="time"
                    value={r.hora}
                    onChange={(e) => atualizar(r.id, { hora: e.target.value })}
                    className="bg-card border border-border rounded-md px-2 py-1.5 text-[12px]"
                  />
                </label>
                <label className="flex flex-col gap-1">
                  <span className="text-[10px] uppercase tracking-wider text-muted-foreground">
                    Prioridade
                  </span>
                  <select
                    value={r.prioridade}
                    onChange={(e) =>
                      atualizar(r.id, { prioridade: e.target.value as Prioridade })
                    }
                    className="bg-card border border-border rounded-md px-2 py-1.5 text-[12px]"
                  >
                    {PRIORIDADES.map((p) => (
                      <option key={p} value={p}>
                        {p}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="flex flex-col gap-1 md:col-span-4">
                  <span className="text-[10px] uppercase tracking-wider text-muted-foreground">
                    Responsável
                  </span>
                  {r.lado === "cs" ? (
                    <div className="flex items-center gap-2">
                      <div className="bg-card border border-border rounded-md px-2 py-1.5 text-[12px] text-foreground flex-1">
                        {csResponsavel}
                      </div>
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-primary/15 text-primary">
                        CS
                      </span>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2">
                      <input
                        value={respDe(r)}
                        onChange={(e) => atualizar(r.id, { responsavel: e.target.value })}
                        placeholder="Ex.: Guardião da IA — João"
                        className="flex-1 bg-card border border-border rounded-md px-2 py-1.5 text-[12px]"
                      />
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-status-yellow/15 text-status-yellow">
                        Cliente
                      </span>
                    </div>
                  )}
                </label>
              </div>
            </div>
          ))}

          <button
            onClick={adicionar}
            className="inline-flex items-center gap-1.5 text-[12px] text-muted-foreground hover:text-foreground"
          >
            <Plus className="h-3.5 w-3.5" /> Adicionar item
          </button>
          <datalist id="acoes-transformar">
            {ACOES.map((a) => (
              <option key={a} value={a} />
            ))}
          </datalist>
        </div>

        <footer className="flex items-center justify-between gap-3 p-4 border-t border-border">
          <span className="text-[11px] text-muted-foreground">
            {rascunhos.length} item{rascunhos.length === 1 ? "" : "s"} · vão para "Suas tarefas"
          </span>
          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              className="text-[12px] px-3 py-1.5 rounded-md border border-border text-muted-foreground hover:text-foreground"
            >
              Cancelar
            </button>
            <button
              onClick={() => void submeter()}
              disabled={salvando}
              className="inline-flex items-center gap-1.5 bg-primary text-primary-foreground font-semibold px-3 py-1.5 rounded-md text-xs hover:bg-primary/90 disabled:opacity-50"
            >
              <Check className="h-3.5 w-3.5" />{" "}
              {salvando ? "Criando…" : "Submeter tarefas"}
            </button>
          </div>
        </footer>
      </div>
    </div>
  );
}

function TabBtn({
  active,
  onClick,
  icon,
  label,
  count,
}: {
  active: boolean;
  onClick: () => void;
  icon: ReactNode;
  label: string;
  count: number;
}) {
  return (
    <button
      onClick={onClick}
      className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-[12px] rounded-t-md border-b-2 transition-colors ${
        active ? "border-primary text-primary" : "border-transparent text-muted-foreground"
      }`}
    >
      {icon}
      {label}
      <span className="text-[11px] opacity-70">({count})</span>
    </button>
  );
}
