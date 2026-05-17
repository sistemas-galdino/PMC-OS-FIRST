import { useMemo } from "react"
import { motion } from "framer-motion"
import { Card } from "@/components/ui/card"
import { proximasDatasValidas, isoData } from "@/lib/atendimentos"
import type { Disponibilidade } from "@/lib/atendimentos"

interface Props {
  disponibilidade: Disponibilidade[]
  value: string | null
  onChange: (iso: string) => void
}

const MESES_CURTO = ["jan", "fev", "mar", "abr", "mai", "jun", "jul", "ago", "set", "out", "nov", "dez"]
const DIAS_CURTO = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"]

export function StepData({ disponibilidade, value, onChange }: Props) {
  const datas = useMemo(() => proximasDatasValidas(disponibilidade, 12, 1), [disponibilidade])

  if (datas.length === 0) {
    return (
      <Card className="p-8 text-center">
        <p className="text-sm text-muted-foreground">Sem horários disponíveis no momento.</p>
      </Card>
    )
  }

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
      {datas.map((d, idx) => {
        const iso = isoData(d)
        const selected = value === iso
        return (
          <motion.button
            key={iso}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: idx * 0.03 }}
            onClick={() => onChange(iso)}
            className={`group rounded-xl border-2 p-4 text-left transition-all ${
              selected
                ? "border-primary bg-primary/10 shadow-lg shadow-primary/20"
                : "border-border bg-muted/10 hover:border-primary/40"
            }`}
          >
            <div className={`text-[10px] font-bold uppercase tracking-widest ${selected ? "text-primary" : "text-muted-foreground"}`}>
              {DIAS_CURTO[d.getDay()]}
            </div>
            <div className={`text-3xl font-bold mt-1 ${selected ? "text-primary" : "text-foreground"}`}>
              {d.getDate()}
            </div>
            <div className="text-xs text-muted-foreground uppercase tracking-wider font-semibold">
              {MESES_CURTO[d.getMonth()]}
            </div>
          </motion.button>
        )
      })}
    </div>
  )
}
