import { useEffect, useState } from "react"
import { supabase } from "@/lib/supabase"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { BarChart3Icon as BarChart3 } from "@/components/ui/icons"
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts"

interface Props {
  clientId?: string
}

interface Row {
  ano: number
  mes: number
  faturamento: number
}

const MES_ABREV = ["jan", "fev", "mar", "abr", "mai", "jun", "jul", "ago", "set", "out", "nov", "dez"]

const fmtBRL = (n: number) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 }).format(n || 0)

const fmtAxis = (n: number) => {
  if (n >= 1_000_000) return `R$ ${(n / 1_000_000).toFixed(1)}M`
  if (n >= 1_000) return `R$ ${(n / 1_000).toFixed(0)}K`
  return `R$ ${n}`
}

export function GraficoFaturamentoMensal({ clientId }: Props) {
  const [rows, setRows] = useState<Row[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!clientId) { setLoading(false); return }
    async function fetchData() {
      const { data } = await supabase
        .from("cliente_indicadores_mensais")
        .select("ano, mes, faturamento")
        .eq("id_cliente", clientId)
        .order("ano", { ascending: true })
        .order("mes", { ascending: true })
      setRows((data as Row[]) || [])
      setLoading(false)
    }
    fetchData()
  }, [clientId])

  const byKey = new Map(rows.map(r => [`${r.ano}-${r.mes}`, Number(r.faturamento) || 0]))
  const now = new Date()
  const chartData: { label: string; faturamento: number }[] = []
  for (let i = 11; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
    const ano = d.getFullYear()
    const mes = d.getMonth() + 1
    chartData.push({
      label: `${MES_ABREV[mes - 1]}/${String(ano).slice(-2)}`,
      faturamento: byKey.get(`${ano}-${mes}`) ?? 0,
    })
  }
  const temDados = rows.length > 0

  return (
    <Card>
      <CardHeader className="border-b border-border/50 pb-4">
        <div className="flex items-center gap-3">
          <div className="bg-primary/10 p-2 rounded-lg">
            <BarChart3 className="size-5 text-primary" />
          </div>
          <div>
            <CardTitle className="text-base font-bold tracking-tight">Faturamento Mensal</CardTitle>
            <p className="text-xs text-muted-foreground font-medium mt-0.5">Últimos 12 meses cadastrados</p>
          </div>
        </div>
      </CardHeader>
      <CardContent className="pt-6">
        {loading ? (
          <div className="h-64 animate-pulse bg-card/40 rounded-lg" />
        ) : !temDados ? (
          <div className="py-12 text-center text-sm text-muted-foreground">
            Cadastre indicadores em <span className="font-semibold text-foreground">/indicadores</span> para visualizar a evolução.
          </div>
        ) : (
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} margin={{ top: 8, right: 8, left: 8, bottom: 8 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" opacity={0.3} />
                <XAxis dataKey="label" stroke="var(--color-muted-foreground)" fontSize={11} tickLine={false} axisLine={false} interval={0} />
                <YAxis stroke="var(--color-muted-foreground)" fontSize={11} tickFormatter={fmtAxis} tickLine={false} axisLine={false} width={70} />
                <Tooltip
                  cursor={{ fill: "var(--color-muted)", opacity: 0.2 }}
                  contentStyle={{
                    background: "var(--color-background)",
                    border: "1px solid var(--color-border)",
                    borderRadius: 12,
                    fontSize: 12,
                  }}
                  formatter={(v: any) => [fmtBRL(Number(v)), "Faturamento"] as [string, string]}
                />
                <Bar dataKey="faturamento" fill="var(--color-primary)" radius={[8, 8, 0, 0]} maxBarSize={64} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
