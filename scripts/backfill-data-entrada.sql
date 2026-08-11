-- Backfill de clientes_entrada_new.data (data de entrada / início do ciclo).
--
-- Por que existe: o CS Manager conta o ciclo a partir da data de entrada. Em
-- PROD, 104 clientes "Ativo no Programa" estão sem essa data — sem ela a carteira
-- inteira aparece como "Sem data de entrada" e nenhum checkpoint é calculado.
--
-- É DADO, não esquema: por isso vive em scripts/ e não em supabase-migrations/.
-- Leia a seção 1 (conferência) antes de rodar a seção 2 (escrita).
--
-- Reversível: toda linha escrita fica com data_backfilled = true.
-- Para desfazer: scripts/backfill-data-entrada-desfazer.sql
--
-- Rodar DEPOIS das migrations 20260810_crm_* (a coluna data_backfilled vem de
-- 20260810_crm_clientes_colunas.sql).

-- ─────────────────────────────────────────────────────────────────────────────
-- Regra
--
-- data = a PRIMEIRA reunião JÁ REALIZADA do cliente, olhando as três origens
-- (Galdino, consultor/mentoria, BlackCRM) e pegando a MENOR data entre elas.
--
-- Duas decisões que os números do PROD forçaram (medidas em 10/08/2026):
--
--   a) Menor data entre as origens, e não "Galdino primeiro". Em 34 dos 96
--      clientes deriváveis existe reunião de consultor ANTES da primeira do
--      Galdino — até 77 dias antes. Preferir o Galdino daria uma data de
--      entrada mais tarde que a real e encolheria o ciclo em silêncio.
--
--   b) Só reunião com data <= hoje. 11 clientes têm a primeira reunião do
--      Galdino ainda no futuro; usá-la geraria data de entrada futura, ou seja,
--      ciclo com idade negativa. Quatro deles só têm reunião futura e por isso
--      continuam SEM data — ainda não começaram.
--
-- Quem fica de fora, de propósito:
--   · Clientes sem nenhuma reunião realizada (8). Sem data de entrada a tela já
--     sabe dizer "Sem data de entrada"; usar created_at como substituto seria
--     inventar dado (created_at é a data da importação da base, não da entrada).
--   · Cancelados, desistências de compra, pendentes de onboarding e congelados:
--     não têm relógio de ciclo rodando.
--
-- Limite honesto da regra: a data derivada é a primeira EVIDÊNCIA de atividade,
-- não a data de entrada de fato. Se o cliente entrou em março e só teve a
-- primeira reunião em maio, o ciclo dele vai parecer dois meses mais novo. Por
-- isso a marca data_backfilled existe: dá para listar essas linhas e corrigir à
-- mão quando a CS souber a data real.
--
-- Testado no DEV em 10/08/2026: round-trip (zerar a data de 8 clientes reais do
-- seed, rodar, conferir e desfazer) preencheu 8 de 8 e marcou todas.
-- ─────────────────────────────────────────────────────────────────────────────

-- A fonte da data, usada pela conferência e pela escrita.
CREATE OR REPLACE VIEW pg_temp.backfill_data_entrada AS
WITH alvo AS (
  SELECT id_cliente
    FROM public.clientes_entrada_new
   WHERE data IS NULL
     AND status_atual = 'Ativo no Programa'
),
cand AS (
  SELECT a.id_cliente, 'galdino'::text AS origem, min(g.data_reuniao) AS d
    FROM alvo a
    JOIN public.reunioes_galdino g
      ON g.id_cliente = a.id_cliente AND g.data_reuniao <= current_date
   GROUP BY 1

  UNION ALL
  SELECT a.id_cliente, 'consultor', min(m.data_reuniao)
    FROM alvo a
    JOIN public.reunioes_mentoria_new m
      ON m.id_cliente = a.id_cliente AND m.data_reuniao <= current_date
   GROUP BY 1

  UNION ALL
  -- reunioes_blackcrm.data_reuniao é text e pode ter lixo: o regex descarta o
  -- que não for AAAA-MM-DD em vez de estourar o cast.
  SELECT a.id_cliente, 'blackcrm', min(b.data_reuniao::date)
    FROM alvo a
    JOIN public.reunioes_blackcrm b
      ON b.id_cliente = a.id_cliente::text
   WHERE b.data_reuniao ~ '^\d{4}-\d{2}-\d{2}$'
     AND b.data_reuniao::date <= current_date
   GROUP BY 1
)
SELECT DISTINCT ON (id_cliente)
       id_cliente, d AS data_derivada, origem
  FROM cand
 WHERE d IS NOT NULL
 ORDER BY id_cliente, d, origem;

-- ─────────────────────────────────────────────────────────────────────────────
-- 1. CONFERÊNCIA (só leitura — rode e leia antes da seção 2)
-- ─────────────────────────────────────────────────────────────────────────────

-- 1.1 Quantos entram, quantos ficam de fora.
SELECT
  (SELECT count(*) FROM public.clientes_entrada_new
    WHERE data IS NULL AND status_atual = 'Ativo no Programa')  AS ativos_sem_data,
  (SELECT count(*) FROM pg_temp.backfill_data_entrada)          AS vao_receber_data,
  (SELECT count(*) FROM public.clientes_entrada_new c
    WHERE c.data IS NULL AND c.status_atual = 'Ativo no Programa'
      AND NOT EXISTS (SELECT 1 FROM pg_temp.backfill_data_entrada b
                       WHERE b.id_cliente = c.id_cliente))      AS continuam_sem_data;

-- 1.2 Distribuição por trimestre. Pico absurdo num trimestre só = a regra pegou
--     reunião errada; nesse caso NÃO rode a seção 2.
SELECT to_char(data_derivada, 'YYYY"-T"Q') AS trimestre, origem, count(*)
  FROM pg_temp.backfill_data_entrada
 GROUP BY 1, 2 ORDER BY 1, 2;

-- 1.3 Linha a linha, para o olho humano.
SELECT c.codigo_cliente, c.nome_empresa_formatado, c.sc,
       b.data_derivada, b.origem, c.created_at::date AS cadastrado_em
  FROM pg_temp.backfill_data_entrada b
  JOIN public.clientes_entrada_new c USING (id_cliente)
 ORDER BY b.data_derivada;

-- 1.4 Quem continua sem data e por quê.
SELECT c.codigo_cliente, c.nome_empresa_formatado, c.sc
  FROM public.clientes_entrada_new c
 WHERE c.data IS NULL AND c.status_atual = 'Ativo no Programa'
   AND NOT EXISTS (SELECT 1 FROM pg_temp.backfill_data_entrada b
                    WHERE b.id_cliente = c.id_cliente)
 ORDER BY c.codigo_cliente;

-- ─────────────────────────────────────────────────────────────────────────────
-- 2. ESCRITA
-- ─────────────────────────────────────────────────────────────────────────────

BEGIN;

UPDATE public.clientes_entrada_new c
   SET data = b.data_derivada,
       data_backfilled = true
  FROM pg_temp.backfill_data_entrada b
 WHERE b.id_cliente = c.id_cliente
   -- Reafirma o alvo: se alguém preencheu a data entre a conferência e agora,
   -- a mão humana ganha do backfill.
   AND c.data IS NULL
   AND c.status_atual = 'Ativo no Programa';

-- Confere o efeito ANTES do commit. Esperado: igual ao 1.1 "vao_receber_data".
SELECT count(*) AS gravados
  FROM public.clientes_entrada_new WHERE data_backfilled;

COMMIT;
