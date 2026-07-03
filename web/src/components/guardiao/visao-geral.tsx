import { useSearchParams } from "react-router-dom"
import { Card } from "@/components/ui/card"
import {
  ShieldCheckIcon as ShieldCheck,
  BotIcon as Bot,
  TargetIcon as Target,
  MegaphoneIcon as Megaphone,
  CompassIcon as Compass,
  SendIcon as Send,
  BarChart3Icon as BarChart3,
  ArrowUpRightIcon as ArrowUpRight,
  Sparkles2Icon as Sparkles,
} from "@/components/ui/icons"

const PILLARS = [
  {
    title: "Adoção à tecnologia",
    desc: "Curiosidade, abertura e prática real com ferramentas de IA no dia a dia.",
    icon: Bot,
  },
  {
    title: "Visão de processo e resultado",
    desc: "Enxerga o todo, mapeia processos e foca em ganho prático para o negócio.",
    icon: Target,
  },
  {
    title: "Comunicação e liderança",
    desc: "Engaja pessoas, traduz a IA para diferentes áreas e conduz mudanças.",
    icon: Megaphone,
  },
  {
    title: "Responsabilidade e governança",
    desc: "Ética com dados, cuidado com riscos e clareza sobre limites da IA.",
    icon: ShieldCheck,
  },
  {
    title: "Gestão de mudança",
    desc: "Conduz a empresa pela transição cultural exigida pela adoção da IA.",
    icon: Compass,
  },
]

export default function VisaoGeral() {
  const [, setSearchParams] = useSearchParams()

  function goTo(tab: string) {
    setSearchParams(
      (p) => {
        p.set("tab", tab)
        return p
      },
      { replace: true },
    )
  }

  return (
    <div className="space-y-10">
      <header className="max-w-3xl space-y-4">
        <div className="inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/10 px-3 py-1 text-[11px] font-bold uppercase tracking-wider text-primary">
          <ShieldCheck className="size-3" />
          Avaliação de Perfil
        </div>
        <h2 className="text-2xl md:text-3xl font-bold tracking-tight text-foreground">
          Encontre o <span className="text-primary">Guardião da IA</span> da sua empresa
        </h2>
        <p className="text-sm md:text-base leading-relaxed text-muted-foreground">
          O Guardião é a pessoa com aderência às habilidades e aos pilares essenciais para conduzir a
          implementação de IA no seu negócio. Avalie colaboradores internos e candidatos externos com o
          mesmo teste e compare de forma objetiva.
        </p>
      </header>

      <section className="space-y-5">
        <div>
          <h3 className="text-xs font-bold uppercase tracking-widest text-muted-foreground">
            O que avaliamos
          </h3>
          <p className="mt-1 text-lg font-bold tracking-tight text-foreground">
            Pilares do <span className="text-primary">Guardião da IA</span>
          </p>
        </div>

        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {PILLARS.map((p, i) => (
            <Card key={p.title} className="p-5">
              <div className="flex items-start gap-3">
                <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 ring-1 ring-primary/30">
                  <p.icon className="size-5 text-primary" />
                </div>
                <div className="min-w-0">
                  <p className="text-[10px] font-bold uppercase tracking-widest text-primary/80">
                    Pilar 0{i + 1}
                  </p>
                  <h4 className="mt-0.5 text-base font-bold tracking-tight leading-tight text-foreground">
                    {p.title}
                  </h4>
                </div>
              </div>
              <p className="mt-3 text-sm leading-relaxed text-muted-foreground">{p.desc}</p>
            </Card>
          ))}
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-2">
        <button
          type="button"
          onClick={() => goTo("convites")}
          className="group flex items-center justify-between rounded-xl border border-border bg-muted/20 p-5 text-left transition-all duration-300 hover:border-primary/50 hover:bg-muted/40"
        >
          <div className="flex items-center gap-3">
            <Send className="size-4 text-primary" />
            <div>
              <p className="font-bold tracking-tight text-foreground">Convites enviados</p>
              <p className="text-xs text-muted-foreground">Gere e copie os links únicos da empresa</p>
            </div>
          </div>
          <ArrowUpRight className="size-4 text-muted-foreground transition group-hover:translate-x-0.5 group-hover:text-primary" />
        </button>

        <button
          type="button"
          onClick={() => goTo("resultados")}
          className="group flex items-center justify-between rounded-xl border border-border bg-muted/20 p-5 text-left transition-all duration-300 hover:border-primary/50 hover:bg-muted/40"
        >
          <div className="flex items-center gap-3">
            <BarChart3 className="size-4 text-primary" />
            <div>
              <p className="font-bold tracking-tight text-foreground">Ver resultados</p>
              <p className="text-xs text-muted-foreground">Ranking, percentual e análise por pilar</p>
            </div>
          </div>
          <ArrowUpRight className="size-4 text-muted-foreground transition group-hover:translate-x-0.5 group-hover:text-primary" />
        </button>
      </section>

      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        <Sparkles className="size-3 text-primary" />
        Corte de aderência: ≥ 70% indica perfil apto para seguir como Guardião.
      </div>
    </div>
  )
}
