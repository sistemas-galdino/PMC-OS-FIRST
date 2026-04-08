import { useEffect, useState } from "react"
import { useNavigate } from "react-router-dom"
import { supabase } from "@/lib/supabase"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { ScrollArea } from "@/components/ui/scroll-area"
import {
  CalendarIcon as Calendar,
  SearchIcon as Search,
  FilterIcon as Filter,
  MessageSquareIcon as MessageSquare,
  VideoIcon,
  FileTextIcon,
  ChevronDownIcon
} from "@/components/ui/icons"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { motion, AnimatePresence } from "framer-motion"

interface Meeting {
  id_unico: string
  id_cliente: string | null
  empresa: string | null
  nome_empresa_formatado: string | null
  data_reuniao: string
  horario: string | null
  mes: number | null
  semana: number | null
  ano: number | null
  tipo_reuniao: string | null
  responsavel: string | null
  nps: number | null
  transcricao: string | null
  transcricao_md: string | null
  resumo: string | null
  resumo_json: string | null
  acoes: string | null
  link_gravacao: string | null
  link_geminidoc: string | null
  status_match: string | null
  observacoes: string | null
}

import type { Session } from "@supabase/supabase-js"

interface ReunioesBlackCRMProps {
  session?: Session
  clientId?: string
}

