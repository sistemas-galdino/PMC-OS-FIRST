-- Desfaz scripts/seed-crm-dev.sql. Só no DEV.
--
-- Não tenta restaurar os valores anteriores dos clientes porque não havia
-- nenhum: os 41 registros do DEV estavam com todos esses campos nulos.
-- Este script devolve exatamente esse estado.

BEGIN;

DELETE FROM cliente_atividades;
DELETE FROM crm_fechamento_ciclo;
DELETE FROM crm_alerta_marcacoes;
DELETE FROM crm_cliente_notas;
DELETE FROM crm_anotacoes_internas;
DELETE FROM crm_temperatura_historico;
DELETE FROM crm_rotina_execucoes;
DELETE FROM crm_materiais;
DELETE FROM crm_projetos;
DELETE FROM crm_gargalos;
DELETE FROM crm_manual;

UPDATE clientes_entrada_new SET
  nome_empresa = NULL, nome_empresa_formatado = NULL, nome_cliente = NULL,
  sc = NULL, status_atual = NULL, data = NULL, temperatura_cliente = NULL,
  nivel_engajamento = NULL, saude_cliente = NULL, em_risco_cancelamento = false,
  tem_guardiao_ia = NULL, guardiao_ia_nome = NULL, reuniao_galdino_status = NULL,
  reuniao_consultores_status = NULL, tem_conta_blackcrm = NULL,
  blackcrm_status_implementacao = NULL, renovacao_data = NULL,
  observacoes_cs = NULL, nicho = NULL, situacao = NULL, pausado = false;

DELETE FROM mentores WHERE email LIKE '%@dev.local';

COMMIT;
