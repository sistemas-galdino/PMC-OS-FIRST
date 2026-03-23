import { useEffect, useState } from "react"
import { supabase } from "@/lib/supabase"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  CheckSquareIcon as CheckSquare,
  SquareIcon as Square,
  CalendarIcon as Calendar,
  SearchIcon as Search,
  CheckCircle2Icon as CheckCircle2,
  ClockIcon as Clock,
  AlertCircleIcon as AlertCircle
} from "@/components/ui/icons"
import { Input } from "@/components/ui/input"
import type { Session } from "@supabase/supabase-js"
import { motion, AnimatePresence } from "framer-motion"

interface Action {
  text: string
  done: boolean
  meeting_date: string
  mentor: string
}

export default function AcoesPage({ session, clientId }: { session?: Session, clientId?: string }) {
  const resolvedClientId = clientId || session?.user?.id
  const [actions, setActions] = useState<Action[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState("")

  useEffect(() => {
    if (!resolvedClientId) return
    async function fetchActions() {
      const { data: clientEntry } = await supabase
        .from('clientes_entrada_new')
        .select('id_cliente')
        .eq('id_cliente', resolvedClientId)
        .maybeSingle()

      if (clientEntry) {
        const { data: meetings } = await supabase
          .from('reunioes_mentoria')
          .select('acoes_cliente, data_reuniao, mentor')
          .eq('id_cliente', clientEntry.id_cliente)
          .order('data_reuniao', { ascending: false })

        const flatActions = meetings?.flatMap(m => {
          const acoes = Array.isArray(m.acoes_cliente) ? m.acoes_cliente : []
          return acoes.map((a: any) => ({
            text: typeof a === 'string' ? a : a.text,
            done: typeof a === 'object' ? !!a.done : false,
            meeting_date: m.data_reuniao,
            mentor: m.mentor
          }))
        }) || []

        setActions(flatActions)
      }
      
      setLoading(false)
    }

    fetchActions()
  }, [resolvedClientId])

  const filteredActions = actions.filter(a => 
    a.text.toLowerCase().includes(searchTerm.toLowerCase()) ||
    a.mentor.toLowerCase().includes(searchTerm.toLowerCase())
  )

  const pending = actions.filter(a => !a.done).length
  const completed = actions.filter(a => a.done).length

  const container = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: { staggerChildren: 0.1 }
    }
  }

  const item = {
    hidden: { y: 20, opacity: 0 },
    show: { y: 0, opacity: 1, transition: { duration: 0.5, ease: "easeOut" as any } }
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
          <p className="text-muted-foreground font-medium text-sm">Tarefas e direcionamentos estratégicos das suas mentorias.</p>
        </div>
        <div className="flex gap-4">
          <Badge variant="outline" className="bg-primary/5 border-primary/20 text-primary px-4 py-2 rounded-xl flex items-center gap-2">
            <Clock className="size-4" />
            <span className="font-bold uppercase text-[10px] tracking-wider">{pending} Pendentes</span>
          </Badge>
          <Badge variant="outline" className="bg-muted/10 border-border text-muted-foreground px-4 py-2 rounded-xl flex items-center gap-2">
            <CheckCircle2 className="size-4" />
            <span className="font-bold uppercase text-[10px] tracking-wider">{completed} Concluídas</span>
          </Badge>
        </div>
      </motion.div>

      <div className="flex flex-col md:flex-row md:items-center gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3.5 top-3.5 size-4 text-muted-foreground" />
          <Input
            placeholder="Buscar tarefas ou mentores..."
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
          {filteredActions.length === 0 ? (
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="rounded-2xl border-2 border-dashed border-border p-16 text-center bg-muted/5"
            >
              <AlertCircle className="size-12 mx-auto text-muted-foreground/30 mb-4" />
              <p className="font-bold text-muted-foreground uppercase tracking-widest text-sm">Nenhuma ação encontrada</p>
            </motion.div>
          ) : (
            filteredActions.map((action, index) => (
              <motion.div key={index} variants={item} layout>
                <Card className={`group hover:border-primary/30 transition-all duration-300 ${action.done ? 'opacity-60 bg-muted/5' : ''}`}>
                  <CardContent className="p-0 flex flex-col md:flex-row md:items-center">
                    <div className="p-6 flex-1 flex items-start gap-5">
                      <div className="mt-1">
                        {action.done ? (
                          <div className="bg-primary/10 rounded-full p-1.5">
                            <CheckSquare className="size-5 text-primary" />
                          </div>
                        ) : (
                          <div className="rounded-full p-1.5">
                            <Square className="size-5 text-muted-foreground/30 group-hover:text-primary/50 transition-colors" />
                          </div>
                        )}
                      </div>
                      <div className="space-y-2">
                        <p className={`text-lg font-bold tracking-tight text-foreground leading-snug ${action.done ? 'line-through text-muted-foreground/60' : ''}`}>
                          {action.text}
                        </p>
                        <div className="flex flex-wrap items-center gap-x-6 gap-y-2 text-[11px] font-semibold text-muted-foreground uppercase tracking-widest">
                          <div className="flex items-center gap-2">
                            <Calendar className="size-3.5 text-primary/60" />
                            {new Date(action.meeting_date).toLocaleDateString('pt-BR')}
                          </div>
                          <div className="flex items-center gap-2">
                            <div className="size-1.5 rounded-full bg-primary/40" />
                            Mentor: <span className="text-foreground">{action.mentor}</span>
                          </div>
                        </div>
                      </div>
                    </div>
                    <div className="md:border-l border-border/50 p-6 md:w-56 flex items-center justify-center bg-muted/5">
                      <Button 
                        variant={action.done ? "ghost" : "outline"} 
                        className={`w-full h-11 rounded-xl font-bold text-[11px] uppercase tracking-wider transition-all duration-300 ${!action.done ? 'hover:bg-primary/10 hover:text-primary hover:border-primary/30' : ''}`}
                      >
                        {action.done ? "Reabrir Tarefa" : "Concluir Agora"}
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

