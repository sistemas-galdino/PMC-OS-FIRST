// Notificações — onde o cliente escolhe o que recebe no WhatsApp.
// Nada é enviado sem consentimento explícito: a tabela nasce com tudo em false,
// então esta tela é o único caminho para ligar qualquer aviso (LGPD).
// O telefone vem mascarado de meu_status_contato() — nunca expomos o número cheio.
import { useCallback, useEffect, useState } from "react"
import type { Session } from "@supabase/supabase-js"
import { supabase } from "@/lib/supabase"
import { PageHeader } from "@/components/layout/page-header"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import {
  ShieldCheckIcon as ShieldCheck,
  Building2Icon as Building,
  AlertTriangleIcon as AlertTriangle,
  CheckCircle2Icon as CheckCircle2,
} from "@/components/ui/icons"

interface Props { session?: Session; clientId?: string }

type Persona = "guardiao" | "dono"
type Chave = "digest_diario" | "digest_semanal" | "eventos"

interface Pref {
  pessoa_ref: string
  digest_diario: boolean
  digest_semanal: boolean
  eventos: boolean
  optout_em: string | null
}
interface StatusContato { persona: string; tem_contato: boolean; mascara: string | null }

// O que cada persona pode ligar. O diário é do Guardião (quem opera todo dia);
// o semanal é do dono (quem precisa da prova, não da operação).
const OPCOES: Record<Persona, { chave: Chave; titulo: string; desc: string }[]> = {
  guardiao: [
    { chave: "digest_diario", titulo: "Resumo diário", desc: "Seg a sex, 8h: tarefas do dia, atrasos e travas abertas." },
    { chave: "eventos", titulo: "Avisos na hora", desc: "Tarefa atribuída, prazo vencendo, trava parada há mais de 48h." },
  ],
  dono: [
    { chave: "digest_semanal", titulo: "Resumo semanal", desc: "Segunda, 8h: o que a máquina produziu e o que espera decisão sua." },
    { chave: "eventos", titulo: "Avisos na hora", desc: "Candidato respondeu o assessment do Guardião, vitória aprovada." },
  ],
}

const PERSONAS: { chave: Persona; titulo: string; papel: string; icone: typeof ShieldCheck }[] = [
  { chave: "guardiao", titulo: "Guardião de IA", papel: "Quem executa a IA no dia a dia", icone: ShieldCheck },
  { chave: "dono", titulo: "Você (dono)", papel: "Quem decide e acompanha o resultado", icone: Building },
]

