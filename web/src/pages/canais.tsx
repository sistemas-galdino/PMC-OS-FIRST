import { useEffect, useState } from "react"
import { supabase } from "@/lib/supabase"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { 
  Megaphone, 
  Plus, 
  Trash2, 
  Edit3, 
  TrendingUp, 
  Users, 
  DollarSign,
  Search,
  Globe,
  Instagram,
  Mail,
  Linkedin,
  ArrowUpRight
} from "lucide-react"
import { Input } from "@/components/ui/input"
import type { Session } from "@supabase/supabase-js"

interface Channel {
  id: string
  nome: string
  tipo: 'Pago' | 'Orgânico'
  investimento: number
  leads_mes: number
}

export default function CanaisPage({ session }: { session: Session }) {
  const [channels, setCanais] = useState<Channel[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState("")

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
  const totalLeads = channels.reduce((acc, c) => acc + c.leads_mes, 0)
  const canaisPagos = channels.filter(c => c.tipo === 'Pago').length
  const canaisOrganicos = channels.filter(c => c.tipo === 'Orgânico').length

  const getIcon = (name: string) => {
    const n = name.toLowerCase()
    if (n.includes('instagram')) return Instagram
    if (n.includes('google')) return Globe
    if (n.includes('whatsapp')) return MessageCircleIcon // Handled by fallback below
    if (n.includes('linkedin')) return Linkedin
    if (n.includes('email')) return Mail
    return Megaphone
  }

  // Simple MessageCircle fallback since lucide-react might vary
  function MessageCircleIcon({ className }: any) {
    return <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}><path d="M7.9 20A9 9 0 1 0 4 16.1L2 22Z"/></svg>
  }

  if (loading) {
    return <div className="animate-pulse space-y-8">
      <div className="h-20 w-1/3 bg-card border-2 border-foreground" />
      <div className="grid gap-6 md:grid-cols-4">
        {[1, 2, 3, 4].map(i => <div key={i} className="h-32 bg-card border-2 border-foreground" />)}
      </div>
    </div>
  }

  return (
    <div className="space-y-8 pb-10">
      <div className="flex flex-col gap-4 border-b-4 border-foreground pb-6 md:flex-row md:items-end md:justify-between">
        <div className="flex flex-col gap-2">
          <h1 className="text-4xl lg:text-5xl font-black tracking-tighter uppercase">Canais de Aquisição</h1>
          <p className="text-muted-foreground font-bold uppercase tracking-widest text-sm">Fontes de tráfego e investimento do seu negócio.</p>
        </div>
        <Button className="h-12 gap-2 bg-primary text-foreground border-2 border-foreground shadow-brutal-sm hover:shadow-none hover:translate-x-1 hover:translate-y-1">
          <Plus className="size-5" />
          <span className="font-black uppercase tracking-widest text-xs">Adicionar Canal</span>
        </Button>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        <Card className="bg-card">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 border-b-2 border-foreground mb-4">
            <CardTitle className="text-[11px] font-black uppercase tracking-widest text-foreground">Canais Ativos</CardTitle>
            <div className="bg-primary p-2 border-2 border-foreground">
              <Megaphone className="size-4 text-primary-foreground" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-4xl font-black tracking-tighter">{channels.length}</div>
          </CardContent>
        </Card>

        <Card className="bg-card">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 border-b-2 border-foreground mb-4">
            <CardTitle className="text-[11px] font-black uppercase tracking-widest text-foreground">Investimento/Mês</CardTitle>
            <div className="bg-primary p-2 border-2 border-foreground">
              <DollarSign className="size-4 text-primary-foreground" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-black tracking-tighter">R$ {(totalInvestimento / 1000).toFixed(1)}k</div>
          </CardContent>
        </Card>

        <Card className="bg-card">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 border-b-2 border-foreground mb-4">
            <CardTitle className="text-[11px] font-black uppercase tracking-widest text-foreground">Canais Pagos</CardTitle>
            <div className="bg-primary p-2 border-2 border-foreground">
              <TrendingUp className="size-4 text-primary-foreground" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-4xl font-black tracking-tighter">{canaisPagos}</div>
          </CardContent>
        </Card>

        <Card className="bg-card">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 border-b-2 border-foreground mb-4">
            <CardTitle className="text-[11px] font-black uppercase tracking-widest text-foreground">Canais Orgânicos</CardTitle>
            <div className="bg-primary p-2 border-2 border-foreground">
              <Users className="size-4 text-primary-foreground" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-4xl font-black tracking-tighter">{canaisOrganicos}</div>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-8 lg:grid-cols-2">
        {/* Canais Pagos */}
        <div className="space-y-6">
          <div className="flex items-center gap-3 border-l-8 border-foreground pl-4">
            <h2 className="text-2xl font-black uppercase tracking-tighter">Canais Pagos</h2>
            <Badge variant="outline" className="rounded-none border-2 border-foreground bg-primary text-foreground font-black px-2 py-0">
              Investimento Total: R$ {totalInvestimento}
            </Badge>
          </div>
          
          <div className="space-y-4">
            {filteredCanais.filter(c => c.tipo === 'Pago').map(channel => {
              const Icon = getIcon(channel.nome)
              return (
                <Card key={channel.id} className="bg-card border-2 border-foreground shadow-brutal-sm hover:shadow-brutal transition-all group">
                  <CardContent className="p-4 flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className="bg-muted p-3 border-2 border-foreground shadow-brutal-sm group-hover:bg-primary transition-colors">
                        <Icon className="size-5" />
                      </div>
                      <div>
                        <h3 className="font-black uppercase text-sm tracking-tight">{channel.nome}</h3>
                        <p className="text-[10px] font-bold text-muted-foreground uppercase">Pago</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-8">
                      <div className="text-right">
                        <p className="text-[10px] font-black uppercase text-muted-foreground tracking-widest">Investimento</p>
                        <p className="font-black text-lg">R$ {channel.investimento}<span className="text-[10px] text-muted-foreground">/mês</span></p>
                      </div>
                      <div className="flex gap-2">
                        <Button variant="ghost" size="icon" className="size-8 border-2 border-transparent hover:border-foreground hover:bg-background">
                          <Edit3 className="size-3" />
                        </Button>
                        <Button variant="ghost" size="icon" className="size-8 border-2 border-transparent hover:border-destructive hover:bg-destructive hover:text-white">
                          <Trash2 className="size-3" />
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )
            })}
          </div>
        </div>

        {/* Canais Orgânicos */}
        <div className="space-y-6">
          <div className="flex items-center gap-3 border-l-8 border-primary pl-4">
            <h2 className="text-2xl font-black uppercase tracking-tighter">Canais Orgânicos</h2>
            <Badge variant="outline" className="rounded-none border-2 border-foreground bg-background text-foreground font-black px-2 py-0">
              Gratuito (Tempo e Esforço)
            </Badge>
          </div>

          <div className="space-y-4">
            {filteredCanais.filter(c => c.tipo === 'Orgânico').map(channel => {
              const Icon = getIcon(channel.nome)
              return (
                <Card key={channel.id} className="bg-card border-2 border-foreground shadow-brutal-sm hover:shadow-brutal transition-all group">
                  <CardContent className="p-4 flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className="bg-muted p-3 border-2 border-foreground shadow-brutal-sm group-hover:bg-primary transition-colors">
                        <Icon className="size-5" />
                      </div>
                      <div>
                        <h3 className="font-black uppercase text-sm tracking-tight">{channel.nome}</h3>
                        <p className="text-[10px] font-bold text-muted-foreground uppercase">Orgânico</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-8">
                      <div className="text-right">
                        <p className="text-[10px] font-black uppercase text-muted-foreground tracking-widest">Status</p>
                        <p className="font-black text-lg text-primary uppercase text-[12px]">Gratuito</p>
                      </div>
                      <div className="flex gap-2">
                        <Button variant="ghost" size="icon" className="size-8 border-2 border-transparent hover:border-foreground hover:bg-background">
                          <Edit3 className="size-3" />
                        </Button>
                        <Button variant="ghost" size="icon" className="size-8 border-2 border-transparent hover:border-destructive hover:bg-destructive hover:text-white">
                          <Trash2 className="size-3" />
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )
            })}
          </div>
        </div>
      </div>
    </div>
  )
}
