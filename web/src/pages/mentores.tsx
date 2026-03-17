import { useEffect, useState } from "react"
import { supabase } from "@/lib/supabase"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Calendar, Search, Filter } from "lucide-react"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

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

  if (loading) {
    return <div className="space-y-8 animate-pulse">
      {[1, 2].map(i => (
        <div key={i} className="space-y-4">
          <div className="h-8 w-48 bg-card rounded" />
          <div className="grid gap-4 md:grid-cols-3">
            {[1, 2, 3].map(j => <Card key={j} className="h-32 bg-card/50" />)}
          </div>
        </div>
      ))}
    </div>
  }

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-4 border-b-4 border-foreground pb-6 md:flex-row md:items-end md:justify-between">
        <div className="flex flex-col gap-2">
          <h1 className="text-4xl lg:text-5xl font-black tracking-tighter uppercase">Mentores</h1>
          <p className="text-muted-foreground font-bold uppercase tracking-widest text-sm">{Object.values(meetings).flat().length} reuniões registradas.</p>
        </div>
        <div className="flex flex-col sm:flex-row items-end sm:items-center gap-3">
          <div className="relative w-full sm:w-64">
            <Search className="absolute left-3 top-3 size-5 text-foreground" />
            <Input
              placeholder="Buscar..."
              className="pl-10 h-12 rounded-none border-2 border-foreground shadow-brutal-sm focus-visible:shadow-none focus-visible:translate-y-[2px] focus-visible:translate-x-[2px] transition-all bg-card font-bold uppercase"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <Select defaultValue="all">
            <SelectTrigger className="w-full sm:w-48 h-12 rounded-none border-2 border-foreground shadow-brutal-sm focus:shadow-none focus:translate-y-[2px] focus:translate-x-[2px] transition-all bg-card font-bold uppercase">
              <Filter className="mr-2 size-4 text-foreground" />
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent className="rounded-none border-2 border-foreground shadow-brutal">
              <SelectItem value="all" className="font-bold uppercase focus:bg-primary focus:text-foreground rounded-none cursor-pointer">Todos os Status</SelectItem>
              <SelectItem value="yes" className="font-bold uppercase focus:bg-primary focus:text-foreground rounded-none cursor-pointer">Compareceu</SelectItem>
              <SelectItem value="no" className="font-bold uppercase focus:bg-primary focus:text-foreground rounded-none cursor-pointer">Não Compareceu</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <ScrollArea className="h-[calc(100vh-14rem)] pr-4">
        <div className="space-y-12 pb-10">
          {filteredMentors.map(([mentor, mentorMeetings]) => (
            <div key={mentor} className="space-y-6">
              <div className="flex items-center gap-4 border-l-8 border-primary pl-4 bg-muted/20 p-4 border-y-2 border-r-2 border-foreground">
                <Avatar className="size-14 border-2 border-foreground rounded-none shadow-brutal-sm">
                  <AvatarFallback className="bg-primary text-foreground font-black text-xl rounded-none">
                    {mentor.substring(0, 2).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <h2 className="text-2xl font-black uppercase tracking-tighter">{mentor}</h2>
                  <Badge variant="outline" className="rounded-none border-2 border-foreground bg-background text-foreground mt-1 px-2 py-0 font-bold">
                    {mentorMeetings.length} Atendimentos
                  </Badge>
                </div>
              </div>

              <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                {mentorMeetings.map((meeting) => (
                  <Card key={meeting.id_unico} className="bg-card">
                    <CardContent className="p-5 space-y-4">
                      <div className="flex justify-between items-start gap-4">
                        <div className="space-y-1 flex-1">
                          <h3 className="font-black text-lg uppercase tracking-tight leading-tight line-clamp-2">{meeting.pessoa}</h3>
                          <p className="text-[11px] font-bold text-muted-foreground uppercase tracking-widest">{meeting.empresa}</p>
                        </div>
                        <Badge 
                          variant="outline"
                          className={`uppercase font-black text-[9px] px-2 py-1 border-2 rounded-none shrink-0 ${
                            meeting.cliente_compareceu === false 
                              ? "bg-destructive border-foreground text-destructive-foreground" 
                              : "bg-primary border-foreground text-foreground"
                          }`}
                        >
                          {meeting.cliente_compareceu === false ? "Faltou" : "Realizada"}
                        </Badge>
                      </div>
                      
                      <div className="flex flex-col gap-2 text-[11px] font-bold text-foreground border-t-2 border-foreground pt-4">
                        <div className="flex items-center gap-2">
                          <Calendar className="size-4" />
                          <span className="uppercase tracking-widest">{new Date(meeting.data_reuniao).toLocaleDateString('pt-BR')}</span>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          ))}
        </div>
      </ScrollArea>
    </div>
  )
}
