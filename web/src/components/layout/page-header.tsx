import { motion } from "framer-motion"
import { cn } from "@/lib/utils"

interface PageHeaderProps {
  /** Título principal da página */
  title: React.ReactNode
  /** Descrição opcional exibida abaixo do título */
  description?: React.ReactNode
  /** Ação opcional (botão, filtros...) alinhada à direita */
  action?: React.ReactNode
  /** Classes extras para o container */
  className?: string
}

/**
 * Cabeçalho padrão das páginas do cliente:
 * barra verde à esquerda, título grande, descrição e slot de ação à direita.
 */
export function PageHeader({ title, description, action, className }: PageHeaderProps) {
  return (
    <motion.div
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.6 }}
      className={cn(
        "flex flex-col gap-5 border-l-4 border-primary pl-8 py-2 md:flex-row md:items-start md:justify-between",
        className,
      )}
    >
      <div className="flex flex-col gap-2 max-w-2xl">
        <h1 className="text-3xl lg:text-4xl font-bold tracking-tight text-foreground leading-tight">
          {title}
        </h1>
        {description && (
          <p className="text-sm text-muted-foreground font-medium leading-relaxed">
            {description}
          </p>
        )}
      </div>
      {action && <div className="shrink-0">{action}</div>}
    </motion.div>
  )
}
