/**
 * Converte para Date respeitando o fuso local.
 *
 * `new Date("2026-08-10")` é interpretado como meia-noite UTC — no Brasil isso
 * cai às 21h do dia 9, e qualquer comparação "é hoje?" erra por um dia. As
 * reuniões vêm de `crm_reunioes_v` como data pura (sem hora), então todo lugar
 * que transforma `reuniao.data` em Date precisa passar por aqui.
 *
 * Datas com hora ("2026-08-10T14:00:00Z") já são inequívocas e seguem direto.
 */
export function dataLocal(iso: string): Date {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso ?? "");
  if (!m) return new Date(iso);
  return new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
}

export function formatBR(iso: string | undefined | null): string {
  if (!iso) return "—";
  const d = dataLocal(iso);
  if (isNaN(d.getTime())) return "—";
  return d.toLocaleDateString("pt-BR");
}

export function inputDateValue(iso?: string): string {
  if (!iso) return "";
  const d = new Date(iso);
  return isNaN(d.getTime()) ? "" : d.toISOString().slice(0, 10);
}

export function fromInputDate(v: string): string {
  if (!v) return new Date().toISOString();
  return new Date(v + "T12:00:00").toISOString();
}

export type Period = "hoje" | "semana" | "mes" | "30dias";

export function inPeriod(iso: string | undefined, period: Period): boolean {
  if (!iso) return false;
  const d = new Date(iso).getTime();
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  if (period === "hoje") {
    return d >= today && d < today + 86400000;
  }
  if (period === "semana") {
    const day = now.getDay(); // 0 sun
    const monday = today - ((day + 6) % 7) * 86400000;
    return d >= monday && d < monday + 7 * 86400000;
  }
  if (period === "mes") {
    const first = new Date(now.getFullYear(), now.getMonth(), 1).getTime();
    const next = new Date(now.getFullYear(), now.getMonth() + 1, 1).getTime();
    return d >= first && d < next;
  }
  if (period === "30dias") {
    return d >= now.getTime() - 30 * 86400000 && d <= now.getTime() + 30 * 86400000;
  }
  return true;
}
