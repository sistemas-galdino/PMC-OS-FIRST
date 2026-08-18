import { motion } from "framer-motion"

/**
 * Placeholder das abas do CS Manager ainda não portadas.
 * Cada aba substitui este componente pela tela real conforme as fases avançam.
 * Ver: .claude/plans/… (port do "PMC · CS Manager" da Mayara)
 */
export function CrmEmConstrucao({ aba, descricao }: { aba: string; descricao: string }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex min-h-[60vh] flex-col items-center justify-center gap-3 text-center"
    >
      <span className="text-[10px] font-semibold uppercase tracking-[0.4em] text-muted-foreground">
        CRM · CS Manager
      </span>
      <h1 className="text-3xl font-bold tracking-tight">{aba}</h1>
      <p className="max-w-md text-sm text-muted-foreground">{descricao}</p>
      <span className="mt-2 rounded-full border border-primary/40 bg-primary/10 px-3 py-1 text-[11px] font-bold uppercase tracking-wider text-primary">
        Em construção
      </span>
    </motion.div>
  )
}
