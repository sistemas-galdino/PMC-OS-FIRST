import { useEffect, useState } from "react"
import { supabase } from "@/lib/supabase"
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import {
  SearchIcon as Search,
  MoreHorizontalIcon as MoreHorizontal,
  PhoneIcon as Phone,
  MapPinIcon as MapPin,
  BriefcaseIcon as Briefcase,
  UserCheckIcon as UserCheck
} from "@/components/ui/icons"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Button } from "@/components/ui/button"
import { motion } from "framer-motion"

interface Client {
  id_entrada: number
  nome_cliente_formatado: string
  nome_empresa_formatado: string
  status_atual: string
  estado_uf: string
  sc: string
  telefone: string
  nicho: string
}

export default function ClientesPage() {
  const [clients, setClients] = useState<Client[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState("")
  const [scFilter, setScFilter] = useState("all")

  useEffect(() => {
    async function fetchClients() {
      const { data, error } = await supabase
        .from('entrada_clientes')
        .select('*')
        .order('nome_cliente_formatado', { ascending: true })
      
      if (data && !error) {
        setClients(data)
      }
      setLoading(false)
    }

    fetchClients()
  }, [])

  const filteredClients = clients.filter(client => {
    const matchesSearch = 
      client.nome_cliente_formatado?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      client.nome_empresa_formatado?.toLowerCase().includes(searchTerm.toLowerCase())
    
    const matchesSc = scFilter === "all" || client.sc === scFilter
    
    return matchesSearch && matchesSc
  })

  const uniqueScs = Array.from(new Set(clients.map(c => c.sc).filter(Boolean)))

  if (loading) {
    return <div className="space-y-6 animate-pulse">
      <div className="h-12 w-1/4 bg-card/40 rounded-xl" />
      <div className="h-[500px] w-full bg-card/40 rounded-2xl" />
    </div>
  }

  return (
    <div className="space-y-10 pb-10">
      <motion.div 
        initial={{ opacity: 0, x: -20 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.6 }}
        className="flex flex-col gap-3 border-l-4 border-primary pl-8 py-2"
      >
        <h1 className="text-4xl lg:text-5xl font-bold tracking-tight text-foreground">Gestão de Clientes</h1>
        <div className="flex items-center gap-3">
          <Badge variant="outline" className="bg-primary/5 border-primary/20 text-primary">PMC CRM</Badge>
          <p className="text-muted-foreground font-medium text-sm">Base estratégica de empresários do programa.</p>
        </div>
      </motion.div>

      <div className="flex flex-col md:flex-row md:items-center gap-8 bg-muted/10 p-6 rounded-2xl border border-border/50">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3.5 top-3.5 size-4 text-muted-foreground" />
          <Input
            placeholder="Buscar por cliente ou empresa..."
            className="pl-11 h-12 bg-background border-border focus-visible:border-primary/50 shadow-sm"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <div className="flex flex-col gap-3">
          <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest ml-1">Filtrar por Responsável (CS):</span>
          <div className="flex flex-wrap gap-2">
            <Button 
              variant={scFilter === 'all' ? 'default' : 'outline'} 
              size="sm" 
              className="h-9 px-4 rounded-lg font-bold text-[10px] uppercase tracking-wider transition-all duration-300"
              onClick={() => setScFilter('all')}
            >
              Todos
            </Button>
            {uniqueScs.map(sc => (
              <Button 
                key={sc}
                variant={scFilter === sc ? 'default' : 'outline'} 
                size="sm" 
                className="h-9 px-4 rounded-lg font-bold text-[10px] uppercase tracking-wider transition-all duration-300"
                onClick={() => setScFilter(sc)}
              >
                {sc}
              </Button>
            ))}
          </div>
        </div>
      </div>

      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2, duration: 0.6 }}
        className="border border-border bg-card/50 backdrop-blur-md rounded-2xl overflow-hidden shadow-xl"
      >
        <Table>
          <TableHeader className="bg-muted/30">
            <TableRow className="border-b border-border/50 hover:bg-transparent">
              <TableHead className="text-muted-foreground font-bold uppercase tracking-widest text-[10px] py-5 px-6">Cliente / Empresa</TableHead>
              <TableHead className="text-muted-foreground font-bold uppercase tracking-widest text-[10px] py-5">Status Atual</TableHead>
              <TableHead className="text-muted-foreground font-bold uppercase tracking-widest text-[10px] py-5">Localização</TableHead>
              <TableHead className="text-muted-foreground font-bold uppercase tracking-widest text-[10px] py-5">CS Responsável</TableHead>
              <TableHead className="text-muted-foreground font-bold uppercase tracking-widest text-[10px] py-5 text-right px-6">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredClients.map((client, index) => (
              <TableRow key={client.id_entrada} className="hover:bg-primary/5 border-b border-border/30 transition-colors group">
                <TableCell className="py-5 px-6">
                  <div className="flex flex-col gap-1">
                    <span className="font-bold text-sm text-foreground tracking-tight">{client.nome_cliente_formatado}</span>
                    <div className="flex items-center gap-2 text-[11px] text-muted-foreground font-medium">
                      <Briefcase className="size-3 text-primary/60" />
                      {client.nome_empresa_formatado}
                    </div>
                  </div>
                </TableCell>
                <TableCell>
                  <Badge 
                    variant="outline" 
                    className={`rounded-lg px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider ${
                      client.status_atual?.toLowerCase().includes('ativo') 
                        ? 'border-primary/30 text-primary bg-primary/10' 
                        : 'border-border text-muted-foreground bg-muted/20'
                    }`}
                  >
                    {client.status_atual || 'N/A'}
                  </Badge>
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-2 text-[12px] text-foreground font-medium">
                    <MapPin className="size-3.5 text-primary/60" />
                    {client.estado_uf || 'N/A'}
                  </div>
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-3">
                    <div className="size-8 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center text-[11px] font-bold text-primary">
                      {client.sc?.substring(0, 1) || '?'}
                    </div>
                    <span className="text-[12px] font-semibold text-foreground">{client.sc || 'Não Atribuído'}</span>
                  </div>
                </TableCell>
                <TableCell className="text-right px-6">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" className="size-9 p-0 rounded-lg hover:bg-muted">
                        <MoreHorizontal className="size-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-56 bg-card/95 backdrop-blur-xl border-border rounded-xl p-2 shadow-2xl">
                      <DropdownMenuLabel className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground px-2 py-2">Operações</DropdownMenuLabel>
                      <DropdownMenuItem className="rounded-lg text-xs font-semibold py-2 cursor-pointer focus:bg-primary/10 focus:text-primary">
                        <UserCheck className="mr-2 size-4" /> Ver Perfil Completo
                      </DropdownMenuItem>
                      <DropdownMenuItem className="rounded-lg text-xs font-semibold py-2 cursor-pointer focus:bg-primary/10 focus:text-primary">
                        <Phone className="mr-2 size-4" /> Abrir WhatsApp
                      </DropdownMenuItem>
                      <DropdownMenuSeparator className="bg-border/50" />
                      <DropdownMenuItem className="rounded-lg text-xs font-semibold py-2 text-destructive cursor-pointer focus:bg-destructive/10 focus:text-destructive">
                        Registrar Churn
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </motion.div>
    </div>
  )
}

