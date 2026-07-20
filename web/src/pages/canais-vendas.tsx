// Canais de Vendas (dono/PMC): planejado x realizado de nº de vendas por canal.
// Entrada mensal; trimestre e semestre somam automaticamente. Admin-only.
import { useEffect, useMemo, useState } from "react"
import { supabase } from "@/lib/supabase"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent } from "@/components/ui/card"
import {
  TargetIcon as Target,
  ChevronRightIcon as ChevronRight,
  SaveIcon as Save,
  TrendingUpIcon as TrendingUp,
} from "@/components/ui/icons"
import { CANAIS, PRODUTOS, MESES, periodosDaVisao, type Visao } from "@/data/canais-vendas"
import { exportarCsv } from "@/lib/export-csv"
import { DownloadIcon as Download } from "@/components/ui/icons"

const ANO_ATUAL = 2026
const CONSOLIDADO = "consolidado"

type Cell = { planejado: number; realizado: number }
const VISOES: { slug: Visao; label: string }[] = [
  { slug: "mensal", label: "Mensal" },
  { slug: "trimestral", label: "Trimestral" },
  { slug: "semestral", label: "Semestral" },
]

function chave(produto: string, mes: number, canal: string) {
  return `${produto}:${mes}:${canal}`
}

function pctCor(pct: number): string {
  if (pct >= 100) return "text-emerald-400"
  if (pct >= 70) return "text-amber-400"
  return "text-rose-400"
}

function fmt(n: number): string {
  return n.toLocaleString("pt-BR")
}

