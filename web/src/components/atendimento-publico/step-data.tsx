import { useMemo, useState } from "react"
import { motion } from "framer-motion"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { proximasDatasValidas, slotsDisponiveisNaData, isoData } from "@/lib/atendimentos"
import type { Disponibilidade, ExcecaoConsultor, Feriado } from "@/lib/atendimentos"

interface Props {
  disponibilidade: Disponibilidade[]
  excecoes: ExcecaoConsultor[]
  feriados: Feriado[]
  duracao_minutos: number
  ocupadosPorData: Map<string, Set<string>>
  value: string | null
  horario?: string | null
  onSelecionarData: (iso: string) => void
  onSelecionarHorario: (iso: string, slot: string) => void
}

const MESES_CURTO = ["jan", "fev", "mar", "abr", "mai", "jun", "jul", "ago", "set", "out", "nov", "dez"]
const DIAS_CURTO = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"]

// "14:00" → "14h", "14:30" → "14h30" (minutos só quando != 00).
function formatHora(hhmm: string): string {
  const [h, m] = hhmm.split(":")
  return m === "00" ? `${h}h` : `${h}h${m}`
}

// Quantos horários cabem numa linha do card sem mudar o tamanho dele.
const MAX_PILLS = 3

export function StepData({
  disponibilidade,
  excecoes,
  feriados,
  duracao_minutos,
  ocupadosPorData,
  value,
  horario,
  onSelecionarData,
  onSelecionarHorario,
}: Props) {
  const [limite, setLimite] = useState(12)

  const { cards, temMais } = useMemo(() => {
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
      incluirHojeAvulso: true,
    })
    const visiveis = todas.slice(0, limite).map(d => {
      const iso = isoData(d)
      const ocup = ocupadosPorData.get(iso) ?? new Set<string>()
      const livres = slotsDisponiveisNaData({
        data: d,
        janelas: disponibilidade,
        excecoes,
        feriados: feriadosSet,
        duracao_minutos,
        apenasAvulsoHoje: true,
      }).filter(s => !ocup.has(s))
      return { d, iso, livres }
    })
    return { cards: visiveis, temMais: todas.length > limite }
  }, [disponibilidade, excecoes, feriados, duracao_minutos, ocupadosPorData, limite])

  if (cards.length === 0) {
    return (
      <Card className="p-8 text-center">
        <p className="text-sm text-muted-foreground">Sem horários disponíveis no momento.</p>
      </Card>
    )
  }

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
      {cards.map(({ d, iso, livres }, idx) => {
        const selected = value === iso
        // Cabe MAX_PILLS itens na linha. Se sobra, mostra MAX_PILLS-1 horários + chip "+N".
        const overflow = livres.length > MAX_PILLS
        const visiveis = overflow ? livres.slice(0, MAX_PILLS - 1) : livres
        const restantes = livres.length - visiveis.length
        return (
          <motion.div
            key={iso}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: idx * 0.03 }}
            className={`group rounded-xl border-2 p-4 transition-all ${
              selected
                ? "border-primary bg-primary/10 shadow-lg shadow-primary/20"
                : "border-border bg-muted/10 hover:border-primary/40"
            }`}
          >
            <button
              type="button"
              onClick={() => onSelecionarData(iso)}
              className="block w-full text-left"
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
            </button>

            <div className="mt-3 flex items-center gap-1.5 overflow-hidden">
              {visiveis.map(slot => {
                const slotSelected = selected && horario === slot
                return (
                  <motion.button
                    key={slot}
                    type="button"
                    whileHover={{ scale: 1.08 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => onSelecionarHorario(iso, slot)}
                    className={`rounded-md border px-2 py-1 text-[11px] font-bold tracking-wide whitespace-nowrap transition-colors ${
                      slotSelected
                        ? "border-primary bg-primary text-primary-foreground"
                        : "border-primary/30 text-foreground hover:border-primary hover:bg-primary/10"
                    }`}
                  >
                    {formatHora(slot)}
                  </motion.button>
                )
              })}
              {overflow && (
                <button
                  type="button"
                  onClick={() => onSelecionarData(iso)}
                  className="rounded-md border border-border px-2 py-1 text-[11px] font-bold tracking-wide whitespace-nowrap text-muted-foreground transition-colors hover:border-primary/40 hover:text-foreground"
                >
                  +{restantes}
                </button>
              )}
            </div>
          </motion.div>
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
