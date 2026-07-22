// Ranking dos Guardiões (Comunidade). Todas as empresas ativas, personificadas
// no seu Guardião, ordenadas por Pontos MC. Dados vêm da RPC agregada
// `ranking_guardioes(periodo)` (SECURITY DEFINER) — só engajamento.
// - 3 recortes: Geral (acumulado), Ano, Mês.
// - Empresa com 0 ponto ou opt-out NÃO aparece no público, mas VÊ a própria
//   posição (linha `oculto`).
// - Toggle de privacidade grava clientes_entrada_new.mostrar_no_ranking.
import { useCallback, useEffect, useMemo, useState } from "react"
import { supabase } from "@/lib/supabase"
import { useAuth } from "@/lib/auth-context"
import { PageHeader } from "@/components/layout/page-header"
import { Card, CardContent } from "@/components/ui/card"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  TrophyIcon as Trophy,
  ShieldCheckIcon as ShieldCheck,
  EyeIcon as Eye,
  EyeOffIcon as EyeOff,
} from "@/components/ui/icons"
import { faixaPorPontos, type CorNivel } from "@/lib/nivel-pmc"
import { motion } from "framer-motion"
import { toast } from "sonner"

interface LinhaRanking {
  posicao: number
  guardiao_nome: string | null
  empresa: string | null
  pontos: number
  etapas: number
  fases: number
  vitorias: number
  reunioes: number
  is_me: boolean
  oculto: boolean
  total_participantes: number
}

type Periodo = "total" | "ano" | "mes"

const PERIODOS: { key: Periodo; label: string }[] = [
  { key: "total", label: "Geral" },
  { key: "ano", label: "Ano" },
  { key: "mes", label: "Mês" },
]

const COR_NIVEL: Record<CorNivel, { bg: string; borda: string }> = {
  slate: { bg: "bg-slate-500/15", borda: "border-slate-500/30" },
  sky: { bg: "bg-sky-500/15", borda: "border-sky-500/30" },
  violet: { bg: "bg-violet-500/15", borda: "border-violet-500/30" },
  amber: { bg: "bg-amber-500/15", borda: "border-amber-500/30" },
  lime: { bg: "bg-primary/15", borda: "border-primary/30" },
}

const num = (n: number) => n.toLocaleString("pt-BR")

function Arquetipo({ imagem, cor, tamanho }: { imagem: string; cor: CorNivel; tamanho: number }) {
  const c = COR_NIVEL[cor]
  return (
    <div className={`rounded-2xl overflow-hidden border ${c.bg} ${c.borda} shrink-0`} style={{ width: tamanho, height: tamanho }}>
      <img src={imagem} alt="" className="size-full object-cover" onError={(e) => { (e.currentTarget as HTMLImageElement).style.visibility = "hidden" }} />
    </div>
  )
}

function nomeExibido(l: LinhaRanking): { titulo: string; sub: string } {
  const empresa = l.empresa || "Empresa"
  if (l.guardiao_nome) return { titulo: l.guardiao_nome, sub: empresa }
  return { titulo: "Guardião não definido", sub: empresa }
}

