import { Fragment, useEffect, useMemo, useRef, useState } from "react"
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
  ChevronDownIcon as ChevronDown,
  ChevronRightIcon as ChevronRight,
  Trash2Icon as Trash2,
  SendIcon as Send,
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

// Um login (acesso) de uma empresa — retornado por get_empresa_acessos.
// Cada empresa (id_cliente) pode ter N: 1 principal (dono) + N vinculados.
interface LoginRow {
  id_cliente: string
  auth_user_id: string
  email: string | null
  papel: string | null
  tipo: "principal" | "vinculado"
  last_sign_in_at: string | null
  criado_em: string | null
}

// Linha da tabela já resolvida no nível da EMPRESA: uma empresa pode ter vários
// logins (dono + colaborador + guardião), então o que vale é o acesso mais
// recente de qualquer um deles — não o do dono.
interface AccessRowCalc extends AccessRow {
  ultimo_acesso: string | null
  ultimo_acesso_por: LoginRow | null
  tem_login: boolean
}

type TabKey = "todos" | "nunca" | "ativos" | "inativos" | "aguardando"

// Escopo da tela: por padrão só quem está ativo no programa. Cliente cancelado
// ou congelado continua tendo login, então "Todos os status" segue disponível
// pra achar (e revogar) o acesso de quem saiu.
type EscopoKey = "ativos" | "todos"

