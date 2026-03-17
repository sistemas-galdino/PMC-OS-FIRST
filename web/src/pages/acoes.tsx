import { useEffect, useState } from "react"
import { supabase } from "@/lib/supabase"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { 
  CheckSquare, 
  Square, 
  Calendar, 
  ArrowRight,
  Filter,
  Search,
  CheckCircle2,
  Clock,
  AlertCircle
} from "lucide-react"
import { Input } from "@/components/ui/input"
import type { Session } from "@supabase/supabase-js"

interface Action {
  text: string
  done: boolean
  meeting_date: string
  mentor: string
}

export default function AcoesPage({ session }: { session: Session }) {
  const [actions, setActions] = useState<Action[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState("")

  useEffect(() => {
    async function fetchActions() {
      // Get client ID
      const { data: clientEntry } = await supabase
        .from('entrada_clientes')
        .select('id_cliente')
        .eq('id_cliente', session.user.id)
        .single()

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
      
      if (actions.length === 0) {
        // Dummy data for Sprint 3 demo if no real meetings yet
        setActions([
          { text: "Confirmar meta de faturamento de R$ 3,6 milhões para 2026", done: false, meeting_date: "2026-03-10", mentor: "Rafael Galdino" },
          { text: "Separar fontes de receita e definir metas por produto", done: false, meeting_date: "2026-03-10", mentor: "Rafael Galdino" },
          { text: "Reservar dois dias para análise de planilhas e foco", done: true, meeting_date: "2026-03-01", mentor: "Issao Yokoi" },
          { text: "Avaliar estratégias para redução de churn (50% -> 30%)", done: false, meeting_date: "2026-03-01", mentor: "Issao Yokoi" },
          { text: "Estruturar gamificação da experiência do aluno com IA", done: false, meeting_date: "2026-02-15", mentor: "Rodrigo Nogueira" },
        ])
      }
      setLoading(false)
    }

    fetchActions()
  }, [session.user.id])

  const filteredActions = actions.filter(a => 
    a.text.toLowerCase().includes(searchTerm.toLowerCase()) ||
    a.mentor.toLowerCase().includes(searchTerm.toLowerCase())
  )

  const pending = actions.filter(a => !a.done).length
  const completed = actions.filter(a => a.done).length

  if (loading) {
    return <div className="animate-pulse space-y-8">
      <div className="h-20 w-1/3 bg-card border-2 border-foreground" />
      <div className="space-y-4">
        {[1, 2, 3, 4].map(i => <div key={i} className="h-20 w-full bg-card border-2 border-foreground" />)}
      </div>
    </div>
  }

  return (
    <div className="space-y-8 pb-10">
      <div className="flex flex-col gap-4 border-b-4 border-foreground pb-6 md:flex-row md:items-end md:justify-between">
        <div className="flex flex-col gap-2">
          <h1 className="text-4xl lg:text-5xl font-black tracking-tighter uppercase">Plano de Ação</h1>
          <p className="text-muted-foreground font-bold uppercase tracking-widest text-sm">Tarefas e direcionamentos gerados em suas mentorias.</p>
        </div>
        <div className="flex gap-4">
          <div className="bg-primary px-4 py-2 border-2 border-foreground shadow-brutal-sm flex items-center gap-2">
            <Clock className="size-4" />
            <span className="font-black uppercase text-xs">{pending} Pendentes</span>
          </div>
          <div className="bg-background px-4 py-2 border-2 border-foreground shadow-brutal-sm flex items-center gap-2">
            <CheckCircle2 className="size-4" />
            <span className="font-black uppercase text-xs">{completed} Concluídas</span>
          </div>
        </div>
      </div>

      <div className="flex flex-col md:flex-row md:items-center gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-3 size-5 text-foreground" />
          <Input
            placeholder="Buscar tarefas ou mentores..."
            className="pl-10 h-12 rounded-none border-2 border-foreground shadow-brutal-sm focus-visible:shadow-none focus-visible:translate-y-[2px] focus-visible:translate-x-[2px] transition-all bg-card font-bold uppercase"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      <div className="space-y-4">
        {filteredActions.length === 0 ? (
          <div className="border-4 border-dashed border-foreground p-12 text-center bg-muted/10">
            <AlertCircle className="size-12 mx-auto text-muted-foreground mb-4" />
            <p className="font-black uppercase tracking-widest text-muted-foreground">Nenhuma ação encontrada</p>
          </div>
        ) : (
          filteredActions.map((action, index) => (
            <Card key={index} className={`bg-card transition-all rounded-none ${action.done ? 'opacity-60 bg-muted/20' : 'hover:translate-x-2'}`}>
              <CardContent className="p-0 flex flex-col md:flex-row md:items-center">
                <div className={`p-6 flex-1 flex items-start gap-4 ${action.done ? '' : ''}`}>
                  <div className="mt-1">
                    {action.done ? (
                      <CheckSquare className="size-6 text-primary" />
                    ) : (
                      <Square className="size-6 text-foreground/20" />
                    )}
                  </div>
                  <div className="space-y-1">
                    <p className={`text-lg font-bold uppercase leading-tight tracking-tight ${action.done ? 'line-through text-muted-foreground' : ''}`}>
                      {action.text}
                    </p>
                    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-[10px] font-black uppercase tracking-widest text-muted-foreground">
                      <div className="flex items-center gap-1.5">
                        <Calendar className="size-3" />
                        {new Date(action.meeting_date).toLocaleDateString('pt-BR')}
                      </div>
                      <div className="flex items-center gap-1.5">
                        <span className="size-1.5 bg-primary" />
                        Mentor: {action.mentor}
                      </div>
                    </div>
                  </div>
                </div>
                <div className="border-t-2 md:border-t-0 md:border-l-2 border-foreground p-4 bg-muted/10 md:w-48 flex items-center justify-center">
                  <Button variant={action.done ? "outline" : "default"} className="w-full h-10 text-[10px]">
                    {action.done ? "Reabrir" : "Concluir"}
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  )
}
