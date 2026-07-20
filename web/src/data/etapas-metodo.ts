// As 7 etapas do Método PMC (Multiplicador de Crescimento).
// Fonte: metodo-pmc.pdf — títulos e objetivos resumidos de cada etapa.
//
// Cada etapa é ACIONÁVEL: `rota` leva o cliente ao lugar onde a ação acontece,
// `cta` é o texto do botão, e `sinal` indica qual dado marca a etapa como
// concluída automaticamente (sem depender do admin). Os sinais correspondem
// às 6 fases do Método (contagem de registros) + reuniões realizadas.

export type SinalEtapa =
  | "guardiao" | "areas" | "gargalos" | "copilotos" | "sistemas" | "economias" | "reunioes"

export interface EtapaMetodo {
  numero: number
  titulo: string
  objetivo: string
  rota: string
  cta: string
  sinal: SinalEtapa
}

export const ETAPAS_METODO: EtapaMetodo[] = [
  {
    numero: 1,
    titulo: "O Guardião da IA",
    objetivo: "Remover a barreira tecnológica com um pilar de execução tática, mantendo o empresário focado na estratégia.",
    rota: "/metodo?fase=1",
    cta: "Definir meu Guardião",
    sinal: "guardiao",
  },
  {
    numero: 2,
    titulo: "Inteligência Empresarial",
    objetivo: "Transformar dados brutos em inteligência estratégica e definir a 'Única Coisa' que destrava o crescimento.",
    rota: "/metodo?fase=2",
    cta: "Mapear inteligência",
    sinal: "areas",
  },
  {
    numero: 3,
    titulo: "Mapeador de Gargalos",
    objetivo: "Documentar 100% dos fluxos e gargalos que drenam energia operacional, receita e caixa da empresa.",
    rota: "/metodo?fase=3",
    cta: "Mapear gargalos",
    sinal: "gargalos",
  },
  {
    numero: 4,
    titulo: "Engenharia da Eficiência Operacional",
    objetivo: "Transformar gargalos em automações de IA validadas, construindo o Organograma Híbrido da empresa.",
    rota: "/metodo?fase=6",
    cta: "Registrar eficiência",
    sinal: "economias",
  },
  {
    numero: 5,
    titulo: "Construção de Co-Pilotos e Rotinas",
    objetivo: "Garantir a adoção prática da IA pela equipe com copilotos, rotinas diárias e gestão replicável (PDCA).",
    rota: "/metodo?fase=4",
    cta: "Criar co-pilotos",
    sinal: "copilotos",
  },
  {
    numero: 6,
    titulo: "Implementação de Sistemas Inteligentes",
    objetivo: "Consolidar copilotos e automações em sistemas robustos: a empresa vira uma empresa de tecnologia.",
    rota: "/metodo?fase=5",
    cta: "Cadastrar sistemas",
    sinal: "sistemas",
  },
  {
    numero: 7,
    titulo: "Arsenal do Lucro",
    objetivo: "Assegurar a evolução contínua da metodologia com acesso a especialistas para crescer mais rápido.",
    rota: "/reunioes",
    cta: "Ver minhas reuniões",
    sinal: "reunioes",
  },
]
