-- Ajusta o padrão dos papéis do cliente: fecha pouco, deixa o resto com o dono.
--
-- O primeiro desenho (20260907_permissoes_cliente_fundacao.sql) negava ao
-- colaborador TODAS as 9 seções sensíveis. Decisão do David em 2026-09-07:
-- fechar por padrão só o que é claramente do dono, e deixar o resto por conta
-- dele — se quiser tirar mais, tira; se quiser devolver uma destas, devolve.
--
-- Fechado por padrão (4):
--   mapeamento          — preço, ticket, CAC, metas de faturamento
--   informacoes-empresa — cadastro + a análise da PMC sobre a empresa
--   indicadores         — faturamento mês a mês (alimenta o bloco
--                         "Resultados do seu negócio" na Minha Jornada)
--   reunioes-galdino    — conversa direta do dono com o Galdino
--
-- Aberto por padrão, antes fechado: balanco, meu-time, reunioes,
-- reunioes-blackcrm.
--
-- O guardião recebe o MESMO conjunto. Antes ele era mais restrito que o
-- colaborador em balanco/meu-time, o que ficaria invertido: o guardião é a
-- pessoa de mais confiança do dono na operação, não pode ver menos que um
-- colaborador qualquer.
--
-- acessos-empresa continua fora dos dois: é exclusiva do papel dono.

begin;

delete from public.papel_empresa_secoes where papel_chave in ('colaborador','guardiao');

insert into public.papel_empresa_secoes (papel_chave, secao_chave)
select p.chave, s.chave
  from (values ('colaborador'), ('guardiao')) as p(chave)
 cross join public.secoes_cliente_catalogo s
 where s.chave not in ('acessos-empresa','mapeamento','informacoes-empresa','indicadores','reunioes-galdino')
on conflict do nothing;

commit;
