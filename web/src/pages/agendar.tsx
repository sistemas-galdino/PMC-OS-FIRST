import { useEffect, useState } from "react"
import { supabase } from "@/lib/supabase"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import {
  CalendarIcon as Calendar,
  ExternalLinkIcon as ExternalLink,
  ArrowLeftIcon as ArrowLeft,
} from "@/components/ui/icons"
import { Button } from "@/components/ui/button"
import { useNavigate } from "react-router-dom"
import { motion } from "framer-motion"

interface AgendaLink {
  chave: string
  label: string
  descricao: string | null
  url: string
}

interface AgendaGroup {
  title: string
  icon: string
  keys: string[]
}

const AGENDA_GROUPS: AgendaGroup[] = [
  {
    title: "Agenda Galdino",
    icon: "📅",
    keys: ["agenda_galdino"],
  },
  {
    title: "Agenda Consultores",
    icon: "👥",
    keys: ["agenda_diego", "agenda_david", "agenda_issao", "agenda_rodrigo"],
  },
  {
    title: "Agenda CRM (Tutorias)",
    icon: "⚙️",
    keys: ["agenda_thiago", "agenda_leo"],
  },
]

export default function AgendarPage() {
  const navigate = useNavigate()
  const [agendas, setAgendas] = useState<Record<string, AgendaLink>>({})
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function fetchAgendas() {
      const { data } = await supabase
        .from('configuracoes_links')
        .select('chave, label, descricao, url')
        .like('chave', 'agenda_%')
        .eq('ativo', true)

      if (data) {
        const map: Record<string, AgendaLink> = {}
        data.forEach(l => { map[l.chave] = l })
        setAgendas(map)
      }
      setLoading(false)
    }
    fetchAgendas()
  }, [])

  const container = {
    hidden: { opacity: 0 },
    show: { opacity: 1, transition: { staggerChildren: 0.08 } }
  }

  const item = {
    hidden: { y: 15, opacity: 0 },
    show: { y: 0, opacity: 1, transition: { duration: 0.4, ease: "easeOut" as const } }
  }

  if (loading) {
    return (
      <div className="space-y-6 animate-pulse">
        <div className="h-12 w-1/3 bg-card/40 rounded-xl" />
        <div className="h-[400px] w-full bg-card/40 rounded-2xl" />
      </div>
    )
  }

  return (
    <div className="space-y-10 pb-10">
      <motion.div
        initial={{ opacity: 0, x: -20 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.6 }}
        className="space-y-4"
      >
        <Button
          variant="ghost"
          size="sm"
          onClick={() => navigate(-1)}
          className="text-muted-foreground hover:text-foreground gap-2 -ml-2"
        >
          <ArrowLeft className="size-4" />
          <span className="text-xs font-bold uppercase tracking-widest">Voltar</span>
        </Button>

        <div className="flex flex-col gap-3 border-l-4 border-primary pl-8 py-2">
          <h1 className="text-4xl lg:text-5xl font-bold tracking-tight text-foreground">Agendar Reunião</h1>
          <p className="text-muted-foreground font-medium text-sm">Escolha com quem deseja agendar sua reunião.</p>
        </div>
      </motion.div>

      <motion.div
        variants={container}
        initial="hidden"
        animate="show"
        className="space-y-10"
      >
        {AGENDA_GROUPS.map(group => {
          const groupAgendas = group.keys
            .map(k => agendas[k])
            .filter(Boolean)

          if (groupAgendas.length === 0) return null

          return (
            <motion.div key={group.title} variants={item} className="space-y-4">
              <div className="flex items-center gap-3">
                <span className="text-2xl">{group.icon}</span>
                <h2 className="text-xl font-bold tracking-tight text-foreground">{group.title}</h2>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                {groupAgendas.map(agenda => (
                  <motion.div key={agenda.chave} variants={item}>
                    <a href={agenda.url} target="_blank" rel="noopener noreferrer" className="block">
                      <Card className="group overflow-hidden hover:border-primary/30 transition-all duration-300 cursor-pointer">
                        <CardContent className="flex items-center justify-between p-5">
                          <div className="flex items-center gap-4">
                            <div className="bg-primary/10 p-2.5 rounded-lg group-hover:bg-primary group-hover:text-primary-foreground transition-colors">
                              <Calendar className="size-5" />
                            </div>
                            <div className="flex flex-col gap-0.5">
                              <span className="font-bold text-sm tracking-tight text-foreground">{agenda.label}</span>
                              {agenda.descricao && (
                                <Badge variant="outline" className="w-fit text-[9px] font-bold uppercase tracking-wider bg-muted/20 border-border text-muted-foreground">
                                  {agenda.descricao}
                                </Badge>
                              )}
                            </div>
                          </div>
                          <ExternalLink className="size-4 text-muted-foreground/50 group-hover:text-primary transition-colors" />
                        </CardContent>
                      </Card>
                    </a>
                  </motion.div>
                ))}
              </div>
            </motion.div>
          )
        })}
      </motion.div>
    </div>
  )
}
