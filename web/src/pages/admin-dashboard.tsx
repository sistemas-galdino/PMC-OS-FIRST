import { useEffect, useState } from "react"
import { supabase } from "@/lib/supabase"
import { Users, UserPlus, TrendingUp, Star, ChevronUp, ChevronDown } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"

export default function AdminDashboard() {
  const [stats, setStats] = useState({
    total: 0,
    ativos: 0,
    pendentes: 0,
    nps: 0,
  })
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function fetchStats() {
      try {
        const { data: clients, error: clientsError } = await supabase
          .from('entrada_clientes')
          .select('status_atual')
        
        if (clientsError) throw clientsError

        const { data: reviews, error: reviewsError } = await supabase
          .from('reunioes_mentoria')
          .select('nps')
          .not('nps', 'is', null)

        if (reviewsError) throw reviewsError

        if (clients) {
          const total = clients.length
          const ativos = clients.filter(c => c.status_atual?.toLowerCase().includes('ativo')).length
          const pendentes = clients.filter(c => c.status_atual?.toLowerCase().includes('onboarding')).length
          
          const npsRaw = reviews?.reduce((acc, r) => acc + (r.nps || 0), 0) || 0
          const npsAvg = reviews?.length ? (npsRaw / reviews.length) : 0

          setStats({
            total,
            ativos,
            pendentes,
            nps: Number(npsAvg.toFixed(1)),
          })
        }
      } catch (err) {
        console.error("Admin stats fetch error:", err)
      } finally {
        setLoading(false)
      }
    }

    fetchStats()
  }, [])

  if (loading) {
    return <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      {[1, 2, 3, 4].map(i => <Card key={i} className="h-32 animate-pulse bg-card/50" />)}
    </div>
  }

  const cards = [
    { title: "Total Clientes", value: stats.total, icon: Users, description: "Base geral de clientes", trend: "+2.5%", trendUp: true },
    { title: "Clientes Ativos", value: stats.ativos, icon: TrendingUp, description: "Ativos no programa", trend: "+1.2%", trendUp: true },
    { title: "Pendentes Onboarding", value: stats.pendentes, icon: UserPlus, description: "Aguardando reunião inicial", trend: "-5%", trendUp: false },
    { title: "NPS Médio", value: stats.nps, icon: Star, description: "Satisfação dos clientes", trend: "+0.3", trendUp: true },
  ]

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-2 border-b-4 border-foreground pb-6">
        <h1 className="text-4xl lg:text-5xl font-black tracking-tighter uppercase">Visão Geral</h1>
        <p className="text-muted-foreground font-bold uppercase tracking-widest text-sm">Programa Multiplicador de Crescimento</p>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        {cards.map((card) => (
          <Card key={card.title} className="bg-card">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 border-b-2 border-foreground mb-4">
              <CardTitle className="text-[11px] font-black uppercase tracking-widest text-foreground">{card.title}</CardTitle>
              <div className="bg-primary p-2 border-2 border-foreground">
                <card.icon className="size-4 text-primary-foreground" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-5xl font-black tracking-tighter mb-2">{card.value}</div>
              <div className="flex items-center gap-2">
                <Badge variant="outline" className={`rounded-none border-2 px-1.5 py-0 text-[10px] ${card.trendUp ? 'border-primary text-primary bg-primary/10' : 'border-destructive text-destructive bg-destructive/10'}`}>
                  {card.trendUp ? <ChevronUp className="size-3 mr-1" /> : <ChevronDown className="size-3 mr-1" />}
                  {card.trend}
                </Badge>
                <span className="text-[10px] uppercase font-bold text-muted-foreground">{card.description}</span>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card className="bg-card min-h-[400px]">
          <CardHeader className="border-b-2 border-foreground">
            <CardTitle className="text-lg font-black uppercase tracking-widest">Clientes por Estado</CardTitle>
          </CardHeader>
          <CardContent className="flex items-center justify-center h-64">
             <div className="border-2 border-foreground border-dashed p-8 text-center bg-muted/20">
               <span className="font-bold uppercase tracking-widest text-muted-foreground text-[10px]">Módulo de Gráficos<br/>Aguardando Dados</span>
             </div>
          </CardContent>
        </Card>
        <Card className="bg-card min-h-[400px]">
          <CardHeader className="border-b-2 border-foreground">
            <CardTitle className="text-lg font-black uppercase tracking-widest">Clientes por Nicho</CardTitle>
          </CardHeader>
          <CardContent className="flex items-center justify-center h-64">
             <div className="border-2 border-foreground border-dashed p-8 text-center bg-muted/20">
               <span className="font-bold uppercase tracking-widest text-muted-foreground text-[10px]">Módulo de Gráficos<br/>Aguardando Dados</span>
             </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
