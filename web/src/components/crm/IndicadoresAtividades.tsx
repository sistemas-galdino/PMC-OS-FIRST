import { useMemo } from "react";
import { useAtividades, useClientes, useReunioes } from "@/lib/crm/storage";
import type { CSName } from "@/lib/crm/types";

export type CardId =
  | "concluidas"
  | "em_andamento"
  | "atrasadas"
  | "aguardando"
  | "reun_cliente"
  | "reun_time"
  | "carteira";

function toISODate(d: Date) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${dd}`;
}

function dateOnly(iso?: string) {
  return iso ? iso.slice(0, 10) : "";
}

function noIntervalo(iso: string | undefined, ini: string, fim: string) {
  const d = dateOnly(iso);
  return !!d && d >= ini && d <= fim;
}

function formatDuracao(min: number) {
  if (min <= 0) return "0min";
  const h = Math.floor(min / 60);
  const m = min % 60;
  if (!h) return `${m}min`;
  if (!m) return `${h}h`;
  return `${h}h ${m}min`;
}

function diffDias(isoA: string, hoje: Date) {
  const a = new Date(`${dateOnly(isoA)}T12:00:00`);
  return Math.max(0, Math.round((hoje.getTime() - a.getTime()) / 86400000));
}

interface CardProps {
  id: CardId;
  label: string;
  valor: string;
  subtitulo?: string;
  danger?: boolean;
  subAmber?: boolean;
  selected: boolean;
  onSelect: (id: CardId) => void;
}

function IndicadorCard({
  id,
  label,
  valor,
  subtitulo,
  danger,
  subAmber,
  selected,
  onSelect,
}: CardProps) {
  return (
    <button
      type="button"
      onClick={() => onSelect(id)}
      className="text-left rounded-lg p-3.5 transition-colors"
      style={{
        background: danger ? "rgba(214, 69, 69, 0.12)" : "#1E1E1E",
        border: selected ? "2px solid #DAFC67" : "2px solid transparent",
      }}
    >
      <div className="text-[13px]" style={{ color: danger ? "#E36A6A" : "#8A8A8A" }}>
        {label}
      </div>
      <div
        className="text-2xl font-medium mt-1 leading-none"
        style={{ color: danger ? "#E36A6A" : "#FFFFFF" }}
      >
        {valor}
      </div>
      {subtitulo && (
        <div
          className="text-xs mt-1.5"
          style={{ color: danger ? "#C25A5A" : subAmber ? "#EF9F27" : "#6B6B6B" }}
        >
          {subtitulo}
        </div>
      )}
    </button>
  );
}

interface Props {
  cs: CSName | null;
  inicio: Date;
  fim: Date;
  hoje: Date;
  selected: CardId | null;
  onSelect: (id: CardId) => void;
}

export function IndicadoresAtividades({ cs, inicio, fim, hoje, selected, onSelect }: Props) {
  const atividades = useAtividades();
  const reunioes = useReunioes();
  const clientes = useClientes();

  const dados = useMemo(() => {
    const ini = toISODate(inicio);
    const end = toISODate(fim);
    const hojeISO = toISODate(hoje);

    // janela anterior de mesma duração
    const durMs = new Date(`${end}T12:00:00`).getTime() - new Date(`${ini}T12:00:00`).getTime();
    const prevFim = new Date(new Date(`${ini}T12:00:00`).getTime() - 86400000);
    const prevIni = new Date(prevFim.getTime() - durMs);
    const prevIniISO = toISODate(prevIni);
    const prevFimISO = toISODate(prevFim);

    const ats = cs ? atividades.filter((a) => a.cs_responsavel === cs) : atividades;
    const reus = cs ? reunioes.filter((r) => r.cs_responsavel === cs) : reunioes;
    const cli = clientes.filter(
      (c) => (!cs || c.responsavel_cs === cs) && c.status === "Ativo" && c.pausado !== true,
    );

    const concluidas = ats.filter(
      (a) => a.status === "Concluída" && noIntervalo(a.data_conclusao, ini, end),
    );
    const concluidasPrev = ats.filter(
      (a) => a.status === "Concluída" && noIntervalo(a.data_conclusao, prevIniISO, prevFimISO),
    );
    const delta = concluidas.length - concluidasPrev.length;

    const emAndamento = ats.filter((a) => a.status === "Em andamento");

    const atrasadas = ats.filter(
      (a) => dateOnly(a.data_prevista) < hojeISO && a.status !== "Concluída",
    );
    const maisAntiga = atrasadas.reduce<string | null>(
      (acc, a) => (!acc || dateOnly(a.data_prevista) < acc ? dateOnly(a.data_prevista) : acc),
      null,
    );

    const aguardCliente = ats.filter((a) => a.status === "Aguardando cliente");
    const aguardTime = ats.filter((a) => a.status === "Aguardando time interno");

    const reuCliente = reus.filter(
      (r) => r.tipo === "Cliente" && r.status === "Realizada" && noIntervalo(r.data, ini, end),
    );
    const reuTime = reus.filter(
      (r) => r.tipo === "Time PMC" && r.status === "Realizada" && noIntervalo(r.data, ini, end),
    );
    const soma = (list: typeof reus) => list.reduce((s, r) => s + (r.duracao_minutos || 0), 0);

    const tocados = new Set<string>();
    reuCliente.forEach((r) => r.cliente_id && tocados.add(r.cliente_id));
    reus
      .filter((r) => r.status === "Realizada" && noIntervalo(r.data, ini, end))
      .forEach((r) => r.cliente_id && tocados.add(r.cliente_id));
    concluidas.forEach((a) => a.cliente_id && tocados.add(a.cliente_id));
    const tocadosCarteira = cli.filter((c) => tocados.has(c.id)).length;

    return {
      concluidas: concluidas.length,
      delta,
      emAndamento: emAndamento.length,
      atrasadas: atrasadas.length,
      maisAntigaDias: maisAntiga ? diffDias(maisAntiga, hoje) : null,
      aguardando: aguardCliente.length + aguardTime.length,
      aguardCliente: aguardCliente.length,
      aguardTime: aguardTime.length,
      reuCliente: reuCliente.length,
      reuClienteMin: soma(reuCliente),
      reuTime: reuTime.length,
      reuTimeMin: soma(reuTime),
      carteiraTotal: cli.length,
      carteiraTocada: tocadosCarteira,
    };
  }, [atividades, reunioes, clientes, cs, inicio, fim, hoje]);

  const gridClass = "grid grid-cols-4 gap-3";

  return (
    <section className="mt-6 max-w-[1100px] space-y-6">
      <div>
        <div className="text-[13px] text-muted-foreground mb-2">Tarefas</div>
        <div className={gridClass}>
          <IndicadorCard
            id="concluidas"
            label="Concluídas"
            valor={String(dados.concluidas)}
            subtitulo={
              dados.concluidas > 0
                ? `${dados.delta >= 0 ? "+" : ""}${dados.delta} vs. período anterior`
                : undefined
            }
            selected={selected === "concluidas"}
            onSelect={onSelect}
          />
          <IndicadorCard
            id="em_andamento"
            label="Em andamento"
            valor={String(dados.emAndamento)}
            selected={selected === "em_andamento"}
            onSelect={onSelect}
          />
          <IndicadorCard
            id="atrasadas"
            label="Atrasadas"
            valor={String(dados.atrasadas)}
            subtitulo={
              dados.atrasadas > 0 && dados.maisAntigaDias !== null
                ? `a mais antiga há ${dados.maisAntigaDias} dias`
                : undefined
            }
            danger
            selected={selected === "atrasadas"}
            onSelect={onSelect}
          />
          <IndicadorCard
            id="aguardando"
            label="Aguardando"
            valor={String(dados.aguardando)}
            subtitulo={
              dados.aguardando > 0
                ? `${dados.aguardCliente} cliente · ${dados.aguardTime} time`
                : undefined
            }
            selected={selected === "aguardando"}
            onSelect={onSelect}
          />
        </div>
      </div>

      <div>
        <div className="text-[13px] text-muted-foreground mb-2">Reuniões e carteira</div>
        <div className={gridClass}>
          <IndicadorCard
            id="reun_cliente"
            label="Com clientes"
            valor={String(dados.reuCliente)}
            subtitulo={dados.reuCliente > 0 ? formatDuracao(dados.reuClienteMin) : undefined}
            selected={selected === "reun_cliente"}
            onSelect={onSelect}
          />
          <IndicadorCard
            id="reun_time"
            label="Internas PMC"
            valor={String(dados.reuTime)}
            subtitulo={dados.reuTime > 0 ? formatDuracao(dados.reuTimeMin) : undefined}
            selected={selected === "reun_time"}
            onSelect={onSelect}
          />
          <IndicadorCard
            id="carteira"
            label="Carteira tocada"
            valor={`${dados.carteiraTocada} / ${dados.carteiraTotal}`}
            subtitulo={
              dados.carteiraTocada > 0
                ? `${Math.max(0, dados.carteiraTotal - dados.carteiraTocada)} sem contato`
                : undefined
            }
            subAmber
            selected={selected === "carteira"}
            onSelect={onSelect}
          />
          <div aria-hidden="true" />
        </div>
      </div>
    </section>
  );
}
