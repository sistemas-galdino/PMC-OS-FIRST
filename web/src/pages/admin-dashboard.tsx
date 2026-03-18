import { useEffect, useState } from "react"
import { supabase } from "@/lib/supabase"
import {
  UsersIcon as Users,
  UserPlusIcon as UserPlus,
  TrendingUpIcon as TrendingUp,
  StarIcon as Star,
  ChevronUpIcon as ChevronUp,
  ChevronDownIcon as ChevronDown
} from "@/components/ui/icons"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { motion, AnimatePresence } from "framer-motion"

function CountUp({ value }: { value: number }) {
  const [displayValue, setDisplayValue] = useState(0)

  useEffect(() => {
    let start = 0
    const duration = 1000
    const increment = value / (duration / 16)
    
    const timer = setInterval(() => {
      start += increment
      if (start >= value) {
        setDisplayValue(value)
        clearInterval(timer)
      } else {
        setDisplayValue(Math.floor(start))
      }
    }, 16)

    return () => clearInterval(timer)
  }, [value])

  return <span>{displayValue}</span>
}

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
    return <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
      {[1, 2, 3, 4].map(i => <Card key={i} className="h-40 animate-pulse bg-card/40" />)}
    </div>
  }

  const cards = [
    { title: "Total Clientes", value: stats.total, icon: Users, description: "Base geral de clientes", trend: "+2.5%", trendUp: true },
    { title: "Clientes Ativos", value: stats.ativos, icon: TrendingUp, description: "Ativos no programa", trend: "+1.2%", trendUp: true },
    { title: "Pendentes Onboarding", value: stats.pendentes, icon: UserPlus, description: "Aguardando reunião inicial", trend: "-5%", trendUp: false },
    { title: "NPS Médio", value: stats.nps, icon: Star, description: "Satisfação dos clientes", trend: "+0.3", trendUp: true },
  ]

  const container = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1
      }
    }
  }

  const item = {
    hidden: { y: 20, opacity: 0 },
    show: { y: 0, opacity: 1, transition: { duration: 0.5, ease: "easeOut" } }
  }

  return (
    <div className="space-y-10">
      <motion.div 
        initial={{ opacity: 0, x: -20 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.6 }}
        className="flex flex-col gap-3 border-l-4 border-primary pl-8 py-2"
      >
        <h1 className="text-4xl lg:text-5xl font-bold tracking-tight text-foreground">Visão Geral</h1>
        <div className="flex items-center gap-3">
          <Badge variant="outline" className="bg-primary/5 border-primary/20 text-primary">PMC 2026</Badge>
          <p className="text-muted-foreground font-medium text-sm">Programa Multiplicador de Crescimento — Black Eagle</p>
        </div>
      </motion.div>

      <motion.div 
        variants={container}
        initial="hidden"
        animate="show"
        className="grid gap-6 md:grid-cols-2 lg:grid-cols-4"
      >
        {cards.map((card) => (
          <motion.div key={card.title} variants={item}>
            <Card className="hover:shadow-primary/10">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">{card.title}</CardTitle>
                <div className="bg-primary/10 p-2.5 rounded-xl">
                  <card.icon className="size-4 text-primary" />
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-4xl font-bold tracking-tight mb-3">
                  <CountUp value={card.value} />
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant="ghost" className={`px-2 py-0.5 rounded-lg text-[10px] font-bold ${card.trendUp ? 'text-primary' : 'text-destructive'}`}>
                    {card.trendUp ? <ChevronUp className="size-3 mr-1" /> : <ChevronDown className="size-3 mr-1" />}
                    {card.trend}
                  </Badge>
                  <span className="text-[11px] font-medium text-muted-foreground">{card.description}</span>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </motion.div>

      <motion.div 
        variants={container}
        initial="hidden"
        animate="show"
        transition={{ delay: 0.4 }}
        className="grid gap-6 md:grid-cols-2"
      >
        <motion.div variants={item}>
          <Card className="min-h-[450px]">
            <CardHeader className="border-b border-border/50">
              <CardTitle className="text-base font-semibold">Clientes por Estado</CardTitle>
            </CardHeader>
            <CardContent className="flex items-center justify-center h-[350px]">
               <div className="flex flex-col items-center gap-4 text-center">
                 <div className="size-16 rounded-full bg-primary/5 border border-primary/20 flex items-center justify-center animate-pulse">
                   <TrendingUp className="size-6 text-primary/40" />
                 </div>
                 <div className="space-y-1">
                   <span className="font-bold text-foreground text-sm">Análise Geográfica</span>
                   <p className="text-xs text-muted-foreground max-w-[200px]">Os dados geográficos serão renderizados em gráficos neon em breve.</p>
                 </div>
               </div>
            </CardContent>
          </Card>
        </motion.div>
        <motion.div variants={item}>
          <Card className="min-h-[450px]">
            <CardHeader className="border-b border-border/50">
              <CardTitle className="text-base font-semibold">Distribuição por Nicho</CardTitle>
            </CardHeader>
            <CardContent className="flex items-center justify-center h-[350px]">
               <div className="flex flex-col items-center gap-4 text-center">
                 <div className="size-16 rounded-full bg-primary/5 border border-primary/20 flex items-center justify-center animate-pulse">
                   <Users className="size-6 text-primary/40" />
                 </div>
                 <div className="space-y-1">
                   <span className="font-bold text-foreground text-sm">Segmentação de Mercado</span>
                   <p className="text-xs text-muted-foreground max-w-[200px]">Visualização estratégica de nichos de mercado em desenvolvimento.</p>
                 </div>
               </div>
            </CardContent>
          </Card>
        </motion.div>
      </motion.div>
    </div>
  )
}
