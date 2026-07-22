-- 20260722c_mentores_delete_super_only.sql
-- Exclusão de membro do time só pela edge function `remover-membro` (service_role,
-- que checa Super Admin e apaga também o login em auth.users). Bloqueia o DELETE
-- direto pelo cliente do navegador — defense-in-depth sobre a policy FOR ALL
-- (mentores_admin_modify), que hoje deixa QUALQUER admin deletar.
--
-- RESTRICTIVE + using(false) só afeta DELETE (não mexe em SELECT/INSERT/UPDATE, então
-- o trocarPapel segue funcionando) e não afeta o service_role (que ignora RLS).
drop policy if exists mentores_no_client_delete on public.mentores;
create policy mentores_no_client_delete on public.mentores
  as restrictive for delete to authenticated
  using (false);
