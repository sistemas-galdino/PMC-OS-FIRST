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
  Search, 
  MoreHorizontal, 
  Phone,
  MapPin,
  Briefcase,
  UserCheck
} from "lucide-react"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Button } from "@/components/ui/button"

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
    return <div className="space-y-4 animate-pulse">
      <div className="h-10 w-full bg-card rounded" />
      {[1, 2, 3, 4, 5].map(i => <div key={i} className="h-16 w-full bg-card/50 rounded" />)}
    </div>
  }

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-2 border-b-4 border-foreground pb-6">
        <h1 className="text-4xl lg:text-5xl font-black tracking-tighter uppercase">Gestão de Clientes</h1>
        <p className="text-muted-foreground font-bold uppercase tracking-widest text-sm">Lista completa de empresários no programa.</p>
      </div>

      <div className="flex flex-col md:flex-row md:items-center gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-3 size-5 text-foreground" />
          <Input
            placeholder="Buscar por cliente ou empresa..."
            className="pl-10 h-12 rounded-none border-2 border-foreground shadow-[2px_2px_0px_0px_var(--color-foreground)] focus-visible:shadow-none focus-visible:translate-y-[2px] focus-visible:translate-x-[2px] transition-all bg-card font-bold uppercase"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <div className="flex flex-col gap-2">
          <span className="text-[10px] font-black text-foreground uppercase tracking-widest">Filtrar por CS:</span>
          <div className="flex flex-wrap gap-2">
            <Button 
              variant={scFilter === 'all' ? 'default' : 'outline'} 
              size="sm" 
              className={`h-9 text-[11px] uppercase ${scFilter !== 'all' ? 'shadow-brutal-sm' : ''}`}
              onClick={() => setScFilter('all')}
            >
              Todos
            </Button>
            {uniqueScs.map(sc => (
              <Button 
                key={sc}
                variant={scFilter === sc ? 'default' : 'outline'} 
                size="sm" 
                className={`h-9 text-[11px] uppercase ${scFilter !== sc ? 'shadow-brutal-sm' : ''}`}
                onClick={() => setScFilter(sc)}
              >
                {sc}
              </Button>
            ))}
          </div>
        </div>
      </div>

      <div className="border-2 border-foreground bg-card shadow-[4px_4px_0px_0px_var(--color-foreground)] rounded-none">
        <Table>
          <TableHeader className="bg-muted/50">
            <TableRow className="border-b-2 border-foreground hover:bg-transparent">
              <TableHead className="text-foreground font-black uppercase tracking-widest text-[11px] py-4">Cliente / Empresa</TableHead>
              <TableHead className="text-foreground font-black uppercase tracking-widest text-[11px] py-4">Status</TableHead>
              <TableHead className="text-foreground font-black uppercase tracking-widest text-[11px] py-4">Localização</TableHead>
              <TableHead className="text-foreground font-black uppercase tracking-widest text-[11px] py-4">CS Responsável</TableHead>
              <TableHead className="text-foreground font-black uppercase tracking-widest text-[11px] py-4 text-right">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredClients.map((client) => (
              <TableRow key={client.id_entrada} className="hover:bg-primary/5 border-b border-foreground/20 transition-colors group">
                <TableCell className="py-4">
                  <div className="flex flex-col gap-1">
                    <span className="font-bold text-sm tracking-tight uppercase">{client.nome_cliente_formatado}</span>
                    <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground uppercase font-bold">
                      <Briefcase className="size-3" />
                      {client.nome_empresa_formatado}
                    </div>
                  </div>
                </TableCell>
                <TableCell>
                  <Badge 
                    variant="outline" 
                    className={`rounded-none border-2 px-2 py-1 text-[10px] font-black uppercase ${
                      client.status_atual?.toLowerCase().includes('ativo') 
                        ? 'border-primary text-foreground bg-primary' 
                        : 'border-foreground text-foreground bg-muted'
                    }`}
                  >
                    {client.status_atual || 'N/A'}
                  </Badge>
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-1.5 text-[11px] text-foreground uppercase font-bold">
                    <MapPin className="size-3" />
                    {client.estado_uf || 'N/A'}
                  </div>
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-2">
                    <div className="size-8 rounded-none border-2 border-foreground bg-primary flex items-center justify-center text-[12px] font-black text-foreground shadow-brutal-sm">
                      {client.sc?.substring(0, 1) || '?'}
                    </div>
                    <span className="text-[11px] font-bold uppercase tracking-wider">{client.sc || 'Não Atribuído'}</span>
                  </div>
                </TableCell>
                <TableCell className="text-right">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="outline" className="size-9 p-0 border-2 border-foreground shadow-brutal-sm rounded-none">
                        <MoreHorizontal className="size-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="bg-card border-2 border-foreground shadow-brutal rounded-none p-2 space-y-1">
                      <DropdownMenuLabel className="text-[10px] font-black uppercase tracking-widest text-muted-foreground px-2 pb-2 border-b-2 border-foreground mb-2">Ações Rápidas</DropdownMenuLabel>
                      <DropdownMenuItem className="text-[11px] font-bold uppercase cursor-pointer focus:bg-primary focus:text-foreground">
                        <UserCheck className="mr-2 size-4" /> Ver Detalhes
                      </DropdownMenuItem>
                      <DropdownMenuItem className="text-[11px] font-bold uppercase cursor-pointer focus:bg-primary focus:text-foreground">
                        <Phone className="mr-2 size-4" /> Contato WhatsApp
                      </DropdownMenuItem>
                      <DropdownMenuSeparator className="bg-foreground/20" />
                      <DropdownMenuItem className="text-[11px] font-bold uppercase text-destructive cursor-pointer focus:bg-destructive focus:text-destructive-foreground">
                        Registrar Cancelamento
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  )
}
