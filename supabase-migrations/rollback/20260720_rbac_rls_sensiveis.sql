-- ROLLBACK de 20260720_rbac_rls_sensiveis.sql — restaura RLS/guards por is_admin().
drop policy if exists canais_vendas_secao on public.canais_vendas_metas;
create policy canais_vendas_admin_all on public.canais_vendas_metas for all to authenticated
  using (is_admin()) with check (is_admin());

drop policy if exists download_logs_secao on public.download_logs;
create policy download_logs_admin_read on public.download_logs for select to authenticated
  using (is_admin());

-- radar_renovacao: só troca o guard de volta para is_admin() (recria via migration
-- principal se precisar do corpo; aqui basta reabrir o acesso ao time).
create or replace function public.radar_renovacao_guard_note() returns void language sql as $$ select 1 $$;
-- Nota: para reverter o corpo/guard das funções, reaplicar a migration anterior
-- (fix_ambiguidade para radar_renovacao; client_access_overview original).
drop function if exists public.radar_renovacao_guard_note();