export default function ReunioesBlackCRMPage({ session, clientId }: ReunioesBlackCRMProps) {
  const navigate = useNavigate()
  const [meetings, setMeetings] = useState<Record<string, Meeting[]>>({})
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState("")
  const [tipoFilter, setTipoFilter] = useState("all")
  const [responsavelFilter, setResponsavelFilter] = useState("all")
  const [mesFilter, setMesFilter] = useState("all")
  const [semanaFilter, setSemanaFilter] = useState("all")
  const [anoFilter, setAnoFilter] = useState("all")
  const [dateRange, setDateRange] = useState({ from: "", to: "" })
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set())

  const toggleSection = (key: string) => {
    setExpandedSections(prev => {
      const next = new Set(prev)
      if (next.has(key)) next.delete(key)
      else next.add(key)
      return next
    })
  }

  useEffect(() => {
    async function fetchMeetings() {
      const resolvedClientId = clientId || session?.user?.id

      let query = supabase
        .from('reunioes_blackcrm')
        .select('*')
        .order('data_reuniao', { ascending: false })

      if (resolvedClientId) {
        const { data: clientEntry } = await supabase
          .from('clientes_entrada_new')
          .select('id_cliente')
          .eq('id_cliente', resolvedClientId)
          .maybeSingle()

        if (clientEntry) {
          query = query.eq('id_cliente', clientEntry.id_cliente)
        }
      }

      const { data, error } = await query

      if (data && !error) {
        const grouped = data.reduce((acc: Record<string, Meeting[]>, meeting: Meeting) => {
          const resp = meeting.responsavel || "Sem Responsavel"
          if (!acc[resp]) acc[resp] = []
          acc[resp].push(meeting)
          return acc
        }, {})
        setMeetings(grouped)
      }
      setLoading(false)
    }

    fetchMeetings()
  }, [])

  const allMeetings = Object.values(meetings).flat()
  const uniqueResponsaveis = [...new Set(allMeetings.map(m => m.responsavel))].filter(Boolean).sort() as string[]
  const uniqueYears = [...new Set(allMeetings.map(m => m.ano))].filter(Boolean).sort() as number[]
  const uniqueMonths = [...new Set(
    allMeetings
      .filter(m => anoFilter === "all" || String(m.ano) === anoFilter)
      .map(m => m.mes)
  )].filter(Boolean).sort((a, b) => (a as number) - (b as number)) as number[]
  const uniqueWeeks = [...new Set(
    allMeetings
      .filter(m => anoFilter === "all" || String(m.ano) === anoFilter)
      .filter(m => mesFilter === "all" || String(m.mes) === mesFilter)
      .map(m => m.semana)
  )].filter(Boolean).sort((a, b) => (a as number) - (b as number)) as number[]

  const filteredMeetings = allMeetings.filter(m => {
    const matchesSearch = searchTerm === "" ||
      m.responsavel?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      m.nome_empresa_formatado?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      m.empresa?.toLowerCase().includes(searchTerm.toLowerCase())

    const matchesTipo = tipoFilter === "all" || m.tipo_reuniao === tipoFilter

    const matchesResponsavel = responsavelFilter === "all" || m.responsavel === responsavelFilter

    const matchesAno = anoFilter === "all" || String(m.ano) === anoFilter

    const matchesMes = mesFilter === "all" || String(m.mes) === mesFilter

    const matchesSemana = semanaFilter === "all" || String(m.semana) === semanaFilter

    const matchesDate =
      (!dateRange.from || m.data_reuniao >= dateRange.from) &&
      (!dateRange.to || m.data_reuniao <= dateRange.to)

    return matchesSearch && matchesTipo && matchesResponsavel && matchesAno && matchesMes && matchesSemana && matchesDate
  })

  const filteredGrouped = Object.entries(
    filteredMeetings.reduce((acc: Record<string, Meeting[]>, meeting) => {
      const resp = meeting.responsavel || "Sem Responsavel"
      if (!acc[resp]) acc[resp] = []
      acc[resp].push(meeting)
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
    show: { y: 0, opacity: 1, transition: { duration: 0.5, ease: "easeOut" as const } }
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
          <h1 className="text-4xl lg:text-5xl font-bold tracking-tight text-foreground">Reunioes Black CRM</h1>
          <p className="text-muted-foreground font-medium text-sm">Historico de sessoes de implementacao e tutoria.</p>
        </div>
        <div className="flex flex-wrap items-end gap-3">
          <div className="relative w-full sm:w-56">
            <Search className="absolute left-3.5 top-3.5 size-4 text-muted-foreground" />
            <Input
              placeholder="Buscar responsavel ou empresa..."
              className="pl-11 h-12 bg-muted/10 border-border focus-visible:border-primary/50"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <Select value={tipoFilter} onValueChange={setTipoFilter}>
            <SelectTrigger className="w-full sm:w-44 h-12 bg-muted/10 border-border rounded-xl">
              <Filter className="mr-2 size-4 text-primary/60" />
              <SelectValue placeholder="Tipo" />
            </SelectTrigger>
            <SelectContent className="rounded-xl bg-card/95 backdrop-blur-xl border-border">
              <SelectItem value="all" className="rounded-lg font-medium">Todos Tipos</SelectItem>
              <SelectItem value="implementacao" className="rounded-lg font-medium">Implementacao</SelectItem>
              <SelectItem value="tutoria" className="rounded-lg font-medium">Tutoria</SelectItem>
            </SelectContent>
          </Select>
          <Select value={responsavelFilter} onValueChange={setResponsavelFilter}>
            <SelectTrigger className="w-full sm:w-44 h-12 bg-muted/10 border-border rounded-xl">
              <SelectValue placeholder="Responsavel" />
            </SelectTrigger>
            <SelectContent className="rounded-xl bg-card/95 backdrop-blur-xl border-border">
              <SelectItem value="all" className="rounded-lg font-medium">Todos</SelectItem>
              {uniqueResponsaveis.map(r => (
                <SelectItem key={r} value={r} className="rounded-lg font-medium">{r}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={anoFilter} onValueChange={(v) => { setAnoFilter(v); setMesFilter("all"); setSemanaFilter("all") }}>
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
          <Select value={mesFilter} onValueChange={(v) => { setMesFilter(v); setSemanaFilter("all") }}>
            <SelectTrigger className="w-full sm:w-32 h-12 bg-muted/10 border-border rounded-xl">
              <SelectValue placeholder="Mês" />
            </SelectTrigger>
            <SelectContent className="rounded-xl bg-card/95 backdrop-blur-xl border-border">
              <SelectItem value="all" className="rounded-lg font-medium">Todos Meses</SelectItem>
              {uniqueMonths.map(m => (
                <SelectItem key={m} value={String(m)} className="rounded-lg font-medium">{['', 'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'][m]}</SelectItem>
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
          {filteredGrouped.map(([responsavel, respMeetings]) => (
            <div key={responsavel} className="space-y-8">
              <motion.div
                variants={item}
                className="flex items-center gap-5 bg-muted/10 p-6 rounded-2xl border border-border/50 backdrop-blur-sm cursor-pointer hover:bg-muted/20 transition-colors duration-200"
                onClick={() => toggleSection(responsavel)}
              >
                <Avatar className="size-16 border-2 border-primary/20 p-1 bg-background">
                  <AvatarFallback className="bg-primary/10 text-primary font-bold text-xl uppercase">
                    {responsavel.substring(0, 2)}
                  </AvatarFallback>
                </Avatar>
                <div className="space-y-1 flex-1">
                  <h2 className="text-2xl font-bold tracking-tight text-foreground">{responsavel}</h2>
                  <div className="flex items-center gap-3">
                    <Badge variant="outline" className="bg-primary/5 border-primary/20 text-primary font-bold text-[10px] tracking-wider uppercase px-2.5">
                      {respMeetings.length} Sessoes
                    </Badge>
                    <span className="text-[11px] text-muted-foreground font-medium uppercase tracking-widest flex items-center gap-1.5">
                      <MessageSquare className="size-3" /> Especialista Black CRM
                    </span>
                  </div>
                </div>
                <motion.div
                  animate={{ rotate: expandedSections.has(responsavel) ? 180 : 0 }}
                  transition={{ duration: 0.3 }}
                >
                  <ChevronDownIcon className="size-6 text-muted-foreground" />
                </motion.div>
              </motion.div>

              <AnimatePresence initial={false}>
                {expandedSections.has(responsavel) && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.3, ease: "easeInOut" }}
                    className="overflow-hidden"
                  >
                    <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3 pt-2">
                      {respMeetings.map((meeting) => (
                        <div key={meeting.id_unico}>
                          <Card className="hover:border-primary/30 transition-all duration-300">
                            <CardContent className="p-6 space-y-5">
                              <div className="flex justify-between items-start gap-4">
                                <div className="space-y-1.5 flex-1">
                                  <h3 className="font-bold text-base text-foreground leading-tight line-clamp-1">
                                    {meeting.nome_empresa_formatado || meeting.empresa || "Sem identificacao"}
                                  </h3>
                                  {meeting.tipo_reuniao && (
                                    <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-widest">
                                      {meeting.tipo_reuniao === 'implementacao' ? 'Implementacao' : 'Tutoria'}
                                    </p>
                                  )}
                                </div>
                                <Badge
                                  variant="outline"
                                  className={`uppercase font-bold text-[9px] px-2 py-0.5 rounded-lg shrink-0 ${
                                    meeting.tipo_reuniao === 'tutoria'
                                      ? "bg-blue-500/10 border-blue-500/20 text-blue-400"
                                      : "bg-primary/10 border-primary/20 text-primary"
                                  }`}
                                >
                                  {meeting.tipo_reuniao === 'tutoria' ? 'Tutoria' : 'Implementacao'}
                                </Badge>
                              </div>

                              <div className="flex items-center justify-between border-t border-border/50 pt-4">
                                <div className="flex items-center gap-2 text-[11px] font-semibold text-muted-foreground">
                                  <Calendar className="size-3.5 text-primary/60" />
                                  <span className="uppercase tracking-widest">
                                    {(() => {
                                      try {
                                        const d = new Date(meeting.data_reuniao + 'T00:00:00')
                                        return isNaN(d.getTime()) ? meeting.data_reuniao : d.toLocaleDateString('pt-BR')
                                      } catch { return meeting.data_reuniao }
                                    })()}
                                  </span>
                                </div>
                                <div className="flex items-center gap-1">
                                  {meeting.link_gravacao && (
                                    <a href={meeting.link_gravacao} target="_blank" rel="noopener noreferrer" title="Gravacao">
                                      <Button variant="ghost" size="sm" className="h-7 w-7 p-0 text-muted-foreground hover:text-primary hover:bg-primary/5">
                                        <VideoIcon className="size-3.5" />
                                      </Button>
                                    </a>
                                  )}
                                  {meeting.link_geminidoc && (
                                    <a href={meeting.link_geminidoc} target="_blank" rel="noopener noreferrer" title="Documento">
                                      <Button variant="ghost" size="sm" className="h-7 w-7 p-0 text-muted-foreground hover:text-primary hover:bg-primary/5">
                                        <FileTextIcon className="size-3.5" />
                                      </Button>
                                    </a>
                                  )}
                                  <Button variant="ghost" size="sm" className="h-7 text-[10px] font-bold uppercase tracking-wider text-primary hover:bg-primary/5" onClick={() => navigate(`/reuniao-blackcrm/${meeting.id_unico}`)}>
                                    Ver Detalhes
                                  </Button>
                                </div>
                              </div>
                            </CardContent>
                          </Card>
                        </div>
                      ))}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          ))}
        </motion.div>
      </ScrollArea>
    </div>
  )
}
