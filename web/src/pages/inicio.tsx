import { useEffect, useMemo, useState } from "react"
import { useNavigate } from "react-router-dom"
import { supabase } from "@/lib/supabase"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  CalendarIcon as Calendar,
  CheckCircle2Icon as CheckCircle2,
  ChevronRightIcon as ChevronRight,
  CircleIcon as Circle,
  ClockIcon as Clock,
  ExternalLinkIcon as ExternalLink,
  MessageCircleIcon as MessageCircle,
  PlayCircleIcon as PlayCircle,
  ShieldCheckIcon as ShieldCheck,
  TargetIcon as Target,
  TrendingUpIcon as TrendingUp,
  UsersIcon as Users,
  VideoIcon as Video,
  UserCheckIcon as UserCheck,
  MessageSquareIcon as MessageSquare,
} from "@/components/ui/icons"
import type { Session } from "@supabase/supabase-js"
import { motion } from "framer-motion"
import { ETAPAS_METODO } from "@/data/etapas-metodo"
import { conselhoAleatorio } from "@/data/conselhos-galdino"
import { GraficoFaturamentoMensal } from "@/components/dashboard/grafico-faturamento-mensal"
import { useClienteMoeda } from "@/hooks/use-cliente-moeda"
import { currencySymbol } from "@/lib/format-currency"

interface InicioPageProps {
  session?: Session
  clientId?: string
}

interface Encontro {
  id_unico: string
  tipo_encontro: string
  titulo_formatado: string
  data_encontro: string
  horario_inicio: string
  horario_fim: string
  link_google_meet: string | null
  link_gravacao: string | null
  status: string
}

interface ReuniaoRealizada {
  id_unico: string
  mentor: string | null
  data_reuniao: string
  cliente_compareceu: boolean | null
}

interface GuardiaoIA {
  nome: string
  cargo: string | null
  telefone: string | null
}

const TIPO_LABELS: Record<string, string> = {
  multiplica_time_nivel_1: "Multiplica Time – Nível 01",
  multiplica_time_nivel_2: "Multiplica Time – Nível 02",
  multiplica_dono: "Multiplica Dono",
  multiplica_case: "Multiplica Case",
  encontro_guardiao_ia: "Encontro dos Guardiões",
  implementation_day: "Implementation Day",
  tutoria: "Tutoria",
}

const TIPO_DOTS: Record<string, string> = {
  multiplica_time_nivel_1: "bg-primary",
  multiplica_time_nivel_2: "bg-blue-400",
  multiplica_dono: "bg-amber-400",
  multiplica_case: "bg-purple-400",
  implementation_day: "bg-emerald-400",
  encontro_guardiao_ia: "bg-rose-400",
  tutoria: "bg-cyan-400",
}

const MONTHS = ["Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho", "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"]
const WEEKDAYS = ["Domingo", "Segunda", "Terça", "Quarta", "Quinta", "Sexta", "Sábado"]

function parseDataBr(dateStr: string): Date {
  const [day, month, year] = dateStr.split("/").map(Number)
  return new Date(year, month - 1, day)
}

// Aceita "DD/MM/YYYY", "YYYY-MM-DD" ou timestamp ISO (campo `data` é text no banco).
function parseDataFlexivel(raw: string | null | undefined): Date | null {
  if (!raw) return null
  const br = raw.match(/^(\d{2})\/(\d{2})\/(\d{4})/)
  if (br) return new Date(Number(br[3]), Number(br[2]) - 1, Number(br[1]))
  const d = new Date(raw)
  return isNaN(d.getTime()) ? null : d
}

function saudacao(): string {
  const h = new Date().getHours()
  if (h < 12) return "Bom dia"
  if (h < 18) return "Boa tarde"
  return "Boa noite"
}

// "fernanda" → "Fernanda"; "atendimento_01@pmc.com" → "Atendimento 01"
function nomeCs(sc: string): string {
  return sc
    .split("@")[0]
    .replace(/[._-]+/g, " ")
    .trim()
    .split(/\s+/)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ")
}

function whatsappUrl(telefone: string): string {
  return `https://wa.me/${telefone.replace(/\D/g, "")}`
}

function CountUp({ value, prefix = "", suffix = "" }: { value: number; prefix?: string; suffix?: string }) {
  const [displayValue, setDisplayValue] = useState(0)

  useEffect(() => {
    let start = 0
    const duration = 1500
    const increment = value / (duration / 16)

    const timer = setInterval(() => {
      start += increment
      if (start >= value) {
        setDisplayValue(value)
        clearInterval(timer)
      } else {
        setDisplayValue(start)
      }
    }, 16)

    return () => clearInterval(timer)
  }, [value])

  return <span>{prefix}{displayValue.toLocaleString('pt-BR', { maximumFractionDigits: 1 })}{suffix}</span>
}

