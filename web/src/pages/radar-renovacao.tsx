// Radar de Renovação — Health Score do time/dono. Lista os clientes ativos
// ranqueados por risco de não-renovação, com o motivo de cada score e a
// proximidade da renovação. Alimentado pela RPC security-definer `radar_renovacao`
// (admin-only), que computa o score de sinais objetivos (recência de reunião,
// presença, NPS, vitórias) + flags manuais do CS.
import { useEffect, useMemo, useState } from "react"
import { useNavigate } from "react-router-dom"
import { supabase } from "@/lib/supabase"
import { PageHeader } from "@/components/layout/page-header"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { motion } from "framer-motion"
import {
  AlertTriangleIcon as AlertTriangle,
  TrendingDownIcon as TrendingDown,
  ShieldCheckIcon as ShieldCheck,
  CalendarIcon as Calendar,
  ArrowUpRightIcon as ArrowUpRight,
} from "@/components/ui/icons"

type Faixa = "verde" | "amarelo" | "vermelho"

interface Row {
  id_cliente: string
  codigo_cliente: number | null
  nome_cliente: string | null
  nome_empresa: string | null
  sc: string | null
  score: number
  faixa: Faixa
  dias_sem_reuniao: number | null
  total_reunioes: number
  nps_medio: number | null
  vitorias: number
  em_risco: boolean
  saude_cliente: string | null
  temperatura: string | null
  dias_renovacao: number | null
  renovacao_data: string | null
  motivos: string[]
}

