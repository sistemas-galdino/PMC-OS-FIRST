import { Card } from "@/components/ui/card"
import { CalendarIcon, ClockIcon, UsersIcon, MailIcon, Building2Icon } from "@/components/ui/icons"
import { formatarData, iniciais } from "@/lib/atendimentos"
import type { Consultor } from "@/lib/atendimentos"
import type { IdentificacaoForm } from "./step-identificacao"

interface Props {
  consultor: Consultor
  data: string
  horario: string
  duracaoMinutos: number
  identificacao: IdentificacaoForm
}

export function StepConfirmacao({ consultor, data, horario, duracaoMinutos, identificacao }: Props) {
  return (
    <Card className="p-6 space-y-6 max-w-xl">
      <div className="flex items-center gap-4 pb-5 border-b border-border">
        <div className="size-14 rounded-2xl bg-primary/10 flex items-center justify-center text-primary font-bold">
          {iniciais(consultor.nome)}
        </div>
        <div>
          <div className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Consultor</div>
          <div className="text-lg font-bold tracking-tight text-foreground">{consultor.nome}</div>
          {consultor.especialidade && (
            <div className="text-xs text-muted-foreground">{consultor.especialidade}</div>
          )}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <Item icon={<CalendarIcon className="size-4 text-primary" />} label="Data" value={formatarData(data)} />
        <Item icon={<ClockIcon className="size-4 text-primary" />} label="Horário" value={`${horario} (GMT-3) · ${duracaoMinutos} min`} />
        <Item icon={<UsersIcon className="size-4 text-primary" />} label="Nome" value={identificacao.nome} />
        <Item icon={<MailIcon className="size-4 text-primary" />} label="Email" value={identificacao.email} />
        <Item icon={<Building2Icon className="size-4 text-primary" />} label="Código" value={identificacao.codigo_cliente} />
      </div>

      {identificacao.observacoes && (
        <div className="rounded-xl border border-border bg-muted/10 p-4 space-y-1">
          <div className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Observações</div>
          <p className="text-sm text-foreground">{identificacao.observacoes}</p>
        </div>
      )}
    </Card>
  )
}

function Item({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="flex items-start gap-3">
      <div className="mt-0.5">{icon}</div>
      <div className="space-y-0.5 min-w-0 flex-1">
        <div className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">{label}</div>
        <div className="text-sm font-semibold text-foreground truncate">{value}</div>
      </div>
    </div>
  )
}
