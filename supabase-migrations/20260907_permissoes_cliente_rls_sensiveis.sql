-- Time & Permissões no painel do CLIENTE — bloqueio real das seções sensíveis.
-- Depende de 20260907_permissoes_cliente_rpcs.sql (pode_secao_cliente).
--
-- Esconder a aba do menu é cosmético: o anon key e o devtools continuam
-- alcançando a tabela. Estas 17 policies são o que de fato impede o acesso.
-- Mesma ideia do `sensivel` no RBAC do admin (20260720_rbac_rls_sensiveis.sql).
--
-- Duas convenções seguidas em TODAS elas:
--
--  1. `(select public.pode_secao_cliente('x'))` — o wrapper em subquery vira
--     InitPlan e é avaliado UMA vez por statement. Sem ele, a função STABLE pode
--     ser reavaliada por linha (reunioes_mentoria_new tem 1.177).
--
--  2. O ramo do admin fica IDÊNTICO ao que já estava. Só o ramo do cliente
--     ganha o `and`. Note que umas usam is_admin() e outras um EXISTS em
--     `mentores` escrito à mão — preservados como estavam, para o rollback ser
--     literal e para não mudar o comportamento de quem não é cliente.
--
-- Cuidado com o TIPO: em reunioes_blackcrm e reuniao_anexos a coluna id_cliente
-- é TEXT, e o predicado é (meu_id_cliente())::text. Copiar a versão uuid nessas
-- duas quebraria a policy.

begin;

-- ── indicadores → cliente_indicadores_mensais ────────────────────────────────
alter policy indicadores_self_select on public.cliente_indicadores_mensais
  using (
    (meu_id_cliente() = id_cliente and (select public.pode_secao_cliente('indicadores')))
    or (exists (select 1 from mentores where mentores.email = (auth.jwt() ->> 'email')))
  );
alter policy indicadores_self_write on public.cliente_indicadores_mensais
  using (
    (meu_id_cliente() = id_cliente and (select public.pode_secao_cliente('indicadores')))
    or (exists (select 1 from mentores where mentores.email = (auth.jwt() ->> 'email')))
  )
  with check (
    (meu_id_cliente() = id_cliente and (select public.pode_secao_cliente('indicadores')))
    or (exists (select 1 from mentores where mentores.email = (auth.jwt() ->> 'email')))
  );

-- ── mapeamento → metas / produtos / canais / objetivos ───────────────────────
-- As três primeiras eram FOR ALL com with_check VAZIO: para INSERT o Postgres
-- não verificava nada, ou seja, qualquer cliente autenticado inseria produto,
-- canal ou meta em QUALQUER empresa. Bug pré-existente; preenchido aqui.
alter policy "Clients can CRUD their own goals" on public.cliente_metas
  using ((meu_id_cliente() = id_cliente and (select public.pode_secao_cliente('mapeamento'))) or is_admin())
  with check ((meu_id_cliente() = id_cliente and (select public.pode_secao_cliente('mapeamento'))) or is_admin());

alter policy "Clients can CRUD their own products" on public.cliente_produtos
  using ((meu_id_cliente() = id_cliente and (select public.pode_secao_cliente('mapeamento'))) or is_admin())
  with check ((meu_id_cliente() = id_cliente and (select public.pode_secao_cliente('mapeamento'))) or is_admin());

alter policy "Clients can CRUD their own channels" on public.cliente_canais
  using ((meu_id_cliente() = id_cliente and (select public.pode_secao_cliente('mapeamento'))) or is_admin())
  with check ((meu_id_cliente() = id_cliente and (select public.pode_secao_cliente('mapeamento'))) or is_admin());

alter policy cliente_objetivos_self_select on public.cliente_objetivos_programa
  using (
    (meu_id_cliente() = id_cliente and (select public.pode_secao_cliente('mapeamento')))
    or (exists (select 1 from mentores where mentores.email = (auth.jwt() ->> 'email')))
  );
alter policy cliente_objetivos_self_write on public.cliente_objetivos_programa
  using (
    (meu_id_cliente() = id_cliente and (select public.pode_secao_cliente('mapeamento')))
    or (exists (select 1 from mentores where mentores.email = (auth.jwt() ->> 'email')))
  )
  with check (
    (meu_id_cliente() = id_cliente and (select public.pode_secao_cliente('mapeamento')))
    or (exists (select 1 from mentores where mentores.email = (auth.jwt() ->> 'email')))
  );

