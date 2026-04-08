import { useEffect, useState } from "react"
import { useNavigate } from "react-router-dom"
import { supabase } from "@/lib/supabase"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetFooter,
} from "@/components/ui/sheet"
import {
  TrendingUpIcon as TrendingUp,
  UsersIcon as Users,
  TargetIcon as Target,
  CheckCircle2Icon as CheckCircle2,
  CircleIcon as Circle,
  ExternalLinkIcon as ExternalLink,
  BookOpenIcon as BookOpen,
  CalendarIcon as Calendar,
  MessageCircleIcon as MessageCircle,
  Edit3Icon as Edit3,
} from "@/components/ui/icons"
import { PieChart, Pie, Cell, ResponsiveContainer, Label as RechartsLabel } from "recharts"
import type { Session } from "@supabase/supabase-js"
import { motion } from "framer-motion"

const MULTIPLICADOR_LEVELS = ['30K', '70K', '100K', '300K', '500K', '1MM', '5MM', '10MM', '30MM', '100MM']

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
  const navigate = useNavigate()
  const resolvedClientId = clientId || session?.user?.id
  const [data, setData] = useState<any>({
    faturamento_anual: 0,
    meta_2026: 0,
    receita_mensal: 0,
    colaboradores: 0,
    acoes: []
  })
  const [loading, setLoading] = useState(true)
  const [showMetasSheet, setShowMetasSheet] = useState(false)
  const [savingMetas, setSavingMetas] = useState(false)
  const [formNivel, setFormNivel] = useState<string | null>(null)
  const [formMetas, setFormMetas] = useState({
    faturamento_anual_objetivo: 0,
    faturamento_mensal_objetivo: 0,
    meta_2026: 0,
    colaboradores_total: 0,
  })
  const [quickLinks, setQuickLinks] = useState<Record<string, string>>({})
  const [clientSc, setClientSc] = useState<string | null>(null)

  useEffect(() => {
    if (!resolvedClientId) return
    async function fetchClientData() {
      try {
        const { data: clientEntry, error: clientError } = await supabase
          .from('clientes_entrada_new')
          .select('id_cliente, nome_empresa_formatado, nivel_multiplicador, sc')
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
            .from('reunioes_mentoria_new')
            .select('acoes_cliente')
            .eq('id_cliente', clientEntry.id_cliente)
            .order('data_reunioes', { ascending: false })
            .limit(5)

          const flatActions = meetings?.flatMap(m => Array.isArray(m.acoes_cliente) ? m.acoes_cliente : []) || []

          const resolvedMetas = {
            faturamento_anual_objetivo: goals?.faturamento_anual_objetivo ?? 0,
            faturamento_mensal_objetivo: goals?.faturamento_mensal_objetivo ?? 0,
            meta_2026: goals?.meta_2026 ?? 0,
            colaboradores_total: goals?.colaboradores_total ?? 0,
          }
          setData({
            empresa: clientEntry.nome_empresa_formatado,
            faturamento_anual: resolvedMetas.faturamento_anual_objetivo,
            meta_2026: resolvedMetas.meta_2026,
            receita_mensal: resolvedMetas.faturamento_mensal_objetivo,
            colaboradores: resolvedMetas.colaboradores_total,
            acoes: flatActions,
            nivel_multiplicador: clientEntry.nivel_multiplicador ?? null,
          })
          setFormMetas(resolvedMetas)
          setFormNivel(clientEntry.nivel_multiplicador ?? null)
          setClientSc(clientEntry.sc ?? null)
        } else {
          setData((prev: any) => ({
            ...prev,
            empresa: "Minha Empresa",
            faturamento_anual: 0,
            meta_2026: 0,
            receita_mensal: 0,
            colaboradores: 0,
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

    // Fetch configurable links
    supabase
      .from('configuracoes_links')
      .select('chave, url')
      .eq('ativo', true)
      .then(({ data: links }) => {
        if (links) {
          const map: Record<string, string> = {}
          links.forEach(l => { map[l.chave] = l.url })
          setQuickLinks(map)
        }
      })
  }, [resolvedClientId])

  const suporteUrl = clientSc
    ? quickLinks[`suporte_${clientSc.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '')}`] || ''
    : ''

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
          <Button
            variant="ghost"
            size="sm"
            className="h-8 gap-1.5 rounded-lg text-xs font-bold text-muted-foreground hover:text-foreground"
            onClick={() => setShowMetasSheet(true)}
          >
            <Edit3 className="size-3.5" />
            Editar Metas
          </Button>
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
                      <RechartsLabel
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
                {(() => {
                  const currentIndex = MULTIPLICADOR_LEVELS.indexOf(data.nivel_multiplicador)
                  const nextLevel = currentIndex >= 0 && currentIndex < MULTIPLICADOR_LEVELS.length - 1
                    ? MULTIPLICADOR_LEVELS[currentIndex + 1]
                    : null
                  return (
                    <>
                      <div className="flex items-center justify-center gap-2 mb-4">
                        {data.nivel_multiplicador ? (
                          <Badge className="rounded-lg bg-primary/10 text-primary border-primary/20 px-3 py-1 text-[10px] font-bold">
                            Multiplicador {data.nivel_multiplicador}
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="rounded-lg border-dashed border-border text-muted-foreground px-3 py-1 text-[10px] font-bold">
                            Nível não definido
                          </Badge>
                        )}
                        {nextLevel && (
                          <>
                            <div className="h-px w-6 bg-border" />
                            <Badge variant="outline" className="rounded-lg border-border text-muted-foreground px-3 py-1 text-[10px] font-bold">
                              Multiplicador {nextLevel}
                            </Badge>
                          </>
                        )}
                      </div>
                    </>
                  )
                })()}
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
                { label: "Área de Membros", icon: BookOpen, desc: "Aulas e Consultorias", url: quickLinks.area_membros, internal: false },
                { label: "Agendar Reunião", icon: Calendar, desc: "Fale com seu Consultor", url: '/agendar', internal: true },
                { label: "Suporte", icon: MessageCircle, desc: "WhatsApp Exclusivo", url: suporteUrl, internal: false },
                { label: "Grupo de Avisos", icon: Users, desc: "WhatsApp do Programa", url: quickLinks.grupo_avisos, internal: false },
              ].filter(btn => btn.url).map((btn, i) => (
                <motion.div
                  key={btn.label}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.8 + (i * 0.1) }}
                >
                  <Button
                    variant="outline"
                    className="w-full justify-between h-[72px] rounded-xl hover:border-primary/30 hover:bg-primary/5 group"
                    onClick={() => btn.internal ? navigate(btn.url) : window.open(btn.url, '_blank')}
                  >
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

      <Sheet open={showMetasSheet} onOpenChange={setShowMetasSheet}>
        <SheetContent side="right" className="w-full sm:max-w-md p-0 flex flex-col bg-background border-l border-border">
          <SheetHeader className="p-6 border-b border-border">
            <SheetTitle className="text-lg font-bold text-foreground">Editar Metas</SheetTitle>
          </SheetHeader>
          <div className="flex-1 overflow-y-auto p-6 space-y-6">
            <div className="space-y-2">
              <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Faturamento Anual (R$)</Label>
              <Input
                type="number"
                className="h-11 rounded-xl"
                value={formMetas.faturamento_anual_objetivo}
                onChange={(e) => setFormMetas(prev => ({ ...prev, faturamento_anual_objetivo: Number(e.target.value) }))}
              />
            </div>
            <div className="space-y-2">
              <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Receita Mensal (R$)</Label>
              <Input
                type="number"
                className="h-11 rounded-xl"
                value={formMetas.faturamento_mensal_objetivo}
                onChange={(e) => setFormMetas(prev => ({ ...prev, faturamento_mensal_objetivo: Number(e.target.value) }))}
              />
            </div>
            <div className="space-y-2">
              <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Meta 2026 (R$)</Label>
              <Input
                type="number"
                className="h-11 rounded-xl"
                value={formMetas.meta_2026}
                onChange={(e) => setFormMetas(prev => ({ ...prev, meta_2026: Number(e.target.value) }))}
              />
            </div>
            <div className="space-y-2">
              <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Colaboradores</Label>
              <Input
                type="number"
                className="h-11 rounded-xl"
                value={formMetas.colaboradores_total}
                onChange={(e) => setFormMetas(prev => ({ ...prev, colaboradores_total: Number(e.target.value) }))}
              />
            </div>
            <div className="space-y-2">
              <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Nível Multiplicador</Label>
              <Select value={formNivel ?? ''} onValueChange={(v) => setFormNivel(v)}>
                <SelectTrigger className="h-11 rounded-xl">
                  <SelectValue placeholder="Selecione o nível" />
                </SelectTrigger>
                <SelectContent>
                  {MULTIPLICADOR_LEVELS.map((level) => (
                    <SelectItem key={level} value={level}>Multiplicador {level}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <SheetFooter className="p-6 border-t border-border">
            <Button
              disabled={savingMetas}
              className="w-full h-11 rounded-xl font-bold uppercase tracking-wider text-xs"
              onClick={async () => {
                if (!resolvedClientId) return
                setSavingMetas(true)
                const { error } = await supabase
                  .from('cliente_metas')
                  .upsert({ id_cliente: resolvedClientId, ...formMetas }, { onConflict: 'id_cliente' })
                if (!error) {
                  await supabase
                    .from('clientes_entrada_new')
                    .update({ nivel_multiplicador: formNivel })
                    .eq('id_cliente', resolvedClientId)
                }
                setSavingMetas(false)
                if (!error) {
                  setData((prev: any) => ({
                    ...prev,
                    faturamento_anual: formMetas.faturamento_anual_objetivo,
                    receita_mensal: formMetas.faturamento_mensal_objetivo,
                    meta_2026: formMetas.meta_2026,
                    colaboradores: formMetas.colaboradores_total,
                    nivel_multiplicador: formNivel,
                  }))
                  setShowMetasSheet(false)
                }
              }}
            >
              {savingMetas ? 'Salvando...' : 'Salvar Metas'}
            </Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>
    </div>
  )
}
