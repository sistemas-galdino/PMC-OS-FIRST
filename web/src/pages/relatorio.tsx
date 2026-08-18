// Relatório do cliente — "Seu progresso no PMC": consolida vitórias, fases do
// Método avançadas, economia gerada (R$ e horas) e reuniões. Prova de valor.
import { useEffect, useState } from "react"
import { supabase } from "@/lib/supabase"
import { PageHeader } from "@/components/layout/page-header"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { motion } from "framer-motion"
import {
  TargetIcon as Target,
  BanknoteIcon as Banknote,
  TrendingUpIcon as TrendingUp,
  ClockIcon as Clock,
  VideoIcon as Video,
  CheckCircle2Icon as CheckCircle2,
} from "@/components/ui/icons"
import type { Session } from "@supabase/supabase-js"
import { ETAPAS_METODO } from "@/data/etapas-metodo"

interface Props { session?: Session; clientId?: string }

const FASES = [
  { tabela: "metodo_guardioes", nome: "Guardião da IA" },
  { tabela: "metodo_areas", nome: "Inteligência Empresarial" },
  { tabela: "metodo_gargalos", nome: "Mapeamento de Gargalos" },
  { tabela: "metodo_copilotos", nome: "Co-Pilotos" },
  { tabela: "metodo_sistemas", nome: "Sistemas / Torre de Comando" },
  { tabela: "metodo_economias", nome: "Engenharia Operacional" },
]

