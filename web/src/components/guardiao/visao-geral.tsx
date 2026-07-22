// Visão geral do Guardião — tela didática em 5 blocos:
// 1) o conceito em uma frase · 2) como funciona (4 passos com CTA) ·
// 3) seu processo agora (números reais + próxima ação) · 4) o que o
// assessment mede (pilares expansíveis) · 5) características do perfil ideal.
import { useEffect, useMemo, useState } from "react"
import { useSearchParams } from "react-router-dom"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import {
  ShieldCheckIcon as ShieldCheck,
  BotIcon as Bot,
  TargetIcon as Target,
  MegaphoneIcon as Megaphone,
  CompassIcon as Compass,
  SendIcon as Send,
  BarChart3Icon as BarChart3,
  UsersIcon as Users,
  ChevronDownIcon as ChevronDown,
  ChevronRightIcon as ChevronRight,
  CheckCircle2Icon as CheckCircle2,
  XIcon as X,
  Sparkles2Icon as Sparkles,
  FileTextIcon as FileText,
} from "@/components/ui/icons"
import { listarResultados, type InviteWithResult } from "@/lib/guardiao/api"

const PASSOS = [
  {
    numero: 1,
    titulo: "Convide",
    desc: "Gere um link único por pessoa — colaboradores internos ou candidatos de fora. Cada um recebe o mesmo teste.",
    cta: "Gerar convite",
    tab: "convites",
    icon: Send,
  },
  {
    numero: 2,
    titulo: "Eles respondem",
    desc: "O assessment avalia os 5 pilares do Guardião + perfil DISC. Leva cerca de 15 minutos, direto pelo link.",
    cta: null,
    tab: null,
    icon: FileText,
  },
  {
    numero: 3,
    titulo: "Compare",
    desc: "Cada pessoa recebe uma nota geral e uma nota por pilar. Quem atinge 70% ou mais tem perfil apto.",
    cta: "Ver candidatos",
    tab: "candidatos",
    icon: BarChart3,
  },
  {
    numero: 4,
    titulo: "Conduza o funil",
    desc: "Com os aprovados, siga as etapas: envio de case, entrevista, negociação e contratação do seu Guardião.",
    cta: "Abrir funil",
    tab: "candidatos",
    icon: Users,
  },
]

const PILARES = [
  {
    title: "Adoção à tecnologia",
    desc: "Curiosidade, abertura e prática real com ferramentas de IA no dia a dia.",
    exemplo: "Já usa ChatGPT, Claude ou outras IAs por conta própria para resolver problemas do trabalho — sem ninguém mandar.",
    icon: Bot,
  },
  {
    title: "Visão de processo e resultado",
    desc: "Enxerga o todo, mapeia processos e foca em ganho prático para o negócio.",
    exemplo: "Consegue descrever um processo da empresa do início ao fim e apontar onde se perde tempo ou dinheiro.",
    icon: Target,
  },
  {
    title: "Comunicação e liderança",
    desc: "Engaja pessoas, traduz a IA para diferentes áreas e conduz mudanças.",
    exemplo: "Explica algo técnico para quem não é técnico — e as pessoas escutam quando essa pessoa fala.",
    icon: Megaphone,
  },
  {
    title: "Responsabilidade e governança",
    desc: "Ética com dados, cuidado com riscos e clareza sobre limites da IA.",
    exemplo: "Pensa antes de colocar dados sensíveis da empresa numa ferramenta — e sabe que IA erra e precisa de revisão.",
    icon: ShieldCheck,
  },
  {
    title: "Gestão de mudança",
    desc: "Conduz a empresa pela transição cultural exigida pela adoção da IA.",
    exemplo: "Quando a empresa muda um sistema ou processo, é quem puxa os outros em vez de resistir.",
    icon: Compass,
  },
]

const PROCURAR = [
  "Curioso e mão na massa — testa antes de perguntar",
  "Organizado: documenta, cria padrão, finaliza o que começa",
  "Comunica bem com o dono e com a equipe",
  "Tem confiança do time (não precisa ser gestor)",
]

const EVITAR = [
  "Espera ordem para tudo — sem iniciativa",
  "Resiste a mudanças ou defende o \"sempre foi assim\"",
  "Promete e não entrega no prazo",
  "Trata a IA como ameaça, não como alavanca",
]

