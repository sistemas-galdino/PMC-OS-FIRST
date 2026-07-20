// Dash 2 (dono) — Visão Geral estratégica: crescimento no tempo, receita/renovação,
// saúde & risco, funil e distribuições. Complementa o Dashboard Principal.
// Blocos que dependem de campos ainda não preenchidos degradam para estado vazio.
import { useEffect, useMemo, useState } from "react"
import { supabase } from "@/lib/supabase"
import { isStatusAtivo } from "@/lib/status-cliente"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { motion } from "framer-motion"
import {
  UsersIcon as Users,
  TrendingUpIcon as TrendingUp,
  TrendingDownIcon as TrendingDown,
  BanknoteIcon as Banknote,
  TargetIcon as Target,
  AlertTriangleIcon as AlertTriangle,
  ArrowUpRightIcon as ArrowUpRight,
  FilterIcon as Filter,
} from "@/components/ui/icons"
import {
  ResponsiveContainer, ComposedChart, Bar, Line, XAxis, YAxis, CartesianGrid, Tooltip,
} from "recharts"

const MESES = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"]

interface Cliente {
  id_cliente: string
  created_at: string | null
  data_cancelamento: string | null
  status_atual: string | null
  canal_de_venda: string | null
  produto: string | null
  nicho: string | null
  sc: string | null
  renovacao_data: string | null
  renovacao_valor: number | null
  saude_cliente: string | null
  temperatura_cliente: string | null
  em_risco_cancelamento: boolean | null
  nome_cliente_formatado: string | null
  nome_empresa_formatado: string | null
}

