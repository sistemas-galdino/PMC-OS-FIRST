import { motion } from "framer-motion"

interface Props {
  children: React.ReactNode
  pretitle?: string
  title?: string
  subtitle?: string
}

export function PublicoLayout({ children, pretitle, title, subtitle }: Props) {
  return (
    <div className="min-h-screen bg-background text-foreground antialiased">
      <div className="mx-auto max-w-5xl px-6 py-12 md:py-16">
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="mb-10 space-y-3"
        >
          {pretitle && (
            <div className="text-[11px] font-bold uppercase tracking-[0.3em] text-primary">{pretitle}</div>
          )}
          {title && (
            <h1 className="text-3xl md:text-4xl font-bold tracking-tight">{title}</h1>
          )}
          {subtitle && (
            <p className="text-sm md:text-base text-muted-foreground max-w-2xl">{subtitle}</p>
          )}
        </motion.div>

        {children}
      </div>
    </div>
  )
}
