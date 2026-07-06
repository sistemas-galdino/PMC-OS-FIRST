import { PageHeader } from "@/components/guardiao/ui-kit"
import { ExternalLink } from "lucide-react"

const APOIO = [
  {
    nome: "David Abner",
    descricao: "Apoio para implementação, sistemas, automações e dúvidas práticas.",
    link: "https://www.pmcos.com.br/atendimento/david",
  },
  {
    nome: "Issao Yokoi",
    descricao: "Apoio para construção, aplicação e direcionamento técnico.",
    link: "https://www.pmcos.com.br/atendimento/issao",
  },
  {
    nome: "Aula do Galdino",
    descricao: "Visão do Galdino sobre o papel, rotina e responsabilidade do Guardião de IA.",
    link: "https://app.multiplicadordecrescimento.com.br/241789-programa-multiplicador-de-crescimento/5359814-como-estruturar-o-guardiao-da-ia-e-transformar-inteligencia-artificial-e",
  },
]

export default function ApoioPage() {
  return (
    <div className="space-y-6">
      <PageHeader title="Apoio PMC" subtitle="Recursos e consultores disponíveis para acelerar a implementação." />

      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-5">
        {APOIO.map((a) => (
          <a
            key={a.nome}
            href={a.link}
            target="_blank"
            rel="noreferrer"
            className="rounded-lg border card-glass p-6 hover:glow-neon transition-all block"
          >
            <div className="h-12 w-12 rounded-lg bg-primary grid place-items-center text-primary-foreground text-xl font-bold mb-4">
              {a.nome[0]}
            </div>
            <h3 className="text-lg font-semibold mb-1">{a.nome}</h3>
            <p className="text-sm text-muted-foreground mb-4">{a.descricao}</p>
            <span className="text-xs text-primary inline-flex items-center gap-1">
              Acessar <ExternalLink className="h-3 w-3" />
            </span>
          </a>
        ))}
      </div>

      <div className="mt-8 rounded-lg border card-glass p-6">
        <h3 className="text-base font-semibold mb-2">Como solicitar apoio dentro de um projeto</h3>
        <p className="text-sm text-muted-foreground">
          Em qualquer projeto piloto, marque <strong className="text-foreground">"Precisa de apoio PMC?" → Sim</strong> e
          escolha o tipo de apoio (Estratégia, Construção, Automação, Dashboard, Prompt, Integração, Revisão de processo).
          O consultor sugerido aparece automaticamente no card do projeto.
        </p>
      </div>
    </div>
  )
}
