import type { ReactNode } from "react"
import { motion } from "framer-motion"

interface Props {
  icon: ReactNode
  title: string
  subtitle: string
}

export function RoadmapSectionHeader({ icon, title, subtitle }: Props) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="flex items-center gap-3 rounded-2xl border border-primary/20 bg-primary/10 px-5 py-4"
    >
      <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-primary/15 text-primary">
        {icon}
      </div>
      <div>
        <h2 className="text-base font-bold tracking-tight text-foreground">{title}</h2>
        <p className="text-xs font-medium text-muted-foreground">{subtitle}</p>
      </div>
    </motion.div>
  )
}
