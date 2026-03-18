import { useEffect, useState } from "react"
import { supabase } from "@/lib/supabase"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { ScrollArea } from "@/components/ui/scroll-area"
import {
  CalendarIcon as Calendar,
  SearchIcon as Search,
  FilterIcon as Filter,
  MessageSquareIcon as MessageSquare
} from "@/components/ui/icons"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { motion, AnimatePresence } from "framer-motion"

interface Meeting {
  id_unico: string
  mentor: string
  pessoa: string
  empresa: string
  data_reuniao: string
  mes: number
  cliente_compareceu: boolean | null
  nome_empresa_formatado?: string
}

export default function MentoresPage() {
  const [meetings, setMeetings] = useState<Record<string, Meeting[]>>({})
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState("")

  useEffect(() => {
    async function fetchMeetings() {
      const { data, error } = await supabase
        .from('reunioes_mentoria')
        .select('*')
        .order('data_reuniao', { ascending: false })
      
      if (data && !error) {
        const grouped = data.reduce((acc: Record<string, Meeting[]>, meeting: Meeting) => {
          const mentor = meeting.mentor || "Sem Mentor"
          if (!acc[mentor]) acc[mentor] = []
          acc[mentor].push(meeting)
          return acc
        }, {})
        setMeetings(grouped)
      }
      setLoading(false)
    }

    fetchMeetings()
  }, [])

  const filteredMentors = Object.entries(meetings).filter(([mentor, mentorMeetings]) => {
    const mentorMatch = mentor.toLowerCase().includes(searchTerm.toLowerCase())
    const clientMatch = mentorMeetings.some(m => 
      m.pessoa?.toLowerCase().includes(searchTerm.toLowerCase()) || 
      m.empresa?.toLowerCase().includes(searchTerm.toLowerCase())
    )
    return mentorMatch || clientMatch
  })

  const container = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: { staggerChildren: 0.1 }
    }
  }

  const item = {
    hidden: { y: 20, opacity: 0 },
    show: { y: 0, opacity: 1, transition: { duration: 0.5, ease: "easeOut" } }
  }

  if (loading) {
    return <div className="space-y-10 animate-pulse">
      <div className="h-12 w-1/4 bg-card/40 rounded-xl" />
      <div className="grid gap-6 md:grid-cols-3">
        {[1, 2, 3].map(i => <div key={i} className="h-48 bg-card/40 rounded-2xl" />)}
      </div>
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
          <h1 className="text-4xl lg:text-5xl font-bold tracking-tight text-foreground">Time de Mentores</h1>
          <p className="text-muted-foreground font-medium text-sm">Histórico de sessões estratégicas e acompanhamento.</p>
        </div>
        <div className="flex flex-col sm:flex-row items-end sm:items-center gap-4">
          <div className="relative w-full sm:w-64">
            <Search className="absolute left-3.5 top-3.5 size-4 text-muted-foreground" />
            <Input
              placeholder="Buscar mentor ou empresa..."
              className="pl-11 h-12 bg-muted/10 border-border focus-visible:border-primary/50"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <Select defaultValue="all">
            <SelectTrigger className="w-full sm:w-44 h-12 bg-muted/10 border-border rounded-xl">
              <Filter className="mr-2 size-4 text-primary/60" />
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent className="rounded-xl bg-card/95 backdrop-blur-xl border-border">
              <SelectItem value="all" className="rounded-lg font-medium">Todos</SelectItem>
              <SelectItem value="yes" className="rounded-lg font-medium">Realizadas</SelectItem>
              <SelectItem value="no" className="rounded-lg font-medium">Faltas</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </motion.div>

      <ScrollArea className="h-[calc(100vh-16rem)] pr-6 -mr-6">
        <motion.div 
          variants={container}
          initial="hidden"
          animate="show"
          className="space-y-16 pb-10"
        >
          {filteredMentors.map(([mentor, mentorMeetings]) => (
            <div key={mentor} className="space-y-8">
              <motion.div variants={item} className="flex items-center gap-5 bg-muted/10 p-6 rounded-2xl border border-border/50 backdrop-blur-sm">
                <Avatar className="size-16 border-2 border-primary/20 p-1 bg-background">
                  <AvatarFallback className="bg-primary/10 text-primary font-bold text-xl uppercase">
                    {mentor.substring(0, 2)}
                  </AvatarFallback>
                </Avatar>
                <div className="space-y-1">
                  <h2 className="text-2xl font-bold tracking-tight text-foreground">{mentor}</h2>
                  <div className="flex items-center gap-3">
                    <Badge variant="outline" className="bg-primary/5 border-primary/20 text-primary font-bold text-[10px] tracking-wider uppercase px-2.5">
                      {mentorMeetings.length} Sessões
                    </Badge>
                    <span className="text-[11px] text-muted-foreground font-medium uppercase tracking-widest flex items-center gap-1.5">
                      <MessageSquare className="size-3" /> Mentor Especialista
                    </span>
                  </div>
                </div>
              </motion.div>

              <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                {mentorMeetings.map((meeting) => (
                  <motion.div key={meeting.id_unico} variants={item}>
                    <Card className="hover:border-primary/30 transition-all duration-300">
                      <CardContent className="p-6 space-y-5">
                        <div className="flex justify-between items-start gap-4">
                          <div className="space-y-1.5 flex-1">
                            <h3 className="font-bold text-base text-foreground leading-tight line-clamp-1">{meeting.pessoa}</h3>
                            <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-widest">{meeting.empresa}</p>
                          </div>
                          <Badge 
                            variant="outline"
                            className={`uppercase font-bold text-[9px] px-2 py-0.5 rounded-lg shrink-0 ${
                              meeting.cliente_compareceu === false 
                                ? "bg-destructive/10 border-destructive/20 text-destructive" 
                                : "bg-primary/10 border-primary/20 text-primary"
                            }`}
                          >
                            {meeting.cliente_compareceu === false ? "Faltou" : "Realizada"}
                          </Badge>
                        </div>
                        
                        <div className="flex items-center justify-between border-t border-border/50 pt-4">
                          <div className="flex items-center gap-2 text-[11px] font-semibold text-muted-foreground">
                            <Calendar className="size-3.5 text-primary/60" />
                            <span className="uppercase tracking-widest">{new Date(meeting.data_reuniao).toLocaleDateString('pt-BR')}</span>
                          </div>
                          <Button variant="ghost" size="sm" className="h-7 text-[10px] font-bold uppercase tracking-wider text-primary hover:bg-primary/5">
                            Ver Resumo
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  </motion.div>
                ))}
              </div>
            </div>
          ))}
        </motion.div>
      </ScrollArea>
    </div>
  )
}

