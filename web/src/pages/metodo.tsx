// Método MC (Multiplicador de Crescimento) — a grande transformação:
// sair do caos e virar um multiplicador de crescimento. 6 fases cíclicas.
import { useEffect, useState } from "react"
import { useSearchParams } from "react-router-dom"
import { supabase } from "@/lib/supabase"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import {
  ShieldCheckIcon as ShieldCheck,
  BarChart3Icon as BarChart3,
  TargetIcon as Target,
  BotIcon as Bot,
  Building2Icon as Building2,
  ZapIcon as Zap,
  ChevronRightIcon as ChevronRight,
  RefreshCwIcon as RefreshCw,
} from "@/components/ui/icons"
import type { Session } from "@supabase/supabase-js"
import { motion } from "framer-motion"
import { FASES_METODO } from "@/data/metodo-mc"
import { RodaMetodo } from "@/components/metodo/roda-metodo"
import { FaseGuardiao } from "@/components/metodo/fase-guardiao"
import { FaseInteligencia } from "@/components/metodo/fase-inteligencia"
import { FaseGargalos } from "@/components/metodo/fase-gargalos"
import { FaseCopilotos } from "@/components/metodo/fase-copilotos"
import { FaseTorre } from "@/components/metodo/fase-torre"
import { FaseEngenharia } from "@/components/metodo/fase-engenharia"
import { TrilhaFase } from "@/components/metodo/compartilhados"

interface MetodoPageProps {
  session?: Session
  clientId?: string
}

const FASE_ICONS = [ShieldCheck, BarChart3, Target, Bot, Building2, Zap]

