// Nível PMC — gamificação unificada. Junta os sinais que hoje vivem em silos
// (etapas da jornada, fases do Método com dados, reuniões realizadas, vitórias)
// num único placar de pontos + nível, para o cliente enxergar sua evolução.

export interface SinaisNivel {
  etapas: number      // etapas da jornada concluídas
  fases: number       // fases do Método com dados
  mapeamento: number  // áreas do Mapeamento preenchidas (0..4)
  reunioes: number    // reuniões realizadas
  vitorias: number    // vitórias registradas
  // Guardião de IA — a Fase 1 vira jornada completa: encontrar → avaliar → contratar → operar.
  convites: number            // convites do assessment do Guardião enviados
  candidatos: number          // candidatos que responderam o assessment
  guardiaoContratado: number  // Guardiões efetivamente contratados (estágio final do funil)
  tarefas: number             // tarefas do Guardião concluídas (rotinas + avulsas)
  // Ritual diário — o hábito que sustenta todo o resto
  diasFechados: number        // dias com o ritual do Meu Dia concluído
  semanasPerfeitas: number    // semanas com os 5 dias úteis fechados
}

export interface NivelPMC {
  nome: string
  indice: number       // 0..N
  pontos: number
  proximoEm: number | null   // pontos para o próximo nível (null se máximo)
  pctProximo: number         // 0..100 progresso dentro do nível atual
}

// Como se ganha ponto (fonte única — calcularPontos usa daqui).
export interface FontePontos {
  chave: keyof SinaisNivel
  label: string
  pontos: number
  descricao: string
  rota: string
}

export const FONTES_PONTOS: FontePontos[] = [
  { chave: "etapas", label: "Etapa da jornada concluída", pontos: 100, descricao: "Cada uma das 7 etapas do Método PMC que você conclui na sua Minha Jornada.", rota: "/inicio" },
  { chave: "fases", label: "Fase do Método com dados", pontos: 40, descricao: "Cada uma das 6 fases do Método MC em que você já cadastrou informações (Guardião, Inteligência, Gargalos, Co-Pilotos, Sistemas, Engenharia).", rota: "/metodo" },
  { chave: "mapeamento", label: "Área do Mapeamento preenchida", pontos: 25, descricao: "Cada uma das 4 áreas do Mapeamento do seu negócio que você preenche: Cenários & Metas, Produtos, Canais e Objetivos.", rota: "/mapeamento" },
  { chave: "vitorias", label: "Vitória registrada", pontos: 30, descricao: "Cada conquista que você registra na Central de Vitórias.", rota: "/vitorias" },
  { chave: "reunioes", label: "Reunião realizada", pontos: 15, descricao: "Cada reunião que você participa (Galdino, consultores ou BlackCRM).", rota: "/reunioes" },
  { chave: "convites", label: "Convite do Guardião enviado", pontos: 20, descricao: "Cada convite do assessment do Guardião que você dispara para um candidato — interno ou externo.", rota: "/guardiao?tab=convites" },
  { chave: "candidatos", label: "Candidato avaliado", pontos: 35, descricao: "Cada pessoa que responde o assessment do Guardião e entra no seu funil de seleção.", rota: "/guardiao?tab=candidatos" },
  { chave: "guardiaoContratado", label: "Guardião contratado", pontos: 200, descricao: "O grande marco da Fase 1: você conduziu o funil até contratar o seu Guardião da IA.", rota: "/guardiao?tab=candidatos" },
  { chave: "tarefas", label: "Tarefa do Guardião concluída", pontos: 10, descricao: "Cada tarefa que o Guardião conclui no cockpit — das rotinas diárias/semanais/quinzenais/mensais ou avulsas.", rota: "/tarefas" },
  { chave: "diasFechados", label: "Dia fechado", pontos: 15, descricao: "Cada dia em que o Guardião completa o ritual no Meu Dia: responde as 3 perguntas da rotina e fecha o expediente.", rota: "/meu-dia" },
  { chave: "semanasPerfeitas", label: "Semana perfeita", pontos: 50, descricao: "Bônus por fechar os cinco dias úteis de uma mesma semana. Constância vale mais que intensidade.", rota: "/meu-dia" },
]

// IMPORTANTE: esta fórmula existe em três lugares que precisam andar juntos —
// aqui, em public.pontos_mc(uuid) e em public.ranking_guardioes(text).
// Mexeu em um, mexa nos três.

// Os níveis, do menor pro maior (minimo = ponto de entrada no nível).
export type CorNivel = "slate" | "sky" | "violet" | "amber" | "lime"

