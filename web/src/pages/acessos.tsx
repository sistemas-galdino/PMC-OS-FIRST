import { useEffect, useMemo, useState } from "react"
import { supabase } from "@/lib/supabase"
import { useNavigate } from "react-router-dom"
import { motion } from "framer-motion"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  UsersIcon as Users,
  ShieldCheckIcon as ShieldCheck,
  AlertCircleIcon as AlertCircle,
  TrendingUpIcon as TrendingUp,
  ClockIcon as Clock,
  MailIcon as Mail,
  SearchIcon as Search,
  UserCheckIcon as UserCheck,
} from "@/components/ui/icons"

interface AccessRow {
  id_entrada: number
  id_cliente: string
  nome_cliente: string | null
  nome_empresa: string | null
  email: string | null
  sc: string | null
  status_atual: string | null
  nivel_engajamento: string | null
  data_cadastro_formulario: string | null
  tem_auth_user: boolean
  last_sign_in_at: string | null
  data_criacao_auth: string | null
  email_confirmed_at: string | null
  senha_definida: boolean | null
  status_onboarding: string | null
  qtd_convites_reenviados: number
}

type TabKey = "todos" | "nunca" | "ativos" | "inativos" | "aguardando"

const DAY = 24 * 60 * 60 * 1000
const THRESHOLD_ATIVO = 14 * DAY

function formatRelativeTime(iso: string | null): string {
  if (!iso) return "Nunca acessou"
  const diff = Date.now() - new Date(iso).getTime()
  if (diff < 0) return "agora"
  const days = Math.floor(diff / DAY)
  if (days === 0) return "hoje"
  if (days === 1) return "ontem"
  if (days < 30) return `há ${days} dias`
  const months = Math.floor(days / 30)
  if (months < 12) return months === 1 ? "há 1 mês" : `há ${months} meses`
  const years = Math.floor(months / 12)
  return years === 1 ? "há 1 ano" : `há ${years} anos`
}

function formatDate(iso: string | null): string {
  if (!iso) return "—"
  const d = new Date(iso)
  if (isNaN(d.getTime())) return "—"
  return d.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric" })
}

function lastAccessClass(iso: string | null): string {
  if (!iso) return "text-red-400"
  const diff = Date.now() - new Date(iso).getTime()
  if (diff <= THRESHOLD_ATIVO) return "text-emerald-400"
  if (diff <= 60 * DAY) return "text-yellow-400"
  return "text-orange-400"
}