export default function CanaisVendasPage() {
  const [ano, setAno] = useState(ANO_ATUAL)
  const [produto, setProduto] = useState<string>(PRODUTOS[0].slug)
  const [visao, setVisao] = useState<Visao>("mensal")
  const [valores, setValores] = useState<Record<string, Cell>>({})
  const [loading, setLoading] = useState(true)
  const [salvando, setSalvando] = useState(false)
  const [dirty, setDirty] = useState(false)
  const [salvo, setSalvo] = useState(false)

  const consolidado = produto === CONSOLIDADO

  useEffect(() => {
    async function carregar() {
      setLoading(true)
      const { data } = await supabase
        .from("canais_vendas_metas")
        .select("produto, mes, canal, planejado, realizado")
        .eq("ano", ano)
      const map: Record<string, Cell> = {}
      ;(data ?? []).forEach((r) => {
        map[chave(r.produto ?? "pmc", r.mes, r.canal)] = { planejado: r.planejado ?? 0, realizado: r.realizado ?? 0 }
      })
      setValores(map)
      setDirty(false)
      setLoading(false)
    }
    carregar()
  }, [ano])

  const periodos = useMemo(() => periodosDaVisao(visao), [visao])

  // valor bruto de um produto específico
  function getProduto(prod: string, mes: number, canal: string): Cell {
    return valores[chave(prod, mes, canal)] ?? { planejado: 0, realizado: 0 }
  }

  // valor efetivo conforme a seleção: consolidado soma os dois produtos
  function get(mes: number, canal: string): Cell {
    if (consolidado) {
      return PRODUTOS.reduce(
        (acc, p) => {
          const c = getProduto(p.slug, mes, canal)
          return { planejado: acc.planejado + c.planejado, realizado: acc.realizado + c.realizado }
        },
        { planejado: 0, realizado: 0 }
      )
    }
    return getProduto(produto, mes, canal)
  }

  function setCampo(mes: number, canal: string, campo: keyof Cell, valor: number) {
    setValores((prev) => {
      const k = chave(produto, mes, canal)
      const atual = prev[k] ?? { planejado: 0, realizado: 0 }
      return { ...prev, [k]: { ...atual, [campo]: valor } }
    })
    setDirty(true)
    setSalvo(false)
  }

  // soma de um período (lista de meses) para um canal
  function somaCanal(meses: number[], canal: string): Cell {
    return meses.reduce(
      (acc, m) => {
        const c = get(m, canal)
        return { planejado: acc.planejado + c.planejado, realizado: acc.realizado + c.realizado }
      },
      { planejado: 0, realizado: 0 }
    )
  }

  // soma de um período somando todos os canais
  function somaPeriodo(meses: number[]): Cell {
    return CANAIS.reduce(
      (acc, canal) => {
        const c = somaCanal(meses, canal.slug)
        return { planejado: acc.planejado + c.planejado, realizado: acc.realizado + c.realizado }
      },
      { planejado: 0, realizado: 0 }
    )
  }

  const todosMeses = useMemo(() => Array.from({ length: 12 }, (_, i) => i + 1), [])
  const totalAno = useMemo(() => somaPeriodo(todosMeses), [valores]) // eslint-disable-line react-hooks/exhaustive-deps
  const pctAno = totalAno.planejado > 0 ? Math.round((totalAno.realizado / totalAno.planejado) * 100) : 0

  async function salvar() {
    if (consolidado) return
    setSalvando(true)
    const rows = CANAIS.flatMap((canal) =>
      todosMeses.map((mes) => {
        const c = getProduto(produto, mes, canal.slug)
        return { ano, mes, canal: canal.slug, produto, planejado: c.planejado, realizado: c.realizado, updated_at: new Date().toISOString() }
      })
    )
    const { error } = await supabase.from("canais_vendas_metas").upsert(rows, { onConflict: "ano,mes,canal,produto" })
    setSalvando(false)
    if (!error) {
      setDirty(false)
      setSalvo(true)
      setTimeout(() => setSalvo(false), 2000)
    } else {
      alert("Erro ao salvar: " + error.message)
    }
  }

  function exportar() {
    const rotulo = consolidado ? "consolidado" : produto
    const linhas = CANAIS.flatMap((canal) =>
      todosMeses.map((mes) => {
        const c = get(mes, canal.slug)
        return { canal: canal.label, mes: MESES[mes - 1], planejado: c.planejado, realizado: c.realizado }
      })
    )
    exportarCsv(`canais-vendas-${rotulo}-${ano}`, [
      { chave: "canal", titulo: "Canal" },
      { chave: "mes", titulo: "Mês" },
      { chave: "planejado", titulo: "Planejado" },
      { chave: "realizado", titulo: "Realizado" },
    ], linhas)
  }

  const editavel = visao === "mensal" && !consolidado

  return (
    <div className="space-y-6 pb-10">
      {/* Cabeçalho */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="bg-primary/10 p-2.5 rounded-xl"><Target className="size-5 text-primary" /></div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Canais de Vendas</h1>
            <p className="text-sm text-muted-foreground font-medium">Planejado x realizado de vendas por canal — {ano}.</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {/* seletor de ano */}
          <div className="flex items-center rounded-xl border border-border overflow-hidden">
            <button onClick={() => setAno((a) => a - 1)} className="px-2.5 py-2 hover:bg-muted/40"><ChevronRight className="size-4 rotate-180" /></button>
            <span className="px-3 text-sm font-bold tabular-nums">{ano}</span>
            <button onClick={() => setAno((a) => a + 1)} className="px-2.5 py-2 hover:bg-muted/40"><ChevronRight className="size-4" /></button>
          </div>
          <Button
            variant="outline"
            onClick={exportar}
            className="h-10 gap-2 rounded-xl font-bold text-xs uppercase tracking-wider"
          >
            <Download className="size-4" /> Exportar
          </Button>
          {editavel && (
            <Button
              onClick={salvar}
              disabled={salvando || !dirty}
              className="h-10 gap-2 rounded-xl font-bold text-xs uppercase tracking-wider"
            >
              <Save className="size-4" />
              {salvando ? "Salvando..." : salvo ? "Salvo!" : dirty ? "Salvar" : "Salvo"}
            </Button>
          )}
        </div>
      </div>

      {/* Seletor de produto */}
      <div className="flex items-center gap-1 bg-muted/20 border border-border rounded-xl p-1 w-fit flex-wrap">
        {PRODUTOS.map((p) => (
          <button
            key={p.slug}
            onClick={() => setProduto(p.slug)}
            className={`rounded-lg px-4 py-1.5 text-[12px] font-bold transition-all ${produto === p.slug ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"}`}
          >
            {p.label}
          </button>
        ))}
        <button
          onClick={() => setProduto(CONSOLIDADO)}
          className={`rounded-lg px-4 py-1.5 text-[12px] font-bold transition-all ${consolidado ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"}`}
        >
          Consolidado
        </button>
      </div>

      {/* Resumo do ano */}
      <div className="grid gap-4 sm:grid-cols-3">
        <ResumoCard label="Meta do ano (planejado)" valor={fmt(totalAno.planejado)} />
        <ResumoCard label="Realizado no ano" valor={fmt(totalAno.realizado)} />
        <ResumoCard label="Atingimento" valor={`${pctAno}%`} corValor={pctCor(pctAno)} icon />
      </div>

      {/* Alternância de visão */}
      <div className="flex items-center gap-1 bg-muted/20 border border-border rounded-xl p-1 w-fit">
        {VISOES.map((v) => (
          <button
            key={v.slug}
            onClick={() => setVisao(v.slug)}
            className={`rounded-lg px-4 py-1.5 text-[12px] font-bold transition-all ${visao === v.slug ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"}`}
          >
            {v.label}
          </button>
        ))}
      </div>

      {!editavel && (
        <p className="text-[12px] font-medium text-muted-foreground -mt-2">
          {consolidado
            ? <>Visão de leitura — soma dos dois produtos. Para editar, escolha um produto na visão <b>Mensal</b>.</>
            : <>Visão de leitura — os valores somam os meses. Para editar, use a visão <b>Mensal</b>.</>}
        </p>
      )}

      {/* Tabela */}
      {loading ? (
        <div className="h-64 rounded-2xl bg-card/40 animate-pulse" />
      ) : (
        <Card className="overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-sm">
              <thead>
                <tr className="border-b border-border">
                  <th className="sticky left-0 z-10 bg-card text-left px-4 py-3 min-w-[190px] text-[11px] font-bold uppercase tracking-wider text-muted-foreground">Canal</th>
                  {periodos.map((p) => (
                    <th key={p.curto} colSpan={2} className="px-2 py-2 text-center text-[11px] font-bold uppercase tracking-wider text-muted-foreground border-l border-border/50" title={p.label}>
                      {p.curto}
                    </th>
                  ))}
                  <th colSpan={2} className="px-2 py-2 text-center text-[11px] font-bold uppercase tracking-wider text-primary border-l border-border">Total</th>
                </tr>
                <tr className="border-b border-border">
                  <th className="sticky left-0 z-10 bg-card" />
                  {periodos.map((p) => (
                    <SubHead key={p.curto} />
                  ))}
                  <SubHead total />
                </tr>
              </thead>
              <tbody>
                {CANAIS.map((canal) => {
                  const totalCanal = somaCanal(todosMeses, canal.slug)
                  return (
                    <tr key={canal.slug} className="border-b border-border/50 hover:bg-muted/10">
                      <td className="sticky left-0 z-10 bg-card px-4 py-2">
                        <div className="flex items-center gap-2">
                          <span className={`size-2.5 rounded-full ${canal.dot}`} />
                          <span className="font-bold text-foreground text-[13px]">{canal.label}</span>
                        </div>
                      </td>
                      {periodos.map((p) => {
                        if (editavel) {
                          const mes = p.meses[0]
                          const c = get(mes, canal.slug)
                          return (
                            <CellInputs
                              key={p.curto}
                              plan={c.planejado}
                              real={c.realizado}
                              onPlan={(v) => setCampo(mes, canal.slug, "planejado", v)}
                              onReal={(v) => setCampo(mes, canal.slug, "realizado", v)}
                            />
                          )
                        }
                        const s = somaCanal(p.meses, canal.slug)
                        return <CellReadonly key={p.curto} plan={s.planejado} real={s.realizado} />
                      })}
                      <CellReadonly plan={totalCanal.planejado} real={totalCanal.realizado} total />
                    </tr>
                  )
                })}
                {/* Total */}
                <tr className="border-t-2 border-border bg-muted/10 font-bold">
                  <td className="sticky left-0 z-10 bg-card px-4 py-3 text-[13px] font-bold text-foreground">Total</td>
                  {periodos.map((p) => {
                    const s = somaPeriodo(p.meses)
                    return <CellReadonly key={p.curto} plan={s.planejado} real={s.realizado} forte />
                  })}
                  <CellReadonly plan={totalAno.planejado} real={totalAno.realizado} total forte />
                </tr>
              </tbody>
            </table>
          </div>
        </Card>
      )}
    </div>
  )
}

function ResumoCard({ label, valor, corValor, icon }: { label: string; valor: string; corValor?: string; icon?: boolean }) {
  return (
    <Card>
      <CardContent className="p-5">
        <div className="flex items-center justify-between">
          <p className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground">{label}</p>
          {icon && <TrendingUp className="size-4 text-primary" />}
        </div>
        <p className={`text-3xl font-bold tracking-tight mt-2 tabular-nums ${corValor ?? "text-foreground"}`}>{valor}</p>
      </CardContent>
    </Card>
  )
}

function SubHead({ total }: { total?: boolean }) {
  const base = `px-2 py-1.5 text-center text-[10px] font-bold uppercase tracking-wide ${total ? "text-primary" : "text-muted-foreground/70"}`
  return (
    <>
      <th className={`${base} border-l border-border/50`}>Plan</th>
      <th className={base}>Real</th>
    </>
  )
}

function CellInputs({
  plan, real, onPlan, onReal,
}: { plan: number; real: number; onPlan: (v: number) => void; onReal: (v: number) => void }) {
  return (
    <>
      <td className="px-1 py-1 border-l border-border/50">
        <Input
          type="number"
          value={plan || ""}
          onChange={(e) => onPlan(Number(e.target.value) || 0)}
          className="h-9 w-16 text-center px-1 tabular-nums rounded-lg"
          placeholder="0"
        />
      </td>
      <td className="px-1 py-1">
        <Input
          type="number"
          value={real || ""}
          onChange={(e) => onReal(Number(e.target.value) || 0)}
          className="h-9 w-16 text-center px-1 tabular-nums rounded-lg bg-primary/5"
          placeholder="0"
        />
      </td>
    </>
  )
}

function CellReadonly({ plan, real, total, forte }: { plan: number; real: number; total?: boolean; forte?: boolean }) {
  const pct = plan > 0 ? Math.round((real / plan) * 100) : 0
  return (
    <>
      <td className={`px-2 py-2 text-center tabular-nums ${total ? "border-l border-border" : "border-l border-border/50"} ${forte ? "font-bold text-foreground" : "text-muted-foreground"}`}>
        {plan.toLocaleString("pt-BR")}
      </td>
      <td className="px-2 py-2 text-center tabular-nums">
        <span className={forte ? "font-bold text-foreground" : "text-foreground"}>{real.toLocaleString("pt-BR")}</span>
        {plan > 0 && <span className={`block text-[10px] font-bold ${pctCor(pct)}`}>{pct}%</span>}
      </td>
    </>
  )
}