const brl = (n: number) => n.toLocaleString("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 })
const num = (n: number) => n.toLocaleString("pt-BR")

export default function RelatorioPage({ session, clientId }: Props) {
  const cid = clientId || session?.user?.id
  const [loading, setLoading] = useState(true)
  const [dados, setDados] = useState({
    vitorias: 0,
    reunioes: 0,
    fasesComDados: 0,
    fasesFeitas: [] as boolean[],
    economiaMensal: 0,   // R$ recorrente por mês (custo evitado + valor do tempo)
    horasLiberadas: 0,   // horas por mês
    valorAno: 0,         // valor total gerado no ano (IAVS): recorrente×12 + únicos + decisões
  })

  useEffect(() => {
    if (!cid) return
    async function carregar() {
      try {
      const countFase = (t: string) =>
        supabase.from(t).select("id", { count: "exact", head: true }).eq("id_cliente", cid)
      const [
        vit, rg, rc, rb, eco, ...fasesCounts
      ] = await Promise.all([
        supabase.from("cliente_vitorias").select("id", { count: "exact", head: true }).eq("id_cliente", cid),
        supabase.from("reunioes_galdino").select("id_unico", { count: "exact", head: true }).eq("id_cliente", cid),
        supabase.from("reunioes_mentoria_new").select("id_unico", { count: "exact", head: true }).eq("equipe", "consultor").eq("id_cliente", cid),
        supabase.from("reunioes_blackcrm").select("id_unico", { count: "exact", head: true }).eq("id_cliente", cid),
        supabase.from("metodo_economias").select("horas_mes, valor_mes, natureza, recorrencia, capacidade_nova").eq("id_cliente", cid),
        ...FASES.map((f) => countFase(f.tabela)),
      ])

      const fasesFeitas = fasesCounts.map((r: any) => (r.count ?? 0) > 0)
      // Mesmo cálculo da Fase 6 (Engenharia). Ignora "capacidade nova" (receita
      // potencial, não economia). Recorrente conta ×12 no ano; únicos e decisões
      // entram uma vez. É o valor total gerado para a empresa (IAVS).
      const n = (x: unknown) => Number(x || 0)
      const ok = (eco.data ?? []).filter((e: any) => !e.capacidade_nova)
      const som = (fn: (e: any) => boolean, campo: string) => ok.filter(fn).reduce((a: number, e: any) => a + n(e[campo]), 0)
      const custoMes = som((e) => e.natureza === "custo_evitado" && e.recorrencia === "mensal", "valor_mes")
      const custoUnico = som((e) => e.natureza === "custo_evitado" && e.recorrencia === "unico", "valor_mes")
      const tempoMes = som((e) => e.natureza === "tempo_liberado" && e.recorrencia === "mensal", "valor_mes")
      const tempoUnico = som((e) => e.natureza === "tempo_liberado" && e.recorrencia === "unico", "valor_mes")
      const decisao = som((e) => e.natureza === "valor_decisao", "valor_mes")
      const horasLiberadas = som((e) => e.natureza === "tempo_liberado" && e.recorrencia === "mensal", "horas_mes")
      const economiaMensal = custoMes + tempoMes
      const valorAno = (custoMes + tempoMes) * 12 + custoUnico + tempoUnico + decisao

      setDados({
        vitorias: vit.count ?? 0,
        reunioes: (rg.count ?? 0) + (rc.count ?? 0) + (rb.count ?? 0),
        fasesComDados: fasesFeitas.filter(Boolean).length,
        fasesFeitas,
        economiaMensal,
        horasLiberadas,
        valorAno,
      })
      } catch (e) {
        console.error(e)
      } finally {
        setLoading(false)
      }
    }
    carregar()
  }, [cid])

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="h-16 w-1/2 bg-card/40 rounded-2xl animate-pulse" />
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {[1, 2, 3, 4].map((i) => <div key={i} className="h-32 bg-card/40 rounded-2xl animate-pulse" />)}
        </div>
      </div>
    )
  }

  const pctMetodo = Math.round((dados.fasesComDados / FASES.length) * 100)

  return (
    <div className="space-y-8 pb-10">
      <PageHeader title="Seu progresso no PMC" description="A prova em números da sua evolução no programa." />

      {/* Destaques */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Destaque icon={Banknote} cor="text-emerald-400 bg-emerald-500/10" valor={brl(dados.valorAno)} label="Valor gerado no ano" />
        <Destaque icon={TrendingUp} cor="text-emerald-400 bg-emerald-500/10" valor={brl(dados.economiaMensal)} label="Economia recorrente / mês" />
        <Destaque icon={Clock} cor="text-sky-400 bg-sky-500/10" valor={`${num(dados.horasLiberadas)}h`} label="Horas economizadas / mês" />
        <Destaque icon={Video} cor="text-violet-400 bg-violet-500/10" valor={num(dados.reunioes)} label="Reuniões realizadas" />
      </div>

      {/* Progresso no Método */}
      <Card>
        <CardHeader className="border-b border-border/50 flex flex-row items-center justify-between">
          <CardTitle className="text-base font-semibold flex items-center gap-2">
            <Target className="size-4 text-primary" /> Avanço no Método MC
          </CardTitle>
          <Badge className="rounded-lg bg-primary/10 text-primary border-primary/20 px-3 py-1 text-[10px] font-bold">
            {pctMetodo}% · {dados.fasesComDados}/{FASES.length} fases
          </Badge>
        </CardHeader>
        <CardContent className="pt-6 space-y-4">
          <div className="h-2 w-full rounded-full bg-muted/30 overflow-hidden">
            <div className="h-full rounded-full bg-primary transition-all" style={{ width: `${pctMetodo}%` }} />
          </div>
          <div className="grid gap-2 sm:grid-cols-2">
            {FASES.map((f, i) => (
              <div key={f.tabela} className="flex items-center gap-2.5 py-1.5">
                {dados.fasesFeitas[i]
                  ? <CheckCircle2 className="size-4 text-primary shrink-0" />
                  : <div className="size-4 rounded-full border-2 border-muted-foreground/25 shrink-0" />}
                <span className={`text-[13px] ${dados.fasesFeitas[i] ? "font-bold text-foreground" : "font-medium text-muted-foreground"}`}>{f.nome}</span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Nota de valor */}
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
        <Card className="border-primary/20">
          <CardContent className="p-6">
            {dados.valorAno > 0 || dados.horasLiberadas > 0 ? (
              <div className="space-y-2">
                <p className="text-[13px] font-bold uppercase tracking-widest text-primary">O que o método já gerou para a sua empresa</p>
                <p className="text-3xl lg:text-4xl font-bold tracking-tight text-foreground leading-snug">
                  <span className="text-primary">{brl(dados.valorAno)}</span> gerados no último ano
                </p>
                <p className="text-[14px] font-medium text-muted-foreground">
                  Somando economia recorrente (<span className="font-bold text-foreground">{brl(dados.economiaMensal)}/mês</span> e <span className="font-bold text-foreground">{num(dados.horasLiberadas)} horas/mês</span>), os ganhos únicos (como sistemas construídos) e o valor das decisões tomadas com IA. Continue avançando as fases para multiplicar esse retorno.
                </p>
              </div>
            ) : (
              <p className="text-[15px] font-medium text-foreground leading-relaxed">
                Comece a registrar suas economias no Método (Fase 6) para ver aqui, em números, quanto a sua empresa já gerou com o PMC.
              </p>
            )}
          </CardContent>
        </Card>
      </motion.div>

      <p className="text-[11px] text-muted-foreground/70">
        Jornada do método: {ETAPAS_METODO.length} etapas. Acompanhe o passo a passo na sua Minha Jornada.
      </p>
    </div>
  )
}

function Destaque({ icon: Icon, cor, valor, label }: { icon: any; cor: string; valor: string; label: string }) {
  return (
    <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}>
      <Card>
        <CardContent className="p-5">
          <div className={`inline-flex p-2.5 rounded-xl mb-3 ${cor}`}><Icon className="size-5" /></div>
          <p className="text-3xl font-bold tracking-tight text-foreground">{valor}</p>
          <p className="text-[12px] font-medium text-muted-foreground mt-1">{label}</p>
        </CardContent>
      </Card>
    </motion.div>
  )
}
