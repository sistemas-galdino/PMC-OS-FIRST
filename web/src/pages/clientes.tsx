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
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetFooter,
} from "@/components/ui/sheet"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  SearchIcon as Search,
  MoreHorizontalIcon as MoreHorizontal,
  PhoneIcon as Phone,
  BriefcaseIcon as Briefcase,
  UserCheckIcon as UserCheck,
  Edit3Icon as Edit3,
} from "@/components/ui/icons"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { useNavigate } from "react-router-dom"
import { motion } from "framer-motion"
import { RegistrarClienteDialog } from "@/components/clientes/registrar-cliente-dialog"

type NivelEngajamento =
  | 'cliente_novo'
  | 'ativo_alto'
  | 'ativo_medio'
  | 'desengajado'
  | 'sem_onboarding'
  | 'cancelado'
  | 'congelado'

interface Client {
  id_entrada: number
  id_cliente: string
  codigo_cliente: number | null
  nome_cliente_formatado: string
  nome_empresa_formatado: string
  status_atual: string
  estado_uf: string
  sc: string
  telefone: string
  nicho: string
  nivel_engajamento: NivelEngajamento | null
  tem_crm: boolean
  tem_sdr: boolean
  observacoes_cs: string | null
}

const STATUS_OPTIONS = [
  'Ativo no Programa',
  'Aguardando Início',
  'Pendente de Onboarding',
  'Cliente Cancelado',
  'Desistência de Compra',
]

const ENGAGEMENT_LABELS: Record<NivelEngajamento, string> = {
  cliente_novo: 'Cliente Novo',
  ativo_alto: 'Ativo Alto',
  ativo_medio: 'Ativo Médio',
  desengajado: 'Desengajado',
  sem_onboarding: 'Sem Onboarding',
  cancelado: 'Cancelado',
  congelado: 'Congelado',
}

const ENGAGEMENT_CLASSES: Record<NivelEngajamento, string> = {
  ativo_alto: 'border-emerald-500/30 text-emerald-400 bg-emerald-500/10',
  ativo_medio: 'border-yellow-500/30 text-yellow-400 bg-yellow-500/10',
  cliente_novo: 'border-blue-500/30 text-blue-400 bg-blue-500/10',
  desengajado: 'border-orange-500/30 text-orange-400 bg-orange-500/10',
  sem_onboarding: 'border-zinc-500/30 text-zinc-400 bg-zinc-500/10',
  cancelado: 'border-red-500/30 text-red-400 bg-red-500/10',
  congelado: 'border-slate-500/30 text-slate-400 bg-slate-500/10',
}

function EngagementBadge({ value }: { value: NivelEngajamento | null }) {
  if (!value) return <span className="text-muted-foreground text-xs">—</span>
  return (
    <Badge
      variant="outline"
      className={`rounded-lg px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider ${ENGAGEMENT_CLASSES[value]}`}
    >
      {ENGAGEMENT_LABELS[value]}
    </Badge>
  )
}

