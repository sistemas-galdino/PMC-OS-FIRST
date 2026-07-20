// Balanço PMC — o retrato do ano do cliente no programa, para o momento da
// renovação. Duas camadas: (1) ENTREGA (o que a operação já registrou sobre ele:
// reuniões, ações, presença, e o resumo do GANHO de cada encontro — existe sempre)
// e (2) RESULTADO (vitórias com valor antes→depois — aparece quando existe).
// Não depende do cliente registrar nada: lê o rastro que a operação (reuniões via
// n8n, onboarding, vitórias validadas pelo CS) já produz.
//
// IMPORTANTE sobre o schema real (conferido no banco, difere do schema-db.md):
//   reunioes_*.ganho              -> TEXT (resumo qualitativo do encontro, NÃO valor)
//   reunioes_*.acoes_cliente      -> JSONB
//   reunioes_*.cliente_compareceu -> BOOLEAN
//   reunioes_*.nps                -> INTEGER
//   cliente_vitorias.valor_*      -> NUMERIC (a única fonte de $ confiável)
import { useEffect, useState } from "react"
import { supabase } from "@/lib/supabase"
import { PageHeader } from "@/components/layout/page-header"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { motion } from "framer-motion"
import {
  TrophyIcon as Trophy,
  AwardIcon as Award,
  BanknoteIcon as Banknote,
  VideoIcon as Video,
  TargetIcon as Target,
  FlagIcon as Flag,
  ZapIcon as Zap,
  StarIcon as Star,
  UserCheckIcon as UserCheck,
  CalendarIcon as Calendar,
  ArrowUpRightIcon as ArrowUpRight,
  CheckCircle2Icon as CheckCircle2,
} from "@/components/ui/icons"
import type { Session } from "@supabase/supabase-js"

interface Props { session?: Session; clientId?: string }

