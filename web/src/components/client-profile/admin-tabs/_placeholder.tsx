import { Card } from "@/components/ui/card"

interface EmptyTabPlaceholderProps {
  titulo: string
  descricao?: string
}

export function EmptyTabPlaceholder({ titulo, descricao }: EmptyTabPlaceholderProps) {
  return (
    <Card className="p-12 flex flex-col items-center justify-center text-center gap-3 hover:translate-y-0">
      <div className="size-14 rounded-2xl bg-muted/30 border border-border flex items-center justify-center text-muted-foreground text-xl font-bold">
        ◯
      </div>
      <h3 className="text-lg font-bold tracking-tight text-foreground">{titulo}</h3>
      <p className="text-sm font-medium text-muted-foreground max-w-md">
        {descricao || "Aba em construção — aguardando especificação."}
      </p>
    </Card>
  )
}
