-- Conferência do retrato de 17/08/2026 — SÓ LEITURA, não escreve nada.
--
-- Use para comparar o estado atual do PROD com o retrato guardado em
-- scripts/backup/20260817-datas-cliente.sql, antes ou depois da unificação
-- do CRM com o perfil do cliente.

-- 1) Os números do dia do retrato. Se algum destes mudar, foi edição de gente
--    (ou bug) — vale entender qual antes de restaurar qualquer coisa.
--
--    Esperado em 17/08/2026:
--    clientes=305 | sem_data_legado=145 | ativos_sem_data_legado=106
--    ativos_sem_data_unificado=25 | info_linhas=153 | info_com_data=148
--    destrava=81 | divergentes=50 | data_entrada_no_futuro=11
SELECT
  (SELECT count(*) FROM clientes_entrada_new)                                  AS clientes,
  (SELECT count(*) FROM clientes_entrada_new WHERE data IS NULL)               AS sem_data_legado,
  (SELECT count(*) FROM clientes_entrada_new
    WHERE data IS NULL AND status_atual = 'Ativo no Programa')                 AS ativos_sem_data_legado,
  (SELECT count(*) FROM clientes_entrada_new c
     LEFT JOIN cliente_informacoes_empresa i USING (id_cliente)
    WHERE coalesce(i.data_entrada, c.data) IS NULL
      AND c.status_atual = 'Ativo no Programa')                                AS ativos_sem_data_unificado,
  (SELECT count(*) FROM cliente_informacoes_empresa)                           AS info_linhas,
  (SELECT count(*) FROM cliente_informacoes_empresa
    WHERE data_entrada IS NOT NULL)                                            AS info_com_data,
  (SELECT count(*) FROM clientes_entrada_new c
     JOIN cliente_informacoes_empresa i USING (id_cliente)
    WHERE c.data IS NULL AND i.data_entrada IS NOT NULL
      AND c.status_atual = 'Ativo no Programa')                                AS destrava,
  (SELECT count(*) FROM clientes_entrada_new c
     JOIN cliente_informacoes_empresa i USING (id_cliente)
    WHERE c.data IS NOT NULL AND i.data_entrada IS NOT NULL
      AND c.data <> i.data_entrada)                                            AS divergentes,
  (SELECT count(*) FROM cliente_informacoes_empresa
    WHERE data_entrada > current_date)                                         AS data_entrada_no_futuro;

-- 2) Impressão digital do estado atual das três colunas do retrato.
--    Em 17/08/2026 era: 66418d89040cdafcd59ba57a0e80f7a1
--    Igual = ninguém mexeu em data nenhuma desde o retrato.
WITH r AS (
  SELECT c.id_cliente::text uid,
         coalesce(c.data::text, 'NULL') data,
         coalesce(i.data_entrada::text, 'NULL') de,
         coalesce(i.total_galdino::text, 'NULL') tg
    FROM clientes_entrada_new c
    LEFT JOIN cliente_informacoes_empresa i USING (id_cliente)
)
SELECT count(*) AS linhas,
       md5(string_agg(uid||','||data||','||de||','||tg, '|'
                      ORDER BY uid||','||data||','||de||','||tg)) AS impressao_digital
  FROM r;

-- 3) As 11 datas de entrada no futuro. Provável erro de ano na digitação
--    (data de entrada no futuro = ciclo com idade negativa). Conferir com a CS
--    responsável antes de corrigir — não dá para adivinhar o ano certo.
SELECT c.codigo_cliente, c.nome_empresa_formatado, c.sc,
       i.data_entrada AS data_no_perfil, c.data AS data_no_cadastro
  FROM cliente_informacoes_empresa i
  JOIN clientes_entrada_new c USING (id_cliente)
 WHERE i.data_entrada > current_date
 ORDER BY i.data_entrada;

-- 4) Os clientes com as duas datas preenchidas e diferentes. A unificação faz
--    a do perfil valer (é a que a CS mantém), e a tela mostra a do cadastro ao
--    lado quando divergem, para a correção ser decisão de gente.
SELECT c.codigo_cliente, c.nome_empresa_formatado, c.sc,
       i.data_entrada AS perfil, c.data AS cadastro,
       (i.data_entrada - c.data) AS dias_de_diferenca
  FROM clientes_entrada_new c
  JOIN cliente_informacoes_empresa i USING (id_cliente)
 WHERE c.data IS NOT NULL AND i.data_entrada IS NOT NULL AND c.data <> i.data_entrada
 ORDER BY abs(i.data_entrada - c.data) DESC;
