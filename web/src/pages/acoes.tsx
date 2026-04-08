import { useEffect, useState } from "react"
import { useNavigate } from "react-router-dom"
import { supabase } from "@/lib/supabase"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  CalendarIcon as Calendar,
  SearchIcon as Search,
  CheckCircle2Icon as CheckCircle2,
  AlertCircleIcon as AlertCircle,
  ChevronRightIcon as ChevronRight,
} from "@/components/ui/icons"
import { Input } from "@/components/ui/input"
import type { Session } from "@supabase/supabase-js"
import { motion, AnimatePresence } from "framer-motion"

interface MeetingWithActions {
  id_unico: string
  data_reuniao: string
  mentor: string
  ganho: string | null
  acoes_count: number
}

export default function AcoesPage({ session, clientId }: { session?: Session, clientId?: string }) {
  const navigate = useNavigate()
  const resolvedClientId = clientId || session?.user?.id
  const [meetings, setMeetings] = useState<MeetingWithActions[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState("")

  useEffect(() => {
    if (!resolvedClientId) return
    async function fetchMeetings() {
      const { data: clientEntry } = await supabase
        .from('clientes_entrada_new')
        .select('id_cliente')
        .eq('id_cliente', resolvedClientId)
        .maybeSingle()

      if (clientEntry) {
        const { data: rawMeetings } = await supabase
          .from('reunioes_mentoria_new')
          .select('id_unico, data_reuniao, mentor, acoes_cliente, ganho')
          .eq('id_cliente', clientEntry.id_cliente)
          .order('data_reuniao', { ascending: false })

        const withActions = (rawMeetings || [])
          .filter(m => Array.isArray(m.acoes_cliente) && m.acoes_cliente.length > 0)
          .map(m => ({
            id_unico: m.id_unico,
            data_reuniao: m.data_reuniao,
            mentor: m.mentor,
            ganho: m.ganho,
            acoes_count: Array.isArray(m.acoes_cliente) ? m.acoes_cliente.length : 0,
          }))

        setMeetings(withActions)
      }

      setLoading(false)
    }

    fetchMeetings()
  }, [resolvedClientId])

  const filtered = meetings.filter(m =>
    searchTerm === "" ||
    m.mentor?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    m.ganho?.toLowerCase().includes(searchTerm.toLowerCase())
  )

  const totalAcoes = meetings.reduce((sum, m) => sum + m.acoes_count, 0)

  const container = {
    hidden: { opacity: 0 },
    show: { opacity: 1, transition: { staggerChildren: 0.08 } }
  }

  const item = {
    hidden: { y: 15, opacity: 0 },
    show: { y: 0, opacity: 1, transition: { duration: 0.4, ease: "easeOut" as const } }
  }

  if (loading) {
    return <div className="grid gap-6">
      {[1, 2, 3, 4].map(i => <Card key={i} className="h-24 animate-pulse bg-card/40" />)}
    </div>
  }

  return (
    <div className="space-y-10 pb-10">
      <motion.div
        initial={{ opacity: 0, x: -20 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.6 }}
        className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between border-l-4 border-primary pl-8 py-2"
      >
        <div className="flex flex-col gap-2">
          <h1 className="text-4xl lg:text-5xl font-bold tracking-tight text-foreground">Plano de Ação</h1>
          <p className="text-muted-foreground font-medium text-sm">Tarefas e direcionamentos estratégicos das suas consultorias.</p>
        </div>
        <div className="flex gap-4">
          <Badge variant="outline" className="bg-primary/5 border-primary/20 text-primary px-4 py-2 rounded-xl flex items-center gap-2">
            <CheckCircle2 className="size-4" />
            <span className="font-bold uppercase text-[10px] tracking-wider">{meetings.length} Reuniões</span>
          </Badge>
          <Badge variant="outline" className="bg-muted/10 border-border text-muted-foreground px-4 py-2 rounded-xl flex items-center gap-2">
            <Calendar className="size-4" />
            <span className="font-bold uppercase text-[10px] tracking-wider">{totalAcoes} Ações</span>
          </Badge>
        </div>
      </motion.div>

      <div className="flex flex-col md:flex-row md:items-center gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3.5 top-3.5 size-4 text-muted-foreground" />
          <Input
            placeholder="Buscar por consultor ou ganho..."
            className="pl-11 h-12 bg-muted/10 border-border focus-visible:border-primary/50"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      <motion.div
        variants={container}
        initial="hidden"
        animate="show"
        className="space-y-4"
      >
        <AnimatePresence mode="popLayout">
          {filtered.length === 0 ? (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="rounded-2xl border-2 border-dashed border-border p-16 text-center bg-muted/5"
            >
              <AlertCircle className="size-12 mx-auto text-muted-foreground/30 mb-4" />
              <p className="font-bold text-muted-foreground uppercase tracking-widest text-sm">Nenhuma ação encontrada</p>
            </motion.div>
          ) : (
            filtered.map((meeting) => (
              <motion.div key={meeting.id_unico} variants={item} layout>
                <Card
                  className="group hover:border-primary/30 transition-all duration-300 cursor-pointer"
                  onClick={() => navigate(`/reuniao/${meeting.id_unico}`)}
                >
                  <CardContent className="p-0 flex flex-col md:flex-row md:items-center">
                    <div className="p-6 flex-1 space-y-3">
                      <div className="flex flex-wrap items-center gap-x-6 gap-y-2 text-[11px] font-semibold text-muted-foreground uppercase tracking-widest">
                        <div className="flex items-center gap-2">
                          <Calendar className="size-3.5 text-primary/60" />
                          {new Date(meeting.data_reuniao + 'T00:00:00').toLocaleDateString('pt-BR')}
                        </div>
                        <div className="flex items-center gap-2">
                          <div className="size-1.5 rounded-full bg-primary/40" />
                          Consultor: <span className="text-foreground">{meeting.mentor}</span>
                        </div>
                        <Badge variant="outline" className="bg-primary/5 border-primary/20 text-primary text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-lg">
                          {meeting.acoes_count} {meeting.acoes_count === 1 ? 'ação' : 'ações'}
                        </Badge>
                      </div>
                      {meeting.ganho && (
                        <p className="text-sm text-foreground/80 leading-relaxed line-clamp-2">
                          {meeting.ganho}
                        </p>
                      )}
                    </div>
                    <div className="md:border-l border-border/50 p-6 md:w-48 flex items-center justify-center bg-muted/5">
                      <Button
                        variant="outline"
                        size="sm"
                        className="w-full h-10 rounded-xl font-bold text-[11px] uppercase tracking-wider transition-all duration-300 hover:bg-primary/10 hover:text-primary hover:border-primary/30 gap-2"
                        onClick={(e) => { e.stopPropagation(); navigate(`/reuniao/${meeting.id_unico}`) }}
                      >
                        Ver Ações
                        <ChevronRight className="size-4" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            ))
          )}
        </AnimatePresence>
      </motion.div>
    </div>
  )
}
