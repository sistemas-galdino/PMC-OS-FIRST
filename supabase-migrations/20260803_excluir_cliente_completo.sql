-- Exclusão completa de cliente (admin) + fim da race condition de IDs manuais.
--
-- Hoje a exclusão pelo admin (web/src/pages/clientes.tsx) é um DELETE raso só em
-- clientes_entrada_new — deixa órfãos o login (auth.users), clientes_formulario
-- e ~dezenas de tabelas cliente_*/metodo_* sem FK (padrão deliberado do projeto).
-- Isso trava o e-mail (novo cadastro esbarra em "usuário já existe") e, em
-- retentativas, colide em PK/unique porque invite-client calcula os próximos IDs
-- via SELECT MAX()+1 manual.

-- 1) Sincroniza a sequence de id_entrada, que ficou pra trás por causa dos
--    inserts manuais em invite-client (confirmado: max=455, sequence em 377).
select setval('public.clientes_entrada_new_id_entrada_seq',
  (select coalesce(max(id_entrada), 0) from public.clientes_entrada_new));

-- 2) Sequence dedicada de codigo_cliente, pra parar de calcular via MAX()+1
--    manual (causa raiz da race condition / erro de chave duplicada).
create sequence if not exists public.codigo_cliente_seq;
select setval('public.codigo_cliente_seq',
  (select coalesce(max(codigo_cliente), 0) from public.clientes_formulario));

create or replace function public.proximo_codigo_cliente()
returns int
language sql
security definer
set search_path = public
as $$
  select nextval('public.codigo_cliente_seq')::int;
$$;
revoke all on function public.proximo_codigo_cliente() from public, anon, authenticated;
grant execute on function public.proximo_codigo_cliente() to service_role;

-- 3) Exclusão completa de cliente: varre TODAS as tabelas públicas com coluna
--    id_cliente (via information_schema, não uma lista fixa — o padrão
--    "cliente_*/metodo_* sem FK" é deliberado no projeto e cresce a cada
--    feature nova) e apaga tudo. Só chamada pela edge function excluir-cliente
--    (service_role); não é exposta ao client direto.
create or replace function public.admin_excluir_cliente(p_id_entrada bigint)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_id_cliente uuid;
  v_tabela text;
begin
  select id_cliente into v_id_cliente
  from clientes_entrada_new where id_entrada = p_id_entrada;

  if v_id_cliente is null then
    raise exception 'Cliente não encontrado (id_entrada %)', p_id_entrada;
  end if;

  -- id_cliente::text nos dois lados: algumas tabelas legadas (ex: reunioes_blackcrm)
  -- guardam id_cliente como text em vez de uuid. Filtra só BASE TABLE, porque
  -- information_schema.columns também lista views (ex: agendamentos_central),
  -- que não aceitam DELETE direto.
  for v_tabela in
    select c.table_name from information_schema.columns c
    join information_schema.tables t
      on t.table_schema = c.table_schema and t.table_name = c.table_name and t.table_type = 'BASE TABLE'
    where c.table_schema = 'public' and c.column_name = 'id_cliente'
      and c.table_name not in ('clientes_entrada_new', 'clientes_formulario')
  loop
    execute format('delete from public.%I where id_cliente::text = $1', v_tabela) using v_id_cliente::text;
  end loop;

  -- clientes_formulario cascateia cliente_metas/cliente_onboarding/cliente_canais/
  -- cliente_empresas/cliente_produtos; clientes_entrada_new cascateia cs_acompanhamento.
  delete from clientes_formulario where id_cliente = v_id_cliente;
  delete from clientes_entrada_new where id_entrada = p_id_entrada;

  return v_id_cliente;
end;
$$;
revoke all on function public.admin_excluir_cliente(bigint) from public, anon, authenticated;
grant execute on function public.admin_excluir_cliente(bigint) to service_role;
