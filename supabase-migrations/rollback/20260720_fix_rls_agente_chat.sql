-- ROLLBACK de 20260720_fix_rls_agente_chat.sql — reabre acesso público total.
drop policy if exists conversations_agente on public.conversations;
create policy anon_all_conversations on public.conversations for all to public using (true) with check (true);
drop policy if exists messages_agente on public.messages;
create policy anon_all_messages on public.messages for all to public using (true) with check (true);
