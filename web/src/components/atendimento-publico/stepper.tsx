import { motion } from "framer-motion"
import { CheckIcon } from "@/components/ui/icons"

interface Props {
  steps: string[]
  current: number
}

export function Stepper({ steps, current }: Props) {
  return (
    <div className="flex items-center gap-3 overflow-x-auto pb-2">
      {steps.map((label, i) => {
        const done = i < current
        const active = i === current
        return (
          <div key={i} className="flex items-center gap-3 shrink-0">
            <motion.div
              initial={{ scale: 0.8 }}
              animate={{ scale: 1 }}
              className={`flex size-8 items-center justify-center rounded-full text-xs font-bold border-2 transition-colors ${
                done
                  ? "bg-primary border-primary text-primary-foreground"
                  : active
                  ? "bg-primary/10 border-primary text-primary"
                  : "bg-muted/20 border-border text-muted-foreground"
              }`}
            >
              {done ? <CheckIcon className="size-4" /> : i + 1}
            </motion.div>
            <span className={`text-[11px] uppercase font-bold tracking-widest ${active || done ? "text-foreground" : "text-muted-foreground"}`}>
              {label}
            </span>
            {i < steps.length - 1 && (
              <div className={`h-px w-8 ${done ? "bg-primary" : "bg-border"}`} />
            )}
          </div>
        )
      })}
    </div>
  )
}
