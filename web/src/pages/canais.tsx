import { useEffect, useState } from "react"
import { supabase } from "@/lib/supabase"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  MegaphoneIcon as Megaphone,
  PlusIcon as Plus,
  Trash2Icon as Trash2,
  Edit3Icon as Edit3,
  TrendingUpIcon as TrendingUp,
  UsersIcon as Users,
  DollarSignIcon as DollarSign,
  GlobeIcon as Globe,
  InstagramIcon as Instagram,
  MailIcon as Mail,
  LinkedinIcon as Linkedin
} from "@/components/ui/icons"
import type { Session } from "@supabase/supabase-js"
import { motion } from "framer-motion"

interface Channel {
  id: string
  nome: string
  tipo: 'Pago' | 'Orgânico'
  investimento: number
  leads_mes: number
}

export default function CanaisPage({ session: _session }: { session: Session }) {
  const [channels, setCanais] = useState<Channel[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm] = useState("")

  useEffect(() => {
    async function fetchCanais() {
      const { data, error } = await supabase
        .from('cliente_canais')
        .select('*')
        .order('nome', { ascending: true })
      
      if (data && !error) {
        setCanais(data)
      } else {
        // Dummy data for Sprint 3 demo
        setCanais([
          { id: '1', nome: 'Tráfego Pago', tipo: 'Pago', investimento: 2000, leads_mes: 150 },
          { id: '2', nome: 'Google Ads', tipo: 'Pago', investimento: 500, leads_mes: 45 },
          { id: '3', nome: 'Eventos', tipo: 'Pago', investimento: 1000, leads_mes: 20 },
          { id: '4', nome: 'Indicação', tipo: 'Orgânico', investimento: 0, leads_mes: 30 },
          { id: '5', nome: 'WhatsApp', tipo: 'Orgânico', investimento: 0, leads_mes: 80 },
          { id: '6', nome: 'Instagram', tipo: 'Orgânico', investimento: 0, leads_mes: 120 },
          { id: '7', nome: 'LinkedIn', tipo: 'Orgânico', investimento: 0, leads_mes: 15 },
          { id: '8', nome: 'Parcerias', tipo: 'Orgânico', investimento: 0, leads_mes: 10 },
        ])
      }
      setLoading(false)
    }

    fetchCanais()
  }, [])

  const filteredCanais = channels.filter(c => 
    c.nome.toLowerCase().includes(searchTerm.toLowerCase())
  )

  const totalInvestimento = channels.reduce((acc, c) => acc + c.investimento, 0)
  const canaisPagos = channels.filter(c => c.tipo === 'Pago').length
  const canaisOrganicos = channels.filter(c => c.tipo === 'Orgânico').length

  const getIcon = (name: string) => {
    const n = name.toLowerCase()
    if (n.includes('instagram')) return Instagram
    if (n.includes('google')) return Globe
    if (n.includes('whatsapp')) return MessageCircleIcon
    if (n.includes('linkedin')) return Linkedin
    if (n.includes('email')) return Mail
    return Megaphone
  }

  function MessageCircleIcon({ className }: any) {
    return <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}><path d="M7.9 20A9 9 0 1 0 4 16.1L2 22Z"/></svg>
  }

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
    <div className="space-y-10 pb-10">
      <motion.div 
        initial={{ opacity: 0, x: -20 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.6 }}
        className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between border-l-4 border-primary pl-8 py-2"
      >
        <div className="flex flex-col gap-2">
          <h1 className="text-4xl lg:text-5xl font-bold tracking-tight text-foreground">Canais de Aquisição</h1>
          <p className="text-muted-foreground font-medium text-sm">Fontes de tráfego e investimento estratégico do seu negócio.</p>
        </div>
        <Button className="h-12 gap-2 rounded-xl px-6 shadow-xl shadow-primary/10">
          <Plus className="size-5" />
          <span className="font-bold uppercase tracking-wider text-[11px]">Adicionar Canal</span>
        </Button>
      </motion.div>

      <motion.div 
        variants={container}
        initial="hidden"
        animate="show"
        className="grid gap-6 md:grid-cols-2 lg:grid-cols-4"
      >
        {[
          { title: "Canais Ativos", value: channels.length, icon: Megaphone },
          { title: "Investimento/Mês", value: `R$ ${(totalInvestimento / 1000).toFixed(1)}k`, icon: DollarSign },
          { title: "Canais Pagos", value: canaisPagos, icon: TrendingUp },
          { title: "Canais Orgânicos", value: canaisOrganicos, icon: Users },
        ].map((stat, i) => (
          <motion.div key={i} variants={item}>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">{stat.title}</CardTitle>
                <div className="bg-primary/10 p-2.5 rounded-xl">
                  <stat.icon className="size-4 text-primary" />
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold tracking-tight">{stat.value}</div>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </motion.div>

      <div className="grid gap-10 lg:grid-cols-2">
        <div className="space-y-6">
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.4 }}
            className="flex items-center gap-4 border-l-4 border-primary pl-6"
          >
            <h2 className="text-2xl font-bold tracking-tight">Canais Pagos</h2>
            <Badge variant="outline" className="bg-primary/5 border-primary/20 text-primary">
              R$ {totalInvestimento.toLocaleString('pt-BR')} investidos
            </Badge>
          </motion.div>
          
          <motion.div 
            variants={container}
            initial="hidden"
            animate="show"
            className="space-y-4"
          >
            {filteredCanais.filter(c => c.tipo === 'Pago').map(channel => {
              const Icon = getIcon(channel.nome)
              return (
                <motion.div key={channel.id} variants={item}>
                  <Card className="group hover:border-primary/30 transition-all duration-300">
                    <CardContent className="p-4 flex items-center justify-between">
                      <div className="flex items-center gap-5">
                        <div className="bg-muted/30 p-3.5 rounded-xl group-hover:bg-primary/10 transition-colors">
                          <Icon className="size-5 text-foreground group-hover:text-primary transition-colors" />
                        </div>
                        <div>
                          <h3 className="font-bold text-sm text-foreground">{channel.nome}</h3>
                          <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Tráfego Pago</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-8">
                        <div className="text-right">
                          <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-1">Custo/Mês</p>
                          <p className="font-bold text-lg text-foreground">R$ {channel.investimento.toLocaleString('pt-BR')}</p>
                        </div>
                        <div className="flex gap-1.5">
                          <Button variant="ghost" size="icon" className="size-9 rounded-lg hover:bg-muted/50">
                            <Edit3 className="size-4 text-muted-foreground" />
                          </Button>
                          <Button variant="ghost" size="icon" className="size-9 rounded-lg hover:bg-destructive/10 hover:text-destructive">
                            <Trash2 className="size-4" />
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              )
            })}
          </motion.div>
        </div>

        <div className="space-y-6">
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.6 }}
            className="flex items-center gap-4 border-l-4 border-muted pl-6"
          >
            <h2 className="text-2xl font-bold tracking-tight text-foreground">Canais Orgânicos</h2>
            <Badge variant="outline" className="bg-muted/10 border-border text-muted-foreground">
              Foco em Conteúdo & Relacionamento
            </Badge>
          </motion.div>

          <motion.div 
            variants={container}
            initial="hidden"
            animate="show"
            className="space-y-4"
          >
            {filteredCanais.filter(c => c.tipo === 'Orgânico').map(channel => {
              const Icon = getIcon(channel.nome)
              return (
                <motion.div key={channel.id} variants={item}>
                  <Card className="group hover:border-primary/30 transition-all duration-300">
                    <CardContent className="p-4 flex items-center justify-between">
                      <div className="flex items-center gap-5">
                        <div className="bg-muted/30 p-3.5 rounded-xl group-hover:bg-primary/10 transition-colors">
                          <Icon className="size-5 text-foreground group-hover:text-primary transition-colors" />
                        </div>
                        <div>
                          <h3 className="font-bold text-sm text-foreground">{channel.nome}</h3>
                          <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Tráfego Orgânico</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-8">
                        <div className="text-right">
                          <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-1">Status</p>
                          <Badge variant="ghost" className="bg-primary/5 text-primary text-[10px] font-bold uppercase tracking-widest px-2 py-0.5">Gratuito</Badge>
                        </div>
                        <div className="flex gap-1.5">
                          <Button variant="ghost" size="icon" className="size-9 rounded-lg hover:bg-muted/50">
                            <Edit3 className="size-4 text-muted-foreground" />
                          </Button>
                          <Button variant="ghost" size="icon" className="size-9 rounded-lg hover:bg-destructive/10 hover:text-destructive">
                            <Trash2 className="size-4" />
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              )
            })}
          </motion.div>
        </div>
      </div>
    </div>
  )
}

