import { useEffect, useState } from "react"
import { supabase } from "@/lib/supabase"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  TrendingUpIcon as TrendingUp,
  UsersIcon as Users,
  TargetIcon as Target,
  CheckCircle2Icon as CheckCircle2,
  CircleIcon as Circle,
  ExternalLinkIcon as ExternalLink,
  BookOpenIcon as BookOpen,
  CalendarIcon as Calendar,
  MessageCircleIcon as MessageCircle
} from "@/components/ui/icons"
import { PieChart, Pie, Cell, ResponsiveContainer, Label } from "recharts"
import type { Session } from "@supabase/supabase-js"
import { motion } from "framer-motion"

interface ClientDashboardProps {
  session?: Session
  clientId?: string
}

function CountUp({ value, prefix = "", suffix = "" }: { value: number, prefix?: string, suffix?: string }) {
  const [displayValue, setDisplayValue] = useState(0)

  useEffect(() => {
    let start = 0
    const duration = 1500
    const increment = value / (duration / 16)
    
    const timer = setInterval(() => {
      start += increment
      if (start >= value) {
        setDisplayValue(value)
        clearInterval(timer)
      } else {
        setDisplayValue(start)
      }
    }, 16)

    return () => clearInterval(timer)
  }, [value])

  return <span>{prefix}{displayValue.toLocaleString('pt-BR', { maximumFractionDigits: 1 })}{suffix}</span>
}

