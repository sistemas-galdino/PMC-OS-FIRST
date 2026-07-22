-- ROLLBACK de 20260719_fix_rls_cs_evidencias.sql
-- Restaura a policy permissiva original (allow_all_evidencias).
-- ATENÇÃO: reabre acesso público total; usar só se a correção quebrar alguma automação
-- que dependia da leitura/escrita via chave anônima.

drop policy if exists cs_evidencias_equipe_all on public.cs_evidencias;

create policy allow_all_evidencias on public.cs_evidencias
  for all to public
  using (true)
  with check (true);
