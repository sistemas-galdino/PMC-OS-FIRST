-- Preserva o acesso de quem JÁ ESTÁ na casa.
--
-- O template do colaborador nega as seções sensíveis, e o do guardião nega as
-- quatro financeiras/cadastrais. Isso é o padrão certo para quem entrar de
-- agora em diante — mas aplicado de uma vez ao que já existe, tiraria abas de
-- 159 pessoas (95 delas ativas nos últimos 60 dias) antes de qualquer dono ter
-- a chance de abrir a tela nova e decidir. Seria uma restrição que o sistema
-- impôs, não que o dono escolheu — o oposto do que a feature promete.
--
-- Então todo vínculo que existe HOJE recebe override liberando o que ele já
-- via. O dono abre a aba, encontra a equipe como está, e vai FECHANDO o que
-- quiser. Ninguém perde nada sem alguém ter decidido.
--
-- A aba de gestão fica de fora: ela é nova, ninguém tinha antes, e é exclusiva
-- do papel dono (que já a alcança por is_full).
--
-- Para inverter e passar a valer o template restritivo para todo mundo:
--   delete from public.empresa_usuario_secao where atualizado_por is null;

begin;

insert into public.empresa_usuario_secao
  (auth_user_id, id_cliente, secao_chave, permitir, atualizado_por)
select eu.auth_user_id, eu.id_cliente, s.chave, true, null
  from public.empresa_usuarios eu
  join public.papeis_empresa p on p.chave = eu.papel
 cross join public.secoes_cliente_catalogo s
 where p.is_full is false            -- dono já vê tudo, não precisa de linha
   and s.chave <> 'acessos-empresa'
on conflict (auth_user_id, id_cliente, secao_chave) do nothing;

commit;
