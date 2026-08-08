// Mensagens & Alcance — o painel de observabilidade do gatilho externo (Onda 1).
// Responde três perguntas do time, nesta ordem de importância:
//   1) A quem conseguimos falar? (cobertura de contato)
//   2) O que saiu, o que travou? (fila)
//   3) Quem está inalcançável? (lista acionável para higienizar telefone)
import { useCallback, useEffect, useMemo, useState } from "react"
import { useNavigate } from "react-router-dom"
import { supabase } from "@/lib/supabase"
import { PageHeader } from "@/components/layout/page-header"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  ShieldCheckIcon as ShieldCheck,
  Building2Icon as Building,
  AlertTriangleIcon as AlertTriangle,
  SendIcon as Send,
  RefreshCwIcon as RefreshCw,
  ChevronRightIcon as ChevronRight,
} from "@/components/ui/icons"

interface Cobertura {
  id_cliente: string
  empresa: string | null
  status_atual: string | null
  tem_guardiao: boolean
  tem_dono: boolean
}
interface Msg {
  id: string
  id_cliente: string | null
  destinatario: string
  persona: string
  template: string
  previa: string | null
  status: string
  tentativas: number
  erro: string | null
  provedor: string | null
  created_at: string
}

const ATIVOS = ["Ativo no Programa", "Ativo - 2º Ciclo"]

const COR_STATUS: Record<string, string> = {
  pendente: "border-amber-400/30 text-amber-400",
  enviando: "border-sky-400/30 text-sky-400",
  enviado: "border-emerald-400/30 text-emerald-400",
  falhou: "border-rose-400/30 text-rose-400",
  cancelado: "border-border text-muted-foreground",
}

/** Mascara o destinatário: o painel não precisa expor o número inteiro. */
function mascarar(e164: string): string {
  if (e164.length < 6) return "•••"
  return `+55 (${e164.slice(2, 4)}) ••••-${e164.slice(-4)}`
}

