import { useMemo } from "react"
import { motion } from "framer-motion"
import { Card } from "@/components/ui/card"
import { slotsDisponiveisNaData } from "@/lib/atendimentos"
import type { Disponibilidade, ExcecaoConsultor, Feriado } from "@/lib/atendimentos"

interface Props {
  disponibilidade: Disponibilidade[]
  excecoes: ExcecaoConsultor[]
  feriados: Feriado[]
  duracao_minutos: number
  data: string
  slotsOcupados: string[]
  value: string | null
  onChange: (slot: string) => void
}

export function StepHorario({
  disponibilidade,
  excecoes,
  feriados,
  duracao_minutos,
  data,
  slotsOcupados,
  value,
  onChange,
}: Props) {
  const slots = useMemo(() => {
    const feriadosSet = new Set(feriados.map(f => f.data))
    return slotsDisponiveisNaData({
      data: new Date(data + "T00:00:00"),
      janelas: disponibilidade,
      excecoes,
      feriados: feriadosSet,
      duracao_minutos,
      apenasAvulsoHoje: true,
    })
  }, [disponibilidade, excecoes, feriados, duracao_minutos, data])

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
      {livres.map((slot, idx) => {
        const selected = value === slot
        return (
          <motion.button
            key={slot}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: idx * 0.02 }}
            onClick={() => onChange(slot)}
            className={`rounded-lg border-2 px-3 py-3 text-sm font-bold tracking-wider transition-all ${
              selected
                ? "border-primary bg-primary text-primary-foreground shadow-lg shadow-primary/20"
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
