-- ROLLBACK de 20260719_fix_rls_cs_acompanhamento.sql
-- Restaura a policy permissiva original (allow_all_cs).
-- ATENÇÃO: isto reabre o acesso público total à tabela; usar só se a correção
-- quebrar alguma automação que dependia da leitura/escrita via chave anônima.

drop policy if exists cs_acompanhamento_equipe_all on public.cs_acompanhamento;

create policy allow_all_cs on public.cs_acompanhamento
  for all to public
  using (true)
  with check (true);
