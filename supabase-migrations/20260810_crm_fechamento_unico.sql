-- CRM — torna a trava de fechamento de ciclo impossível de burlar.
--
-- A criação automática da atividade de fechamento (garantirAtividadesFechamentoCiclo)
-- protegia contra duplicidade lendo a tabela crm_fechamento_ciclo antes de criar.
-- Isso é uma verificação-e-depois-ação: duas execuções concorrentes (duas abas,
-- duas CSs abrindo a aba de Alertas ao mesmo tempo, ou o próprio efeito
-- reexecutando quando a query é invalidada) leem o mesmo estado vazio e ambas
-- criam. Foi o que aconteceu no DEV: toda atividade de fechamento nasceu em
-- duplicata.
--
-- A trava correta é do banco. Duas camadas:
--   1. o índice único abaixo, que rejeita a segunda atividade de checkpoint
--      para o mesmo cliente + trimestre;
--   2. no código, reservar a vaga em crm_fechamento_ciclo (PK id_cliente+trimestre)
--      ANTES de criar a atividade, e só criar se a reserva foi aceita.

-- Remove as duplicatas já criadas, preservando uma de cada grupo.
-- O desempate é por (created_at, id): as duplicatas nasceram no mesmo instante,
-- então created_at sozinho não separa.
DELETE FROM public.cliente_atividades
WHERE id IN (
  SELECT id FROM (
    SELECT id, row_number() OVER (
             PARTITION BY id_cliente, origem_label
             ORDER BY created_at, id
           ) AS n
    FROM public.cliente_atividades
    WHERE origem = 'checkpoint_ciclo' AND id_cliente IS NOT NULL
  ) t WHERE t.n > 1
);

CREATE UNIQUE INDEX IF NOT EXISTS crm_atividade_checkpoint_unica
  ON public.cliente_atividades (id_cliente, origem_label)
  WHERE origem = 'checkpoint_ciclo' AND id_cliente IS NOT NULL;

COMMENT ON INDEX public.crm_atividade_checkpoint_unica IS
  'Uma atividade de checkpoint de ciclo por cliente + rótulo (T1..T4). Impede a duplicação que a verificação em código não conseguia evitar sob concorrência.';