export default function VisaoGeral({ clientId }: { clientId?: string }) {
  const [, setSearchParams] = useSearchParams()
  const [rows, setRows] = useState<InviteWithResult[]>([])
  const [carregou, setCarregou] = useState(false)
  const [pilarAberto, setPilarAberto] = useState<number | null>(null)

  useEffect(() => {
    let cancelled = false
    listarResultados(clientId)
      .then((r) => { if (!cancelled) setRows(r) })
      .catch(() => {})
      .finally(() => { if (!cancelled) setCarregou(true) })
    return () => { cancelled = true }
  }, [clientId])

  function goTo(tab: string) {
    setSearchParams(
      (p) => {
        p.set("tab", tab)
        return p
      },
      { replace: true },
    )
  }

  // Números do processo + próxima ação sugerida (muda conforme o estado real).
  const status = useMemo(() => {
    const convites = rows.length
    const responderam = rows.filter((r) => r.result != null).length
    const aprovados = rows.filter((r) => Number(r.result?.score_pct ?? 0) >= 70).length
    const contratado = rows.some((r) => (r as any).stage === "contratado_guardiao")
    let proximo: { texto: string; tab: string }
    if (contratado) {
      proximo = { texto: "Guardião contratado! Acompanhe a evolução dele nas fases do Método.", tab: "candidatos" }
    } else if (convites === 0) {
      proximo = { texto: "Comece agora: gere o primeiro convite e envie para quem você enxerga potencial.", tab: "convites" }
    } else if (responderam === 0) {
      proximo = { texto: "Convites enviados — aguardando respostas. Reforce com as pessoas ou convide mais gente.", tab: "convites" }
    } else if (aprovados === 0) {
      proximo = { texto: "Ninguém atingiu 70% ainda. Veja as notas por pilar e convide novos candidatos.", tab: "candidatos" }
    } else {
      proximo = {
        texto: `Você tem ${aprovados} aprovado${aprovados > 1 ? "s" : ""} — mova para o envio de case ou agende a entrevista.`,
        tab: "candidatos",
      }
    }
    return { convites, responderam, aprovados, proximo }
  }, [rows])

  return (
    <div className="space-y-10">
      {/* 1 · O conceito em uma frase */}
      <Card className="border-primary/20 bg-primary/[0.04]">
        <CardContent className="p-6 lg:p-8">
          <div className="inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/10 px-3 py-1 text-[11px] font-bold uppercase tracking-wider text-primary mb-4">
            <ShieldCheck className="size-3" />
            Fase 1 do Método
          </div>
          <h2 className="text-2xl md:text-3xl font-bold tracking-tight text-foreground max-w-2xl">
            O Guardião é quem <span className="text-primary">executa a IA</span> enquanto você comanda a estratégia
          </h2>
          <p className="mt-3 text-sm md:text-base leading-relaxed text-muted-foreground max-w-2xl">
            Não é um cargo técnico — é a pessoa certa, dentro ou fora da sua empresa. Esta área te ajuda a
            encontrá-la com um teste objetivo, em vez de intuição.
          </p>
        </CardContent>
      </Card>

      {/* 2 · Como funciona — 4 passos */}
      <section className="space-y-4">
        <div>
          <h3 className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Como funciona</h3>
          <p className="mt-1 text-lg font-bold tracking-tight text-foreground">4 passos até o seu Guardião</p>
        </div>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {PASSOS.map((p) => (
            <Card key={p.numero} className="flex flex-col">
              <CardContent className="p-5 flex flex-col gap-2.5 flex-1">
                <div className="flex items-center justify-between">
                  <div className="flex size-9 items-center justify-center rounded-lg bg-primary/10 ring-1 ring-primary/30">
                    <p.icon className="size-4.5 text-primary" />
                  </div>
                  <span className="font-mono text-[11px] font-bold text-muted-foreground/60">0{p.numero}</span>
                </div>
                <p className="text-[15px] font-bold tracking-tight text-foreground">{p.titulo}</p>
                <p className="text-[12px] font-medium text-muted-foreground leading-relaxed flex-1">{p.desc}</p>
                {p.cta && p.tab && (
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-8 gap-1 rounded-lg text-[11px] font-bold uppercase tracking-wider hover:border-primary/40 hover:bg-primary/5 mt-1"
                    onClick={() => goTo(p.tab!)}
                  >
                    {p.cta}
                    <ChevronRight className="size-3.5" />
                  </Button>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      {/* 3 · Seu processo agora */}
      {carregou && (
        <Card className="border-primary/30">
          <CardContent className="p-5 lg:p-6">
            <p className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground mb-4">Seu processo agora</p>
            <div className="flex items-center gap-6 lg:gap-10 flex-wrap">
              <div>
                <p className="text-3xl font-bold tabular-nums text-foreground">{status.convites}</p>
                <p className="text-[12px] font-medium text-muted-foreground">convite{status.convites === 1 ? "" : "s"}</p>
              </div>
              <div>
                <p className="text-3xl font-bold tabular-nums text-foreground">{status.responderam}</p>
                <p className="text-[12px] font-medium text-muted-foreground">responderam</p>
              </div>
              <div>
                <p className="text-3xl font-bold tabular-nums text-primary">{status.aprovados}</p>
                <p className="text-[12px] font-medium text-muted-foreground">aprovados ≥ 70%</p>
              </div>
              <button
                type="button"
                onClick={() => goTo(status.proximo.tab)}
                className="flex-1 min-w-56 text-left group"
              >
                <p className="text-[10px] font-bold uppercase tracking-widest text-primary">Próximo passo</p>
                <p className="text-[13px] font-bold text-foreground leading-snug mt-0.5 group-hover:text-primary transition-colors">
                  {status.proximo.texto} <ChevronRight className="inline size-3.5 text-primary" />
                </p>
              </button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* 4 · O que o assessment mede */}
      <section className="space-y-4">
        <div>
          <h3 className="text-xs font-bold uppercase tracking-widest text-muted-foreground">O que o assessment mede</h3>
          <p className="mt-1 text-lg font-bold tracking-tight text-foreground">
            Os 5 pilares do <span className="text-primary">Guardião da IA</span>
          </p>
          <p className="mt-1 text-[13px] font-medium text-muted-foreground">
            Toque em cada pilar para ver como ele aparece no dia a dia.
          </p>
        </div>
        <div className="space-y-2">
          {PILARES.map((p, i) => {
            const aberto = pilarAberto === i
            return (
              <Card key={p.title} className={aberto ? "border-primary/30" : ""}>
                <button
                  type="button"
                  className="w-full text-left"
                  onClick={() => setPilarAberto(aberto ? null : i)}
                >
                  <CardContent className="p-4 lg:px-5">
                    <div className="flex items-center gap-3">
                      <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 ring-1 ring-primary/30">
                        <p.icon className="size-4.5 text-primary" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-[10px] font-bold uppercase tracking-widest text-primary/80">Pilar 0{i + 1}</p>
                        <p className="text-[14px] font-bold tracking-tight text-foreground">{p.title}</p>
                      </div>
                      <ChevronDown className={`size-4 text-muted-foreground shrink-0 transition-transform ${aberto ? "rotate-180" : ""}`} />
                    </div>
                    {aberto && (
                      <div className="mt-3 pl-12 space-y-2">
                        <p className="text-[13px] font-medium text-muted-foreground leading-relaxed">{p.desc}</p>
                        <div className="rounded-xl bg-primary/[0.05] border border-primary/20 p-3">
                          <p className="text-[10px] font-bold uppercase tracking-widest text-primary mb-1">Como aparece no dia a dia</p>
                          <p className="text-[13px] font-medium text-foreground leading-relaxed">{p.exemplo}</p>
                        </div>
                      </div>
                    )}
                  </CardContent>
                </button>
              </Card>
            )
          })}
        </div>
      </section>

      {/* 5 · Características do Guardião ideal */}
      <section className="space-y-4">
        <div>
          <h3 className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Perfil ideal</h3>
          <p className="mt-1 text-lg font-bold tracking-tight text-foreground">O que procurar — e o que evitar</p>
          <p className="mt-1 text-[13px] font-medium text-muted-foreground">
            Não precisa ser programador. Precisa ser dono do problema.
          </p>
        </div>
        <div className="grid gap-4 md:grid-cols-2">
          <Card>
            <CardContent className="p-5">
              <p className="text-[11px] font-bold uppercase tracking-widest text-primary mb-3">Procure alguém que…</p>
              <ul className="space-y-2.5">
                {PROCURAR.map((t) => (
                  <li key={t} className="flex items-start gap-2.5">
                    <CheckCircle2 className="size-4 text-primary shrink-0 mt-0.5" />
                    <span className="text-[13px] font-medium text-foreground leading-relaxed">{t}</span>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-5">
              <p className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground mb-3">Sinais de alerta</p>
              <ul className="space-y-2.5">
                {EVITAR.map((t) => (
                  <li key={t} className="flex items-start gap-2.5">
                    <X className="size-4 text-rose-400 shrink-0 mt-0.5" />
                    <span className="text-[13px] font-medium text-muted-foreground leading-relaxed">{t}</span>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        </div>
      </section>

      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        <Sparkles className="size-3 text-primary" />
        Corte de aderência: ≥ 70% indica perfil apto para seguir como Guardião.
      </div>
    </div>
  )
}
