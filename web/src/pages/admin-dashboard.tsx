import { useEffect, useState } from "react"
import { supabase } from "@/lib/supabase"
import { isStatusAtivo } from "@/lib/status-cliente"
import {
  UsersIcon as Users,
  TrendingUpIcon as TrendingUp,
  TrendingDownIcon as TrendingDown,
  XIcon,
  ShoppingCartIcon,
  CalendarIcon,
  ClockIcon,
  PlayCircleIcon,
  FlagIcon,
  SnowflakeIcon,
} from "@/components/ui/icons"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { motion } from "framer-motion"
import Dashboard2 from "./dashboard-2"
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

function CountUp({ value, decimals = 0, suffix = '' }: { value: number; decimals?: number; suffix?: string }) {
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
        setDisplayValue(decimals > 0 ? parseFloat(start.toFixed(decimals)) : Math.floor(start))
      }
    }, 16)

    return () => clearInterval(timer)
  }, [value, decimals])

  return <span>{decimals > 0 ? displayValue.toFixed(decimals) : displayValue}{suffix}</span>
}

export default function AdminDashboard() {
  const [stats, setStats] = useState({
    total: 0,
    ativos: 0,
    cancelados: 0,
    desistencias: 0,
    onboardingMarcado: 0,
    pendentesOnboarding: 0,
    aguardandoInicio: 0,
    cicloEncerrado: 0,
    congelado: 0,
    churnRate: 0,
  })
  const [geoData, setGeoData] = useState<any[]>([])
  const [nicheData, setNicheData] = useState<any[]>([])
  const [csData, setCsData] = useState<any[]>([])
  const [canalData, setCanalData] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [detalhada, setDetalhada] = useState(false)
  const [vista, setVista] = useState<"operacional" | "estrategica">("operacional")

  useEffect(() => {
    async function fetchStats() {
      try {
        // Fetch Operational Data
        const { data: clients, error: clientsError } = await supabase
          .from('clientes_entrada_new')
          .select('status_atual, nicho, sc, canal_de_venda')
        
        if (clientsError) throw clientsError

        // Fetch Geographical Data from Form
        const { data: geoRaw, error: geoError } = await supabase
          .from('clientes_formulario')
          .select('estado')

        if (geoError) throw geoError

        if (clients) {
          // Calculate Stats
          const total = clients.length
          const ativos = clients.filter(c => isStatusAtivo(c.status_atual)).length
          const cancelados = clients.filter(c => c.status_atual === 'Cliente Cancelado').length
          const desistencias = clients.filter(c => c.status_atual === 'Desistência de Compra').length
          const onboardingMarcado = clients.filter(c => c.status_atual === 'Onboarding marcado').length
          const pendentesOnboarding = clients.filter(c => c.status_atual === 'Pendente de Onboarding').length
          const aguardandoInicio = clients.filter(c => c.status_atual === 'Aguardando Início').length
          const cicloEncerrado = clients.filter(c => c.status_atual === 'Ciclo encerrado').length
          const congelado = clients.filter(c => c.status_atual === 'Congelado').length
          const churnRate = total > 0 ? (cancelados / total) * 100 : 0

          setStats({
            total,
            ativos,
            cancelados,
            desistencias,
            onboardingMarcado,
            pendentesOnboarding,
            aguardandoInicio,
            cicloEncerrado,
            congelado,
            churnRate: Number(churnRate.toFixed(1)),
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

          // Process CS Data
          const csMap: Record<string, number> = {}
          clients.forEach(c => {
            if (c.sc) {
              csMap[c.sc] = (csMap[c.sc] || 0) + 1
            }
          })
          const csFormatted = Object.entries(csMap)
            .map(([name, value]) => ({ name, value }))
            .sort((a, b) => b.value - a.value)
          setCsData(csFormatted)

          // Process Canal de Venda Data
          const canalMap: Record<string, number> = {}
          clients.forEach(c => {
            if (c.canal_de_venda) {
              canalMap[c.canal_de_venda] = (canalMap[c.canal_de_venda] || 0) + 1
            }
          })
          const canalFormatted = Object.entries(canalMap)
            .map(([name, value]) => ({ name, value }))
            .sort((a, b) => b.value - a.value)
          setCanalData(canalFormatted)

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
    // Mesmo grid/contagem da visão ativa, pra não pular o layout quando os dados chegam.
    return <div className="grid gap-6 grid-cols-1 sm:grid-cols-2 lg:grid-cols-5">
      {Array.from({ length: detalhada ? 10 : 5 }).map((_, i) => <Card key={i} className="h-40 animate-pulse bg-card/40" />)}
    </div>
  }

  // Ordem = leitura em 3 linhas na visão detalhada: base / entrada / saídas.
  // soDetalhada: card só aparece na visão Detalhada.
  const cards = [
    { title: "Total Clientes", value: stats.total, icon: Users, description: "Base geral de clientes", iconClass: "text-primary bg-primary/10" },
    { title: "Clientes Ativos", value: stats.ativos, icon: TrendingUp, description: "Ativos no programa", iconClass: "text-emerald-400 bg-emerald-500/10" },
    { title: "Churn Rate", value: stats.churnRate, icon: TrendingDown, description: "Taxa de cancelamento", iconClass: "text-red-400 bg-red-500/10", decimals: 1, suffix: "%", soDetalhada: true },
    { title: "Vão Iniciar", value: stats.aguardandoInicio, icon: PlayCircleIcon, description: "Aguardando início no programa", iconClass: "text-emerald-400 bg-emerald-500/10" },
    { title: "Onboarding Marcado", value: stats.onboardingMarcado, icon: CalendarIcon, description: "Reunião de onboarding agendada", iconClass: "text-blue-400 bg-blue-500/10" },
    { title: "Pendentes Onboarding", value: stats.pendentesOnboarding, icon: ClockIcon, description: "Aguardando agendamento", iconClass: "text-yellow-400 bg-yellow-500/10" },
    { title: "Cancelaram", value: stats.cancelados, icon: XIcon, description: "Clientes cancelados", iconClass: "text-red-400 bg-red-500/10", soDetalhada: true },
    { title: "Desistência de Compra", value: stats.desistencias, icon: ShoppingCartIcon, description: "Desistiram antes de iniciar", iconClass: "text-orange-400 bg-orange-500/10", soDetalhada: true },
    { title: "Ciclo Encerrado", value: stats.cicloEncerrado, icon: FlagIcon, description: "Completaram o programa e não renovaram", iconClass: "text-muted-foreground bg-muted/30", soDetalhada: true },
    { title: "Congelados", value: stats.congelado, icon: SnowflakeIcon, description: "Trancaram o programa temporariamente", iconClass: "text-sky-400 bg-sky-500/10", soDetalhada: true },
  ]

  // Simples = 5 cards (1 linha de 5) / Detalhada = 10 cards (2 linhas de 5) — sempre fechando a última linha.
  const cardsVisiveis = detalhada ? cards : cards.filter(c => !c.soDetalhada)

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
    show: { y: 0, opacity: 1, transition: { duration: 0.5, ease: "easeOut" as any } }
  }

  const CHART_COLORS = ['#DAFC67', '#A3E635', '#4ADE80', '#22C55E', '#16A34A']

  return (
    <div className="space-y-10">
      <div className="flex flex-wrap items-end justify-between gap-4">
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

        <div className="flex items-center gap-2 self-start flex-wrap">
          <div className="flex gap-1 rounded-xl bg-muted/20 border border-border p-1">
            <Button variant={vista === "operacional" ? "default" : "ghost"} size="sm" className="h-7 rounded-lg font-bold text-[11px] uppercase tracking-wider" onClick={() => setVista("operacional")}>
              Operacional
            </Button>
            <Button variant={vista === "estrategica" ? "default" : "ghost"} size="sm" className="h-7 rounded-lg font-bold text-[11px] uppercase tracking-wider" onClick={() => setVista("estrategica")}>
              Estratégica
            </Button>
          </div>
          {vista === "operacional" && (
            <div className="flex gap-1 rounded-xl bg-muted/20 border border-border p-1">
              <Button variant={!detalhada ? "default" : "ghost"} size="sm" className="h-7 rounded-lg font-bold text-[11px] uppercase tracking-wider" onClick={() => setDetalhada(false)}>
                Simples
              </Button>
              <Button variant={detalhada ? "default" : "ghost"} size="sm" className="h-7 rounded-lg font-bold text-[11px] uppercase tracking-wider" onClick={() => setDetalhada(true)}>
                Detalhada
              </Button>
            </div>
          )}
        </div>
      </div>

      {vista === "estrategica" && <Dashboard2 embedded />}

      {vista === "operacional" && (<>
      <motion.div
        variants={container}
        initial="hidden"
        animate="show"
        className="grid gap-6 grid-cols-1 sm:grid-cols-2 lg:grid-cols-5"
      >
        {cardsVisiveis.map((card) => (
          <motion.div key={card.title} variants={item} className="h-full">
            <Card className="h-full hover:shadow-primary/10">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">{card.title}</CardTitle>
                <div className={`p-2.5 rounded-xl ${card.iconClass}`}>
                  <card.icon className="size-4" />
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-4xl font-bold tracking-tight mb-3">
                  <CountUp value={card.value} decimals={card.decimals} suffix={card.suffix} />
                </div>
                <span className="text-[11px] font-medium text-muted-foreground">{card.description}</span>
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
                     {nicheData.map((_, index) => (
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

      <motion.div
        variants={container}
        initial="hidden"
        animate="show"
        transition={{ delay: 0.6 }}
        className="grid gap-6 md:grid-cols-2"
      >
        <motion.div variants={item}>
          <Card className="min-h-[450px]">
            <CardHeader className="border-b border-border/50">
              <CardTitle className="text-base font-semibold">Clientes por CS</CardTitle>
            </CardHeader>
            <CardContent className="h-[350px] pt-6">
               <ResponsiveContainer width="100%" height="100%">
                 <BarChart data={csData}>
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
                    barSize={60}
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
              <CardTitle className="text-base font-semibold">Distribuição por Canal de Venda</CardTitle>
            </CardHeader>
            <CardContent className="h-[380px] pt-4 overflow-y-auto">
              <ResponsiveContainer width="100%" height={Math.max(380, canalData.length * 36)}>
                <BarChart
                  data={canalData}
                  layout="vertical"
                  margin={{ left: 8, right: 24, top: 4, bottom: 4 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" horizontal={false} />
                  <XAxis
                    type="number"
                    axisLine={false}
                    tickLine={false}
                    tick={{ fill: 'rgba(255,255,255,0.4)', fontSize: 11 }}
                  />
                  <YAxis
                    type="category"
                    dataKey="name"
                    width={200}
                    axisLine={false}
                    tickLine={false}
                    tick={{ fill: 'rgba(255,255,255,0.6)', fontSize: 11, fontWeight: 500 }}
                  />
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
                    radius={[0, 6, 6, 0]}
                    barSize={20}
                    animationDuration={1500}
                  />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </motion.div>
      </motion.div>
      </>)}
    </div>
  )
}
