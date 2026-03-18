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
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend
} from "recharts"

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
  const [geoData, setGeoData] = useState<any[]>([])
  const [nicheData, setNicheData] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function fetchStats() {
      try {
        // Fetch Operational Data
        const { data: clients, error: clientsError } = await supabase
          .from('entrada_clientes')
          .select('status_atual, nicho')
        
        if (clientsError) throw clientsError

        // Fetch Geographical Data from Form
        const { data: geoRaw, error: geoError } = await supabase
          .from('clientes_formulario')
          .select('estado')

        if (geoError) throw geoError

        const { data: reviews, error: reviewsError } = await supabase
          .from('reunioes_mentoria')
          .select('nps')
          .not('nps', 'is', null)

        if (reviewsError) throw reviewsError

        if (clients) {
          // Calculate Stats
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

          // Process Niche Data
          const niches: Record<string, number> = {}
          clients.forEach(c => {
            if (c.nicho) {
              niches[c.nicho] = (niches[c.nicho] || 0) + 1
            }
          })
          const nicheFormatted = Object.entries(niches)
            .map(([name, value]) => ({ name, value }))
            .sort((a, b) => b.value - a.value)
            .slice(0, 5)
          setNicheData(nicheFormatted)
        }

        if (geoRaw) {
          // State Mapping to Abbreviations
          const stateMap: Record<string, string> = {
            'São Paulo': 'SP',
            'Santa Catarina': 'SC',
            'Mato Grosso do Sul': 'MS',
            'Mato Grosso': 'MT',
            'Rio grande do Sul': 'RS',
            'Rio Grande do Sul': 'RS',
            'Distrito Federal': 'DF',
            'Brasília': 'DF',
            'Minas Gerais': 'MG',
            'Paraná': 'PR',
            'Rio de Janeiro': 'RJ',
            'Ceará': 'CE',
            'Bahia': 'BA',
            'Rondônia': 'RO',
            'Tocantins': 'TO'
          }

          // Process Geo Data
          const states: Record<string, number> = {}
          geoRaw.forEach(c => {
            if (c.estado) {
              const abbrev = stateMap[c.estado] || c.estado
              states[abbrev] = (states[abbrev] || 0) + 1
            }
          })
          const geoFormatted = Object.entries(states)
            .map(([name, value]) => ({ name, value }))
            .sort((a, b) => b.value - a.value)
            .slice(0, 10)
          setGeoData(geoFormatted)
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

  const CHART_COLORS = ['#DAFC67', '#A3E635', '#4ADE80', '#22C55E', '#16A34A']

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
            <CardContent className="h-[350px] pt-6">
               <ResponsiveContainer width="100%" height="100%">
                 <BarChart data={geoData}>
                   <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
                   <XAxis 
                    dataKey="name" 
                    axisLine={false} 
                    tickLine={false} 
                    tick={{ fill: 'rgba(255,255,255,0.5)', fontSize: 12, fontWeight: 600 }}
                    dy={10}
                   />
                   <YAxis hide />
                   <Tooltip 
                    cursor={{ fill: 'rgba(218,252,103,0.05)' }}
                    contentStyle={{ 
                      backgroundColor: 'rgba(0,0,0,0.8)', 
                      border: '1px solid rgba(218,252,103,0.2)',
                      borderRadius: '12px',
                      fontSize: '12px'
                    }}
                   />
                   <Bar 
                    dataKey="value" 
                    fill="#DAFC67" 
                    radius={[6, 6, 0, 0]} 
                    barSize={40}
                    animationDuration={1500}
                   />
                 </BarChart>
               </ResponsiveContainer>
            </CardContent>
          </Card>
        </motion.div>
        <motion.div variants={item}>
          <Card className="min-h-[450px]">
            <CardHeader className="border-b border-border/50">
              <CardTitle className="text-base font-semibold">Distribuição por Nicho</CardTitle>
            </CardHeader>
            <CardContent className="h-[350px] pt-6">
               <ResponsiveContainer width="100%" height="100%">
                 <PieChart>
                   <Pie
                    data={nicheData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={100}
                    paddingAngle={5}
                    dataKey="value"
                    animationDuration={1500}
                   >
                     {nicheData.map((entry, index) => (
                       <Cell key={`cell-${index}`} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                     ))}
                   </Pie>
                   <Tooltip 
                    contentStyle={{ 
                      backgroundColor: 'rgba(0,0,0,0.8)', 
                      border: '1px solid rgba(218,252,103,0.2)',
                      borderRadius: '12px',
                      fontSize: '12px'
                    }}
                   />
                   <Legend 
                    verticalAlign="bottom" 
                    align="center"
                    iconType="circle"
                    formatter={(value) => <span className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">{value}</span>}
                   />
                 </PieChart>
               </ResponsiveContainer>
            </CardContent>
          </Card>
        </motion.div>
      </motion.div>
    </div>
  )
}