export interface FaixaNivel {
  nome: string
  minimo: number
  icone: string      // chave de ícone (fallback se a imagem não carregar)
  imagem: string     // arquétipo humanoide (public/niveis/*.png)
  cor: CorNivel
  titulo: string     // frase-resumo do nível
  descricao: string  // descrição aprofundada
  foco: string[]     // o que você faz / domina neste nível
}

export const NIVEIS: FaixaNivel[] = [
  {
    nome: "Iniciante",
    minimo: 0,
    icone: "sprout",
    imagem: "/niveis/iniciante.png",
    cor: "slate",
    titulo: "Você entrou no PMC e está montando a base.",
    descricao: "O foco aqui é tirar a IA do campo das ideias e colocá-la para rodar. Você define quem é o seu Guardião da IA — a pessoa que executa a tecnologia enquanto você cuida da estratégia — e organiza as informações do negócio. É o nível em que você sai do caos operacional e ganha clareza do ponto de partida.",
    foco: ["Definir o Guardião da IA", "Mapear o negócio e as metas", "Realizar as primeiras reuniões"],
  },
  {
    nome: "Construtor",
    minimo: 200,
    icone: "zap",
    imagem: "/niveis/construtor.png",
    cor: "sky",
    titulo: "A máquina começou a ser construída.",
    descricao: "Você já tem fases do Método rodando com dados reais e um ritmo de reuniões acontecendo. Agora o trabalho é enxergar os gargalos que drenam tempo e caixa da empresa e começar a transformá-los em automação. O negócio deixa de andar no improviso e passa a ter processo.",
    foco: ["Mapear gargalos e fluxos", "Registrar as primeiras economias", "Manter constância nas reuniões"],
  },
  {
    nome: "Multiplicador",
    minimo: 550,
    icone: "trending",
    imagem: "/niveis/multiplicador.png",
    cor: "violet",
    titulo: "A IA já multiplica o seu trabalho.",
    descricao: "Co-pilotos de IA orbitam as funções da sua equipe e os primeiros sistemas já estão em uso. O nome do nível é literal: o mesmo esforço passa a render mais, porque a tecnologia executa por você. É onde as vitórias começam a se acumular e o resultado aparece em número.",
    foco: ["Criar co-pilotos por função", "Colocar sistemas em uso", "Registrar vitórias na Central"],
  },
  {
    nome: "Arquiteto",
    minimo: 1100,
    icone: "building",
    imagem: "/niveis/arquiteto.png",
    cor: "amber",
    titulo: "Você comanda como arquiteto, não como operário.",
    descricao: "Os sistemas estão consolidados na Torre de Comando, a jornada está avançada e os resultados são provados em economia e horas liberadas. Você deixou de apagar incêndio e passou a desenhar a empresa — a operação roda sem depender de você no detalhe.",
    foco: ["Consolidar sistemas na Torre de Comando", "Provar resultado em R$ e horas", "Sair do operacional do dia a dia"],
  },
  {
    nome: "Mestre PMC",
    minimo: 2000,
    icone: "award",
    imagem: "/niveis/mestre.png",
    cor: "lime",
    titulo: "Domínio total do método.",
    descricao: "Você percorreu as 7 etapas, tem o Organograma Híbrido rodando e transformou a sua empresa numa empresa de tecnologia — por filosofia, não por código. É a referência de Multiplicador de Crescimento: o método virou reflexo.",
    foco: ["Empresa de tecnologia consolidada", "Método rodando em ciclo contínuo (PDCA)", "Referência para outros empresários"],
  },
]

// Faixa de nível a partir dos Pontos MC já calculados (usado no ranking, onde
// os pontos vêm prontos da RPC ranking_guardioes).
export function faixaPorPontos(pontos: number): { indice: number; faixa: FaixaNivel } {
  let indice = 0
  for (let i = NIVEIS.length - 1; i >= 0; i--) {
    if (pontos >= NIVEIS[i].minimo) { indice = i; break }
  }
  return { indice, faixa: NIVEIS[indice] }
}

export function calcularPontos(s: SinaisNivel): number {
  return FONTES_PONTOS.reduce((total, f) => total + (s[f.chave] ?? 0) * f.pontos, 0)
}

export function calcularNivel(s: SinaisNivel): NivelPMC {
  const pontos = calcularPontos(s)
  let indice = 0
  for (let i = NIVEIS.length - 1; i >= 0; i--) {
    if (pontos >= NIVEIS[i].minimo) { indice = i; break }
  }
  const base = NIVEIS[indice].minimo
  const teto = NIVEIS[indice + 1]?.minimo ?? null
  const proximoEm = teto == null ? null : teto - pontos
  const pctProximo = teto == null ? 100 : Math.round(((pontos - base) / (teto - base)) * 100)
  return { nome: NIVEIS[indice].nome, indice, pontos, proximoEm, pctProximo }
}
