-- Rollback da Inteligência de Nicho — Onda 2 (publicação e operação).
-- Inverso PRECISO só da Onda 2: derruba os objetos criados em
-- 20260806_inteligencia_nicho_publicacao.sql e restaura o estado da Onda 1
-- (20260805). NÃO mexe nas tabelas/assinaturas da Onda 1 — para derrubar tudo,
-- use o rollback de 20260805.
--
-- ATENÇÃO: a edge function `inteligencia-nicho` chama registrar_assinaturas e
-- republicar_inteligencia_nicho — depois deste rollback ela para de funcionar
-- até a Onda 2 ser reaplicada.

-- 1) Volta o agendamento para o job da Onda 1 (recompute puro do dado real).
select cron.unschedule('atualizar-inteligencia-nicho')
  where exists (select 1 from cron.job where jobname = 'atualizar-inteligencia-nicho');
select cron.unschedule('recomputar-gargalos-nicho')
  where exists (select 1 from cron.job where jobname = 'recomputar-gargalos-nicho');
select cron.schedule(
  'recomputar-gargalos-nicho',
  '20 9 * * *',
  $cron$ select recomputar_gargalos_nicho(); $cron$
);

-- 2) Remove as linhas de referência publicadas (a Onda 1 só tinha dado_real).
delete from gargalo_nicho_stats where origem = 'referencia';

-- 3) Derruba as funções introduzidas na Onda 2.
drop function if exists registrar_assinaturas(jsonb, text);
drop function if exists republicar_inteligencia_nicho();
drop function if exists atualizar_inteligencia_nicho();
drop function if exists publicar_referencias_nicho();

-- 4) Tira a seção de curadoria do RBAC do time.
delete from secoes_catalogo where chave = 'inteligencia-nicho';
