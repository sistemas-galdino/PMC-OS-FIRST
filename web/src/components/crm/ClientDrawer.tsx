import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { X, Plus, Trash2, MessageCircle, Pause, Pin, Image as ImageIcon, Send, Edit2, ListPlus } from "lucide-react";
import { toast } from "sonner";
import { CicloProgressBar } from "@/components/crm/CarteiraVisuals";
import { Badge } from "@/components/crm/Badge";
import { NovaAtividadeModal } from "@/components/crm/NovaAtividadeModal";
import {
  TransformarTarefasModal,
  extrairProximosPassosSeparados,
} from "@/components/crm/TransformarTarefasModal";
import {
  addAnotacaoInterna,
  buildDisplayIdMap,
  fetchTranscricaoReuniao,
  isAdmin,
  openCliente,
  removeAnotacaoInterna,
  situacaoDe,
  updateAnotacaoInterna,
  updateCliente,
  useAnotacoesInternas,
  useAtividades,
  useClientes,
  useNotas,
  useProfile,
  useReunioes,
  useSelectedClienteId,
} from "@/lib/crm/storage";
import VitoriasPage from "@/pages/vitorias";
import TabCancelamento from "@/components/client-profile/admin-tabs/tab-cancelamento";
import { formatBR, inputDateValue, fromInputDate } from "@/lib/crm/format";
import { useCsList } from "@/lib/crm/equipe";
import {
  CONSULTORES,
  type Cliente,
  type CSName,
  type CicloGaldinoReuniao,
  type ConsultorReuniao,
  type AnotacaoInterna,
  type ProfileName,
  type Reuniao,
  SITUACAO_LIST,
} from "@/lib/crm/types";

type Tab =
  | "perfil"
  | "programa"
  | "bcrm"
  | "galdino"
  | "consultores"
  | "atividades"
  | "anotacoes"
  | "historico"
  | "renovacao"
  | "vitorias"
  | "comunicacao"
  | "cancelamento";

const TABS: { key: Tab; label: string }[] = [
  { key: "perfil", label: "Perfil" },
  { key: "programa", label: "Programa" },
  { key: "bcrm", label: "Black CRM" },
  { key: "galdino", label: "Ciclo Galdino" },
  { key: "consultores", label: "Consultores" },
  { key: "atividades", label: "Atividades" },
  { key: "renovacao", label: "Renovação" },
  { key: "vitorias", label: "Vitórias" },
  { key: "anotacoes", label: "Visão da CS" },
  { key: "comunicacao", label: "Comunicação" },
  { key: "cancelamento", label: "Cancelamento" },
  { key: "historico", label: "Histórico" },
];

function uid() {
  return Math.random().toString(36).slice(2, 10);
}

export function ClientDrawerHost() {
  const id = useSelectedClienteId();
  const clientes = useClientes();
  const cliente = clientes.find((c) => c.id === id) || null;
  if (!cliente) return null;
  return (
    <ClientDrawer key={cliente.id} clienteId={cliente.id} onClose={() => openCliente(null)} />
  );
}