export default function ClientDashboard({ session, clientId }: ClientDashboardProps) {
  const resolvedClientId = clientId || session?.user?.id
  const [data, setData] = useState<any>({
    faturamento_anual: 0,
    meta_2026: 0,
    receita_mensal: 0,
    colaboradores: 0,
    acoes: []
  })
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!resolvedClientId) return
    async function fetchClientData() {
      try {
        const { data: clientEntry, error: clientError } = await supabase
          .from('clientes_entrada_new')
          .select('id_cliente, nome_empresa_formatado')
          .eq('id_cliente', resolvedClientId)
          .maybeSingle()

        if (clientError) throw clientError

        if (clientEntry) {
          const { data: goals } = await supabase
            .from('cliente_metas')
            .select('*')
            .eq('id_cliente', clientEntry.id_cliente)
            .maybeSingle()

          const { data: meetings } = await supabase
            .from('reunioes_mentoria')
            .select('acoes_cliente')
            .eq('id_cliente', clientEntry.id_cliente)
            .order('data_reunioes', { ascending: false })
            .limit(5)

          const flatActions = meetings?.flatMap(m => Array.isArray(m.acoes_cliente) ? m.acoes_cliente : []) || []

          setData({
            empresa: clientEntry.nome_empresa_formatado,
            faturamento_anual: goals?.faturamento_anual_objetivo || 3400000,
            meta_2026: goals?.meta_2026 || 3600000,
            receita_mensal: goals?.faturamento_mensal_objetivo || 281000,
            colaboradores: goals?.colaboradores_total || 60,
            acoes: flatActions.length > 0 ? flatActions : [
              { text: "Confirmar meta de faturamento de R$ 3,6 milhões para 2026", done: false },
              { text: "Separar fontes de receita e definir metas por produto", done: false },
              { text: "Reservar dois dias para análise de planilhas e foco", done: true },
              { text: "Avaliar estratégias para redução de churn", done: false },
            ]
          })
        } else {
          setData((prev: any) => ({
            ...prev,
            empresa: "Minha Empresa",
            faturamento_anual: 3400000,
            meta_2026: 3600000,
            receita_mensal: 281000,
            colaboradores: 60,
            acoes: [
              { text: "Complete seu cadastro para ver dados reais", done: false },
              { text: "Agende sua reunião de Onboarding", done: false },
            ]
          }))
        }
      } catch (err) {
        console.error("Dashboard fetch error:", err)
      } finally {
        setLoading(false)
      }
    }

    fetchClientData()
  }, [resolvedClientId])

  const progress = Math.round((data.faturamento_anual / data.meta_2026) * 100) || 0
  const chartData = [
    { name: "Progresso", value: progress },
    { name: "Restante", value: 100 - progress },
  ]

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
    return <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
      {[1, 2, 3, 4].map(i => <Card key={i} className="h-40 animate-pulse bg-card/40" />)}
    </div>
  }

  return (
    <div className="space-y-10">
      <motion.div 
        initial={{ opacity: 0, x: -20 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.6 }}
        className="flex flex-col gap-3 border-l-4 border-primary pl-8 py-2"
      >
        <h1 className="text-4xl lg:text-5xl font-bold tracking-tight text-foreground">{data.empresa}</h1>
        <div className="flex items-center gap-3">
          <Badge variant="outline" className="bg-primary/5 border-primary/20 text-primary">PORTAL DO CLIENTE</Badge>
          <p className="text-muted-foreground font-medium text-sm">Dashboard Estratégico — PMC 2026</p>
        </div>
      </motion.div>

      <motion.div 
        variants={container}
        initial="hidden"
        animate="show"
        className="grid gap-6 md:grid-cols-2 lg:grid-cols-4"
      >
        <motion.div variants={item}>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">Faturamento Anual</CardTitle>
              <div className="bg-primary/10 p-2.5 rounded-xl">
                <TrendingUp className="size-4 text-primary" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold tracking-tight mb-2">
                <CountUp value={data.faturamento_anual / 1000000} prefix="R$ " suffix=" mi" />
              </div>
              <p className="text-[11px] font-medium text-muted-foreground">Status Atual do Negócio</p>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div variants={item}>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">Meta 2026</CardTitle>
              <div className="bg-primary/10 p-2.5 rounded-xl">
                <Target className="size-4 text-primary" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold tracking-tight mb-2">
                <CountUp value={data.meta_2026 / 1000000} prefix="R$ " suffix=" mi" />
              </div>
              <Badge variant="ghost" className="px-2 py-0.5 rounded-lg text-primary font-bold text-[10px]">
                Faltam {(100-progress).toFixed(1)}% para o objetivo
              </Badge>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div variants={item}>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">Receita Mensal</CardTitle>
              <div className="bg-primary/10 p-2.5 rounded-xl">
                <TrendingUp className="size-4 text-primary" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold tracking-tight mb-2">
                <CountUp value={data.receita_mensal / 1000} prefix="R$ " suffix=" mil" />
              </div>
              <p className="text-[11px] font-medium text-muted-foreground">Produtos & Recorrência</p>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div variants={item}>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">Colaboradores</CardTitle>
              <div className="bg-primary/10 p-2.5 rounded-xl">
                <Users className="size-4 text-primary" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold tracking-tight mb-2">
                <CountUp value={data.colaboradores} />
              </div>
              <p className="text-[11px] font-medium text-muted-foreground">Equipe Estratégica</p>
            </CardContent>
          </Card>
        </motion.div>
      </motion.div>

      <motion.div 
        variants={container}
        initial="hidden"
        animate="show"
        transition={{ delay: 0.4 }}
        className="grid gap-6 lg:grid-cols-3"
      >
        <motion.div variants={item}>
          <Card className="lg:col-span-1 min-h-[500px]">
            <CardHeader className="border-b border-border/50">
              <CardTitle className="text-base font-semibold">Progresso da Jornada</CardTitle>
            </CardHeader>
            <CardContent className="pt-10">
              <div className="h-[240px] w-full relative">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={chartData}
                      cx="50%"
                      cy="50%"
                      innerRadius={70}
                      outerRadius={90}
                      paddingAngle={4}
                      dataKey="value"
                      stroke="none"
                      animationDuration={1500}
                    >
                      <Cell fill="var(--color-primary)" className="drop-shadow-[0_0_8px_rgba(218,252,103,0.4)]" />
                      <Cell fill="var(--color-muted)" opacity={0.3} />
                      <Label
                        content={({ viewBox }) => {
                          if (viewBox && "cx" in viewBox && "cy" in viewBox) {
                            return (
                              <text x={viewBox.cx} y={viewBox.cy} textAnchor="middle" dominantBaseline="middle">
                                <tspan x={viewBox.cx} y={viewBox.cy} className="fill-foreground text-4xl font-bold">
                                  {progress}%
                                </tspan>
                                <tspan x={viewBox.cx} y={(viewBox.cy || 0) + 24} className="fill-muted-foreground text-xs font-medium">
                                  CONCLUÍDO
                                </tspan>
                              </text>
                            )
                          }
                        }}
                      />
                    </Pie>
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="text-center mt-10">
                <div className="flex items-center justify-center gap-2 mb-6">
                  <Badge className="rounded-lg bg-primary/10 text-primary border-primary/20 px-3 py-1 text-[10px] font-bold">
                    Multiplicador 30K
                  </Badge>
                  <div className="h-px w-6 bg-border" />
                  <Badge variant="outline" className="rounded-lg border-border text-muted-foreground px-3 py-1 text-[10px] font-bold">
                    Multiplicador 70K
                  </Badge>
                </div>
                <p className="text-[11px] font-medium text-muted-foreground leading-relaxed">
                  Faltam <span className="text-foreground font-bold">R$ {((data.meta_2026 - data.faturamento_anual)/1000).toLocaleString('pt-BR')} mil</span> para<br/>atingir o próximo nível de escala.
                </p>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div variants={item}>
          <Card className="lg:col-span-1 min-h-[500px]">
            <CardHeader className="border-b border-border/50 flex flex-row items-center justify-between">
              <div className="space-y-1">
                <CardTitle className="text-base font-semibold">Plano de Ação</CardTitle>
                <CardDescription className="text-[11px] font-medium">{data.acoes.filter((a: any) => a.done).length}/{data.acoes.length} Tarefas Concluídas</CardDescription>
              </div>
            </CardHeader>
            <CardContent className="pt-6 space-y-3 px-6">
              {data.acoes.map((acao: any, index: number) => (
                <motion.div 
                  key={index} 
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.6 + (index * 0.1) }}
                  className="flex items-start gap-4 p-4 rounded-xl bg-muted/20 border border-transparent hover:border-primary/20 hover:bg-muted/30 transition-all cursor-default"
                >
                  {acao.done ? (
                    <div className="bg-primary/10 rounded-full p-1 mt-0.5">
                      <CheckCircle2 className="size-4 text-primary shrink-0" />
                    </div>
                  ) : (
                    <div className="rounded-full p-1 mt-0.5">
                      <Circle className="size-4 text-muted-foreground/30 shrink-0" />
                    </div>
                  )}
                  <span className={`text-[13px] font-medium leading-snug ${acao.done ? 'line-through text-muted-foreground/60' : 'text-foreground'}`}>
                    {acao.text}
                  </span>
                </motion.div>
              ))}
              <Button variant="ghost" className="w-full text-xs font-semibold text-primary hover:text-primary hover:bg-primary/5 mt-4">
                Ver Todas as Ações
              </Button>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div variants={item}>
          <Card className="lg:col-span-1 min-h-[500px]">
            <CardHeader className="border-b border-border/50">
              <CardTitle className="text-base font-semibold">Acesso Rápido</CardTitle>
            </CardHeader>
            <CardContent className="pt-6 space-y-4 px-6">
              {[
                { label: "Área de Membros", icon: BookOpen, desc: "Aulas e Mentorias" },
                { label: "Agendar Reunião", icon: Calendar, desc: "Fale com seu Mentor" },
                { label: "Suporte", icon: MessageCircle, desc: "WhatsApp Exclusivo" }
              ].map((btn, i) => (
                <motion.div
                  key={btn.label}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.8 + (i * 0.1) }}
                >
                  <Button variant="outline" className="w-full justify-between h-[72px] rounded-xl hover:border-primary/30 hover:bg-primary/5 group">
                    <div className="flex items-center gap-4">
                      <div className="bg-primary/10 p-2.5 rounded-lg group-hover:bg-primary group-hover:text-primary-foreground transition-colors">
                        <btn.icon className="size-5" />
                      </div>
                      <div className="flex flex-col items-start gap-0.5">
                        <span className="font-bold text-sm tracking-tight">{btn.label}</span>
                        <span className="text-[11px] text-muted-foreground font-medium">{btn.desc}</span>
                      </div>
                    </div>
                    <ExternalLink className="size-4 text-muted-foreground/50 group-hover:text-primary transition-colors" />
                  </Button>
                </motion.div>
              ))}
            </CardContent>
          </Card>
        </motion.div>
      </motion.div>
    </div>
  )
}
