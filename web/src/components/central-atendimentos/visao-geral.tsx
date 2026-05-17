import { useMemo } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import {
  CalendarIcon,
  ClockIcon,
  CheckCircle2Icon,
  UsersIcon,
} from "@/components/ui/icons"
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts"
import { formatarData, iniciais, STATUS_BADGE, STATUS_LABEL } from "@/lib/atendimentos"
import type { Consultor, AgendamentoCentral, StatusAgendamento } from "@/lib/atendimentos"

interface Props {
  consultores: Consultor[]
  agendamentos: AgendamentoCentral[]
}

function dentroDoMes(dataIso: string | null, ano: number, mes: number): boolean {
  if (!dataIso) return false
  const d = new Date(dataIso + "T00:00:00")
  return d.getFullYear() === ano && d.getMonth() === mes
}

export function VisaoGeral({ consultores, agendamentos }: Props) {
  const hoje = new Date()
  const ano = hoje.getFullYear()
  const mes = hoje.getMonth()

  const stats = useMemo(() => {
    const noMes = agendamentos.filter(a => dentroDoMes(a.data_reuniao, ano, mes))
    const realizados = noMes.filter(a => a.status_agendamento === "realizado").length
    const confirmados = noMes.filter(a => a.status_agendamento === "confirmado").length
    const pendentes = noMes.filter(a => a.status_agendamento === "pendente_sync").length
    return { total: noMes.length, realizados, confirmados, pendentes }
  }, [agendamentos, ano, mes])

  const proximas = useMemo(() => {
    const hojeIso = hoje.toISOString().slice(0, 10)
    return agendamentos
      .filter(a => a.data_reuniao && a.data_reuniao >= hojeIso && a.status_agendamento !== "cancelado")
      .sort((a, b) => {
        if (!a.data_reuniao || !b.data_reuniao) return 0
        const dataCompare = a.data_reuniao.localeCompare(b.data_reuniao)
        if (dataCompare !== 0) return dataCompare
        return (a.horario ?? "").localeCompare(b.horario ?? "")
      })
      .slice(0, 5)
  }, [agendamentos])

  const distribuicao = useMemo(() => {
    const map: Record<string, number> = {}
    for (const a of agendamentos) {
      const k = a.consultor_nome ?? "Sem consultor"
      map[k] = (map[k] ?? 0) + 1
    }
    return Object.entries(map)
      .map(([nome, total]) => ({ nome, total }))
      .sort((a, b) => b.total - a.total)
      .slice(0, 8)
  }, [agendamentos])

  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Agendamentos no mês" value={stats.total} icon={<CalendarIcon className="size-5 text-primary" />} />
        <StatCard label="Confirmados" value={stats.confirmados} icon={<CheckCircle2Icon className="size-5 text-primary" />} />
        <StatCard label="Pendentes de sync" value={stats.pendentes} icon={<ClockIcon className="size-5 text-amber-400" />} />
        <StatCard label="Consultores ativos" value={consultores.filter(c => c.ativo).length} icon={<UsersIcon className="size-5 text-primary" />} />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardContent className="p-6 space-y-5">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-bold tracking-tight text-foreground">Próximas reuniões</h3>
              <Badge variant="outline" className="text-[10px] uppercase tracking-widest font-bold bg-muted/20 border-border text-muted-foreground">
                Top 5
              </Badge>
            </div>
            {proximas.length === 0 ? (
              <p className="text-sm text-muted-foreground py-8 text-center">Nenhuma reunião agendada via sistema ainda.</p>
            ) : (
              <ul className="space-y-3">
                {proximas.map(p => (
                  <li key={p.id_unico} className="flex items-center gap-4 p-3 rounded-xl bg-muted/10 border border-border/50">
                    <div className="flex size-10 items-center justify-center rounded-lg bg-primary/10 text-primary font-bold text-xs">
                      {iniciais(p.consultor_nome ?? "?")}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="font-semibold text-sm text-foreground truncate">{p.consultor_nome}</div>
                      <div className="text-xs text-muted-foreground truncate">
                        {p.cliente_nome ?? p.cliente_email ?? "Cliente"}{p.empresa ? ` · ${p.empresa}` : ""}
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      <div className="text-xs font-bold text-foreground">{formatarData(p.data_reuniao)}</div>
                      <div className="text-[11px] text-muted-foreground">{(p.horario ?? "").slice(0, 5)}</div>
                    </div>
                    {p.status_agendamento && (
                      <Badge variant="outline" className={`uppercase font-bold text-[9px] px-2 ${STATUS_BADGE[p.status_agendamento as StatusAgendamento]}`}>
                        {STATUS_LABEL[p.status_agendamento as StatusAgendamento]}
                      </Badge>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6 space-y-5">
            <h3 className="text-base font-bold tracking-tight text-foreground">Reuniões por consultor</h3>
            {distribuicao.length === 0 ? (
              <p className="text-sm text-muted-foreground py-8 text-center">Sem dados ainda.</p>
            ) : (
              <div className="h-64 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={distribuicao} margin={{ top: 8, right: 8, left: -16, bottom: 30 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" opacity={0.3} />
                    <XAxis
                      dataKey="nome"
                      stroke="var(--color-muted-foreground)"
                      fontSize={10}
                      tickLine={false}
                      axisLine={false}
                      interval={0}
                      angle={-25}
                      textAnchor="end"
                      height={50}
                    />
                    <YAxis
                      stroke="var(--color-muted-foreground)"
                      fontSize={11}
                      tickLine={false}
                      axisLine={false}
                      allowDecimals={false}
                      width={28}
                    />
                    <Tooltip
                      cursor={{ fill: "var(--color-muted)", opacity: 0.2 }}
                      contentStyle={{
                        background: "var(--color-background)",
                        border: "1px solid var(--color-border)",
                        borderRadius: 12,
                        fontSize: 12,
                      }}
                      formatter={(v: any) => [Number(v), "Reuniões"] as [number, string]}
                    />
                    <Bar dataKey="total" fill="var(--color-primary)" radius={[6, 6, 0, 0]} maxBarSize={48} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

function StatCard({ label, value, icon }: { label: string; value: number; icon: React.ReactNode }) {
  return (
    <Card>
      <CardContent className="p-5 flex items-start justify-between">
        <div className="space-y-2">
          <div className="text-[11px] uppercase font-bold tracking-widest text-muted-foreground">{label}</div>
          <div className="text-3xl font-bold tracking-tight text-foreground">{value}</div>
        </div>
        <div className="bg-primary/10 size-10 rounded-xl flex items-center justify-center">
          {icon}
        </div>
      </CardContent>
    </Card>
  )
}
