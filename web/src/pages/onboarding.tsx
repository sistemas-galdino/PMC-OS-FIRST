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
  BriefcaseIcon as Briefcase,
} from "@/components/ui/icons"
import { motion } from "framer-motion"

interface Client {
  id_entrada: number
  nome_cliente_formatado: string
  nome_empresa_formatado: string
  status_atual: string
  sc: string
}

export default function OnboardingPage() {
  const [clients, setClients] = useState<Client[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState("")

  useEffect(() => {
    async function fetchClients() {
      const { data, error } = await supabase
        .from('clientes_entrada_new')
        .select('id_entrada, nome_cliente_formatado, nome_empresa_formatado, status_atual, sc')
        .order('nome_cliente_formatado', { ascending: true })

      if (data && !error) {
        setClients(data.filter(c => c.status_atual === 'Pendente de Onboarding'))
      }
      setLoading(false)
    }

    fetchClients()
  }, [])

  const filteredClients = clients.filter(client =>
    client.nome_cliente_formatado?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    client.nome_empresa_formatado?.toLowerCase().includes(searchTerm.toLowerCase())
  )

  if (loading) {
    return (
      <div className="space-y-6 animate-pulse">
        <div className="h-12 w-1/4 bg-card/40 rounded-xl" />
        <div className="h-[500px] w-full bg-card/40 rounded-2xl" />
      </div>
    )
  }

  return (
    <div className="space-y-10 pb-10">
      <motion.div
        initial={{ opacity: 0, x: -20 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.6 }}
        className="flex flex-col gap-3 border-l-4 border-primary pl-8 py-2"
      >
        <h1 className="text-4xl lg:text-5xl font-bold tracking-tight text-foreground">Pendentes Onboarding</h1>
        <div className="flex items-center gap-3">
          <Badge variant="outline" className="bg-primary/5 border-primary/20 text-primary">PMC CRM</Badge>
          <p className="text-muted-foreground font-medium text-sm">Clientes aguardando conclusão do processo de onboarding.</p>
        </div>
      </motion.div>

      <div className="flex items-center bg-muted/10 p-6 rounded-2xl border border-border/50">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3.5 top-3.5 size-4 text-muted-foreground" />
          <Input
            placeholder="Buscar por cliente ou empresa..."
            className="pl-11 h-12 bg-background border-border focus-visible:border-primary/50 shadow-sm"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
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
              <TableHead className="text-muted-foreground font-bold uppercase tracking-widest text-[10px] py-5">Status</TableHead>
              <TableHead className="text-muted-foreground font-bold uppercase tracking-widest text-[10px] py-5">CS Responsável</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredClients.length === 0 ? (
              <TableRow>
                <TableCell colSpan={3} className="text-center py-16 text-muted-foreground font-medium">
                  Nenhum cliente pendente de onboarding.
                </TableCell>
              </TableRow>
            ) : (
              filteredClients.map((client) => (
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
                      className="rounded-lg px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider border-yellow-500/30 text-yellow-400 bg-yellow-500/10"
                    >
                      {client.status_atual}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <div className="size-8 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center text-[11px] font-bold text-primary">
                        {client.sc?.substring(0, 1) || '?'}
                      </div>
                      <span className="text-[12px] font-semibold text-foreground">{client.sc || 'Não Atribuído'}</span>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </motion.div>
    </div>
  )
}
