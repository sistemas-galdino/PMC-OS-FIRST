-- Rollback de 20260927_reunioes_cs_secao.sql: volta as policies para a chave
-- única 'reunioes' e remove a seção 'reunioes-cs' (o cascade da FK limpa
-- papel_empresa_secoes e empresa_usuario_secao).

begin;

alter policy "Clients can read their own meetings" on public.reunioes_mentoria_new
  using ((id_cliente in (select m from public.meus_ids_cliente() m)
          and (select pode_secao_cliente('reunioes'))) or is_admin());
alter policy reunioes_mentoria_new_insert on public.reunioes_mentoria_new
  with check ((meu_id_cliente() = id_cliente and (select public.pode_secao_cliente('reunioes'))) or is_admin());
alter policy reunioes_mentoria_new_update on public.reunioes_mentoria_new
  using ((meu_id_cliente() = id_cliente and (select public.pode_secao_cliente('reunioes'))) or is_admin())
  with check ((meu_id_cliente() = id_cliente and (select public.pode_secao_cliente('reunioes'))) or is_admin());
alter policy reunioes_mentoria_new_delete on public.reunioes_mentoria_new
  using ((meu_id_cliente() = id_cliente and (select public.pode_secao_cliente('reunioes'))) or is_admin());

alter policy reuniao_anexos_select on public.reuniao_anexos
  using ((id_cliente in (select m::text from public.meus_ids_cliente() m)
          and (select pode_secao_cliente('reunioes'))) or is_admin());
alter policy reuniao_anexos_insert on public.reuniao_anexos
  with check (
    ((((meu_id_cliente())::text = id_cliente and (select public.pode_secao_cliente('reunioes'))) or is_admin())
     and (criado_por = auth.uid()))
  );

delete from public.papel_empresa_secoes where secao_chave = 'reunioes-cs';
delete from public.empresa_usuario_secao where secao_chave = 'reunioes-cs';
delete from public.secoes_cliente_catalogo where chave = 'reunioes-cs';

commit;
