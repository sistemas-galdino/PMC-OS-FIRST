import { cn } from "@/lib/utils"

interface SpinnerProps {
  className?: string
}

export function Spinner({ className }: SpinnerProps) {
  return (
    <span
      role="status"
      aria-label="Carregando"
      className={cn(
        "inline-block size-4 rounded-full border-2 border-transparent border-t-current animate-spin",
        className,
      )}
    />
  )
}
