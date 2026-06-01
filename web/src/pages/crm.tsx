import { useEffect, useMemo, useState } from "react"
import { supabase } from "@/lib/supabase"
import { motion } from "framer-motion"
import {
  Users,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  TrendingUp,
  TrendingDown,
  HeartPulse,
  Heart,
  Bell,
  Trophy,
  CalendarClock,
  Flame,
  Cloud,
  Snowflake,
  CircleDashed,
  Bot,
  Activity,
  Zap,
  Clock,
  MessageSquare,
  PhoneCall,
  ArrowLeftRight,
  ListChecks,
  PauseCircle,
  type LucideIcon,
} from "lucide-react"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Button } from "@/components/ui/button"
import { getPeriodRange, PERIOD_LABELS, type PeriodPreset } from "@/lib/funis"

// ── Tipos das tabelas ────────────────────────────────────────────────
interface ClientRow {
  id_cliente: string
  status_atual: string | null
  nivel_engajamento: string | null
  temperatura_cliente: string | null
  saude_cliente: string | null
  em_risco_cancelamento: boolean | null
  tem_guardiao_ia: string | null
  renovacao_data: string | null
  sc: string | null
  blackcrm_tem_vitorias: string | null
}

interface AtividadeRow {
  id_cliente: string
  tipo: string | null
  status: string | null
  prazo: string | null
  responsavel_cs: string | null
  created_at: string
  updated_at: string
}

// Mapeamento best-guess do campo `tipo` (constantes em tab-atividades.tsx).
// Ajuste aqui se quiser recategorizar Contatos/Follow-ups.
const TIPO_GROUPS = {
  contatos: ["follow_up_whatsapp", "cobrar_resposta", "enviar_proximos_passos", "confirmar_reuniao"],
  followups: ["follow_up_whatsapp"],
}

const PERIODS: PeriodPreset[] = ["today", "this_week", "this_month", "last_30"]
const SEM_CS = "__sem"
const DAY = 24 * 60 * 60 * 1000

// ── Tons de cor dos cards ────────────────────────────────────────────
type Tone = "default" | "green" | "red" | "yellow" | "orange" | "blue" | "primary" | "zinc"

const TONE: Record<Tone, { num: string; pill: string }> = {
  default: { num: "text-foreground", pill: "bg-muted/40 text-muted-foreground" },
  green: { num: "text-emerald-400", pill: "bg-emerald-500/10 text-emerald-400" },
  red: { num: "text-red-400", pill: "bg-red-500/10 text-red-400" },
  yellow: { num: "text-yellow-400", pill: "bg-yellow-500/10 text-yellow-400" },
  orange: { num: "text-orange-400", pill: "bg-orange-500/10 text-orange-400" },
  blue: { num: "text-blue-400", pill: "bg-blue-500/10 text-blue-400" },
  primary: { num: "text-primary", pill: "bg-primary/10 text-primary" },
  zinc: { num: "text-zinc-400", pill: "bg-zinc-500/10 text-zinc-400" },
}

function StatCard({
  icon: Icon,
  value,
  label,
  tone = "default",
}: {
  icon: LucideIcon
  value: number
  label: string
  tone?: Tone
}) {
  const t = TONE[tone]
  return (
    <div className="rounded-xl border border-border/60 bg-card/40 p-4 transition-colors hover:bg-card/60">
      <div className="flex items-center gap-3">
        <div className={`flex size-9 shrink-0 items-center justify-center rounded-lg ${t.pill}`}>
          <Icon className="size-4" />
        </div>
        <div className="min-w-0">
          <div className={`text-2xl font-bold leading-none tracking-tight ${t.num}`}>{value}</div>
          <div className="mt-1 text-[11px] font-medium text-muted-foreground truncate">{label}</div>
        </div>
      </div>
    </div>
  )
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <div className="text-[11px] font-bold uppercase tracking-[0.25em] text-primary mb-3">
      {children}
    </div>
  )
}

function inRange(iso: string | null, from: Date | null, to: Date | null): boolean {
  if (!iso) return false
  if (!from || !to) return true // 'all'
  const t = new Date(iso).getTime()
  if (Number.isNaN(t)) return false
  return t >= from.getTime() && t < to.getTime() + DAY
}

