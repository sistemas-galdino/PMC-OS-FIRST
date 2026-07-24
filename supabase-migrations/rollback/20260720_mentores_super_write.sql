-- ROLLBACK de 20260720_mentores_super_write.sql
drop policy if exists mentores_super_modify on public.mentores;
create policy mentores_admin_modify on public.mentores
  for all to authenticated using (is_admin()) with check (is_admin());
