// As 7 etapas do Método PMC (Multiplicador de Crescimento).
// Fonte: metodo-pmc.pdf — títulos e objetivos resumidos de cada etapa.

export interface EtapaMetodo {
  numero: number
  titulo: string
  objetivo: string
}

export const ETAPAS_METODO: EtapaMetodo[] = [
  {
    numero: 1,
    titulo: "O Guardião da IA",
    objetivo: "Remover a barreira tecnológica com um pilar de execução tática, mantendo o empresário focado na estratégia.",
  },
  {
    numero: 2,
    titulo: "Inteligência Empresarial",
    objetivo: "Transformar dados brutos em inteligência estratégica e definir a 'Única Coisa' que destrava o crescimento.",
  },
  {
    numero: 3,
    titulo: "Mapeador de Gargalos",
    objetivo: "Documentar 100% dos fluxos e gargalos que drenam energia operacional, receita e caixa da empresa.",
  },
  {
    numero: 4,
    titulo: "Engenharia da Eficiência Operacional",
    objetivo: "Transformar gargalos em automações de IA validadas, construindo o Organograma Híbrido da empresa.",
  },
  {
    numero: 5,
    titulo: "Construção de Co-Pilotos e Rotinas",
    objetivo: "Garantir a adoção prática da IA pela equipe com copilotos, rotinas diárias e gestão replicável (PDCA).",
  },
  {
    numero: 6,
    titulo: "Implementação de Sistemas Inteligentes",
    objetivo: "Consolidar copilotos e automações em sistemas robustos: a empresa vira uma empresa de tecnologia.",
  },
  {
    numero: 7,
    titulo: "Arsenal do Lucro",
    objetivo: "Assegurar a evolução contínua da metodologia com acesso a especialistas para crescer mais rápido.",
  },
]
