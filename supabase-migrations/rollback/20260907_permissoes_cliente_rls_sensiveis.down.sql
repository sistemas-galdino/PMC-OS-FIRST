-- Rollback de 20260907_permissoes_cliente_rls_sensiveis.sql
-- Restaura as 17 policies exatamente como estavam no PROD em 2026-09-07
-- (lidas de pg_policies antes da mudança).
--
-- Exceção deliberada: o with_check de cliente_metas/produtos/canais NÃO volta a
-- ficar vazio. Vazio significava "INSERT sem verificação nenhuma" — qualquer
-- cliente inseria linha em qualquer empresa. Aqui ele volta a valer o mesmo
-- predicado do USING, que é o comportamento que sempre se pretendeu.

begin;

alter policy indicadores_self_select on public.cliente_indicadores_mensais
  using ((meu_id_cliente() = id_cliente) or (exists (select 1 from mentores where mentores.email = (auth.jwt() ->> 'email'))));
alter policy indicadores_self_write on public.cliente_indicadores_mensais
  using ((meu_id_cliente() = id_cliente) or (exists (select 1 from mentores where mentores.email = (auth.jwt() ->> 'email'))))
  with check ((meu_id_cliente() = id_cliente) or (exists (select 1 from mentores where mentores.email = (auth.jwt() ->> 'email'))));

alter policy "Clients can CRUD their own goals" on public.cliente_metas
  using ((meu_id_cliente() = id_cliente) or is_admin())
  with check ((meu_id_cliente() = id_cliente) or is_admin());
alter policy "Clients can CRUD their own products" on public.cliente_produtos
  using ((meu_id_cliente() = id_cliente) or is_admin())
  with check ((meu_id_cliente() = id_cliente) or is_admin());
alter policy "Clients can CRUD their own channels" on public.cliente_canais
  using ((meu_id_cliente() = id_cliente) or is_admin())
  with check ((meu_id_cliente() = id_cliente) or is_admin());

alter policy cliente_objetivos_self_select on public.cliente_objetivos_programa
  using ((meu_id_cliente() = id_cliente) or (exists (select 1 from mentores where mentores.email = (auth.jwt() ->> 'email'))));
alter policy cliente_objetivos_self_write on public.cliente_objetivos_programa
  using ((meu_id_cliente() = id_cliente) or (exists (select 1 from mentores where mentores.email = (auth.jwt() ->> 'email'))))
  with check ((meu_id_cliente() = id_cliente) or (exists (select 1 from mentores where mentores.email = (auth.jwt() ->> 'email'))));

alter policy "Clients can read their own meetings" on public.reunioes_mentoria_new
  using ((meu_id_cliente() = id_cliente) or is_admin());
alter policy reunioes_mentoria_new_insert on public.reunioes_mentoria_new
  with check ((meu_id_cliente() = id_cliente) or is_admin());
alter policy reunioes_mentoria_new_update on public.reunioes_mentoria_new
  using ((meu_id_cliente() = id_cliente) or is_admin())
  with check ((meu_id_cliente() = id_cliente) or is_admin());
alter policy reunioes_mentoria_new_delete on public.reunioes_mentoria_new
  using ((meu_id_cliente() = id_cliente) or is_admin());

alter policy reuniao_anexos_select on public.reuniao_anexos
  using (((meu_id_cliente())::text = id_cliente) or is_admin());
alter policy reuniao_anexos_insert on public.reuniao_anexos
  with check (((((meu_id_cliente())::text = id_cliente) or is_admin()) and (criado_por = auth.uid())));

alter policy reunioes_galdino_select on public.reunioes_galdino
  using ((meu_id_cliente() = id_cliente) or is_admin());
alter policy reunioes_galdino_modify on public.reunioes_galdino
  using ((meu_id_cliente() = id_cliente) or is_admin())
  with check ((meu_id_cliente() = id_cliente) or is_admin());

alter policy reunioes_blackcrm_select on public.reunioes_blackcrm
  using (((meu_id_cliente())::text = id_cliente) or is_admin());
alter policy reunioes_blackcrm_modify on public.reunioes_blackcrm
  using (((meu_id_cliente())::text = id_cliente) or is_admin())
  with check (((meu_id_cliente())::text = id_cliente) or is_admin());

alter policy metodo_economias_rw on public.metodo_economias
  using ((meu_id_cliente() = id_cliente) or is_admin())
  with check ((meu_id_cliente() = id_cliente) or is_admin());

alter policy self_or_admin_select on public.cliente_informacoes_empresa
  using ((meu_id_cliente() = id_cliente) or (exists (select 1 from mentores m where m.email = (auth.jwt() ->> 'email'))));
alter policy self_or_admin_write on public.cliente_informacoes_empresa
  using ((meu_id_cliente() = id_cliente) or (exists (select 1 from mentores m where m.email = (auth.jwt() ->> 'email'))))
  with check ((meu_id_cliente() = id_cliente) or (exists (select 1 from mentores m where m.email = (auth.jwt() ->> 'email'))));

alter policy owner_rw on public.cliente_colaboradores
  using (id_cliente = meu_id_cliente())
  with check (id_cliente = meu_id_cliente());

commit;
