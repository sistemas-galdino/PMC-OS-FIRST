// Feriados nacionais brasileiros (incluindo facultativos comumente
// observados como Carnaval e Sexta-Feira Santa).
// Páscoa e datas derivadas (Sexta-Feira Santa, Carnaval, Corpus Christi)
// variam ano a ano — por isso a lista é hardcoded por ano.
// Adicionar manualmente quando virar um novo ano.

export interface FeriadoBR {
  data: string // YYYY-MM-DD
  nome: string
}

export const FERIADOS_NACIONAIS_BR: Record<number, FeriadoBR[]> = {
  2026: [
    { data: "2026-01-01", nome: "Confraternização Universal" },
    { data: "2026-02-16", nome: "Carnaval" },
    { data: "2026-02-17", nome: "Carnaval" },
    { data: "2026-04-03", nome: "Sexta-Feira Santa" },
    { data: "2026-04-21", nome: "Tiradentes" },
    { data: "2026-05-01", nome: "Dia do Trabalho" },
    { data: "2026-06-04", nome: "Corpus Christi" },
    { data: "2026-09-07", nome: "Independência do Brasil" },
    { data: "2026-10-12", nome: "Nossa Senhora Aparecida" },
    { data: "2026-11-02", nome: "Finados" },
    { data: "2026-11-15", nome: "Proclamação da República" },
    { data: "2026-11-20", nome: "Consciência Negra" },
    { data: "2026-12-25", nome: "Natal" },
  ],
  2027: [
    { data: "2027-01-01", nome: "Confraternização Universal" },
    { data: "2027-02-08", nome: "Carnaval" },
    { data: "2027-02-09", nome: "Carnaval" },
    { data: "2027-03-26", nome: "Sexta-Feira Santa" },
    { data: "2027-04-21", nome: "Tiradentes" },
    { data: "2027-05-01", nome: "Dia do Trabalho" },
    { data: "2027-05-27", nome: "Corpus Christi" },
    { data: "2027-09-07", nome: "Independência do Brasil" },
    { data: "2027-10-12", nome: "Nossa Senhora Aparecida" },
    { data: "2027-11-02", nome: "Finados" },
    { data: "2027-11-15", nome: "Proclamação da República" },
    { data: "2027-11-20", nome: "Consciência Negra" },
    { data: "2027-12-25", nome: "Natal" },
  ],
}

export const ANOS_DISPONIVEIS = Object.keys(FERIADOS_NACIONAIS_BR)
  .map(Number)
  .sort()