const FAIXA = {
  vermelho: { label: "Crítico", dot: "bg-red-500", text: "text-red-400", chip: "bg-red-500/10 text-red-400 border-red-500/20" },
  amarelo: { label: "Atenção", dot: "bg-amber-500", text: "text-amber-400", chip: "bg-amber-500/10 text-amber-400 border-amber-500/20" },
  verde: { label: "Saudável", dot: "bg-emerald-500", text: "text-emerald-400", chip: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20" },
} as const

export default function RadarRenovacaoPage() {
  const navigate = useNavigate()
  const [rows, setRows] = useState<Row[]>([])
  const [loading, setLoading] = useState(true)
  const [erro, setErro] = useState<string | null>(null)
  const [faixaFiltro, setFaixaFiltro] = useState<Faixa | "todos">("todos")
  const [csFiltro, setCsFiltro] = useState<string>("todos")

  useEffect(() => {
    let cancel = false
    async function carregar() {
      const { data, error } = await supabase.rpc("radar_renovacao")
      if (cancel) return
      if (error) {
        setErro(error.message)
      } else {
        setRows((data ?? []) as Row[])
      }
      setLoading(false)
    }
    carregar()
    return () => { cancel = true }
  }, [])

  const csList = useMemo(
    () => Array.from(new Set(rows.map((r) => r.sc).filter(Boolean) as string[])).sort(),
    [rows],
  )

  const filtrados = useMemo(
    () => rows.filter((r) => (faixaFiltro === "todos" || r.faixa === faixaFiltro) && (csFiltro === "todos" || r.sc === csFiltro)),
    [rows, faixaFiltro, csFiltro],
  )

  const resumo = useMemo(() => {
    const c = { vermelho: 0, amarelo: 0, verde: 0, renovando: 0 }
    for (const r of rows) {
      c[r.faixa]++
      if (r.dias_renovacao !== null && r.dias_renovacao >= 0 && r.dias_renovacao <= 90 && r.faixa !== "verde") c.renovando++
    }
    return c
  }, [rows])

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="h-16 w-1/2 bg-card/40 rounded-2xl animate-pulse" />
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {[1, 2, 3, 4].map((i) => <div key={i} className="h-28 bg-card/40 rounded-2xl animate-pulse" />)}
        </div>
        <div className="h-96 bg-card/40 rounded-2xl animate-pulse" />
      </div>
    )
  }

  if (erro) {
    return (
      <div className="space-y-6">
        <PageHeader title="Radar de Renovação" description="Health Score dos clientes ativos." />
        <Card className="border-destructive/30">
          <CardContent className="p-6 text-[14px] text-muted-foreground">
            Não foi possível carregar o radar: <span className="text-foreground font-medium">{erro}</span>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="space-y-8 pb-12">
      <PageHeader
        title="Radar de Renovação"
        description="Clientes ativos ranqueados por risco de não-renovação. O score sai dos sinais que a operação já registra — recência de reunião, presença, NPS, vitórias — reforçado pelos flags do CS."
      />

      {/* Resumo */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <ResumoCard icon={AlertTriangle} cor="text-red-400 bg-red-500/10" valor={resumo.vermelho} label="Críticos" onClick={() => setFaixaFiltro("vermelho")} ativo={faixaFiltro === "vermelho"} />
        <ResumoCard icon={TrendingDown} cor="text-amber-400 bg-amber-500/10" valor={resumo.amarelo} label="Em atenção" onClick={() => setFaixaFiltro("amarelo")} ativo={faixaFiltro === "amarelo"} />
        <ResumoCard icon={ShieldCheck} cor="text-emerald-400 bg-emerald-500/10" valor={resumo.verde} label="Saudáveis" onClick={() => setFaixaFiltro("verde")} ativo={faixaFiltro === "verde"} />
        <ResumoCard icon={Calendar} cor="text-primary bg-primary/10" valor={resumo.renovando} label="Renovam ≤90d em risco" onClick={() => setFaixaFiltro("todos")} ativo={false} />
      </div>

      {/* Filtros */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex gap-1.5">
          {(["todos", "vermelho", "amarelo", "verde"] as const).map((f) => (
            <button
              key={f}
              onClick={() => setFaixaFiltro(f)}
              className={`px-3 py-1.5 rounded-lg text-[12px] font-semibold transition-colors ${faixaFiltro === f ? "bg-primary text-primary-foreground" : "bg-card/60 text-muted-foreground hover:text-foreground"}`}
            >
              {f === "todos" ? "Todos" : FAIXA[f].label}
            </button>
          ))}
        </div>
        {csList.length > 0 && (
          <select
            value={csFiltro}
            onChange={(e) => setCsFiltro(e.target.value)}
            className="rounded-lg bg-card/60 border border-border px-3 py-1.5 text-[12px] font-medium text-foreground"
          >
            <option value="todos">Todos os CS</option>
            {csList.map((cs) => <option key={cs} value={cs}>{cs}</option>)}
          </select>
        )}
        <span className="text-[12px] text-muted-foreground ml-auto">{filtrados.length} cliente(s)</span>
      </div>

      {/* Lista */}
      <div className="space-y-2.5">
        {filtrados.map((r, i) => (
          <motion.div key={r.id_cliente || i} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: Math.min(i * 0.02, 0.4) }}>
            <Card
              className="cursor-pointer transition-colors hover:border-primary/40"
              onClick={() => r.id_cliente && navigate(`/cliente/${r.id_cliente}`)}
            >
              <CardContent className="p-4 flex items-center gap-4">
                {/* Score */}
                <div className={`shrink-0 flex flex-col items-center justify-center size-16 rounded-xl ${FAIXA[r.faixa].chip} border`}>
                  <span className={`text-2xl font-bold ${FAIXA[r.faixa].text}`}>{r.score}</span>
                  <span className="text-[9px] font-bold uppercase tracking-wider text-muted-foreground">{FAIXA[r.faixa].label}</span>
                </div>

                {/* Cliente + motivos */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="text-[14px] font-bold text-foreground truncate">{r.nome_empresa || r.nome_cliente || "Sem nome"}</p>
                    {r.sc && <Badge className="rounded-md bg-muted/40 text-muted-foreground border-transparent px-2 py-0.5 text-[10px] font-semibold">CS: {r.sc}</Badge>}
                  </div>
                  {r.nome_empresa && r.nome_cliente && (
                    <p className="text-[12px] text-muted-foreground truncate">{r.nome_cliente}</p>
                  )}
                  <div className="flex flex-wrap gap-1.5 mt-1.5">
                    {r.motivos.slice(0, 4).map((m, j) => (
                      <span key={j} className="inline-flex items-center rounded-md bg-card px-2 py-0.5 text-[11px] font-medium text-muted-foreground border border-border/60">{m}</span>
                    ))}
                  </div>
                </div>

                {/* Renovação */}
                <div className="shrink-0 text-right hidden sm:block">
                  {r.dias_renovacao !== null ? (
                    <>
                      <p className={`text-[13px] font-bold ${r.dias_renovacao <= 30 ? "text-red-400" : r.dias_renovacao <= 90 ? "text-amber-400" : "text-foreground"}`}>
                        {r.dias_renovacao < 0 ? "Vencida" : `${r.dias_renovacao}d`}
                      </p>
                      <p className="text-[10px] text-muted-foreground uppercase tracking-wide">p/ renovar</p>
                    </>
                  ) : (
                    <p className="text-[11px] text-muted-foreground">sem data</p>
                  )}
                </div>

                <ArrowUpRight className="size-4 text-muted-foreground shrink-0" />
              </CardContent>
            </Card>
          </motion.div>
        ))}
        {filtrados.length === 0 && (
          <Card>
            <CardContent className="p-8 text-center text-[14px] text-muted-foreground">
              Nenhum cliente nesse filtro.
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  )
}

function ResumoCard({ icon: Icon, cor, valor, label, onClick, ativo }: { icon: any; cor: string; valor: number; label: string; onClick: () => void; ativo: boolean }) {
  return (
    <button onClick={onClick} className="text-left">
      <Card className={`transition-colors ${ativo ? "border-primary/50" : "hover:border-primary/30"}`}>
        <CardContent className="p-5">
          <div className="flex items-center justify-between">
            <div className={`inline-flex p-2.5 rounded-xl ${cor}`}><Icon className="size-5" /></div>
            {ativo && <span className="text-[10px] font-bold uppercase tracking-wider text-primary">filtrando</span>}
          </div>
          <p className="text-3xl font-bold tracking-tight text-foreground mt-3">{valor}</p>
          <p className="text-[12px] font-medium text-muted-foreground mt-0.5">{label}</p>
        </CardContent>
      </Card>
    </button>
  )
}