export default function NotificacoesPage({ session, clientId }: Props) {
  const cid = clientId || session?.user?.id
  const [prefs, setPrefs] = useState<Record<string, Pref>>({})
  const [contatos, setContatos] = useState<Record<string, StatusContato>>({})
  const [carregando, setCarregando] = useState(true)
  const [salvando, setSalvando] = useState<string | null>(null)

  const carregar = useCallback(async () => {
    if (!cid) return
    const [{ data: p }, { data: c }] = await Promise.all([
      supabase.from("preferencias_notificacao").select("pessoa_ref, digest_diario, digest_semanal, eventos, optout_em").eq("id_cliente", cid),
      supabase.rpc("meu_status_contato"),
    ])
    const mp: Record<string, Pref> = {}
    ;(p ?? []).forEach((r: any) => { mp[r.pessoa_ref] = r })
    setPrefs(mp)
    const mc: Record<string, StatusContato> = {}
    ;(c ?? []).forEach((r: any) => { mc[r.persona] = r })
    setContatos(mc)
    setCarregando(false)
  }, [cid])

  useEffect(() => { carregar() }, [carregar])

  const ligado = (persona: Persona, chave: Chave) => {
    const p = prefs[persona]
    if (!p || p.optout_em) return false
    return !!p[chave]
  }

  async function alternar(persona: Persona, chave: Chave) {
    if (!cid) return
    const atual = ligado(persona, chave)
    const marca = `${persona}:${chave}`
    setSalvando(marca)
    // Otimista: a UI responde na hora; se falhar, recarregamos do banco.
    setPrefs((prev) => ({
      ...prev,
      [persona]: { ...(prev[persona] ?? { pessoa_ref: persona, digest_diario: false, digest_semanal: false, eventos: false, optout_em: null }), [chave]: !atual, optout_em: null },
    }))
    const base = prefs[persona]
    const { error } = await supabase.from("preferencias_notificacao").upsert({
      id_cliente: cid,
      pessoa_ref: persona,
      canal: "whatsapp",
      digest_diario: chave === "digest_diario" ? !atual : !!base?.digest_diario,
      digest_semanal: chave === "digest_semanal" ? !atual : !!base?.digest_semanal,
      eventos: chave === "eventos" ? !atual : !!base?.eventos,
      optin_em: new Date().toISOString(),
      optout_em: null,
      updated_at: new Date().toISOString(),
    }, { onConflict: "id_cliente,pessoa_ref,canal" })
    if (error) { console.error("Erro ao salvar preferência:", error); await carregar() }
    setSalvando(null)
  }

  if (!cid) return null

  return (
    <div className="space-y-8 pb-10">
      <PageHeader
        title="Notificações"
        description="Escolha o que o PMC OS te avisa no WhatsApp. Nada é enviado sem você ligar aqui."
      />

      {carregando ? (
        <div className="space-y-4">{[0, 1].map((i) => <div key={i} className="h-52 rounded-2xl bg-card/40 animate-pulse" />)}</div>
      ) : (
        <div className="grid gap-5 lg:grid-cols-2">
          {PERSONAS.map((p) => {
            const contato = contatos[p.chave]
            const semContato = !contato?.tem_contato
            return (
              <Card key={p.chave} className={semContato ? "border-amber-400/30" : ""}>
                <CardContent className="p-6 space-y-5">
                  <div className="flex items-start gap-3">
                    <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 ring-1 ring-primary/30">
                      <p.icone className="size-5 text-primary" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-[16px] font-bold tracking-tight text-foreground">{p.titulo}</p>
                      <p className="text-[12px] font-medium text-muted-foreground">{p.papel}</p>
                    </div>
                  </div>

                  {/* Sem telefone, ligar o aviso não adianta — dizemos isso na cara. */}
                  {semContato ? (
                    <div className="flex items-start gap-2.5 rounded-xl border border-amber-400/30 bg-amber-400/[0.06] p-3.5">
                      <AlertTriangle className="mt-0.5 size-4 shrink-0 text-amber-400" />
                      <div>
                        <p className="text-[13px] font-bold text-foreground">Sem WhatsApp cadastrado</p>
                        <p className="text-[12px] font-medium text-muted-foreground">
                          {p.chave === "guardiao"
                            ? "Cadastre o WhatsApp do Guardião em Meu Time ou na Fase 1 do Método."
                            : "Fale com o seu consultor para atualizar o telefone da empresa."}
                        </p>
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2 rounded-xl border border-border bg-muted/20 px-3.5 py-2.5">
                      <CheckCircle2 className="size-4 shrink-0 text-primary" />
                      <p className="text-[13px] font-medium text-foreground">
                        Enviaremos para <span className="font-bold tabular-nums">{contato?.mascara}</span>
                      </p>
                    </div>
                  )}

                  <div className="space-y-2.5">
                    {OPCOES[p.chave].map((o) => {
                      const on = ligado(p.chave, o.chave)
                      const marca = `${p.chave}:${o.chave}`
                      return (
                        <button
                          key={o.chave}
                          type="button"
                          disabled={semContato || salvando === marca}
                          onClick={() => alternar(p.chave, o.chave)}
                          aria-pressed={on}
                          className={`flex w-full items-start gap-3 rounded-xl border p-3.5 text-left transition-colors disabled:opacity-50 ${
                            on ? "border-primary/40 bg-primary/[0.05]" : "border-border hover:border-primary/25"
                          }`}
                        >
                          {/* Interruptor */}
                          <span className={`mt-0.5 flex h-5 w-9 shrink-0 items-center rounded-full p-0.5 transition-colors ${on ? "bg-primary" : "bg-muted-foreground/25"}`}>
                            <span className={`size-4 rounded-full bg-background transition-transform ${on ? "translate-x-4" : "translate-x-0"}`} />
                          </span>
                          <span className="min-w-0 flex-1">
                            <span className="block text-[13px] font-bold text-foreground">{o.titulo}</span>
                            <span className="block text-[12px] font-medium text-muted-foreground leading-relaxed">{o.desc}</span>
                          </span>
                          {on && (
                            <Badge variant="outline" className="shrink-0 rounded-lg border-primary/30 px-2 py-0 text-[10px] font-bold uppercase text-primary">
                              Ativo
                            </Badge>
                          )}
                        </button>
                      )
                    })}
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}

      <Card>
        <CardContent className="p-5">
          <p className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground mb-2">Como tratamos isso</p>
          <p className="text-[13px] font-medium text-muted-foreground leading-relaxed max-w-3xl">
            Só enviamos o que estiver ligado aqui, e toda mensagem carrega um número ou uma decisão — nunca "você tem
            novidades". Você pode desligar a qualquer momento nesta tela ou respondendo <strong className="text-foreground">SAIR</strong> no
            WhatsApp. Ao ligar os avisos do Guardião, confirme que ele concorda em receber no número dele.
          </p>
        </CardContent>
      </Card>
    </div>
  )
}