export default function CRMPage() {
  const [clients, setClients] = useState<ClientRow[]>([])
  const [atividades, setAtividades] = useState<AtividadeRow[]>([])
  const [vitoriaIds, setVitoriaIds] = useState<Set<string>>(new Set())
  const [loading, setLoading] = useState(true)
  const [period, setPeriod] = useState<PeriodPreset>("this_week")
  const [csFilter, setCsFilter] = useState<string>("all")

  useEffect(() => {
    let cancelled = false
    async function load() {
      const [cliRes, atvRes, vitRes] = await Promise.all([
        supabase
          .from("clientes_entrada_new")
          .select(
            "id_cliente, status_atual, nivel_engajamento, temperatura_cliente, saude_cliente, em_risco_cancelamento, tem_guardiao_ia, renovacao_data, sc, blackcrm_tem_vitorias",
          ),
        supabase
          .from("cliente_atividades")
          .select("id_cliente, tipo, status, prazo, responsavel_cs, created_at, updated_at"),
        supabase.from("cliente_vitorias").select("id_cliente"),
      ])

      if (cancelled) return

      setClients((cliRes.data as ClientRow[]) ?? [])
      setAtividades((atvRes.data as AtividadeRow[]) ?? [])
      const vset = new Set<string>()
      ;((vitRes.data as { id_cliente: string }[]) ?? []).forEach((v) => {
        if (v.id_cliente) vset.add(v.id_cliente)
      })
      setVitoriaIds(vset)
      setLoading(false)
    }
    void load()
    return () => {
      cancelled = true
    }
  }, [])

  // Opções de CS (distintos + "Sem CS")
  const csOptions = useMemo(() => {
    const set = new Set<string>()
    let temSemCs = false
    for (const c of clients) {
      if (c.sc && c.sc.trim()) set.add(c.sc.trim())
      else temSemCs = true
    }
    return { lista: Array.from(set).sort((a, b) => a.localeCompare(b, "pt-BR")), temSemCs }
  }, [clients])

  // Clientes filtrados pelo CS
  const filteredClients = useMemo(() => {
    if (csFilter === "all") return clients
    if (csFilter === SEM_CS) return clients.filter((c) => !c.sc || !c.sc.trim())
    return clients.filter((c) => c.sc === csFilter)
  }, [clients, csFilter])

  // ── VISÃO GERAL DA CARTEIRA (snapshot) ──────────────────────────────
  const carteira = useMemo(() => {
    const clientIds = new Set(filteredClients.map((c) => c.id_cliente))
    const openByClient = new Set<string>()
    for (const a of atividades) {
      if (clientIds.has(a.id_cliente) && (a.status === "pendente" || a.status === "em_andamento")) {
        openByClient.add(a.id_cliente)
      }
    }
    const now = Date.now()
    const limite30 = now + 30 * DAY

    const count = (fn: (c: ClientRow) => boolean) => filteredClients.filter(fn).length

    return {
      total: filteredClients.length,
      ativos: count((c) => c.status_atual === "Ativo no Programa"),
      cancelados: count((c) => c.status_atual === "Cliente Cancelado"),
      emRisco: count((c) => c.em_risco_cancelamento === true),
      engajados: count((c) => c.nivel_engajamento === "ativo_alto" || c.nivel_engajamento === "ativo_medio"),
      desengajados: count((c) => c.nivel_engajamento === "desengajado"),
      saudaveis: count((c) => c.saude_cliente === "saudavel"),
      emAtencao: count((c) => c.saude_cliente === "atencao"),
      criticos: count((c) => c.saude_cliente === "critico"),
      semProxAcao: filteredClients.filter((c) => !openByClient.has(c.id_cliente)).length,
      comVitoria: count((c) => vitoriaIds.has(c.id_cliente) || c.blackcrm_tem_vitorias === "sim"),
      renovacao30: count((c) => {
        if (!c.renovacao_data) return false
        const t = new Date(c.renovacao_data).getTime()
        return !Number.isNaN(t) && t >= now && t <= limite30
      }),
    }
  }, [filteredClients, atividades, vitoriaIds])

  // ── PRODUTIVIDADE DO TIME DE CS (período + CS) ──────────────────────
  const produtividade = useMemo(() => {
    const { from, to } = getPeriodRange(period)
    const clientIds = new Set(filteredClients.map((c) => c.id_cliente))
    const scoped = atividades.filter((a) => clientIds.has(a.id_cliente))
    const todayMid = new Date()
    todayMid.setHours(0, 0, 0, 0)
    const todayMs = todayMid.getTime()

    const createdInPeriod = (a: AtividadeRow) => inRange(a.created_at, from, to)
    const updatedInPeriod = (a: AtividadeRow) => inRange(a.updated_at, from, to)

    const isAtrasada = (a: AtividadeRow) => {
      if (a.status === "atrasado") return true
      if (!a.prazo) return false
      const p = new Date(a.prazo).getTime()
      return (
        !Number.isNaN(p) &&
        p < todayMs &&
        (a.status === "pendente" || a.status === "em_andamento" || a.status === "impedido")
      )
    }

    // clientes com movimentação no período
    const movedClients = new Set<string>()
    for (const a of scoped) {
      if (updatedInPeriod(a)) movedClients.add(a.id_cliente)
    }

    return {
      label: PERIOD_LABELS[period],
      iniciadas: scoped.filter(createdInPeriod).length,
      concluidas: scoped.filter((a) => a.status === "realizado" && updatedInPeriod(a)).length,
      emAndamento: scoped.filter((a) => a.status === "em_andamento" && updatedInPeriod(a)).length,
      impedidas: scoped.filter((a) => a.status === "impedido" && updatedInPeriod(a)).length,
      atrasadas: scoped.filter(isAtrasada).length,
      contatos: scoped.filter((a) => a.tipo && TIPO_GROUPS.contatos.includes(a.tipo) && updatedInPeriod(a)).length,
      followups: scoped.filter((a) => a.tipo && TIPO_GROUPS.followups.includes(a.tipo) && updatedInPeriod(a)).length,
      handoffs: 0, // sem campo de handoff no modelo atual
      proxPendentes: scoped.filter((a) => {
        if (a.status !== "pendente" || !a.prazo) return false
        const p = new Date(a.prazo).getTime()
        return !Number.isNaN(p) && p >= todayMs && p <= todayMs + 7 * DAY
      }).length,
      semMovimentacao: filteredClients.filter((c) => !movedClients.has(c.id_cliente)).length,
    }
  }, [filteredClients, atividades, period])

  // ── TEMPERATURA (snapshot) ──────────────────────────────────────────
  const temperatura = useMemo(() => {
    const count = (v: string | null) =>
      filteredClients.filter((c) => (v === null ? !c.temperatura_cliente : c.temperatura_cliente === v)).length
    return {
      quentes: count("quente"),
      mornos: count("morno"),
      frios: count("frio"),
      naoDefinido: count(null),
    }
  }, [filteredClients])

  // ── GUARDIÃO DE IA (snapshot) ───────────────────────────────────────
  const guardiao = useMemo(() => {
    // Toda a seção Guardião de IA considera apenas clientes Ativos no Programa.
    const ativos = filteredClients.filter((c) => c.status_atual === "Ativo no Programa")
    const totalAtivos = ativos.length
    const com = ativos.filter((c) => c.tem_guardiao_ia === "sim").length
    const sem = ativos.filter((c) => c.tem_guardiao_ia !== "sim").length
    return {
      com,
      sem,
      cobertura: totalAtivos > 0 ? Math.round((com / totalAtivos) * 100) : 0,
    }
  }, [filteredClients])

  if (loading) {
    return (
      <div className="space-y-6 animate-pulse">
        <div className="h-12 w-1/3 bg-card/40 rounded-xl" />
        <div className="h-20 w-full bg-card/40 rounded-2xl" />
        <div className="grid gap-3 grid-cols-2 md:grid-cols-3 lg:grid-cols-6">
          {Array.from({ length: 12 }).map((_, i) => (
            <div key={i} className="h-20 bg-card/40 rounded-xl" />
          ))}
        </div>
      </div>
    )
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="space-y-8 pb-10"
    >
      <div>
        <div className="text-[10px] uppercase tracking-[0.4em] text-muted-foreground mb-1.5">PMC OS</div>
        <h1 className="text-4xl font-bold tracking-tight">CRM</h1>
        <p className="text-sm text-muted-foreground mt-2 max-w-2xl">
          Visão executiva da carteira: saúde, temperatura, risco, guardião de IA e produtividade do time de CS — tudo num só lugar.
        </p>
      </div>

      {/* Barra de filtros */}
      <div className="flex flex-col lg:flex-row lg:items-center gap-4 bg-muted/10 p-4 rounded-2xl border border-border/50">
        <div className="flex flex-wrap items-center gap-1 rounded-xl bg-background/60 p-1 border border-border/50">
          {PERIODS.map((p) => (
            <Button
              key={p}
              variant={period === p ? "default" : "ghost"}
              size="sm"
              onClick={() => setPeriod(p)}
              className="h-9 px-3 rounded-lg text-xs font-semibold"
            >
              {PERIOD_LABELS[p]}
            </Button>
          ))}
        </div>

        <div className="flex items-center gap-2">
          <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">CS Responsável</span>
          <Select value={csFilter} onValueChange={setCsFilter}>
            <SelectTrigger className="h-10 min-w-[180px] bg-background border-border">
              <SelectValue placeholder="Todas as CS" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas as CS</SelectItem>
              {csOptions.lista.map((cs) => (
                <SelectItem key={cs} value={cs}>
                  {cs}
                </SelectItem>
              ))}
              {csOptions.temSemCs && <SelectItem value={SEM_CS}>Sem CS atribuído</SelectItem>}
            </SelectContent>
          </Select>
        </div>

        <div className="text-xs font-semibold uppercase tracking-widest text-muted-foreground lg:ml-auto">
          Visão geral · <span className="text-foreground">{carteira.total}</span> clientes
        </div>
      </div>

      {/* 1. VISÃO GERAL DA CARTEIRA */}
      <section>
        <SectionLabel>Visão Geral da Carteira</SectionLabel>
        <div className="grid gap-3 grid-cols-2 md:grid-cols-3 lg:grid-cols-6">
          <StatCard icon={Users} value={carteira.total} label="Total" tone="primary" />
          <StatCard icon={CheckCircle2} value={carteira.ativos} label="Ativos" tone="green" />
          <StatCard icon={XCircle} value={carteira.cancelados} label="Cancelados" tone="red" />
          <StatCard icon={AlertTriangle} value={carteira.emRisco} label="Em Risco" tone="red" />
          <StatCard icon={TrendingUp} value={carteira.engajados} label="Engajados" tone="green" />
          <StatCard icon={TrendingDown} value={carteira.desengajados} label="Desengajados" tone="orange" />
          <StatCard icon={Heart} value={carteira.saudaveis} label="Saudáveis" tone="green" />
          <StatCard icon={HeartPulse} value={carteira.emAtencao} label="Em Atenção" tone="yellow" />
          <StatCard icon={AlertTriangle} value={carteira.criticos} label="Críticos" tone="red" />
          <StatCard icon={Bell} value={carteira.semProxAcao} label="Sem próx. ação" tone="yellow" />
          <StatCard icon={Trophy} value={carteira.comVitoria} label="Com Vitória" tone="yellow" />
          <StatCard icon={CalendarClock} value={carteira.renovacao30} label="Renovação 30d" tone="default" />
        </div>
      </section>

      {/* 2. PRODUTIVIDADE DO TIME DE CS */}
      <section>
        <SectionLabel>Produtividade do Time de CS · {produtividade.label}</SectionLabel>
        <div className="grid gap-3 grid-cols-2 md:grid-cols-3 lg:grid-cols-5">
          <StatCard icon={Zap} value={produtividade.iniciadas} label="Iniciadas" tone="yellow" />
          <StatCard icon={CheckCircle2} value={produtividade.concluidas} label="Concluídas" tone="green" />
          <StatCard icon={Activity} value={produtividade.emAndamento} label="Em andamento" tone="blue" />
          <StatCard icon={AlertTriangle} value={produtividade.impedidas} label="Impedidas" tone="red" />
          <StatCard icon={Clock} value={produtividade.atrasadas} label="Atrasadas" tone="orange" />
          <StatCard icon={MessageSquare} value={produtividade.contatos} label="Contatos" tone="default" />
          <StatCard icon={PhoneCall} value={produtividade.followups} label="Follow-ups" tone="default" />
          <StatCard icon={ArrowLeftRight} value={produtividade.handoffs} label="Handoffs/Humbos" tone="default" />
          <StatCard icon={ListChecks} value={produtividade.proxPendentes} label="Próx. ações pendentes" tone="yellow" />
          <StatCard icon={PauseCircle} value={produtividade.semMovimentacao} label="Sem movimentação" tone="orange" />
        </div>
      </section>

      {/* 3. TEMPERATURA DA CARTEIRA */}
      <section>
        <SectionLabel>Temperatura da Carteira</SectionLabel>
        <div className="grid gap-3 grid-cols-2 lg:grid-cols-4">
          <StatCard icon={Flame} value={temperatura.quentes} label="Quentes · engajados e ativos" tone="orange" />
          <StatCard icon={Cloud} value={temperatura.mornos} label="Mornos · movimento moderado" tone="yellow" />
          <StatCard icon={Snowflake} value={temperatura.frios} label="Frios · precisam reaquecer" tone="blue" />
          <StatCard icon={CircleDashed} value={temperatura.naoDefinido} label="Não definido · classificar" tone="zinc" />
        </div>
      </section>

      {/* 4. GUARDIÃO DE IA */}
      <section>
        <SectionLabel>Guardião de IA</SectionLabel>
        <div className="grid gap-3 grid-cols-1 md:grid-cols-3">
          <StatCard icon={Bot} value={guardiao.com} label="Com Guardião IA" tone="green" />
          <StatCard icon={Bot} value={guardiao.sem} label="Sem Guardião IA" tone="red" />
          <div className="rounded-xl border border-border/60 bg-card/40 p-4 flex flex-col justify-center gap-2">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-medium text-muted-foreground">Cobertura da carteira</span>
              <span className="text-2xl font-bold text-primary leading-none">{guardiao.cobertura}%</span>
            </div>
            <div className="h-2 w-full rounded-full bg-muted/40 overflow-hidden">
              <div
                className="h-full rounded-full bg-primary transition-all"
                style={{ width: `${guardiao.cobertura}%` }}
              />
            </div>
          </div>
        </div>
      </section>
    </motion.div>
  )
}
