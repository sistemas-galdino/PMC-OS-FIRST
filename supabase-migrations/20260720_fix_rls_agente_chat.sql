-- 20260720_fix_rls_agente_chat.sql
-- Corrige RLS permissivo do chat do agente (conversations / messages).
--
-- Problema: ambas com `ALL / public / true / true` — qualquer portador da chave
-- pública (anon inclusive) lia/escrevia/apagava todas as conversas e mensagens
-- (inclui system_prompt, company_name, conteúdo).
--
-- Investigação: só a edge function `agente-chat` usa essas tabelas, e ela roda
-- com a chave ANÔNIMA + o token do usuário (RLS aplica) — não usa service_role.
-- Os únicos que chamam o agente são admins (página /agente e o FloatingAgente,
-- ambos admin-only). `conversations` não tem coluna de dono. Logo, o correto é
-- trancar em time + seção Agente (consistente com o RBAC), não um lock público.

drop policy if exists anon_all_conversations on public.conversations;
create policy conversations_agente on public.conversations
  for all to authenticated
  using (is_admin() and pode_secao('agente'))
  with check (is_admin() and pode_secao('agente'));

drop policy if exists anon_all_messages on public.messages;
create policy messages_agente on public.messages
  for all to authenticated
  using (is_admin() and pode_secao('agente'))
  with check (is_admin() and pode_secao('agente'));
