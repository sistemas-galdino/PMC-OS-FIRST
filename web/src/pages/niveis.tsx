// Como funciona o Nível PMC — explica todas as faixas, o que ganha ponto e o
// que fazer para subir. Mostra também a posição atual do cliente.
import { useEffect, useState } from "react"
import { useNavigate } from "react-router-dom"
import { supabase } from "@/lib/supabase"
import { PageHeader } from "@/components/layout/page-header"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { motion } from "framer-motion"
import {
  TargetIcon as Target,
  ChevronRightIcon as ChevronRight,
  CheckCircle2Icon as CheckCircle2,
  TrophyIcon as Trophy,
  SproutIcon as Sprout,
  ZapIcon as Zap,
  TrendingUpIcon as TrendingUp,
  Building2Icon as Building2,
  AwardIcon as Award,
} from "@/components/ui/icons"
import type { Session } from "@supabase/supabase-js"
import { FONTES_PONTOS, NIVEIS, calcularNivel, type SinaisNivel, type CorNivel } from "@/lib/nivel-pmc"
import { useConquistas } from "@/hooks/use-conquistas"
import { TRILHAS, RARIDADE, arquetipoDaBadge, iconeDaBadge, type BadgeCatalogo } from "@/data/badges-mc"

const ICONE_NIVEL: Record<string, typeof Target> = {
  sprout: Sprout, zap: Zap, trending: TrendingUp, building: Building2, award: Award,
}

// Badge do nível: arquétipo humanoide (imagem) com fallback para o ícone.
function ArquetipoNivel({ imagem, icone, fg, tamanho }: { imagem: string; icone: string; fg: string; tamanho: string }) {
  const [erro, setErro] = useState(false)
  const Icone = ICONE_NIVEL[icone] ?? Target
  if (erro) return <Icone className={`${tamanho === "lg" ? "size-8" : "size-7"} ${fg}`} />
  return (
    <img
      src={imagem}
      alt=""
      onError={() => setErro(true)}
      className="size-full object-cover rounded-[inherit]"
    />
  )
}
const COR_NIVEL: Record<CorNivel, { fg: string; bg: string; borda: string }> = {
  slate: { fg: "text-slate-300", bg: "bg-slate-500/15", borda: "border-slate-500/30" },
  sky: { fg: "text-sky-400", bg: "bg-sky-500/15", borda: "border-sky-500/30" },
  violet: { fg: "text-violet-400", bg: "bg-violet-500/15", borda: "border-violet-500/30" },
  amber: { fg: "text-amber-400", bg: "bg-amber-500/15", borda: "border-amber-500/30" },
  lime: { fg: "text-primary", bg: "bg-primary/15", borda: "border-primary/30" },
}
import { ETAPAS_METODO } from "@/data/etapas-metodo"

interface Props { session?: Session; clientId?: string }

const num = (n: number) => n.toLocaleString("pt-BR")