function Toggle({ checked, onChange }: { checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      type="button"
      onClick={() => onChange(!checked)}
      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors duration-200 focus:outline-none ${
        checked ? 'bg-primary' : 'bg-muted'
      }`}
    >
      <span
        className={`inline-block size-4 transform rounded-full bg-white shadow transition-transform duration-200 ${
          checked ? 'translate-x-6' : 'translate-x-1'
        }`}
      />
    </button>
  )
}

export default function ClientesPage() {
  const navigate = useNavigate()
  const [clients, setClients] = useState<Client[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState("")
  const [scFilter, setScFilter] = useState("all")
  const [editClient, setEditClient] = useState<Client | null>(null)
  const [saving, setSaving] = useState(false)

  const [formStatus, setFormStatus] = useState("")
  const [formSc, setFormSc] = useState("")
  const [formEngajamento, setFormEngajamento] = useState<NivelEngajamento | "">("")
  const [formCrm, setFormCrm] = useState(false)
  const [formSdr, setFormSdr] = useState(false)
  const [formObs, setFormObs] = useState("")
  const [showRegistrar, setShowRegistrar] = useState(false)

  useEffect(() => {
    async function fetchClients() {
      const { data, error } = await supabase
        .from('clientes_entrada_new')
        .select('*')
        .order('nome_cliente_formatado', { ascending: true })

      if (data && !error) {
        setClients(data)
      }
      setLoading(false)
    }

    fetchClients()
  }, [])

  function openEdit(client: Client) {
    setEditClient(client)
    setFormStatus(client.status_atual ?? "")
    setFormSc(client.sc ?? "")
    setFormEngajamento(client.nivel_engajamento ?? "")
    setFormCrm(client.tem_crm ?? false)
    setFormSdr(client.tem_sdr ?? false)
    setFormObs(client.observacoes_cs ?? "")
  }

  async function handleSave() {
    if (!editClient) return
    setSaving(true)
    const { error } = await supabase
      .from('clientes_entrada_new')
      .update({
        status_atual: formStatus || null,
        sc: formSc || null,
        nivel_engajamento: formEngajamento || null,
        tem_crm: formCrm,
        tem_sdr: formSdr,
        observacoes_cs: formObs || null,
      })
      .eq('id_entrada', editClient.id_entrada)

    if (!error) {
      setClients(prev => prev.map(c =>
        c.id_entrada === editClient.id_entrada
          ? { ...c, status_atual: formStatus, sc: formSc, nivel_engajamento: (formEngajamento as NivelEngajamento) || null, tem_crm: formCrm, tem_sdr: formSdr, observacoes_cs: formObs || null }
          : c
      ))
      setEditClient(null)
    }
    setSaving(false)
  }

  const filteredClients = clients.filter(client => {
    const term = searchTerm.toLowerCase()
    const matchesSearch =
      client.nome_cliente_formatado?.toLowerCase().includes(term) ||
      client.nome_empresa_formatado?.toLowerCase().includes(term) ||
      (client.codigo_cliente != null && String(client.codigo_cliente).includes(searchTerm))

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
        <Button
          onClick={() => setShowRegistrar(true)}
          size="sm"
          className="h-9 px-4 text-xs font-bold shadow-lg shadow-primary/20"
        >
          + Registrar Novo Cliente
        </Button>
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
              <TableHead className="text-muted-foreground font-bold uppercase tracking-widest text-[10px] py-5 px-6">Código</TableHead>
              <TableHead className="text-muted-foreground font-bold uppercase tracking-widest text-[10px] py-5 px-6">Cliente / Empresa</TableHead>
              <TableHead className="text-muted-foreground font-bold uppercase tracking-widest text-[10px] py-5">Status Atual</TableHead>
              <TableHead className="text-muted-foreground font-bold uppercase tracking-widest text-[10px] py-5">CS Responsável</TableHead>
              <TableHead className="text-muted-foreground font-bold uppercase tracking-widest text-[10px] py-5">Engajamento</TableHead>
              <TableHead className="text-muted-foreground font-bold uppercase tracking-widest text-[10px] py-5">CRM</TableHead>
              <TableHead className="text-muted-foreground font-bold uppercase tracking-widest text-[10px] py-5">SDR</TableHead>
              <TableHead className="text-muted-foreground font-bold uppercase tracking-widest text-[10px] py-5 text-right px-6">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredClients.map((client) => (
              <TableRow key={client.id_entrada} className="hover:bg-primary/5 border-b border-border/30 transition-colors group">
                <TableCell className="py-5 px-6">
                  <span className="text-xs font-mono text-muted-foreground">
                    {client.codigo_cliente ?? '—'}
                  </span>
                </TableCell>
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
                  <div className="flex items-center gap-3">
                    <div className="size-8 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center text-[11px] font-bold text-primary">
                      {client.sc?.substring(0, 1) || '?'}
                    </div>
                    <span className="text-[12px] font-semibold text-foreground">{client.sc || 'Não Atribuído'}</span>
                  </div>
                </TableCell>
                <TableCell>
                  <EngagementBadge value={client.nivel_engajamento} />
                </TableCell>
                <TableCell>
                  <span className={`text-[11px] font-bold ${client.tem_crm ? 'text-emerald-400' : 'text-muted-foreground'}`}>
                    {client.tem_crm ? 'Sim' : 'Não'}
                  </span>
                </TableCell>
                <TableCell>
                  <span className={`text-[11px] font-bold ${client.tem_sdr ? 'text-emerald-400' : 'text-muted-foreground'}`}>
                    {client.tem_sdr ? 'Sim' : 'Não'}
                  </span>
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
                      <DropdownMenuItem
                        className="rounded-lg text-xs font-semibold py-2 cursor-pointer focus:bg-primary/10 focus:text-primary"
                        onClick={() => navigate('/cliente/' + client.id_cliente)}
                      >
                        <UserCheck className="mr-2 size-4" /> Ver Perfil Completo
                      </DropdownMenuItem>
                      <DropdownMenuItem className="rounded-lg text-xs font-semibold py-2 cursor-pointer focus:bg-primary/10 focus:text-primary">
                        <Phone className="mr-2 size-4" /> Abrir WhatsApp
                      </DropdownMenuItem>
                      <DropdownMenuSeparator className="bg-border/50" />
                      <DropdownMenuItem
                        className="rounded-lg text-xs font-semibold py-2 cursor-pointer focus:bg-primary/10 focus:text-primary"
                        onClick={() => openEdit(client)}
                      >
                        <Edit3 className="mr-2 size-4" /> Editar Engajamento (CS)
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

      <Sheet open={!!editClient} onOpenChange={(open) => { if (!open) setEditClient(null) }}>
        <SheetContent side="right" className="w-full sm:max-w-md p-0 flex flex-col bg-background border-l border-border">
          <SheetHeader className="p-6 border-b border-border">
            <SheetTitle className="text-lg font-bold text-foreground">Editar Engajamento (CS)</SheetTitle>
            {editClient && (
              <div className="mt-1">
                <p className="font-semibold text-sm text-foreground">{editClient.nome_cliente_formatado}</p>
                <p className="text-xs text-muted-foreground">{editClient.nome_empresa_formatado}</p>
              </div>
            )}
          </SheetHeader>

          <div className="flex-1 overflow-y-auto p-6 space-y-6">
            <div className="space-y-2">
              <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Status Atual</Label>
              <Select value={formStatus} onValueChange={setFormStatus}>
                <SelectTrigger className="h-11 rounded-xl border-border bg-background">
                  <SelectValue placeholder="Selecionar..." />
                </SelectTrigger>
                <SelectContent>
                  {STATUS_OPTIONS.map(s => (
                    <SelectItem key={s} value={s}>{s}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">CS Responsável</Label>
              <Select value={formSc} onValueChange={setFormSc}>
                <SelectTrigger className="h-11 rounded-xl border-border bg-background">
                  <SelectValue placeholder="Selecionar..." />
                </SelectTrigger>
                <SelectContent>
                  {uniqueScs.map(sc => (
                    <SelectItem key={sc} value={sc}>{sc}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Nível de Engajamento</Label>
              <Select value={formEngajamento} onValueChange={(v) => setFormEngajamento(v as NivelEngajamento)}>
                <SelectTrigger className="h-11 rounded-xl border-border bg-background">
                  <SelectValue placeholder="Selecionar..." />
                </SelectTrigger>
                <SelectContent>
                  {(Object.entries(ENGAGEMENT_LABELS) as [NivelEngajamento, string][]).map(([value, label]) => (
                    <SelectItem key={value} value={value}>{label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-4">
              <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Produtos Black</Label>
              <div className="flex items-center justify-between bg-muted/20 rounded-xl px-4 py-3 border border-border/50">
                <div>
                  <p className="text-sm font-semibold text-foreground">Black CRM</p>
                  <p className="text-[11px] text-muted-foreground">Tem conta ativa na plataforma</p>
                </div>
                <Toggle checked={formCrm} onChange={setFormCrm} />
              </div>
              <div className="flex items-center justify-between bg-muted/20 rounded-xl px-4 py-3 border border-border/50">
                <div>
                  <p className="text-sm font-semibold text-foreground">Black SDR</p>
                  <p className="text-[11px] text-muted-foreground">Tem conta ativa na plataforma</p>
                </div>
                <Toggle checked={formSdr} onChange={setFormSdr} />
              </div>
            </div>

            <div className="space-y-2">
              <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Observações</Label>
              <textarea
                value={formObs}
                onChange={(e) => setFormObs(e.target.value)}
                placeholder="WhatsApp, riscos, notas gerais..."
                rows={5}
                className="w-full rounded-xl border border-border bg-background px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary/50 resize-none"
              />
            </div>
          </div>

          <SheetFooter className="p-6 border-t border-border">
            <Button
              onClick={handleSave}
              disabled={saving}
              className="w-full h-11 rounded-xl font-bold uppercase tracking-wider text-xs"
            >
              {saving ? 'Salvando...' : 'Salvar Alterações'}
            </Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>

      <RegistrarClienteDialog
        open={showRegistrar}
        onOpenChange={setShowRegistrar}
        onSuccess={() => {
          // Refresh client list
          supabase
            .from('clientes_entrada_new')
            .select('*')
            .order('nome_cliente_formatado', { ascending: true })
            .then(({ data }) => {
              if (data) setClients(data)
            })
        }}
      />
    </div>
  )
}
