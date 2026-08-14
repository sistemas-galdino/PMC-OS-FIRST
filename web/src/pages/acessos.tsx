import { useEffect, useMemo, useState } from "react"
import { supabase } from "@/lib/supabase"
import { isStatusAtivo } from "@/lib/status-cliente"
import { useNavigate } from "react-router-dom"
import { motion } from "framer-motion"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog"
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
  CopyIcon as Copy,
  MessageCircleIcon as MessageCircle,
} from "@/components/ui/icons"

// Papel dentro da empresa: define a HOME, não o acesso a dado.
const PAPEIS_EMPRESA = [
  { chave: "dono", label: "Dono", home: "Minha Jornada" },
  { chave: "guardiao", label: "Guardião", home: "Meu Dia" },
  { chave: "colaborador", label: "Colaborador", home: "Minha Jornada" },
] as const

interface UsuarioEmpresa { auth_user_id: string; papel: string; email: string | null }

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
  // Adicionar usuário a uma empresa existente (Fase 2: N logins por empresa)
  const [showAddUser, setShowAddUser] = useState(false)
  const [addUserEmpresa, setAddUserEmpresa] = useState("")
  const [addUserEmail, setAddUserEmail] = useState("")
  const [addUserPapel, setAddUserPapel] = useState<string>("colaborador")
  const [addUserBusy, setAddUserBusy] = useState(false)
  // Usuários já vinculados à empresa selecionada — para trocar o papel de quem já existe.
  const [usuariosEmpresa, setUsuariosEmpresa] = useState<UsuarioEmpresa[]>([])
  const [salvandoPapel, setSalvandoPapel] = useState<string | null>(null)
  const [addUserResult, setAddUserResult] = useState<{ ok: boolean; msg: string; link?: string } | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [search, setSearch] = useState("")
  const [activeTab, setActiveTab] = useState<TabKey>("todos")
  const [csFilter, setCsFilter] = useState<string>("all")
  const [resendingId, setResendingId] = useState<string | null>(null)
  const [toast, setToast] = useState<{ type: "ok" | "err"; msg: string } | null>(null)
  const [confirmRow, setConfirmRow] = useState<AccessRow | null>(null)
  const [inviteResult, setInviteResult] = useState<{ row: AccessRow; link: string } | null>(null)
  const [linkCopied, setLinkCopied] = useState(false)

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
    let totalAtivos = 0
    let nuncaAtivos = 0
    let jaAcessaram = 0
    let nunca = 0
    let ativos = 0
    let inativos = 0
    let aguardando = 0
    for (const r of rows) {
      const isClienteAtivo = isStatusAtivo(r.status_atual)
      if (isClienteAtivo) totalAtivos++
      if (r.last_sign_in_at) {
        jaAcessaram++
        const diff = now - new Date(r.last_sign_in_at).getTime()
        if (diff <= THRESHOLD_ATIVO) ativos++
        else inativos++
      } else {
        nunca++
        if (isClienteAtivo) nuncaAtivos++
        if (r.tem_auth_user) aguardando++
      }
    }
    return { total, totalAtivos, jaAcessaram, nunca, nuncaAtivos, ativos, inativos, aguardando }
  }, [rows])

  const csOptions = useMemo(() => {
    const set = new Set<string>()
    let temSemCs = false
    for (const r of rows) {
      if (r.sc && r.sc.trim()) set.add(r.sc.trim())
      else temSemCs = true
    }
    const arr = Array.from(set).sort((a, b) => a.localeCompare(b, "pt-BR"))
    return { lista: arr, temSemCs }
  }, [rows])

  const filtered = useMemo(() => {
    const now = Date.now()
    let list = rows
    if (activeTab === "nunca") list = list.filter(r => !r.last_sign_in_at)
    else if (activeTab === "ativos") list = list.filter(r => r.last_sign_in_at && (now - new Date(r.last_sign_in_at).getTime()) <= THRESHOLD_ATIVO)
    else if (activeTab === "inativos") list = list.filter(r => r.last_sign_in_at && (now - new Date(r.last_sign_in_at).getTime()) > THRESHOLD_ATIVO)
    else if (activeTab === "aguardando") list = list.filter(r => r.tem_auth_user && !r.last_sign_in_at)

    if (csFilter !== "all") {
      if (csFilter === "__sem") list = list.filter(r => !r.sc || !r.sc.trim())
      else list = list.filter(r => r.sc === csFilter)
    }

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
  }, [rows, activeTab, search, csFilter])

  async function confirmResend() {
    const row = confirmRow
    if (!row) return
    if (!row.email) {
      setToast({ type: "err", msg: "Cliente sem email cadastrado" })
      setConfirmRow(null)
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
      setConfirmRow(null)
      if (data.invite_link) {
        setInviteResult({ row, link: data.invite_link })
        setLinkCopied(false)
      } else {
        setToast({ type: "ok", msg: data.message || "Link reenviado com sucesso" })
      }
    } catch (e: any) {
      setToast({ type: "err", msg: e.message || "Erro ao reenviar link" })
    } finally {
      setResendingId(null)
    }
  }

  async function copyLinkToClipboard(link: string) {
    try {
      await navigator.clipboard.writeText(link)
      setLinkCopied(true)
      setTimeout(() => setLinkCopied(false), 2500)
    } catch {
      setToast({ type: "err", msg: "Não foi possível copiar o link" })
    }
  }

  function shareOnWhatsApp(row: AccessRow, link: string) {
    const nome = (row.nome_cliente || "").split(" ")[0] || "Olá"
    const msg = `${nome}, aqui está o link pra você acessar o sistema PMC OS: ${link}`
    const url = `https://wa.me/?text=${encodeURIComponent(msg)}`
    window.open(url, "_blank", "noopener,noreferrer")
  }

  const cards = [
    { title: "Total de Membros", value: metrics.totalAtivos, icon: Users, cls: "text-primary bg-primary/10", desc: "Clientes ativos no programa" },
    { title: "Já Acessaram", value: metrics.jaAcessaram, icon: ShieldCheck, cls: "text-emerald-400 bg-emerald-500/10", desc: "Logaram ao menos 1 vez" },
    { title: "Nunca Acessaram", value: metrics.nuncaAtivos, icon: AlertCircle, cls: "text-red-400 bg-red-500/10", desc: "Ativos sem registro de login" },
    { title: "Ativos (14 dias)", value: metrics.ativos, icon: TrendingUp, cls: "text-emerald-400 bg-emerald-500/10", desc: "Logaram recentemente" },
    { title: "Inativos (>14 dias)", value: metrics.inativos, icon: Clock, cls: "text-orange-400 bg-orange-500/10", desc: "Sumiram do sistema" },
    { title: "Aguardando Acesso", value: metrics.aguardando, icon: Mail, cls: "text-yellow-400 bg-yellow-500/10", desc: "Convite enviado, sem acesso" },
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

  // Lista quem já tem login naquela empresa, para o admin poder trocar o papel.
  async function carregarUsuariosEmpresa(idCliente: string) {
    if (!idCliente) { setUsuariosEmpresa([]); return }
    const { data } = await supabase
      .from("empresa_usuarios")
      .select("auth_user_id, papel")
      .eq("id_cliente", idCliente)
    setUsuariosEmpresa(((data ?? []) as any[]).map((u) => ({ ...u, email: null })))
  }

  async function trocarPapelUsuario(uid: string, papel: string) {
    setSalvandoPapel(uid)
    const { error } = await supabase.from("empresa_usuarios").update({ papel }).eq("auth_user_id", uid)
    if (error) console.error("Erro ao trocar papel:", error.message)
    else setUsuariosEmpresa((prev) => prev.map((u) => (u.auth_user_id === uid ? { ...u, papel } : u)))
    setSalvandoPapel(null)
  }

  async function provisionarUsuario() {
    if (!addUserEmpresa || !addUserEmail.trim()) return
    setAddUserBusy(true)
    setAddUserResult(null)
    try {
      const { data: sess } = await supabase.auth.getSession()
      const res = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/provisionar-login`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${sess.session?.access_token ?? ""}` },
        body: JSON.stringify({ tipo: "empresa_usuario", email: addUserEmail.trim(), id_cliente: addUserEmpresa, papel: addUserPapel, app_url: window.location.origin }),
      })
      const data = await res.json()
      if (!res.ok) setAddUserResult({ ok: false, msg: data.error || "Erro ao provisionar usuário." })
      else {
        // A edge function pode ainda não gravar o papel: garantimos aqui.
        if (data.auth_user_id) {
          await supabase.from("empresa_usuarios").update({ papel: addUserPapel }).eq("auth_user_id", data.auth_user_id)
        }
        setAddUserResult({ ok: true, msg: "Usuário criado. Envie o link de acesso:", link: data.invite_link })
        setAddUserEmail("")
        await carregarUsuariosEmpresa(addUserEmpresa)
      }
    } catch (e: any) {
      setAddUserResult({ ok: false, msg: e.message })
    }
    setAddUserBusy(false)
  }

  return (
    <div className="space-y-10 pb-10">
      <motion.div
        initial={{ opacity: 0, x: -20 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.6 }}
        className="flex flex-col gap-3 border-l-4 border-primary pl-8 py-2"
      >
        <div className="flex items-start justify-between gap-3 flex-wrap">
          <div>
            <h1 className="text-4xl lg:text-5xl font-bold tracking-tight text-foreground">Acessos</h1>
            <div className="flex items-center gap-3 mt-3">
              <Badge variant="outline" className="bg-primary/5 border-primary/20 text-primary">Login & Ativação</Badge>
              <p className="text-muted-foreground font-medium text-sm">Quem realmente está usando o sistema.</p>
            </div>
          </div>
          <button
            onClick={() => { setShowAddUser((v) => !v); setAddUserResult(null) }}
            className="inline-flex items-center gap-2 rounded-xl bg-primary text-primary-foreground px-4 py-2.5 text-[12px] font-bold uppercase tracking-wider hover:opacity-90 transition-opacity"
          >
            + Usuário na empresa
          </button>
        </div>
      </motion.div>

      {showAddUser && (
        <Card className="border-primary/20">
          <CardContent className="p-5 space-y-4">
            <p className="text-[13px] font-semibold text-foreground">Novo login para uma empresa existente</p>
            <div className="grid gap-3 sm:grid-cols-2">
              <select
                value={addUserEmpresa} onChange={(e) => { setAddUserEmpresa(e.target.value); carregarUsuariosEmpresa(e.target.value) }}
                className="rounded-lg bg-card border border-border px-3 py-2 text-[13px] text-foreground"
              >
                <option value="">Selecione a empresa…</option>
                {rows.slice().sort((a, b) => (a.nome_empresa || a.nome_cliente || "").localeCompare(b.nome_empresa || b.nome_cliente || "")).map((r) => (
                  <option key={r.id_cliente} value={r.id_cliente}>{r.nome_empresa || r.nome_cliente || r.id_cliente}</option>
                ))}
              </select>
              <input
                type="email" placeholder="E-mail do novo usuário" value={addUserEmail}
                onChange={(e) => setAddUserEmail(e.target.value)}
                className="rounded-lg bg-card border border-border px-3 py-2 text-[13px] text-foreground"
              />
            </div>
            {/* O papel define só a HOME: o Guardião entra no cockpit do dia,
                os demais na jornada. Todos continuam vendo os mesmos dados. */}
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">Abre o sistema em:</span>
              {PAPEIS_EMPRESA.map((p) => (
                <button
                  key={p.chave}
                  type="button"
                  onClick={() => setAddUserPapel(p.chave)}
                  className={`rounded-lg border px-3 py-1.5 text-[11px] font-bold transition-colors ${
                    addUserPapel === p.chave
                      ? "border-primary/50 bg-primary/10 text-primary"
                      : "border-border text-muted-foreground hover:border-primary/30"
                  }`}
                >
                  {p.label} <span className="font-normal opacity-70">· {p.home}</span>
                </button>
              ))}
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={provisionarUsuario} disabled={addUserBusy || !addUserEmpresa || !addUserEmail.trim()}
                className="rounded-lg bg-primary text-primary-foreground px-4 py-2 text-[12px] font-bold uppercase tracking-wider disabled:opacity-50"
              >
                {addUserBusy ? "Criando…" : "Criar e gerar link"}
              </button>
              <span className="text-[11px] text-muted-foreground">Cria um login extra vinculado à mesma empresa. Todos veem os mesmos dados.</span>
            </div>
            {addUserResult && (
              <div className={`rounded-lg p-3 text-[12px] ${addUserResult.ok ? "bg-primary/10 text-foreground" : "bg-destructive/10 text-destructive"}`}>
                <p className="font-medium">{addUserResult.msg}</p>
                {addUserResult.link && (
                  <input readOnly value={addUserResult.link} onFocus={(e) => e.target.select()}
                    className="mt-2 w-full rounded-md bg-background border border-border px-2 py-1.5 text-[11px] text-muted-foreground font-mono" />
                )}
              </div>
            )}

            {/* Quem já tem login nesta empresa — sem isto, os logins existentes
                ficariam presos no papel padrão para sempre. */}
            {addUserEmpresa && usuariosEmpresa.length > 0 && (
              <div className="border-t border-border pt-4 space-y-2">
                <p className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                  Logins desta empresa ({usuariosEmpresa.length})
                </p>
                {usuariosEmpresa.map((u) => (
                  <div key={u.auth_user_id} className="flex items-center gap-2 flex-wrap rounded-lg bg-muted/20 px-3 py-2">
                    <span className="font-mono text-[11px] text-muted-foreground flex-1 min-w-32 truncate">
                      {u.auth_user_id.slice(0, 8)}…
                    </span>
                    {PAPEIS_EMPRESA.map((p) => (
                      <button
                        key={p.chave}
                        type="button"
                        disabled={salvandoPapel === u.auth_user_id}
                        onClick={() => trocarPapelUsuario(u.auth_user_id, p.chave)}
                        className={`rounded-md border px-2 py-1 text-[10px] font-bold uppercase tracking-wider transition-colors disabled:opacity-50 ${
                          u.papel === p.chave
                            ? "border-primary/50 bg-primary/10 text-primary"
                            : "border-border text-muted-foreground hover:border-primary/30"
                        }`}
                      >
                        {p.label}
                      </button>
                    ))}
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}

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
          <div className="w-full md:w-auto md:min-w-[200px]">
            <Select value={csFilter} onValueChange={setCsFilter}>
              <SelectTrigger className="h-12 bg-background border-border focus:border-primary/50">
                <SelectValue placeholder="Filtrar por CS" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os CS</SelectItem>
                {csOptions.lista.map(cs => (
                  <SelectItem key={cs} value={cs}>{cs}</SelectItem>
                ))}
                {csOptions.temSemCs && <SelectItem value="__sem">Sem CS atribuído</SelectItem>}
              </SelectContent>
            </Select>
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
              <TableHead className="text-muted-foreground font-bold uppercase tracking-widest text-[10px] py-5 px-4 w-[40%]">Membro</TableHead>
              <TableHead className="text-muted-foreground font-bold uppercase tracking-widest text-[10px] py-5 px-3 w-[22%] hidden md:table-cell">CS / Status</TableHead>
              <TableHead className="text-muted-foreground font-bold uppercase tracking-widest text-[10px] py-5 px-3 w-[20%] hidden lg:table-cell">Datas</TableHead>
              <TableHead className="text-muted-foreground font-bold uppercase tracking-widest text-[10px] py-5 px-3 text-right pr-4 w-[18%]">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.length === 0 && (
              <TableRow>
                <TableCell colSpan={4} className="text-center py-16 text-muted-foreground text-sm">
                  Nenhum membro encontrado com esses filtros.
                </TableCell>
              </TableRow>
            )}
            {filtered.map(row => (
              <TableRow key={row.id_entrada} className="hover:bg-primary/5 border-b border-border/30 transition-colors">
                <TableCell className="py-4 px-4">
                  <div className="flex flex-col gap-0.5 min-w-0">
                    <span className="font-bold text-sm text-foreground truncate">{row.nome_cliente || "—"}</span>
                    <span className="text-[11px] text-muted-foreground truncate">{row.nome_empresa || "—"}</span>
                    {row.email ? (
                      <a href={`mailto:${row.email}`} className="text-[11px] text-muted-foreground/80 hover:text-primary transition-colors truncate mt-0.5">
                        {row.email}
                      </a>
                    ) : null}
                  </div>
                </TableCell>
                <TableCell className="px-3 hidden md:table-cell">
                  <div className="flex flex-col gap-1.5 min-w-0">
                    {row.sc ? (
                      <div className="flex items-center gap-2">
                        <div className="size-6 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center text-[10px] font-bold text-primary shrink-0">
                          {row.sc.substring(0, 1)}
                        </div>
                        <span className="text-[11px] font-semibold text-foreground truncate">{row.sc}</span>
                      </div>
                    ) : (
                      <span className="text-xs text-muted-foreground">—</span>
                    )}
                    {row.status_atual ? (
                      <Badge
                        variant="outline"
                        className={`rounded-md px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider max-w-full truncate inline-block w-fit ${
                          row.status_atual.toLowerCase().includes("ativo")
                            ? "border-primary/30 text-primary bg-primary/10"
                            : "border-border text-muted-foreground bg-muted/20"
                        }`}
                      >
                        {row.status_atual}
                      </Badge>
                    ) : null}
                  </div>
                </TableCell>
                <TableCell className="px-3 hidden lg:table-cell">
                  <div className="flex flex-col gap-0.5 text-[11px]">
                    <div className="flex items-baseline gap-1.5">
                      <span className="text-muted-foreground/70 font-semibold uppercase tracking-wider text-[9px]">Cadastro</span>
                      <span className="text-muted-foreground">{formatDate(row.data_cadastro_formulario)}</span>
                    </div>
                    <div className="flex items-baseline gap-1.5">
                      <span className="text-muted-foreground/70 font-semibold uppercase tracking-wider text-[9px]">Acesso</span>
                      <span className={`font-semibold ${lastAccessClass(row.last_sign_in_at)}`}>
                        {formatRelativeTime(row.last_sign_in_at)}
                      </span>
                    </div>
                  </div>
                </TableCell>
                <TableCell className="px-3 text-right pr-4">
                  <div className="flex items-center justify-end gap-2">
                    {row.qtd_convites_reenviados > 0 && (
                      <Badge
                        variant="outline"
                        className="rounded-md px-2 py-0.5 text-[10px] font-bold bg-muted/30"
                        title={`${row.qtd_convites_reenviados} convite(s) reenviado(s)`}
                      >
                        {row.qtd_convites_reenviados}×
                      </Badge>
                    )}
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={!row.email || resendingId === row.id_cliente}
                      onClick={() => setConfirmRow(row)}
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

      <Dialog open={!!confirmRow} onOpenChange={(o) => { if (!o) setConfirmRow(null) }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Reenviar link de acesso?</DialogTitle>
            <DialogDescription>
              Um novo link de definição de senha será gerado e enviado para{" "}
              <span className="font-semibold text-foreground">{confirmRow?.email || "—"}</span>.
              {confirmRow?.nome_cliente && (
                <>
                  {" "}Cliente: <span className="font-semibold text-foreground">{confirmRow.nome_cliente}</span>.
                </>
              )}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 sm:gap-2">
            <Button variant="outline" onClick={() => setConfirmRow(null)} disabled={resendingId === confirmRow?.id_cliente}>
              Cancelar
            </Button>
            <Button onClick={confirmResend} disabled={resendingId === confirmRow?.id_cliente} className="gap-2">
              <Mail className="size-4" />
              {resendingId === confirmRow?.id_cliente ? "Enviando..." : "Confirmar e reenviar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!inviteResult} onOpenChange={(o) => { if (!o) setInviteResult(null) }}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <ShieldCheck className="size-5 text-primary" />
              Link gerado com sucesso
            </DialogTitle>
            <DialogDescription>
              Envie o link abaixo para{" "}
              <span className="font-semibold text-foreground">{inviteResult?.row.nome_cliente || inviteResult?.row.email}</span>{" "}
              definir a senha e acessar o sistema.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3">
            <div className="rounded-xl border border-border bg-muted/30 p-3 break-all text-xs font-mono text-foreground">
              {inviteResult?.link}
            </div>

            <div className="flex flex-col sm:flex-row gap-2">
              <Button
                variant="outline"
                className="flex-1 gap-2"
                onClick={() => inviteResult && copyLinkToClipboard(inviteResult.link)}
              >
                <Copy className="size-4" />
                {linkCopied ? "Copiado!" : "Copiar link"}
              </Button>
              <Button
                className="flex-1 gap-2 bg-emerald-500 hover:bg-emerald-600 text-white"
                onClick={() => inviteResult && shareOnWhatsApp(inviteResult.row, inviteResult.link)}
              >
                <MessageCircle className="size-4" />
                Enviar no WhatsApp
              </Button>
            </div>
          </div>

          <DialogFooter>
            <Button variant="ghost" onClick={() => setInviteResult(null)}>Fechar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