const brl = (n: number) =>
  n.toLocaleString("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 })
const num = (n: number) => n.toLocaleString("pt-BR")
const toNum = (x: unknown) => Number(x || 0)

// cliente_compareceu é boolean no banco novo, mas foi texto no legado — trata os dois.
const compareceu = (v: unknown) =>
  v === true || (typeof v === "string" && /sim|presente|compareceu|true/i.test(v))

// acoes_cliente é jsonb: pode vir array, objeto, string ou null.
const temAcao = (v: unknown): boolean => {
  if (v == null) return false
  if (Array.isArray(v)) return v.length > 0
  if (typeof v === "string") return v.trim().length > 3
  if (typeof v === "object") return Object.keys(v as object).length > 0
  return false
}

// ganho é um parágrafo qualitativo; só vale mostrar se tiver corpo de verdade.
const temGanho = (v: unknown): v is string => typeof v === "string" && v.trim().length > 20

interface Vitoria {
  titulo: string
  area: string | null
  o_que_fez: string | null
  valor_antes: number | null
  valor_depois: number | null
}

interface GanhoItem {
  texto: string
  origem: string
  data: string | null
}

interface Balanco {
  nome: string
  empresa: string
  entrada: string | null
  nivel: string | null
  renovacaoData: string | null
  objetivoEntrada: string | null
  faturamentoEntrada: string | null
  metaFaturamento: number
  // Camada 1 — Entrega
  reunioesGaldino: number
  reunioesMentoria: number
  reunioesBlackcrm: number
  acoesRecebidas: number
  presencas: number
  encontrosAoVivo: number   // encontros de grupo realizados desde a entrada do cliente
  npsMedio: number | null
  ganhos: GanhoItem[]
  // Camada 2 — Resultado
  vitorias: Vitoria[]
  valorVitorias: number
}

export default function BalancoPage({ session, clientId }: Props) {
  const cid = clientId || session?.user?.id
  const [loading, setLoading] = useState(true)
  const [b, setB] = useState<Balanco | null>(null)

  useEffect(() => {
    if (!cid) return
    let cancel = false

    async function carregar() {
      const reunioes = (t: string) =>
        supabase.from(t).select("ganho, nps, acoes_cliente, cliente_compareceu, data_reuniao").eq("id_cliente", cid)

      const [entrada, form, rg, rm, rb, vit, enc] = await Promise.all([
        supabase
          .from("clientes_entrada_new")
          .select("nome_cliente, nome_empresa, data, nivel_multiplicador, renovacao_data")
          .eq("id_cliente", cid)
          .maybeSingle(),
        supabase
          .from("clientes_formulario")
          .select("faturamento_atual, meta_faturamento_12_meses, resultado_desejado, motivo_entrada, created_at, nome, empresa_nome")
          .eq("id_cliente", cid)
          .maybeSingle(),
        reunioes("reunioes_galdino"),
        reunioes("reunioes_mentoria_new"),
        reunioes("reunioes_blackcrm"),
        supabase
          .from("cliente_vitorias")
          .select("titulo, area, o_que_fez, valor_antes, valor_depois")
          .eq("id_cliente", cid),
        // Encontros ao vivo são de grupo (sem id_cliente): trazemos os realizados
        // e contamos client-side só os que ocorreram a partir da entrada do cliente.
        supabase
          .from("encontros_ao_vivo")
          .select("data_hora_inicio_iso, status")
          .eq("status", "realizado"),
      ])

      if (cancel) return

      const gRows = (rg.data ?? []) as any[]
      const mRows = (rm.data ?? []) as any[]
      const bRows = (rb.data ?? []) as any[]
      const marcar = (rows: any[], origem: string) => rows.map((r) => ({ ...r, __origem: origem }))
      const todas = [
        ...marcar(gRows, "Galdino"),
        ...marcar(mRows, "Consultor"),
        ...marcar(bRows, "Black CRM"),
      ]

      const npsVals = todas
        .map((r) => r.nps)
        .filter((x) => x !== null && x !== undefined && x !== "")
        .map(toNum)
      const npsMedio = npsVals.length ? npsVals.reduce((a, x) => a + x, 0) / npsVals.length : null

      const ganhos: GanhoItem[] = todas
        .filter((r) => temGanho(r.ganho))
        .map((r) => ({ texto: r.ganho.trim(), origem: r.__origem, data: r.data_reuniao ?? null }))
        .slice(0, 4)

      const vitorias: Vitoria[] = ((vit.data ?? []) as any[])
        .map((v) => ({
          titulo: v.titulo ?? "Vitória",
          area: v.area ?? null,
          o_que_fez: v.o_que_fez ?? null,
          valor_antes: v.valor_antes !== null ? toNum(v.valor_antes) : null,
          valor_depois: v.valor_depois !== null ? toNum(v.valor_depois) : null,
        }))
        .sort((a, b) => (b.valor_depois ?? 0) - (a.valor_depois ?? 0))

      const valorVitorias = vitorias.reduce(
        (a, v) => a + Math.max(0, (v.valor_depois ?? 0) - (v.valor_antes ?? 0)),
        0,
      )

      const e = entrada.data as any
      const f = form.data as any

      // Encontros ao vivo realizados a partir da data de entrada do cliente.
      const entradaRaw: string | null = e?.data || f?.created_at || null
      const entryDate = parseData(entradaRaw)
      const encontrosAoVivo = ((enc.data ?? []) as any[]).filter((r) => {
        const d = parseData(r.data_hora_inicio_iso)
        return d !== null && (!entryDate || d >= entryDate)
      }).length

      setB({
        nome: (e?.nome_cliente || f?.nome || "").split(" ")[0] || "",
        empresa: e?.nome_empresa || f?.empresa_nome || "",
        entrada: entradaRaw,
        nivel: e?.nivel_multiplicador || null,
        renovacaoData: e?.renovacao_data || null,
        objetivoEntrada: temGanho(f?.resultado_desejado)
          ? f.resultado_desejado
          : (temGanho(f?.motivo_entrada) ? f.motivo_entrada : null),
        faturamentoEntrada: (typeof f?.faturamento_atual === "string" && f.faturamento_atual.trim().length > 1)
          ? f.faturamento_atual
          : null,
        metaFaturamento: toNum(f?.meta_faturamento_12_meses),
        reunioesGaldino: gRows.length,
        reunioesMentoria: mRows.length,
        reunioesBlackcrm: bRows.length,
        acoesRecebidas: todas.filter((r) => temAcao(r.acoes_cliente)).length,
        presencas: todas.filter((r) => compareceu(r.cliente_compareceu)).length,
        encontrosAoVivo,
        npsMedio,
        ganhos,
        vitorias,
        valorVitorias,
      })
      setLoading(false)
    }

    carregar()
    return () => { cancel = true }
  }, [cid])

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="h-16 w-1/2 bg-card/40 rounded-2xl animate-pulse" />
        <div className="h-40 bg-card/40 rounded-2xl animate-pulse" />
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {[1, 2, 3, 4].map((i) => <div key={i} className="h-32 bg-card/40 rounded-2xl animate-pulse" />)}
        </div>
      </div>
    )
  }

  if (!b) return null

  const totalReunioes = b.reunioesGaldino + b.reunioesMentoria + b.reunioesBlackcrm
  const temResultado = b.valorVitorias > 0 || b.vitorias.length > 0
  const ano = anoDe(b.entrada)

  return (
    <div className="space-y-8 pb-12">
      <PageHeader
        title={<>Balanço PMC{b.empresa ? <> · <span className="text-primary">{b.empresa}</span></> : null}</>}
        description="O retrato do seu ano no programa: o que você recebeu e o que já conquistou. Montado com o que a operação registrou — reunião a reunião."
        action={ano ? (
          <Badge className="rounded-lg bg-primary/10 text-primary border-primary/20 px-3 py-1.5 text-[11px] font-bold whitespace-nowrap">
            <Calendar className="size-3.5 mr-1.5" /> Ciclo {ano}
          </Badge>
        ) : undefined}
      />

      {/* HERO — a manchete de valor */}
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}>
        <Card className="border-primary/25 overflow-hidden relative">
          <div className="absolute inset-0 bg-gradient-to-br from-primary/10 via-transparent to-transparent pointer-events-none" />
          <CardContent className="p-8 relative">
            {b.valorVitorias > 0 ? (
              <div className="space-y-3">
                <p className="text-[12px] font-bold uppercase tracking-widest text-primary flex items-center gap-2">
                  <Zap className="size-4" /> O que o PMC gerou para o seu negócio
                </p>
                <p className="text-4xl lg:text-5xl font-bold tracking-tight text-foreground leading-tight">
                  <span className="text-primary">{brl(b.valorVitorias)}</span>
                </p>
                <p className="text-[15px] font-medium text-muted-foreground max-w-2xl leading-relaxed">
                  Em ganho registrado nas suas <span className="font-bold text-foreground">{num(b.vitorias.length)} vitórias</span>, ao longo de <span className="font-bold text-foreground">{num(totalReunioes)} reuniões</span> estratégicas no programa.
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                <p className="text-[12px] font-bold uppercase tracking-widest text-primary flex items-center gap-2">
                  <Award className="size-4" /> Seu ano no PMC, em números
                </p>
                <p className="text-4xl lg:text-5xl font-bold tracking-tight text-foreground leading-tight">
                  <span className="text-primary">{num(totalReunioes)}</span> reuniões estratégicas
                </p>
                <p className="text-[15px] font-medium text-muted-foreground max-w-2xl leading-relaxed">
                  Acompanhamento próximo com o Galdino, os consultores e o time — cada encontro com um ganho registrado para o seu negócio (abaixo). O valor em R$ aparece aqui conforme suas vitórias forem registradas.
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </motion.div>

      {/* ONDE VOCÊ COMEÇOU — o retrato de entrada, nas palavras do cliente */}
      {(b.objetivoEntrada || b.faturamentoEntrada || b.metaFaturamento > 0) && (
        <Card>
          <CardHeader className="border-b border-border/50">
            <CardTitle className="text-base font-semibold flex items-center gap-2">
              <Flag className="size-4 text-primary" /> Onde você começou
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-6 space-y-5">
            {b.objetivoEntrada && (
              <blockquote className="border-l-2 border-primary/40 pl-4">
                <p className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground mb-1.5">
                  Quando entrou{b.nome ? `, ${b.nome}` : ""}, seu objetivo era
                </p>
                <p className="text-[15px] font-medium text-foreground leading-relaxed italic">
                  "{b.objetivoEntrada}"
                </p>
              </blockquote>
            )}
            {(b.faturamentoEntrada || b.metaFaturamento > 0) && (
              <div className="grid gap-4 sm:grid-cols-2">
                {b.faturamentoEntrada && (
                  <MiniStat label="Faturamento na entrada" valor={b.faturamentoEntrada} />
                )}
                {b.metaFaturamento > 0 && (
                  <MiniStat label="Meta de 12 meses" valor={brl(b.metaFaturamento)} destaque />
                )}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* CAMADA 1 — O QUE VOCÊ RECEBEU */}
      <div className="space-y-4">
        <SectionTitle icon={Video} texto="O que você recebeu" sub="A entrega do programa — sempre registrada, reunião a reunião." />
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Destaque icon={Star} cor="text-amber-400 bg-amber-500/10" valor={num(b.reunioesGaldino)} label="Reuniões com o Galdino" />
          <Destaque icon={Video} cor="text-violet-400 bg-violet-500/10" valor={num(b.reunioesMentoria)} label="Reuniões com consultores" />
          <Destaque icon={Calendar} cor="text-rose-400 bg-rose-500/10" valor={num(b.encontrosAoVivo)} label="Encontros ao vivo no seu ciclo" />
          <Destaque icon={Target} cor="text-sky-400 bg-sky-500/10" valor={num(b.acoesRecebidas)} label="Reuniões com plano de ação" />
        </div>
        {(b.presencas > 0 || b.reunioesBlackcrm > 0 || b.npsMedio !== null || b.nivel) && (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {b.npsMedio !== null && <InfoCard icon={Award} label="Satisfação média (NPS)" valor={`${b.npsMedio.toFixed(1)} / 10`} />}
            {b.nivel && <InfoCard icon={Trophy} label="Seu nível no programa" valor={`Multiplicador ${b.nivel}`} />}
            {b.presencas > 0 && <InfoCard icon={UserCheck} label="Presenças confirmadas" valor={num(b.presencas)} />}
            {b.reunioesBlackcrm > 0 && <InfoCard icon={Zap} label="Implementações Black CRM" valor={num(b.reunioesBlackcrm)} />}
          </div>
        )}
      </div>

      {/* O QUE SUAS REUNIÕES GERARAM — a camada qualitativa (campo `ganho`) */}
      {b.ganhos.length > 0 && (
        <div className="space-y-4">
          <SectionTitle icon={Zap} texto="O que suas reuniões geraram" sub="O ganho registrado em cada encontro — sem você precisar anotar nada." />
          <div className="grid gap-3 md:grid-cols-2">
            {b.ganhos.map((g, i) => (
              <motion.div key={i} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}>
                <Card className="h-full">
                  <CardContent className="p-5">
                    <div className="flex items-center gap-2 mb-2.5">
                      <Badge className="rounded-md bg-primary/10 text-primary border-primary/20 px-2 py-0.5 text-[10px] font-bold">{g.origem}</Badge>
                      {g.data && <span className="text-[11px] text-muted-foreground font-medium">{g.data}</span>}
                    </div>
                    <p className="text-[13px] text-foreground/90 leading-relaxed line-clamp-5">{g.texto}</p>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
        </div>
      )}

      {/* CAMADA 2 — O QUE VOCÊ CONQUISTOU */}
      {temResultado && (
        <div className="space-y-4">
          <SectionTitle icon={Trophy} texto="O que você conquistou" sub="Os resultados que você já colheu dentro do PMC." />
          {b.valorVitorias > 0 && (
            <Card className="border-primary/20">
              <CardContent className="p-5 flex items-center gap-4">
                <div className="inline-flex p-3 rounded-xl bg-primary/10 text-primary"><Banknote className="size-6" /></div>
                <div>
                  <p className="text-3xl font-bold text-foreground">{brl(b.valorVitorias)}</p>
                  <p className="text-[13px] font-medium text-muted-foreground">Ganho somado nas suas vitórias (antes → depois)</p>
                </div>
              </CardContent>
            </Card>
          )}
          {b.vitorias.length > 0 && (
            <div className="grid gap-3">
              {b.vitorias.slice(0, 6).map((v, i) => {
                const delta = (v.valor_depois ?? 0) - (v.valor_antes ?? 0)
                return (
                  <motion.div key={i} initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.04 }}>
                    <Card>
                      <CardContent className="p-4 flex items-start gap-3">
                        <CheckCircle2 className="size-5 text-primary shrink-0 mt-0.5" />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <p className="text-[14px] font-bold text-foreground">{v.titulo}</p>
                            {v.area && <Badge className="rounded-md bg-muted/40 text-muted-foreground border-transparent px-2 py-0.5 text-[10px] font-semibold">{v.area}</Badge>}
                          </div>
                          {v.o_que_fez && <p className="text-[12px] text-muted-foreground mt-1 line-clamp-2">{v.o_que_fez}</p>}
                          {delta > 0 && (
                            <p className="text-[12px] font-bold text-primary mt-1.5 flex items-center gap-1">
                              <ArrowUpRight className="size-3.5" /> {brl(v.valor_antes ?? 0)} → {brl(v.valor_depois ?? 0)}
                            </p>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  </motion.div>
                )
              })}
            </div>
          )}
        </div>
      )}

      {/* NOTA DE RENOVAÇÃO */}
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
        <Card className="border-primary/20 bg-primary/5">
          <CardContent className="p-6">
            <p className="text-[13px] font-bold uppercase tracking-widest text-primary mb-2">Seu próximo ciclo</p>
            <p className="text-[15px] font-medium text-foreground leading-relaxed">
              {b.renovacaoData
                ? <>Sua renovação está prevista para <span className="font-bold text-primary">{formatarData(b.renovacaoData)}</span>. Este balanço é o retrato do que você construiu — e a base do que vem pela frente.</>
                : <>Este é o retrato do que você já construiu no PMC. O próximo ciclo é onde a gente multiplica esse resultado.</>}
            </p>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  )
}

function SectionTitle({ icon: Icon, texto, sub }: { icon: any; texto: string; sub: string }) {
  return (
    <div className="flex items-start gap-2.5">
      <div className="inline-flex p-2 rounded-lg bg-primary/10 text-primary mt-0.5"><Icon className="size-4" /></div>
      <div>
        <h2 className="text-lg font-bold tracking-tight text-foreground">{texto}</h2>
        <p className="text-[13px] text-muted-foreground font-medium">{sub}</p>
      </div>
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

function InfoCard({ icon: Icon, label, valor }: { icon: any; label: string; valor: string }) {
  return (
    <Card>
      <CardContent className="p-5 flex items-center justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[12px] font-medium text-muted-foreground">{label}</p>
          <p className="text-2xl font-bold text-foreground mt-1 truncate">{valor}</p>
        </div>
        <Icon className="size-8 text-primary/40 shrink-0" />
      </CardContent>
    </Card>
  )
}

function MiniStat({ label, valor, destaque }: { label: string; valor: string; destaque?: boolean }) {
  return (
    <div className="rounded-xl border border-border/60 p-4">
      <p className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground mb-1">{label}</p>
      <p className={`text-xl font-bold tracking-tight ${destaque ? "text-primary" : "text-foreground"}`}>{valor}</p>
    </div>
  )
}

function parseData(v: unknown): Date | null {
  if (!v || typeof v !== "string") return null
  const d = new Date(v)
  return isNaN(d.getTime()) ? null : d
}

function anoDe(v: string | null): string | null {
  if (!v) return null
  const m = String(v).match(/(20\d{2})/)
  return m ? m[1] : null
}

function formatarData(v: string): string {
  const d = new Date(v)
  if (!isNaN(d.getTime())) return d.toLocaleDateString("pt-BR", { day: "2-digit", month: "long", year: "numeric" })
  return String(v)
}
