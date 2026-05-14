import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts"
import { FASES } from "@/lib/roadmap"
import type { RoadmapItem } from "@/lib/roadmap"

export function GraficoProjetosFase({ itens }: { itens: RoadmapItem[] }) {
  const data = FASES.map(f => ({
    label: f.label,
    total: itens.filter(i => i.fase === f.value).length,
  }))

  return (
    <div className="h-56 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 8, right: 8, left: -16, bottom: 30 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" opacity={0.3} />
          <XAxis
            dataKey="label"
            stroke="var(--color-muted-foreground)"
            fontSize={9}
            tickLine={false}
            axisLine={false}
            interval={0}
            angle={-35}
            textAnchor="end"
            height={50}
            dy={2}
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
            formatter={(v: any) => [Number(v), "Itens"] as [number, string]}
          />
          <Bar dataKey="total" fill="var(--color-primary)" radius={[6, 6, 0, 0]} maxBarSize={48} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}
