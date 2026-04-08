import { useEffect, useState } from "react"
import { useNavigate } from "react-router-dom"
import { supabase } from "@/lib/supabase"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { ScrollArea } from "@/components/ui/scroll-area"
import {
  CalendarIcon as Calendar,
  SearchIcon as Search,
  FilterIcon as Filter,
  VideoIcon,
  FileTextIcon
} from "@/components/ui/icons"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { motion } from "framer-motion"

interface Meeting {
  id_unico: string
  nome_cliente_formatado: string | null
  nome_empresa_formatado: string | null
  empresa: string | null
  pessoa: string | null
  data_reuniao: string
  horario: string | null
  mes: number | null
  cliente_compareceu: boolean | null
  semana: number | null
  ano: number | null
  resumo: string | null
  acoes_cliente: string | Array<{ acao: string; prazo: string; status: string }> | null
  nps: number | null
  transcricao: string | null
  link_gravacao: string | null
  link_geminidoc: string | null
  detalhes_reuniao: string | null
}

import type { Session } from "@supabase/supabase-js"

interface ReunioesGaldinoProps {
  session?: Session
  clientId?: string
}

export default function ReunioesGaldinoPage({ session, clientId }: ReunioesGaldinoProps) {
  const navigate = useNavigate()
  const [meetings, setMeetings] = useState<Meeting[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState("")
  const [statusFilter, setStatusFilter] = useState("all")
  const [mesFilter, setMesFilter] = useState("all")
  const [semanaFilter, setSemanaFilter] = useState("all")
  const [anoFilter, setAnoFilter] = useState("all")
  const [dateRange, setDateRange] = useState({ from: "", to: "" })

  useEffect(() => {
    async function fetchMeetings() {
      const resolvedClientId = clientId || session?.user?.id

      let query = supabase
        .from('reunioes_galdino')
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
        setMeetings(data)
      }
      setLoading(false)
    }

    fetchMeetings()
  }, [session, clientId])

  const uniqueYears = [...new Set(meetings.map(m => m.ano))].filter(Boolean).sort() as number[]
  const uniqueMonths = [...new Set(
    meetings
      .filter(m => anoFilter === "all" || String(m.ano) === anoFilter)
      .map(m => m.mes)
  )].filter(Boolean).sort((a, b) => (a as number) - (b as number)) as number[]
  const uniqueWeeks = [...new Set(
    meetings
      .filter(m => anoFilter === "all" || String(m.ano) === anoFilter)
      .filter(m => mesFilter === "all" || String(m.mes) === mesFilter)
      .map(m => m.semana)
  )].filter(Boolean).sort((a, b) => (a as number) - (b as number)) as number[]

  const filteredMeetings = meetings.filter(m => {
    const matchesSearch = searchTerm === "" ||
      m.nome_cliente_formatado?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      m.nome_empresa_formatado?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      m.empresa?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      m.pessoa?.toLowerCase().includes(searchTerm.toLowerCase())

    const matchesStatus = statusFilter === "all" ||
      (statusFilter === "yes" && m.cliente_compareceu !== false && new Date(m.data_reuniao) <= new Date()) ||
      (statusFilter === "no" && m.cliente_compareceu === false) ||
      (statusFilter === "scheduled" && new Date(m.data_reuniao) > new Date())

    const matchesAno = anoFilter === "all" || String(m.ano) === anoFilter

    const matchesMes = mesFilter === "all" || String(m.mes) === mesFilter

    const matchesSemana = semanaFilter === "all" || String(m.semana) === semanaFilter

    const matchesDate =
      (!dateRange.from || m.data_reuniao >= dateRange.from) &&
      (!dateRange.to || m.data_reuniao <= dateRange.to)

    return matchesSearch && matchesStatus && matchesAno && matchesMes && matchesSemana && matchesDate
  })

  const container = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: { staggerChildren: 0.05 }
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
          <h1 className="text-4xl lg:text-5xl font-bold tracking-tight text-foreground">Reunioes Galdino</h1>
          <p className="text-muted-foreground font-medium text-sm">Historico de reunioes e acompanhamento do Galdino.</p>
        </div>
        <div className="flex flex-wrap items-end gap-3">
          <div className="relative w-full sm:w-56">
            <Search className="absolute left-3.5 top-3.5 size-4 text-muted-foreground" />
            <Input
              placeholder="Buscar cliente ou empresa..."
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
              <SelectItem value="scheduled" className="rounded-lg font-medium">Agendadas</SelectItem>
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
          className="space-y-8 pb-10"
        >
          <div className="flex items-center gap-3 text-muted-foreground">
            <Badge variant="outline" className="bg-primary/5 border-primary/20 text-primary font-bold text-[10px] tracking-wider uppercase px-2.5">
              {filteredMeetings.length} Reunioes
            </Badge>
          </div>

          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {filteredMeetings.map((meeting) => (
              <motion.div key={meeting.id_unico} variants={item}>
                <Card className="hover:border-primary/30 transition-all duration-300">
                  <CardContent className="p-6 space-y-5">
                    <div className="flex justify-between items-start gap-4">
                      <div className="space-y-1.5 flex-1">
                        <h3 className="font-bold text-base text-foreground leading-tight line-clamp-1">
                          {meeting.nome_cliente_formatado || meeting.pessoa || meeting.empresa || "Sem identificacao"}
                        </h3>
                        <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-widest">
                          {meeting.nome_empresa_formatado || meeting.empresa || ""}
                        </p>
                      </div>
                      <Badge
                        variant="outline"
                        className={`uppercase font-bold text-[9px] px-2 py-0.5 rounded-lg shrink-0 ${
                          new Date(meeting.data_reuniao + 'T00:00:00') > new Date()
                            ? "bg-amber-500/10 border-amber-500/20 text-amber-400"
                            : meeting.cliente_compareceu === false
                              ? "bg-destructive/10 border-destructive/20 text-destructive"
                              : "bg-primary/10 border-primary/20 text-primary"
                        }`}
                      >
                        {new Date(meeting.data_reuniao + 'T00:00:00') > new Date() ? "Agendada" : meeting.cliente_compareceu === false ? "Faltou" : "Realizada"}
                      </Badge>
                    </div>

                    <div className="flex items-center justify-between border-t border-border/50 pt-4">
                      <div className="flex items-center gap-2 text-[11px] font-semibold text-muted-foreground">
                        <Calendar className="size-3.5 text-primary/60" />
                        <span className="uppercase tracking-widest">{new Date(meeting.data_reuniao + 'T00:00:00').toLocaleDateString('pt-BR')}</span>
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
                          <a href={meeting.link_geminidoc} target="_blank" rel="noopener noreferrer" title="Transcricao">
                            <Button variant="ghost" size="sm" className="h-7 w-7 p-0 text-muted-foreground hover:text-primary hover:bg-primary/5">
                              <FileTextIcon className="size-3.5" />
                            </Button>
                          </a>
                        )}
                        <Button variant="ghost" size="sm" className="h-7 text-[10px] font-bold uppercase tracking-wider text-primary hover:bg-primary/5" onClick={() => navigate(`/reuniao-galdino/${meeting.id_unico}`)}>
                          Ver Detalhes
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
        </motion.div>
      </ScrollArea>
    </div>
  )
}