export default function AcessosPage() {
  const navigate = useNavigate()
  const [rows, setRows] = useState<AccessRow[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [search, setSearch] = useState("")
  const [activeTab, setActiveTab] = useState<TabKey>("todos")
  const [resendingId, setResendingId] = useState<string | null>(null)
  const [toast, setToast] = useState<{ type: "ok" | "err"; msg: string } | null>(null)

  useEffect(() => {
    let cancelled = false
    async function load() {
      const { data, error } = await supabase.rpc("get_client_access_overview")
      if (cancelled) return
      if (error) {
        console.error("get_client_access_overview error:", error)
        setError(error.message || "Erro ao carregar dados de acesso")
        setLoading(false)
        return
      }
      setRows((data as AccessRow[]) ?? [])
      setLoading(false)
    }
    load()
    return () => { cancelled = true }
  }, [])

  useEffect(() => {
    if (!toast) return
    const t = setTimeout(() => setToast(null), 3500)
    return () => clearTimeout(t)
  }, [toast])

  const metrics = useMemo(() => {
    const now = Date.now()
    const total = rows.length
    let ativaram = 0
    let nunca = 0
    let ativos = 0
    let inativos = 0
    let aguardando = 0
    for (const r of rows) {
      if (r.tem_auth_user && r.senha_definida) ativaram++
      if (r.tem_auth_user && !r.senha_definida) aguardando++
      if (!r.last_sign_in_at) {
        nunca++
      } else {
        const diff = now - new Date(r.last_sign_in_at).getTime()
        if (diff <= THRESHOLD_ATIVO) ativos++
        else inativos++
      }
    }
    return { total, ativaram, nunca, ativos, inativos, aguardando }
  }, [rows])

  const filtered = useMemo(() => {
    const now = Date.now()
    let list = rows
    if (activeTab === "nunca") list = list.filter(r => !r.last_sign_in_at)
    else if (activeTab === "ativos") list = list.filter(r => r.last_sign_in_at && (now - new Date(r.last_sign_in_at).getTime()) <= THRESHOLD_ATIVO)
    else if (activeTab === "inativos") list = list.filter(r => r.last_sign_in_at && (now - new Date(r.last_sign_in_at).getTime()) > THRESHOLD_ATIVO)
    else if (activeTab === "aguardando") list = list.filter(r => r.tem_auth_user && !r.senha_definida)

    const q = search.trim().toLowerCase()
    if (q) {
      list = list.filter(r =>
        r.nome_cliente?.toLowerCase().includes(q) ||
        r.nome_empresa?.toLowerCase().includes(q) ||
        r.email?.toLowerCase().includes(q))
    }
    return [...list].sort((a, b) => {
      const aT = a.last_sign_in_at ? new Date(a.last_sign_in_at).getTime() : 0
      const bT = b.last_sign_in_at ? new Date(b.last_sign_in_at).getTime() : 0
      return bT - aT
    })
  }, [rows, activeTab, search])

  async function handleResend(row: AccessRow) {
    if (!row.email) {
      setToast({ type: "err", msg: "Cliente sem email cadastrado" })
      return
    }
    setResendingId(row.id_cliente)
    try {
      const { data: { session } } = await supabase.auth.getSession()
      const accessToken = session?.access_token
      if (!accessToken) throw new Error("Sessão expirada. Faça login novamente.")

      const resp = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/invite-legacy`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${accessToken}`,
            "apikey": import.meta.env.VITE_SUPABASE_ANON_KEY,
          },
          body: JSON.stringify({
            id_cliente: row.id_cliente,
            email_destino: row.email,
            app_url: window.location.origin,
          }),
        }
      )
      const data = await resp.json()
      if (!resp.ok) throw new Error(data.error || `Erro ${resp.status}`)

      setRows(prev => prev.map(r =>
        r.id_cliente === row.id_cliente
          ? { ...r, qtd_convites_reenviados: r.qtd_convites_reenviados + 1, tem_auth_user: true }
          : r
      ))
      if (data.invite_link) {
        try {
          await navigator.clipboard.writeText(data.invite_link)
          setToast({ type: "ok", msg: "Link reenviado + copiado para clipboard" })
        } catch {
          setToast({ type: "ok", msg: "Link reenviado com sucesso" })
        }
      } else {
        setToast({ type: "ok", msg: data.message || "Link reenviado com sucesso" })
      }
    } catch (e: any) {
      setToast({ type: "err", msg: e.message || "Erro ao reenviar link" })
    } finally {
      setResendingId(null)
    }
  }

  const cards = [
    { title: "Total de Membros", value: metrics.total, icon: Users, cls: "text-primary bg-primary/10", desc: "Cadastrados no sistema" },
    { title: "Ativaram Conta", value: metrics.ativaram, icon: ShieldCheck, cls: "text-emerald-400 bg-emerald-500/10", desc: "Definiram a senha" },
    { title: "Nunca Acessaram", value: metrics.nunca, icon: AlertCircle, cls: "text-red-400 bg-red-500/10", desc: "Sem registro de login" },
    { title: "Ativos (14 dias)", value: metrics.ativos, icon: TrendingUp, cls: "text-emerald-400 bg-emerald-500/10", desc: "Logaram recentemente" },
    { title: "Inativos (>14 dias)", value: metrics.inativos, icon: Clock, cls: "text-orange-400 bg-orange-500/10", desc: "Sumiram do sistema" },
    { title: "Aguardando Ativação", value: metrics.aguardando, icon: Mail, cls: "text-yellow-400 bg-yellow-500/10", desc: "Convite enviado, sem senha" },
  ]

  const tabs: { key: TabKey; label: string; count: number }[] = [
    { key: "todos", label: "Todos", count: metrics.total },
    { key: "nunca", label: "Nunca acessaram", count: metrics.nunca },
    { key: "ativos", label: "Ativos", count: metrics.ativos },
    { key: "inativos", label: "Inativos", count: metrics.inativos },
    { key: "aguardando", label: "Aguardando", count: metrics.aguardando },
  ]

  if (loading) {
    return (
      <div className="space-y-6 animate-pulse">
        <div className="h-12 w-1/3 bg-card/40 rounded-xl" />
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3, 4, 5, 6].map(i => <Card key={i} className="h-32 bg-card/40" />)}
        </div>
        <div className="h-[400px] w-full bg-card/40 rounded-2xl" />
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <div className="size-16 bg-destructive/10 rounded-2xl flex items-center justify-center mb-6">
          <AlertCircle className="size-8 text-destructive" />
        </div>
        <h2 className="text-2xl font-bold text-foreground mb-3">Erro ao carregar</h2>
        <pre className="text-xs text-muted-foreground max-w-xl bg-muted/30 p-4 rounded-xl">{error}</pre>
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
        <h1 className="text-4xl lg:text-5xl font-bold tracking-tight text-foreground">Acessos</h1>
        <div className="flex items-center gap-3">
          <Badge variant="outline" className="bg-primary/5 border-primary/20 text-primary">Login & Ativação</Badge>
          <p className="text-muted-foreground font-medium text-sm">Quem realmente está usando o sistema.</p>
        </div>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="grid gap-6 md:grid-cols-2 lg:grid-cols-3"
      >
        {cards.map(card => (
          <Card key={card.title} className="hover:shadow-primary/10">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">{card.title}</CardTitle>
              <div className={`p-2.5 rounded-xl ${card.cls}`}>
                <card.icon className="size-4" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-4xl font-bold tracking-tight mb-3">{card.value}</div>
              <span className="text-[11px] font-medium text-muted-foreground">{card.desc}</span>
            </CardContent>
          </Card>
        ))}
      </motion.div>

      <div className="flex flex-col gap-4">
        <div className="flex flex-col md:flex-row md:items-center gap-4 bg-muted/10 p-6 rounded-2xl border border-border/50">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3.5 top-3.5 size-4 text-muted-foreground" />
            <Input
              placeholder="Buscar por nome, empresa ou email..."
              className="pl-11 h-12 bg-background border-border focus-visible:border-primary/50 shadow-sm"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <div className="text-xs font-semibold uppercase tracking-widest text-muted-foreground md:ml-auto">
            Mostrando <span className="text-foreground">{filtered.length}</span> de <span className="text-foreground">{metrics.total}</span>
          </div>
        </div>

        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as TabKey)}>
          <TabsList className="w-full flex-wrap h-auto p-1">
            {tabs.map(tab => (
              <TabsTrigger key={tab.key} value={tab.key} className="flex-1 min-w-[120px]">
                {tab.label}
                <span className="ml-2 inline-flex items-center justify-center rounded-full bg-muted/60 text-muted-foreground px-2 h-5 text-[10px] font-bold data-[state=active]:bg-primary/15 data-[state=active]:text-primary">
                  {tab.count}
                </span>
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>
      </div>

      {toast && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className={`fixed top-6 right-6 z-50 rounded-xl px-5 py-3 shadow-2xl border font-semibold text-sm ${
            toast.type === "ok"
              ? "bg-primary/10 border-primary/30 text-primary"
              : "bg-destructive/10 border-destructive/30 text-destructive"
          }`}
        >
          {toast.msg}
        </motion.div>
      )}

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.15, duration: 0.5 }}
        className="border border-border bg-card/50 backdrop-blur-md rounded-2xl shadow-xl overflow-hidden"
      >
        <Table className="w-full">
          <TableHeader className="bg-muted/30">
            <TableRow className="border-b border-border/50 hover:bg-transparent">
              <TableHead className="text-muted-foreground font-bold uppercase tracking-widest text-[10px] py-5 px-4">Membro</TableHead>
              <TableHead className="text-muted-foreground font-bold uppercase tracking-widest text-[10px] py-5 px-3 hidden md:table-cell">Email</TableHead>
              <TableHead className="text-muted-foreground font-bold uppercase tracking-widest text-[10px] py-5 px-3 hidden lg:table-cell w-[140px]">CS</TableHead>
              <TableHead className="text-muted-foreground font-bold uppercase tracking-widest text-[10px] py-5 px-3 hidden xl:table-cell w-[180px]">Status</TableHead>
              <TableHead className="text-muted-foreground font-bold uppercase tracking-widest text-[10px] py-5 px-3 hidden lg:table-cell w-[120px]">Data Cadastro</TableHead>
              <TableHead className="text-muted-foreground font-bold uppercase tracking-widest text-[10px] py-5 px-3 w-[160px]">Último Acesso</TableHead>
              <TableHead className="text-muted-foreground font-bold uppercase tracking-widest text-[10px] py-5 px-3 w-[100px] text-center hidden md:table-cell">Convites</TableHead>
              <TableHead className="text-muted-foreground font-bold uppercase tracking-widest text-[10px] py-5 px-3 text-right pr-4 w-[220px]">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.length === 0 && (
              <TableRow>
                <TableCell colSpan={8} className="text-center py-16 text-muted-foreground text-sm">
                  Nenhum membro encontrado com esses filtros.
                </TableCell>
              </TableRow>
            )}
            {filtered.map(row => (
              <TableRow key={row.id_entrada} className="hover:bg-primary/5 border-b border-border/30 transition-colors">
                <TableCell className="py-4 px-4">
                  <div className="flex flex-col gap-1 min-w-0">
                    <span className="font-bold text-sm text-foreground truncate">{row.nome_cliente || "—"}</span>
                    <span className="text-[11px] text-muted-foreground truncate">{row.nome_empresa || "—"}</span>
                  </div>
                </TableCell>
                <TableCell className="px-3 hidden md:table-cell">
                  {row.email ? (
                    <a href={`mailto:${row.email}`} className="text-xs text-foreground hover:text-primary transition-colors break-all">
                      {row.email}
                    </a>
                  ) : (
                    <span className="text-xs text-muted-foreground">—</span>
                  )}
                </TableCell>
                <TableCell className="px-3 hidden lg:table-cell">
                  {row.sc ? (
                    <div className="flex items-center gap-2">
                      <div className="size-7 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center text-[10px] font-bold text-primary">
                        {row.sc.substring(0, 1)}
                      </div>
                      <span className="text-[11px] font-semibold text-foreground truncate">{row.sc}</span>
                    </div>
                  ) : (
                    <span className="text-xs text-muted-foreground">—</span>
                  )}
                </TableCell>
                <TableCell className="px-3 hidden xl:table-cell">
                  {row.status_atual ? (
                    <Badge
                      variant="outline"
                      className={`rounded-lg px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider max-w-full truncate inline-block ${
                        row.status_atual.toLowerCase().includes("ativo")
                          ? "border-primary/30 text-primary bg-primary/10"
                          : "border-border text-muted-foreground bg-muted/20"
                      }`}
                    >
                      {row.status_atual}
                    </Badge>
                  ) : <span className="text-xs text-muted-foreground">—</span>}
                </TableCell>
                <TableCell className="px-3 hidden lg:table-cell">
                  <span className="text-xs text-muted-foreground">{formatDate(row.data_cadastro_formulario)}</span>
                </TableCell>
                <TableCell className="px-3">
                  <span className={`text-xs font-semibold ${lastAccessClass(row.last_sign_in_at)}`}>
                    {formatRelativeTime(row.last_sign_in_at)}
                  </span>
                </TableCell>
                <TableCell className="px-3 text-center hidden md:table-cell">
                  {row.qtd_convites_reenviados > 0 ? (
                    <Badge variant="outline" className="rounded-lg px-2 py-0.5 text-[10px] font-bold bg-muted/30">
                      {row.qtd_convites_reenviados}
                    </Badge>
                  ) : (
                    <span className="text-xs text-muted-foreground">—</span>
                  )}
                </TableCell>
                <TableCell className="px-3 text-right pr-4">
                  <div className="flex items-center justify-end gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={!row.email || resendingId === row.id_cliente}
                      onClick={() => handleResend(row)}
                      className="h-8 px-3 rounded-lg text-[10px] font-bold uppercase tracking-wider gap-1.5"
                      title={row.email ? "Reenviar link de definição de senha" : "Cliente sem email cadastrado"}
                    >
                      <Mail className="size-3" />
                      {resendingId === row.id_cliente ? "Enviando..." : "Reenviar"}
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => navigate(`/cliente/${row.id_cliente}`)}
                      className="h-8 px-3 rounded-lg text-[10px] font-bold uppercase tracking-wider gap-1.5"
                      title="Ver perfil do cliente"
                    >
                      <UserCheck className="size-3" />
                      Perfil
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </motion.div>
    </div>
  )
}