function ClientDrawer({ clienteId, onClose }: { clienteId: string; onClose: () => void }) {
  const clientes = useClientes();
  const atividades = useAtividades();
  const anotacoes = useAnotacoesInternas(clienteId);
  const cliente = clientes.find((c) => c.id === clienteId)!;
  const [tab, setTab] = useState<Tab>("perfil");

  const atvCliente = useMemo(
    () => atividades.filter((a) => a.cliente_id === cliente.id),
    [atividades, cliente.id],
  );
  const atvCount = atvCliente.length;

  // A escrita agora é remota. No original, `patch` era chamado a cada onChange
  // e escrevia em localStorage — barato. Contra o Supabase, isso vira um
  // UPDATE por caractere digitado: um nome de empresa com 20 letras faz 20
  // requests, e o último a chegar vence (podendo gravar um valor intermediário).
  // Por isso o patch é acumulado e enviado depois que a digitação para.
  const pendente = useRef<Partial<Cliente>>({});
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const enviar = useCallback(() => {
    const p = pendente.current;
    pendente.current = {};
    if (Object.keys(p).length === 0) return;
    void updateCliente(cliente.id, p).catch((e: unknown) => {
      toast.error(`Não foi possível salvar: ${e instanceof Error ? e.message : String(e)}`);
    });
  }, [cliente.id]);

  const patch = useCallback(
    (p: Partial<Cliente>) => {
      pendente.current = { ...pendente.current, ...p };
      if (timer.current) clearTimeout(timer.current);
      timer.current = setTimeout(enviar, 600);
    },
    [enviar],
  );

  // Fechar o drawer (ou trocar de cliente) não pode perder o que estava
  // digitado e ainda não subiu.
  useEffect(() => {
    return () => {
      if (timer.current) clearTimeout(timer.current);
      enviar();
    };
  }, [enviar]);

  return (
    <div className="fixed inset-0 z-40 bg-background overflow-y-auto" onClick={(e) => e.stopPropagation()}>
      <div className="relative w-full min-h-full bg-background">
        {/* Header */}
        <div className="sticky top-0 bg-card border-b border-border p-5 z-10">
          <div className="mx-auto max-w-6xl flex items-start justify-between gap-3">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-xs font-mono font-bold tabular-nums text-primary">
                  {buildDisplayIdMap(clientes).get(cliente.id)}
                </span>
                <h3 className="text-lg font-bold truncate">{cliente.empresa || cliente.nome}</h3>
              </div>
              {cliente.empresa && (
                <div className="text-xs text-muted-foreground mt-0.5">{cliente.nome}</div>
              )}
              <div className="flex flex-wrap items-center gap-2 mt-3">
                <Badge value={cliente.status} />
                <Badge value={cliente.saude || "Saudável"} />
                <span className="text-[11px] px-2 py-0.5 rounded-full border border-border text-muted-foreground">
                  CS: {cliente.responsavel_cs || "—"}
                </span>
                {cliente.pausado && (
                  <span
                    className="text-[11px] px-2 py-0.5 rounded-full bg-muted text-muted-foreground border border-border inline-flex items-center gap-1"
                    title={cliente.pausado_motivo || "Pausado — não conta nos indicadores"}
                  >
                    <Pause className="h-3 w-3" /> Pausado
                  </span>
                )}
              </div>
            </div>
            <button onClick={onClose} className="text-muted-foreground hover:text-foreground">
              <X className="h-5 w-5" />
            </button>
          </div>
          <div className="mx-auto max-w-6xl mt-4">
            <CicloProgressBar cliente={cliente} />
          </div>
        </div>

        {/* Tabs */}
        <div className="border-b border-border px-3 flex gap-1 flex-wrap sticky top-[235px] bg-card z-[5] mx-auto max-w-6xl">
          {TABS.map((t) => {
            const active = tab === t.key;
            // Vitórias não tem contador: a lista vive em cliente_vitorias e é
            // carregada dentro da aba. Contar por `cliente.vitorias` — que
            // nunca é preenchido — mostraria (0) para quem tem vitória.
            const count =
              t.key === "atividades"
                ? atvCount
                : t.key === "anotacoes"
                  ? anotacoes.length
                  : null;
            return (
              <button
                key={t.key}
                onClick={() => setTab(t.key)}
                className={`px-3 py-2.5 text-xs font-semibold rounded-t-md transition-colors ${
                  active
                    ? "bg-background text-foreground border-b-2 border-primary -mb-px"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {t.label}
                {count !== null && (
                  <span className="ml-1 text-muted-foreground">({count})</span>
                )}
              </button>
            );
          })}
        </div>

        <div className="mx-auto max-w-6xl p-5 space-y-5">
          {tab === "perfil" && <PerfilTab cliente={cliente} patch={patch} />}
          {tab === "programa" && <ProgramaTab cliente={cliente} patch={patch} />}
          {tab === "bcrm" && <BlackCrmTab cliente={cliente} patch={patch} />}
          {tab === "galdino" && <CicloGaldinoTab cliente={cliente} patch={patch} />}
          {tab === "consultores" && <ConsultoresTab cliente={cliente} patch={patch} />}
          {tab === "atividades" && <AtividadesTab cliente={cliente} />}
          {tab === "historico" && <HistoricoTab cliente={cliente} />}
          {tab === "renovacao" && <RenovacaoTab cliente={cliente} patch={patch} />}
          {/* Vitórias e Cancelamento reusam as telas do perfil do cliente, que
              gravam nas tabelas de verdade (cliente_vitorias,
              cliente_cancelamento). As versões que existiam aqui escreviam em
              campos sem coluna: a CS registrava uma vitória, o patch era
              descartado em silêncio e parecia ter salvo. */}
          {tab === "vitorias" && <VitoriasPage clientId={cliente.id} />}
          {tab === "anotacoes" && <AnotacoesTab cliente={cliente} />}
          {tab === "comunicacao" && <ComunicacaoTab cliente={cliente} patch={patch} />}
          {tab === "cancelamento" && <TabCancelamento clientId={cliente.id} />}
        </div>
      </div>
    </div>
  );
}

// ============ Helpers de UI ============

function Section({
  title,
  icon,
  children,
  tone,
}: {
  title: string;
  icon?: React.ReactNode;
  children: React.ReactNode;
  tone?: "danger";
}) {
  return (
    <div
      className={`bg-background border rounded-lg p-4 ${
        tone === "danger" ? "border-status-red/40" : "border-border"
      }`}
    >
      <div
        className={`flex items-center gap-2 text-sm font-bold mb-3 ${
          tone === "danger" ? "text-status-red" : "text-foreground"
        }`}
      >
        {icon}
        {title}
      </div>
      <div className="space-y-3">{children}</div>
    </div>
  );
}

function Field({
  label,
  children,
  className = "",
}: {
  label: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={className}>
      <div className="text-[11px] font-semibold text-muted-foreground mb-1">{label}</div>
      {children}
    </div>
  );
}

function TextInput(props: React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      {...props}
      className={`w-full bg-card border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-primary ${props.className || ""}`}
    />
  );
}

function TextArea(props: React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <textarea
      rows={3}
      {...props}
      className={`w-full bg-card border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-primary ${props.className || ""}`}
    />
  );
}

function Select<T extends string>({
  value,
  onChange,
  options,
}: {
  value: T | "";
  onChange: (v: T) => void;
  options: { value: T | ""; label: string }[];
}) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value as T)}
      className="w-full bg-card border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-primary"
    >
      {options.map((o) => (
        <option key={o.value} value={o.value}>
          {o.label}
        </option>
      ))}
    </select>
  );
}

function Grid2({ children }: { children: React.ReactNode }) {
  return <div className="grid grid-cols-1 md:grid-cols-2 gap-3">{children}</div>;
}

// ============ Tabs ============

function PerfilTab({ cliente, patch }: { cliente: Cliente; patch: (p: Partial<Cliente>) => void }) {
  const clientes = useClientes();
  const idMap = buildDisplayIdMap(clientes);
  // A lista do time chega vazia no primeiro render (vem de `mentores`). Sem o
  // hook reativo (e sem csList nas deps) o select mostraria outra pessoa como
  // responsável para sempre, porque o memo ficaria preso na lista vazia.
  const csList = useCsList();
  const csOptions = useMemo(() => {
    const nomes = csList.includes(cliente.responsavel_cs)
      ? csList
      : [cliente.responsavel_cs, ...csList].filter(Boolean);
    return nomes.map((c) => ({ value: c as CSName, label: c }));
  }, [cliente.responsavel_cs, csList]);
  return (
    <>
      <Section title="Cadastro" icon={<span>👤</span>}>
        <Field label="ID do cliente">
          <TextInput value={idMap.get(cliente.id) || cliente.id} disabled />
        </Field>
        <Grid2>
          <Field label="Empresa">
            <TextInput value={cliente.empresa || ""} onChange={(e) => patch({ empresa: e.target.value })} />
          </Field>
          <Field label="Contato">
            <TextInput value={cliente.nome} onChange={(e) => patch({ nome: e.target.value })} />
          </Field>
          <Field label="Nicho">
            <TextInput value={cliente.nicho || ""} onChange={(e) => patch({ nicho: e.target.value })} />
          </Field>
          <Field label="Subnicho">
            <TextInput value={cliente.subnicho || ""} onChange={(e) => patch({ subnicho: e.target.value })} />
          </Field>
          <Field label="CS Responsável">
            <Select
              value={cliente.responsavel_cs}
              onChange={(v) => patch({ responsavel_cs: v as CSName })}
              options={csOptions}
            />
          </Field>
          <Field label="Data de entrada">
            <TextInput
              type="date"
              value={inputDateValue(cliente.data_inicio)}
              // Limpar o campo grava null. A data é preenchida à mão, cliente a
              // cliente — quem digita errado precisa conseguir voltar ao vazio,
              // não só trocar por outra data. Grava em
              // cliente_informacoes_empresa.data_entrada, que é onde o perfil
              // do cliente lê (ver salvarDataEntrada em store.ts).
              onChange={(e) => patch({ data_inicio: e.target.value ? fromInputDate(e.target.value) : "" })}
            />
            {cliente.data_inicio_cadastro && (
              // As duas fontes discordam (50 clientes no PROD, 151 dias de
              // diferença em média). Vale a do perfil, mas a do cadastro fica à
              // vista: trocar 50 datas em silêncio seria repetir o erro que
              // derrubou o backfill.
              <span className="text-[10px] text-muted-foreground">
                cadastro antigo: {formatBR(cliente.data_inicio_cadastro)}
              </span>
            )}
          </Field>
        </Grid2>
      </Section>

      <Section title="Estado (automático)" icon={<span>♡</span>}>
        <Grid2>
          <Field label="Situação">
            <Select
              value={situacaoDe(cliente)}
              onChange={(v) => patch({ situacao: v as Cliente["situacao"] })}
              options={SITUACAO_LIST.map((s) => ({ value: s, label: s }))}
            />
          </Field>
          <Field label="Status do cliente">
            <Select
              value={cliente.status}
              onChange={(v) => patch({ status: v as Cliente["status"] })}
              options={[
                { value: "Ativo", label: "Ativo" },
                { value: "Em Risco", label: "Em Risco" },
                { value: "Cancelado", label: "Cancelado" },
              ]}
            />
          </Field>
          <Field label="Saúde do cliente">
            <Select
              value={cliente.saude || "Saudável"}
              onChange={(v) => patch({ saude: v as Cliente["saude"] })}
              options={[
                { value: "Saudável", label: "Saudável" },
                { value: "Em Atenção", label: "Em Atenção" },
                { value: "Crítico", label: "Crítico" },
              ]}
            />
          </Field>
          <Field label="Em risco de cancelamento">
            <Select
              value={cliente.em_risco_cancelamento || "Não"}
              onChange={(v) => patch({ em_risco_cancelamento: v as "Sim" | "Não" })}
              options={[
                { value: "Não", label: "Não" },
                { value: "Sim", label: "Sim" },
              ]}
            />
          </Field>
          <Field label="Estado atual (observação rápida)">
            <TextInput
              value={cliente.estado_atual_obs || ""}
              onChange={(e) => patch({ estado_atual_obs: e.target.value })}
              placeholder="Ex.: respondeu recente sobre os mentores..."
            />
          </Field>
        </Grid2>
      </Section>
    </>
  );
}

function ProgramaTab({ cliente, patch }: { cliente: Cliente; patch: (p: Partial<Cliente>) => void }) {
  return (
    <>
      <Section title="Programa">
        <Grid2>
          <Field label="Tem Guardião de IA">
            <Select
              value={cliente.guardiao_ia ? "Sim" : "Não"}
              onChange={(v) => patch({ guardiao_ia: v === "Sim" })}
              options={[
                { value: "Não", label: "Não" },
                { value: "Sim", label: "Sim" },
              ]}
            />
          </Field>
          <Field label="Presença em treinamentos">
            <Select
              value={cliente.presenca_treinamento || "Nenhuma"}
              onChange={(v) => patch({ presenca_treinamento: v as Cliente["presenca_treinamento"] })}
              options={[
                { value: "Nenhuma", label: "Nenhuma" },
                { value: "Baixa", label: "Baixa" },
                { value: "Média", label: "Média" },
                { value: "Alta", label: "Alta" },
              ]}
            />
          </Field>
          <Field label="Reunião com consultores">
            <Select
              value={cliente.reuniao_consultores_status || "Nunca fez"}
              onChange={(v) => patch({ reuniao_consultores_status: v as Cliente["reuniao_consultores_status"] })}
              options={[
                { value: "Nunca fez", label: "Nunca fez" },
                { value: "Já fez", label: "Já fez" },
                { value: "Agendada", label: "Agendada" },
              ]}
            />
          </Field>
          <Field label="Reunião com Galdino">
            <Select
              value={cliente.reuniao_galdino_status || "Nunca fez"}
              onChange={(v) => patch({ reuniao_galdino_status: v as Cliente["reuniao_galdino_status"] })}
              options={[
                { value: "Nunca fez", label: "Nunca fez" },
                { value: "Já fez", label: "Já fez" },
                { value: "Agendada", label: "Agendada" },
              ]}
            />
          </Field>
          <Field label="Frequência grupo WhatsApp">
            <Select
              value={cliente.frequencia_wpp || "Média"}
              onChange={(v) => patch({ frequencia_wpp: v as Cliente["frequencia_wpp"] })}
              options={[
                { value: "Baixa", label: "Baixa" },
                { value: "Média", label: "Média" },
                { value: "Alta", label: "Alta" },
              ]}
            />
          </Field>
        </Grid2>
      </Section>

      <Section title="Guardião de IA" icon={<span>🤖</span>}>
        <Grid2>
          <Field label="Nome">
            <TextInput
              value={cliente.guardiao_ia_nome || ""}
              onChange={(e) => patch({ guardiao_ia_nome: e.target.value })}
            />
          </Field>
          <Field label="Telefone">
            <div className="flex gap-2">
              <TextInput
                value={cliente.guardiao_ia_telefone || ""}
                onChange={(e) => patch({ guardiao_ia_telefone: e.target.value })}
                placeholder="(00) 00000-0000"
              />
              {cliente.guardiao_ia_telefone && (
                <a
                  href={`https://wa.me/${cliente.guardiao_ia_telefone.replace(/\D/g, "")}`}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1.5 bg-status-green/20 text-status-green border border-status-green/40 px-3 py-2 rounded-lg text-xs font-semibold shrink-0 hover:bg-status-green/30"
                >
                  <MessageCircle className="h-3.5 w-3.5" /> WhatsApp
                </a>
              )}
            </div>
          </Field>
          <Field label="Cargo" className="md:col-span-2">
            <TextInput
              value={cliente.guardiao_ia_cargo || ""}
              onChange={(e) => patch({ guardiao_ia_cargo: e.target.value })}
            />
          </Field>
        </Grid2>
      </Section>
    </>
  );
}

function BlackCrmTab({ cliente, patch }: { cliente: Cliente; patch: (p: Partial<Cliente>) => void }) {
  return (
    <Section title="Black CRM" icon={<span>🤖</span>}>
      <Grid2>
        <Field label="Tem conta na Black CRM?">
          <Select
            value={cliente.bcrm_tem_conta || (cliente.black_crm ? "Sim" : "Não")}
            onChange={(v) => patch({ bcrm_tem_conta: v as "Sim" | "Não", black_crm: v === "Sim" })}
            options={[
              { value: "Não", label: "Não" },
              { value: "Sim", label: "Sim" },
            ]}
          />
        </Field>
        <Field label="Quantas contas?">
          <TextInput
            type="number"
            min={0}
            value={cliente.bcrm_qtd_contas ?? 0}
            onChange={(e) => patch({ bcrm_qtd_contas: Number(e.target.value) })}
          />
        </Field>
        <Field label="Tem guardião do CRM?">
          <Select
            value={cliente.bcrm_tem_guardiao || "Não"}
            onChange={(v) => patch({ bcrm_tem_guardiao: v as "Sim" | "Não" })}
            options={[
              { value: "Não", label: "Não" },
              { value: "Sim", label: "Sim" },
            ]}
          />
        </Field>
        <Field label="Nome do guardião">
          <TextInput
            value={cliente.bcrm_guardiao_nome || ""}
            onChange={(e) => patch({ bcrm_guardiao_nome: e.target.value })}
            placeholder="Nome da pessoa responsável"
          />
        </Field>
        <Field label="Telefone do guardião">
          <TextInput
            value={cliente.bcrm_guardiao_telefone || ""}
            onChange={(e) => patch({ bcrm_guardiao_telefone: e.target.value })}
            placeholder="(11) 99999-9999"
          />
        </Field>
        <Field label="Nome(s) da(s) conta(s)" className="md:col-span-2">
          <TextInput
            value={cliente.bcrm_nomes_contas || ""}
            onChange={(e) => patch({ bcrm_nomes_contas: e.target.value })}
            placeholder="Ex.: Conta Principal, Filial SP, Comercial..."
          />
        </Field>
        <Field label="Status da conta">
          <Select
            value={cliente.bcrm_status_conta || "Ativa"}
            onChange={(v) => patch({ bcrm_status_conta: v as Cliente["bcrm_status_conta"] })}
            options={[
              { value: "Ativa", label: "Ativa" },
              { value: "Inativa", label: "Inativa" },
              { value: "Suspensa", label: "Suspensa" },
            ]}
          />
        </Field>
        <Field label="Status de implementação">
          <Select
            value={cliente.bcrm_status_impl || "Não iniciado"}
            onChange={(v) => patch({ bcrm_status_impl: v as Cliente["bcrm_status_impl"] })}
            options={[
              { value: "Não iniciado", label: "Não iniciado" },
              { value: "Em implementação", label: "Em implementação" },
              { value: "Implementado", label: "Implementado" },
            ]}
          />
        </Field>
        <Field label="Participa de tutoria?">
          <Select
            value={cliente.bcrm_tutoria || "Não participa"}
            onChange={(v) => patch({ bcrm_tutoria: v as Cliente["bcrm_tutoria"] })}
            options={[
              { value: "Não participa", label: "Não participa" },
              { value: "Participa", label: "Participa" },
            ]}
          />
        </Field>
        <Field label="Cliente tem vitórias com CRM?">
          <Select
            value={cliente.bcrm_tem_vitorias || "Não"}
            onChange={(v) => patch({ bcrm_tem_vitorias: v as "Sim" | "Não" })}
            options={[
              { value: "Não", label: "Não" },
              { value: "Sim", label: "Sim" },
            ]}
          />
        </Field>
        <Field label="Quais vitórias?" className="md:col-span-2">
          <TextArea
            value={cliente.bcrm_quais_vitorias || ""}
            onChange={(e) => patch({ bcrm_quais_vitorias: e.target.value })}
            placeholder="Descreva as vitórias do cliente com a Black CRM..."
          />
        </Field>
      </Grid2>
    </Section>
  );
}

function CicloGaldinoTab({ cliente, patch }: { cliente: Cliente; patch: (p: Partial<Cliente>) => void }) {
  const cadencia = cliente.ciclo_galdino_cadencia || 4;
  const reunioes = cliente.ciclo_galdino_reunioes || [];

  // Garante slots conforme cadência
  const slots: CicloGaldinoReuniao[] = Array.from({ length: cadencia }, (_, i) => {
    const existing = reunioes[i];
    if (existing) return existing;
    // calcula data ideal baseada na data de início e cadência
    const meses = Math.round(12 / cadencia);
    const base = new Date(cliente.data_inicio);
    // Sem data de entrada não há data ideal a calcular: o slot nasce vazio em
    // vez de "Invalid Date".
    if (Number.isNaN(base.getTime())) {
      return { id: uid(), status: "Não agendada" };
    }
    base.setMonth(base.getMonth() + (i + 1) * meses);
    return {
      id: uid(),
      data_ideal: base.toISOString(),
      status: "Não agendada",
    };
  });

  const realizadas = slots.filter((r) => r.status === "Realizada").length;
  const pendentes = slots.length - realizadas;
  const proxima = slots.find((r) => r.status === "Agendada");

  function setCadencia(n: 4 | 6 | 12) {
    patch({ ciclo_galdino_cadencia: n, ciclo_galdino_reunioes: slots.slice(0, n) });
  }

  function updateReuniao(idx: number, p: Partial<CicloGaldinoReuniao>) {
    const next = slots.map((r, i) => (i === idx ? { ...r, ...p } : r));
    patch({ ciclo_galdino_reunioes: next });
  }

  return (
    <>
      <Section title="Ciclo Galdino">
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3 text-center">
          <Stat n={slots.length} l="Total" />
          <Stat n={realizadas} l="Realizadas" tone="text-status-green" />
          <Stat n={pendentes} l="Pendentes" tone="text-status-yellow" />
          <Stat
            n={proxima?.data_reuniao ? formatBR(proxima.data_reuniao) : "—"}
            l="Próxima agendada"
          />
          <Stat n={cadencia} l="Reuniões/ano" />
        </div>
        <div className="text-xs text-muted-foreground">
          Cadência ideal: 1 reunião a cada {Math.round(12 / cadencia)} meses.
        </div>
        <div className="flex gap-2 flex-wrap">
          {[4, 6, 12].map((n) => (
            <button
              key={n}
              onClick={() => setCadencia(n as 4 | 6 | 12)}
              className={`text-xs px-3 py-1.5 rounded-lg border transition-colors ${
                cadencia === n
                  ? "bg-primary text-primary-foreground border-primary font-semibold"
                  : "border-border hover:border-primary"
              }`}
            >
              {n} reuniões
            </button>
          ))}
        </div>
      </Section>

      <div className="space-y-3">
        {slots.map((r, i) => (
          <Section key={r.id} title={`Reunião ${i + 1}`}>
            <Grid2>
              <Field label="Data ideal">
                <TextInput
                  type="date"
                  value={inputDateValue(r.data_ideal)}
                  onChange={(e) =>
                    updateReuniao(i, {
                      data_ideal: e.target.value ? fromInputDate(e.target.value) : undefined,
                    })
                  }
                />
              </Field>
              <Field label="Data da reunião">
                <TextInput
                  type="date"
                  value={inputDateValue(r.data_reuniao)}
                  onChange={(e) =>
                    updateReuniao(i, {
                      data_reuniao: e.target.value ? fromInputDate(e.target.value) : undefined,
                    })
                  }
                />
              </Field>
              <Field label="Status">
                <Select
                  value={r.status}
                  onChange={(v) => updateReuniao(i, { status: v as CicloGaldinoReuniao["status"] })}
                  options={[
                    { value: "Não agendada", label: "Não agendada" },
                    { value: "Agendada", label: "Agendada" },
                    { value: "Realizada", label: "Realizada" },
                    { value: "Cancelada", label: "Cancelada" },
                  ]}
                />
              </Field>
              <Field label="Próximos passos definidos">
                <TextInput
                  value={r.proximos_passos || ""}
                  onChange={(e) => updateReuniao(i, { proximos_passos: e.target.value })}
                  placeholder="O que ficou combinado..."
                />
              </Field>
            </Grid2>
          </Section>
        ))}
      </div>
    </>
  );
}

function ConsultoresTab({ cliente, patch }: { cliente: Cliente; patch: (p: Partial<Cliente>) => void }) {
  const reunioes = cliente.consultor_reunioes || [];
  const realizadas = reunioes.filter((r) => r.status === "Realizada");
  const ordenadas = [...reunioes].sort(
    (a, b) => new Date(b.data).getTime() - new Date(a.data).getTime(),
  );
  const ultima = realizadas[0];
  const proxima = reunioes.find((r) => r.status === "Agendada");

  // consultor mais acionado
  const counts: Record<string, number> = {};
  reunioes.forEach((r) => {
    counts[r.consultor] = (counts[r.consultor] || 0) + 1;
  });
  const topConsultor =
    Object.entries(counts).sort((a, b) => b[1] - a[1])[0]?.[0] || "—";

  function add() {
    const nova: ConsultorReuniao = {
      id: uid(),
      consultor: CONSULTORES[0],
      data: new Date().toISOString(),
      status: "Realizada",
    };
    patch({ consultor_reunioes: [nova, ...reunioes] });
  }
  function update(id: string, p: Partial<ConsultorReuniao>) {
    patch({
      consultor_reunioes: reunioes.map((r) => (r.id === id ? { ...r, ...p } : r)),
    });
  }
  function remove(id: string) {
    patch({ consultor_reunioes: reunioes.filter((r) => r.id !== id) });
  }

  return (
    <>
      <Section title="Consultores">
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3 text-center">
          <Stat n={reunioes.length} l="Total de reuniões" />
          <Stat n={ultima ? formatBR(ultima.data) : "—"} l="Última reunião" />
          <Stat n={topConsultor} l="Consultor + acionado" />
          <Stat n="—" l="Frequência média" />
          <Stat n={proxima ? formatBR(proxima.data) : "—"} l="Próxima agendada" />
        </div>
        <button
          onClick={add}
          className="inline-flex items-center gap-2 bg-primary text-primary-foreground font-semibold px-4 py-2 rounded-lg text-sm hover:bg-primary/90"
        >
          <Plus className="h-4 w-4" /> Registrar nova reunião
        </button>
      </Section>

      <div className="space-y-2">
        {ordenadas.length === 0 && (
          <div className="text-sm text-muted-foreground text-center py-6">
            Sem reuniões registradas.
          </div>
        )}
        {ordenadas.map((r, i) => (
          <div
            key={r.id}
            className="bg-background border border-border rounded-lg p-3 border-l-4 border-l-primary"
          >
            <div className="flex items-start gap-3">
              <div className="h-10 w-10 rounded-full bg-primary/10 text-primary flex items-center justify-center text-xs font-bold shrink-0">
                {ordenadas.length - i}ª
              </div>
              <div className="flex-1 grid grid-cols-1 md:grid-cols-3 gap-2">
                <Select
                  value={r.consultor}
                  onChange={(v) => update(r.id, { consultor: v })}
                  options={CONSULTORES.map((c) => ({ value: c, label: c }))}
                />
                <TextInput
                  type="date"
                  value={inputDateValue(r.data)}
                  onChange={(e) =>
                    update(r.id, {
                      data: e.target.value ? fromInputDate(e.target.value) : r.data,
                    })
                  }
                />
                <Select
                  value={r.status}
                  onChange={(v) => update(r.id, { status: v as ConsultorReuniao["status"] })}
                  options={[
                    { value: "Realizada", label: "Realizada" },
                    { value: "Agendada", label: "Agendada" },
                    { value: "Cancelada", label: "Cancelada" },
                  ]}
                />
                <TextInput
                  className="md:col-span-3"
                  value={r.observacao || ""}
                  onChange={(e) => update(r.id, { observacao: e.target.value })}
                  placeholder="Observação..."
                />
              </div>
              <button
                onClick={() => remove(r.id)}
                className="text-status-red hover:opacity-80"
                title="Remover"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          </div>
        ))}
      </div>
    </>
  );
}

function AtividadesTab({ cliente }: { cliente: Cliente }) {
  const atividades = useAtividades();
  const reunioes = useReunioes();
  const [openNova, setOpenNova] = useState(false);
  const list = useMemo(
    () =>
      atividades
        .filter((a) => a.cliente_id === cliente.id)
        .sort(
          (a, b) =>
            new Date(b.data_prevista).getTime() - new Date(a.data_prevista).getTime(),
        ),
    [atividades, cliente.id],
  );
  // Reunião com resumo OU com transcrição: as duas rendem tarefa. Só resumo
  // deixava de fora justamente as que a IA consegue destrinchar.
  const reunioesRealizadas = useMemo(
    () =>
      reunioes
        .filter((r) => r.cliente_id === cliente.id && (r.resumo || r.tem_transcricao))
        .sort((a, b) => new Date(b.data).getTime() - new Date(a.data).getTime()),
    [reunioes, cliente.id],
  );
  const [transformar, setTransformar] = useState<{
    reuniao: Reuniao;
    transcricao?: string;
  } | null>(null);
  const [buscandoTranscricao, setBuscandoTranscricao] = useState<string | null>(null);

  async function abrirTransformar(r: Reuniao) {
    if (buscandoTranscricao) return;
    if (!r.tem_transcricao) {
      setTransformar({ reuniao: r });
      return;
    }
    setBuscandoTranscricao(r.id);
    try {
      const t = await fetchTranscricaoReuniao(r.id);
      setTransformar({ reuniao: r, transcricao: t ?? undefined });
    } catch {
      // Não achar a transcrição não pode fechar o caminho manual.
      setTransformar({ reuniao: r });
    } finally {
      setBuscandoTranscricao(null);
    }
  }

  return (
    <>
      <div className="flex items-center justify-between">
        <h4 className="text-sm font-bold">Atividades do cliente</h4>
        <button
          onClick={() => setOpenNova(true)}
          className="inline-flex items-center gap-2 bg-primary text-primary-foreground font-semibold px-3 py-2 rounded-lg text-xs hover:bg-primary/90"
        >
          <Plus className="h-3.5 w-3.5" /> Nova atividade
        </button>
      </div>
      {reunioesRealizadas.length > 0 && (
        <div className="space-y-2">
          <div className="text-[11px] uppercase tracking-wider text-muted-foreground mt-1">
            Reuniões com resumo
          </div>
          {reunioesRealizadas.map((r) => (
            <div
              key={r.id}
              className="bg-background border border-border rounded-lg p-3"
              style={{ borderLeft: `2px solid ${r.tipo === "Cliente" ? "#1D9E75" : "#7F77DD"}` }}
            >
              <div className="flex items-center justify-between gap-2">
                <div className="text-sm font-bold truncate">{r.titulo}</div>
                <div className="text-[11px] text-muted-foreground shrink-0">
                  {formatBR(r.data)} · {r.hora_inicio}
                </div>
              </div>
              <div className="text-[11px] text-muted-foreground mt-0.5">
                {r.tipo}
                {r.subtipo ? ` · ${r.subtipo}` : ""}
                {r.ciclo ? ` · T${r.ciclo}` : ""} · {r.duracao_minutos} min
              </div>
              {r.resumo && (
                <div className="text-sm text-foreground/90 mt-2 whitespace-pre-wrap">
                  {r.resumo}
                </div>
              )}
              <div className="mt-2 flex items-center gap-3 flex-wrap">
                <button
                  onClick={() => void abrirTransformar(r)}
                  disabled={buscandoTranscricao === r.id}
                  className="inline-flex items-center gap-1.5 text-[12px] px-2.5 py-1 rounded-md border border-primary text-primary hover:bg-primary hover:text-primary-foreground transition-colors disabled:opacity-60"
                >
                  <ListPlus className="h-3.5 w-3.5" />
                  {buscandoTranscricao === r.id ? "Buscando transcrição…" : "Transformar em tarefas"}
                </button>
                {r.tem_transcricao && (
                  <span className="text-[11px] text-muted-foreground">
                    transcrição disponível
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {transformar && (
        <TransformarTarefasModal
          passosSeparados={extrairProximosPassosSeparados(transformar.reuniao.resumo ?? "")}
          transcricaoInicial={transformar.transcricao}
          clienteIdDefault={cliente.id}
          csResponsavel={transformar.reuniao.cs_responsavel}
          reuniaoTitulo={transformar.reuniao.titulo}
          onClose={() => setTransformar(null)}
        />
      )}

      {list.length === 0 ? (
        <div className="text-sm text-muted-foreground text-center py-6 bg-background border border-border rounded-lg">
          Nenhuma atividade registrada.
        </div>
      ) : (
        <div className="space-y-2">
          {list.map((a) => {
            const overdue =
              a.status !== "Concluída" &&
              new Date(a.data_prevista).getTime() < Date.now() - 86400000;
            return (
              <div
                key={a.id}
                className="bg-background border border-border rounded-lg p-3"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <div className="text-sm font-bold">{a.titulo}</div>
                    {a.descricao && (
                      <div className="text-xs text-muted-foreground truncate">{a.descricao}</div>
                    )}
                    <div className="flex items-center gap-2 mt-1.5 flex-wrap text-[11px]">
                      {a.entrega && (
                        <span className="px-1.5 py-0.5 rounded bg-card border border-border">
                          {a.entrega}
                        </span>
                      )}
                      <span className={overdue ? "text-status-red" : "text-muted-foreground"}>
                        {formatBR(a.data_prevista)}
                        {overdue && " (atrasada)"}
                      </span>
                      <span className="text-muted-foreground">· {a.cs_responsavel}</span>
                    </div>
                  </div>
                  <Badge value={a.status} />
                </div>
              </div>
            );
          })}
        </div>
      )}
      {openNova && (
        <NovaAtividadeModal
          defaultClienteId={cliente.id}
          onClose={() => setOpenNova(false)}
        />
      )}
    </>
  );
}

function HistoricoTab({ cliente }: { cliente: Cliente }) {
  const atividades = useAtividades();
  const notas = useNotas(cliente.id);
  type Evt = { ts: number; label: string; sub?: string; tone?: string };
  const eventos: Evt[] = [];

  (cliente.historico_temperatura || []).forEach((h) => {
    eventos.push({
      ts: new Date(h.data).getTime(),
      label: `Temperatura alterada para ${h.temp}`,
      sub: h.autor,
      tone: "text-primary",
    });
  });
  notas.forEach((n) => {
    eventos.push({
      ts: new Date(n.criado_em).getTime(),
      label: `Anotação: ${n.texto}`,
      sub: n.autor,
    });
  });
  atividades
    .filter((a) => a.cliente_id === cliente.id && a.status === "Concluída")
    .forEach((a) => {
      eventos.push({
        ts: new Date(a.data_conclusao || a.data_prevista).getTime(),
        label: `Atividade concluída: ${a.titulo}`,
        sub: a.cs_responsavel,
        tone: "text-status-green",
      });
    });

  eventos.sort((a, b) => b.ts - a.ts);

  return (
    <Section title="Histórico de mudanças">
      {eventos.length === 0 ? (
        <div className="text-sm text-muted-foreground text-center py-6">
          Nenhum evento registrado.
        </div>
      ) : (
        <div className="space-y-2">
          {eventos.map((e, i) => (
            <div
              key={i}
              className="bg-card border border-border rounded-lg p-3"
            >
              <div className={`text-sm font-semibold ${e.tone || ""}`}>{e.label}</div>
              <div className="text-[11px] text-muted-foreground mt-0.5">
                {formatBR(new Date(e.ts).toISOString())}
                {e.sub ? ` · ${e.sub}` : ""}
              </div>
            </div>
          ))}
        </div>
      )}
    </Section>
  );
}

function RenovacaoTab({ cliente, patch }: { cliente: Cliente; patch: (p: Partial<Cliente>) => void }) {
  return (
    <Section title="Renovação">
      <Grid2>
        <Field label="Data de renovação">
          <TextInput
            type="date"
            value={inputDateValue(cliente.data_renovacao)}
            onChange={(e) =>
              patch({
                data_renovacao: e.target.value ? fromInputDate(e.target.value) : undefined,
                proximo_renovacao: !!e.target.value,
              })
            }
          />
        </Field>
        <Field label="Valor (R$)">
          <TextInput
            type="number"
            min={0}
            step="0.01"
            value={cliente.renovacao_valor ?? ""}
            onChange={(e) =>
              patch({
                renovacao_valor: e.target.value === "" ? undefined : Number(e.target.value),
              })
            }
          />
        </Field>
        <Field label="Status da renovação" className="md:col-span-2">
          <Select
            value={cliente.renovacao_status || "Ainda distante"}
            onChange={(v) => patch({ renovacao_status: v as Cliente["renovacao_status"] })}
            options={[
              { value: "Ainda distante", label: "Ainda distante" },
              { value: "Aproximando", label: "Aproximando" },
              { value: "Em negociação", label: "Em negociação" },
              { value: "Confirmada", label: "Confirmada" },
              { value: "Perdida", label: "Perdida" },
            ]}
          />
        </Field>
        <Field label="Observações sobre renovação" className="md:col-span-2">
          <TextArea
            value={cliente.renovacao_obs || ""}
            onChange={(e) => patch({ renovacao_obs: e.target.value })}
          />
        </Field>
      </Grid2>
    </Section>
  );
}

function ComunicacaoTab({ cliente, patch }: { cliente: Cliente; patch: (p: Partial<Cliente>) => void }) {
  return (
    <Section title="Comunicação ideal com o cliente">
      <p className="text-xs text-muted-foreground -mt-2">
        Defina como o CS deve se comunicar com este cliente. Útil para evitar ruído com o time e
        respeitar a preferência do cliente.
      </p>
      <Grid2>
        <Field label="Preferência de comunicação">
          <Select
            value={cliente.comunicacao_preferencia || "Grupo individual do cliente"}
            onChange={(v) =>
              patch({ comunicacao_preferencia: v as Cliente["comunicacao_preferencia"] })
            }
            options={[
              { value: "Grupo individual do cliente", label: "Grupo individual do cliente" },
              { value: "Grupo geral", label: "Grupo geral" },
              { value: "Privado com CS", label: "Privado com CS" },
              { value: "Direto com Galdino", label: "Direto com Galdino" },
            ]}
          />
        </Field>
        <Field label="Canal preferido">
          <Select
            value={cliente.comunicacao_canal || "WhatsApp"}
            onChange={(v) => patch({ comunicacao_canal: v as Cliente["comunicacao_canal"] })}
            options={[
              { value: "WhatsApp", label: "WhatsApp" },
              { value: "Telefone", label: "Telefone" },
              { value: "E-mail", label: "E-mail" },
              { value: "Reunião", label: "Reunião" },
            ]}
          />
        </Field>
      </Grid2>
      <Field label="Restrições / o que NÃO falar no grupo geral">
        <TextArea
          value={cliente.comunicacao_restricoes || ""}
          onChange={(e) => patch({ comunicacao_restricoes: e.target.value })}
          placeholder="Ex.: assuntos financeiros, reclamações, ajustes de contrato — falar apenas no privado."
        />
      </Field>
      <Field label="Resumo da comunicação ideal (escreva aqui o contexto)">
        <TextArea
          rows={4}
          value={cliente.comunicacao_resumo || ""}
          onChange={(e) => patch({ comunicacao_resumo: e.target.value })}
          placeholder="Ex.: O cliente prefere que falem com ele no privado. Não gosta que assuntos sensíveis vão para o grupo geral. Costuma responder à noite. Gosta de áudios curtos."
        />
      </Field>
    </Section>
  );
}

function Stat({ n, l, tone }: { n: string | number; l: string; tone?: string }) {
  return (
    <div>
      <div className={`text-xl font-bold tabular-nums ${tone || ""}`}>{n}</div>
      <div className="text-[10px] uppercase tracking-wider text-muted-foreground mt-0.5">{l}</div>
    </div>
  );
}

function AnotacoesTab({ cliente }: { cliente: Cliente }) {
  const [profile] = useProfile();
  // O original caía em "Maiara" quando não havia perfil. Aqui o autor é sempre
  // quem está logado: sem sessão resolvida, não se publica em nome de ninguém.
  const autor: ProfileName | null = profile;
  const [texto, setTexto] = useState("");
  const [imagens, setImagens] = useState<string[]>([]);
  const fileRef = useRef<HTMLInputElement>(null);

  const notas = useAnotacoesInternas(cliente.id);
  const notasOrdenadas = useMemo(() => {
    return [...notas].sort((a, b) => b.criado_em.localeCompare(a.criado_em));
  }, [notas]);

  function publicar() {
    const t = texto.trim();
    if (!t && imagens.length === 0) return;
    if (!autor) return;
    void addAnotacaoInterna(cliente.id, t, autor, imagens)
      .then(() => {
        setTexto("");
        setImagens([]);
      })
      .catch((e: unknown) => {
        toast.error(`Não foi possível publicar: ${e instanceof Error ? e.message : String(e)}`);
      });
  }

  async function onFiles(files: FileList | null) {
    if (!files) return;
    const novos: string[] = [];
    for (const f of Array.from(files).slice(0, 6)) {
      if (!f.type.startsWith("image/")) continue;
      if (f.size > 1_500_000) {
        toast.error(`Imagem "${f.name}" > 1,5MB. Comprima antes de anexar.`);
        continue;
      }
      const dataUrl = await new Promise<string>((resolve, reject) => {
        const r = new FileReader();
        r.onload = () => resolve(String(r.result));
        r.onerror = () => reject(r.error);
        r.readAsDataURL(f);
      });
      novos.push(dataUrl);
    }
    setImagens((prev) => [...prev, ...novos].slice(0, 6));
  }

  return (
    <div className="space-y-4">
      {/* Nova anotação */}
      <div className="rounded-lg border border-border bg-background p-4 space-y-3">
        <div className="text-sm font-semibold">Registrar visão da CS sobre o cliente</div>
        <div className="text-xs text-muted-foreground leading-relaxed">
          Escreva livremente a sua percepção atual. Cada registro cria uma nova entrada no histórico — nada é sobrescrito. Use como referência (não obrigatório):
        </div>
        <ul className="text-[11px] text-muted-foreground grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-1 list-disc pl-4">
          <li>Momento atual do cliente</li>
          <li>Participação e envolvimento</li>
          <li>Principais dificuldades</li>
          <li>Pontos de atenção</li>
          <li>Possíveis riscos</li>
          <li>Evoluções recentes</li>
          <li>O que está travando o cliente</li>
          <li>Próximo ponto a acompanhar</li>
        </ul>
        <TextArea
          value={texto}
          onChange={(e) => setTexto(e.target.value)}
          placeholder="Ex.: cliente respondeu rápido hoje, parece animado com a nova estratégia, mas ainda não enviou o material pendente..."
          rows={5}
        />
        {imagens.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {imagens.map((src, i) => (
              <div key={i} className="relative">
                <img
                  src={src}
                  alt={`anexo ${i + 1}`}
                  className="h-16 w-16 object-cover rounded-md border border-border"
                />
                <button
                  onClick={() => setImagens(imagens.filter((_, j) => j !== i))}
                  className="absolute -top-1.5 -right-1.5 bg-background border border-border rounded-full p-0.5 text-muted-foreground hover:text-foreground"
                >
                  <X className="h-3 w-3" />
                </button>
              </div>
            ))}
          </div>
        )}
        <div className="flex items-center justify-between gap-2">
          <button
            onClick={() => fileRef.current?.click()}
            className="inline-flex items-center gap-1.5 text-xs px-3 py-2 rounded-lg border border-border hover:border-primary"
          >
            <ImageIcon className="h-3.5 w-3.5" /> Anexar imagens
          </button>
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            multiple
            className="hidden"
            onChange={(e) => {
              void onFiles(e.target.files);
              e.target.value = "";
            }}
          />
          <button
            onClick={publicar}
            disabled={!autor || (!texto.trim() && imagens.length === 0)}
            className="inline-flex items-center gap-1.5 text-xs font-semibold px-4 py-2 rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <Send className="h-3.5 w-3.5" /> Publicar anotação
          </button>
        </div>
      </div>

      {/* Timeline */}
      <div className="space-y-3">
        {notasOrdenadas.length === 0 && (
          <div className="text-center text-xs text-muted-foreground py-8">
            Nenhuma anotação registrada ainda.
          </div>
        )}
        {notasOrdenadas.map((n) => (
          <NotaCard key={n.id} nota={n} clienteId={cliente.id} autorAtual={autor} />
        ))}
      </div>
    </div>
  );
}

function NotaCard({
  nota,
  clienteId,
  autorAtual,
}: {
  nota: AnotacaoInterna;
  clienteId: string;
  autorAtual: ProfileName | null;
}) {
  const [editing, setEditing] = useState(false);
  const [texto, setTexto] = useState(nota.texto);
  // No original a exceção era o nome "Maiara" (a coordenação). Aqui quem passa
  // por cima da autoria é o papel de admin do RBAC do PMC OS.
  const podeEditar = (!!autorAtual && autorAtual === nota.autor) || isAdmin();

  function salvar() {
    void updateAnotacaoInterna(clienteId, nota.id, { texto: texto.trim() })
      .then(() => setEditing(false))
      .catch((e: unknown) => {
        toast.error(`Não foi possível salvar: ${e instanceof Error ? e.message : String(e)}`);
      });
  }

  function excluir() {
    if (!confirm("Excluir esta anotação?")) return;
    void removeAnotacaoInterna(clienteId, nota.id).catch((e: unknown) => {
      toast.error(`Não foi possível excluir: ${e instanceof Error ? e.message : String(e)}`);
    });
  }

  function togglePin() {
    void updateAnotacaoInterna(clienteId, nota.id, { fixada: !nota.fixada }).catch((e: unknown) => {
      toast.error(`Não foi possível fixar: ${e instanceof Error ? e.message : String(e)}`);
    });
  }

  return (
    <div
      className={`rounded-lg border p-4 ${
        nota.fixada ? "border-primary/50 bg-primary/5" : "border-border bg-background"
      }`}
    >
      {editing ? (
        <>
          <TextArea value={texto} onChange={(e) => setTexto(e.target.value)} rows={4} />
          <div className="flex justify-end gap-2 mt-2">
            <button
              onClick={() => {
                setTexto(nota.texto);
                setEditing(false);
              }}
              className="text-xs px-3 py-1.5 rounded-lg border border-border"
            >
              Cancelar
            </button>
            <button
              onClick={salvar}
              className="text-xs font-semibold px-3 py-1.5 rounded-lg bg-primary text-primary-foreground"
            >
              Salvar
            </button>
          </div>
        </>
      ) : (
        <>
          {nota.texto && (
            <div className="text-sm whitespace-pre-wrap leading-relaxed">{nota.texto}</div>
          )}
          {nota.imagens && nota.imagens.length > 0 && (
            <div className="flex flex-wrap gap-2 mt-3">
              {nota.imagens.map((src, i) => (
                <a key={i} href={src} target="_blank" rel="noreferrer">
                  <img
                    src={src}
                    alt={`anexo ${i + 1}`}
                    className="h-20 w-20 object-cover rounded-md border border-border"
                  />
                </a>
              ))}
            </div>
          )}
        </>
      )}

      <div className="mt-3 pt-2 border-t border-border/60 flex items-center justify-between text-[11px] text-muted-foreground">
        <div>
          <span className="font-medium text-foreground/80">{nota.autor}</span>
          {" · "}
          {new Date(nota.criado_em).toLocaleDateString("pt-BR")}
          {" · "}
          {new Date(nota.criado_em).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}
          {nota.atualizado_em && (
            <span className="ml-1 italic">
              · Editado em {new Date(nota.atualizado_em).toLocaleDateString("pt-BR")}{" "}
              {new Date(nota.atualizado_em).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}
            </span>
          )}
        </div>
        {podeEditar && !editing && (
          <div className="flex items-center gap-2">
            <button
              onClick={togglePin}
              className={`hover:text-foreground ${nota.fixada ? "text-primary" : ""}`}
              title={nota.fixada ? "Desafixar" : "Fixar"}
            >
              <Pin className="h-3.5 w-3.5" />
            </button>
            <button onClick={() => setEditing(true)} className="hover:text-foreground" title="Editar">
              <Edit2 className="h-3.5 w-3.5" />
            </button>
            <button onClick={excluir} className="hover:text-status-red" title="Excluir">
              <Trash2 className="h-3.5 w-3.5" />
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
