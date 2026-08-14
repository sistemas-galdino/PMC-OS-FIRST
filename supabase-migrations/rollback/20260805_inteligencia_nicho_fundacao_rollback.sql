-- Rollback da Inteligência de Nicho (Ondas 1 e 2).
-- ATENÇÃO: derruba o catálogo de assinaturas e o agregado publicado.
-- A classificação dos gargalos das empresas (assinatura_id) também some, mas
-- o gargalo em si permanece — nada do que o cliente escreveu é perdido.

select cron.unschedule('atualizar-inteligencia-nicho')
  where exists (select 1 from cron.job where jobname = 'atualizar-inteligencia-nicho');
select cron.unschedule('recomputar-gargalos-nicho')
  where exists (select 1 from cron.job where jobname = 'recomputar-gargalos-nicho');

drop function if exists registrar_assinaturas(jsonb, text);
drop function if exists republicar_inteligencia_nicho();
drop function if exists atualizar_inteligencia_nicho();
drop function if exists publicar_referencias_nicho();
drop function if exists recomputar_gargalos_nicho(int, int);
drop function if exists nicho_do_cliente(uuid);
drop function if exists nicho_canonico(text);

alter table metodo_gargalos
  drop column if exists assinatura_id,
  drop column if exists sugerido_de;

drop table if exists gargalo_nicho_stats;
drop table if exists gargalo_sugestao_descartada;
drop table if exists gargalos_assinaturas;
drop table if exists nicho_depara;
drop table if exists nichos_padrao;

delete from secoes_catalogo where chave = 'inteligencia-nicho';
