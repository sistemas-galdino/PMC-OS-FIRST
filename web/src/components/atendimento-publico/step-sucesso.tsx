import { motion } from "framer-motion"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { CheckCircle2Icon, MailIcon, CalendarIcon } from "@/components/ui/icons"
import { formatarData } from "@/lib/atendimentos"
import { ConsultorAvatar } from "@/components/consultor-avatar"
import type { Consultor } from "@/lib/atendimentos"

interface Props {
  consultor: Consultor
  data: string
  horario: string
  email: string
  onVoltar: () => void
}

export function StepSucesso({ consultor, data, horario, email, onVoltar }: Props) {
  return (
    <div className="flex flex-col items-center text-center max-w-xl mx-auto">
      <motion.div
        initial={{ scale: 0, rotate: -20 }}
        animate={{ scale: 1, rotate: 0 }}
        transition={{ type: "spring", stiffness: 200, damping: 15 }}
        className="size-20 rounded-3xl bg-primary/15 flex items-center justify-center mb-6"
      >
        <CheckCircle2Icon className="size-12 text-primary" />
      </motion.div>

      <h2 className="text-3xl font-bold tracking-tight mb-3">Agendamento confirmado!</h2>
      <p className="text-muted-foreground mb-10 max-w-md">
        Sua reunião com <span className="text-foreground font-semibold">{consultor.nome}</span> foi registrada. Você vai receber o convite do Google Calendar em <span className="text-foreground font-semibold">{email}</span>.
      </p>

      <Card className="w-full p-5 space-y-4 mb-8 text-left">
        <div className="flex items-center gap-3 pb-4 border-b border-border">
          <ConsultorAvatar nome={consultor.nome} url={consultor.avatar_url} className="size-11 rounded-xl text-sm" />
          <div>
            <div className="font-bold text-sm">{consultor.nome}</div>
            {consultor.especialidade && (
              <div className="text-[11px] text-muted-foreground uppercase tracking-wider font-semibold">{consultor.especialidade}</div>
            )}
          </div>
        </div>

        <div className="flex items-center gap-3">
          <CalendarIcon className="size-4 text-primary shrink-0" />
          <div>
            <div className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Quando</div>
            <div className="text-sm font-semibold">{formatarData(data)} às {horario} (GMT-3)</div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <MailIcon className="size-4 text-primary shrink-0" />
          <div>
            <div className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Convite enviado para</div>
            <div className="text-sm font-semibold">{email}</div>
          </div>
        </div>
      </Card>

      <Button onClick={onVoltar} variant="outline" size="lg">
        Voltar pro início
      </Button>
    </div>
  )
}