export default function MensagensPage() {
  const navigate = useNavigate()
  const [cobertura, setCobertura] = useState<Cobertura[]>([])
  const [msgs, setMsgs] = useState<Msg[]>([])
  const [carregando, setCarregando] = useState(true)
  const [drenando, setDrenando] = useState(false)
  const [retorno, setRetorno] = useState<string | null>(null)

  const carregar = useCallback(async () => {
    const [{ data: cob }, { data: m }] = await Promise.all([
      supabase.from("cobertura_contato").select("*"),
      supabase.from("mensagens_saida").select("*").order("created_at", { ascending: false }).limit(50),
    ])
    setCobertura((cob ?? []) as Cobertura[])
    setMsgs((m ?? []) as Msg[])
    setCarregando(false)
  }, [])

  useEffect(() => { carregar() }, [carregar])

  const stats = useMemo(() => {
    const ativos = cobertura.filter((c) => ATIVOS.includes(c.status_atual ?? ""))
    const comG = ativos.filter((c) => c.tem_guardiao).length
    const comD = ativos.filter((c) => c.tem_dono).length
    const sem = ativos.filter((c) => !c.tem_guardiao && !c.tem_dono)
    const pct = (n: number) => (ativos.length ? Math.round((n / ativos.length) * 100) : 0)
    return { ativos, comG, comD, sem, pctG: pct(comG), pctD: pct(comD) }
  }, [cobertura])

  const fila = useMemo(() => ({
    pendente: msgs.filter((m) => m.status === "pendente").length,
    enviado: msgs.filter((m) => m.status === "enviado").length,
    falhou: msgs.filter((m) => m.status === "falhou").length,
    seco: msgs.filter((m) => m.provedor === "seco").length,
  }), [msgs])

  /** Dispara o worker manualmente (a função aceita JWT de admin além do cron). */
  async function drenar() {
    setDrenando(true)
    setRetorno(null)
    const { data, error } = await supabase.functions.invoke("enviar-mensagens", { body: { lote: 50 } })
    if (error) {
      setRetorno(`Erro: ${error.message}`)
    } else {
      const d = data as { modo: string; reservadas: number; enviadas: number; falhas: number }
      setRetorno(`Modo ${d.modo} · ${d.reservadas} reservada(s) · ${d.enviadas} processada(s) · ${d.falhas} falha(s)`)
      await carregar()
    }
    setDrenando(false)
  }

  return (
    <div className="space-y-8 pb-10">
      <PageHeader
        title="Mensagens & Alcance"
        description="O gatilho externo do PMC OS: a quem conseguimos falar, o que saiu e quem está inalcançável."
      />

      {/* Alcance — o número que dimensiona a operação inteira */}
      <section className="space-y-3">
        <h2 className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Alcance nos clientes ativos</h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardContent className="p-5">
              <p className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground">Clientes ativos</p>
              <p className="mt-2 text-4xl font-bold tabular-nums tracking-tight">{carregando ? "—" : stats.ativos.length}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-5">
              <div className="flex items-center justify-between">
                <p className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground">Guardião</p>
                <ShieldCheck className="size-4 text-primary" />
              </div>
              <p className="mt-2 text-4xl font-bold tabular-nums tracking-tight text-primary">{carregando ? "—" : stats.comG}</p>
              <p className="text-[12px] font-medium text-muted-foreground">{stats.pctG}% alcançáveis</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-5">
              <div className="flex items-center justify-between">
                <p className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground">Dono</p>
                <Building className="size-4 text-primary" />
              </div>
              <p className="mt-2 text-4xl font-bold tabular-nums tracking-tight">{carregando ? "—" : stats.comD}</p>
              <p className="text-[12px] font-medium text-muted-foreground">{stats.pctD}% alcançáveis</p>
            </CardContent>
          </Card>
          <Card className={stats.sem.length > 0 ? "border-amber-400/30" : ""}>
            <CardContent className="p-5">
              <div className="flex items-center justify-between">
                <p className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground">Sem contato</p>
                <AlertTriangle className="size-4 text-amber-400" />
              </div>
              <p className="mt-2 text-4xl font-bold tabular-nums tracking-tight text-amber-400">{carregando ? "—" : stats.sem.length}</p>
              <p className="text-[12px] font-medium text-muted-foreground">nenhum telefone utilizável</p>
            </CardContent>
          </Card>
        </div>
      </section>

      {/* Fila */}
      <section className="space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Fila de saída · últimas 50</h2>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" disabled={carregando} onClick={carregar}
              className="h-9 gap-1.5 rounded-xl text-[11px] font-bold uppercase tracking-wider">
              <RefreshCw className="size-3.5" /> Atualizar
            </Button>
            <Button size="sm" disabled={drenando} onClick={drenar}
              className="h-9 gap-1.5 rounded-xl text-[11px] font-bold uppercase tracking-wider">
              <Send className="size-3.5" /> {drenando ? "Processando..." : "Processar fila agora"}
            </Button>
          </div>
        </div>

        {retorno && (
          <div className="rounded-xl border border-primary/30 bg-primary/[0.05] px-4 py-3">
            <p className="text-[13px] font-medium text-foreground">{retorno}</p>
          </div>
        )}

        <div className="flex flex-wrap gap-2">
          <Badge variant="outline" className="rounded-lg border-amber-400/30 px-2.5 py-1 text-[11px] font-bold text-amber-400">{fila.pendente} pendente(s)</Badge>
          <Badge variant="outline" className="rounded-lg border-emerald-400/30 px-2.5 py-1 text-[11px] font-bold text-emerald-400">{fila.enviado} processada(s)</Badge>
          <Badge variant="outline" className="rounded-lg border-rose-400/30 px-2.5 py-1 text-[11px] font-bold text-rose-400">{fila.falhou} falha(s)</Badge>
          {fila.seco > 0 && (
            <Badge variant="outline" className="rounded-lg border-border px-2.5 py-1 text-[11px] font-bold text-muted-foreground">
              {fila.seco} em modo seco — nada saiu de verdade
            </Badge>
          )}
        </div>

        <Card>
          <CardContent className="p-0">
            {carregando ? (
              <div className="space-y-px">{[0, 1, 2].map((i) => <div key={i} className="h-14 animate-pulse bg-card/40" />)}</div>
            ) : msgs.length === 0 ? (
              <p className="p-8 text-center text-[13px] font-medium text-muted-foreground">
                Fila vazia. É o esperado enquanto ninguém deu opt-in.
              </p>
            ) : (
              <div className="max-h-[420px] divide-y divide-border/40 overflow-y-auto">
                {msgs.map((m) => (
                  <div key={m.id} className="flex items-center gap-4 px-5 py-3">
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-[13.5px] font-bold text-foreground">{m.previa ?? m.template}</p>
                      <div className="mt-0.5 flex flex-wrap items-center gap-2 text-[11px] font-medium text-muted-foreground">
                        <span className="uppercase tracking-wider">{m.persona}</span>
                        <span className="tabular-nums">· {mascarar(m.destinatario)}</span>
                        {m.tentativas > 1 && <span>· {m.tentativas} tentativas</span>}
                        {m.erro && <span className="text-rose-400">· {m.erro.slice(0, 60)}</span>}
                      </div>
                    </div>
                    {m.provedor && (
                      <Badge variant="outline" className="shrink-0 rounded-lg border-border px-2 py-0 text-[10px] font-bold uppercase text-muted-foreground">
                        {m.provedor}
                      </Badge>
                    )}
                    <Badge variant="outline" className={`shrink-0 rounded-lg px-2 py-0.5 text-[10px] font-bold uppercase ${COR_STATUS[m.status] ?? ""}`}>
                      {m.status}
                    </Badge>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </section>

      {/* A lista que resolve o gargalo real da Onda 1 */}
      <section className="space-y-3">
        <div>
          <h2 className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Inalcançáveis — ação do time</h2>
          <p className="mt-1 text-[13px] font-medium text-muted-foreground max-w-2xl">
            Clientes ativos sem nenhum telefone utilizável. Enquanto estiverem nesta lista, nenhum aviso chega neles —
            por mais que o resto do sistema funcione. Higienizar isto é o que aumenta o alcance do gatilho.
          </p>
        </div>
        <Card>
          <CardContent className="p-0">
            {carregando ? (
              <div className="h-24 animate-pulse bg-card/40" />
            ) : stats.sem.length === 0 ? (
              <p className="p-8 text-center text-[13px] font-medium text-muted-foreground">
                Todos os clientes ativos têm ao menos um contato. 🎯
              </p>
            ) : (
              <div className="max-h-[420px] divide-y divide-border/40 overflow-y-auto">
                {stats.sem.map((c) => (
                  <button
                    key={c.id_cliente}
                    type="button"
                    onClick={() => navigate("/cliente/" + c.id_cliente)}
                    className="flex w-full items-center gap-4 px-5 py-3 text-left transition-colors hover:bg-primary/[0.04]"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-[14px] font-bold tracking-tight text-foreground">{c.empresa ?? "Sem nome"}</p>
                      <p className="text-[11px] font-medium text-muted-foreground">{c.status_atual}</p>
                    </div>
                    <Badge variant="outline" className="shrink-0 rounded-lg border-amber-400/30 px-2 py-0.5 text-[10px] font-bold uppercase text-amber-400">
                      sem telefone
                    </Badge>
                    <ChevronRight className="size-4 shrink-0 text-muted-foreground/40" />
                  </button>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </section>
    </div>
  )
}
