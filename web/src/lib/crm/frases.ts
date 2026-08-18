// Banco fixo e curado de frases exibidas no cabeçalho do "Meu Dia".
// Regras:
// - NÃO gerar por IA nem buscar em API. A maior parte das citações que
//   circula na internet está mal atribuída — preferimos um banco pequeno
//   e conferido do que um banco grande e duvidoso.
// - Para adicionar/remover frases, edite apenas este arquivo. Não é
//   necessário mexer no componente.
// - A ordem não importa: a seleção do dia é determinística por índice.

export type Frase = { texto: string; autor: string };

export const FRASES: Frase[] = [
  {
    texto:
      "Não é porque as coisas são difíceis que não ousamos; é porque não ousamos que elas são difíceis.",
    autor: "Sêneca",
  },
  { texto: "Enquanto adiamos, a vida passa.", autor: "Sêneca" },
  {
    texto:
      "Você tem poder sobre a sua mente, não sobre os acontecimentos externos. Perceba isso e encontrará força.",
    autor: "Marco Aurélio",
  },
  {
    texto: "A felicidade da sua vida depende da qualidade dos seus pensamentos.",
    autor: "Marco Aurélio",
  },
  {
    texto:
      "Não são os fatos que perturbam os homens, mas as opiniões que eles têm sobre os fatos.",
    autor: "Epicteto",
  },
  { texto: "Uma jornada de mil milhas começa com um único passo.", autor: "Lao-Tsé" },
  { texto: "Só sei que nada sei.", autor: "Sócrates" },
  { texto: "O caminho se faz caminhando.", autor: "Antonio Machado" },
  { texto: "Tudo vale a pena quando a alma não é pequena.", autor: "Fernando Pessoa" },
  { texto: "Cada um sabe a dor e a delícia de ser o que é.", autor: "Caetano Veloso" },
  {
    texto: "A vida é a arte do encontro, embora haja tanto desencontro pela vida.",
    autor: "Vinicius de Moraes",
  },
  {
    texto: "Não tenha medo da vida, tenha medo de não vivê-la.",
    autor: "Clarice Lispector",
  },
  { texto: "O mundo não é. O mundo está sendo.", autor: "Paulo Freire" },
  {
    texto:
      "Ninguém educa ninguém, ninguém educa a si mesmo. Os homens se educam entre si.",
    autor: "Paulo Freire",
  },
  {
    texto: "É melhor acender uma vela do que amaldiçoar a escuridão.",
    autor: "provérbio chinês",
  },
];

// Épocha estável usada para calcular o índice do dia.
const EPOCH_UTC = Date.UTC(2026, 0, 1); // 01/01/2026
const DAY_MS = 86_400_000;

function hashString(s: string): number {
  // djb2 — determinístico e suficiente para deslocar o índice por usuário.
  let h = 5381;
  for (let i = 0; i < s.length; i++) h = ((h << 5) + h + s.charCodeAt(i)) | 0;
  return Math.abs(h);
}

/** Índice da frase do dia para um dado usuário. */
export function fraseIndex(date: Date, userKey: string, total: number): number {
  if (total <= 0) return 0;
  const dayUtc = Date.UTC(date.getFullYear(), date.getMonth(), date.getDate());
  const dias = Math.floor((dayUtc - EPOCH_UTC) / DAY_MS);
  const offset = hashString(userKey || "anon");
  const idx = ((dias + offset) % total + total) % total;
  return idx;
}

export function fraseDoDia(date: Date, userKey: string): Frase {
  const idx = fraseIndex(date, userKey, FRASES.length);
  return FRASES[idx];
}

// Aviso apenas em desenvolvimento — nunca aparece para a CS na tela.
if (import.meta.env?.DEV && FRASES.length < 30) {
  // eslint-disable-next-line no-console
  console.warn(
    `[frases] Banco tem ${FRASES.length} frases. Recomendado: pelo menos 30 antes de produção.`,
  );
}