export default function NiveisPage({ session, clientId }: Props) {
  const cid = clientId || session?.user?.id
  const navigate = useNavigate()
  const [loading, setLoading] = useState(true)
  const [sinaisN, setSinaisN] = useState<SinaisNivel>({ etapas: 0, fases: 0, mapeamento: 0, reunioes: 0, vitorias: 0 })

  useEffect(() => {
    if (!cid) return
    async function carregar() {
      try {
      const cnt = (t: string, col = "id") => supabase.from(t).select(col, { count: "exact", head: true }).eq("id_cliente", cid)
      const [etapasRes, g, a, ga, cp, si, ec, vit, rg, rm, rb, mMetas, mProd, mCanais, mObj] = await Promise.all([
        supabase.from("cliente_etapas_metodo").select("etapa, concluida").eq("id_cliente", cid),
        cnt("metodo_guardioes"), cnt("metodo_areas"), cnt("metodo_gargalos"),
        cnt("metodo_copilotos"), cnt("metodo_sistemas"), cnt("metodo_economias"),
        cnt("cliente_vitorias"),
        cnt("reunioes_galdino", "id_unico"), cnt("reunioes_mentoria_new", "id_unico"), cnt("reunioes_blackcrm", "id_unico"),
        // Mapeamento (cliente_objetivos_programa não tem coluna id — conta por id_cliente)
        cnt("cliente_metas", "id_cliente"), cnt("cliente_produtos", "id_cliente"),
        cnt("cliente_canais", "id_cliente"), cnt("cliente_objetivos_programa", "id_cliente"),
      ])

      const manual = new Set<number>((etapasRes.data ?? []).filter((r: any) => r.concluida).map((r: any) => r.etapa))
      const sinaisSet = new Set<string>()
      if ((g.count ?? 0) > 0) sinaisSet.add("guardiao")
      if ((a.count ?? 0) > 0) sinaisSet.add("areas")
      if ((ga.count ?? 0) > 0) sinaisSet.add("gargalos")
      if ((cp.count ?? 0) > 0) sinaisSet.add("copilotos")
      if ((si.count ?? 0) > 0) sinaisSet.add("sistemas")
      if ((ec.count ?? 0) > 0) sinaisSet.add("economias")
      const reunioes = (rg.count ?? 0) + (rm.count ?? 0) + (rb.count ?? 0)
      if (reunioes > 0) sinaisSet.add("reunioes")

      const etapas = ETAPAS_METODO.filter((e) => manual.has(e.numero) || sinaisSet.has(e.sinal)).length
      const fases = [...sinaisSet].filter((s) => s !== "reunioes").length
      const mapeamento = [mMetas, mProd, mCanais, mObj].filter((r) => (r.count ?? 0) > 0).length

      setSinaisN({ etapas, fases, mapeamento, reunioes, vitorias: vit.count ?? 0 })
      } catch (e) {
        console.error(e)
      } finally {
        setLoading(false)
      }
    }
    carregar()
  }, [cid])

  const nivel = calcularNivel(sinaisN)
  const { catalogo, ganhas, metrics } = useConquistas(!!cid, true)

  return (
    <div className="space-y-8 pb-10">
      <PageHeader title="Como funciona o seu Nível PMC" description="Cada ação no programa vira Pontos MC. Some Pontos MC, suba de nível." />

      {/* Onde você está */}
      <Card className="border-primary/20 overflow-hidden">
        <CardContent className="p-6 bg-gradient-to-br from-primary/10 to-transparent">
          <div className="flex items-center justify-between gap-4 flex-wrap">
            <div className="flex items-center gap-4">
              {(() => {
                const n = NIVEIS[nivel.indice]
                const c = COR_NIVEL[n.cor]
                return (
                  <div className={`size-16 rounded-2xl flex items-center justify-center shrink-0 border overflow-hidden ${c.bg} ${c.borda}`}>
                    <ArquetipoNivel imagem={n.imagem} icone={n.icone} fg={c.fg} tamanho="lg" />
                  </div>
                )
              })()}
              <div>
                <p className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground">Seu nível agora</p>
                <p className="text-2xl font-bold tracking-tight text-foreground">{loading ? "…" : nivel.nome}</p>
              </div>
            </div>
            <div className="text-right">
              <p className="text-3xl font-bold tabular-nums text-primary leading-none">{loading ? "…" : num(nivel.pontos)}<span className="text-xs font-bold text-muted-foreground ml-1">Pontos MC</span></p>
              {!loading && nivel.proximoEm != null && (
                <p className="text-[12px] font-medium text-muted-foreground mt-1">Faltam {num(nivel.proximoEm)} Pontos MC para {NIVEIS[nivel.indice + 1].nome}</p>
              )}
            </div>
          </div>
          {!loading && (
            <div className="h-2 w-full rounded-full bg-muted/40 overflow-hidden mt-4">
              <div className="h-full rounded-full bg-primary transition-all" style={{ width: `${nivel.pctProximo}%` }} />
            </div>
          )}
        </CardContent>
      </Card>

      {/* Como ganhar pontos */}
      <div>
        <h2 className="text-lg font-bold tracking-tight text-foreground mb-1">Como ganhar Pontos MC</h2>
        <p className="text-sm text-muted-foreground font-medium mb-4">Quatro fontes somam para o seu nível. Quanto mais você usa o método, mais sobe.</p>
        <div className="grid gap-3 sm:grid-cols-2">
          {FONTES_PONTOS.map((f) => (
            <Card key={f.chave} className="group hover:border-primary/30 transition-colors">
              <CardContent className="p-4 flex items-start gap-4">
                <div className="shrink-0 rounded-xl bg-primary/10 text-primary font-bold text-sm px-3 py-2 tabular-nums">+{f.pontos}</div>
                <div className="min-w-0 flex-1">
                  <p className="text-[14px] font-bold text-foreground">{f.label}</p>
                  <p className="text-[12px] text-muted-foreground leading-relaxed mt-0.5">{f.descricao}</p>
                  <button onClick={() => navigate(f.rota)} className="text-[11px] font-bold text-primary hover:underline mt-1.5 inline-flex items-center gap-1">
                    Ir para {f.label.toLowerCase().includes("etapa") ? "a jornada" : "esta área"} <ChevronRight className="size-3" />
                  </button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      {/* Os níveis */}
      <div>
        <h2 className="text-lg font-bold tracking-tight text-foreground mb-1">Os 5 níveis</h2>
        <p className="text-sm text-muted-foreground font-medium mb-4">Sua faixa atual está destacada. Cada nível abre quando você chega na pontuação.</p>
        <div className="space-y-3">
          {NIVEIS.map((n, i) => {
            const atual = !loading && i === nivel.indice
            const conquistado = !loading && nivel.pontos >= n.minimo
            const teto = NIVEIS[i + 1]?.minimo
            const c = COR_NIVEL[n.cor]
            return (
              <motion.div key={n.nome} initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.06 }}>
                <Card className={atual ? `${c.borda} ring-1 ring-primary/20` : conquistado ? "border-border" : "opacity-80"}>
                  <CardContent className="p-5 flex items-start gap-4">
                    {/* Badge do nível — arquétipo humanoide */}
                    <div className={`shrink-0 relative size-20 rounded-2xl border ${c.bg} ${c.borda} ${conquistado ? "" : "grayscale opacity-70"}`}>
                      <div className="size-full rounded-2xl overflow-hidden flex items-center justify-center">
                        <ArquetipoNivel imagem={n.imagem} icone={n.icone} fg={c.fg} tamanho="md" />
                      </div>
                      {conquistado && (
                        <span className="absolute -bottom-1.5 -right-1.5 size-6 rounded-full bg-primary flex items-center justify-center ring-2 ring-background">
                          <CheckCircle2 className="size-4 text-primary-foreground" />
                        </span>
                      )}
                      <span className="absolute -top-2 -left-2 size-5 rounded-full bg-background border border-border flex items-center justify-center text-[10px] font-bold text-muted-foreground">{i + 1}</span>
                    </div>

                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className={`text-[16px] font-bold tracking-tight ${conquistado ? "text-foreground" : "text-muted-foreground"}`}>{n.nome}</p>
                        <Badge variant="outline" className={`rounded-md text-[10px] tabular-nums ${c.borda} ${c.fg}`}>
                          {teto ? `${num(n.minimo)}–${num(teto - 1)} pts MC` : `${num(n.minimo)}+ pts MC`}
                        </Badge>
                        {atual && <Badge className="rounded-md bg-primary/15 text-primary border-primary/30 text-[10px] font-bold">VOCÊ ESTÁ AQUI</Badge>}
                      </div>
                      <p className="text-[13px] font-bold text-foreground/90 mt-1.5">{n.titulo}</p>
                      <p className="text-[12px] text-muted-foreground leading-relaxed mt-1">{n.descricao}</p>
                      <div className="flex flex-wrap gap-1.5 mt-2.5">
                        {n.foco.map((f) => (
                          <span key={f} className="inline-flex items-center gap-1 rounded-lg bg-muted/30 border border-border/60 px-2 py-1 text-[11px] font-medium text-muted-foreground">
                            <span className={`size-1.5 rounded-full ${c.bg.replace("/15", "")}`} />{f}
                          </span>
                        ))}
                      </div>

                      {/* Progresso deste nível: passados = cheios, atual = parcial, futuros = régua p/ abrir */}
                      {!loading && (() => {
                        const faltamAbrir = Math.max(0, n.minimo - nivel.pontos)
                        const pctBanda = teto == null
                          ? (conquistado ? 100 : 0)
                          : Math.max(0, Math.min(100, Math.round(((nivel.pontos - n.minimo) / (teto - n.minimo)) * 100)))
                        const largura = conquistado && !atual ? 100 : atual ? pctBanda : 0
                        return (
                          <div className="mt-3">
                            <div className="h-1.5 w-full rounded-full bg-muted/30 overflow-hidden">
                              <div className={`h-full rounded-full transition-all ${conquistado || atual ? "bg-primary" : "bg-muted-foreground/25"}`} style={{ width: `${largura}%` }} />
                            </div>
                            <p className="text-[10px] font-medium text-muted-foreground mt-1">
                              {conquistado && !atual ? "Concluído ✓"
                                : atual && teto ? `${pctBanda}% · faltam ${num(teto - nivel.pontos)} pts MC para ${NIVEIS[i + 1].nome}`
                                : atual && !teto ? "Nível máximo atingido 🏆"
                                : `Faltam ${num(faltamAbrir)} pts MC para abrir`}
                            </p>
                          </div>
                        )
                      })()}
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            )
          })}
        </div>
      </div>

      {/* Suas Conquistas */}
      <div>
        <div className="flex items-center justify-between gap-3 mb-1">
          <h2 className="text-lg font-bold tracking-tight text-foreground">Suas Conquistas</h2>
          <span className="text-sm font-bold text-primary tabular-nums">{ganhas.size}/{catalogo.length || "…"}</span>
        </div>
        <p className="text-sm text-muted-foreground font-medium mb-4">Badges que você desbloqueia conforme avança. As bloqueadas mostram o que falta.</p>
        {Object.keys(TRILHAS).map((trilha) => {
          const badges = catalogo.filter((b) => b.trilha === trilha)
          if (badges.length === 0) return null
          return (
            <div key={trilha} className="mb-5">
              <p className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground mb-2">{TRILHAS[trilha]}</p>
              <div className="grid grid-cols-3 sm:grid-cols-4 lg:grid-cols-6 gap-3">
                {badges.map((b) => (
                  <BadgeCard key={b.slug} b={b} ganhaEm={ganhas.get(b.slug)} metric={metrics[b.meta_metrica] ?? 0} />
                ))}
              </div>
            </div>
          )
        })}
      </div>

      {/* CTA */}
      <Card className="border-primary/20">
        <CardContent className="p-6 flex items-center justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-3">
            <Trophy className="size-6 text-primary shrink-0" />
            <p className="text-[14px] font-medium text-foreground">O caminho mais rápido pra subir é avançar a sua jornada, uma etapa de cada vez.</p>
          </div>
          <Button onClick={() => navigate("/inicio")} className="h-10 gap-2 rounded-xl font-bold text-xs uppercase tracking-wider shrink-0">
            Ver minha jornada <ChevronRight className="size-4" />
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}

// Uma badge no grid de conquistas — colorida quando ganha, cinza + progresso quando bloqueada.
function BadgeCard({ b, ganhaEm, metric }: { b: BadgeCatalogo; ganhaEm?: string; metric: number }) {
  const ganha = !!ganhaEm
  const rar = RARIDADE[b.raridade] ?? RARIDADE.bronze
  const arq = arquetipoDaBadge(b.icone)
  const Icone = iconeDaBadge(b.icone)
  const pct = b.meta_valor > 0 ? Math.min(100, Math.round((metric / b.meta_valor) * 100)) : 0
  return (
    <div
      title={ganha ? b.descricao : b.criterio}
      className={`rounded-2xl border p-3 flex flex-col items-center text-center gap-1.5 transition-all ${ganha ? `${rar.bg} ${rar.borda} ${rar.brilho}` : "border-border bg-muted/10 opacity-70 hover:opacity-100"}`}
    >
      {/* Medalha (moldura por raridade) com o emblema no centro */}
      <div className={`relative size-16 shrink-0 transition-all ${ganha ? "" : "grayscale opacity-50"}`}>
        <img src={rar.medalha} alt="" className="size-full object-contain" />
        <div className="absolute inset-0 flex items-center justify-center pt-1.5">
          {arq
            ? <img src={arq} alt="" className="size-7 rounded-full object-cover ring-1 ring-black/10" />
            : <Icone className={`size-5 ${ganha ? rar.texto : "text-muted-foreground"}`} />}
        </div>
      </div>
      <p className={`text-[11px] font-bold leading-tight ${ganha ? "text-foreground" : "text-muted-foreground"}`}>{b.nome}</p>
      {ganha ? (
        <p className="text-[9px] font-bold uppercase tracking-wider text-primary/80">{new Date(ganhaEm).toLocaleDateString("pt-BR", { day: "2-digit", month: "short" })}</p>
      ) : b.meta_valor > 1 ? (
        <div className="w-full">
          <div className="h-1 w-full rounded-full bg-muted/40 overflow-hidden">
            <div className="h-full bg-muted-foreground/40 transition-all" style={{ width: `${pct}%` }} />
          </div>
          <p className="text-[9px] font-medium text-muted-foreground mt-0.5 tabular-nums">{Math.min(metric, b.meta_valor)}/{b.meta_valor}</p>
        </div>
      ) : (
        <p className="text-[9px] font-medium text-muted-foreground/70 leading-tight line-clamp-2">{b.criterio}</p>
      )}
    </div>
  )
}
