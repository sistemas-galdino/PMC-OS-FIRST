-- Correção pontual: login legado que é a empresa mas não tem papel 'dono'.
--
-- O backfill de 20260907_permissoes_cliente_fundacao.sql promoveu a 'dono' os
-- self-links marcados 'colaborador', mas preservou de propósito quem estava
-- como 'guardiao' — alguém escolheu isso para a pessoa cair em /meu-dia.
--
-- Só que esse login É a empresa (auth_user_id = id_cliente). Como guardião ele
-- perderia acesso ao próprio Balanço, Indicadores, Mapeamento e Informações da
-- Empresa. A preferência de tela de entrada não pode custar o acesso ao próprio
-- dado.
--
-- Em vez de promover a 'dono' (o que mudaria a home dele sem avisar), damos as
-- seções por override: ele mantém /meu-dia e enxerga tudo. É exatamente para
-- isto que o mecanismo de override existe.
--
-- No PROD em 2026-09-07 isto atinge 1 login: HS Automação Industrial (cód. 300).

begin;

insert into public.empresa_usuario_secao
  (auth_user_id, id_cliente, secao_chave, permitir, atualizado_por)
select eu.auth_user_id, eu.id_cliente, s.chave, true, null
  from public.empresa_usuarios eu
  join public.papeis_empresa p on p.chave = eu.papel
 cross join public.secoes_cliente_catalogo s
 where eu.auth_user_id = eu.id_cliente     -- o login É a empresa
   and p.is_full is false                  -- mas não tem papel de acesso total
   and s.chave <> 'acessos-empresa'        -- a aba de gestão segue exclusiva do dono
on conflict (auth_user_id, id_cliente, secao_chave)
  do update set permitir = true, atualizado_em = now();

commit;
