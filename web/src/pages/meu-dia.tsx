// Meu Dia — o cockpit diário do Guardião de IA.
// Sete blocos, de cima para baixo na ordem de prioridade cognitiva:
//   identidade → AGORA → rotina → tarefas de hoje → desde ontem → semana.
// Não substitui a Minha Jornada: aquela é a narrativa macro do dono (cadência
// semanal); esta é a operação de hoje do Guardião (cadência diária).
import { useCallback, useEffect, useMemo, useState } from "react"
import { useNavigate } from "react-router-dom"
import type { Session } from "@supabase/supabase-js"
import { motion } from "framer-motion"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import {
  AlertTriangleIcon as AlertTriangle,
  ClockIcon as Clock,
  RefreshCwIcon as RefreshCw,
  CheckSquareIcon as CheckSquare,
  Sparkles2Icon as Sparkles,
  ChevronRightIcon as ChevronRight,
  TrophyIcon as Trophy,
  CheckCircle2Icon as CheckCircle2,
} from "@/components/ui/icons"
import { celebrarPontosMC } from "@/components/pontos-mc-splash"
import {
  carregarMeuDia, salvarChecklist, fecharDia, proximaAcao,
  ROTINA_DIARIA, saudacao, dataPorExtenso, formatarData,
  type DadosMeuDia, type ProximaAcao,
} from "@/lib/guardiao/meu-dia"
import type { Tarefa } from "@/lib/guardiao/tarefas"

interface Props { session?: Session; clientId?: string }

const DOW = ["S", "T", "Q", "Q", "S"]

// Cada tom do card AGORA carrega uma cor e um ícone — a urgência precisa ser
// legível antes da leitura do texto.
const TOM: Record<ProximaAcao["tom"], { cor: string; icone: typeof AlertTriangle; rotulo: string }> = {
  trava:  { cor: "text-rose-400",   icone: AlertTriangle, rotulo: "Trava aberta" },
  atraso: { cor: "text-amber-400",  icone: Clock,         rotulo: "Atrasada" },
  rotina: { cor: "text-primary",    icone: RefreshCw,     rotulo: "Rotina do dia" },
  hoje:   { cor: "text-primary",    icone: CheckSquare,   rotulo: "Para hoje" },
  livre:  { cor: "text-primary",    icone: Sparkles,      rotulo: "Quase lá" },
}