export default function RankingGuardioesPage({ clientId }: { clientId?: string }) {
  const { session } = useAuth()
  const meuId = clientId || session?.user?.id
  const [periodo, setPeriodo] = useState<Periodo>("total")
  const [linhas, setLinhas] = useState<LinhaRanking[]>([])
  const [loading, setLoading] = useState(true)
  const [visivel, setVisivel] = useState<boolean | null>(null)
  const [salvandoVis, setSalvandoVis] = useState(false)

  const carregar = useCallback((p: Periodo) => {
    setLoading(true)
    supabase.rpc("ranking_guardioes", { periodo: p }).then(({ data, error }) => {
      if (error) { console.error(error); setLoading(false); return }
      setLinhas((data ?? []) as LinhaRanking[])
      setLoading(false)
    })
  }, [])

  useEffect(() => { carregar(periodo) }, [periodo, carregar])

  // Estado atual do opt-in de visibilidade (própria linha do cliente).
  useEffect(() => {
    if (!meuId) return
    supabase.from("clientes_entrada_new").select("mostrar_no_ranking").eq("id_cliente", meuId).maybeSingle()
      .then(({ data }) => { if (data) setVisivel(data.mostrar_no_ranking !== false) })
  }, [meuId])

  async function toggleVisibilidade() {
    if (!meuId || visivel === null) return
    const novo = !visivel
    setSalvandoVis(true)
    const { error } = await supabase.from("clientes_entrada_new").update({ mostrar_no_ranking: novo }).eq("id_cliente", meuId)
    setSalvandoVis(false)
    if (error) { toast.error("Não consegui atualizar a preferência."); return }
    setVisivel(novo)
    toast.success(novo ? "Você aparece no ranking público." : "Você saiu do ranking público — só você vê sua posição.")
    carregar(periodo)
  }

  const eu = useMemo(() => linhas.find((l) => l.is_me) ?? null, [linhas])
  const publicos = useMemo(() => linhas.filter((l) => !l.oculto), [linhas])
  const podio = publicos.slice(0, 3)
  const resto = publicos.slice(3)
  const totalParticipantes = linhas[0]?.total_participantes ?? publicos.length

  const paraSubir = useMemo(() => {
    if (!eu || eu.posicao <= 1) return null
    const frente = publicos.find((l) => l.posicao === eu.posicao - 1) ?? publicos[publicos.length - 1]
    if (!frente || frente.pontos <= eu.pontos) return null
    return { falta: frente.pontos - eu.pontos + 1, empresa: frente.empresa || "o próximo" }
  }, [eu, publicos])

  const legendaPeriodo = periodo === "mes" ? "neste mês" : periodo === "ano" ? "neste ano" : "no total"

  return (
    <div className="space-y-6 pb-10">
      <PageHeader
        title="Ranking dos Guardiões"
        description="Cada empresa do PMC, representada pelo seu Guardião da IA, ordenada por Pontos MC."
      />

      {/* Período + privacidade */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <Tabs value={periodo} onValueChange={(v) => setPeriodo(v as Periodo)}>
          <TabsList>
            {PERIODOS.map((p) => (
              <TabsTrigger key={p.key} value={p.key}>{p.label}</TabsTrigger>
            ))}
          </TabsList>
        </Tabs>
        {visivel !== null && (
          <button
            type="button"
            onClick={toggleVisibilidade}
            disabled={salvandoVis}
            className={`inline-flex items-center gap-2 rounded-xl border px-3 py-2 text-[12px] font-bold transition-colors ${
              visivel ? "border-primary/30 bg-primary/5 text-primary hover:bg-primary/10" : "border-border bg-muted/20 text-muted-foreground hover:text-foreground"
            }`}
            title="Escolha se sua empresa aparece no ranking público"
          >
            {visivel ? <Eye className="size-4" /> : <EyeOff className="size-4" />}
            {visivel ? "Aparecendo no ranking" : "Oculto do ranking"}
          </button>
        )}
      </div>

      {loading ? (
        <div className="space-y-3">
          <div className="h-40 rounded-2xl bg-card/40 animate-pulse" />
          <div className="h-64 rounded-2xl bg-card/40 animate-pulse" />
        </div>
      ) : (
        <>
          {/* Pódio top 3 */}
          {podio.length > 0 && (
            <div className="grid gap-4 sm:grid-cols-3">
              {podio.map((l, i) => {
                const { faixa } = faixaPorPontos(l.pontos)
                const { titulo, sub } = nomeExibido(l)
                const medalha = ["🥇", "🥈", "🥉"][i]
                const destaque = i === 0
                return (
                  <motion.div key={l.posicao + (l.empresa ?? "")} initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.08 }}>
                    <Card className={`h-full ${destaque ? "border-primary/40 bg-primary/[0.05]" : ""} ${l.is_me ? "ring-1 ring-primary/40" : ""}`}>
                      <CardContent className="p-5 flex flex-col items-center text-center gap-2">
                        <div className="text-2xl">{medalha}</div>
                        <Arquetipo imagem={faixa.imagem} cor={faixa.cor} tamanho={destaque ? 72 : 60} />
                        <div className="mt-1">
                          <p className="text-[15px] font-bold tracking-tight text-foreground leading-tight">{titulo}</p>
                          <p className="text-[12px] font-medium text-muted-foreground">{sub}</p>
                        </div>
                        <p className="text-[11px] font-bold uppercase tracking-widest text-primary">{faixa.nome}</p>
                        <p className="text-2xl font-bold tabular-nums text-foreground leading-none mt-1">
                          {num(l.pontos)}<span className="text-[11px] font-bold text-muted-foreground ml-1">Pontos MC</span>
                        </p>
                        {l.is_me && <span className="text-[10px] font-bold uppercase tracking-widest text-primary">Você</span>}
                      </CardContent>
                    </Card>
                  </motion.div>
                )
              })}
            </div>
          )}

          {/* Sua posição (quando fora do pódio OU oculto) */}
          {eu && (eu.oculto || eu.posicao > 3) && (
            <Card className="border-primary/40 bg-primary/[0.05]">
              <CardContent className="p-4 flex items-center gap-4">
                <span className="text-lg font-bold tabular-nums text-primary w-12 text-center shrink-0">
                  {eu.pontos > 0 ? `${eu.posicao}º` : "—"}
                </span>
                {(() => { const { faixa } = faixaPorPontos(eu.pontos); return <Arquetipo imagem={faixa.imagem} cor={faixa.cor} tamanho={44} /> })()}
                <div className="min-w-0 flex-1">
                  <p className="text-[10px] font-bold uppercase tracking-widest text-primary">
                    Sua posição{eu.oculto ? " · só você vê" : ""}
                  </p>
                  <p className="text-[14px] font-bold text-foreground truncate">{nomeExibido(eu).titulo} · {nomeExibido(eu).sub}</p>
                  {eu.pontos === 0 ? (
                    <p className="text-[11px] font-medium text-muted-foreground">Some seus primeiros Pontos MC {legendaPeriodo} para entrar no ranking público.</p>
                  ) : eu.oculto ? (
                    <p className="text-[11px] font-medium text-muted-foreground">Você está oculto do ranking público. Ative acima para aparecer.</p>
                  ) : paraSubir && paraSubir.falta > 0 ? (
                    <p className="text-[11px] font-medium text-muted-foreground">Faltam {num(paraSubir.falta)} Pontos MC para passar {paraSubir.empresa}</p>
                  ) : null}
                </div>
                <p className="text-lg font-bold tabular-nums text-foreground shrink-0">{num(eu.pontos)}<span className="text-[10px] font-bold text-muted-foreground ml-1">pts MC</span></p>
              </CardContent>
            </Card>
          )}

          {/* Lista do restante */}
          {resto.length > 0 && (
            <Card>
              <CardContent className="p-2 sm:p-3 divide-y divide-border/50">
                {resto.map((l) => {
                  const { faixa } = faixaPorPontos(l.pontos)
                  const { titulo, sub } = nomeExibido(l)
                  return (
                    <div key={l.posicao + (l.empresa ?? "")} className={`flex items-center gap-3 sm:gap-4 py-3 px-2 ${l.is_me ? "bg-primary/[0.06] rounded-xl" : ""}`}>
                      <span className="text-sm font-bold tabular-nums text-muted-foreground w-8 text-center shrink-0">{l.posicao}º</span>
                      <Arquetipo imagem={faixa.imagem} cor={faixa.cor} tamanho={40} />
                      <div className="min-w-0 flex-1">
                        <p className="text-[14px] font-bold tracking-tight text-foreground truncate">
                          {titulo}
                          {l.is_me && <span className="ml-2 text-[10px] font-bold uppercase tracking-widest text-primary">Você</span>}
                        </p>
                        <p className="text-[12px] font-medium text-muted-foreground truncate">{sub}</p>
                      </div>
                      <div className="hidden sm:flex items-center gap-1.5 shrink-0">
                        <ShieldCheck className="size-3.5 text-muted-foreground/60" />
                        <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">{faixa.nome}</span>
                      </div>
                      <p className="text-[15px] font-bold tabular-nums text-foreground shrink-0 w-24 text-right">
                        {num(l.pontos)}<span className="text-[10px] font-bold text-muted-foreground ml-1">pts MC</span>
                      </p>
                    </div>
                  )
                })}
              </CardContent>
            </Card>
          )}

          {publicos.length === 0 && (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-16 gap-3 text-center">
                <Trophy className="size-8 text-muted-foreground/30" />
                <p className="text-sm font-medium text-muted-foreground">Ninguém pontuou {legendaPeriodo} ainda. Seja o primeiro!</p>
              </CardContent>
            </Card>
          )}

          <div className="flex items-center justify-between gap-2 text-xs text-muted-foreground flex-wrap">
            <span className="flex items-center gap-2">
              <Trophy className="size-3 text-primary" />
              Pontos MC {legendaPeriodo}: etapas da jornada, fases do Método, vitórias e reuniões.
            </span>
            <span>{num(totalParticipantes)} no ranking</span>
          </div>
        </>
      )}
    </div>
  )
}
