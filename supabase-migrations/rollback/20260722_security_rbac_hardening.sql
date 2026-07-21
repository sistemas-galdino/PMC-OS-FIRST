-- Rollback de 20260722_security_rbac_hardening.sql

-- 1.1
drop trigger if exists trg_mentores_guard on mentores;
drop function if exists public.tg_mentores_guard();

-- 1.2
alter policy empresa_usuarios_admin_write on empresa_usuarios
  using (is_admin()) with check (is_admin());
drop trigger if exists trg_empresa_usuarios_guard on empresa_usuarios;
drop function if exists public.tg_empresa_usuarios_guard();

-- 1.3 — restaura o ramo admin original ANTES de dropar o helper
alter policy "clientes_entrada_select_self_or_admin" on clientes_entrada_new
  using ((meu_id_cliente() = id_cliente) or is_admin());
alter policy "Clients can read their own form data" on clientes_formulario
  using ((meu_id_cliente() = id_cliente) or is_admin());
alter policy "mentores_read_vitorias" on cliente_vitorias
  using (exists (select 1 from mentores where mentores.email = (auth.jwt() ->> 'email')));
alter policy "equipe_all" on cliente_vitorias
  using (exists (select 1 from mentores where mentores.email = (auth.jwt() ->> 'email')))
  with check (exists (select 1 from mentores where mentores.email = (auth.jwt() ->> 'email')));
alter policy "Onboarding select own or admin" on cliente_onboarding
  using ((meu_id_cliente() = id_cliente) or is_admin());
drop function if exists public.pode_ver_dados_cliente();

-- 1.5
grant execute on function public.registrar_download(text, text, text, text) to anon;
grant execute on function public.admin_clientes_pontos() to anon;
grant execute on function public.avaliar_top10() to public;

-- 1.6
alter function public.safe_ddmmyyyy(text) reset search_path;