export default function MetodoPage({ session, clientId }: MetodoPageProps) {
  const resolvedClientId = clientId || session?.user?.id
  const [searchParams, setSearchParams] = useSearchParams()
  const faseParam = Number(searchParams.get("fase"))
  const [faseAtiva, setFaseAtivaState] = useState(faseParam >= 1 && faseParam <= 6 ? faseParam : 1)

  // Mantém ?fase=N na URL (deep link para uma fase específica)
  function setFaseAtiva(n: number) {
    setFaseAtivaState(n)
    setSearchParams({ fase: String(n) }, { replace: true })
  }
  const [links, setLinks] = useState<Record<string, string>>({})
  const [comecadas, setComecadas] = useState<Set<number>>(new Set())

  useEffect(() => {
    if (!resolvedClientId) return
    // Links configuráveis (trilhas por fase + assessment do guardião)
    supabase
      .from("configuracoes_links")
      .select("chave, url")
      .eq("ativo", true)
      .then(({ data }) => {
        if (data) {
          const map: Record<string, string> = {}
          data.forEach((l) => { map[l.chave] = l.url })
          setLinks(map)
        }
      })
    // Sinaliza na roda as fases que já têm dados (fase "começada")
    async function fetchProgresso() {
      const [g, a, ga, cp, si, ec] = await Promise.all([
        supabase.from("metodo_guardioes").select("id", { count: "exact", head: true }).eq("id_cliente", resolvedClientId),
        supabase.from("metodo_areas").select("id", { count: "exact", head: true }).eq("id_cliente", resolvedClientId),
        supabase.from("metodo_gargalos").select("id", { count: "exact", head: true }).eq("id_cliente", resolvedClientId),
        supabase.from("metodo_copilotos").select("id", { count: "exact", head: true }).eq("id_cliente", resolvedClientId),
        supabase.from("metodo_sistemas").select("id", { count: "exact", head: true }).eq("id_cliente", resolvedClientId),
        supabase.from("metodo_economias").select("id", { count: "exact", head: true }).eq("id_cliente", resolvedClientId),
      ])
      const set = new Set<number>()
      if ((g.count ?? 0) > 0) set.add(1)
      if ((a.count ?? 0) > 0) set.add(2)
      if ((ga.count ?? 0) > 0) set.add(3)
      if ((cp.count ?? 0) > 0) set.add(4)
      if ((si.count ?? 0) > 0) set.add(5)
      if ((ec.count ?? 0) > 0) set.add(6)
      setComecadas(set)
    }
    fetchProgresso()
  }, [resolvedClientId])

  if (!resolvedClientId) return null

  const fase = FASES_METODO[faseAtiva - 1]
  const trilhaUrl = links[fase.trilhaKey]

  return (
    <div className="space-y-10 pb-10">
      {/* Hero — a grande transformação */}
      <motion.div
        initial={{ opacity: 0, x: -20 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.6 }}
        className="flex flex-col gap-4 border-l-4 border-primary pl-8 py-2"
      >
        <div className="flex items-center gap-3 flex-wrap">
          <Badge variant="outline" className="bg-primary/5 border-primary/20 text-primary">MÉTODO MC</Badge>
          <Badge variant="outline" className="rounded-lg border-border text-muted-foreground gap-1.5">
            <RefreshCw className="size-3" />
            CÍCLICO — RODA TODO MÊS
          </Badge>
        </div>
        <h1 className="text-4xl lg:text-5xl font-bold tracking-tight text-foreground leading-tight">
          Aqui acontece a sua<br />
          <span className="text-primary">grande transformação.</span>
        </h1>
        <p className="text-sm lg:text-base font-medium text-foreground/80 leading-relaxed max-w-3xl">
          É neste lugar que você sai do caos operacional e vira um <strong className="text-foreground">Multiplicador
          de Crescimento</strong>: deixa de ser o operário da sua empresa para ser o arquiteto dela.
          O método é único no mercado e é cíclico: a cada volta na roda, sua empresa fica mais inteligente,
          mais enxuta e mais lucrativa. Execute as fases, assista às trilhas e use a IA do PMC OS
          para acelerar cada entrega.
        </p>
      </motion.div>

      {/* Roda + lista de fases */}
      <div className="grid gap-8 lg:grid-cols-2 lg:items-center">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.6, delay: 0.15 }}
        >
          <RodaMetodo faseAtiva={faseAtiva} onSelect={setFaseAtiva} concluidas={comecadas} />
        </motion.div>

        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.6, delay: 0.25 }}
          className="space-y-2"
        >
          {FASES_METODO.map((f, i) => {
            const Icon = FASE_ICONS[i]
            const ativa = f.numero === faseAtiva
            const comecou = comecadas.has(f.numero)
            return (
              <button
                key={f.numero}
                onClick={() => setFaseAtiva(f.numero)}
                className={`w-full flex items-center gap-4 p-4 rounded-xl border text-left transition-all ${
                  ativa
                    ? "bg-primary/10 border-primary/30"
                    : "bg-muted/10 border-transparent hover:border-border"
                }`}
              >
                <div className={`size-10 rounded-xl flex items-center justify-center shrink-0 ${
                  ativa ? "bg-primary text-primary-foreground" : "bg-primary/10 text-primary"
                }`}>
                  <Icon className="size-5" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-[11px] font-bold text-muted-foreground/60">
                      {String(f.numero).padStart(2, "0")}
                    </span>
                    <p className={`text-sm font-bold tracking-tight ${ativa ? "text-primary" : "text-foreground"}`}>
                      {f.titulo}
                    </p>
                    {comecou && (
                      <Badge className="rounded-lg bg-primary/10 text-primary border-primary/20 px-1.5 py-0 text-[9px] font-bold">
                        EM CAMPO
                      </Badge>
                    )}
                  </div>
                  <p className="text-[11px] font-medium text-muted-foreground truncate">{f.subtitulo}</p>
                </div>
                <ChevronRight className={`size-4 shrink-0 ${ativa ? "text-primary" : "text-muted-foreground/40"}`} />
              </button>
            )
          })}
          <p className="text-[11px] font-medium text-muted-foreground/70 px-1 pt-1 flex items-center gap-1.5">
            <RefreshCw className="size-3" />
            Concluiu a fase 06? A roda gira: volte à Inteligência Empresarial do próximo mês.
          </p>
        </motion.div>
      </div>

      {/* Fase ativa */}
      <motion.div
        key={faseAtiva}
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
      >
          <Card>
            <CardContent className="p-6 lg:p-8">
              {faseAtiva === 1 && (
                <FaseGuardiao clientId={resolvedClientId} assessmentUrl={links.assessment_guardiao} />
              )}
              {faseAtiva === 2 && <FaseInteligencia clientId={resolvedClientId} />}
              {faseAtiva === 3 && <FaseGargalos clientId={resolvedClientId} />}
              {faseAtiva === 4 && <FaseCopilotos clientId={resolvedClientId} />}
              {faseAtiva === 5 && <FaseTorre clientId={resolvedClientId} />}
              {faseAtiva === 6 && <FaseEngenharia clientId={resolvedClientId} />}
            </CardContent>
          </Card>
      </motion.div>

      {/* Trilha da fase — fora do card da fase */}
      <TrilhaFase url={trilhaUrl} titulo={fase.titulo} />

      {/* Navegação cíclica entre fases */}
      <div className="flex items-center justify-between">
        <Button
          variant="outline"
          className="h-10 gap-2 rounded-xl font-bold text-xs uppercase tracking-wider hover:border-primary/30 hover:bg-primary/5"
          onClick={() => setFaseAtiva(faseAtiva === 1 ? 6 : faseAtiva - 1)}
        >
          <ChevronRight className="size-4 rotate-180" />
          Fase anterior
        </Button>
        <p className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground">
          Fase {String(faseAtiva).padStart(2, "0")} de 06
        </p>
        <Button
          className="h-10 gap-2 rounded-xl font-bold text-xs uppercase tracking-wider"
          onClick={() => setFaseAtiva(faseAtiva === 6 ? 1 : faseAtiva + 1)}
        >
          {faseAtiva === 6 ? "Girar a roda — voltar ao início" : "Próxima fase"}
          <ChevronRight className="size-4" />
        </Button>
      </div>
    </div>
  )
}
