import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { ChevronRightIcon } from "@/components/ui/icons"
import { iniciais } from "@/lib/atendimentos"
import type { Consultor } from "@/lib/atendimentos"

interface Props {
  consultor: Consultor
  onClick?: () => void
  selected?: boolean
}

export function ConsultorCard({ consultor, onClick, selected }: Props) {
  return (
    <Card
      onClick={onClick}
      className={`group cursor-pointer transition-all duration-300 hover:border-primary/40 ${
        selected ? "border-primary bg-primary/5 shadow-lg shadow-primary/10" : ""
      }`}
    >
      <CardContent className="p-5 flex items-start gap-4">
        <div className="size-14 rounded-2xl bg-primary/10 flex items-center justify-center text-primary font-bold text-base shrink-0">
          {iniciais(consultor.nome)}
        </div>
        <div className="flex-1 min-w-0 space-y-1.5">
          <div className="flex items-center gap-2">
            <span className="size-2 rounded-full bg-primary animate-pulse" />
            <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Disponível</span>
          </div>
          <div className="font-bold text-base text-foreground leading-tight">{consultor.nome}</div>
          {consultor.especialidade && (
            <Badge variant="outline" className="text-[10px] uppercase font-bold bg-primary/5 border-primary/20 text-primary tracking-wider">
              {consultor.especialidade}
            </Badge>
          )}
          {consultor.descricao && (
            <p className="text-xs text-muted-foreground leading-relaxed line-clamp-2 pt-0.5">{consultor.descricao}</p>
          )}
        </div>
        <ChevronRightIcon className="size-5 text-muted-foreground/40 group-hover:text-primary transition-colors shrink-0 mt-1" />
      </CardContent>
    </Card>
  )
}
