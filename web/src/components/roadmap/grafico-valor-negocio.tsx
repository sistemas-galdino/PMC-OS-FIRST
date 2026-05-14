import { PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer } from "recharts"
import { VALORES } from "@/lib/roadmap"
import type { RoadmapItem } from "@/lib/roadmap"

const COLORS: Record<string, string> = {
  alto: "var(--color-primary)",
  medio: "color-mix(in srgb, var(--color-primary) 45%, var(--color-muted))",
  baixo: "var(--color-muted)",
}

export function GraficoValorNegocio({ itens }: { itens: RoadmapItem[] }) {
  const data = VALORES.map(v => ({
    key: v.value,
    label: v.label,
    value: itens.filter(it => it.valor === v.value).length,
  })).filter(d => d.value > 0)

  if (data.length === 0) {
    return (
      <div className="flex h-56 items-center justify-center text-sm text-muted-foreground">
        Cadastre itens para visualizar a distribuição.
      </div>
    )
  }

  return (
    <div className="h-56 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie
            data={data}
            cx="50%"
            cy="50%"
            innerRadius={50}
            outerRadius={80}
            paddingAngle={4}
            dataKey="value"
            nameKey="label"
          >
            {data.map(d => (
              <Cell key={d.key} fill={COLORS[d.key]} stroke="var(--color-background)" strokeWidth={2} />
            ))}
          </Pie>
          <Tooltip
            contentStyle={{
              background: "var(--color-background)",
              border: "1px solid var(--color-border)",
              borderRadius: 12,
              fontSize: 12,
            }}
            formatter={(v: any, n: any) => [Number(v), String(n)] as [number, string]}
          />
          <Legend
            verticalAlign="bottom"
            align="center"
            iconType="circle"
            formatter={(value) => (
              <span className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
                {value}
              </span>
            )}
          />
        </PieChart>
      </ResponsiveContainer>
    </div>
  )
}
