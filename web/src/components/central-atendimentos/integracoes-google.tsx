import { useState } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  ShieldCheckIcon,
  CheckCircle2Icon,
  AlertCircleIcon,
  RefreshCwIcon,
  ZapIcon,
} from "@/components/ui/icons"
import { supabase } from "@/lib/supabase"

interface Conta {
  email_calendar: string
  rotulo: string
  descricao: string
}

const CONTAS: Conta[] = [
  { email_calendar: "dono@rafaelgaldino.com.br", rotulo: "Dono (Galdino)", descricao: "Reuniões 1:1 do Galdino" },
  { email_calendar: "mentor@rafaelgaldino.com.br", rotulo: "Mentor (Consultores PMC)", descricao: "Rodrigo, David, Issão, Diego, Ayslan, Matheus, Maxwell" },
  { email_calendar: "especialistablackcrm@rafaelgaldino.com.br", rotulo: "Especialista BlackCRM", descricao: "Tutorias e implementações do Black CRM" },
]

type StatusConta = "idle" | "loading" | "ok" | "erro"

interface ResultadoTeste {
  ok?: boolean
  erro?: string
  busy_intervals?: number
}

export function IntegracoesGoogle() {
  const [status, setStatus] = useState<Record<string, StatusConta>>({})
  const [resultados, setResultados] = useState<Record<string, ResultadoTeste>>({})
  const [sincronizando, setSincronizando] = useState(false)
  const [resultSync, setResultSync] = useState<any>(null)

  async function testar(email: string) {
    setStatus(s => ({ ...s, [email]: "loading" }))
    try {
      const { data, error } = await supabase.functions.invoke("testar-integracao-google", {
        body: { email_calendar: email },
      })
      if (error) {
        setStatus(s => ({ ...s, [email]: "erro" }))
        setResultados(r => ({ ...r, [email]: { erro: error.message } }))
        return
      }
      if (data?.ok) {
        setStatus(s => ({ ...s, [email]: "ok" }))
        setResultados(r => ({ ...r, [email]: { ok: true, busy_intervals: data.busy_intervals } }))
      } else {
        setStatus(s => ({ ...s, [email]: "erro" }))
        setResultados(r => ({ ...r, [email]: { erro: data?.erro ?? "erro desconhecido" } }))
      }
    } catch (e: any) {
      setStatus(s => ({ ...s, [email]: "erro" }))
      setResultados(r => ({ ...r, [email]: { erro: e?.message ?? String(e) } }))
    }
  }

  async function dispararSync() {
    setSincronizando(true)
    setResultSync(null)
    try {
      const { data, error } = await supabase.functions.invoke("sincronizar-reunioes", { body: {} })
      if (error) setResultSync({ erro: error.message })
      else setResultSync(data)
    } catch (e: any) {
      setResultSync({ erro: e?.message ?? String(e) })
    } finally {
      setSincronizando(false)
    }
  }

  return (
    <div className="space-y-6">
      <Card className="border-primary/30 bg-primary/5">
        <CardContent className="p-6 space-y-4">
          <div className="flex items-start gap-4">
            <div className="size-12 rounded-xl bg-primary/15 flex items-center justify-center shrink-0">
              <ShieldCheckIcon className="size-6 text-primary" />
            </div>
            <div className="space-y-2">
              <h3 className="text-base font-bold tracking-tight text-foreground uppercase">Autenticação via Service Account</h3>
              <p className="text-sm text-muted-foreground">
                A integração com Google Calendar/Docs usa uma <span className="font-semibold text-foreground">Service Account com Domain-wide Delegation</span> — sem refresh tokens, sem re-autorização periódica. Pra cada chamada à API, geramos um JWT impersonando a conta certa.
              </p>
              <div className="flex flex-wrap gap-2 pt-1">
                <Badge variant="outline" className="text-[10px] uppercase font-bold bg-background border-primary/30 text-primary">
                  scope: calendar.events
                </Badge>
                <Badge variant="outline" className="text-[10px] uppercase font-bold bg-background border-primary/30 text-primary">
                  scope: documents.readonly
                </Badge>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-base font-bold tracking-tight text-foreground">Contas impersonadas</h3>
            <p className="text-xs text-muted-foreground">Testa se a SA consegue acessar cada uma das agendas.</p>
          </div>
        </div>

        <div className="grid gap-3 md:grid-cols-3">
          {CONTAS.map(c => {
            const st = status[c.email_calendar] ?? "idle"
            const res = resultados[c.email_calendar]
            return (
              <Card key={c.email_calendar}>
                <CardContent className="p-5 space-y-4">
                  <div className="space-y-1">
                    <div className="font-bold text-sm text-foreground">{c.rotulo}</div>
                    <code className="block text-[10px] font-mono text-muted-foreground break-all">
                      {c.email_calendar}
                    </code>
                    <p className="text-[11px] text-muted-foreground">{c.descricao}</p>
                  </div>

                  <div className="flex items-center justify-between">
                    {st === "ok" && (
                      <Badge variant="outline" className="uppercase text-[9px] font-bold bg-primary/10 border-primary/30 text-primary gap-1">
                        <CheckCircle2Icon className="size-3" />
                        Acessível
                      </Badge>
                    )}
                    {st === "erro" && (
                      <Badge variant="outline" className="uppercase text-[9px] font-bold bg-destructive/10 border-destructive/30 text-destructive gap-1">
                        <AlertCircleIcon className="size-3" />
                        Falhou
                      </Badge>
                    )}
                    {st === "idle" && (
                      <span className="text-[10px] uppercase text-muted-foreground font-bold tracking-widest">Sem teste</span>
                    )}
                    {st === "loading" && (
                      <span className="text-[10px] uppercase text-muted-foreground font-bold tracking-widest">Testando...</span>
                    )}
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={st === "loading"}
                      onClick={() => testar(c.email_calendar)}
                      className="gap-1.5"
                    >
                      <RefreshCwIcon className="size-3" />
                      Testar
                    </Button>
                  </div>

                  {st === "ok" && res?.busy_intervals !== undefined && (
                    <div className="text-[11px] text-muted-foreground">
                      {res.busy_intervals === 0 ? "Livre nas próximas 1h" : `${res.busy_intervals} bloco(s) ocupado(s) na próxima 1h`}
                    </div>
                  )}
                  {st === "erro" && res?.erro && (
                    <div className="text-[11px] text-destructive bg-destructive/5 border border-destructive/20 rounded-lg p-2 break-words">
                      {res.erro}
                    </div>
                  )}
                </CardContent>
              </Card>
            )
          })}
        </div>
      </div>

      <Card>
        <CardContent className="p-6 space-y-4">
          <div className="flex items-start justify-between gap-4">
            <div className="space-y-1">
              <h3 className="text-base font-bold tracking-tight text-foreground">Sincronização manual</h3>
              <p className="text-xs text-muted-foreground">
                Roda o job que normalmente acontece a cada hora — busca eventos passados, extrai Gemini Doc (transcrição/resumo/detalhes) e gravação, e depois usa o LLM pra extrair ganho/ações.
              </p>
            </div>
            <Button onClick={dispararSync} disabled={sincronizando} className="gap-2 shrink-0">
              <ZapIcon className="size-4" />
              {sincronizando ? "Sincronizando..." : "Disparar sync agora"}
            </Button>
          </div>

          {resultSync && (
            <div className="rounded-xl border border-border bg-muted/10 p-4 space-y-2">
              {resultSync.erro ? (
                <div className="text-sm text-destructive">Erro: {resultSync.erro}</div>
              ) : (
                <>
                  <div className="grid grid-cols-2 md:grid-cols-5 gap-3 text-center">
                    <Stat label="Consideradas" value={resultSync.consideradas ?? 0} />
                    <Stat label="Enrich OK" value={resultSync.enrich_ok ?? 0} />
                    <Stat label="Enrich Falha" value={resultSync.enrich_fail ?? 0} ruim />
                    <Stat label="LLM OK" value={resultSync.llm_ok ?? 0} />
                    <Stat label="LLM Falha" value={resultSync.llm_fail ?? 0} ruim />
                  </div>
                  {Array.isArray(resultSync.erros) && resultSync.erros.length > 0 && (
                    <details className="text-[11px] text-muted-foreground pt-2">
                      <summary className="cursor-pointer font-bold uppercase tracking-widest text-destructive">
                        Erros ({resultSync.erros.length})
                      </summary>
                      <ul className="mt-2 space-y-1">
                        {resultSync.erros.slice(0, 10).map((e: any, idx: number) => (
                          <li key={idx} className="font-mono">
                            <span className="text-foreground">{e.id_unico}</span> [{e.etapa}]: {e.erro}
                          </li>
                        ))}
                      </ul>
                    </details>
                  )}
                </>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

function Stat({ label, value, ruim }: { label: string; value: number; ruim?: boolean }) {
  return (
    <div className="space-y-1">
      <div className={`text-2xl font-bold ${ruim && value > 0 ? "text-destructive" : "text-foreground"}`}>{value}</div>
      <div className="text-[9px] font-bold uppercase tracking-widest text-muted-foreground">{label}</div>
    </div>
  )
}
