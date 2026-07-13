// O Conselho do Galdino — na voz de mentor estratégico e treinador de negócios.
//
// TOM DE VOZ (referência para todo conteúdo do Conselho):
//   Papel: mentor estratégico + treinador de negócios (como num treinamento ao vivo).
//   Características: linguagem simples e direta; explicação didática; foco em execução
//   e resultados; exemplos práticos do mundo real; perguntas que estimulam reflexão;
//   energia motivacional; condução passo a passo.
//   Estilo: conversa natural, frases curtas, comandos de ação claros, foco em
//   marketing, negócios e crescimento empresarial.
//   Referência de mistura: Alex Hormozi (prático) + Flávio Augusto (negócios) +
//   Tony Robbins (energia), mas com linguagem brasileira empresarial simples.
//
// As variações são compostas por [abertura] + frase-núcleo + [fecho do tema],
// o que gera centenas de combinações únicas (ver CONTAGEM_VARIACOES).

interface TemaConselho {
  tema: string
  frases: string[]
  fechos: string[] // "" = sem fecho
}

const ABERTURAS = [
  "",
  "Escuta bem: ",
  "Presta atenção: ",
  "Pensa comigo: ",
  "Anota aí: ",
  "Deixa eu te mostrar uma coisa: ",
  "Olha só: ",
  "Vou te ensinar o caminho: ",
]

const TEMAS: TemaConselho[] = [
  {
    tema: "Modelo Mental",
    frases: [
      "A IA multiplica o que já existe. Organiza o negócio antes de acelerar.",
      "Clareza vem primeiro. Ferramenta vem depois. Nessa ordem, sempre.",
      "A pergunta que muda o jogo: o seu problema é venda ou é bagunça? Responde com honestidade.",
      "Cabeça organizada constrói empresa organizada. Começa por dentro.",
      "Você não precisa de mais uma ferramenta. Precisa de um plano. Qual é o seu?",
      "Todo crescimento de verdade começa na clareza. Sem clareza, você só corre mais rápido em círculo.",
    ],
    fechos: [
      "",
      " Organiza primeiro.",
      " Clareza antes de tudo.",
      " Responde isso hoje.",
      " Um passo de cada vez.",
    ],
  },
  {
    tema: "Liberdade do Dono",
    frases: [
      "Se a empresa para quando você para, você não tem um negócio. Tem um emprego. Bora mudar isso.",
      "Seu objetivo não é trabalhar mais. É construir algo que funcione sem você. Foca aí.",
      "Pergunta pra você: o que só você consegue fazer aí dentro? Comece a treinar alguém pra fazer.",
      "Dono não é quem apaga incêndio. É quem constrói o sistema que evita o incêndio.",
      "Liberdade se constrói um processo de cada vez. Qual você vai documentar hoje?",
      "Ser indispensável não é troféu. É uma corrente. Escolhe uma tarefa e passa pra frente esta semana.",
    ],
    fechos: [
      "",
      " Constrói pra funcionar sem você.",
      " Delega e cresce.",
      " Começa hoje, não segunda.",
    ],
  },
  {
    tema: "Operário × Arquiteto",
    frases: [
      "Você é o arquiteto da empresa, não o operário. Larga o tijolo e pega a planta.",
      "Operário pergunta 'como eu faço?'. Arquiteto pergunta 'como isso se faz sozinho?'. Faz a pergunta certa.",
      "O mercado não paga suor. Paga valor. Onde está o seu maior valor? Vai pra lá.",
      "Seu trabalho mais importante é desenhar o sistema. Reserva uma hora hoje só pra isso.",
      "Enquanto você carrega tijolo, ninguém desenha a planta. E a planta é o único trabalho que era seu.",
      "Um dia de construção vale mais que um mês apagando incêndio. Onde você vai investir o de hoje?",
    ],
    fechos: [
      "",
      " Desenha o sistema.",
      " Uma hora hoje, só pra construir.",
      " Pensa como arquiteto.",
    ],
  },
  {
    tema: "Sistema, não Enfeite",
    frases: [
      "Para de colecionar ferramenta e começa a construir sistema. Um sistema resolve, mil abas confundem.",
      "Toda empresa pode virar uma empresa de tecnologia — por filosofia, não por código.",
      "Ferramenta solta no caos é dinheiro jogado fora. Sistema com IA é máquina que trabalha por você.",
      "Qual tarefa se repete toda semana aí? Essa é a primeira que vira sistema.",
      "Assinatura de IA não é estratégia. O sistema que roda enquanto você dorme, é.",
      "Quem coleciona ferramenta tem hobby. Quem constrói sistema tem empresa. De qual lado você está?",
    ],
    fechos: [
      "",
      " Constrói um sistema esta semana.",
      " Sistema primeiro, ferramenta depois.",
      " Automatiza o que se repete.",
    ],
  },
  {
    tema: "Cultura de Execução",
    frases: [
      "Calma gera riqueza. Pressa é o imposto do desorganizado. Respira e organiza.",
      "Simplicidade é lucro. Complexidade é vaidade. Simplifica um processo hoje.",
      "Ler é teoria. Declarar é intenção. Executar é resultado. Vai até o fim.",
      "Disciplina não é fazer muito. É parar de fazer o que não constrói. O que você vai cortar?",
      "Conhecimento sem ação não muda nada. Escolhe uma coisa e executa agora.",
      "Meta grande se conquista com passo pequeno e constante. Qual é o passo de hoje?",
    ],
    fechos: [
      "",
      " Executa hoje.",
      " Uma ação agora.",
      " Sem segunda-feira.",
      " Repete até virar reflexo.",
    ],
  },
]

export interface ConselhoGaldino {
  tema: string
  frase: string
}

// Total de combinações possíveis (aberturas × frases × fechos válidos por tema).
export const CONTAGEM_VARIACOES = TEMAS.reduce((total, t) => {
  const combosTema = t.frases.reduce((acc, frase) => {
    const fechosValidos = t.fechos.filter((f) => !f || !frase.includes(f.trim()))
    return acc + ABERTURAS.length * fechosValidos.length
  }, 0)
  return total + combosTema
}, 0)

export function conselhoAleatorio(): ConselhoGaldino {
  const tema = TEMAS[Math.floor(Math.random() * TEMAS.length)]
  const frase = tema.frases[Math.floor(Math.random() * tema.frases.length)]
  const abertura = ABERTURAS[Math.floor(Math.random() * ABERTURAS.length)]
  const fechosValidos = tema.fechos.filter((f) => !f || !frase.includes(f.trim()))
  const fecho = fechosValidos[Math.floor(Math.random() * fechosValidos.length)]
  return { tema: tema.tema, frase: abertura + frase + fecho }
}
