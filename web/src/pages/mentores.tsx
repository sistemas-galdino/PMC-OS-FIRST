import { useEffect, useState } from "react"
import { supabase } from "@/lib/supabase"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet"
import {
  CalendarIcon as Calendar,
  SearchIcon as Search,
  FilterIcon as Filter,
  MessageSquareIcon as MessageSquare
} from "@/components/ui/icons"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { motion } from "framer-motion"

interface Meeting {
  id_unico: string
  mentor: string
  nome_cliente_formatado: string
  nome_empresa_formatado: string
  data_reuniao: string
  mes: number
  cliente_compareceu: boolean | null
  semana: number | null
  ano: number | null
  resumo: string | null
  acoes_cliente: string | Array<{ acao: string; prazo: string; status: string }> | null
  acoes_mentor: string | Array<{ acao: string; prazo: string; status: string }> | null
  nps: number | null
  transcricao: string | null
}

export default function MentoresPage() {
  const [meetings, setMeetings] = useState<Record<string, Meeting[]>>({})
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState("")
  const [statusFilter, setStatusFilter] = useState("all")
  const [mentorFilter, setMentorFilter] = useState("all")
  const [semanaFilter, setSemanaFilter] = useState("all")
  const [anoFilter, setAnoFilter] = useState("all")
  const [dateRange, setDateRange] = useState({ from: "", to: "" })
  const [selectedMeeting, setSelectedMeeting] = useState<Meeting | null>(null)

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

  const allMeetings = Object.values(meetings).flat()
  const uniqueMentors = [...new Set(allMeetings.map(m => m.mentor))].filter(Boolean).sort()
  const uniqueYears = [...new Set(allMeetings.map(m => m.ano))].filter(Boolean).sort() as number[]
  const uniqueWeeks = [...new Set(
    allMeetings
      .filter(m => anoFilter === "all" || String(m.ano) === anoFilter)
      .map(m => m.semana)
  )].filter(Boolean).sort((a, b) => (a as number) - (b as number)) as number[]

  const filteredMeetings = allMeetings.filter(m => {
    const matchesSearch = searchTerm === "" ||
      m.mentor?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      m.nome_cliente_formatado?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      m.nome_empresa_formatado?.toLowerCase().includes(searchTerm.toLowerCase())

    const matchesStatus = statusFilter === "all" ||
      (statusFilter === "yes" && m.cliente_compareceu !== false) ||
      (statusFilter === "no" && m.cliente_compareceu === false)

    const matchesMentor = mentorFilter === "all" || m.mentor === mentorFilter

    const matchesAno = anoFilter === "all" || String(m.ano) === anoFilter

    const matchesSemana = semanaFilter === "all" || String(m.semana) === semanaFilter

    const matchesDate =
      (!dateRange.from || m.data_reuniao >= dateRange.from) &&
      (!dateRange.to || m.data_reuniao <= dateRange.to)

    return matchesSearch && matchesStatus && matchesMentor && matchesAno && matchesSemana && matchesDate
  })

  const filteredMentors = Object.entries(
    filteredMeetings.reduce((acc: Record<string, Meeting[]>, meeting) => {
      const mentor = meeting.mentor || "Sem Mentor"
      if (!acc[mentor]) acc[mentor] = []
      acc[mentor].push(meeting)
      return acc
    }, {})
  )

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
        <div className="flex flex-wrap items-end gap-3">
          <div className="relative w-full sm:w-56">
            <Search className="absolute left-3.5 top-3.5 size-4 text-muted-foreground" />
            <Input
              placeholder="Buscar mentor ou empresa..."
              className="pl-11 h-12 bg-muted/10 border-border focus-visible:border-primary/50"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-full sm:w-40 h-12 bg-muted/10 border-border rounded-xl">
              <Filter className="mr-2 size-4 text-primary/60" />
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent className="rounded-xl bg-card/95 backdrop-blur-xl border-border">
              <SelectItem value="all" className="rounded-lg font-medium">Todos</SelectItem>
              <SelectItem value="yes" className="rounded-lg font-medium">Realizadas</SelectItem>
              <SelectItem value="no" className="rounded-lg font-medium">Faltas</SelectItem>
            </SelectContent>
          </Select>
          <Select value={mentorFilter} onValueChange={setMentorFilter}>
            <SelectTrigger className="w-full sm:w-44 h-12 bg-muted/10 border-border rounded-xl">
              <SelectValue placeholder="Mentor" />
            </SelectTrigger>
            <SelectContent className="rounded-xl bg-card/95 backdrop-blur-xl border-border">
              <SelectItem value="all" className="rounded-lg font-medium">Todos Mentores</SelectItem>
              {uniqueMentors.map(m => (
                <SelectItem key={m} value={m} className="rounded-lg font-medium">{m}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={anoFilter} onValueChange={(v) => { setAnoFilter(v); setSemanaFilter("all") }}>
            <SelectTrigger className="w-full sm:w-32 h-12 bg-muted/10 border-border rounded-xl">
              <SelectValue placeholder="Ano" />
            </SelectTrigger>
            <SelectContent className="rounded-xl bg-card/95 backdrop-blur-xl border-border">
              <SelectItem value="all" className="rounded-lg font-medium">Todos Anos</SelectItem>
              {uniqueYears.map(y => (
                <SelectItem key={y} value={String(y)} className="rounded-lg font-medium">{y}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={semanaFilter} onValueChange={setSemanaFilter}>
            <SelectTrigger className="w-full sm:w-36 h-12 bg-muted/10 border-border rounded-xl">
              <SelectValue placeholder="Semana" />
            </SelectTrigger>
            <SelectContent className="rounded-xl bg-card/95 backdrop-blur-xl border-border">
              <SelectItem value="all" className="rounded-lg font-medium">Todas Semanas</SelectItem>
              {uniqueWeeks.map(w => (
                <SelectItem key={w} value={String(w)} className="rounded-lg font-medium">Semana {w}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <div className="flex items-center gap-2">
            <Input
              type="date"
              className="h-12 w-36 bg-muted/10 border-border"
              value={dateRange.from}
              onChange={(e) => setDateRange(prev => ({ ...prev, from: e.target.value }))}
            />
            <span className="text-muted-foreground text-xs font-medium">a</span>
            <Input
              type="date"
              className="h-12 w-36 bg-muted/10 border-border"
              value={dateRange.to}
              onChange={(e) => setDateRange(prev => ({ ...prev, to: e.target.value }))}
            />
          </div>
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
                            <h3 className="font-bold text-base text-foreground leading-tight line-clamp-1">{meeting.nome_cliente_formatado}</h3>
                            <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-widest">{meeting.nome_empresa_formatado}</p>
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
                          <Button variant="ghost" size="sm" className="h-7 text-[10px] font-bold uppercase tracking-wider text-primary hover:bg-primary/5" onClick={() => setSelectedMeeting(meeting)}>
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

      <Sheet open={!!selectedMeeting} onOpenChange={(open) => !open && setSelectedMeeting(null)}>
        <SheetContent side="right" className="w-full sm:max-w-lg overflow-y-auto p-6">
          {selectedMeeting && (
            <>
              <SheetHeader className="space-y-3 pb-6 border-b border-border/50">
                <div className="flex items-center justify-between gap-3">
                  <SheetTitle className="text-xl font-bold">{selectedMeeting.nome_cliente_formatado}</SheetTitle>
                  <Badge
                    variant="outline"
                    className={`uppercase font-bold text-[9px] px-2 py-0.5 rounded-lg shrink-0 ${
                      selectedMeeting.cliente_compareceu === false
                        ? "bg-destructive/10 border-destructive/20 text-destructive"
                        : "bg-primary/10 border-primary/20 text-primary"
                    }`}
                  >
                    {selectedMeeting.cliente_compareceu === false ? "Faltou" : "Realizada"}
                  </Badge>
                </div>
                <SheetDescription className="text-sm font-semibold uppercase tracking-widest text-muted-foreground">
                  {selectedMeeting.nome_empresa_formatado}
                </SheetDescription>
              </SheetHeader>

              <div className="space-y-6 pt-6 px-2">
                <div className="flex items-center justify-between text-sm">
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Calendar className="size-4 text-primary/60" />
                    <span>{new Date(selectedMeeting.data_reuniao).toLocaleDateString('pt-BR')}</span>
                  </div>
                  <span className="font-medium text-foreground">{selectedMeeting.mentor}</span>
                </div>

                {selectedMeeting.nps != null && (
                  <div className="flex items-center justify-between bg-muted/10 rounded-xl p-4 border border-border/50">
                    <span className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">NPS</span>
                    <span className="text-2xl font-bold text-primary">{selectedMeeting.nps}</span>
                  </div>
                )}

                <div className="space-y-3">
                  <h4 className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Resumo</h4>
                  {selectedMeeting.resumo ? (() => {
                    try {
                      const parsed = JSON.parse(selectedMeeting.resumo)
                      if (parsed && typeof parsed === 'object' && parsed.titulo && Array.isArray(parsed.topicos)) {
                        return (
                          <div className="space-y-3">
                            <p className="text-sm font-semibold text-foreground">{parsed.titulo}</p>
                            {parsed.topicos.map((topico: { tema: string; pontos: string[] }, i: number) => (
                              <div key={i} className="space-y-1.5">
                                <p className="text-sm font-medium text-foreground/80">{topico.tema}</p>
                                <ul className="space-y-1 pl-2">
                                  {topico.pontos.map((ponto: string, j: number) => (
                                    <li key={j} className="text-sm text-foreground flex items-start gap-2">
                                      <span className="text-primary mt-0.5">•</span>
                                      <span>{ponto}</span>
                                    </li>
                                  ))}
                                </ul>
                              </div>
                            ))}
                          </div>
                        )
                      }
                      return <p className="text-sm text-foreground leading-relaxed whitespace-pre-wrap">{selectedMeeting.resumo}</p>
                    } catch {
                      return <p className="text-sm text-foreground leading-relaxed whitespace-pre-wrap">{selectedMeeting.resumo}</p>
                    }
                  })() : (
                    <p className="text-sm text-muted-foreground italic">Sem resumo disponível</p>
                  )}
                </div>

                {selectedMeeting.acoes_cliente && (
                  <div className="space-y-2">
                    <h4 className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Ações do Cliente</h4>
                    {Array.isArray(selectedMeeting.acoes_cliente) ? (
                      <ul className="space-y-1.5">
                        {selectedMeeting.acoes_cliente.map((item, i) => {
                          const label = typeof item === 'string' ? item : item.acao
                          const prazo = typeof item === 'string' ? null : item.prazo
                          const status = typeof item === 'string' ? null : item.status
                          return (
                            <li key={i} className="text-sm text-foreground flex items-start gap-2">
                              <span className="text-primary mt-0.5">•</span>
                              <span>
                                {label}
                                {prazo && <span className="text-muted-foreground ml-1">— Prazo: {prazo}</span>}
                                {status && <span className="text-muted-foreground ml-1">({status})</span>}
                              </span>
                            </li>
                          )
                        })}
                      </ul>
                    ) : (
                      <p className="text-sm text-foreground leading-relaxed whitespace-pre-wrap">{selectedMeeting.acoes_cliente}</p>
                    )}
                  </div>
                )}

                {selectedMeeting.acoes_mentor && (
                  <div className="space-y-2">
                    <h4 className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Ações do Mentor</h4>
                    {Array.isArray(selectedMeeting.acoes_mentor) ? (
                      <ul className="space-y-1.5">
                        {selectedMeeting.acoes_mentor.map((item, i) => {
                          const label = typeof item === 'string' ? item : item.acao
                          const prazo = typeof item === 'string' ? null : item.prazo
                          const status = typeof item === 'string' ? null : item.status
                          return (
                            <li key={i} className="text-sm text-foreground flex items-start gap-2">
                              <span className="text-primary mt-0.5">•</span>
                              <span>
                                {label}
                                {prazo && <span className="text-muted-foreground ml-1">— Prazo: {prazo}</span>}
                                {status && <span className="text-muted-foreground ml-1">({status})</span>}
                              </span>
                            </li>
                          )
                        })}
                      </ul>
                    ) : (
                      <p className="text-sm text-foreground leading-relaxed whitespace-pre-wrap">{selectedMeeting.acoes_mentor}</p>
                    )}
                  </div>
                )}
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>
    </div>
  )
}