function scaleCurrency(value: number): { value: number; suffix: string } {
  if (value >= 1_000_000) return { value: value / 1_000_000, suffix: ' mi' }
  return { value: value / 1000, suffix: ' K' }
}

export default function InicioPage({ session, clientId }: InicioPageProps) {
  const navigate = useNavigate()
  const resolvedClientId = clientId || session?.user?.id
  const [loading, setLoading] = useState(true)
  const [nomeCliente, setNomeCliente] = useState<string | null>(null)
  const [nomeEmpresa, setNomeEmpresa] = useState<string | null>(null)
  const [clientSc, setClientSc] = useState<string | null>(null)
  const [dataEntrada, setDataEntrada] = useState<Date | null>(null)
  const [guardiao, setGuardiao] = useState<GuardiaoIA | null>(null)
  const [linkGrupoWhatsapp, setLinkGrupoWhatsapp] = useState<string | null>(null)
  const [quickLinks, setQuickLinks] = useState<Record<string, string>>({})
  const [encontros, setEncontros] = useState<Encontro[]>([])
  const [reunioesRealizadas, setReunioesRealizadas] = useState<ReuniaoRealizada[]>([])
  const [reunioesCount, setReunioesCount] = useState({ galdino: 0, consultores: 0, blackcrm: 0 })
  const [etapasConcluidas, setEtapasConcluidas] = useState<Set<number>>(new Set())
  const [isAdmin, setIsAdmin] = useState(false)
  const [savingEtapa, setSavingEtapa] = useState<number | null>(null)
  const [metas, setMetas] = useState({ faturamento_anual: 0, meta_2026: 0, receita_mensal: 0, colaboradores: 0 })
  const [conselho, setConselho] = useState(() => conselhoAleatorio())
  const moeda = useClienteMoeda(resolvedClientId)
  const moedaPrefix = `${currencySymbol(moeda)} `

  const hoje = new Date()

  useEffect(() => {
    if (!resolvedClientId) return
    let cancelled = false

    async function fetchAll() {
      const mes = hoje.getMonth() + 1
      const ano = hoje.getFullYear()
      const hojeIso = hoje.toISOString().slice(0, 10)

      const [clienteRes, linksRes, encontrosRes, reunioesRes, etapasRes, metasRes, sessionRes, galdinoCountRes, consultoresCountRes, blackcrmCountRes] = await Promise.all([
        supabase
          .from("clientes_entrada_new")
          .select("nome_cliente_formatado, nome_empresa_formatado, sc, data, created_at, tem_guardiao_ia, guardiao_ia_nome, guardiao_ia_cargo, guardiao_ia_telefone, link_grupo_whatsapp")
          .eq("id_cliente", resolvedClientId)
          .maybeSingle(),
        supabase.from("configuracoes_links").select("chave, url").eq("ativo", true),
        supabase
          .from("encontros_ao_vivo")
          .select("id_unico, tipo_encontro, titulo_formatado, data_encontro, horario_inicio, horario_fim, link_google_meet, link_gravacao, status")
          .eq("mes", mes)
          .eq("ano", ano)
          .neq("status", "cancelado")
          .order("data_hora_inicio_iso", { ascending: true }),
        supabase
          .from("reunioes_mentoria_new")
          .select("id_unico, mentor, data_reuniao, cliente_compareceu")
          .eq("id_cliente", resolvedClientId)
          .lte("data_reuniao", hojeIso)
          .order("data_reuniao", { ascending: false })
          .limit(6),
        supabase
          .from("cliente_etapas_metodo")
          .select("etapa, concluida")
          .eq("id_cliente", resolvedClientId),
        supabase
          .from("cliente_metas")
          .select("faturamento_anual_objetivo, faturamento_mensal_objetivo, meta_2026, numero_funcionarios, numero_gestores, colaboradores_total")
          .eq("id_cliente", resolvedClientId)
          .maybeSingle(),
        supabase.auth.getSession(),
        supabase.from("reunioes_galdino").select("id_unico", { count: "exact", head: true }).eq("id_cliente", resolvedClientId),
        supabase.from("reunioes_mentoria_new").select("id_unico", { count: "exact", head: true }).eq("id_cliente", resolvedClientId),
        supabase.from("reunioes_blackcrm").select("id_unico", { count: "exact", head: true }).eq("id_cliente", resolvedClientId),
      ])

      if (cancelled) return

      if (clienteRes.data) {
        const c = clienteRes.data
        setNomeCliente(c.nome_cliente_formatado ?? null)
        setNomeEmpresa(c.nome_empresa_formatado ?? null)
        setClientSc(c.sc ?? null)
        setDataEntrada(parseDataFlexivel(c.data) ?? parseDataFlexivel(c.created_at))
        setLinkGrupoWhatsapp(c.link_grupo_whatsapp ?? null)
        if (c.guardiao_ia_nome) {
          setGuardiao({ nome: c.guardiao_ia_nome, cargo: c.guardiao_ia_cargo, telefone: c.guardiao_ia_telefone })
        } else {
          // Fallback: colaborador marcado como Guardião da IA em "Meu Time"
          const { data: colab } = await supabase
            .from("cliente_colaboradores")
            .select("nome, cargo, whatsapp")
            .eq("id_cliente", resolvedClientId)
            .eq("guardiao_ia", true)
            .limit(1)
            .maybeSingle()
          if (!cancelled && colab) {
            setGuardiao({ nome: colab.nome, cargo: colab.cargo, telefone: colab.whatsapp })
          }
        }
      }

      if (linksRes.data) {
        const map: Record<string, string> = {}
        linksRes.data.forEach((l) => { map[l.chave] = l.url })
        setQuickLinks(map)
      }

      setEncontros(encontrosRes.data ?? [])
      setReunioesRealizadas((reunioesRes.data ?? []).filter((r) => r.cliente_compareceu !== false))
      setReunioesCount({
        galdino: galdinoCountRes.count ?? 0,
        consultores: consultoresCountRes.count ?? 0,
        blackcrm: blackcrmCountRes.count ?? 0,
      })

      const done = new Set<number>()
      ;(etapasRes.data ?? []).forEach((r: { etapa: number; concluida: boolean }) => {
        if (r.concluida) done.add(r.etapa)
      })
      setEtapasConcluidas(done)

      const goals = metasRes.data
      const numFunc = goals?.numero_funcionarios ?? 0
      const numGest = goals?.numero_gestores ?? 0
      setMetas({
        faturamento_anual: goals?.faturamento_anual_objetivo ?? 0,
        meta_2026: goals?.meta_2026 ?? 0,
        receita_mensal: goals?.faturamento_mensal_objetivo ?? 0,
        colaboradores: (numFunc || numGest) ? numFunc + numGest : goals?.colaboradores_total ?? 0,
      })

      const email = sessionRes.data.session?.user?.email
      if (email) {
        const { data: mentor } = await supabase.from("mentores").select("id").eq("email", email).maybeSingle()
        if (!cancelled) setIsAdmin(!!mentor)
      }

      setLoading(false)
    }

    fetchAll()
    return () => { cancelled = true }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [resolvedClientId])

  const suporteUrl = clientSc
    ? quickLinks[`suporte_${clientSc.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "")}`] || ""
    : ""
  const csNome = clientSc ? nomeCs(clientSc) : null

  const semanaPrograma = useMemo(() => {
    if (!dataEntrada) return null
    const diffMs = hoje.getTime() - dataEntrada.getTime()
    if (diffMs < 0) return 1
    return Math.floor(diffMs / (7 * 24 * 60 * 60 * 1000)) + 1
  }, [dataEntrada]) // eslint-disable-line react-hooks/exhaustive-deps

  const encontrosPorDia = useMemo(() => {
    const map = new Map<string, Encontro[]>()
    encontros.forEach((e) => {
      const list = map.get(e.data_encontro) ?? []
      list.push(e)
      map.set(e.data_encontro, list)
    })
    return Array.from(map.entries())
  }, [encontros])

  async function toggleEtapa(etapa: number) {
    if (!isAdmin || !resolvedClientId || savingEtapa !== null) return
    const concluida = !etapasConcluidas.has(etapa)
    setSavingEtapa(etapa)
    const { error } = await supabase
      .from("cliente_etapas_metodo")
      .upsert(
        {
          id_cliente: resolvedClientId,
          etapa,
          concluida,
          concluida_em: concluida ? new Date().toISOString() : null,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "id_cliente,etapa" }
      )
    if (!error) {
      setEtapasConcluidas((prev) => {
        const next = new Set(prev)
        if (concluida) next.add(etapa)
        else next.delete(etapa)
        return next
      })
    }
    setSavingEtapa(null)
  }

  const container = {
    hidden: { opacity: 0 },
    show: { opacity: 1, transition: { staggerChildren: 0.1 } },
  }
  const item = {
    hidden: { y: 20, opacity: 0 },
    show: { y: 0, opacity: 1, transition: { duration: 0.5, ease: "easeOut" as const } },
  }

  if (loading) {
    return (
      <div className="space-y-6 animate-pulse">
        <div className="h-24 w-2/3 bg-card/40 rounded-2xl" />
        <div className="grid gap-6 lg:grid-cols-3">
          <div className="h-[420px] lg:col-span-2 bg-card/40 rounded-2xl" />
          <div className="h-[420px] bg-card/40 rounded-2xl" />
        </div>
        <div className="h-64 bg-card/40 rounded-2xl" />
      </div>
    )
  }

  const totalConcluidas = etapasConcluidas.size
  const pctConcluido = Math.round((totalConcluidas / ETAPAS_METODO.length) * 100)
  const grupoWhatsappUrl = linkGrupoWhatsapp || quickLinks.grupo_avisos

  const contatos = [
    {
      label: csNome ? `Sua CS — ${csNome}` : "Sua Gestora de Sucesso",
      desc: "WhatsApp direto com sua CS",
      icon: UserCheck,
      url: suporteUrl,
    },
    {
      label: "Seu Grupo de WhatsApp",
      desc: linkGrupoWhatsapp ? "Grupo exclusivo da sua empresa" : "Avisos do Programa",
      icon: Users,
      url: grupoWhatsappUrl,
    },
  ].filter((c) => c.url)

  const reunioes = [
    {
      label: "Reunião com Mentores",
      desc: "Agende com seu consultor",
      icon: Calendar,
      url: "/agendar",
      internal: true,
    },
    {
      label: "Reunião com Galdino",
      desc: "Agenda direta do Galdino",
      icon: Video,
      url: quickLinks.agenda_galdino,
      internal: false,
    },
  ].filter((r) => r.url)

  return (
    <div className="space-y-10">
      {/* Saudação + contatos */}
      <div className="grid gap-6 lg:grid-cols-3 lg:items-start">
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.6 }}
          className="lg:col-span-2 flex flex-col gap-3 border-l-4 border-primary pl-8 py-2"
        >
          <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground">
            {WEEKDAYS[hoje.getDay()]}, {hoje.getDate()} de {MONTHS[hoje.getMonth()]} de {hoje.getFullYear()}
          </p>
          <h1 className="text-4xl lg:text-5xl font-bold tracking-tight text-foreground">
            {saudacao()}{nomeEmpresa ? `, ${nomeEmpresa}` : nomeCliente ? `, ${nomeCliente.split(" ")[0]}` : ""}! 👋
          </h1>
          <div className="flex items-center gap-3 flex-wrap">
            {semanaPrograma !== null && (
              <Badge className="rounded-lg bg-primary/10 text-primary border-primary/20 px-3 py-1 text-[10px] font-bold">
                SEMANA {semanaPrograma} DO PROGRAMA
              </Badge>
            )}
            <Badge variant="outline" className="bg-primary/5 border-primary/20 text-primary">PORTAL DO CLIENTE</Badge>
            <p className="text-muted-foreground font-medium text-sm">
              {nomeCliente ? `${nomeCliente} — ` : ""}Sua central do Programa Multiplicador de Crescimento.
            </p>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.6 }}
          className="space-y-3"
        >
          {contatos.map((c) => (
            <Button
              key={c.label}
              variant="outline"
              className="w-full justify-between h-[64px] rounded-xl hover:border-primary/30 hover:bg-primary/5 group"
              onClick={() => window.open(c.url, "_blank")}
            >
              <div className="flex items-center gap-4">
                <div className="bg-primary/10 p-2.5 rounded-lg group-hover:bg-primary group-hover:text-primary-foreground transition-colors">
                  <c.icon className="size-5" />
                </div>
                <div className="flex flex-col items-start gap-0.5">
                  <span className="font-bold text-sm tracking-tight">{c.label}</span>
                  <span className="text-[11px] text-muted-foreground font-medium">{c.desc}</span>
                </div>
              </div>
              <ExternalLink className="size-4 text-muted-foreground/50 group-hover:text-primary transition-colors" />
            </Button>
          ))}
        </motion.div>
      </div>

      {/* O Conselho do Galdino */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.15 }}
      >
        <Card className="overflow-hidden border-primary/20">
          <CardContent className="p-0">
            <div className="flex flex-col sm:flex-row items-stretch">
              <div className="sm:w-40 lg:w-48 shrink-0 bg-primary/5 flex items-center justify-center p-6">
                <img
                  src="/galdino-foto.png"
                  alt="Galdino Rodrigues"
                  className="size-28 lg:size-36 rounded-full object-cover object-top ring-2 ring-primary/30 shadow-[0_0_24px_rgba(218,252,103,0.15)]"
                  onError={(e) => { (e.currentTarget.parentElement as HTMLElement).style.display = "none" }}
                />
              </div>
              <div className="flex-1 p-6 lg:p-8 flex flex-col justify-center gap-4">
                <div className="flex items-center gap-3 flex-wrap">
                  <p className="text-xs font-bold uppercase tracking-widest text-primary">O Conselho do Galdino</p>
                  <Badge variant="outline" className="rounded-lg border-border text-muted-foreground px-2 py-0.5 text-[10px] font-bold uppercase">
                    {conselho.tema}
                  </Badge>
                </div>
                <blockquote className="text-xl lg:text-2xl font-bold tracking-tight text-foreground leading-snug">
                  “{conselho.frase}”
                </blockquote>
                <div>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-8 -ml-2 gap-1.5 rounded-lg text-xs font-bold text-muted-foreground hover:text-primary hover:bg-primary/5"
                    onClick={() => setConselho(conselhoAleatorio())}
                  >
                    Próximo conselho
                  </Button>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* KPIs do negócio */}
      <motion.div variants={container} initial="hidden" animate="show" className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        <motion.div variants={item}>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">Faturamento Anual</CardTitle>
              <div className="bg-primary/10 p-2.5 rounded-xl">
                <TrendingUp className="size-4 text-primary" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold tracking-tight mb-2">
                {(() => { const s = scaleCurrency(metas.faturamento_anual); return <CountUp value={s.value} prefix={moedaPrefix} suffix={s.suffix} /> })()}
              </div>
              <p className="text-[11px] font-medium text-muted-foreground">Status Atual do Negócio</p>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div variants={item}>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">Meta 2026</CardTitle>
              <div className="bg-primary/10 p-2.5 rounded-xl">
                <Target className="size-4 text-primary" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold tracking-tight mb-2">
                {(() => { const s = scaleCurrency(metas.meta_2026); return <CountUp value={s.value} prefix={moedaPrefix} suffix={s.suffix} /> })()}
              </div>
              <Badge variant="ghost" className="px-2 py-0.5 rounded-lg text-primary font-bold text-[10px]">
                Faltam {(100 - (Math.round((metas.faturamento_anual / metas.meta_2026) * 100) || 0)).toFixed(1)}% para o objetivo
              </Badge>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div variants={item}>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">Receita Mensal</CardTitle>
              <div className="bg-primary/10 p-2.5 rounded-xl">
                <TrendingUp className="size-4 text-primary" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold tracking-tight mb-2">
                {(() => { const s = scaleCurrency(metas.receita_mensal); return <CountUp value={s.value} prefix={moedaPrefix} suffix={s.suffix} /> })()}
              </div>
              <p className="text-[11px] font-medium text-muted-foreground">Produtos & Recorrência</p>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div variants={item}>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">Colaboradores</CardTitle>
              <div className="bg-primary/10 p-2.5 rounded-xl">
                <Users className="size-4 text-primary" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold tracking-tight mb-2">
                <CountUp value={metas.colaboradores} />
              </div>
              <p className="text-[11px] font-medium text-muted-foreground">Equipe Estratégica</p>
            </CardContent>
          </Card>
        </motion.div>
      </motion.div>

      {/* Sua Jornada no PMC — reuniões */}
      {(() => {
        const totalReu = reunioesCount.galdino + reunioesCount.consultores + reunioesCount.blackcrm
        const marcos = [
          { label: "Reuniões com o Galdino", valor: reunioesCount.galdino, icon: Video, desc: "Mentoria direta com o Galdino" },
          { label: "Reuniões com Consultores", valor: reunioesCount.consultores, icon: MessageSquare, desc: "Acompanhamento dos consultores" },
          { label: "Reuniões BlackCRM", valor: reunioesCount.blackcrm, icon: Target, desc: "Time BlackCRM", esconderSeZero: true },
        ].filter((m) => !(m.esconderSeZero && m.valor === 0))
        return (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.15 }}
          >
            <Card>
              <CardHeader className="border-b border-border/50 flex flex-row items-center justify-between">
                <div className="space-y-1">
                  <CardTitle className="text-base font-semibold">Sua Jornada no PMC</CardTitle>
                  <CardDescription className="text-[11px] font-medium">
                    {totalReu} reuni{totalReu === 1 ? "ão" : "ões"} ao longo da sua jornada
                  </CardDescription>
                </div>
                <Badge className="rounded-lg bg-primary/10 text-primary border-primary/20 px-3 py-1 text-[10px] font-bold">
                  {totalReu} NO TOTAL
                </Badge>
              </CardHeader>
              <CardContent className="pt-6">
                <div className="relative">
                  {/* trilho da jornada */}
                  <div className="hidden md:block absolute left-0 right-0 top-7 h-px bg-border" />
                  <div className="grid gap-6 md:grid-cols-3 relative">
                    {marcos.map((m, i) => (
                      <motion.div
                        key={m.label}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.2 + i * 0.1 }}
                        className="flex flex-col items-center text-center gap-2"
                      >
                        <div className={`size-14 rounded-2xl flex items-center justify-center shrink-0 relative z-10 ${
                          m.valor > 0 ? "bg-primary text-primary-foreground" : "bg-muted/40 text-muted-foreground border border-border"
                        }`}>
                          <m.icon className="size-6" />
                        </div>
                        <div className="text-3xl font-bold tracking-tight text-foreground">
                          <CountUp value={m.valor} />
                        </div>
                        <div>
                          <p className="text-[13px] font-bold tracking-tight text-foreground">{m.label}</p>
                          <p className="text-[11px] font-medium text-muted-foreground">{m.desc}</p>
                        </div>
                      </motion.div>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )
      })()}

      {/* Faturamento mensal */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.2 }}
      >
        <GraficoFaturamentoMensal clientId={resolvedClientId} />
      </motion.div>


      {/* Cronograma do mês + coluna lateral */}
      <motion.div variants={container} initial="hidden" animate="show" className="grid gap-6 lg:grid-cols-3 lg:items-start">
        <motion.div variants={item} className="lg:col-span-2 space-y-6">
          <Card className="min-h-[420px] flex flex-col">
            <CardHeader className="border-b border-border/50 flex flex-row items-center justify-between">
              <div className="space-y-1">
                <CardTitle className="text-base font-semibold">Cronograma de {MONTHS[hoje.getMonth()]}</CardTitle>
                <CardDescription className="text-[11px] font-medium">
                  Eventos ao vivo da agenda do PMC neste mês
                </CardDescription>
              </div>
              <Button
                variant="ghost"
                size="sm"
                className="text-xs font-semibold text-primary hover:text-primary hover:bg-primary/5"
                onClick={() => navigate("/calendario")}
              >
                Calendário Completo
              </Button>
            </CardHeader>
            <CardContent className="pt-6 space-y-5 flex-1 max-h-[560px] overflow-y-auto scrollbar-hide">
              {encontrosPorDia.length === 0 && (
                <div className="flex flex-col items-center justify-center py-16 gap-3 text-center">
                  <Calendar className="size-8 text-muted-foreground/30" />
                  <p className="text-sm font-medium text-muted-foreground">Nenhum evento agendado para este mês.</p>
                </div>
              )}
              {encontrosPorDia.map(([dia, lista]) => {
                const data = parseDataBr(dia)
                const isToday =
                  data.getDate() === hoje.getDate() &&
                  data.getMonth() === hoje.getMonth() &&
                  data.getFullYear() === hoje.getFullYear()
                const isPast = !isToday && data < hoje
                return (
                  <div key={dia} className={isPast ? "opacity-50" : ""}>
                    <div className="flex items-center gap-3 mb-2">
                      <span className="text-sm font-bold tracking-tight text-foreground">
                        {String(data.getDate()).padStart(2, "0")} — {WEEKDAYS[data.getDay()]}
                      </span>
                      {isToday && (
                        <Badge className="rounded-lg bg-primary/10 text-primary border-primary/20 px-2 py-0.5 text-[10px] font-bold">
                          HOJE
                        </Badge>
                      )}
                    </div>
                    <div className="space-y-2">
                      {lista.map((e) => (
                        <div
                          key={e.id_unico}
                          className="flex items-center justify-between gap-4 p-4 rounded-xl bg-muted/20 border border-transparent hover:border-primary/20 hover:bg-muted/30 transition-all"
                        >
                          <div className="flex items-center gap-3 min-w-0">
                            <span className={`size-2 rounded-full shrink-0 ${TIPO_DOTS[e.tipo_encontro] ?? "bg-muted-foreground"}`} />
                            <div className="min-w-0">
                              <p className="text-[13px] font-bold tracking-tight text-foreground truncate">
                                {e.titulo_formatado || TIPO_LABELS[e.tipo_encontro] || e.tipo_encontro}
                              </p>
                              <p className="text-[11px] font-medium text-muted-foreground flex items-center gap-1.5">
                                <Clock className="size-3" />
                                {e.horario_inicio} – {e.horario_fim}
                                <span className="text-muted-foreground/50">·</span>
                                {TIPO_LABELS[e.tipo_encontro] ?? "Encontro"}
                              </p>
                            </div>
                          </div>
                          {e.status === "realizado" && e.link_gravacao ? (
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-8 gap-1.5 rounded-lg text-xs font-bold text-primary hover:text-primary hover:bg-primary/5 shrink-0"
                              onClick={() => window.open(e.link_gravacao!, "_blank")}
                            >
                              <PlayCircle className="size-3.5" />
                              Gravação
                            </Button>
                          ) : e.link_google_meet ? (
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-8 gap-1.5 rounded-lg text-xs font-bold text-primary hover:text-primary hover:bg-primary/5 shrink-0"
                              onClick={() => window.open(e.link_google_meet!, "_blank")}
                            >
                              <Video className="size-3.5" />
                              Entrar
                            </Button>
                          ) : null}
                        </div>
                      ))}
                    </div>
                  </div>
                )
              })}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="border-b border-border/50 flex flex-row items-center justify-between">
              <div className="space-y-1">
                <CardTitle className="text-base font-semibold">Reuniões Realizadas</CardTitle>
                <CardDescription className="text-[11px] font-medium">
                  Suas últimas sessões com os consultores
                </CardDescription>
              </div>
              <Button
                variant="ghost"
                size="sm"
                className="text-xs font-semibold text-primary hover:text-primary hover:bg-primary/5"
                onClick={() => navigate("/reunioes")}
              >
                Ver Todas
              </Button>
            </CardHeader>
            <CardContent className="pt-6 space-y-2">
              {reunioesRealizadas.length === 0 && (
                <p className="text-sm font-medium text-muted-foreground text-center py-6">
                  Nenhuma reunião realizada ainda.
                </p>
              )}
              {reunioesRealizadas.map((r) => (
                <div
                  key={r.id_unico}
                  className="flex items-center justify-between gap-4 p-4 rounded-xl bg-muted/20 border border-transparent hover:border-primary/20 hover:bg-muted/30 transition-all cursor-pointer"
                  onClick={() => navigate(`/reuniao/${r.id_unico}`)}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="bg-primary/10 rounded-full p-1 shrink-0">
                      <CheckCircle2 className="size-4 text-primary" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-[13px] font-bold tracking-tight text-foreground truncate">
                        {r.mentor || "Consultor PMC"}
                      </p>
                      <p className="text-[11px] font-medium text-muted-foreground">
                        {new Date(r.data_reuniao + "T00:00:00").toLocaleDateString("pt-BR")}
                      </p>
                    </div>
                  </div>
                  <ChevronRight className="size-4 text-muted-foreground/50 shrink-0" />
                </div>
              ))}
            </CardContent>
          </Card>
        </motion.div>

        <motion.div variants={item} className="space-y-6">
          <Card>
            <CardHeader className="border-b border-border/50">
              <CardTitle className="text-base font-semibold">Marque sua Reunião</CardTitle>
            </CardHeader>
            <CardContent className="pt-6 space-y-4">
              {reunioes.map((r) => (
                <Button
                  key={r.label}
                  variant="outline"
                  className="w-full justify-between h-[72px] rounded-xl hover:border-primary/30 hover:bg-primary/5 group"
                  onClick={() => (r.internal ? navigate(r.url) : window.open(r.url, "_blank"))}
                >
                  <div className="flex items-center gap-4">
                    <div className="bg-primary/10 p-2.5 rounded-lg group-hover:bg-primary group-hover:text-primary-foreground transition-colors">
                      <r.icon className="size-5" />
                    </div>
                    <div className="flex flex-col items-start gap-0.5">
                      <span className="font-bold text-sm tracking-tight">{r.label}</span>
                      <span className="text-[11px] text-muted-foreground font-medium">{r.desc}</span>
                    </div>
                  </div>
                  <ExternalLink className="size-4 text-muted-foreground/50 group-hover:text-primary transition-colors" />
                </Button>
              ))}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="border-b border-border/50">
              <CardTitle className="text-base font-semibold">Seu Guardião da IA</CardTitle>
            </CardHeader>
            <CardContent className="pt-6">
              {guardiao ? (
                <div className="flex items-start gap-4">
                  <div className="bg-primary/10 p-2.5 rounded-lg shrink-0">
                    <ShieldCheck className="size-5 text-primary" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-bold tracking-tight text-foreground">{guardiao.nome}</p>
                    {guardiao.cargo && (
                      <p className="text-[11px] font-medium text-muted-foreground">{guardiao.cargo}</p>
                    )}
                    {guardiao.telefone && (
                      <Button
                        variant="outline"
                        size="sm"
                        className="mt-3 h-9 w-full gap-2 rounded-xl text-xs font-bold hover:border-primary/30 hover:bg-primary/5"
                        onClick={() => window.open(whatsappUrl(guardiao.telefone!), "_blank")}
                      >
                        <MessageCircle className="size-3.5" />
                        Chamar no WhatsApp
                      </Button>
                    )}
                  </div>
                </div>
              ) : (
                <p className="text-[13px] font-medium text-muted-foreground leading-relaxed">
                  Seu Guardião da IA ainda não foi definido. Fale com sua CS para indicar quem será o
                  responsável pela implementação de IA na sua empresa.
                </p>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="border-b border-border/50">
              <CardTitle className="text-base font-semibold">
                {csNome ? `Suporte — ${csNome}` : "Suporte Rápido"}
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-6">
              <p className="text-[13px] font-medium text-muted-foreground leading-relaxed">
                Precisa de ajuda? Fale com a sua CS{csNome ? ` ${csNome}` : ""} — ela responde direto no WhatsApp.
              </p>
              {suporteUrl && (
                <Button
                  className="w-full mt-4 h-11 rounded-xl font-bold uppercase tracking-wider text-xs gap-2"
                  onClick={() => window.open(suporteUrl, "_blank")}
                >
                  <MessageCircle className="size-4" />
                  Chamar no WhatsApp
                </Button>
              )}
            </CardContent>
          </Card>
        </motion.div>
      </motion.div>

      {/* Jornada das 7 etapas */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.3 }}
      >
        <Card>
          <CardHeader className="border-b border-border/50 flex flex-row items-center justify-between">
            <div className="space-y-1">
              <CardTitle className="text-base font-semibold">Jornada do Método PMC</CardTitle>
              <CardDescription className="text-[11px] font-medium">
                {totalConcluidas} de {ETAPAS_METODO.length} etapas concluídas
              </CardDescription>
            </div>
            <Badge className="rounded-lg bg-primary/10 text-primary border-primary/20 px-3 py-1 text-[10px] font-bold">
              {pctConcluido}% DA JORNADA
            </Badge>
          </CardHeader>
          <CardContent className="pt-6">
            <div className="h-2 w-full rounded-full bg-muted/30 mb-8 overflow-hidden">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${pctConcluido}%` }}
                transition={{ duration: 1, ease: "easeOut" }}
                className="h-full rounded-full bg-primary"
              />
            </div>
            <div className="grid gap-3">
              {ETAPAS_METODO.map((etapa, index) => {
                const done = etapasConcluidas.has(etapa.numero)
                return (
                  <motion.div
                    key={etapa.numero}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.4 + index * 0.08 }}
                    className={`flex items-start gap-4 p-4 rounded-xl border transition-all ${
                      done
                        ? "bg-primary/5 border-primary/20"
                        : "bg-muted/20 border-transparent hover:border-border/60"
                    } ${isAdmin ? "cursor-pointer" : ""}`}
                    onClick={() => toggleEtapa(etapa.numero)}
                    title={isAdmin ? "Clique para marcar/desmarcar (admin)" : undefined}
                  >
                    {done ? (
                      <div className="bg-primary/10 rounded-full p-1 mt-0.5 shrink-0">
                        <CheckCircle2 className="size-5 text-primary" />
                      </div>
                    ) : (
                      <div className="rounded-full p-1 mt-0.5 shrink-0">
                        <Circle className="size-5 text-muted-foreground/30" />
                      </div>
                    )}
                    <div className="min-w-0">
                      <p className="text-sm font-bold tracking-tight text-foreground">
                        <span className="text-muted-foreground/60 font-mono text-xs mr-2">0{etapa.numero}</span>
                        {etapa.titulo}
                        {done && (
                          <Badge variant="ghost" className="ml-2 px-2 py-0 rounded-lg text-primary font-bold text-[10px]">
                            CONCLUÍDA
                          </Badge>
                        )}
                      </p>
                      <p className="text-[12px] font-medium text-muted-foreground leading-relaxed mt-0.5">
                        {etapa.objetivo}
                      </p>
                    </div>
                  </motion.div>
                )
              })}
            </div>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  )
}