function papelLabel(login: LoginRow): string {
  if (login.tipo === "principal") return "Dono"
  const p = (login.papel || "").toLowerCase()
  if (p.includes("guard")) return "Guardião"
  if (p === "colaborador" || !p) return "Colaborador"
  return login.papel as string
}

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
  const [addUserLinkCopied, setAddUserLinkCopied] = useState(false)
  // Busca da empresa por nome ou código (substitui o <select> com ~300 opções).
  const [empresaBusca, setEmpresaBusca] = useState("")
  const [empresaAberta, setEmpresaAberta] = useState(false)
  const [codigosByCliente, setCodigosByCliente] = useState<Map<string, number>>(new Map())
  const empresaBoxRef = useRef<HTMLDivElement>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [search, setSearch] = useState("")
  const [activeTab, setActiveTab] = useState<TabKey>("todos")
  const [csFilter, setCsFilter] = useState<string>("all")
  const [escopo, setEscopo] = useState<EscopoKey>("ativos")
  const [resendingId, setResendingId] = useState<string | null>(null)
  const [toast, setToast] = useState<{ type: "ok" | "err"; msg: string } | null>(null)
  const [confirmRow, setConfirmRow] = useState<AccessRow | null>(null)
  const [inviteResult, setInviteResult] = useState<{ row: AccessRow; link: string } | null>(null)
  const [linkCopied, setLinkCopied] = useState(false)
  // Logins (acessos) por empresa — Fase 2 multiusuário.
  const [loginsByCliente, setLoginsByCliente] = useState<Map<string, LoginRow[]>>(new Map())
  const [expanded, setExpanded] = useState<Set<string>>(new Set())
  const [confirmRemover, setConfirmRemover] = useState<{ login: LoginRow; row: AccessRow } | null>(null)
  const [removingId, setRemovingId] = useState<string | null>(null)
  const [resendingLoginId, setResendingLoginId] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    async function load() {
      const [overview, acessos, codigos] = await Promise.all([
        supabase.rpc("get_client_access_overview"),
        supabase.rpc("get_empresa_acessos"),
        // A RPC de overview não devolve codigo_cliente, e é por ele que o admin
        // busca a empresa ao adicionar um login.
        supabase.from("clientes_entrada_new").select("id_cliente, codigo_cliente"),
      ])
      if (cancelled) return
      if (overview.error) {
        console.error("get_client_access_overview error:", overview.error)
        setError(overview.error.message || "Erro ao carregar dados de acesso")
        setLoading(false)
        return
      }
      setRows((overview.data as AccessRow[]) ?? [])
      if (codigos.error) {
        // Não bloqueia: a busca por nome da empresa continua funcionando.
        console.error("codigo_cliente error:", codigos.error)
      } else {
        const mapCod = new Map<string, number>()
        for (const c of ((codigos.data ?? []) as { id_cliente: string; codigo_cliente: number | null }[])) {
          if (c.id_cliente && c.codigo_cliente != null) mapCod.set(c.id_cliente, c.codigo_cliente)
        }
        setCodigosByCliente(mapCod)
      }
      if (acessos.error) {
        // Não bloqueia a tela: só perde a contagem/expansão de logins.
        console.error("get_empresa_acessos error:", acessos.error)
      } else {
        const map = new Map<string, LoginRow[]>()
        for (const l of (acessos.data as LoginRow[]) ?? []) {
          const arr = map.get(l.id_cliente) ?? []
          arr.push(l)
          map.set(l.id_cliente, arr)
        }
        // Ordena: principal (dono) primeiro, depois por criação.
        for (const arr of map.values()) {
          arr.sort((a, b) => {
            if (a.tipo !== b.tipo) return a.tipo === "principal" ? -1 : 1
            const at = a.criado_em ? new Date(a.criado_em).getTime() : 0
            const bt = b.criado_em ? new Date(b.criado_em).getTime() : 0
            return at - bt
          })
        }
        setLoginsByCliente(map)
      }
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

  // Universo da tela. Tudo daqui pra baixo (cards, abas, filtro de CS, tabela e
  // o "mostrando X de Y") sai desta lista — antes os cards contavam só ativos e
  // as abas contavam o cadastro inteiro, então os números não fechavam.
  const rowsEscopo = useMemo(
    () => (escopo === "ativos" ? rows.filter(r => isStatusAtivo(r.status_atual)) : rows),
    [rows, escopo],
  )

  // Acesso efetivo da empresa = o login mais recente entre todos os dela.
  // Fallback pro login do dono (o que a RPC de overview devolve) quando o mapa
  // de logins não veio: get_empresa_acessos é carregado em modo "não bloqueia a
  // tela", e sem o fallback uma falha dela zeraria todas as datas.
  const rowsCalc = useMemo<AccessRowCalc[]>(() => {
    return rowsEscopo.map(r => {
      const logins = loginsByCliente.get(r.id_cliente) ?? []
      let melhor: LoginRow | null = null
      for (const l of logins) {
        if (!l.last_sign_in_at) continue
        if (!melhor || new Date(l.last_sign_in_at).getTime() > new Date(melhor.last_sign_in_at!).getTime()) melhor = l
      }
      return {
        ...r,
        ultimo_acesso: melhor?.last_sign_in_at ?? (logins.length > 0 ? null : r.last_sign_in_at),
        ultimo_acesso_por: melhor,
        tem_login: logins.length > 0 || r.tem_auth_user,
      }
    })
  }, [rowsEscopo, loginsByCliente])

  const metrics = useMemo(() => {
    const now = Date.now()
    const total = rowsCalc.length
    let jaAcessaram = 0
    let nunca = 0
    let ativos = 0
    let inativos = 0
    let aguardando = 0
    for (const r of rowsCalc) {
      if (r.ultimo_acesso) {
        jaAcessaram++
        const diff = now - new Date(r.ultimo_acesso).getTime()
        if (diff <= THRESHOLD_ATIVO) ativos++
        else inativos++
      } else {
        nunca++
        if (r.tem_login) aguardando++
      }
    }
    return { total, jaAcessaram, nunca, ativos, inativos, aguardando }
  }, [rowsCalc])

  const csOptions = useMemo(() => {
    const set = new Set<string>()
    let temSemCs = false
    for (const r of rowsCalc) {
      if (r.sc && r.sc.trim()) set.add(r.sc.trim())
      else temSemCs = true
    }
    const arr = Array.from(set).sort((a, b) => a.localeCompare(b, "pt-BR"))
    return { lista: arr, temSemCs }
  }, [rowsCalc])

  const filtered = useMemo(() => {
    const now = Date.now()
    let list = rowsCalc
    if (activeTab === "nunca") list = list.filter(r => !r.ultimo_acesso)
    else if (activeTab === "ativos") list = list.filter(r => r.ultimo_acesso && (now - new Date(r.ultimo_acesso).getTime()) <= THRESHOLD_ATIVO)
    else if (activeTab === "inativos") list = list.filter(r => r.ultimo_acesso && (now - new Date(r.ultimo_acesso).getTime()) > THRESHOLD_ATIVO)
    else if (activeTab === "aguardando") list = list.filter(r => r.tem_login && !r.ultimo_acesso)

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
      const aT = a.ultimo_acesso ? new Date(a.ultimo_acesso).getTime() : 0
      const bT = b.ultimo_acesso ? new Date(b.ultimo_acesso).getTime() : 0
      return bT - aT
    })
  }, [rowsCalc, activeTab, search, csFilter])

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

  async function copyLinkToClipboard(link: string, alvo: "convite" | "addUser" = "convite") {
    try {
      await navigator.clipboard.writeText(link)
      // O diálogo de reenvio e o bloco de novo usuário podem estar abertos ao
      // mesmo tempo — cada um acende o seu próprio "Copiado!".
      const acender = alvo === "addUser" ? setAddUserLinkCopied : setLinkCopied
      acender(true)
      setTimeout(() => acender(false), 2500)
    } catch {
      setToast({ type: "err", msg: "Não foi possível copiar o link" })
    }
  }

  // Empresas que batem com o texto digitado: nome da empresa, nome do
  // responsável ou código do cliente (mesmo critério da Gestão de Clientes).
  const empresasFiltradas = useMemo(() => {
    const q = empresaBusca.trim().toLowerCase()
    if (!q) return [] as AccessRow[]
    return rows
      .filter((r) => {
        const cod = codigosByCliente.get(r.id_cliente)
        return (
          (r.nome_empresa || "").toLowerCase().includes(q) ||
          (r.nome_cliente || "").toLowerCase().includes(q) ||
          (cod != null && String(cod).includes(q))
        )
      })
      .sort((a, b) => (a.nome_empresa || a.nome_cliente || "").localeCompare(b.nome_empresa || b.nome_cliente || ""))
      .slice(0, 8)
  }, [rows, empresaBusca, codigosByCliente])

  const empresaSelecionada = useMemo(
    () => rows.find((r) => r.id_cliente === addUserEmpresa) ?? null,
    [rows, addUserEmpresa],
  )

  function selecionarEmpresa(r: AccessRow) {
    setAddUserEmpresa(r.id_cliente)
    setEmpresaBusca("")
    setEmpresaAberta(false)
    carregarUsuariosEmpresa(r.id_cliente)
  }

  useEffect(() => {
    if (!empresaAberta) return
    function onClickFora(e: MouseEvent) {
      if (empresaBoxRef.current && !empresaBoxRef.current.contains(e.target as Node)) setEmpresaAberta(false)
    }
    function onEsc(e: KeyboardEvent) {
      if (e.key === "Escape") setEmpresaAberta(false)
    }
    document.addEventListener("mousedown", onClickFora)
    document.addEventListener("keydown", onEsc)
    return () => {
      document.removeEventListener("mousedown", onClickFora)
      document.removeEventListener("keydown", onEsc)
    }
  }, [empresaAberta])

  function shareOnWhatsApp(row: AccessRow, link: string) {
    const nome = (row.nome_cliente || "").split(" ")[0] || "Olá"
    const msg = `${nome}, aqui está o link pra você acessar o sistema PMC OS: ${link}`
    const url = `https://wa.me/?text=${encodeURIComponent(msg)}`
    window.open(url, "_blank", "noopener,noreferrer")
  }

  function toggleExpand(idCliente: string) {
    setExpanded(prev => {
      const next = new Set(prev)
      if (next.has(idCliente)) next.delete(idCliente)
      else next.add(idCliente)
      return next
    })
  }

  async function callGerenciarAcesso(login: LoginRow, acao: "remover" | "reenviar") {
    const { data: { session } } = await supabase.auth.getSession()
    const accessToken = session?.access_token
    if (!accessToken) throw new Error("Sessão expirada. Faça login novamente.")
    const resp = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/gerenciar-acesso`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${accessToken}`,
        "apikey": import.meta.env.VITE_SUPABASE_ANON_KEY,
      },
      body: JSON.stringify({
        acao,
        auth_user_id: login.auth_user_id,
        id_cliente: login.id_cliente,
        app_url: window.location.origin,
      }),
    })
    const data = await resp.json()
    if (!resp.ok) throw new Error(data.error || `Erro ${resp.status}`)
    return data
  }

  async function removerAcesso() {
    const alvo = confirmRemover
    if (!alvo) return
    setRemovingId(alvo.login.auth_user_id)
    try {
      await callGerenciarAcesso(alvo.login, "remover")
      setLoginsByCliente(prev => {
        const next = new Map(prev)
        const arr = (next.get(alvo.login.id_cliente) ?? []).filter(l => l.auth_user_id !== alvo.login.auth_user_id)
        next.set(alvo.login.id_cliente, arr)
        return next
      })
      setConfirmRemover(null)
      setToast({ type: "ok", msg: "Acesso removido com sucesso" })
    } catch (e: any) {
      setToast({ type: "err", msg: e.message || "Erro ao remover acesso" })
    } finally {
      setRemovingId(null)
    }
  }

  async function reenviarAcesso(login: LoginRow, row: AccessRow) {
    setResendingLoginId(login.auth_user_id)
    try {
      const data = await callGerenciarAcesso(login, "reenviar")
      if (data.invite_link) {
        setInviteResult({ row, link: data.invite_link })
        setLinkCopied(false)
      } else {
        setToast({ type: "ok", msg: data.message || "Link gerado" })
      }
    } catch (e: any) {
      setToast({ type: "err", msg: e.message || "Erro ao reenviar link" })
    } finally {
      setResendingLoginId(null)
    }
  }

  const descEscopo = escopo === "ativos" ? "entre os ativos no programa" : "entre todos os cadastrados"

  const cards = [
    { title: "Total de Membros", value: metrics.total, icon: Users, cls: "text-primary bg-primary/10", desc: escopo === "ativos" ? "Clientes ativos no programa" : "Todos os clientes cadastrados" },
    { title: "Já Acessaram", value: metrics.jaAcessaram, icon: ShieldCheck, cls: "text-emerald-400 bg-emerald-500/10", desc: `Logaram ao menos 1 vez ${descEscopo}` },
    { title: "Nunca Acessaram", value: metrics.nunca, icon: AlertCircle, cls: "text-red-400 bg-red-500/10", desc: `Sem registro de login ${descEscopo}` },
    { title: "Ativos (14 dias)", value: metrics.ativos, icon: TrendingUp, cls: "text-emerald-400 bg-emerald-500/10", desc: "Logaram recentemente" },
    { title: "Inativos (>14 dias)", value: metrics.inativos, icon: Clock, cls: "text-orange-400 bg-orange-500/10", desc: "Sumiram do sistema" },
    { title: "Aguardando Acesso", value: metrics.aguardando, icon: Mail, cls: "text-yellow-400 bg-yellow-500/10", desc: "Convite enviado, sem acesso" },
  ]

  const tabs: { key: TabKey; label: string; count: number }[] = [
    { key: "todos", label: "Todos", count: metrics.total },
    { key: "nunca", label: "Nunca acessaram", count: metrics.nunca },
    { key: "ativos", label: "Ativos (14d)", count: metrics.ativos },
    { key: "inativos", label: "Inativos (>14d)", count: metrics.inativos },
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
    // Escopado à empresa: um mesmo login pode estar vinculado a mais de uma
    // (emails_multi_empresa), e sem o filtro o papel mudaria em todas elas.
    const { error } = await supabase.from("empresa_usuarios").update({ papel })
      .eq("auth_user_id", uid).eq("id_cliente", addUserEmpresa)
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
        // A edge function não grava o papel para empresa_usuario: garantimos aqui.
        // (Antes se lia `data.auth_user_id`, campo que a função nunca devolveu —
        // o papel escolhido não chegava ao banco.) Escopado à empresa.
        if (data.user_id) {
          await supabase.from("empresa_usuarios").update({ papel: addUserPapel })
            .eq("auth_user_id", data.user_id).eq("id_cliente", addUserEmpresa)
        }
        // E-mail que já tinha login: foi VINCULADO a esta empresa, sem convite —
        // a senha atual dele continua valendo, então não há link a copiar.
        setAddUserResult(
          data.vinculado_existente
            ? { ok: true, msg: data.message }
            : { ok: true, msg: "Usuário criado. Envie o link de acesso:", link: data.invite_link },
        )
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
              {/* Busca por nome ou código em vez de um <select> com ~300 opções.
                  O código aparece em cada resultado para conferir antes de escolher. */}
              <div ref={empresaBoxRef} className="relative">
                {empresaSelecionada ? (
                  <div className="flex items-center gap-2 rounded-lg bg-card border border-primary/40 px-3 py-2">
                    <div className="min-w-0 flex-1">
                      <p className="text-[13px] font-semibold text-foreground truncate">
                        {empresaSelecionada.nome_empresa || empresaSelecionada.nome_cliente || "—"}
                      </p>
                      <p className="text-[11px] text-muted-foreground truncate">
                        {codigosByCliente.get(empresaSelecionada.id_cliente) != null && (
                          <span className="font-medium">Cód. {codigosByCliente.get(empresaSelecionada.id_cliente)} · </span>
                        )}
                        {empresaSelecionada.nome_cliente || "—"}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => { setAddUserEmpresa(""); setUsuariosEmpresa([]); setEmpresaBusca(""); setEmpresaAberta(true) }}
                      className="shrink-0 rounded-md border border-border px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-muted-foreground hover:text-foreground hover:border-primary/30 transition-colors"
                    >
                      Trocar
                    </button>
                  </div>
                ) : (
                  <input
                    type="text"
                    autoComplete="off"
                    placeholder="Buscar empresa por nome ou código…"
                    value={empresaBusca}
                    onChange={(e) => { setEmpresaBusca(e.target.value); setEmpresaAberta(true) }}
                    onFocus={() => setEmpresaAberta(true)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && empresasFiltradas.length > 0) {
                        e.preventDefault()
                        selecionarEmpresa(empresasFiltradas[0])
                      }
                    }}
                    className="w-full rounded-lg bg-card border border-border px-3 py-2 text-[13px] text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary/50"
                  />
                )}

                {empresaAberta && !empresaSelecionada && empresaBusca.trim() && (
                  <div className="absolute z-50 mt-1 w-full max-h-64 overflow-y-auto rounded-xl border border-border bg-card/95 backdrop-blur-xl shadow-2xl py-1">
                    {empresasFiltradas.length === 0 ? (
                      <p className="px-3 py-2.5 text-[12px] text-muted-foreground">Nenhuma empresa encontrada.</p>
                    ) : (
                      empresasFiltradas.map((r) => {
                        const cod = codigosByCliente.get(r.id_cliente)
                        return (
                          <button
                            key={r.id_cliente}
                            type="button"
                            onMouseDown={(e) => e.preventDefault()}
                            onClick={() => selecionarEmpresa(r)}
                            className="w-full flex items-center gap-3 px-3 py-2 text-left hover:bg-primary/10 transition-colors"
                          >
                            <span className="min-w-0 flex-1">
                              <span className="block text-[13px] font-semibold text-foreground truncate">
                                {r.nome_empresa || r.nome_cliente || "—"}
                              </span>
                              <span className="block text-[11px] text-muted-foreground truncate">{r.nome_cliente || "—"}</span>
                            </span>
                            {cod != null && (
                              <span className="shrink-0 rounded-md bg-muted/40 px-2 py-0.5 text-[10px] font-bold tabular-nums text-muted-foreground">
                                Cód. {cod}
                              </span>
                            )}
                          </button>
                        )
                      })
                    )}
                  </div>
                )}
              </div>
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
                  <div className="mt-2 flex flex-col sm:flex-row gap-2">
                    <input readOnly value={addUserResult.link} onFocus={(e) => e.target.select()}
                      className="flex-1 rounded-md bg-background border border-border px-2 py-1.5 text-[11px] text-muted-foreground font-mono" />
                    <button
                      type="button"
                      onClick={() => copyLinkToClipboard(addUserResult.link!, "addUser")}
                      className={`shrink-0 inline-flex items-center justify-center gap-1.5 rounded-md border px-3 py-1.5 text-[11px] font-bold uppercase tracking-wider transition-colors ${
                        addUserLinkCopied
                          ? "border-primary/50 bg-primary/10 text-primary"
                          : "border-border text-foreground hover:border-primary/40"
                      }`}
                    >
                      <Copy className="size-3.5" />
                      {addUserLinkCopied ? "Link copiado!" : "Copiar link"}
                    </button>
                  </div>
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
          <div className="w-full md:w-auto md:min-w-[210px]">
            <Select value={escopo} onValueChange={(v) => setEscopo(v as EscopoKey)}>
              <SelectTrigger className="h-12 bg-background border-border focus:border-primary/50">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ativos">Ativos no programa</SelectItem>
                <SelectItem value="todos">Todos os status</SelectItem>
              </SelectContent>
            </Select>
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
            {filtered.map(row => {
              const logins = loginsByCliente.get(row.id_cliente) ?? []
              const isOpen = expanded.has(row.id_cliente)
              return (
              <Fragment key={row.id_entrada}>
              <TableRow className="hover:bg-primary/5 border-b border-border/30 transition-colors">
                <TableCell className="py-4 px-4">
                  <div className="flex items-start gap-2 min-w-0">
                    {logins.length > 0 && (
                      <button
                        onClick={() => toggleExpand(row.id_cliente)}
                        className="mt-0.5 shrink-0 text-muted-foreground hover:text-primary transition-colors"
                        title={isOpen ? "Ocultar acessos" : "Ver acessos da empresa"}
                      >
                        {isOpen ? <ChevronDown className="size-4" /> : <ChevronRight className="size-4" />}
                      </button>
                    )}
                    <div className="flex flex-col gap-0.5 min-w-0">
                      <div className="flex items-center gap-2 min-w-0">
                        <span className="font-bold text-sm text-foreground truncate">{row.nome_cliente || "—"}</span>
                        {logins.length > 0 && (
                          <button
                            onClick={() => toggleExpand(row.id_cliente)}
                            title="Ver acessos da empresa"
                          >
                            <Badge
                              variant="outline"
                              className={`shrink-0 rounded-md px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider gap-1 cursor-pointer ${
                                logins.length >= 2
                                  ? "border-primary/30 text-primary bg-primary/10"
                                  : "border-border text-muted-foreground bg-muted/20"
                              }`}
                            >
                              <Users className="size-2.5" />
                              {logins.length} {logins.length === 1 ? "acesso" : "acessos"}
                            </Badge>
                          </button>
                        )}
                      </div>
                      <span className="text-[11px] text-muted-foreground truncate">{row.nome_empresa || "—"}</span>
                      {row.email ? (
                        <a href={`mailto:${row.email}`} className="text-[11px] text-muted-foreground/80 hover:text-primary transition-colors truncate mt-0.5">
                          {row.email}
                        </a>
                      ) : null}
                    </div>
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
                      <span className={`font-semibold ${lastAccessClass(row.ultimo_acesso)}`}>
                        {formatRelativeTime(row.ultimo_acesso)}
                      </span>
                      {/* Quando quem acessou por último não é o dono, dizer de quem
                          é a data — senão a empresa aparece ativa sem explicação. */}
                      {row.ultimo_acesso_por && row.ultimo_acesso_por.tipo !== "principal" && (
                        <span className="text-muted-foreground">· {papelLabel(row.ultimo_acesso_por)}</span>
                      )}
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
              {isOpen && (
                <TableRow className="border-b border-border/30 bg-muted/10 hover:bg-muted/10">
                  <TableCell colSpan={4} className="py-3 px-4">
                    <div className="flex flex-col gap-2">
                      <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                        Acessos desta empresa ({logins.length})
                      </span>
                      {logins.map(login => (
                        <div
                          key={login.auth_user_id}
                          className="flex flex-wrap items-center gap-3 rounded-lg border border-border/50 bg-background/60 px-3 py-2"
                        >
                          <Badge
                            variant="outline"
                            className={`shrink-0 rounded-md px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider ${
                              login.tipo === "principal"
                                ? "border-primary/30 text-primary bg-primary/10"
                                : "border-border text-muted-foreground bg-muted/20"
                            }`}
                          >
                            {papelLabel(login)}
                          </Badge>
                          <span className="text-[12px] font-medium text-foreground truncate min-w-0 flex-1">
                            {login.email || "—"}
                          </span>
                          <span className={`text-[11px] font-semibold shrink-0 ${lastAccessClass(login.last_sign_in_at)}`}>
                            {formatRelativeTime(login.last_sign_in_at)}
                          </span>
                          {login.tipo === "vinculado" ? (
                            confirmRemover?.login.auth_user_id === login.auth_user_id ? (
                              <div className="flex items-center gap-2 shrink-0">
                                <span className="text-[11px] text-muted-foreground">Excluir de vez?</span>
                                <Button
                                  variant="destructive"
                                  size="sm"
                                  disabled={removingId === login.auth_user_id}
                                  onClick={removerAcesso}
                                  className="h-7 px-2.5 rounded-lg text-[10px] font-bold uppercase tracking-wider"
                                >
                                  {removingId === login.auth_user_id ? "Excluindo..." : "Sim, excluir"}
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  disabled={removingId === login.auth_user_id}
                                  onClick={() => setConfirmRemover(null)}
                                  className="h-7 px-2.5 rounded-lg text-[10px] font-bold uppercase tracking-wider"
                                >
                                  Cancelar
                                </Button>
                              </div>
                            ) : (
                              <div className="flex items-center gap-2 shrink-0">
                                <Button
                                  variant="outline"
                                  size="sm"
                                  disabled={resendingLoginId === login.auth_user_id}
                                  onClick={() => reenviarAcesso(login, row)}
                                  className="h-7 px-2.5 rounded-lg text-[10px] font-bold uppercase tracking-wider gap-1.5"
                                  title="Gerar novo link de acesso"
                                >
                                  <Send className="size-3" />
                                  {resendingLoginId === login.auth_user_id ? "Gerando..." : "Reenviar"}
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => setConfirmRemover({ login, row })}
                                  className="h-7 px-2.5 rounded-lg text-[10px] font-bold uppercase tracking-wider gap-1.5 text-destructive hover:text-destructive hover:bg-destructive/10"
                                  title="Excluir este acesso"
                                >
                                  <Trash2 className="size-3" />
                                  Excluir
                                </Button>
                              </div>
                            )
                          ) : (
                            <span className="text-[10px] text-muted-foreground shrink-0 italic">login principal</span>
                          )}
                        </div>
                      ))}
                    </div>
                  </TableCell>
                </TableRow>
              )}
              </Fragment>
              )
            })}
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
