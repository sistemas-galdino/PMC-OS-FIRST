import { useMemo, useState } from "react"
import { motion } from "framer-motion"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { proximasDatasValidas, isoData } from "@/lib/atendimentos"
import type { Disponibilidade, ExcecaoConsultor, Feriado } from "@/lib/atendimentos"

interface Props {
  disponibilidade: Disponibilidade[]
  excecoes: ExcecaoConsultor[]
  feriados: Feriado[]
  duracao_minutos: number
  ocupadosPorData: Map<string, Set<string>>
  value: string | null
  onChange: (iso: string) => void
}

const MESES_CURTO = ["jan", "fev", "mar", "abr", "mai", "jun", "jul", "ago", "set", "out", "nov", "dez"]
const DIAS_CURTO = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"]

export function StepData({ disponibilidade, excecoes, feriados, duracao_minutos, ocupadosPorData, value, onChange }: Props) {
  const [limite, setLimite] = useState(12)

  const { datas, temMais } = useMemo(() => {
    const feriadosSet = new Set(feriados.map(f => f.data))
    // Pede uma data a mais que o limite pra saber se ainda há próximas (evita "Ver mais" morto).
    const todas = proximasDatasValidas({
      disponibilidade,
      excecoes,
      feriados: feriadosSet,
      n: limite + 1,
      startOffsetDays: 1,
      ocupadosPorData,
      duracao_minutos,
    })
    return { datas: todas.slice(0, limite), temMais: todas.length > limite }
  }, [disponibilidade, excecoes, feriados, duracao_minutos, ocupadosPorData, limite])

  if (datas.length === 0) {
    return (
      <Card className="p-8 text-center">
        <p className="text-sm text-muted-foreground">Sem horários disponíveis no momento.</p>
      </Card>
    )
  }

  return (
    <div className="space-y-4">
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

      {temMais && (
        <div className="flex justify-center">
          <Button variant="outline" onClick={() => setLimite(l => l + 12)} className="font-bold">
            Ver mais datas
          </Button>
        </div>
      )}
    </div>
  )
}
