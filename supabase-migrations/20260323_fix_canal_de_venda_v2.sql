-- =====================================================
-- Fix canal_de_venda in clientes_entrada_new
-- Projeto: PMC-OS-V2
-- Fonte: .claude/organizando-oficial.csv
-- =====================================================

-- 2025 / Março
UPDATE clientes_entrada_new
SET canal_de_venda = 'IA para Negócios - Turma 01'
WHERE unidade_treinamento ILIKE '%Febracis Select%'
  AND EXTRACT(MONTH FROM data) = 3;

UPDATE clientes_entrada_new
SET canal_de_venda = 'Palestra PCE'
WHERE unidade_treinamento ILIKE '%Febracis Select%'
  AND EXTRACT(MONTH FROM data) = 8;  -- agosto: 'FEbracis Select' (case diferente)

UPDATE clientes_entrada_new
SET canal_de_venda = 'Palestra 220'
WHERE unidade_treinamento = 'Palestra 220';

UPDATE clientes_entrada_new
SET canal_de_venda = 'Palestra PCE'
WHERE unidade_treinamento = 'Palestra PCE';

UPDATE clientes_entrada_new
SET canal_de_venda = 'Fechamento por reunião Galdino'
WHERE unidade_treinamento = 'Fechamento por reunião Galdino';

-- 2025 / Maio–Junho
UPDATE clientes_entrada_new
SET canal_de_venda = 'IA para Negócios - Turma 02'
WHERE unidade_treinamento IN ('Joinville', 'Joiville');  -- corrige typo

UPDATE clientes_entrada_new
SET canal_de_venda = 'IA para Negócios - Turma 03'
WHERE unidade_treinamento = 'Palmas';

-- 2025 / Junho–Julho
UPDATE clientes_entrada_new
SET canal_de_venda = 'IA para Negócios - Turma 04'
WHERE unidade_treinamento = 'Rio de Janeiro'
  AND estado_uf = 'Rio de Janeiro';

-- 2025 / Julho
UPDATE clientes_entrada_new
SET canal_de_venda = 'IA para Negócios - Turma 05'
WHERE unidade_treinamento = 'Cuiabá';

UPDATE clientes_entrada_new
SET canal_de_venda = 'IA para Negócios - Turma 06'
WHERE unidade_treinamento = 'Itajai -GD treinamentos'
  AND EXTRACT(MONTH FROM data) = 7;

-- 2025 / Agosto
UPDATE clientes_entrada_new
SET canal_de_venda = 'IA para Negócios - Turma 07'
WHERE unidade_treinamento = 'Porto Alegre';

UPDATE clientes_entrada_new
SET canal_de_venda = 'IA para Negócios - Turma 08'
WHERE unidade_treinamento = 'Campo Grande';

UPDATE clientes_entrada_new
SET canal_de_venda = 'IA para Negócios - Turma 09'
WHERE unidade_treinamento = 'Itajai -GD treinamentos'
  AND EXTRACT(MONTH FROM data) = 8;

UPDATE clientes_entrada_new
SET canal_de_venda = 'Palestra PCM'
WHERE unidade_treinamento = 'Palestra PCM';

-- 2025 / Setembro  (Campinas = Turma 10, não Turma 12!)
UPDATE clientes_entrada_new
SET canal_de_venda = 'IA para Negócios - Turma 10'
WHERE unidade_treinamento ILIKE 'Campinas%'
  AND EXTRACT(YEAR FROM data) = 2025
  AND EXTRACT(MONTH FROM data) = 9;

UPDATE clientes_entrada_new
SET canal_de_venda = 'IA para Negócios - Turma 11'
WHERE unidade_treinamento = 'Chapecó';

-- 2025 / Outubro
UPDATE clientes_entrada_new
SET canal_de_venda = 'IA para Negócios - Turma 12'
WHERE unidade_treinamento = 'Fortaleza';

UPDATE clientes_entrada_new
SET canal_de_venda = 'IA para Negócios - Turma 13'
WHERE unidade_treinamento = 'Brasília'
  AND estado_uf = 'Brasília';

UPDATE clientes_entrada_new
SET canal_de_venda = 'IA para Negócios - Turma 14'
WHERE unidade_treinamento = 'Nitro 10 x';

UPDATE clientes_entrada_new
SET canal_de_venda = 'IA para Negócios - Turma 15'
WHERE unidade_treinamento = 'Curitiba';

UPDATE clientes_entrada_new
SET canal_de_venda = 'IA para Negócios - Turma 16'
WHERE unidade_treinamento = 'Gramado';

-- 2025 / Novembro
UPDATE clientes_entrada_new
SET canal_de_venda = 'IA para Negócios - Turma 18'
WHERE unidade_treinamento = 'Ribeirão Preto';

UPDATE clientes_entrada_new
SET canal_de_venda = 'IA para Negócios - Turma 19'
WHERE unidade_treinamento = 'São José dos Campos';

UPDATE clientes_entrada_new
SET canal_de_venda = 'IA para Negócios - Turma 20'
WHERE unidade_treinamento = 'Guarulhos';

-- 2025 / Dezembro (Campinas = Turma 21)
UPDATE clientes_entrada_new
SET canal_de_venda = 'IA para Negócios - Turma 21'
WHERE unidade_treinamento ILIKE 'Campinas%'
  AND EXTRACT(YEAR FROM data) = 2025
  AND EXTRACT(MONTH FROM data) = 12;

UPDATE clientes_entrada_new
SET canal_de_venda = 'Fechamento Closer'
WHERE unidade_treinamento = 'São Paulo'
  AND estado_uf = 'São Paulo'
  AND EXTRACT(YEAR FROM data) = 2025
  AND EXTRACT(MONTH FROM data) = 12;

-- 2026 / Janeiro
UPDATE clientes_entrada_new
SET canal_de_venda = 'IA para Negócios - Turma 23'
WHERE unidade_treinamento ILIKE 'Campinas%'
  AND EXTRACT(YEAR FROM data) = 2026;

UPDATE clientes_entrada_new
SET canal_de_venda = 'IA para Negócios - Turma 24'
WHERE unidade_treinamento = 'Brasilia'   -- sem acento (Jan 26)
  AND estado_uf = 'São Paulo';

UPDATE clientes_entrada_new
SET canal_de_venda = 'PCM JAN 26'
WHERE unidade_treinamento IN ('Holding', 'Fechamento por reunião Galdino')
  AND EXTRACT(YEAR FROM data) = 2026;
