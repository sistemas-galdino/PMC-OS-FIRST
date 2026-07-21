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
  DownloadIcon as Download,
} from "@/components/ui/icons"
import { exportarCsv } from "@/lib/export-csv"
import { faixaPorPontos } from "@/lib/nivel-pmc"
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  closestCorners,
  useDraggable,
  useDroppable,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core"
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
import { STATUS_CLIENTE } from "@/lib/status-cliente"
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

// Sinais do Radar de Renovação (RPC radar_renovacao) usados na gestão.
interface RadarInfo {
  dias_sem_reuniao: number | null
  faixa: "verde" | "amarelo" | "vermelho"
  dias_renovacao: number | null
  score: number
  motivos: string[]
}

function EngagementBadge({ value, auto }: { value: NivelEngajamento | null; auto?: boolean }) {
  if (!value) return <span className="text-muted-foreground text-xs">—</span>
  return (
    <Badge
      variant="outline"
      title={auto ? "Calculado automaticamente (reuniões + atividade). Edite o cliente para fixar manualmente." : "Definido manualmente"}
      className={`rounded-lg px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider ${ENGAGEMENT_CLASSES[value]}`}
    >
      {ENGAGEMENT_LABELS[value]}{auto ? " ·A" : ""}
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
  const [sortOrder, setSortOrder] = useState<'az' | 'recent' | 'reuniao' | 'pontos'>('az')
  // Sinais de saúde (Radar de Renovação) e Pontos MC por cliente.
  const [radar, setRadar] = useState<Map<string, RadarInfo>>(new Map())
  const [pontosMap, setPontosMap] = useState<Map<string, number>>(new Map())
  // Vista Lista ↔ Kanban + filtro rápido dos cards de resumo + drawer lateral.
  const [vista, setVista] = useState<'lista' | 'kanban'>('lista')
  const [quickFilter, setQuickFilter] = useState<null | 'ativos' | 'semcs' | 'risco' | 'renova' | 'cancelados'>(null)
  const [drawerClient, setDrawerClient] = useState<Client | null>(null)
  const [drawerReunioes, setDrawerReunioes] = useState<{ data: string; fonte: string }[]>([])
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
  const [resendInviteLink, setResendInviteLink] = useState<string | null>(null)
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
      const [{ data: entradaData, error: entradaErr }, { data: emailsData }, radarRes, pontosRes] = await Promise.all([
        supabase
          .from('clientes_entrada_new')
          .select('*')
          .order('nome_cliente_formatado', { ascending: true }),
        supabase
          .from('clientes_formulario')
          .select('id_cliente, email'),
        supabase.rpc('radar_renovacao'),
        supabase.rpc('admin_clientes_pontos'),
      ])

      const radarMap = new Map<string, RadarInfo>()
      ;((radarRes.data as any[]) ?? []).forEach((r) => {
        if (r.id_cliente) radarMap.set(r.id_cliente, {
          dias_sem_reuniao: r.dias_sem_reuniao,
          faixa: r.faixa,
          dias_renovacao: r.dias_renovacao,
          score: r.score,
          motivos: r.motivos ?? [],
        })
      })
      setRadar(radarMap)
      const pMap = new Map<string, number>()
      ;((pontosRes.data as any[]) ?? []).forEach((r) => { if (r.id_cliente) pMap.set(r.id_cliente, r.pontos ?? 0) })
      setPontosMap(pMap)

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

  // Drawer: últimas reuniões do cliente selecionado.
  useEffect(() => {
    const dc = drawerClient
    if (!dc) { setDrawerReunioes([]); return }
    let cancel = false
    async function load() {
      const [m, g] = await Promise.all([
        supabase.from('reunioes_mentoria_new').select('data_reuniao, mentor').eq('id_cliente', dc!.id_cliente).order('data_reuniao', { ascending: false }).limit(3),
        supabase.from('reunioes_galdino').select('data_reuniao').eq('id_cliente', dc!.id_cliente).order('data_reuniao', { ascending: false }).limit(3),
      ])
      if (cancel) return
      const lista = [
        ...((m.data as any[]) ?? []).map((r) => ({ data: r.data_reuniao as string, fonte: (r.mentor as string) || 'Consultor' })),
        ...((g.data as any[]) ?? []).map((r) => ({ data: r.data_reuniao as string, fonte: 'Galdino' })),
      ].sort((a, b) => (b.data || '').localeCompare(a.data || '')).slice(0, 4)
      setDrawerReunioes(lista)
    }
    load()
    return () => { cancel = true }
  }, [drawerClient])

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
    setResendInviteLink(null)
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
    setResendInviteLink(null)
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
      setResendInviteLink(data.invite_link || null)
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

  // Engajamento AUTOMÁTICO: derivado dos sinais reais (dias sem reunião, status).
  // O campo manual nivel_engajamento, quando preenchido, sobrescreve o cálculo.
  function engajamentoAuto(c: Client): NivelEngajamento {
    if (c.status_atual?.toLowerCase().includes('cancelad')) return 'cancelado'
    const r = radar.get(c.id_cliente)
    if (!r || r.dias_sem_reuniao == null) {
      return c.status_atual?.toLowerCase().includes('ativo') ? 'cliente_novo' : 'sem_onboarding'
    }
    if (r.dias_sem_reuniao <= 10) return 'ativo_alto'
    if (r.dias_sem_reuniao <= 21) return 'ativo_medio'
    if (r.dias_sem_reuniao <= 45) return 'desengajado'
    return 'congelado'
  }
  const engajamentoEfetivo = (c: Client): NivelEngajamento => c.nivel_engajamento ?? engajamentoAuto(c)
  const emRisco = (c: Client) => ['desengajado', 'congelado'].includes(engajamentoEfetivo(c))
  const diasSemReuniao = (c: Client) => radar.get(c.id_cliente)?.dias_sem_reuniao ?? null
  const diasRenovacao = (c: Client) => radar.get(c.id_cliente)?.dias_renovacao ?? null

  const filteredClients = clients.filter(client => {
    const term = searchTerm.toLowerCase()
    const matchesSearch =
      client.nome_cliente_formatado?.toLowerCase().includes(term) ||
      client.nome_empresa_formatado?.toLowerCase().includes(term) ||
      (client.codigo_cliente != null && String(client.codigo_cliente).includes(searchTerm))

    const matchesFilters =
      (!filters.cs || (filters.cs === 'Sem CS' ? !client.sc || !client.sc.trim() : client.sc === filters.cs)) &&
      (!filters.status || client.status_atual === filters.status) &&
      (!filters.engajamento || engajamentoEfetivo(client) === filters.engajamento) &&
      (!filters.produto || client.produto === filters.produto) &&
      (!filters.unidade || client.unidade_treinamento === filters.unidade) &&
      (!filters.crm || (filters.crm === 'Sim' ? client.tem_crm : !client.tem_crm))

    const matchesQuick =
      quickFilter === null ? true
      : quickFilter === 'ativos' ? !!client.status_atual?.toLowerCase().includes('ativo')
      : quickFilter === 'semcs' ? (!client.sc || !client.sc.trim())
      : quickFilter === 'risco' ? emRisco(client)
      : quickFilter === 'renova' ? (() => { const d = diasRenovacao(client); return d !== null && d >= 0 && d <= 90 })()
      : !!client.status_atual?.toLowerCase().includes('cancelad')

    return matchesSearch && matchesFilters && matchesQuick
  }).sort((a, b) => {
    if (sortOrder === 'recent') return b.id_entrada - a.id_entrada
    if (sortOrder === 'reuniao') {
      // mais tempo sem reunião primeiro (null = nunca → topo)
      const da = diasSemReuniao(a); const db = diasSemReuniao(b)
      return (db ?? 99999) - (da ?? 99999)
    }
    if (sortOrder === 'pontos') {
      return (pontosMap.get(b.id_cliente) ?? 0) - (pontosMap.get(a.id_cliente) ?? 0)
    }
    return (a.nome_cliente_formatado ?? '').localeCompare(b.nome_cliente_formatado ?? '', 'pt-BR')
  })

  const uniqueScs = Array.from(new Set(clients.map(c => c.sc).filter(Boolean)))
  const hasClientesSemCs = clients.some(c => !c.sc || !c.sc.trim())
  const produtoOptions = [...new Set(clients.map(c => c.produto).filter(Boolean) as string[])].sort()
  const canalOptions = [...new Set(clients.map(c => c.canal_de_venda).filter(Boolean) as string[])].sort()
  const unidadeOptions = [...new Set(clients.map(c => c.unidade_treinamento).filter(Boolean) as string[])].sort()

  const csFilterOptions = hasClientesSemCs ? [...uniqueScs, 'Sem CS'] : uniqueScs

  const filterCategories: { key: string; label: string; options: string[] }[] = [
    { key: 'status', label: 'Status', options: [...STATUS_CLIENTE] },
    { key: 'cs', label: 'CS Responsável', options: csFilterOptions },
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

  function exportar() {
    exportarCsv("clientes-pmc", [
      { chave: "codigo_cliente", titulo: "Código" },
      { chave: "nome_cliente_formatado", titulo: "Cliente" },
      { chave: "nome_empresa_formatado", titulo: "Empresa" },
      { chave: "status_atual", titulo: "Status" },
      { chave: "sc", titulo: "CS" },
      { chave: "nicho", titulo: "Nicho" },
      { chave: "estado_uf", titulo: "UF" },
      { chave: "telefone", titulo: "Telefone" },
      { chave: "email", titulo: "E-mail" },
      { chave: "produto", titulo: "Produto" },
      { chave: "canal_de_venda", titulo: "Canal de venda" },
      { chave: "nivel_engajamento", titulo: "Engajamento" },
      { chave: "tem_crm", titulo: "Tem CRM", valor: (c) => (c.tem_crm ? "Sim" : "Não") },
    ], filteredClients)
  }

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
        <div className="flex items-center gap-2 shrink-0 mt-2">
          <Button
            onClick={exportar}
            variant="outline"
            size="sm"
            className="h-10 gap-2 rounded-xl font-bold text-xs uppercase tracking-wider"
          >
            <Download className="size-4" /> Exportar
          </Button>
          <Button
            onClick={() => setShowRegistrar(true)}
            size="sm"
            className="size-10 p-0 rounded-xl shadow-lg shadow-primary/20"
            aria-label="Registrar Novo Cliente"
          >
            <Plus className="size-5" />
          </Button>
        </div>
      </div>

      {/* Resumo — cada card é um filtro de 1 clique */}
      {(() => {
        const nAtivos = clients.filter(c => c.status_atual?.toLowerCase().includes('ativo')).length
        const nSemCs = clients.filter(c => !c.sc || !c.sc.trim()).length
        const nRisco = clients.filter(emRisco).length
        const nRenova = clients.filter(c => { const d = diasRenovacao(c); return d !== null && d >= 0 && d <= 90 }).length
        const nCancel = clients.filter(c => c.status_atual?.toLowerCase().includes('cancelad')).length
        const cards: { key: typeof quickFilter; label: string; n: number; cls: string }[] = [
          { key: null, label: 'Total', n: clients.length, cls: 'text-foreground' },
          { key: 'ativos', label: 'Ativos', n: nAtivos, cls: 'text-primary' },
          { key: 'semcs', label: 'Sem CS', n: nSemCs, cls: nSemCs > 0 ? 'text-amber-400' : 'text-muted-foreground' },
          { key: 'risco', label: 'Em risco', n: nRisco, cls: nRisco > 0 ? 'text-red-400' : 'text-muted-foreground' },
          { key: 'renova', label: 'Renovam ≤90d', n: nRenova, cls: nRenova > 0 ? 'text-sky-400' : 'text-muted-foreground' },
          { key: 'cancelados', label: 'Cancelados', n: nCancel, cls: 'text-muted-foreground' },
        ]
        return (
          <div className="grid grid-cols-3 md:grid-cols-6 gap-3 -mt-4">
            {cards.map((cd) => {
              const ativo = quickFilter === cd.key
              return (
                <button
                  key={cd.label}
                  onClick={() => setQuickFilter(ativo && cd.key !== null ? null : cd.key)}
                  className={`rounded-2xl border p-4 text-left transition-all ${ativo && cd.key !== null ? 'border-primary/50 bg-primary/10 ring-1 ring-primary/20' : 'border-border/50 bg-muted/10 hover:border-primary/30'}`}
                >
                  <p className={`text-2xl font-bold tabular-nums ${cd.cls}`}>{cd.n}</p>
                  <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mt-0.5">{cd.label}</p>
                </button>
              )
            })}
          </div>
        )
      })()}

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
          <div className="inline-flex rounded-xl border border-border bg-background p-1 shrink-0">
            <button
              onClick={() => setVista('lista')}
              className={`rounded-lg px-3 py-1.5 text-xs font-bold uppercase tracking-wider transition-colors ${vista === 'lista' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:text-foreground'}`}
            >
              Lista
            </button>
            <button
              onClick={() => setVista('kanban')}
              className={`rounded-lg px-3 py-1.5 text-xs font-bold uppercase tracking-wider transition-colors ${vista === 'kanban' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:text-foreground'}`}
            >
              Kanban
            </button>
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

      {vista === 'kanban' && (
        <KanbanClientes
          clients={filteredClients}
          engajamentoEfetivo={engajamentoEfetivo}
          pontosMap={pontosMap}
          onAbrir={(c) => setDrawerClient(c)}
          onStatus={async (c, novo) => {
            const anterior = c.status_atual
            setClients(prev => prev.map(x => x.id_entrada === c.id_entrada ? { ...x, status_atual: novo } : x))
            const { error } = await supabase.from('clientes_entrada_new').update({ status_atual: novo }).eq('id_entrada', c.id_entrada)
            if (error) {
              console.error('Falha ao atualizar status do cliente:', error)
              setClients(prev => prev.map(x => x.id_entrada === c.id_entrada ? { ...x, status_atual: anterior } : x))
            }
          }}
        />
      )}

      {vista === 'lista' && (
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
              <TableHead className="text-muted-foreground font-bold uppercase tracking-widest text-[10px] py-5 px-3">
                <button className={`uppercase tracking-widest font-bold hover:text-primary transition-colors ${sortOrder === 'az' ? 'text-primary' : ''}`} onClick={() => setSortOrder('az')}>Empresa / Cliente ↕</button>
              </TableHead>
              <TableHead className="w-[130px] text-muted-foreground font-bold uppercase tracking-widest text-[10px] py-5 px-3">
                <button className={`uppercase tracking-widest font-bold hover:text-primary transition-colors ${sortOrder === 'reuniao' ? 'text-primary' : ''}`} onClick={() => setSortOrder('reuniao')} title="Ordenar por tempo sem reunião">Últ. Reunião ↕</button>
              </TableHead>
              <TableHead className="w-[170px] text-muted-foreground font-bold uppercase tracking-widest text-[10px] py-5 px-3">Status Atual</TableHead>
              <TableHead className="w-[140px] text-muted-foreground font-bold uppercase tracking-widest text-[10px] py-5 px-3">CS Responsável</TableHead>
              <TableHead className="w-[120px] text-muted-foreground font-bold uppercase tracking-widest text-[10px] py-5 px-3">Engajamento</TableHead>
              <TableHead className="w-[110px] text-muted-foreground font-bold uppercase tracking-widest text-[10px] py-5 px-3">
                <button className={`uppercase tracking-widest font-bold hover:text-primary transition-colors ${sortOrder === 'pontos' ? 'text-primary' : ''}`} onClick={() => setSortOrder('pontos')} title="Ordenar por Pontos MC">Pontos MC ↕</button>
              </TableHead>
              <TableHead className="w-[60px] text-muted-foreground font-bold uppercase tracking-widest text-[10px] py-5 text-right pr-4">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredClients.map((client) => {
              const dias = diasSemReuniao(client)
              const renova = diasRenovacao(client)
              const pontos = pontosMap.get(client.id_cliente) ?? 0
              return (
              <TableRow
                key={client.id_entrada}
                className="hover:bg-primary/5 border-b border-border/30 transition-colors group cursor-pointer"
                onClick={() => { setDrawerClient(client); }}
              >
                <TableCell className="py-5 pl-4 pr-0" onClick={(e) => e.stopPropagation()}>
                  <Checkbox
                    checked={selectedIds.has(client.id_entrada)}
                    onCheckedChange={() => toggleSelect(client.id_entrada)}
                    aria-label={`Selecionar ${client.nome_cliente_formatado}`}
                  />
                </TableCell>
                <TableCell className="py-5 px-3">
                  <div className="flex flex-col gap-1">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-sm text-foreground tracking-tight truncate">{client.nome_empresa_formatado}</span>
                      {renova !== null && renova >= 0 && renova <= 90 && (
                        <Badge variant="outline" className={`rounded-md px-1.5 py-0 text-[9px] font-bold shrink-0 ${renova <= 30 ? 'border-red-500/30 text-red-400 bg-red-500/10' : 'border-sky-500/30 text-sky-400 bg-sky-500/10'}`}>
                          renova em {renova}d
                        </Badge>
                      )}
                    </div>
                    <div className="flex items-center gap-2 text-[11px] text-muted-foreground font-medium truncate">
                      <Briefcase className="size-3 shrink-0 text-primary/60" />
                      <span className="truncate">{client.nome_cliente_formatado}</span>
                    </div>
                  </div>
                </TableCell>
                <TableCell className="px-3">
                  {dias === null ? (
                    <span className="text-[11px] font-medium text-muted-foreground/60">nunca</span>
                  ) : (
                    <span className={`text-[12px] font-bold tabular-nums ${dias > 30 ? 'text-red-400' : dias > 15 ? 'text-amber-400' : 'text-emerald-400'}`}>
                      há {dias}d
                    </span>
                  )}
                </TableCell>
                <TableCell className="px-3">
                  {client.status_atual ? (
                    <Badge
                      variant="outline"
                      className={`rounded-lg px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider max-w-full truncate inline-block ${
                        client.status_atual.toLowerCase().includes('ativo')
                          ? 'border-primary/30 text-primary bg-primary/10'
                          : 'border-border text-muted-foreground bg-muted/20'
                      }`}
                    >
                      {client.status_atual}
                    </Badge>
                  ) : (
                    <button
                      onClick={(e) => { e.stopPropagation(); openEdit(client) }}
                      className="rounded-lg px-2 py-1 text-[10px] font-bold border border-dashed border-amber-500/40 text-amber-400 hover:bg-amber-500/10 transition-colors"
                    >
                      + Definir status
                    </button>
                  )}
                </TableCell>
                <TableCell>
                  {client.sc?.trim() ? (
                    <div className="flex items-center gap-3">
                      <div className="size-8 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center text-[11px] font-bold text-primary">
                        {client.sc.substring(0, 1)}
                      </div>
                      <span className="text-[12px] font-semibold text-foreground">{client.sc}</span>
                    </div>
                  ) : (
                    <button
                      onClick={(e) => { e.stopPropagation(); openEdit(client) }}
                      className="rounded-lg px-2 py-1 text-[10px] font-bold border border-dashed border-amber-500/40 text-amber-400 hover:bg-amber-500/10 transition-colors"
                    >
                      + Atribuir CS
                    </button>
                  )}
                </TableCell>
                <TableCell>
                  <EngagementBadge value={engajamentoEfetivo(client)} auto={!client.nivel_engajamento} />
                </TableCell>
                <TableCell>
                  <div className="flex flex-col">
                    <span className="text-[13px] font-bold tabular-nums text-foreground">{pontos.toLocaleString('pt-BR')}</span>
                    <span className="text-[10px] font-medium text-muted-foreground">{faixaPorPontos(pontos).faixa.nome}</span>
                  </div>
                </TableCell>
                <TableCell className="text-right pr-4" onClick={(e) => e.stopPropagation()}>
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
              )
            })}
          </TableBody>
        </Table>
      </motion.div>
      )}

      {/* Drawer de resumo do cliente (clique na linha/card) */}
      <Sheet open={!!drawerClient} onOpenChange={(open) => { if (!open) setDrawerClient(null) }}>
        <SheetContent className="w-full sm:max-w-md overflow-y-auto">
          {drawerClient && (() => {
            const r = radar.get(drawerClient.id_cliente)
            const pontos = pontosMap.get(drawerClient.id_cliente) ?? 0
            const eng = engajamentoEfetivo(drawerClient)
            return (
              <div className="space-y-5 pt-2">
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Cliente #{drawerClient.codigo_cliente ?? '—'}</p>
                  <h2 className="text-xl font-bold tracking-tight text-foreground mt-0.5">{drawerClient.nome_empresa_formatado || 'Empresa'}</h2>
                  <p className="text-[13px] font-medium text-muted-foreground">{drawerClient.nome_cliente_formatado}</p>
                </div>

                <div className="flex items-center gap-2 flex-wrap">
                  {drawerClient.status_atual && (
                    <Badge variant="outline" className="rounded-lg text-[10px] font-bold border-border text-muted-foreground">{drawerClient.status_atual}</Badge>
                  )}
                  <EngagementBadge value={eng} auto={!drawerClient.nivel_engajamento} />
                  <Badge variant="outline" className="rounded-lg text-[10px] font-bold border-primary/30 text-primary bg-primary/10">
                    {pontos.toLocaleString('pt-BR')} pts MC · {faixaPorPontos(pontos).faixa.nome}
                  </Badge>
                </div>

                {/* Saúde (radar) */}
                <div className="rounded-2xl border border-border bg-muted/10 p-4 space-y-2">
                  <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Saúde do cliente</p>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <p className={`text-lg font-bold tabular-nums ${r?.dias_sem_reuniao != null && r.dias_sem_reuniao > 30 ? 'text-red-400' : 'text-foreground'}`}>
                        {r?.dias_sem_reuniao != null ? `${r.dias_sem_reuniao}d` : '—'}
                      </p>
                      <p className="text-[10px] font-medium text-muted-foreground">sem reunião</p>
                    </div>
                    <div>
                      <p className={`text-lg font-bold tabular-nums ${r?.dias_renovacao != null && r.dias_renovacao <= 30 ? 'text-red-400' : 'text-foreground'}`}>
                        {r?.dias_renovacao != null ? `${r.dias_renovacao}d` : '—'}
                      </p>
                      <p className="text-[10px] font-medium text-muted-foreground">para renovação</p>
                    </div>
                  </div>
                  {(r?.motivos?.length ?? 0) > 0 && (
                    <ul className="space-y-1 pt-1">
                      {r!.motivos.slice(0, 4).map((mo, i) => (
                        <li key={i} className="text-[11px] font-medium text-muted-foreground">• {mo}</li>
                      ))}
                    </ul>
                  )}
                </div>

                {/* Últimas reuniões */}
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-2">Últimas reuniões</p>
                  {drawerReunioes.length === 0 ? (
                    <p className="text-[12px] font-medium text-muted-foreground">Nenhuma reunião registrada.</p>
                  ) : (
                    <div className="space-y-1.5">
                      {drawerReunioes.map((re, i) => (
                        <div key={i} className="flex items-center justify-between rounded-xl bg-muted/15 border border-border/50 px-3 py-2">
                          <span className="text-[12px] font-bold text-foreground">{re.fonte}</span>
                          <span className="text-[11px] font-medium text-muted-foreground tabular-nums">
                            {re.data ? new Date(re.data + 'T00:00:00').toLocaleDateString('pt-BR') : '—'}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Contato + obs */}
                <div className="space-y-1.5">
                  <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Contato</p>
                  <p className="text-[12px] font-medium text-foreground">{drawerClient.telefone || 'Telefone não cadastrado'}</p>
                  <p className="text-[12px] font-medium text-muted-foreground">{drawerClient.email || 'E-mail não cadastrado'}</p>
                  {drawerClient.sc?.trim() && <p className="text-[12px] font-medium text-muted-foreground">CS: <span className="text-foreground font-bold">{drawerClient.sc}</span></p>}
                </div>
                {drawerClient.observacoes_cs && (
                  <div className="rounded-xl bg-muted/10 border border-border/50 p-3">
                    <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-1">Observações do CS</p>
                    <p className="text-[12px] font-medium text-foreground/90 leading-relaxed whitespace-pre-wrap">{drawerClient.observacoes_cs}</p>
                  </div>
                )}

                <div className="flex items-center gap-2 pt-1">
                  <Button className="flex-1 h-10 rounded-xl font-bold text-xs uppercase tracking-wider" onClick={() => navigate('/cliente/' + drawerClient.id_cliente)}>
                    Perfil completo
                  </Button>
                  <Button variant="outline" className="h-10 rounded-xl font-bold text-xs uppercase tracking-wider" onClick={() => { const c = drawerClient; setDrawerClient(null); openEdit(c) }}>
                    Editar
                  </Button>
                  {drawerClient.telefone && (
                    <Button variant="outline" className="h-10 px-3 rounded-xl" onClick={() => window.open(`https://wa.me/${drawerClient.telefone.replace(/\D/g, '')}`, '_blank')}>
                      <Phone className="size-4" />
                    </Button>
                  )}
                </div>
              </div>
            )
          })()}
        </SheetContent>
      </Sheet>

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
                  {STATUS_CLIENTE.map(s => (
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
              {resendInviteLink && (
                <div className="mt-2 space-y-1">
                  <p className="text-[11px] text-muted-foreground">Copie o link abaixo para enviar pelo WhatsApp:</p>
                  <div
                    className="bg-muted/20 border border-border rounded-xl p-2.5 text-[11px] text-foreground break-all text-left select-all cursor-pointer hover:bg-muted/30 transition-colors"
                    onClick={() => navigator.clipboard.writeText(resendInviteLink)}
                  >
                    {resendInviteLink}
                  </div>
                  <p className="text-[10px] text-muted-foreground">Clique no link para copiar</p>
                </div>
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
            <BulkField label="Status Atual" enabled={bulkStatus !== null} onToggle={() => setBulkStatus(prev => prev === null ? STATUS_CLIENTE[0] : null)}>
              <Select value={bulkStatus ?? ""} onValueChange={setBulkStatus}>
                <SelectTrigger className="h-11 rounded-xl border-border bg-background">
                  <SelectValue placeholder="Selecionar..." />
                </SelectTrigger>
                <SelectContent>
                  {STATUS_CLIENTE.map(s => (
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

// ---------------------------------------------------------------------------
// Vista Kanban — clientes agrupados por status, arrasta para mudar de coluna.
function KanbanClientes({ clients, engajamentoEfetivo, pontosMap, onAbrir, onStatus }: {
  clients: Client[]
  engajamentoEfetivo: (c: Client) => NivelEngajamento
  pontosMap: Map<string, number>
  onAbrir: (c: Client) => void
  onStatus: (c: Client, novo: string) => void
}) {
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 6 } }))
  const [activeId, setActiveId] = useState<number | null>(null)
  const colunas = ['__sem_status', ...STATUS_CLIENTE]
  const itensDe = (col: string) =>
    col === '__sem_status' ? clients.filter(c => !c.status_atual) : clients.filter(c => c.status_atual === col)

  function onDragEnd(e: DragEndEvent) {
    setActiveId(null)
    const over = e.over?.id as string | undefined
    if (!over || over === '__sem_status') return
    const c = clients.find(x => x.id_entrada === Number(e.active.id))
    if (c && c.status_atual !== over) onStatus(c, over)
  }

  const ativo = clients.find(c => c.id_entrada === activeId) ?? null

  return (
    <DndContext sensors={sensors} collisionDetection={closestCorners} onDragStart={(e) => setActiveId(Number(e.active.id))} onDragEnd={onDragEnd}>
      <div className="flex gap-4 overflow-x-auto pb-4 items-start">
        {colunas.map((col) => {
          const itens = itensDe(col)
          if (col === '__sem_status' && itens.length === 0) return null
          return <ColunaKanbanClientes key={col} id={col} titulo={col === '__sem_status' ? 'Sem status' : col} itens={itens} engajamentoEfetivo={engajamentoEfetivo} pontosMap={pontosMap} onAbrir={onAbrir} />
        })}
      </div>
      <DragOverlay>
        {ativo && <CardKanbanCliente c={ativo} engajamentoEfetivo={engajamentoEfetivo} pontosMap={pontosMap} overlay />}
      </DragOverlay>
    </DndContext>
  )
}

function ColunaKanbanClientes({ id, titulo, itens, engajamentoEfetivo, pontosMap, onAbrir }: {
  id: string
  titulo: string
  itens: Client[]
  engajamentoEfetivo: (c: Client) => NivelEngajamento
  pontosMap: Map<string, number>
  onAbrir: (c: Client) => void
}) {
  const { setNodeRef, isOver } = useDroppable({ id })
  return (
    <div ref={setNodeRef} className={`w-72 shrink-0 rounded-2xl border transition-colors ${isOver ? 'border-primary/50 bg-primary/5' : 'border-border/60 bg-muted/10'}`}>
      <div className="px-4 py-3 border-b border-border/50 flex items-center justify-between">
        <p className="text-[11px] font-bold uppercase tracking-wider text-foreground truncate">{titulo}</p>
        <span className="text-[11px] font-bold tabular-nums text-muted-foreground">{itens.length}</span>
      </div>
      <div className="p-2 space-y-2 min-h-[80px] max-h-[60vh] overflow-y-auto">
        {itens.map((c) => (
          <CardKanbanCliente key={c.id_entrada} c={c} engajamentoEfetivo={engajamentoEfetivo} pontosMap={pontosMap} onAbrir={onAbrir} />
        ))}
      </div>
    </div>
  )
}

function CardKanbanCliente({ c, engajamentoEfetivo, pontosMap, onAbrir, overlay }: {
  c: Client
  engajamentoEfetivo: (cl: Client) => NivelEngajamento
  pontosMap: Map<string, number>
  onAbrir?: (cl: Client) => void
  overlay?: boolean
}) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({ id: c.id_entrada })
  const eng = engajamentoEfetivo(c)
  const pontos = pontosMap.get(c.id_cliente) ?? 0
  return (
    <div
      ref={overlay ? undefined : setNodeRef}
      {...(overlay ? {} : attributes)}
      {...(overlay ? {} : listeners)}
      onClick={() => { if (!overlay && !isDragging) onAbrir?.(c) }}
      className={`rounded-xl border border-border bg-card p-3 cursor-grab active:cursor-grabbing select-none ${isDragging && !overlay ? 'opacity-40' : ''} ${overlay ? 'shadow-2xl ring-1 ring-primary/30' : 'hover:border-primary/30'} transition-colors`}
    >
      <p className="text-[13px] font-bold tracking-tight text-foreground truncate">{c.nome_empresa_formatado || 'Empresa'}</p>
      <p className="text-[11px] font-medium text-muted-foreground truncate">{c.nome_cliente_formatado}</p>
      <div className="flex items-center justify-between mt-2">
        <EngagementBadge value={eng} auto={!c.nivel_engajamento} />
        <span className="text-[11px] font-bold tabular-nums text-primary">{pontos.toLocaleString('pt-BR')} pts</span>
      </div>
    </div>
  )
}
