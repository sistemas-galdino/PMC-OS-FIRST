-- Seed dos feriados nacionais BR (2026 e 2027).
-- Espelha web/src/lib/feriados-br.ts. ON CONFLICT (data) DO NOTHING
-- mantém a migration idempotente; o botão "Importar" na UI segue
-- funcionando pra anos posteriores ou pra recriar entradas deletadas.

INSERT INTO public.feriados (data, nome, tipo) VALUES
  ('2026-01-01', 'Confraternização Universal', 'nacional'),
  ('2026-02-16', 'Carnaval', 'nacional'),
  ('2026-02-17', 'Carnaval', 'nacional'),
  ('2026-04-03', 'Sexta-Feira Santa', 'nacional'),
  ('2026-04-21', 'Tiradentes', 'nacional'),
  ('2026-05-01', 'Dia do Trabalho', 'nacional'),
  ('2026-06-04', 'Corpus Christi', 'nacional'),
  ('2026-09-07', 'Independência do Brasil', 'nacional'),
  ('2026-10-12', 'Nossa Senhora Aparecida', 'nacional'),
  ('2026-11-02', 'Finados', 'nacional'),
  ('2026-11-15', 'Proclamação da República', 'nacional'),
  ('2026-11-20', 'Consciência Negra', 'nacional'),
  ('2026-12-25', 'Natal', 'nacional'),
  ('2027-01-01', 'Confraternização Universal', 'nacional'),
  ('2027-02-08', 'Carnaval', 'nacional'),
  ('2027-02-09', 'Carnaval', 'nacional'),
  ('2027-03-26', 'Sexta-Feira Santa', 'nacional'),
  ('2027-04-21', 'Tiradentes', 'nacional'),
  ('2027-05-01', 'Dia do Trabalho', 'nacional'),
  ('2027-05-27', 'Corpus Christi', 'nacional'),
  ('2027-09-07', 'Independência do Brasil', 'nacional'),
  ('2027-10-12', 'Nossa Senhora Aparecida', 'nacional'),
  ('2027-11-02', 'Finados', 'nacional'),
  ('2027-11-15', 'Proclamação da República', 'nacional'),
  ('2027-11-20', 'Consciência Negra', 'nacional'),
  ('2027-12-25', 'Natal', 'nacional')
ON CONFLICT (data) DO NOTHING;
