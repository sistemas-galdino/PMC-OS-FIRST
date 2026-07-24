-- 20260720_mentores_super_write.sql
-- Restringe ESCRITA na tabela `mentores` (papel/membros) ao Super Admin.
--
-- Antes: `mentores_admin_modify` = is_admin() para ALL — qualquer membro do time
-- podia inserir/alterar/apagar em mentores, inclusive se AUTO-PROMOVER a super_admin
-- (escalonamento de privilégio). Agora só super_admin escreve; todo admin ainda LÊ.
--
-- A edge function `provisionar-login` cria membros via service_role (ignora RLS),
-- então adicionar membro (admin/super) segue funcionando; só a alteração/remoção
-- direta passa a exigir super_admin.

drop policy if exists mentores_admin_modify on public.mentores;

create policy mentores_super_modify on public.mentores
  for all to authenticated
  using (is_super_admin())
  with check (is_super_admin());
-- (mentores_admin_select permanece: SELECT para todo is_admin())
