-- Reuniões com o Sucesso do Cliente (CS) viram uma seção própria do painel.
--
-- As reuniões de CS já existiam: o link público /atendimento grava em
-- reunioes_mentoria_new com equipe='sucesso_cliente' (20260816_central_sucesso_cliente.sql),
-- e o cron sincronizar-reunioes já enriquece. Mas toda tela do cliente filtra
-- equipe='consultor', então o cliente nunca via a reunião que fez com a CS.
--
-- Esta migration:
--   1. cria a seção 'reunioes-cs' no catálogo (aparece em Time & Permissões);
--   2. dá a seção ao template de colaborador/guardião (mesmo padrão de 'reunioes');
--   3. quem teve 'reunioes' FECHADA pelo dono também fica sem 'reunioes-cs' —
--      antes a mesma chave escondia as duas, então ninguém passa a ver o que
--      o dono decidiu esconder;
--   4. separa o RLS de reunioes_mentoria_new por equipe: consultoria pela
--      chave 'reunioes', CS pela 'reunioes-cs'.
--
-- Rollback: rollback/20260927_reunioes_cs_secao.down.sql

begin;

-- 1. Catálogo
insert into public.secoes_cliente_catalogo (chave, label, grupo, ordem, sensivel) values
  ('reunioes-cs', 'Reuniões Sucesso do Cliente', 'Acompanhamento', 435, true)
on conflict (chave) do update set
  label = excluded.label, grupo = excluded.grupo,
  ordem = excluded.ordem, sensivel = excluded.sensivel;

-- 2. Template (dono não precisa: is_full)
insert into public.papel_empresa_secoes (papel_chave, secao_chave)
select p.chave, 'reunioes-cs'
  from (values ('colaborador'), ('guardiao')) as p(chave)
on conflict do nothing;

-- 3. Espelha os overrides de 'reunioes' (negativos e positivos)
insert into public.empresa_usuario_secao
  (auth_user_id, id_cliente, secao_chave, permitir, atualizado_em, atualizado_por)
select o.auth_user_id, o.id_cliente, 'reunioes-cs', o.permitir, now(), o.atualizado_por
  from public.empresa_usuario_secao o
 where o.secao_chave = 'reunioes'
on conflict (auth_user_id, id_cliente, secao_chave) do nothing;

-- 4. RLS por equipe
alter policy "Clients can read their own meetings" on public.reunioes_mentoria_new
  using ((id_cliente in (select m from public.meus_ids_cliente() m)
          and ((equipe = 'consultor'       and (select pode_secao_cliente('reunioes')))
            or (equipe = 'sucesso_cliente' and (select pode_secao_cliente('reunioes-cs')))))
         or is_admin());

alter policy reunioes_mentoria_new_insert on public.reunioes_mentoria_new
  with check ((meu_id_cliente() = id_cliente
               and ((equipe = 'consultor'       and (select public.pode_secao_cliente('reunioes')))
                 or (equipe = 'sucesso_cliente' and (select public.pode_secao_cliente('reunioes-cs')))))
              or is_admin());

alter policy reunioes_mentoria_new_update on public.reunioes_mentoria_new
  using ((meu_id_cliente() = id_cliente
          and ((equipe = 'consultor'       and (select public.pode_secao_cliente('reunioes')))
            or (equipe = 'sucesso_cliente' and (select public.pode_secao_cliente('reunioes-cs')))))
         or is_admin())
  with check ((meu_id_cliente() = id_cliente
               and ((equipe = 'consultor'       and (select public.pode_secao_cliente('reunioes')))
                 or (equipe = 'sucesso_cliente' and (select public.pode_secao_cliente('reunioes-cs')))))
              or is_admin());

alter policy reunioes_mentoria_new_delete on public.reunioes_mentoria_new
  using ((meu_id_cliente() = id_cliente
          and ((equipe = 'consultor'       and (select public.pode_secao_cliente('reunioes')))
            or (equipe = 'sucesso_cliente' and (select public.pode_secao_cliente('reunioes-cs')))))
         or is_admin());

-- reuniao_anexos não tem equipe: basta ter uma das duas seções.
alter policy reuniao_anexos_select on public.reuniao_anexos
  using ((id_cliente in (select m::text from public.meus_ids_cliente() m)
          and ((select pode_secao_cliente('reunioes')) or (select pode_secao_cliente('reunioes-cs'))))
         or is_admin());

alter policy reuniao_anexos_insert on public.reuniao_anexos
  with check (
    ((((meu_id_cliente())::text = id_cliente
       and ((select public.pode_secao_cliente('reunioes')) or (select public.pode_secao_cliente('reunioes-cs'))))
      or is_admin())
     and (criado_por = auth.uid()))
  );

commit;
