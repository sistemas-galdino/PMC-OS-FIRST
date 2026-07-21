import { motion } from "framer-motion"
import { ChevronRightIcon } from "@/components/ui/icons"
import type { TipoReuniao } from "@/lib/atendimentos"

interface Props {
  tipos: TipoReuniao[]
  value: string | null
  onSelecionar: (slug: string) => void
}

// Passo "Assunto": aparece antes da data quando o consultor oferece 2+ tipos de
// reunião na mesma agenda (ex.: Leonardo → BlackCRM ou Vídeos com IA). Selecionar
// já avança pro passo de data (padrão dos outros passos deste fluxo).
export function StepAssunto({ tipos, value, onSelecionar }: Props) {
  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground font-medium">
        Sobre o que você quer conversar nesta reunião?
      </p>
      <div className="grid gap-3 sm:grid-cols-2">
        {tipos.map((t, idx) => {
          const selected = value === t.slug
          return (
            <motion.button
              key={t.slug}
              type="button"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.04 }}
              onClick={() => onSelecionar(t.slug)}
              className={`group flex items-start gap-4 rounded-xl border-2 p-5 text-left transition-all ${
                selected
                  ? "border-primary bg-primary/10 shadow-lg shadow-primary/20"
                  : "border-border bg-muted/10 hover:border-primary/40"
              }`}
            >
              <div className="flex-1 min-w-0 space-y-1">
                <div className={`font-bold text-base leading-tight ${selected ? "text-primary" : "text-foreground"}`}>
                  {t.label}
                </div>
                {t.descricao && (
                  <p className="text-xs text-muted-foreground leading-relaxed">{t.descricao}</p>
                )}
              </div>
              <ChevronRightIcon
                className={`size-5 shrink-0 mt-0.5 transition-colors ${
                  selected ? "text-primary" : "text-muted-foreground/40 group-hover:text-primary"
                }`}
              />
            </motion.button>
          )
        })}
      </div>
    </div>
  )
}