-- ── reunioes → reunioes_mentoria_new + reuniao_anexos ────────────────────────
-- Transcrição integral de consultoria. É o item nº 1 da lista: o dono fala de
-- sócio, demissão e dívida nessas reuniões.
alter policy "Clients can read their own meetings" on public.reunioes_mentoria_new
  using ((meu_id_cliente() = id_cliente and (select public.pode_secao_cliente('reunioes'))) or is_admin());
alter policy reunioes_mentoria_new_insert on public.reunioes_mentoria_new
  with check ((meu_id_cliente() = id_cliente and (select public.pode_secao_cliente('reunioes'))) or is_admin());
alter policy reunioes_mentoria_new_update on public.reunioes_mentoria_new
  using ((meu_id_cliente() = id_cliente and (select public.pode_secao_cliente('reunioes'))) or is_admin())
  with check ((meu_id_cliente() = id_cliente and (select public.pode_secao_cliente('reunioes'))) or is_admin());
alter policy reunioes_mentoria_new_delete on public.reunioes_mentoria_new
  using ((meu_id_cliente() = id_cliente and (select public.pode_secao_cliente('reunioes'))) or is_admin());

-- id_cliente é TEXT aqui.
alter policy reuniao_anexos_select on public.reuniao_anexos
  using (((meu_id_cliente())::text = id_cliente and (select public.pode_secao_cliente('reunioes'))) or is_admin());
alter policy reuniao_anexos_insert on public.reuniao_anexos
  with check (
    ((((meu_id_cliente())::text = id_cliente and (select public.pode_secao_cliente('reunioes'))) or is_admin())
     and (criado_por = auth.uid()))
  );
-- reuniao_anexos_delete não muda: já é por pessoa (criado_por = auth.uid()).

-- ── reunioes-galdino ─────────────────────────────────────────────────────────
alter policy reunioes_galdino_select on public.reunioes_galdino
  using ((meu_id_cliente() = id_cliente and (select public.pode_secao_cliente('reunioes-galdino'))) or is_admin());
alter policy reunioes_galdino_modify on public.reunioes_galdino
  using ((meu_id_cliente() = id_cliente and (select public.pode_secao_cliente('reunioes-galdino'))) or is_admin())
  with check ((meu_id_cliente() = id_cliente and (select public.pode_secao_cliente('reunioes-galdino'))) or is_admin());

-- ── reunioes-blackcrm (id_cliente TEXT) ──────────────────────────────────────
alter policy reunioes_blackcrm_select on public.reunioes_blackcrm
  using (((meu_id_cliente())::text = id_cliente and (select public.pode_secao_cliente('reunioes-blackcrm'))) or is_admin());
alter policy reunioes_blackcrm_modify on public.reunioes_blackcrm
  using (((meu_id_cliente())::text = id_cliente and (select public.pode_secao_cliente('reunioes-blackcrm'))) or is_admin())
  with check (((meu_id_cliente())::text = id_cliente and (select public.pode_secao_cliente('reunioes-blackcrm'))) or is_admin());

-- ── balanco → metodo_economias ───────────────────────────────────────────────
alter policy metodo_economias_rw on public.metodo_economias
  using ((meu_id_cliente() = id_cliente and (select public.pode_secao_cliente('balanco'))) or is_admin())
  with check ((meu_id_cliente() = id_cliente and (select public.pode_secao_cliente('balanco'))) or is_admin());

-- ── informacoes-empresa ──────────────────────────────────────────────────────
alter policy self_or_admin_select on public.cliente_informacoes_empresa
  using (
    (meu_id_cliente() = id_cliente and (select public.pode_secao_cliente('informacoes-empresa')))
    or (exists (select 1 from mentores m where m.email = (auth.jwt() ->> 'email')))
  );
alter policy self_or_admin_write on public.cliente_informacoes_empresa
  using (
    (meu_id_cliente() = id_cliente and (select public.pode_secao_cliente('informacoes-empresa')))
    or (exists (select 1 from mentores m where m.email = (auth.jwt() ->> 'email')))
  )
  with check (
    (meu_id_cliente() = id_cliente and (select public.pode_secao_cliente('informacoes-empresa')))
    or (exists (select 1 from mentores m where m.email = (auth.jwt() ->> 'email')))
  );

-- ── meu-time → cliente_colaboradores (nome, cargo, whatsapp, e-mail de terceiros)
-- A policy admin_rw da mesma tabela continua intacta e é permissiva (OR), então
-- o time da PMC segue lendo tudo.
alter policy owner_rw on public.cliente_colaboradores
  using (id_cliente = meu_id_cliente() and (select public.pode_secao_cliente('meu-time')))
  with check (id_cliente = meu_id_cliente() and (select public.pode_secao_cliente('meu-time')));

commit;
