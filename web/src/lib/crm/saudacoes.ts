// Banco fixo de saudações amigáveis exibidas no cabeçalho do "Meu Dia".
// Regras:
// - NÃO gerar por IA nem buscar em API.
// - Use {nome} para o primeiro nome da CS — será substituído em tempo de renderização.
// - A ordem não importa: a seleção do dia é determinística por índice.

export type Saudacao = { texto: string; emoji: string };

export const SAUDACOES: Saudacao[] = [
  { texto: "Bom dia {nome}, que o dia seja lindo", emoji: "☀️" },
  { texto: "Bom dia {nome}, espero que seu dia seja muito bom", emoji: "🌻" },
  { texto: "Bom dia {nome}, espero que o seu dia seja muito produtivo", emoji: "🚀" },
  { texto: "Bom dia {nome}, hoje é um ótimo dia para fazer acontecer", emoji: "✨" },
  { texto: "Bom dia {nome}, que seu dia seja leve e cheio de conquistas", emoji: "🌤️" },
  { texto: "Bom dia {nome}, vamos juntos transformar o dia de hoje", emoji: "💪" },
  { texto: "Bom dia {nome}, acredito no seu potencial para hoje", emoji: "🌟" },
  { texto: "Bom dia {nome}, que hoje traga boas surpresas", emoji: "🎁" },
  { texto: "Bom dia {nome}, um dia incrível começa agora", emoji: "☕" },
  { texto: "Bom dia {nome}, foco e calma para hoje", emoji: "🧘" },
  { texto: "Bom dia {nome}, você está pronta para brilhar hoje", emoji: "✨" },
  { texto: "Bom dia {nome}, que seu dia seja doce como um café da manhã", emoji: "☕" },
  { texto: "Bom dia {nome}, hoje é dia de fazer a diferença", emoji: "💫" },
  { texto: "Bom dia {nome}, energia positiva para o seu dia", emoji: "🌈" },
  { texto: "Bom dia {nome}, que cada tarefa de hoje flua com leveza", emoji: "🍃" },
  { texto: "Bom dia {nome}, o mundo precisa do seu brilho hoje", emoji: "🌞" },
  { texto: "Bom dia {nome}, que seu dia seja repleto de propósito", emoji: "🎯" },
  { texto: "Bom dia {nome}, respira fundo, hoje vai dar tudo certo", emoji: "🌬️" },
  { texto: "Bom dia {nome}, comece o dia com gratidão", emoji: "🙏" },
  { texto: "Bom dia {nome}, hoje é uma nova chance de fazer o seu melhor", emoji: "🌅" },
  { texto: "Bom dia {nome}, que seu dia seja tão especial quanto você", emoji: "💛" },
  { texto: "Bom dia {nome}, vamos com tudo que hoje promete", emoji: "🚀" },
  { texto: "Bom dia {nome}, mantenha o sorriso e a determinação", emoji: "😊" },
  { texto: "Bom dia {nome}, que hoje seja um dia de vitórias", emoji: "🏆" },
  { texto: "Bom dia {nome}, seu esforço de ontem preparou o sucesso de hoje", emoji: "📈" },
  { texto: "Bom dia {nome}, aproveite cada momento do dia", emoji: "🌼" },
  { texto: "Bom dia {nome}, que a produtividade acompanhe você hoje", emoji: "⚡" },
  { texto: "Bom dia {nome}, um dia novo, novas possibilidades", emoji: "🌱" },
  { texto: "Bom dia {nome}, confie no processo e celebre as pequenas conquistas", emoji: "🎉" },
  { texto: "Bom dia {nome}, hoje escolha ser feliz e fazer acontecer", emoji: "💥" },
  { texto: "Bom dia {nome}, que seu dia seja tranquilo e produtivo", emoji: "🕊️" },
  { texto: "Bom dia {nome}, você é capaz de transformar qualquer desafio em oportunidade", emoji: "🦋" },
  { texto: "Bom dia {nome}, que o sol de hoje ilumine seus planos", emoji: "🌞" },
  { texto: "Bom dia {nome}, comece pequeno, mas pense grande", emoji: "📌" },
  { texto: "Bom dia {nome}, hoje é dia de construir, não de esperar", emoji: "🛠️" },
  { texto: "Bom dia {nome}, sua dedicação é o que move resultados", emoji: "🧭" },
  { texto: "Bom dia {nome}, que seu dia seja cheio de boas conexões", emoji: "🤝" },
  { texto: "Bom dia {nome}, mantenha o foco, o resto a gente resolve", emoji: "💼" },
  { texto: "Bom dia {nome}, hoje escolha a ação em vez da desculpa", emoji: "✅" },
  { texto: "Bom dia {nome}, que seu dia seja produtivo e com tempo para o que importa", emoji: "⏳" },
];

// Época estável usada para calcular o índice do dia.
const EPOCH_UTC = Date.UTC(2026, 0, 1); // 01/01/2026
const DAY_MS = 86_400_000;

function hashString(s: string): number {
  let h = 5381;
  for (let i = 0; i < s.length; i++) h = ((h << 5) + h + s.charCodeAt(i)) | 0;
  return Math.abs(h);
}

/** Índice da saudação do dia para um dado usuário. */
export function saudacaoIndex(date: Date, userKey: string, total: number): number {
  if (total <= 0) return 0;
  const dayUtc = Date.UTC(date.getFullYear(), date.getMonth(), date.getDate());
  const dias = Math.floor((dayUtc - EPOCH_UTC) / DAY_MS);
  const offset = hashString(userKey || "anon");
  const idx = ((dias + offset) % total + total) % total;
  return idx;
}

/** Retorna a saudação do dia com o nome da CS aplicado. */
export function saudacaoDoDia(date: Date, userKey: string, nome: string): Saudacao & { completo: string } {
  const idx = saudacaoIndex(date, userKey, SAUDACOES.length);
  const s = SAUDACOES[idx];
  const completo = s.texto.replace("{nome}", nome.trim() || "CS");
  return { ...s, completo };
}

// Aviso apenas em desenvolvimento — nunca aparece para a CS na tela.
if (import.meta.env?.DEV && SAUDACOES.length < 30) {
  // eslint-disable-next-line no-console
  console.warn(
    `[saudacoes] Banco tem ${SAUDACOES.length} saudações. Recomendado: pelo menos 30 antes de produção.`,
  );
}
