import { useEffect, useState } from "react"
import { supabase } from "@/lib/supabase"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { 
  TrendingUp, 
  Users, 
  Target, 
  CheckCircle2, 
  Circle, 
  ExternalLink,
  BookOpen,
  Calendar,
  MessageCircle
} from "lucide-react"
import { PieChart, Pie, Cell, ResponsiveContainer, Label } from "recharts"
import type { Session } from "@supabase/supabase-js"

interface ClientDashboardProps {
  session: Session
}

export default function ClientDashboard({ session }: ClientDashboardProps) {
  const [data, setData] = useState<any>({
    faturamento_anual: 0,
    meta_2026: 0,
    receita_mensal: 0,
    colaboradores: 0,
    acoes: []
  })
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function fetchClientData() {
      try {
        // 1. Get client ID from their email/auth
        const { data: clientEntry, error: clientError } = await supabase
          .from('entrada_clientes')
          .select('id_cliente, nome_empresa_formatado')
          .eq('id_cliente', session.user.id)
          .maybeSingle()

        if (clientError) throw clientError

        if (clientEntry) {
          // 2. Fetch goals
          const { data: goals } = await supabase
            .from('cliente_metas')
            .select('*')
            .eq('id_cliente', clientEntry.id_cliente)
            .maybeSingle()

          // 3. Fetch actions from meetings
          const { data: meetings } = await supabase
            .from('reunioes_mentoria')
            .select('acoes_cliente')
            .eq('id_cliente', clientEntry.id_cliente)
            .order('data_reuniao', { ascending: false })
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
          // Fallback data if user is not in entrada_clientes yet
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
  }, [session.user.id])

  const progress = Math.round((data.faturamento_anual / data.meta_2026) * 100) || 0
  const chartData = [
    { name: "Progresso", value: progress },
    { name: "Restante", value: 100 - progress },
  ]

  if (loading) {
    return <div className="animate-pulse space-y-8">
      <div className="h-20 w-1/3 bg-card border-2 border-foreground" />
      <div className="grid gap-6 md:grid-cols-4">
        {[1, 2, 3, 4].map(i => <div key={i} className="h-32 bg-card border-2 border-foreground" />)}
      </div>
    </div>
  }

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-2 border-b-4 border-foreground pb-6">
        <h1 className="text-4xl lg:text-5xl font-black tracking-tighter uppercase">Dashboard</h1>
        <p className="text-muted-foreground font-bold uppercase tracking-widest text-sm">Visão Geral do Programa Multiplicador de Crescimento</p>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        <Card className="bg-card">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 border-b-2 border-foreground mb-4">
            <CardTitle className="text-[11px] font-black uppercase tracking-widest text-foreground">Faturamento Anual</CardTitle>
            <div className="bg-primary p-2 border-2 border-foreground">
              <TrendingUp className="size-4 text-primary-foreground" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-black tracking-tighter mb-1">
              R$ {(data.faturamento_anual / 1000000).toFixed(1)} mi
            </div>
            <p className="text-[10px] uppercase font-bold text-muted-foreground">Atual</p>
          </CardContent>
        </Card>

        <Card className="bg-card">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 border-b-2 border-foreground mb-4">
            <CardTitle className="text-[11px] font-black uppercase tracking-widest text-foreground">Meta 2026</CardTitle>
            <div className="bg-primary p-2 border-2 border-foreground">
              <Target className="size-4 text-primary-foreground" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-black tracking-tighter mb-1">
              R$ {(data.meta_2026 / 1000000).toFixed(1)} mi
            </div>
            <Badge variant="outline" className="rounded-none border-2 border-primary text-primary bg-primary/10 text-[9px] font-black uppercase">
              Objetivo +{(100-progress).toFixed(1)}%
            </Badge>
          </CardContent>
        </Card>

        <Card className="bg-card">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 border-b-2 border-foreground mb-4">
            <CardTitle className="text-[11px] font-black uppercase tracking-widest text-foreground">Receita Mensal</CardTitle>
            <div className="bg-primary p-2 border-2 border-foreground">
              <TrendingUp className="size-4 text-primary-foreground" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-black tracking-tighter mb-1">
              R$ {(data.receita_mensal / 1000).toFixed(0)} mil
            </div>
            <p className="text-[10px] uppercase font-bold text-muted-foreground">Produtos Ativos</p>
          </CardContent>
        </Card>

        <Card className="bg-card">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 border-b-2 border-foreground mb-4">
            <CardTitle className="text-[11px] font-black uppercase tracking-widest text-foreground">Colaboradores</CardTitle>
            <div className="bg-primary p-2 border-2 border-foreground">
              <Users className="size-4 text-primary-foreground" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-black tracking-tighter mb-1">{data.colaboradores}</div>
            <p className="text-[10px] uppercase font-bold text-muted-foreground">2 em gestão</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="bg-card lg:col-span-1">
          <CardHeader className="border-b-2 border-foreground">
            <CardTitle className="uppercase tracking-widest">Progresso da Meta</CardTitle>
          </CardHeader>
          <CardContent className="pt-6">
            <div className="h-[240px] w-full relative">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={chartData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={80}
                    paddingAngle={0}
                    dataKey="value"
                    stroke="none"
                  >
                    <Cell fill="var(--color-primary)" />
                    <Cell fill="var(--color-muted)" />
                    <Label
                      value={`${progress}%`}
                      position="center"
                      className="fill-foreground font-black text-4xl"
                    />
                  </Pie>
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="text-center mt-4">
              <p className="text-[11px] font-bold uppercase text-muted-foreground">
                Faltam <span className="text-foreground">R$ {((data.meta_2026 - data.faturamento_anual)/1000).toFixed(0)} mil</span> para a meta
              </p>
              <div className="flex items-center justify-center gap-2 mt-6">
                <Badge className="rounded-none border-2 border-foreground bg-primary text-foreground font-black uppercase text-[10px] py-1">
                  Multiplicador 30K
                </Badge>
                <div className="h-[2px] w-8 bg-foreground" />
                <Badge variant="outline" className="rounded-none border-2 border-foreground font-black uppercase text-[10px] py-1">
                  Multiplicador 70K
                </Badge>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-card lg:col-span-1">
          <CardHeader className="border-b-2 border-foreground flex flex-row items-center justify-between">
            <div className="space-y-1">
              <CardTitle className="uppercase tracking-widest">Plano de Ação</CardTitle>
              <CardDescription className="text-[10px] font-bold uppercase">{data.acoes.filter((a: any) => a.done).length}/{data.acoes.length} Concluídas</CardDescription>
            </div>
          </CardHeader>
          <CardContent className="pt-6 space-y-3">
            {data.acoes.map((acao: any, index: number) => (
              <div key={index} className="flex items-start gap-3 p-3 border-2 border-foreground bg-muted/10 transition-all hover:bg-primary/5">
                {acao.done ? (
                  <CheckCircle2 className="size-5 text-primary shrink-0 mt-0.5" />
                ) : (
                  <Circle className="size-5 text-foreground/20 shrink-0 mt-0.5" />
                )}
                <span className={`text-[12px] font-bold uppercase leading-tight ${acao.done ? 'line-through text-muted-foreground' : ''}`}>
                  {acao.text}
                </span>
              </div>
            ))}
            <Button variant="link" className="w-full text-[10px] font-black uppercase tracking-widest mt-4">
              Ver todas as ações →
            </Button>
          </CardContent>
        </Card>

        <Card className="bg-card lg:col-span-1">
          <CardHeader className="border-b-2 border-foreground">
            <CardTitle className="uppercase tracking-widest">Ações Rápidas</CardTitle>
          </CardHeader>
          <CardContent className="pt-6 space-y-4">
            <Button variant="outline" className="w-full justify-between h-14 border-2 border-foreground shadow-brutal-sm hover:shadow-none hover:translate-x-1 hover:translate-y-1">
              <div className="flex items-center gap-3">
                <div className="bg-foreground p-1.5 border border-foreground">
                  <BookOpen className="size-4 text-background" />
                </div>
                <span className="font-black text-xs uppercase tracking-widest">Área de Membros</span>
              </div>
              <ExternalLink className="size-4 opacity-50" />
            </Button>
            
            <Button variant="outline" className="w-full justify-between h-14 border-2 border-foreground shadow-brutal-sm hover:shadow-none hover:translate-x-1 hover:translate-y-1">
              <div className="flex items-center gap-3">
                <div className="bg-foreground p-1.5 border border-foreground">
                  <Calendar className="size-4 text-background" />
                </div>
                <span className="font-black text-xs uppercase tracking-widest">Agendar Reunião</span>
              </div>
              <ExternalLink className="size-4 opacity-50" />
            </Button>

            <Button variant="outline" className="w-full justify-between h-14 border-2 border-foreground shadow-brutal-sm hover:shadow-none hover:translate-x-1 hover:translate-y-1">
              <div className="flex items-center gap-3">
                <div className="bg-foreground p-1.5 border border-foreground">
                  <MessageCircle className="size-4 text-background" />
                </div>
                <span className="font-black text-xs uppercase tracking-widest">Suporte</span>
              </div>
              <ExternalLink className="size-4 opacity-50" />
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
