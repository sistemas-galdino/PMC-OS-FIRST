import React, { useEffect, useRef, useState } from "react"
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
  PlusIcon as Plus,
  FilterIcon,
  XIcon,
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
import { motion, AnimatePresence } from "framer-motion"
import { Checkbox } from "@/components/ui/checkbox"
import { ComboboxInput } from "@/components/ui/combobox-input"
import { RegistrarClienteDialog } from "@/components/clientes/registrar-cliente-dialog"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"

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
  observacoes_cs: string | null
  produto: string | null
  canal_de_venda: string | null
  unidade_treinamento: string | null
  mes_treinamento: string | null
  ano_treinamento: number | null
  email: string | null
}

const STATUS_OPTIONS = [
  'Ativo no Programa',
  'Aguardando Início',
  'Onboarding marcado',
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

const MESES = [
  'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro',
]
const currentYear = new Date().getFullYear()
const ANO_OPTIONS = [currentYear - 1, currentYear, currentYear + 1]

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

function BulkField({ label, enabled, onToggle, children }: { label: string; enabled: boolean; onToggle: () => void; children: React.ReactNode }) {
  return (
    <div className={`space-y-2 rounded-xl p-4 border transition-colors ${enabled ? 'border-primary/30 bg-primary/5' : 'border-border/50 bg-muted/10 opacity-60'}`}>
      <div className="flex items-center gap-3">
        <Checkbox checked={enabled} onCheckedChange={onToggle} />
        <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">{label}</span>
      </div>
      {enabled && <div className="mt-3">{children}</div>}
    </div>
  )
}

export default function ClientesPage() {
  const navigate = useNavigate()
  const [clients, setClients] = useState<Client[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState("")
  const [filters, setFilters] = useState<Record<string, string>>({})
  const [filterMenuOpen, setFilterMenuOpen] = useState(false)
  const [filterCategory, setFilterCategory] = useState<string | null>(null)
  const [filterSearch, setFilterSearch] = useState("")
  const [sortOrder, setSortOrder] = useState<'az' | 'recent'>('az')
  const filterRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (filterRef.current && !filterRef.current.contains(e.target as Node)) {
        setFilterMenuOpen(false)
      }
    }
    document.addEventListener("mousedown", handleClickOutside)
    return () => document.removeEventListener("mousedown", handleClickOutside)
  }, [])
  const [editClient, setEditClient] = useState<Client | null>(null)
  const [saving, setSaving] = useState(false)

  const [formNomeCliente, setFormNomeCliente] = useState("")
  const [formNomeEmpresa, setFormNomeEmpresa] = useState("")
  const [formStatus, setFormStatus] = useState("")
  const [formSc, setFormSc] = useState("")
  const [formEngajamento, setFormEngajamento] = useState<NivelEngajamento | "">("")
  const [formCrm, setFormCrm] = useState(false)

  const [formObs, setFormObs] = useState("")
  const [formEmail, setFormEmail] = useState("")
  const [resending, setResending] = useState(false)
  const [resendResult, setResendResult] = useState<{ type: 'ok' | 'err'; msg: string } | null>(null)
  const [hasAuthUser, setHasAuthUser] = useState(false)
  const [showRegistrar, setShowRegistrar] = useState(false)

  // Bulk edit state
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set())
  const [bulkEditOpen, setBulkEditOpen] = useState(false)
  const [bulkSaving, setBulkSaving] = useState(false)
  const [bulkStatus, setBulkStatus] = useState<string | null>(null)
  const [bulkSc, setBulkSc] = useState<string | null>(null)
  const [bulkEngajamento, setBulkEngajamento] = useState<NivelEngajamento | null>(null)
  const [bulkCrm, setBulkCrm] = useState<boolean | null>(null)

  const [bulkProduto, setBulkProduto] = useState<string | null>(null)
  const [bulkCanal, setBulkCanal] = useState<string | null>(null)
  const [bulkUnidade, setBulkUnidade] = useState<string | null>(null)
  const [bulkMes, setBulkMes] = useState<string | null>(null)
  const [bulkAno, setBulkAno] = useState<string | null>(null)

  // Delete confirmation
  const [deleteClient, setDeleteClient] = useState<Client | null>(null)
  const [deleting, setDeleting] = useState(false)

  async function handleDeleteClient() {
    if (!deleteClient) return
    setDeleting(true)
    const { error } = await supabase
      .from('clientes_entrada_new')
      .delete()
      .eq('id_entrada', deleteClient.id_entrada)
    if (!error) {
      setClients(prev => prev.filter(c => c.id_entrada !== deleteClient.id_entrada))
    }
    setDeleting(false)
    setDeleteClient(null)
  }

  useEffect(() => {
    async function fetchClients() {
      const [{ data: entradaData, error: entradaErr }, { data: emailsData }] = await Promise.all([
        supabase
          .from('clientes_entrada_new')
          .select('*')
          .order('nome_cliente_formatado', { ascending: true }),
        supabase
          .from('clientes_formulario')
          .select('id_cliente, email'),
      ])

      if (entradaData && !entradaErr) {
        const emailByCliente = new Map<string, string | null>(
          (emailsData ?? []).map(r => [r.id_cliente as string, (r.email as string | null) ?? null])
        )
        const merged: Client[] = entradaData.map((c: any) => ({
          ...c,
          email: emailByCliente.get(c.id_cliente) ?? null,
        }))
        setClients(merged)
      }
      setLoading(false)
    }

    fetchClients()
  }, [])

  async function openEdit(client: Client) {
    setEditClient(client)
    setFormNomeCliente(client.nome_cliente_formatado ?? "")
    setFormNomeEmpresa(client.nome_empresa_formatado ?? "")
    setFormStatus(client.status_atual ?? "")
    setFormSc(client.sc ?? "")
    setFormEngajamento(client.nivel_engajamento ?? "")
    setFormCrm(client.tem_crm ?? false)
    setFormObs(client.observacoes_cs ?? "")
    setFormEmail(client.email ?? "")
    setResendResult(null)
    setHasAuthUser(false)
    const { data: hasUser } = await supabase.rpc('has_auth_user', { p_id_cliente: client.id_cliente })
    setHasAuthUser(!!hasUser)
  }

  async function handleSave() {
    if (!editClient) return
    setSaving(true)
    const { error } = await supabase
      .from('clientes_entrada_new')
      .update({
        nome_cliente_formatado: formNomeCliente || null,
        nome_empresa_formatado: formNomeEmpresa || null,
        status_atual: formStatus || null,
        sc: formSc || null,
        nivel_engajamento: formEngajamento || null,
        tem_crm: formCrm,
        observacoes_cs: formObs || null,
      })
      .eq('id_entrada', editClient.id_entrada)

    const emailTrim = formEmail.trim()
    const emailChanged = (editClient.email ?? "") !== emailTrim
    if (!error && emailChanged) {
      await supabase.from('clientes_formulario').upsert({
        id_cliente: editClient.id_cliente,
        email: emailTrim || null,
        codigo_cliente: editClient.codigo_cliente,
        nome: formNomeCliente || null,
        empresa_nome: formNomeEmpresa || null,
      }, { onConflict: 'id_cliente' })
    }

    if (!error) {
      setClients(prev => prev.map(c =>
        c.id_entrada === editClient.id_entrada
          ? { ...c, nome_cliente_formatado: formNomeCliente, nome_empresa_formatado: formNomeEmpresa, status_atual: formStatus, sc: formSc, nivel_engajamento: (formEngajamento as NivelEngajamento) || null, tem_crm: formCrm, observacoes_cs: formObs || null, email: emailTrim || null }
          : c
      ))
      setEditClient(null)
    }
    setSaving(false)
  }

  async function handleResend() {
    if (!editClient || !formEmail.trim()) return
    setResending(true)
    setResendResult(null)
    try {
      const { data: { session } } = await supabase.auth.getSession()
      const accessToken = session?.access_token
      if (!accessToken) throw new Error('Sessão expirada. Faça login novamente.')

      const resp = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/invite-legacy`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${accessToken}`,
            'apikey': import.meta.env.VITE_SUPABASE_ANON_KEY,
          },
          body: JSON.stringify({
            id_cliente: editClient.id_cliente,
            email_destino: formEmail.trim(),
            app_url: window.location.origin,
          }),
        }
      )
      const data = await resp.json()
      if (!resp.ok) throw new Error(data.error || `Erro ${resp.status}`)

      setResendResult({ type: 'ok', msg: data.message || 'Link enviado com sucesso' })
      setHasAuthUser(true)
      const emailTrim = formEmail.trim()
      setClients(prev => prev.map(c =>
        c.id_cliente === editClient.id_cliente ? { ...c, email: emailTrim } : c
      ))
    } catch (e: any) {
      setResendResult({ type: 'err', msg: e.message || 'Erro ao enviar link' })
    } finally {
      setResending(false)
    }
  }

  const filteredClients = clients.filter(client => {
    const term = searchTerm.toLowerCase()
    const matchesSearch =
      client.nome_cliente_formatado?.toLowerCase().includes(term) ||
      client.nome_empresa_formatado?.toLowerCase().includes(term) ||
      (client.codigo_cliente != null && String(client.codigo_cliente).includes(searchTerm))

    const matchesFilters =
      (!filters.cs || client.sc === filters.cs) &&
      (!filters.status || client.status_atual === filters.status) &&
      (!filters.engajamento || client.nivel_engajamento === filters.engajamento) &&
      (!filters.produto || client.produto === filters.produto) &&
      (!filters.unidade || client.unidade_treinamento === filters.unidade) &&
      (!filters.crm || (filters.crm === 'Sim' ? client.tem_crm : !client.tem_crm))

    return matchesSearch && matchesFilters
  }).sort((a, b) => {
    if (sortOrder === 'recent') return b.id_entrada - a.id_entrada
    return (a.nome_cliente_formatado ?? '').localeCompare(b.nome_cliente_formatado ?? '', 'pt-BR')
  })

  const uniqueScs = Array.from(new Set(clients.map(c => c.sc).filter(Boolean)))
  const produtoOptions = [...new Set(clients.map(c => c.produto).filter(Boolean) as string[])].sort()
  const canalOptions = [...new Set(clients.map(c => c.canal_de_venda).filter(Boolean) as string[])].sort()
  const unidadeOptions = [...new Set(clients.map(c => c.unidade_treinamento).filter(Boolean) as string[])].sort()

  const filterCategories: { key: string; label: string; options: string[] }[] = [
    { key: 'status', label: 'Status', options: STATUS_OPTIONS },
    { key: 'cs', label: 'CS Responsável', options: uniqueScs },
    { key: 'engajamento', label: 'Engajamento', options: Object.values(ENGAGEMENT_LABELS) },
    { key: 'produto', label: 'Produto', options: produtoOptions },
    { key: 'unidade', label: 'Unidade', options: unidadeOptions },
    { key: 'crm', label: 'CRM', options: ['Sim', 'Não'] },
  ]

  function applyFilter(key: string, value: string) {
    // For engajamento, we need to store the key, not the label
    if (key === 'engajamento') {
      const entry = Object.entries(ENGAGEMENT_LABELS).find(([, label]) => label === value)
      if (entry) value = entry[0]
    }
    setFilters(prev => ({ ...prev, [key]: value }))
    setFilterCategory(null)
    setFilterSearch("")
    setFilterMenuOpen(false)
  }

  function removeFilter(key: string) {
    setFilters(prev => {
      const next = { ...prev }
      delete next[key]
      return next
    })
  }

  const activeFilterCount = Object.keys(filters).length

  // Bulk selection helpers
  const filteredIds = new Set(filteredClients.map(c => c.id_entrada))
  const selectedFilteredCount = [...selectedIds].filter(id => filteredIds.has(id)).length
  const allFilteredSelected = filteredClients.length > 0 && selectedFilteredCount === filteredClients.length
  const someFilteredSelected = selectedFilteredCount > 0 && !allFilteredSelected

  function toggleSelectAll() {
    if (allFilteredSelected) {
      setSelectedIds(prev => {
        const next = new Set(prev)
        filteredClients.forEach(c => next.delete(c.id_entrada))
        return next
      })
    } else {
      setSelectedIds(prev => {
        const next = new Set(prev)
        filteredClients.forEach(c => next.add(c.id_entrada))
        return next
      })
    }
  }

  function toggleSelect(id: number) {
    setSelectedIds(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  function openBulkEdit() {
    setBulkStatus(null)
    setBulkSc(null)
    setBulkEngajamento(null)
    setBulkCrm(null)
    setBulkProduto(null)
    setBulkCanal(null)
    setBulkUnidade(null)
    setBulkMes(null)
    setBulkAno(null)
    setBulkEditOpen(true)
  }

  async function handleBulkSave() {
    if (selectedIds.size === 0) return
    setBulkSaving(true)

    const updates: Record<string, unknown> = {}
    if (bulkStatus !== null) updates.status_atual = bulkStatus
    if (bulkSc !== null) updates.sc = bulkSc
    if (bulkEngajamento !== null) updates.nivel_engajamento = bulkEngajamento
    if (bulkCrm !== null) updates.tem_crm = bulkCrm
    if (bulkProduto !== null) updates.produto = bulkProduto
    if (bulkCanal !== null) updates.canal_de_venda = bulkCanal
    if (bulkUnidade !== null) updates.unidade_treinamento = bulkUnidade
    if (bulkMes !== null) updates.mes_treinamento = bulkMes
    if (bulkAno !== null) updates.ano_treinamento = parseInt(bulkAno)

    if (Object.keys(updates).length === 0) {
      setBulkSaving(false)
      return
    }

    const ids = Array.from(selectedIds)
    const results = await Promise.allSettled(
      ids.map(id =>
        supabase
          .from('clientes_entrada_new')
          .update(updates)
          .eq('id_entrada', id)
          .then(({ error }) => {
            if (error) throw error
            return id
          })
      )
    )

    const succeededIds = new Set<number>()
    const failedIds: number[] = []
    results.forEach((result, i) => {
      if (result.status === 'fulfilled') succeededIds.add(ids[i])
      else failedIds.push(ids[i])
    })

    if (succeededIds.size > 0) {
      setClients(prev => prev.map(c => {
        if (!succeededIds.has(c.id_entrada)) return c
        return {
          ...c,
          ...(bulkStatus !== null && { status_atual: bulkStatus }),
          ...(bulkSc !== null && { sc: bulkSc }),
          ...(bulkEngajamento !== null && { nivel_engajamento: bulkEngajamento as NivelEngajamento }),
          ...(bulkCrm !== null && { tem_crm: bulkCrm }),
          ...(bulkProduto !== null && { produto: bulkProduto }),
          ...(bulkCanal !== null && { canal_de_venda: bulkCanal }),
          ...(bulkUnidade !== null && { unidade_treinamento: bulkUnidade }),
          ...(bulkMes !== null && { mes_treinamento: bulkMes }),
          ...(bulkAno !== null && { ano_treinamento: parseInt(bulkAno) }),
        }
      }))
    }

    if (failedIds.length > 0) {
      setSelectedIds(new Set(failedIds))
      alert(`${failedIds.length} de ${ids.length} atualizações falharam. Os clientes com falha permanecem selecionados.`)
    } else {
      setSelectedIds(new Set())
      setBulkEditOpen(false)
    }

    setBulkSaving(false)
  }

  if (loading) {
    return <div className="space-y-6 animate-pulse">
      <div className="h-12 w-1/4 bg-card/40 rounded-xl" />
      <div className="h-[500px] w-full bg-card/40 rounded-2xl" />
    </div>
  }

  return (
    <div className="space-y-10 pb-10">
      <div className="flex items-start justify-between gap-6">
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
        <Button
          onClick={() => setShowRegistrar(true)}
          size="sm"
          className="size-10 p-0 rounded-xl shadow-lg shadow-primary/20 shrink-0 mt-2"
          aria-label="Registrar Novo Cliente"
        >
          <Plus className="size-5" />
        </Button>
      </div>

      <div className="flex flex-col gap-4">
        <div className="flex flex-col md:flex-row md:items-center gap-4 bg-muted/10 p-6 rounded-2xl border border-border/50">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3.5 top-3.5 size-4 text-muted-foreground" />
            <Input
              placeholder="Buscar por cliente ou empresa..."
              className="pl-11 h-12 bg-background border-border focus-visible:border-primary/50 shadow-sm"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm" className="h-10 px-4 rounded-xl border-border bg-background text-xs font-bold uppercase tracking-wider gap-2">
                Ordenar ↓↑
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="w-48 bg-card/95 backdrop-blur-xl border-border rounded-xl p-2 shadow-2xl">
              <DropdownMenuItem
                className={`rounded-lg text-xs font-semibold py-2.5 cursor-pointer ${sortOrder === 'az' ? 'bg-primary/10 text-primary' : 'focus:bg-primary/10 focus:text-primary'}`}
                onClick={() => setSortOrder('az')}
              >
                A → Z
              </DropdownMenuItem>
              <DropdownMenuItem
                className={`rounded-lg text-xs font-semibold py-2.5 cursor-pointer ${sortOrder === 'recent' ? 'bg-primary/10 text-primary' : 'focus:bg-primary/10 focus:text-primary'}`}
                onClick={() => setSortOrder('recent')}
              >
                Últimos Adicionados
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          <div className="relative" ref={filterRef}>
            <Button
              variant="outline"
              size="sm"
              className="h-10 px-4 rounded-xl border-border bg-background text-xs font-bold uppercase tracking-wider gap-2"
              onClick={() => { setFilterMenuOpen(!filterMenuOpen); setFilterCategory(null); setFilterSearch("") }}
            >
              <FilterIcon className="size-3.5" />
              Filtrar
              {activeFilterCount > 0 && (
                <span className="size-5 rounded-full bg-primary text-primary-foreground text-[10px] font-bold flex items-center justify-center">{activeFilterCount}</span>
              )}
            </Button>
            {filterMenuOpen && (
              <div className="absolute z-50 mt-2 w-56 rounded-xl border border-border bg-card/95 backdrop-blur-xl shadow-2xl py-2">
                {!filterCategory ? (
                  <>
                    <div className="px-3 pb-2">
                      <div className="relative">
                        <Search className="absolute left-2.5 top-2.5 size-3.5 text-muted-foreground" />
                        <input
                          type="text"
                          placeholder="Filtrar..."
                          value={filterSearch}
                          onChange={(e) => setFilterSearch(e.target.value)}
                          className="w-full h-9 pl-8 pr-3 rounded-lg border border-border bg-background text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary/50"
                          autoFocus
                        />
                      </div>
                    </div>
                    {filterCategories
                      .filter(cat => cat.label.toLowerCase().includes(filterSearch.toLowerCase()))
                      .map(cat => (
                        <button
                          key={cat.key}
                          type="button"
                          className={`w-full text-left px-4 py-2.5 text-xs font-semibold hover:bg-primary/10 hover:text-primary transition-colors cursor-pointer flex items-center justify-between ${filters[cat.key] ? 'text-primary' : 'text-foreground'}`}
                          onClick={() => { setFilterCategory(cat.key); setFilterSearch("") }}
                        >
                          {cat.label}
                          {filters[cat.key] && <span className="text-[10px] text-primary/70">ativo</span>}
                        </button>
                      ))}
                  </>
                ) : (
                  <>
                    <button
                      type="button"
                      className="w-full text-left px-4 py-2 text-[10px] font-bold uppercase tracking-wider text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
                      onClick={() => { setFilterCategory(null); setFilterSearch("") }}
                    >
                      ← {filterCategories.find(c => c.key === filterCategory)?.label}
                    </button>
                    <div className="px-3 py-2">
                      <div className="relative">
                        <Search className="absolute left-2.5 top-2.5 size-3.5 text-muted-foreground" />
                        <input
                          type="text"
                          placeholder="Buscar..."
                          value={filterSearch}
                          onChange={(e) => setFilterSearch(e.target.value)}
                          className="w-full h-9 pl-8 pr-3 rounded-lg border border-border bg-background text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary/50"
                          autoFocus
                        />
                      </div>
                    </div>
                    <div className="max-h-48 overflow-y-auto">
                      {filterCategories
                        .find(c => c.key === filterCategory)
                        ?.options.filter(opt => opt.toLowerCase().includes(filterSearch.toLowerCase()))
                        .map(opt => (
                          <button
                            key={opt}
                            type="button"
                            className={`w-full text-left px-4 py-2.5 text-xs font-semibold hover:bg-primary/10 hover:text-primary transition-colors cursor-pointer ${filters[filterCategory] === opt || (filterCategory === 'engajamento' && filters[filterCategory] === Object.entries(ENGAGEMENT_LABELS).find(([, l]) => l === opt)?.[0]) ? 'bg-primary/10 text-primary' : 'text-foreground'}`}
                            onClick={() => applyFilter(filterCategory, opt)}
                          >
                            {opt}
                          </button>
                        ))}
                    </div>
                  </>
                )}
              </div>
            )}
          </div>
        </div>
        {activeFilterCount > 0 && (
          <div className="flex flex-wrap items-center gap-2">
            {Object.entries(filters).map(([key, value]) => {
              const cat = filterCategories.find(c => c.key === key)
              const displayValue = key === 'engajamento' ? (ENGAGEMENT_LABELS[value as NivelEngajamento] || value) : value
              return (
                <Badge
                  key={key}
                  variant="outline"
                  className="rounded-lg px-3 py-1.5 text-[11px] font-bold border-primary/30 text-primary bg-primary/10 gap-2 cursor-pointer hover:bg-primary/20 transition-colors"
                  onClick={() => removeFilter(key)}
                >
                  <span className="text-muted-foreground font-normal">{cat?.label}:</span> {displayValue}
                  <XIcon className="size-3" />
                </Badge>
              )
            })}
            <button
              type="button"
              className="text-[11px] font-semibold text-muted-foreground hover:text-foreground transition-colors cursor-pointer px-2"
              onClick={() => setFilters({})}
            >
              Limpar filtros
            </button>
          </div>
        )}
      </div>

      <AnimatePresence>
        {selectedIds.size > 0 && (
          <motion.div
            initial={{ opacity: 0, y: -10, height: 0 }}
            animate={{ opacity: 1, y: 0, height: "auto" }}
            exit={{ opacity: 0, y: -10, height: 0 }}
            className="flex items-center gap-4 bg-primary/10 border border-primary/20 rounded-2xl px-6 py-4"
          >
            <div className="flex items-center gap-2">
              <span className="text-sm font-bold text-primary">{selectedIds.size}</span>
              <span className="text-sm text-muted-foreground">
                {selectedIds.size === 1 ? 'cliente selecionado' : 'clientes selecionados'}
              </span>
            </div>
            <div className="flex-1" />
            <Button
              variant="outline"
              size="sm"
              className="h-9 px-4 rounded-lg font-bold text-[10px] uppercase tracking-wider"
              onClick={() => setSelectedIds(new Set())}
            >
              Limpar Seleção
            </Button>
            <Button
              size="sm"
              className="h-9 px-4 rounded-lg font-bold text-[10px] uppercase tracking-wider shadow-lg shadow-primary/20"
              onClick={openBulkEdit}
            >
              <Edit3 className="size-3.5 mr-1.5" />
              Editar em Massa
            </Button>
          </motion.div>
        )}
      </AnimatePresence>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2, duration: 0.6 }}
        className="border border-border bg-card/50 backdrop-blur-md rounded-2xl shadow-xl"
      >
        <Table className="table-fixed w-full">
          <TableHeader className="bg-muted/30">
            <TableRow className="border-b border-border/50 hover:bg-transparent">
              <TableHead className="w-[40px] py-5 pl-4 pr-0">
                <Checkbox
                  checked={allFilteredSelected ? true : someFilteredSelected ? "indeterminate" : false}
                  onCheckedChange={toggleSelectAll}
                  aria-label="Selecionar todos"
                />
              </TableHead>
              <TableHead className="w-[70px] text-muted-foreground font-bold uppercase tracking-widest text-[10px] py-5 px-3">ID</TableHead>
              <TableHead className="text-muted-foreground font-bold uppercase tracking-widest text-[10px] py-5 px-3">Empresa / Cliente</TableHead>
              <TableHead className="w-[180px] text-muted-foreground font-bold uppercase tracking-widest text-[10px] py-5 px-3">Status Atual</TableHead>
              <TableHead className="w-[140px] text-muted-foreground font-bold uppercase tracking-widest text-[10px] py-5 px-3">CS Responsável</TableHead>
              <TableHead className="w-[120px] text-muted-foreground font-bold uppercase tracking-widest text-[10px] py-5 px-3">Engajamento</TableHead>
              <TableHead className="w-[50px] text-muted-foreground font-bold uppercase tracking-widest text-[10px] py-5 px-2">CRM</TableHead>
              <TableHead className="w-[60px] text-muted-foreground font-bold uppercase tracking-widest text-[10px] py-5 text-right pr-4">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredClients.map((client) => (
              <TableRow key={client.id_entrada} className="hover:bg-primary/5 border-b border-border/30 transition-colors group">
                <TableCell className="py-5 pl-4 pr-0" onClick={(e) => e.stopPropagation()}>
                  <Checkbox
                    checked={selectedIds.has(client.id_entrada)}
                    onCheckedChange={() => toggleSelect(client.id_entrada)}
                    aria-label={`Selecionar ${client.nome_cliente_formatado}`}
                  />
                </TableCell>
                <TableCell className="py-5 px-3">
                  <span className="text-xs font-mono text-muted-foreground">
                    {client.codigo_cliente ?? '—'}
                  </span>
                </TableCell>
                <TableCell className="py-5 px-3">
                  <div className="flex flex-col gap-1">
                    <span className="font-bold text-sm text-foreground tracking-tight truncate">{client.nome_empresa_formatado}</span>
                    <div className="flex items-center gap-2 text-[11px] text-muted-foreground font-medium truncate">
                      <Briefcase className="size-3 shrink-0 text-primary/60" />
                      <span className="truncate">{client.nome_cliente_formatado}</span>
                    </div>
                  </div>
                </TableCell>
                <TableCell className="px-3">
                  <Badge
                    variant="outline"
                    className={`rounded-lg px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider max-w-full truncate inline-block ${
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
                <TableCell className="text-right pr-4">
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
                        <Edit3 className="mr-2 size-4" /> Editar Dados
                      </DropdownMenuItem>
                      <DropdownMenuSeparator className="bg-border/50" />
                      <DropdownMenuItem className="rounded-lg text-xs font-semibold py-2 text-destructive cursor-pointer focus:bg-destructive/10 focus:text-destructive">
                        Registrar Churn
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        className="rounded-lg text-xs font-semibold py-2 text-destructive cursor-pointer focus:bg-destructive/10 focus:text-destructive"
                        onClick={() => setDeleteClient(client)}
                      >
                        Excluir Cliente
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
            <SheetTitle className="text-lg font-bold text-foreground">Editar Cliente</SheetTitle>
          </SheetHeader>

          <div className="flex-1 overflow-y-auto p-6 space-y-6">
            <div className="space-y-2">
              <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Nome do Cliente</Label>
              <Input
                className="h-11 rounded-xl border-border bg-background"
                value={formNomeCliente}
                onChange={(e) => setFormNomeCliente(e.target.value)}
                placeholder="Nome do cliente..."
              />
            </div>

            <div className="space-y-2">
              <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Nome da Empresa</Label>
              <Input
                className="h-11 rounded-xl border-border bg-background"
                value={formNomeEmpresa}
                onChange={(e) => setFormNomeEmpresa(e.target.value)}
                placeholder="Nome da empresa..."
              />
            </div>

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

            <div className="space-y-2 pt-2 border-t border-border/50">
              <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Email de acesso</Label>
              <Input
                type="email"
                className="h-11 rounded-xl border-border bg-background"
                value={formEmail}
                onChange={(e) => setFormEmail(e.target.value)}
                placeholder="cliente@email.com"
              />
              <p className="text-[11px] text-muted-foreground">
                {hasAuthUser
                  ? 'Este cliente já tem conta. Alterar o email e reenviar sincroniza com o login.'
                  : 'Cliente ainda não tem conta. Enviar o convite cria o acesso.'}
              </p>
              <Button
                type="button"
                variant="outline"
                disabled={!formEmail.trim() || resending}
                onClick={handleResend}
                className="w-full h-11 rounded-xl mt-2"
              >
                {resending
                  ? 'Enviando...'
                  : hasAuthUser
                    ? 'Reenviar link de definição de senha'
                    : 'Enviar convite de acesso'}
              </Button>
              {resendResult && (
                <p className={`text-xs font-semibold mt-1 ${resendResult.type === 'ok' ? 'text-primary' : 'text-destructive'}`}>
                  {resendResult.msg}
                </p>
              )}
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

      <Sheet open={bulkEditOpen} onOpenChange={setBulkEditOpen}>
        <SheetContent side="right" className="w-full sm:max-w-md p-0 flex flex-col bg-background border-l border-border">
          <SheetHeader className="p-6 border-b border-border">
            <SheetTitle className="text-lg font-bold text-foreground">Edição em Massa</SheetTitle>
            <p className="text-xs text-muted-foreground mt-1">
              Alterando <span className="font-bold text-primary">{selectedIds.size}</span> {selectedIds.size === 1 ? 'cliente' : 'clientes'}.
              Marque apenas os campos que deseja alterar.
            </p>
          </SheetHeader>

          <div className="flex-1 overflow-y-auto p-6 space-y-4">
            <BulkField label="Status Atual" enabled={bulkStatus !== null} onToggle={() => setBulkStatus(prev => prev === null ? STATUS_OPTIONS[0] : null)}>
              <Select value={bulkStatus ?? ""} onValueChange={setBulkStatus}>
                <SelectTrigger className="h-11 rounded-xl border-border bg-background">
                  <SelectValue placeholder="Selecionar..." />
                </SelectTrigger>
                <SelectContent>
                  {STATUS_OPTIONS.map(s => (
                    <SelectItem key={s} value={s}>{s}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </BulkField>

            <BulkField label="CS Responsável" enabled={bulkSc !== null} onToggle={() => setBulkSc(prev => prev === null ? (uniqueScs[0] || "") : null)}>
              <Select value={bulkSc ?? ""} onValueChange={setBulkSc}>
                <SelectTrigger className="h-11 rounded-xl border-border bg-background">
                  <SelectValue placeholder="Selecionar..." />
                </SelectTrigger>
                <SelectContent>
                  {uniqueScs.map(sc => (
                    <SelectItem key={sc} value={sc}>{sc}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </BulkField>

            <BulkField label="Nível de Engajamento" enabled={bulkEngajamento !== null} onToggle={() => setBulkEngajamento(prev => prev === null ? 'cliente_novo' : null)}>
              <Select value={bulkEngajamento ?? ""} onValueChange={(v) => setBulkEngajamento(v as NivelEngajamento)}>
                <SelectTrigger className="h-11 rounded-xl border-border bg-background">
                  <SelectValue placeholder="Selecionar..." />
                </SelectTrigger>
                <SelectContent>
                  {(Object.entries(ENGAGEMENT_LABELS) as [NivelEngajamento, string][]).map(([value, label]) => (
                    <SelectItem key={value} value={value}>{label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </BulkField>

            <BulkField label="Black CRM" enabled={bulkCrm !== null} onToggle={() => setBulkCrm(prev => prev === null ? true : null)}>
              <div className="flex items-center gap-3">
                <Toggle checked={bulkCrm ?? false} onChange={(v) => setBulkCrm(v)} />
                <span className="text-sm text-muted-foreground">{bulkCrm ? 'Ativar' : 'Desativar'} para todos</span>
              </div>
            </BulkField>

            <BulkField label="Produto" enabled={bulkProduto !== null} onToggle={() => setBulkProduto(prev => prev === null ? "" : null)}>
              <ComboboxInput
                value={bulkProduto ?? ""}
                onChange={(v) => setBulkProduto(v)}
                options={produtoOptions}
                placeholder="Ex: PMC, PCE..."
              />
            </BulkField>

            <BulkField label="Canal de Venda" enabled={bulkCanal !== null} onToggle={() => setBulkCanal(prev => prev === null ? "" : null)}>
              <ComboboxInput
                value={bulkCanal ?? ""}
                onChange={(v) => setBulkCanal(v)}
                options={canalOptions}
                placeholder="Ex: IA para Negócios..."
              />
            </BulkField>

            <BulkField label="Unidade" enabled={bulkUnidade !== null} onToggle={() => setBulkUnidade(prev => prev === null ? "" : null)}>
              <ComboboxInput
                value={bulkUnidade ?? ""}
                onChange={(v) => setBulkUnidade(v)}
                options={unidadeOptions}
                placeholder="Unidade de treinamento"
              />
            </BulkField>

            <BulkField label="Mês Treinamento" enabled={bulkMes !== null} onToggle={() => setBulkMes(prev => prev === null ? MESES[0] : null)}>
              <Select value={bulkMes ?? ""} onValueChange={setBulkMes}>
                <SelectTrigger className="h-11 rounded-xl border-border bg-background">
                  <SelectValue placeholder="Selecionar..." />
                </SelectTrigger>
                <SelectContent>
                  {MESES.map(m => (
                    <SelectItem key={m} value={m}>{m}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </BulkField>

            <BulkField label="Ano Treinamento" enabled={bulkAno !== null} onToggle={() => setBulkAno(prev => prev === null ? String(currentYear) : null)}>
              <Select value={bulkAno ?? ""} onValueChange={setBulkAno}>
                <SelectTrigger className="h-11 rounded-xl border-border bg-background">
                  <SelectValue placeholder="Selecionar..." />
                </SelectTrigger>
                <SelectContent>
                  {ANO_OPTIONS.map(a => (
                    <SelectItem key={a} value={String(a)}>{a}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </BulkField>
          </div>

          <SheetFooter className="p-6 border-t border-border">
            <Button
              onClick={handleBulkSave}
              disabled={bulkSaving || (bulkStatus === null && bulkSc === null && bulkEngajamento === null && bulkCrm === null && bulkProduto === null && bulkCanal === null && bulkUnidade === null && bulkMes === null && bulkAno === null)}
              className="w-full h-11 rounded-xl font-bold uppercase tracking-wider text-xs"
            >
              {bulkSaving ? 'Salvando...' : `Aplicar a ${selectedIds.size} Clientes`}
            </Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>

      <RegistrarClienteDialog
        open={showRegistrar}
        onOpenChange={setShowRegistrar}
        scOptions={uniqueScs}
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

      <Dialog open={!!deleteClient} onOpenChange={(open) => { if (!open) setDeleteClient(null) }}>
        <DialogContent className="sm:max-w-md bg-card border-border">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold text-foreground">Excluir Cliente</DialogTitle>
            <DialogDescription className="text-muted-foreground">
              Tem certeza que deseja excluir <span className="font-bold text-foreground">{deleteClient?.nome_cliente_formatado}</span>
              {deleteClient?.nome_empresa_formatado && <> ({deleteClient.nome_empresa_formatado})</>}? Esta ação não pode ser desfeita.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="flex gap-3 mt-4">
            <Button variant="outline" onClick={() => setDeleteClient(null)} className="flex-1 rounded-xl font-bold text-xs uppercase tracking-wider">
              Cancelar
            </Button>
            <Button
              variant="destructive"
              onClick={handleDeleteClient}
              disabled={deleting}
              className="flex-1 rounded-xl font-bold text-xs uppercase tracking-wider"
            >
              {deleting ? 'Excluindo...' : 'Sim, Excluir'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
