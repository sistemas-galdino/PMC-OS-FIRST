import { useMemo } from "react"
import { motion } from "framer-motion"
import { Card } from "@/components/ui/card"
import { slotsDoDia } from "@/lib/atendimentos"
import type { Disponibilidade } from "@/lib/atendimentos"

interface Props {
  disponibilidade: Disponibilidade[]
  duracao_minutos: number
  data: string
  slotsOcupados: string[]
  value: string | null
  onChange: (slot: string) => void
}

export function StepHorario({ disponibilidade, duracao_minutos, data, slotsOcupados, value, onChange }: Props) {
  const slots = useMemo(() => {
    const diaSemana = new Date(data + "T00:00:00").getDay()
    const janelas = disponibilidade.filter(d => d.dia_semana === diaSemana)
    return slotsDoDia(janelas, duracao_minutos)
  }, [disponibilidade, duracao_minutos, data])

  const ocupados = new Set(slotsOcupados.map(s => s.slice(0, 5)))

  if (slots.length === 0) {
    return (
      <Card className="p-8 text-center">
        <p className="text-sm text-muted-foreground">Sem horários disponíveis nesse dia.</p>
      </Card>
    )
  }

  const livres = slots.filter(s => !ocupados.has(s))

  if (livres.length === 0) {
    return (
      <Card className="p-8 text-center">
        <p className="text-sm text-muted-foreground">Todos os horários desse dia já estão ocupados. Tente outra data.</p>
      </Card>
    )
  }

  return (
    <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-2">
      {slots.map((slot, idx) => {
        const ocupado = ocupados.has(slot)
        const selected = value === slot
        return (
          <motion.button
            key={slot}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: idx * 0.02 }}
            disabled={ocupado}
            onClick={() => onChange(slot)}
            className={`rounded-lg border-2 px-3 py-3 text-sm font-bold tracking-wider transition-all disabled:cursor-not-allowed disabled:opacity-30 ${
              selected
                ? "border-primary bg-primary text-primary-foreground shadow-lg shadow-primary/20"
                : ocupado
                ? "border-border bg-muted/10 text-muted-foreground line-through"
                : "border-border bg-muted/10 text-foreground hover:border-primary/40 hover:bg-primary/5"
            }`}
          >
            {slot}
          </motion.button>
        )
      })}
    </div>
  )
}