const brl = (n: number) => n.toLocaleString("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 })
const num = (n: number) => n.toLocaleString("pt-BR")

function iniciais(nome: string | null): string {
  if (!nome) return "—"
  const p = nome.trim().split(/\s+/)
  return ((p[0]?.[0] ?? "") + (p[1]?.[0] ?? "")).toUpperCase() || "—"
}

function saudeBucket(v: string | null): "risco" | "atencao" | "saudavel" | null {
  if (!v) return null
  const s = v.toLowerCase()
  if (/(risco|ruim|cr[íi]tic|vermelh|baix)/.test(s)) return "risco"
  if (/(aten|m[ée]di|amarel|morn)/.test(s)) return "atencao"
  return "saudavel"
}

export default function Dashboard2({ embedded = false }: { embedded?: boolean } = {}) {
  const [clientes, setClientes] = useState<Cliente[]>([])
  const [metas, setMetas] = useState<any[]>([])
  const [ultimoContato, setUltimoContato] = useState<Record<string, string>>({})
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function carregar() {
      const ano = new Date().getFullYear()
      const [{ data: cli }, { data: mt }, { data: rg }, { data: rm }] = await Promise.all([
        supabase.from("clientes_entrada_new").select(
          "id_cliente, created_at, data_cancelamento, status_atual, canal_de_venda, produto, nicho, sc, renovacao_data, renovacao_valor, saude_cliente, temperatura_cliente, em_risco_cancelamento, nome_cliente_formatado, nome_empresa_formatado"
        ),
        supabase.from("canais_vendas_metas").select("produto, planejado, realizado").eq("ano", ano),
        supabase.from("reunioes_galdino").select("id_cliente, data_reuniao, cliente_compareceu"),
        supabase.from("reunioes_mentoria_new").select("id_cliente, data_reuniao, cliente_compareceu"),
      ])
      // último contato = reunião mais recente em que o cliente compareceu
      const uc: Record<string, string> = {}
      ;[...(rg ?? []), ...(rm ?? [])].forEach((r: any) => {
        if (!r.id_cliente || !r.data_reuniao || r.cliente_compareceu === false) return
        if (!uc[r.id_cliente] || r.data_reuniao > uc[r.id_cliente]) uc[r.id_cliente] = r.data_reuniao
      })
      setClientes(cli ?? [])
      setMetas(mt ?? [])
      setUltimoContato(uc)
      setLoading(false)
    }
    carregar()
  }, [])

  const hoje = new Date()
  const anoAtual = hoje.getFullYear()
  const mesAtual = hoje.getMonth() // 0-11

  // ---- métricas de status ----
  const total = clientes.length
  const ativos = clientes.filter((c) => isStatusAtivo(c.status_atual)).length
  const cancelados = clientes.filter((c) => c.status_atual === "Cliente Cancelado").length
  const desistencias = clientes.filter((c) => c.status_atual === "Desistência de Compra").length
  const churnAcum = total > 0 ? (cancelados / total) * 100 : 0
  const emRiscoLista = useMemo(() => clientes.filter((c) => c.em_risco_cancelamento === true), [clientes])
  const emRisco = emRiscoLista.length

  // ---- entradas x saídas por mês (ano atual) + delta ----
  const entradasPorMes = useMemo(() => {
    const arr = Array(12).fill(0)
    clientes.forEach((c) => {
      if (!c.created_at) return
      const d = new Date(c.created_at)
      if (d.getFullYear() === anoAtual) arr[d.getMonth()]++
    })
    return arr
  }, [clientes, anoAtual])

  const saidasPorMes = useMemo(() => {
    const arr = Array(12).fill(0)
    clientes.forEach((c) => {
      if (!c.data_cancelamento) return
      const d = new Date(c.data_cancelamento + "T00:00:00")
      if (d.getFullYear() === anoAtual) arr[d.getMonth()]++
    })
    return arr
  }, [clientes, anoAtual])

  const novosMes = entradasPorMes[mesAtual]
  const novosMesAnterior = mesAtual > 0 ? entradasPorMes[mesAtual - 1] : 0
  const deltaNovos = novosMesAnterior > 0 ? Math.round(((novosMes - novosMesAnterior) / novosMesAnterior) * 100) : null
  const saldoMes = novosMes - saidasPorMes[mesAtual]

  const chartData = useMemo(
    () => MESES.slice(0, mesAtual + 1).map((m, i) => ({
      mes: m,
      entradas: entradasPorMes[i],
      saidas: saidasPorMes[i],
      saldo: entradasPorMes[i] - saidasPorMes[i],
    })),
    [entradasPorMes, saidasPorMes, mesAtual]
  )

  // ---- renovação (próximos 90 dias) ----
  const renov = useMemo(() => {
    const faixas = { d30: { q: 0, v: 0 }, d60: { q: 0, v: 0 }, d90: { q: 0, v: 0 } }
    let temDados = false
    clientes.forEach((c) => {
      if (!c.renovacao_data) return
      temDados = true
      const dias = Math.ceil((new Date(c.renovacao_data).getTime() - hoje.getTime()) / 86400000)
      const v = Number(c.renovacao_valor) || 0
      if (dias < 0 || dias > 90) return
      const f = dias <= 30 ? faixas.d30 : dias <= 60 ? faixas.d60 : faixas.d90
      f.q++
      f.v += v
    })
    return { ...faixas, temDados }
  }, [clientes])

  // ---- meta x realizado por produto ----
  const metaProduto = useMemo(() => {
    const map: Record<string, { plan: number; real: number }> = {}
    metas.forEach((m) => {
      const k = m.produto || "pmc"
      map[k] = map[k] || { plan: 0, real: 0 }
      map[k].plan += m.planejado || 0
      map[k].real += m.realizado || 0
    })
    return map
  }, [metas])
  const temMeta = Object.keys(metaProduto).length > 0

  // ---- saúde ----
  const saude = useMemo(() => {
    const b = { saudavel: 0, atencao: 0, risco: 0, semDado: 0 }
    clientes.forEach((c) => {
      const k = saudeBucket(c.saude_cliente)
      if (!k) b.semDado++
      else b[k]++
    })
    return b
  }, [clientes])
  const temSaude = saude.saudavel + saude.atencao + saude.risco > 0

  // ---- distribuições (canal / nicho / cs) ----
  function contagem(campo: keyof Cliente) {
    const map: Record<string, number> = {}
    clientes.forEach((c) => { const v = c[campo] as string; if (v) map[v] = (map[v] || 0) + 1 })
    return Object.entries(map).map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value)
  }
  const porCanal = useMemo(() => contagem("canal_de_venda"), [clientes])
  const porNicho = useMemo(() => contagem("nicho").slice(0, 6), [clientes])

  if (loading) {
    return (
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => <Card key={i} className="h-36 animate-pulse bg-card/40" />)}
      </div>
    )
  }

  return (
    <div className="space-y-8">
      {!embedded && (
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div className="flex flex-col gap-3 border-l-4 border-primary pl-8 py-2">
            <h1 className="text-4xl lg:text-5xl font-bold tracking-tight text-foreground">Visão Geral</h1>
            <div className="flex items-center gap-3">
              <Badge variant="outline" className="bg-primary/5 border-primary/20 text-primary">Estratégica</Badge>
              <p className="text-muted-foreground font-medium text-sm">Crescimento, receita, risco e funil — {anoAtual}</p>
            </div>
          </div>
        </div>
      )}

      {/* KPIs */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
        <Kpi label="Total de clientes" value={num(total)} icon={Users} iconClass="text-primary bg-primary/10" hint="Base geral" />
        <Kpi
          label="Novos no mês"
          value={num(novosMes)}
          icon={TrendingUp}
          iconClass="text-emerald-400 bg-emerald-500/10"
          delta={deltaNovos}
          hint={`${MESES[mesAtual]}/${anoAtual}`}
        />
        <Kpi
          label="Saldo líquido do mês"
          value={`${saldoMes >= 0 ? "+" : ""}${num(saldoMes)}`}
          icon={saldoMes >= 0 ? TrendingUp : TrendingDown}
          iconClass={saldoMes >= 0 ? "text-emerald-400 bg-emerald-500/10" : "text-rose-400 bg-rose-500/10"}
          hint={`${novosMes} entradas · ${saidasPorMes[mesAtual]} saídas`}
        />
        <Kpi label="Clientes ativos" value={num(ativos)} icon={TrendingUp} iconClass="text-emerald-400 bg-emerald-500/10" hint={total > 0 ? `${Math.round((ativos / total) * 100)}% da base` : "—"} />
        <Kpi label="Em risco agora" value={num(emRisco)} icon={AlertTriangle} iconClass="text-amber-400 bg-amber-500/10" hint={`Churn acum. ${churnAcum.toFixed(1)}%`} />
      </div>

      {/* Crescimento */}
      <Card>
        <CardHeader className="border-b border-border/50">
          <CardTitle className="text-base font-semibold flex items-center gap-2"><TrendingUp className="size-4 text-primary" /> Crescimento — entradas × saídas × saldo</CardTitle>
        </CardHeader>
        <CardContent className="pt-5">
          <div className="flex items-center gap-4 mb-3 text-[11px] font-medium text-muted-foreground">
            <span className="flex items-center gap-1.5"><span className="size-2.5 rounded-sm bg-primary" />Entradas</span>
            <span className="flex items-center gap-1.5"><span className="size-2.5 rounded-sm bg-rose-400" />Saídas</span>
            <span className="flex items-center gap-1.5"><span className="w-3.5 h-0.5 rounded bg-emerald-400" />Saldo líquido</span>
          </div>
          <div className="h-[280px]">
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
                <XAxis dataKey="mes" axisLine={false} tickLine={false} tick={{ fill: "rgba(255,255,255,0.5)", fontSize: 12, fontWeight: 600 }} dy={8} />
                <YAxis hide />
                <Tooltip cursor={{ fill: "rgba(218,252,103,0.05)" }} contentStyle={{ backgroundColor: "rgba(0,0,0,0.85)", border: "1px solid rgba(218,252,103,0.2)", borderRadius: "12px", fontSize: "12px" }} />
                <Bar dataKey="entradas" name="Entradas" fill="#DAFC67" radius={[5, 5, 0, 0]} barSize={22} />
                <Bar dataKey="saidas" name="Saídas" fill="#FB7185" radius={[5, 5, 0, 0]} barSize={22} />
                <Line dataKey="saldo" name="Saldo líquido" stroke="#4ADE80" strokeWidth={2} dot={{ r: 3, fill: "#4ADE80" }} />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      {/* Receita & Meta */}
      <div className="grid gap-6 md:grid-cols-2">
        <Card className="min-h-[220px]">
          <CardHeader className="border-b border-border/50">
            <CardTitle className="text-base font-semibold flex items-center gap-2"><Banknote className="size-4 text-primary" /> Pipeline de renovação (90 dias)</CardTitle>
          </CardHeader>
          <CardContent className="pt-5">
            {renov.temDados ? (
              <div className="space-y-3">
                <LinhaRenov label="Vence em 30 dias" q={renov.d30.q} v={renov.d30.v} />
                <LinhaRenov label="31–60 dias" q={renov.d60.q} v={renov.d60.v} />
                <LinhaRenov label="61–90 dias" q={renov.d90.q} v={renov.d90.v} />
              </div>
            ) : (
              <Vazio texto="Sem datas de renovação cadastradas. Aparece aqui quando preencher renovação no cadastro do cliente." />
            )}
          </CardContent>
        </Card>

        <Card className="min-h-[220px]">
          <CardHeader className="border-b border-border/50">
            <CardTitle className="text-base font-semibold flex items-center gap-2"><Target className="size-4 text-primary" /> Meta × realizado por produto</CardTitle>
          </CardHeader>
          <CardContent className="pt-5">
            {temMeta ? (
              <div className="space-y-5">
                {Object.entries(metaProduto).map(([prod, v]) => {
                  const pct = v.plan > 0 ? Math.round((v.real / v.plan) * 100) : 0
                  return (
                    <div key={prod}>
                      <div className="flex justify-between text-[13px] mb-1.5">
                        <span className="font-medium capitalize">{prod === "conselho" ? "Conselho de Implementação" : prod.toUpperCase()}</span>
                        <span className="text-muted-foreground">{v.real} / {v.plan} · {pct}%</span>
                      </div>
                      <div className="h-2 rounded-full bg-muted/30 overflow-hidden">
                        <div className={`h-full ${pct >= 100 ? "bg-emerald-400" : pct >= 70 ? "bg-amber-400" : "bg-rose-400"}`} style={{ width: `${Math.min(pct, 100)}%` }} />
                      </div>
                    </div>
                  )
                })}
              </div>
            ) : (
              <Vazio texto="Sem metas lançadas. Preencha em Vendas → Canais de Vendas para acompanhar aqui." />
            )}
          </CardContent>
        </Card>
      </div>

      {/* Saúde & Funil */}
      <div className="grid gap-6 md:grid-cols-2">
        <Card className="min-h-[240px]">
          <CardHeader className="border-b border-border/50">
            <CardTitle className="text-base font-semibold flex items-center gap-2"><AlertTriangle className="size-4 text-primary" /> Saúde da base</CardTitle>
          </CardHeader>
          <CardContent className="pt-5">
            {temSaude ? (
              <div className="grid grid-cols-3 gap-3">
                <TileSaude n={saude.saudavel} label="Saudável" cor="text-emerald-400" />
                <TileSaude n={saude.atencao} label="Atenção" cor="text-amber-400" />
                <TileSaude n={saude.risco} label="Em risco" cor="text-rose-400" />
              </div>
            ) : (
              <Vazio texto="Sem classificação de saúde cadastrada. Aparece aqui quando o campo 'saúde do cliente' for preenchido." />
            )}
          </CardContent>
        </Card>

        <Card className="min-h-[240px]">
          <CardHeader className="border-b border-border/50">
            <CardTitle className="text-base font-semibold flex items-center gap-2"><Filter className="size-4 text-primary" /> Estágio dos clientes</CardTitle>
          </CardHeader>
          <CardContent className="pt-5 space-y-2.5">
            <Estagio label="Total (comprou)" q={total} base={total} cor="bg-primary" dark />
            <Estagio label="Ativos no programa" q={ativos} base={total} cor="bg-emerald-400" />
            <Estagio label="Cancelados" q={cancelados} base={total} cor="bg-rose-400" />
            <Estagio label="Desistência de compra" q={desistencias} base={total} cor="bg-orange-400" />
          </CardContent>
        </Card>
      </div>

      {/* Lista acionável — em risco */}
      <Card className="border-rose-500/20">
        <CardHeader className="border-b border-border/50">
          <CardTitle className="text-base font-semibold flex items-center gap-2">
            <AlertTriangle className="size-4 text-rose-400" /> Clientes em risco
            {emRisco > 0 && <Badge className="rounded-md bg-rose-500/15 text-rose-300 border-rose-500/30 text-[11px]">{emRisco}</Badge>}
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-4">
          {emRiscoLista.length ? (
            <div className="divide-y divide-border/50">
              {emRiscoLista.map((c, i) => {
                const b = saudeBucket(c.saude_cliente)
                const uc = ultimoContato[c.id_cliente]
                const diasSemContato = uc ? Math.floor((hoje.getTime() - new Date(uc + "T00:00:00").getTime()) / 86400000) : null
                return (
                  <div key={i} className="flex items-center gap-3 py-2.5">
                    <div className="size-9 rounded-full bg-rose-500/10 flex items-center justify-center shrink-0">
                      <span className="text-[11px] font-bold text-rose-300">{iniciais(c.nome_cliente_formatado || c.nome_empresa_formatado)}</span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-[14px] font-bold text-foreground truncate">{c.nome_cliente_formatado || c.nome_empresa_formatado || "—"}</p>
                      <p className="text-[12px] text-muted-foreground truncate">
                        {c.sc ? `CS ${c.sc}` : "sem CS"}{c.canal_de_venda ? ` · ${c.canal_de_venda}` : ""}
                      </p>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <span className={`text-[11px] font-medium ${diasSemContato != null && diasSemContato > 30 ? "text-rose-300" : "text-muted-foreground"}`}>
                        {diasSemContato != null ? `há ${diasSemContato}d` : "sem reunião"}
                      </span>
                      {c.temperatura_cliente && (
                        <Badge variant="outline" className="rounded-md text-[10px] border-border text-muted-foreground capitalize">{c.temperatura_cliente}</Badge>
                      )}
                      {b && (
                        <Badge variant="outline" className={`rounded-md text-[10px] border-border capitalize ${b === "risco" ? "text-rose-300" : b === "atencao" ? "text-amber-300" : "text-emerald-300"}`}>
                          {c.saude_cliente}
                        </Badge>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          ) : (
            <Vazio texto="Nenhum cliente marcado como 'em risco de cancelamento'. Marque no cadastro do cliente para eles aparecerem aqui como lista de ação." />
          )}
        </CardContent>
      </Card>

      {/* Distribuições (como hoje) */}
      <div className="grid gap-6 md:grid-cols-2">
        <Card className="min-h-[300px]">
          <CardHeader className="border-b border-border/50"><CardTitle className="text-base font-semibold">Por canal de venda</CardTitle></CardHeader>
          <CardContent className="pt-5">
            {porCanal.length ? <ListaBarras dados={porCanal} /> : <Vazio texto="Sem dados de canal." />}
          </CardContent>
        </Card>
        <Card className="min-h-[300px]">
          <CardHeader className="border-b border-border/50"><CardTitle className="text-base font-semibold">Top nichos</CardTitle></CardHeader>
          <CardContent className="pt-5">
            {porNicho.length ? <ListaBarras dados={porNicho} /> : <Vazio texto="Sem dados de nicho." />}
          </CardContent>
        </Card>
      </div>

      <p className="text-[11px] text-muted-foreground/70 flex items-center gap-1.5">
        <ArrowUpRight className="size-3" />
        Receita, saúde e "em risco" dependem dos campos correspondentes preenchidos no cadastro do cliente.
      </p>
    </div>
  )
}

function Kpi({ label, value, icon: Icon, iconClass, hint, delta }: { label: string; value: string; icon: any; iconClass: string; hint?: string; delta?: number | null }) {
  return (
    <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">{label}</CardTitle>
          <div className={`p-2.5 rounded-xl ${iconClass}`}><Icon className="size-4" /></div>
        </CardHeader>
        <CardContent>
          <div className="text-3xl font-bold tracking-tight">{value}</div>
          <div className="flex items-center gap-2 mt-2">
            {delta != null && (
              <span className={`text-[11px] font-bold flex items-center gap-0.5 ${delta >= 0 ? "text-emerald-400" : "text-rose-400"}`}>
                {delta >= 0 ? "▲" : "▼"} {Math.abs(delta)}%
              </span>
            )}
            {hint && <span className="text-[11px] font-medium text-muted-foreground">{hint}</span>}
          </div>
        </CardContent>
      </Card>
    </motion.div>
  )
}

function LinhaRenov({ label, q, v }: { label: string; q: number; v: number }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-[13px] text-muted-foreground">{label}</span>
      <span className="text-sm font-bold">{brl(v)} <span className="text-muted-foreground font-medium text-[12px]">· {q}</span></span>
    </div>
  )
}

function TileSaude({ n, label, cor }: { n: number; label: string; cor: string }) {
  return (
    <div className="text-center bg-muted/10 rounded-xl py-4">
      <p className={`text-3xl font-bold tracking-tight ${cor}`}>{num(n)}</p>
      <p className="text-[11px] font-medium text-muted-foreground mt-1">{label}</p>
    </div>
  )
}

function Estagio({ label, q, base, cor, dark }: { label: string; q: number; base: number; cor: string; dark?: boolean }) {
  const pct = base > 0 ? Math.round((q / base) * 100) : 0
  return (
    <div>
      <div className="flex justify-between text-[13px] mb-1"><span className="font-medium">{label}</span><span className="text-muted-foreground">{q} · {pct}%</span></div>
      <div className="h-6 rounded-lg bg-muted/20 overflow-hidden">
        <div className={`h-full ${cor} flex items-center px-2 ${dark ? "text-black" : "text-black/80"} text-[11px] font-bold`} style={{ width: `${Math.max(pct, 6)}%` }} />
      </div>
    </div>
  )
}

function ListaBarras({ dados }: { dados: { name: string; value: number }[] }) {
  const max = Math.max(...dados.map((d) => d.value), 1)
  return (
    <div className="space-y-2.5">
      {dados.map((d) => (
        <div key={d.name} className="flex items-center gap-3">
          <span className="text-[12px] font-medium text-muted-foreground w-32 truncate shrink-0" title={d.name}>{d.name}</span>
          <div className="flex-1 h-5 rounded-md bg-muted/20 overflow-hidden">
            <div className="h-full bg-primary/70 rounded-md" style={{ width: `${(d.value / max) * 100}%` }} />
          </div>
          <span className="text-[12px] font-bold tabular-nums w-8 text-right">{d.value}</span>
        </div>
      ))}
    </div>
  )
}

function Vazio({ texto }: { texto: string }) {
  return (
    <div className="flex items-center justify-center text-center h-full min-h-[120px] px-6">
      <p className="text-[13px] font-medium text-muted-foreground/70 max-w-xs">{texto}</p>
    </div>
  )
}