export default function MeuDiaPage({ session, clientId }: Props) {
  const cid = clientId || session?.user?.id
  const navigate = useNavigate()
  const [d, setD] = useState<DadosMeuDia | null>(null)
  const [carregando, setCarregando] = useState(true)
  const [marcando, setMarcando] = useState(false)
  const [abrirFechamento, setAbrirFechamento] = useState(false)
  const [salvandoFech, setSalvandoFech] = useState(false)
  const [resp, setResp] = useState({ resp_ontem: "", resp_hoje: "", resp_travou: "" })

  const carregar = useCallback(async () => {
    if (!cid) return
    try {
      const dados = await carregarMeuDia(cid)
      setD(dados)
      if (dados.fechamento) {
        setResp({
          resp_ontem: dados.fechamento.resp_ontem ?? "",
          resp_hoje: dados.fechamento.resp_hoje ?? "",
          resp_travou: dados.fechamento.resp_travou ?? "",
        })
      }
    } catch (e) {
      console.error("Erro ao carregar Meu Dia:", e)
    } finally {
      setCarregando(false)
    }
  }, [cid])

  useEffect(() => { carregar() }, [carregar])

  const feitos = d?.fechamento?.checklist ?? []
  const total = ROTINA_DIARIA.checklist.length
  const pct = Math.round((feitos.length / total) * 100)
  const fechado = !!d?.fechamento?.fechado_em
  const acao = useMemo(() => (d ? proximaAcao(d) : null), [d])

  async function alternarItem(i: number) {
    if (!cid || !d || marcando || fechado) return
    setMarcando(true)
    const novo = feitos.includes(i) ? feitos.filter((x) => x !== i) : [...feitos, i].sort((a, b) => a - b)
    // Otimista: marcar checkbox tem que ser instantâneo.
    setD({ ...d, fechamento: { ...(d.fechamento ?? { id: "", data: d.hoje, resp_ontem: null, resp_hoje: null, resp_travou: null, fechado_em: null }), checklist: novo } })
    try {
      await salvarChecklist(cid, novo)
    } catch (e) {
      console.error("Erro ao salvar checklist:", e instanceof Error ? e.message : JSON.stringify(e))
      await carregar()   // reverte para o estado real — não mostrar marcado o que não salvou
    } finally {
      setMarcando(false)
    }
  }

  async function confirmarFechamento() {
    if (!cid || !d) return
    setSalvandoFech(true)
    try {
      await fecharDia(cid, resp, feitos)
      setAbrirFechamento(false)
      // O pico-fim do dia: celebra na hora, antes de recarregar.
      celebrarPontosMC(15, "por fechar o dia")
      await carregar()
    } catch (e) {
      console.error("Erro ao fechar o dia:", e instanceof Error ? e.message : JSON.stringify(e))
    } finally {
      setSalvandoFech(false)
    }
  }

  if (!cid) return null

  if (carregando || !d || !acao) {
    return (
      <div className="space-y-4 pb-10">
        {[0, 1, 2].map((i) => <div key={i} className="h-32 rounded-2xl bg-card/40 animate-pulse" />)}
      </div>
    )
  }

  const Tom = TOM[acao.tom]

  return (
    <div className="space-y-6 pb-10">
      {/* 1 · Identidade — quem é você, há quanto tempo mantém o ritmo */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground">{dataPorExtenso(d.hoje)}</p>
          <h1 className="mt-1 text-3xl font-bold tracking-tight text-foreground">{saudacao()}, Guardião 👋</h1>
        </div>
        <div className="flex items-center gap-2">
          {d.streak.streak > 0 && (
            <Badge variant="outline" className="gap-1.5 rounded-xl border-primary/30 bg-primary/5 px-3 py-1.5 text-[12px] font-bold text-primary">
              🔥 {d.streak.streak} {d.streak.streak === 1 ? "dia" : "dias"}
            </Badge>
          )}
          {d.concluidasHoje > 0 && (
            <Badge variant="outline" className="rounded-xl border-border px-3 py-1.5 text-[12px] font-bold text-muted-foreground tabular-nums">
              +{d.concluidasHoje * 10} pts hoje
            </Badge>
          )}
        </div>
      </div>

      {/* 2 · AGORA — uma única próxima ação. A decisão já vem tomada. */}
      {fechado ? (
        <Card className="border-primary/40 bg-primary/[0.05]">
          <CardContent className="flex items-center gap-4 p-6">
            <CheckCircle2 className="size-8 shrink-0 text-primary" />
            <div>
              <p className="text-[17px] font-bold tracking-tight text-foreground">Dia fechado. 🎯</p>
              <p className="text-[13px] font-medium text-muted-foreground">
                Você manteve o ritmo por {d.streak.streak} {d.streak.streak === 1 ? "dia útil" : "dias úteis"} seguidos. Até amanhã.
              </p>
            </div>
          </CardContent>
        </Card>
      ) : (
        <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }}>
          <Card className="border-primary/40 bg-gradient-to-br from-primary/[0.09] to-transparent">
            <CardContent className="p-6 space-y-3">
              <div className="flex items-center gap-2">
                <Tom.icone className={`size-4 ${Tom.cor}`} />
                <span className={`text-[11px] font-bold uppercase tracking-widest ${Tom.cor}`}>Agora · {Tom.rotulo}</span>
              </div>
              <p className="text-xl font-bold tracking-tight text-foreground leading-snug">{acao.titulo}</p>
              <p className="text-[13px] font-medium text-muted-foreground">{acao.contexto}</p>
              <Button
                className="mt-1 h-10 gap-2 rounded-xl text-xs font-bold uppercase tracking-wider"
                onClick={() => {
                  if (acao.destino === "#rotina") document.getElementById("rotina")?.scrollIntoView({ behavior: "smooth", block: "center" })
                  else navigate(acao.destino)
                }}
              >
                {acao.rotulo}
                <ChevronRight className="size-4" />
              </Button>
            </CardContent>
          </Card>
        </motion.div>
      )}

      {/* 3 · Rotina do dia — o checklist que era decorativo agora executa */}
      <Card id="rotina">
        <CardContent className="p-6 space-y-4">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground">Rotina diária</p>
              <p className="text-[13px] font-medium text-muted-foreground">{ROTINA_DIARIA.descricao}</p>
            </div>
            <span className="shrink-0 font-mono text-sm font-bold tabular-nums text-primary">{feitos.length}/{total}</span>
          </div>

          <div className="h-2 w-full overflow-hidden rounded-full bg-muted/40">
            <motion.div className="h-full rounded-full bg-primary" initial={{ width: 0 }} animate={{ width: `${pct}%` }} transition={{ duration: 0.4 }} />
          </div>

          <div className="space-y-1.5">
            {ROTINA_DIARIA.checklist.map((item, i) => {
              const on = feitos.includes(i)
              return (
                <button
                  key={item}
                  type="button"
                  disabled={fechado}
                  onClick={() => alternarItem(i)}
                  aria-pressed={on}
                  className="flex w-full items-start gap-3 rounded-xl px-2 py-2 text-left transition-colors hover:bg-primary/[0.05] disabled:cursor-default disabled:hover:bg-transparent"
                >
                  <span className={`mt-0.5 grid size-[18px] shrink-0 place-items-center rounded-md border text-[10px] font-black transition-colors ${
                    on ? "border-primary bg-primary text-primary-foreground" : "border-muted-foreground/30"
                  }`}>
                    {on ? "✓" : ""}
                  </span>
                  <span className={`text-[13.5px] font-medium leading-snug ${on ? "text-muted-foreground line-through" : "text-foreground"}`}>
                    {item}
                  </span>
                </button>
              )
            })}
          </div>

          {!fechado && (
            <Button
              variant={feitos.length >= total ? "default" : "outline"}
              className="w-full h-11 gap-2 rounded-xl text-xs font-bold uppercase tracking-wider"
              onClick={() => setAbrirFechamento(true)}
            >
              <Trophy className="size-4" />
              Fechar o dia
            </Button>
          )}
        </CardContent>
      </Card>

      {/* 4 · Tarefas de hoje — e só de hoje. O backlog mora em /tarefas. */}
      {(d.travas.length > 0 || d.atrasadas.length > 0 || d.tarefasHoje.length > 0) && (
        <Card>
          <CardContent className="p-6 space-y-4">
            <div className="flex items-center justify-between">
              <p className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground">O que é do dia</p>
              <button onClick={() => navigate("/tarefas")} className="text-[11px] font-bold uppercase tracking-wider text-primary hover:underline">
                Ver todas
              </button>
            </div>
            <div className="space-y-2">
              {d.travas.map((t) => <LinhaTarefa key={t.id} t={t} tipo="trava" onIr={() => navigate("/tarefas")} />)}
              {d.atrasadas.map((t) => <LinhaTarefa key={t.id} t={t} tipo="atraso" onIr={() => navigate("/tarefas")} />)}
              {d.tarefasHoje.map((t) => <LinhaTarefa key={t.id} t={t} tipo="hoje" onIr={() => navigate("/tarefas")} />)}
            </div>
          </CardContent>
        </Card>
      )}

      {/* 5 · Desde ontem — o delta. Finito de propósito: não é feed. */}
      {d.novidades.length > 0 && (
        <Card>
          <CardContent className="p-6 space-y-3">
            <p className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground">Desde ontem</p>
            <div className="space-y-2.5">
              {d.novidades.map((n) => (
                <button
                  key={n.id}
                  type="button"
                  onClick={() => n.link && navigate(n.link)}
                  disabled={!n.link}
                  className="flex w-full items-start gap-3 rounded-xl text-left transition-colors hover:bg-primary/[0.04] disabled:cursor-default px-2 py-1.5"
                >
                  <span className="mt-1 size-1.5 shrink-0 rounded-full bg-primary" />
                  <span className="min-w-0 flex-1">
                    <span className="block text-[13.5px] font-bold text-foreground">{n.titulo}</span>
                    {n.texto && <span className="block text-[12px] font-medium text-muted-foreground leading-relaxed">{n.texto}</span>}
                  </span>
                  {n.link && <ChevronRight className="mt-1 size-4 shrink-0 text-muted-foreground/40" />}
                </button>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* 6 · Semana — os 5 quadrados */}
      <Card>
        <CardContent className="p-6 space-y-3">
          <div className="flex items-center justify-between">
            <p className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground">Sua semana</p>
            {d.streak.recorde > 0 && (
              <span className="text-[11px] font-medium text-muted-foreground">Recorde: {d.streak.recorde} dias</span>
            )}
          </div>
          <div className="flex gap-2">
            {d.streak.semana.map((dia, i) => {
              const hoje = dia.data === d.hoje
              return (
                <div
                  key={dia.data}
                  title={formatarData(dia.data)}
                  className={`grid h-11 flex-1 place-items-center rounded-xl border font-mono text-[11px] font-bold transition-colors ${
                    dia.fechado
                      ? "border-primary/40 bg-primary/15 text-primary"
                      : hoje
                        ? "border-dashed border-primary text-foreground"
                        : dia.futuro
                          ? "border-border text-muted-foreground/40"
                          : "border-border text-muted-foreground/60"
                  }`}
                >
                  {dia.fechado ? "✓" : DOW[i]}
                </div>
              )
            })}
          </div>
          {!d.streak.escudo_disponivel && (
            <p className="text-[11px] font-medium text-amber-400">
              Escudo desta semana já usado — a próxima falta quebra o streak.
            </p>
          )}
        </CardContent>
      </Card>

      {/* Ritual de fechamento — as 3 perguntas obrigatórias da rotina */}
      <Dialog open={abrirFechamento} onOpenChange={setAbrirFechamento}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Fechar o dia</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-[13px] font-medium text-muted-foreground">
              As três perguntas da rotina. As respostas viram evidência no Balanço PMC.
            </p>
            {([
              ["resp_ontem", ROTINA_DIARIA.perguntas[0]],
              ["resp_hoje", ROTINA_DIARIA.perguntas[1]],
              ["resp_travou", ROTINA_DIARIA.perguntas[2]],
            ] as const).map(([campo, pergunta]) => (
              <div key={campo} className="space-y-2">
                <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">{pergunta}</Label>
                <Textarea
                  className="rounded-xl min-h-20"
                  value={resp[campo]}
                  onChange={(e) => setResp((p) => ({ ...p, [campo]: e.target.value }))}
                />
              </div>
            ))}
            <p className="text-[12px] font-medium text-muted-foreground">
              Checklist: {feitos.length} de {total} itens marcados.
            </p>
          </div>
          <DialogFooter>
            <Button variant="outline" className="h-10 rounded-xl text-xs font-bold uppercase tracking-wider" onClick={() => setAbrirFechamento(false)}>
              Cancelar
            </Button>
            <Button disabled={salvandoFech} className="h-10 gap-2 rounded-xl text-xs font-bold uppercase tracking-wider" onClick={confirmarFechamento}>
              <Trophy className="size-4" />
              {salvandoFech ? "Fechando..." : "Fechar o dia"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

function LinhaTarefa({ t, tipo, onIr }: { t: Tarefa; tipo: "trava" | "atraso" | "hoje"; onIr: () => void }) {
  const estilo = {
    trava:  { cor: "border-rose-400/30 text-rose-400",   texto: "Trava" },
    atraso: { cor: "border-amber-400/30 text-amber-400", texto: "Atrasada" },
    hoje:   { cor: "border-border text-muted-foreground", texto: "Hoje" },
  }[tipo]
  return (
    <button type="button" onClick={onIr} className="flex w-full items-center gap-3 rounded-xl border border-border p-3 text-left transition-colors hover:border-primary/30">
      <div className="min-w-0 flex-1">
        <p className="truncate text-[13.5px] font-bold text-foreground">{t.titulo}</p>
        <p className="text-[11px] font-medium text-muted-foreground">
          {tipo === "trava" ? t.bloqueio : t.setor || t.responsavel || "—"}
        </p>
      </div>
      <Badge variant="outline" className={`shrink-0 rounded-lg px-2 py-0.5 text-[10px] font-bold uppercase ${estilo.cor}`}>
        {estilo.texto}
      </Badge>
    </button>
  )
}
